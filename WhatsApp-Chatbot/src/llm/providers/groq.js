/**
 * GROQ PROVIDER
 * 
 * LLM provider implementation for Groq
 */

import Groq from 'groq-sdk';
import { llmConfig } from '../../config/llm.js';
import { logger } from '../../utils/logger.js';

let groqInstance = null;

/**
 * Get or create Groq client instance
 * @returns {Groq}
 */
export function getGroqClient() {
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: llmConfig.groq.apiKey
    });
  }
  return groqInstance;
}

/**
 * Call Groq API with messages and tools
 * @param {Array} messages - Chat messages
 * @param {Array} tools - Tool definitions
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
export async function callGroq(messages, tools = [], options = {}) {
  const client = getGroqClient();
  const config = llmConfig.groq;

  try {
    const requestParams = {
      model: options.model || config.model,
      temperature: options.temperature ?? config.temperature,
      messages
    };

    // Add tools if provided
    if (tools.length > 0) {
      requestParams.tools = tools;
      requestParams.tool_choice = options.toolChoice || config.toolChoice;
    }

    logger.debug('Groq', `Calling model: ${requestParams.model}`);

    const completion = await client.chat.completions.create(requestParams);

    const message = completion.choices[0].message;

    return {
      content: message.content,
      tool_calls: message.tool_calls,
      role: message.role,
      message, // Keep for helpers that expect this structure
      usage: completion.usage,
      raw: completion
    };
  } catch (error) {
    logger.error('Groq', 'API call failed', error.message);
    throw error;
  }
}

/**
 * Generate a simple text response (no tools)
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @returns {Promise<string>}
 */
export async function generateGroqResponse(systemPrompt, userMessage) {
  const result = await callGroq([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]);

  return result.message.content || '';
}
