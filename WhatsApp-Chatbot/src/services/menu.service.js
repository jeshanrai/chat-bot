/**
 * MENU SERVICE
 * 
 * Business logic for menu operations
 * Handles all database queries related to food items
 */

import pool from '../database/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Get all food categories
 * @returns {Promise<Array<{category: string}>>}
 */
export async function getCategories() {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM foods WHERE available = true ORDER BY category'
    );
    return result.rows;
  } catch (error) {
    logger.error('MenuService', 'Failed to get categories', error.message);
    throw error;
  }
}

/**
 * Get food items by category
 * @param {string} category - Category name
 * @returns {Promise<Array>}
 */
export async function getFoodsByCategory(category) {
  try {
    const result = await pool.query(
      'SELECT id, name, price, description, image_url FROM foods WHERE category = $1 AND available = true ORDER BY name',
      [category]
    );
    return result.rows;
  } catch (error) {
    logger.error('MenuService', `Failed to get foods for category: ${category}`, error.message);
    throw error;
  }
}

/**
 * Get a single food item by ID
 * @param {number} foodId - Food item ID
 * @returns {Promise<Object|null>}
 */
export async function getFoodById(foodId) {
  try {
    const result = await pool.query(
      'SELECT id, name, price, description, category, image_url FROM foods WHERE id = $1 AND available = true',
      [foodId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('MenuService', `Failed to get food by ID: ${foodId}`, error.message);
    throw error;
  }
}

/**
 * Search food items by name
 * @param {string} name - Name to search
 * @returns {Promise<Array>}
 */
export async function searchFoodByName(name) {
  try {
    const result = await pool.query(
      'SELECT id, name, price, description, category, image_url FROM foods WHERE LOWER(name) LIKE LOWER($1) AND available = true',
      [`%${name}%`]
    );
    return result.rows;
  } catch (error) {
    logger.error('MenuService', `Failed to search food: ${name}`, error.message);
    throw error;
  }
}

/**
 * Get recommended food items based on tag/keyword
 * @param {string} tag - Tag or keyword (e.g., "spicy", "soup", "veg")
 * @returns {Promise<Array>}
 */
export async function getRecommendations(tag) {
  try {
    // Random selection if no tag
    if (!tag || tag === 'random') {
      const result = await pool.query(
        `SELECT id, name, price, description, category, image_url 
         FROM foods 
         WHERE available = true 
         ORDER BY RANDOM() 
         LIMIT 3`
      );
      return result.rows;
    }
    
    // Search by tag
    const searchTerm = `%${tag}%`;
    const result = await pool.query(
      `SELECT id, name, price, description, category, image_url 
       FROM foods 
       WHERE available = true 
       AND (
         LOWER(name) LIKE LOWER($1) OR 
         LOWER(description) LIKE LOWER($1) OR 
         LOWER(category) LIKE LOWER($1)
       )
       ORDER BY name
       LIMIT 5`,
      [searchTerm]
    );
    return result.rows;
  } catch (error) {
    logger.error('MenuService', `Failed to get recommendations: ${tag}`, error.message);
    throw error;
  }
}

/**
 * Get all menu items (for admin purposes)
 * @returns {Promise<Array>}
 */
export async function getAllFoods() {
  try {
    const result = await pool.query(
      'SELECT * FROM foods ORDER BY category, name'
    );
    return result.rows;
  } catch (error) {
    logger.error('MenuService', 'Failed to get all foods', error.message);
    throw error;
  }
}
