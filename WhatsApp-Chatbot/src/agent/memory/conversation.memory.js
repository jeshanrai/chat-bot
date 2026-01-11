/**
 * CONVERSATION MEMORY
 * 
 * Manages conversation history and context for each user
 * Uses in-memory storage with optional persistence
 */

import { CHANNELS } from '../../constants/channels.js';
import { CONVERSATION_STAGES } from '../../constants/messageTypes.js';
import { logger } from '../../utils/logger.js';

// In-memory context store (per user)
const contextStore = new Map();

// Context expiration time (30 minutes)
const CONTEXT_TTL = 30 * 60 * 1000;

/**
 * Get or create conversation context for a user
 * @param {string} userId 
 * @param {string} platform 
 * @returns {Object} Conversation context
 */
export function getContext(userId, platform) {
  const key = `${platform}:${userId}`;
  let context = contextStore.get(key);
  
  // Check if context exists and is not expired
  if (context && (Date.now() - context.lastUpdated) < CONTEXT_TTL) {
    return context;
  }
  
  // Create new context
  context = createInitialContext(userId, platform);
  contextStore.set(key, context);
  
  return context;
}

/**
 * Update conversation context
 * @param {string} userId 
 * @param {string} platform 
 * @param {Object} updates 
 * @returns {Object} Updated context
 */
export function updateContext(userId, platform, updates) {
  const key = `${platform}:${userId}`;
  let context = contextStore.get(key) || createInitialContext(userId, platform);
  
  context = {
    ...context,
    ...updates,
    lastUpdated: Date.now()
  };
  
  contextStore.set(key, context);
  logger.debug('ConversationMemory', `Context updated for ${userId}`, { stage: context.stage });
  
  return context;
}

/**
 * Add message to conversation history
 * @param {string} userId 
 * @param {string} platform 
 * @param {Object} message 
 */
export function addMessageToHistory(userId, platform, message) {
  const key = `${platform}:${userId}`;
  let context = contextStore.get(key) || createInitialContext(userId, platform);
  
  // Keep last 20 messages to manage memory
  const MAX_HISTORY = 20;
  if (context.history.length >= MAX_HISTORY) {
    context.history = context.history.slice(-MAX_HISTORY + 1);
  }
  
  context.history.push({
    ...message,
    timestamp: Date.now()
  });
  
  context.lastUpdated = Date.now();
  contextStore.set(key, context);
}

/**
 * Get conversation history for LLM
 * @param {string} userId 
 * @param {string} platform 
 * @returns {Array} Messages formatted for LLM
 */
export function getHistoryForLLM(userId, platform) {
  const context = getContext(userId, platform);
  
  return context.history.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.name && { name: msg.name }),
    ...(msg.tool_calls && { tool_calls: msg.tool_calls })
  }));
}

/**
 * Clear conversation context
 * @param {string} userId 
 * @param {string} platform 
 */
export function clearContext(userId, platform) {
  const key = `${platform}:${userId}`;
  contextStore.delete(key);
  logger.debug('ConversationMemory', `Context cleared for ${userId}`);
}

/**
 * Create initial conversation context
 * @param {string} userId 
 * @param {string} platform 
 * @returns {Object} Initial context
 */
function createInitialContext(userId, platform) {
  return {
    userId,
    platform,
    stage: CONVERSATION_STAGES.INITIAL,
    cart: [],
    history: [],
    lastUpdated: Date.now()
  };
}

/**
 * Cleanup expired contexts (call periodically)
 */
export function cleanupExpiredContexts() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, context] of contextStore.entries()) {
    if (now - context.lastUpdated > CONTEXT_TTL) {
      contextStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info('ConversationMemory', `Cleaned up ${cleaned} expired contexts`);
  }
}

// Cleanup every 10 minutes
setInterval(cleanupExpiredContexts, 10 * 60 * 1000);

export default {
  getContext,
  updateContext,
  addMessageToHistory,
  getHistoryForLLM,
  clearContext,
  cleanupExpiredContexts
};
