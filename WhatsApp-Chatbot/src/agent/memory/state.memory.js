/**
 * STATE MEMORY
 * 
 * Manages agent state during the ReACT cycle
 * Tracks reasoning, actions, and observations
 */

import { AgentPhases } from '../agent.types.js';
import { logger } from '../../utils/logger.js';

// Temporary state store for active reasoning cycles
const stateStore = new Map();

/**
 * Create new agent state for a request
 * @param {string} requestId 
 * @returns {Object} Initial agent state
 */
export function createAgentState(requestId) {
  const state = {
    requestId,
    phase: AgentPhases.REASONING,
    thoughts: [],
    pendingTools: [],
    toolResults: [],
    finalResponse: null,
    iterations: 0,
    maxIterations: 5,
    startTime: Date.now()
  };
  
  stateStore.set(requestId, state);
  return state;
}

/**
 * Get agent state
 * @param {string} requestId 
 * @returns {Object|null} Agent state
 */
export function getAgentState(requestId) {
  return stateStore.get(requestId) || null;
}

/**
 * Update agent state
 * @param {string} requestId 
 * @param {Object} updates 
 * @returns {Object} Updated state
 */
export function updateAgentState(requestId, updates) {
  let state = stateStore.get(requestId);
  
  if (!state) {
    logger.warn('StateMemory', `No state found for request ${requestId}`);
    return null;
  }
  
  state = { ...state, ...updates };
  stateStore.set(requestId, state);
  
  return state;
}

/**
 * Add thought to reasoning chain
 * @param {string} requestId 
 * @param {string} thought 
 */
export function addThought(requestId, thought) {
  const state = stateStore.get(requestId);
  if (state) {
    state.thoughts.push({
      text: thought,
      timestamp: Date.now()
    });
  }
}

/**
 * Add pending tool call
 * @param {string} requestId 
 * @param {Object} toolCall 
 */
export function addPendingTool(requestId, toolCall) {
  const state = stateStore.get(requestId);
  if (state) {
    state.pendingTools.push(toolCall);
    state.phase = AgentPhases.ACTING;
  }
}

/**
 * Record tool result
 * @param {string} requestId 
 * @param {string} toolName 
 * @param {Object} result 
 */
export function recordToolResult(requestId, toolName, result) {
  const state = stateStore.get(requestId);
  if (state) {
    state.toolResults.push({
      name: toolName,
      result,
      timestamp: Date.now()
    });
    state.phase = AgentPhases.OBSERVING;
    state.pendingTools = state.pendingTools.filter(t => t.function?.name !== toolName);
  }
}

/**
 * Set final response
 * @param {string} requestId 
 * @param {string} response 
 */
export function setFinalResponse(requestId, response) {
  const state = stateStore.get(requestId);
  if (state) {
    state.finalResponse = response;
    state.phase = AgentPhases.RESPONDING;
  }
}

/**
 * Check if agent should continue reasoning
 * @param {string} requestId 
 * @returns {boolean}
 */
export function shouldContinue(requestId) {
  const state = stateStore.get(requestId);
  if (!state) return false;
  
  // Stop if max iterations reached
  if (state.iterations >= state.maxIterations) {
    logger.warn('StateMemory', `Max iterations reached for ${requestId}`);
    return false;
  }
  
  // Stop if final response set
  if (state.finalResponse) {
    return false;
  }
  
  // Stop if no pending tools and no new reasoning needed
  if (state.pendingTools.length === 0 && state.phase === AgentPhases.OBSERVING) {
    return false;
  }
  
  return true;
}

/**
 * Increment iteration count
 * @param {string} requestId 
 */
export function incrementIteration(requestId) {
  const state = stateStore.get(requestId);
  if (state) {
    state.iterations++;
  }
}

/**
 * Clean up agent state after completion
 * @param {string} requestId 
 */
export function cleanupState(requestId) {
  const state = stateStore.get(requestId);
  if (state) {
    const duration = Date.now() - state.startTime;
    logger.debug('StateMemory', `Request ${requestId} completed in ${duration}ms`, {
      iterations: state.iterations,
      toolsExecuted: state.toolResults.length
    });
  }
  stateStore.delete(requestId);
}

export default {
  createAgentState,
  getAgentState,
  updateAgentState,
  addThought,
  addPendingTool,
  recordToolResult,
  setFinalResponse,
  shouldContinue,
  incrementIteration,
  cleanupState
};
