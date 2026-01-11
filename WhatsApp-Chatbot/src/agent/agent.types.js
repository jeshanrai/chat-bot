/**
 * AGENT TYPES
 * 
 * TypeScript-style JSDoc types for the AI Agent system
 * Provides documentation and IDE autocomplete support
 */

/**
 * @typedef {Object} ConversationContext
 * @property {string} userId - Unique user identifier
 * @property {string} platform - 'whatsapp' | 'messenger'
 * @property {string} stage - Current conversation stage
 * @property {CartItem[]} cart - Current cart items
 * @property {string} [currentCategory] - Currently browsing category
 * @property {string} [serviceType] - 'dine_in' | 'delivery'
 * @property {string} [deliveryAddress] - Delivery address if applicable
 * @property {string} [paymentMethod] - Selected payment method
 * @property {number} [orderId] - Current order ID
 * @property {string} [lastAction] - Last action performed
 * @property {Message[]} history - Conversation history
 * @property {number} lastUpdated - Timestamp of last update
 */

/**
 * @typedef {Object} CartItem
 * @property {number} foodId - Food item ID
 * @property {string} name - Item name
 * @property {number} price - Unit price
 * @property {number} quantity - Quantity
 */

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'|'system'|'tool'} role - Message role
 * @property {string} content - Message content
 * @property {string} [name] - Tool name (for tool messages)
 * @property {Object} [tool_calls] - Tool calls (for assistant messages)
 * @property {number} timestamp - Message timestamp
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} id - Tool call ID
 * @property {string} type - Always 'function'
 * @property {Object} function - Function details
 * @property {string} function.name - Tool name
 * @property {string} function.arguments - JSON stringified arguments
 */

/**
 * @typedef {Object} ToolResult
 * @property {string|null} reply - Text reply to send (or null if handled by tool)
 * @property {ConversationContext} updatedContext - Updated context
 */

/**
 * @typedef {Object} AgentState
 * @property {string} phase - 'reasoning' | 'acting' | 'observing' | 'responding'
 * @property {string[]} thoughts - Agent's reasoning chain
 * @property {ToolCall[]} pendingTools - Tools to execute
 * @property {Object[]} toolResults - Results from executed tools
 * @property {string} [finalResponse] - Final response to user
 */

/**
 * @typedef {Object} NormalizedMessage
 * @property {string} userId - User identifier
 * @property {string} text - Message text content
 * @property {string} type - 'text' | 'interactive' | 'image' | 'location'
 * @property {string} platform - 'whatsapp' | 'messenger'
 * @property {Object} [interactive] - Interactive message details
 * @property {Object} [location] - Location data
 * @property {number} timestamp - Message timestamp
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} [content] - Text content
 * @property {ToolCall[]} [tool_calls] - Tool calls to execute
 * @property {string} finish_reason - 'stop' | 'tool_calls' | 'length'
 */

export const AgentPhases = {
  REASONING: 'reasoning',
  ACTING: 'acting',
  OBSERVING: 'observing',
  RESPONDING: 'responding'
};

export const MessageRoles = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool'
};
