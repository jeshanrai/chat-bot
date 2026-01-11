/**
 * HEALTH ROUTES
 * 
 * Health check and database status endpoints
 */

import { Router } from 'express';
import pool from '../database/connection.js';
import { getDatabaseStats } from '../database/init.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Basic health check
 */
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

/**
 * Database summary dashboard
 */
router.get('/db', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    
    if (!stats) {
      return res.status(500).json({ success: false, error: 'Failed to get database stats' });
    }
    
    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total
      FROM orders o 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Get category stats
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count, AVG(price) as avg_price 
      FROM foods 
      GROUP BY category 
      ORDER BY category
    `);
    
    res.json({
      success: true,
      summary: stats,
      categoryStats: categoryStats.rows,
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    logger.error('Health', 'Database stats error', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * View all foods
 */
router.get('/db/foods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM foods ORDER BY category, id');
    res.json({
      success: true,
      count: result.rows.length,
      foods: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * View all orders
 */
router.get('/db/orders', async (req, res) => {
  try {
    const orders = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({
      success: true,
      count: orders.rows.length,
      orders: orders.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * View order details with items
 */
router.get('/db/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const items = await pool.query(`
      SELECT oi.*, f.name, f.category 
      FROM order_items oi 
      JOIN foods f ON oi.food_id = f.id 
      WHERE oi.order_id = $1
    `, [orderId]);
    
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json({
      success: true,
      order: order.rows[0],
      items: items.rows,
      total: items.rows.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
