/**
 * LLM INDEX
 * 
 * Provider-agnostic LLM interface
 */

import { llmConfig } from '../config/llm.js';
import { logger } from '../utils/logger.js';
import { getGroqClient, callGroq } from './providers/groq.js';

/**
 * Get the active LLM client based on configuration
 * @returns {Object} LLM client
 */
export function getLLMClient() {
  const provider = llmConfig.provider;
  
  switch (provider) {
    case 'groq':
      return getGroqClient();
    case 'openai':
      // Future: return getOpenAIClient();
      logger.warn('LLM', 'OpenAI provider not yet implemented, falling back to Groq');
      return getGroqClient();
    case 'gemini':
      // Future: return getGeminiClient();
      logger.warn('LLM', 'Gemini provider not yet implemented, falling back to Groq');
      return getGroqClient();
    default:
      logger.warn('LLM', `Unknown provider: ${provider}, using Groq`);
      return getGroqClient();
  }
}

/**
 * Call LLM with messages and tools
 * @param {Array} messages - Chat messages
 * @param {Array} tools - Tool definitions
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
export async function callLLM(messages, tools = [], options = {}) {
  const provider = llmConfig.provider;
  
  switch (provider) {
    case 'groq':
      return callGroq(messages, tools, options);
    case 'openai':
      // Future implementation
      return callGroq(messages, tools, options);
    case 'gemini':
      // Future implementation
      return callGroq(messages, tools, options);
    default:
      return callGroq(messages, tools, options);
  }
}

// Re-export for convenience
export { availableTools } from './tools.js';
export { SYSTEM_PROMPT } from './prompts.js';
