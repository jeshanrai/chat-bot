/**
 * BOOTSTRAP
 * 
 * Application startup sequence
 * Handles initialization in correct order:
 * 1. Load environment variables
 * 2. Initialize database connection
 * 3. Run migrations
 * 4. Seed data if needed
 * 5. Start event listeners
 */

import 'dotenv/config';
import { pool, testConnection } from './database/connection.js';
import { initializeDatabase } from './database/init.js';
import { eventBus } from './events/eventBus.js';
import './events/order.events.js'; // Register event handlers
import { logger } from './utils/logger.js';
import config from './config/index.js';

/**
 * Bootstrap the application
 * @returns {Promise<boolean>} Success status
 */
export async function bootstrap() {
  logger.info('Bootstrap', '🚀 Starting application bootstrap...');
  
  try {
    // Step 1: Validate configuration
    logger.info('Bootstrap', '📋 Validating configuration...');
    validateConfig();
    
    // Step 2: Test database connection
    logger.info('Bootstrap', '🔌 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Bootstrap', '⚠️ Database connection failed - continuing without DB');
      logger.warn('Bootstrap', '⚠️ Database features will not work');
      // Don't throw - continue without DB for development
    } else {
      // Step 3: Initialize database (create tables if needed)
      logger.info('Bootstrap', '📦 Initializing database...');
      try {
        await initializeDatabase();
      } catch (dbError) {
        logger.warn('Bootstrap', '⚠️ Database initialization failed', dbError.message);
      }
      
      // Step 4: Seed data if in development
      if (config.app.nodeEnv === 'development') {
        logger.info('Bootstrap', '🌱 Checking seed data...');
        await seedDevelopmentData();
      }
    }
    
    // Step 5: Start event listeners
    logger.info('Bootstrap', '📡 Starting event listeners...');
    eventBus.emit('app:started', { timestamp: Date.now() });
    
    logger.info('Bootstrap', '✅ Bootstrap completed successfully');
    return true;
    
  } catch (error) {
    logger.error('Bootstrap', '❌ Bootstrap failed', error.message);
    throw error;
  }
}

/**
 * Validate required configuration
 */
function validateConfig() {
  const required = [
    'WHATSAPP_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'VERIFY_TOKEN',
    'GROQ_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.warn('Bootstrap', `Missing environment variables: ${missing.join(', ')}`);
    logger.warn('Bootstrap', 'Some features may not work correctly');
  }
}

/**
 * Seed development data
 */
async function seedDevelopmentData() {
  try {
    // Check if foods table has data
    const result = await pool.query('SELECT COUNT(*) FROM foods');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      logger.info('Bootstrap', '📝 Seeding food menu...');
      await seedFoodMenu();
    } else {
      logger.debug('Bootstrap', `Found ${count} menu items`);
    }
  } catch (error) {
    // Table might not exist yet
    logger.debug('Bootstrap', 'Foods table not ready, skipping seed');
  }
}

/**
 * Seed food menu data
 */
async function seedFoodMenu() {
  const foods = [
    // Momos
    { name: 'Steamed Chicken Momo', description: 'Classic steamed dumplings with chicken filling', price: 180, category: 'momos', tags: ['chicken', 'steamed', 'popular'] },
    { name: 'Fried Chicken Momo', description: 'Crispy fried dumplings with chicken filling', price: 200, category: 'momos', tags: ['chicken', 'fried', 'crispy'] },
    { name: 'Steamed Veg Momo', description: 'Steamed dumplings with vegetable filling', price: 150, category: 'momos', tags: ['vegetarian', 'steamed', 'healthy'] },
    { name: 'Tandoori Momo', description: 'Grilled momos with tandoori spices', price: 220, category: 'momos', tags: ['spicy', 'grilled', 'popular'] },
    { name: 'Jhol Momo', description: 'Momos in spicy soup', price: 200, category: 'momos', tags: ['soup', 'spicy', 'popular'] },
    { name: 'Chilli Momo', description: 'Spicy stir-fried momos', price: 210, category: 'momos', tags: ['spicy', 'fried'] },
    
    // Drinks
    { name: 'Coke', description: 'Coca-Cola 330ml', price: 60, category: 'drinks', tags: ['cold', 'soda'] },
    { name: 'Sprite', description: 'Sprite 330ml', price: 60, category: 'drinks', tags: ['cold', 'soda'] },
    { name: 'Lemon Tea', description: 'Fresh lemon tea', price: 50, category: 'drinks', tags: ['tea', 'refreshing'] },
    { name: 'Mango Lassi', description: 'Creamy mango yogurt drink', price: 100, category: 'drinks', tags: ['lassi', 'mango', 'creamy'] },
    
    // Sides
    { name: 'French Fries', description: 'Crispy golden fries', price: 120, category: 'sides', tags: ['fried', 'crispy'] },
    { name: 'Aloo Chop', description: 'Spiced potato fritters', price: 80, category: 'sides', tags: ['vegetarian', 'fried'] },
    
    // Desserts
    { name: 'Gulab Jamun', description: 'Sweet milk dumplings in syrup', price: 80, category: 'desserts', tags: ['sweet', 'traditional'] },
    { name: 'Ice Cream', description: 'Vanilla ice cream', price: 60, category: 'desserts', tags: ['cold', 'sweet'] }
  ];
  
  for (const food of foods) {
    await pool.query(
      `INSERT INTO foods (name, description, price, category, tags, available) 
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (name) DO NOTHING`,
      [food.name, food.description, food.price, food.category, food.tags]
    );
  }
  
  logger.info('Bootstrap', `✅ Seeded ${foods.length} menu items`);
}

/**
 * Graceful shutdown handler
 */
let isShuttingDown = false;

export async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('Bootstrap', '🛑 Shutting down...');
  
  try {
    // Close database pool
    await pool.end();
    logger.info('Bootstrap', '✅ Database connection closed');
    
    // Emit shutdown event
    eventBus.emit('app:shutdown', { timestamp: Date.now() });
    
  } catch (error) {
    logger.error('Bootstrap', 'Error during shutdown', error.message);
  }
}

export default { bootstrap, shutdown };
