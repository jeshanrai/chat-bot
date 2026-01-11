/**
 * ADMIN ROUTES
 * 
 * Database initialization and maintenance endpoints
 */

import { Router } from 'express';
import { runMigrations, getDatabaseStats } from '../database/init.js';
import pool from '../database/connection.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Initialize database (run migrations)
 */
router.get('/init-db', async (req, res) => {
  try {
    logger.info('Admin', 'Running database migrations...');
    
    const result = await runMigrations();
    const stats = await getDatabaseStats();
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      migrationsRun: result.migrationsRun,
      tables: stats
    });
  } catch (error) {
    logger.error('Admin', 'Database initialization failed', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update food images
 */
router.get('/update-images', async (req, res) => {
  const imageUpdates = [
    { name: 'Steamed Veg Momo', url: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&q=80' },
    { name: 'Steamed Chicken Momo', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80' },
    { name: 'Fried Veg Momo', url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80' },
    { name: 'Fried Chicken Momo', url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80' },
    { name: 'Tandoori Momo', url: 'https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=400&q=80' },
    { name: 'Jhol Momo', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80' },
    { name: 'Veg Thukpa', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80' },
    { name: 'Chicken Thukpa', url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80' },
    { name: 'Veg Chowmein', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80' },
    { name: 'Chicken Chowmein', url: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&q=80' },
    { name: 'Veg Chopsuey', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80' },
    { name: 'Veg Fried Rice', url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80' },
    { name: 'Chicken Fried Rice', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80' },
    { name: 'Egg Fried Rice', url: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&q=80' },
    { name: 'Chicken Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80' },
    { name: 'Masala Tea', url: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80' },
    { name: 'Coffee', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80' },
    { name: 'Fresh Lime Soda', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80' },
    { name: 'Mango Lassi', url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80' },
    { name: 'Cold Coffee', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80' }
  ];
  
  try {
    let updated = 0;
    for (const item of imageUpdates) {
      const result = await pool.query(
        'UPDATE foods SET image_url = $1 WHERE name = $2',
        [item.url, item.name]
      );
      if (result.rowCount > 0) updated++;
    }
    
    res.json({
      success: true,
      message: `Updated ${updated} food images`,
      updated
    });
  } catch (error) {
    logger.error('Admin', 'Image update failed', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
