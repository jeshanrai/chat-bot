/**
 * DATABASE INITIALIZATION
 * 
 * Runs migrations and seeds the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all migrations in order
 */
export async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    // Get all SQL files sorted by name
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    logger.info('Database', `Found ${files.length} migrations`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      logger.info('Database', `Running migration: ${file}`);
      await pool.query(sql);
      logger.info('Database', `Completed: ${file}`);
    }
    
    return { success: true, migrationsRun: files.length };
  } catch (error) {
    logger.error('Database', 'Migration failed', error.message);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const foods = await pool.query('SELECT COUNT(*) FROM foods');
    const orders = await pool.query('SELECT COUNT(*) FROM orders');
    const orderItems = await pool.query('SELECT COUNT(*) FROM order_items');
    
    return {
      foods: parseInt(foods.rows[0].count),
      orders: parseInt(orders.rows[0].count),
      orderItems: parseInt(orderItems.rows[0].count)
    };
  } catch (error) {
    logger.error('Database', 'Failed to get stats', error.message);
    return null;
  }
}

/**
 * Initialize database - runs migrations
 * Alias for runMigrations, used by bootstrap
 */
export async function initializeDatabase() {
  return runMigrations();
}
