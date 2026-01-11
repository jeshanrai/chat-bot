/**
 * EVENT BUS
 * 
 * Simple pub/sub for internal event-driven architecture
 * 
 * NOTE: Do NOT place critical/transactional logic here.
 * Events are fire-and-forget. Use for:
 * - Logging
 * - Analytics
 * - Notifications
 * - Non-critical side effects
 * 
 * Do NOT use for:
 * - Database transactions
 * - Payment processing
 * - Order confirmation (use direct function calls)
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // Prevent memory leak warnings
  }
  
  /**
   * Emit an event with logging
   * @param {string} eventName 
   * @param  {...any} args 
   */
  emit(eventName, ...args) {
    logger.debug('EventBus', `Emitting: ${eventName}`);
    return super.emit(eventName, ...args);
  }
  
  /**
   * Register an event listener with logging
   * @param {string} eventName 
   * @param {Function} listener 
   */
  on(eventName, listener) {
    logger.debug('EventBus', `Registered listener for: ${eventName}`);
    return super.on(eventName, listener);
  }
}

// Singleton instance
export const eventBus = new AppEventBus();

// Order-related events
export const ORDER_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_READY: 'order:ready',
  ORDER_DELIVERED: 'order:delivered',
  ITEM_ADDED: 'order:item_added',
  ITEM_REMOVED: 'order:item_removed'
};

// Reservation-related events
export const RESERVATION_EVENTS = {
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_CONFIRMED: 'reservation:confirmed',
  RESERVATION_CANCELLED: 'reservation:cancelled'
};

// Message-related events
export const MESSAGE_EVENTS = {
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_FAILED: 'message:failed'
};
