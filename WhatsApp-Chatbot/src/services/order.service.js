/**
 * ORDER SERVICE
 * 
 * Business logic for order and cart operations
 */

import pool from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { ORDER_STATUS } from '../constants/messageTypes.js';
import { eventBus, ORDER_EVENTS } from '../events/eventBus.js';

/**
 * Create a new order
 * @param {string} userId - User identifier
 * @param {string} platform - 'whatsapp' or 'messenger'
 * @returns {Promise<Object>}
 */
export async function createOrder(userId, platform) {
  try {
    const result = await pool.query(
      'INSERT INTO orders (user_id, platform, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, platform, ORDER_STATUS.CREATED]
    );
    
    const order = result.rows[0];
    logger.info('OrderService', `Created order ${order.id} for ${userId}`);
    
    return order;
  } catch (error) {
    logger.error('OrderService', 'Failed to create order', error.message);
    throw error;
  }
}

/**
 * Add item to order
 * @param {number} orderId - Order ID
 * @param {number} foodId - Food item ID
 * @param {number} quantity - Quantity
 * @param {number} unitPrice - Price per item
 * @returns {Promise<Object>}
 */
export async function addOrderItem(orderId, foodId, quantity, unitPrice) {
  try {
    const result = await pool.query(
      'INSERT INTO order_items (order_id, food_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [orderId, foodId, quantity, unitPrice]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('OrderService', `Failed to add item to order ${orderId}`, error.message);
    throw error;
  }
}

/**
 * Get order by ID with items
 * @param {number} orderId - Order ID
 * @returns {Promise<Object|null>}
 */
export async function getOrderById(orderId) {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    
    if (orderResult.rows.length === 0) {
      return null;
    }
    
    const itemsResult = await pool.query(`
      SELECT oi.*, f.name, f.category 
      FROM order_items oi 
      JOIN foods f ON oi.food_id = f.id 
      WHERE oi.order_id = $1
    `, [orderId]);
    
    const order = orderResult.rows[0];
    order.items = itemsResult.rows;
    order.total = itemsResult.rows.reduce(
      (sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 
      0
    );
    
    return order;
  } catch (error) {
    logger.error('OrderService', `Failed to get order ${orderId}`, error.message);
    throw error;
  }
}

/**
 * Get user's order history
 * @param {string} userId - User identifier
 * @param {number} limit - Max number of orders
 * @returns {Promise<Array>}
 */
export async function getUserOrderHistory(userId, limit = 5) {
  try {
    const result = await pool.query(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total
      FROM orders o 
      WHERE o.user_id = $1 
      ORDER BY o.created_at DESC 
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  } catch (error) {
    logger.error('OrderService', `Failed to get order history for ${userId}`, error.message);
    throw error;
  }
}

/**
 * Update order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>}
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );
    
    const order = result.rows[0];
    
    // Emit event for status change
    if (status === ORDER_STATUS.CONFIRMED) {
      eventBus.emit(ORDER_EVENTS.ORDER_CONFIRMED, order);
    } else if (status === ORDER_STATUS.CANCELLED) {
      eventBus.emit(ORDER_EVENTS.ORDER_CANCELLED, order);
    }
    
    logger.info('OrderService', `Order ${orderId} status updated to ${status}`);
    return order;
  } catch (error) {
    logger.error('OrderService', `Failed to update order ${orderId}`, error.message);
    throw error;
  }
}

/**
 * Set service type and delivery address
 * @param {number} orderId - Order ID
 * @param {string} serviceType - 'dine_in' or 'delivery'
 * @param {string} address - Delivery address (optional)
 * @returns {Promise<Object>}
 */
export async function setServiceDetails(orderId, serviceType, address = null) {
  try {
    const result = await pool.query(
      'UPDATE orders SET service_type = $1, delivery_address = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [serviceType, address, orderId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('OrderService', `Failed to set service details for order ${orderId}`, error.message);
    throw error;
  }
}

/**
 * Set payment method
 * @param {number} orderId - Order ID
 * @param {string} paymentMethod - Payment method
 * @returns {Promise<Object>}
 */
export async function setPaymentMethod(orderId, paymentMethod) {
  try {
    const result = await pool.query(
      'UPDATE orders SET payment_method = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [paymentMethod, orderId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('OrderService', `Failed to set payment for order ${orderId}`, error.message);
    throw error;
  }
}

/**
 * Calculate and set order total
 * @param {number} orderId - Order ID
 * @returns {Promise<number>}
 */
export async function calculateOrderTotal(orderId) {
  try {
    const result = await pool.query(`
      SELECT SUM(unit_price * quantity) as total 
      FROM order_items 
      WHERE order_id = $1
    `, [orderId]);
    
    const total = parseFloat(result.rows[0]?.total) || 0;
    
    await pool.query(
      'UPDATE orders SET total_amount = $1 WHERE id = $2',
      [total, orderId]
    );
    
    return total;
  } catch (error) {
    logger.error('OrderService', `Failed to calculate total for order ${orderId}`, error.message);
    throw error;
  }
}
