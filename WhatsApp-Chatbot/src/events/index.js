/**
 * EVENTS INDEX
 * 
 * Central export for event bus and event handlers
 */

export { eventBus, ORDER_EVENTS, RESERVATION_EVENTS, MESSAGE_EVENTS } from './eventBus.js';
export { initOrderEventHandlers } from './order.events.js';
