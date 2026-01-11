/**
 * AI AGENT - Main Orchestrator
 * 
 * Implements the ReACT (Reason + Act) pattern:
 * 1. Receive user message
 * 2. REASON: LLM analyzes context and decides action
 * 3. ACT: Execute tool calls
 * 4. OBSERVE: Process tool results
 * 5. RESPOND: Generate final response or continue loop
 */

import { v4 as uuidv4 } from 'uuid';
import { callLLM } from '../llm/index.js';
import { SYSTEM_PROMPT, getToolResponsePrompt } from '../llm/prompts.js';
import { availableTools } from '../llm/tools.js';
import { executeTools } from './executor.js';
import { 
  getContext, 
  updateContext, 
  addMessageToHistory,
  getHistoryForLLM 
} from './memory/conversation.memory.js';
import {
  createAgentState,
  updateAgentState,
  setFinalResponse,
  shouldContinue,
  incrementIteration,
  cleanupState
} from './memory/state.memory.js';
import { sendMessage } from '../messaging/index.js';
import { logger } from '../utils/logger.js';
import { MessageRoles } from './agent.types.js';

// Max iterations to prevent infinite loops
const MAX_ITERATIONS = 5;

/**
 * Process incoming message through the AI agent
 * @param {Object} normalizedMessage - Normalized message from user
 * @returns {Object} Processing result
 */
export async function processMessage(normalizedMessage) {
  const { userId, text, platform, type, interactive } = normalizedMessage;
  const requestId = uuidv4();
  
  logger.info('Agent', `Processing message from ${userId}`, { type, platform });
  
  try {
    // Get or create conversation context
    let context = getContext(userId, platform);
    
    // Handle interactive messages (button clicks, list selections)
    const messageText = resolveMessageText(text, type, interactive);
    
    // Add user message to history
    addMessageToHistory(userId, platform, {
      role: MessageRoles.USER,
      content: messageText
    });
    
    // Create agent state for this request
    createAgentState(requestId);
    
    // Run the ReACT loop
    const result = await runReactLoop(requestId, userId, platform, messageText, context);
    
    // Clean up state
    cleanupState(requestId);
    
    return result;
    
  } catch (error) {
    logger.error('Agent', `Failed to process message: ${error.message}`, error.stack);
    cleanupState(requestId);
    
    await sendMessage(userId, platform, "Sorry, something went wrong. Please try again.");
    return { success: false, error: error.message };
  }
}

/**
 * Run the ReACT loop
 * @param {string} requestId - Unique request ID
 * @param {string} userId - User ID
 * @param {string} platform - Platform
 * @param {string} messageText - User message text
 * @param {Object} context - Conversation context
 * @returns {Object} Processing result
 */
async function runReactLoop(requestId, userId, platform, messageText, context) {
  let iterations = 0;
  let currentContext = context;
  
  while (iterations < MAX_ITERATIONS && shouldContinue(requestId)) {
    iterations++;
    incrementIteration(requestId);
    
    logger.debug('Agent', `ReACT iteration ${iterations} for ${requestId}`);
    
    // Build messages for LLM
    const messages = buildLLMMessages(userId, platform, currentContext);
    
    // REASON: Call LLM to decide next action
    const llmResponse = await callLLM(messages, { tools: availableTools });
    
    // Check for tool calls
    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      // ACT: Execute tools
      logger.debug('Agent', `Executing ${llmResponse.tool_calls.length} tool calls`);
      
      const toolResult = await executeTools(
        llmResponse.tool_calls, 
        userId, 
        currentContext,
        requestId
      );
      
      // OBSERVE: Update context with tool results
      if (toolResult.updatedContext) {
        currentContext = toolResult.updatedContext;
        updateContext(userId, platform, currentContext);
      }
      
      // Add assistant message with tool calls to history
      addMessageToHistory(userId, platform, {
        role: MessageRoles.ASSISTANT,
        content: llmResponse.content || '',
        tool_calls: llmResponse.tool_calls
      });
      
      // Add tool results to history
      for (const toolCall of llmResponse.tool_calls) {
        addMessageToHistory(userId, platform, {
          role: MessageRoles.TOOL,
          name: toolCall.function?.name,
          content: JSON.stringify({ success: true })
        });
      }
      
      // If tool sent a message, we're done (tools handle their own responses)
      if (!toolResult.reply) {
        // Tool handled the response, break the loop
        setFinalResponse(requestId, 'Tool handled response');
        break;
      }
      
    } else {
      // RESPOND: LLM generated a text response
      const responseText = llmResponse.content || "I'm not sure how to help with that. Can I show you our menu?";
      
      // Send response
      await sendMessage(userId, platform, responseText);
      
      // Add to history
      addMessageToHistory(userId, platform, {
        role: MessageRoles.ASSISTANT,
        content: responseText
      });
      
      setFinalResponse(requestId, responseText);
      break;
    }
  }
  
  if (iterations >= MAX_ITERATIONS) {
    logger.warn('Agent', `Max iterations reached for ${requestId}`);
    await sendMessage(userId, platform, "Sorry, I'm having trouble processing that. Can I show you our menu?");
  }
  
  return {
    success: true,
    iterations,
    context: currentContext
  };
}

/**
 * Build messages array for LLM
 * @param {string} userId 
 * @param {string} platform 
 * @param {Object} context 
 * @returns {Array} Messages for LLM
 */
function buildLLMMessages(userId, platform, context) {
  const history = getHistoryForLLM(userId, platform);
  
  // Build context string
  const contextString = buildContextString(context);
  
  // Create system message with context
  const systemMessage = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n${contextString}`
  };
  
  return [systemMessage, ...history];
}

/**
 * Build context string for system prompt
 * @param {Object} context 
 * @returns {string}
 */
function buildContextString(context) {
  const lines = ['Current Context:'];
  
  if (context.stage) {
    lines.push(`- Stage: ${context.stage}`);
  }
  
  if (context.cart && context.cart.length > 0) {
    const total = context.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    lines.push(`- Cart: ${context.cart.length} items, Total: Rs. ${total}`);
    context.cart.forEach(item => {
      lines.push(`  - ${item.name} x${item.quantity} @ Rs. ${item.price}`);
    });
  }
  
  if (context.currentCategory) {
    lines.push(`- Browsing: ${context.currentCategory}`);
  }
  
  if (context.serviceType) {
    lines.push(`- Service: ${context.serviceType}`);
  }
  
  if (context.deliveryAddress) {
    lines.push(`- Delivery Address: ${context.deliveryAddress}`);
  }
  
  return lines.join('\n');
}

/**
 * Resolve message text from different message types
 * @param {string} text 
 * @param {string} type 
 * @param {Object} interactive 
 * @returns {string}
 */
function resolveMessageText(text, type, interactive) {
  if (type === 'interactive' && interactive) {
    // Handle button replies
    if (interactive.type === 'button_reply') {
      return interactive.button_reply?.id || text;
    }
    // Handle list selections
    if (interactive.type === 'list_reply') {
      return interactive.list_reply?.id || text;
    }
  }
  
  return text || '';
}

/**
 * Handle button click directly (bypass LLM for known actions)
 * @param {string} buttonId - Button ID clicked
 * @param {string} userId - User ID
 * @param {string} platform - Platform
 * @returns {Object|null} Result or null if should use LLM
 */
export async function handleDirectAction(buttonId, userId, platform) {
  const context = getContext(userId, platform);
  
  // Map of button IDs to direct tool calls
  const directActions = {
    'view_all_categories': { tool: 'show_food_menu', args: {} },
    'view_cart': { tool: 'view_cart', args: {} },
    'clear_cart': { tool: 'clear_cart', args: {} },
    'confirm_order': { tool: 'process_order_response', args: { action: 'confirmed' } },
    'cancel_order': { tool: 'process_order_response', args: { action: 'cancelled' } },
    'proceed_checkout': { tool: 'confirm_order', args: {} },
    'service_dine_in': { tool: 'select_service_type', args: { type: 'dine_in' } },
    'service_delivery': { tool: 'select_service_type', args: { type: 'delivery' } },
    'pay_cash': { tool: 'finalize_order', args: { paymentMethod: 'cash' } },
    'pay_card': { tool: 'finalize_order', args: { paymentMethod: 'card' } },
    'pay_esewa': { tool: 'finalize_order', args: { paymentMethod: 'esewa' } }
  };
  
  // Check for category buttons
  if (buttonId.startsWith('cat_')) {
    const category = buttonId.replace('cat_', '');
    return { tool: 'show_category_items', args: { category } };
  }
  
  // Check for add item buttons
  if (buttonId.startsWith('add_')) {
    const foodId = parseInt(buttonId.replace('add_', ''));
    return { tool: 'add_to_cart', args: { foodId } };
  }
  
  // Check for "more" buttons
  if (buttonId.startsWith('more_')) {
    const category = buttonId.replace('more_', '');
    return { tool: 'show_category_items', args: { category } };
  }
  
  return directActions[buttonId] || null;
}

export default {
  processMessage,
  handleDirectAction
};
