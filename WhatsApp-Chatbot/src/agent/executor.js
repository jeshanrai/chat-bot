/**
 * TOOL EXECUTOR
 * 
 * Executes tool calls from the LLM agent
 * Maps tool names to actual tool functions
 */

import { TOOL_NAMES } from '../constants/toolNames.js';
import * as menuTools from '../tools/menu.tools.js';
import * as cartTools from '../tools/cart.tools.js';
import * as orderTools from '../tools/order.tools.js';
import * as reservationTools from '../tools/reservation.tools.js';
import { recordToolResult } from './memory/state.memory.js';
import { logger } from '../utils/logger.js';

/**
 * Tool registry - maps tool names to functions
 */
const toolRegistry = {
  // Menu tools
  [TOOL_NAMES.SHOW_FOOD_MENU]: menuTools.showFoodMenu,
  [TOOL_NAMES.SHOW_CATEGORY_ITEMS]: menuTools.showCategoryItems,
  [TOOL_NAMES.RECOMMEND_FOOD]: menuTools.recommendFood,
  
  // Cart tools
  [TOOL_NAMES.ADD_TO_CART]: cartTools.addToCart,
  [TOOL_NAMES.ADD_ITEM_BY_NAME]: cartTools.addItemByName,
  [TOOL_NAMES.VIEW_CART]: cartTools.viewCart,
  [TOOL_NAMES.CLEAR_CART]: cartTools.clearCart,
  
  // Order tools
  [TOOL_NAMES.CONFIRM_ORDER]: orderTools.confirmOrder,
  [TOOL_NAMES.PROCESS_ORDER_RESPONSE]: orderTools.processOrderResponse,
  [TOOL_NAMES.SELECT_SERVICE_TYPE]: orderTools.selectServiceType,
  [TOOL_NAMES.PROVIDE_LOCATION]: orderTools.provideLocation,
  [TOOL_NAMES.SHOW_PAYMENT_OPTIONS]: orderTools.showPaymentOptions,
  [TOOL_NAMES.FINALIZE_ORDER]: orderTools.finalizeOrder,
  [TOOL_NAMES.SHOW_ORDER_HISTORY]: orderTools.showOrderHistory,
  
  // Reservation tools
  [TOOL_NAMES.BOOK_TABLE]: reservationTools.bookTable,
  [TOOL_NAMES.CHECK_AVAILABILITY]: reservationTools.checkAvailability,
  [TOOL_NAMES.SHOW_RESERVATIONS]: reservationTools.showReservations
};

/**
 * Execute a single tool call
 * @param {Object} toolCall - Tool call from LLM
 * @param {string} userId - User ID
 * @param {Object} context - Current conversation context
 * @returns {Object} Tool result with reply and updatedContext
 */
export async function executeTool(toolCall, userId, context) {
  const toolName = toolCall.function?.name;
  const argsString = toolCall.function?.arguments || '{}';
  
  logger.info('Executor', `Executing tool: ${toolName}`);
  
  try {
    // Parse arguments
    let args;
    try {
      args = JSON.parse(argsString);
    } catch (parseError) {
      logger.error('Executor', `Failed to parse tool args: ${argsString}`);
      args = {};
    }
    
    // Get tool function
    const toolFn = toolRegistry[toolName];
    
    if (!toolFn) {
      logger.warn('Executor', `Unknown tool: ${toolName}`);
      return {
        reply: `I don't know how to do that yet. Can I help you with our menu or take an order?`,
        updatedContext: context
      };
    }
    
    // Execute tool
    const result = await toolFn(args, userId, context);
    
    logger.debug('Executor', `Tool ${toolName} completed`, { 
      hasReply: !!result.reply,
      newStage: result.updatedContext?.stage 
    });
    
    return result;
    
  } catch (error) {
    logger.error('Executor', `Tool execution failed: ${toolName}`, error.message);
    return {
      reply: "Sorry, something went wrong. Please try again.",
      updatedContext: context
    };
  }
}

/**
 * Execute multiple tool calls sequentially
 * @param {Array} toolCalls - Array of tool calls
 * @param {string} userId - User ID
 * @param {Object} context - Current conversation context
 * @param {string} [requestId] - Request ID for state tracking
 * @returns {Object} Combined result
 */
export async function executeTools(toolCalls, userId, context, requestId) {
  let currentContext = context;
  let lastReply = null;
  
  for (const toolCall of toolCalls) {
    const result = await executeTool(toolCall, userId, currentContext);
    
    if (result.updatedContext) {
      currentContext = result.updatedContext;
    }
    
    if (result.reply) {
      lastReply = result.reply;
    }
    
    // Record result if tracking state
    if (requestId) {
      recordToolResult(requestId, toolCall.function?.name, result);
    }
  }
  
  return {
    reply: lastReply,
    updatedContext: currentContext
  };
}

/**
 * Check if a tool exists
 * @param {string} toolName 
 * @returns {boolean}
 */
export function hasTools(toolName) {
  return toolName in toolRegistry;
}

/**
 * Get list of available tool names
 * @returns {string[]}
 */
export function getAvailableTools() {
  return Object.keys(toolRegistry);
}

export default {
  executeTool,
  executeTools,
  hasTools,
  getAvailableTools
};
