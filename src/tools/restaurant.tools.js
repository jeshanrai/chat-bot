/**
 * RESTAURANT TOOLS LAYER
 * 
 * This layer:
 * ❌ NEVER formats messages
 * ❌ NEVER calls OpenAI/LLM
 * ✅ ONLY returns raw data from database
 */

import db from '../db.js';

/**
 * Get menu categories or items by category
 * @param {string|null} category - Optional category to filter by
 * @returns {Promise<Array>} - Array of categories or food items
 */
async function getMenu(category = null) {
  if (!category) {
    // Return all distinct categories
    const res = await db.query(
      'SELECT DISTINCT category FROM foods WHERE available = true ORDER BY category'
    );
    return res.rows;
  }

  // Return food items for specific category
  const res = await db.query(
    'SELECT id, name, price, description, image_url FROM foods WHERE category = $1 AND available = true ORDER BY name',
    [category]
  );
  return res.rows;
}

/**
 * Get a specific food item by ID
 * @param {number} foodId - The food item ID
 * @returns {Promise<Object|null>} - Food item or null
 */
async function getFoodById(foodId) {
  const res = await db.query(
    'SELECT id, name, price, description, category, image_url FROM foods WHERE id = $1 AND available = true',
    [foodId]
  );
  return res.rows[0] || null;
}

/**
 * Get a food item by name (case-insensitive partial match)
 * @param {string} name - Food name to search
 * @returns {Promise<Array>} - Matching food items
 */
async function getFoodByName(name) {
  const res = await db.query(
    'SELECT id, name, price, description, category, image_url FROM foods WHERE LOWER(name) LIKE LOWER($1) AND available = true',
    [`%${name}%`]
  );
  return res.rows;
}

/**
 * Get recommended food items based on tag/keyword
 * @param {string} tag - Tag or keyword (e.g., "spicy", "soup", "veg")
 * @returns {Promise<Array>} - Matching food items
 */
async function getRecommendedFoods(tag) {
  if (!tag || tag === 'random') {
    // Random selection
    const res = await db.query(
      `SELECT id, name, price, description, category, image_url 
       FROM foods 
       WHERE available = true 
       ORDER BY RANDOM() 
       LIMIT 1`
    );
    return res.rows;
  }

  const searchTerm = `%${tag}%`;
  const res = await db.query(
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
  return res.rows;
}

/**
 * Create a new order for a WhatsApp user
 * @param {string} userWaId - WhatsApp user ID
 * @returns {Promise<Object>} - Created order with id
 */
/**
 * Create a new order for a user
 * @param {string} userId - User ID (WAID or PSID)
 * @param {string} platform - Platform (whatsapp/messenger)
 * @returns {Promise<Object>} - Created order with id
 */
async function createOrder(userId, platform = 'whatsapp') {
  const res = await db.query(
    'INSERT INTO orders (user_id, platform, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, status, created_at',
    [userId, platform, 'created']
  );
  return res.rows[0];
}

/**
 * Get current active order for a user (not completed/cancelled)
 * @param {string} userWaId - WhatsApp user ID
 * @returns {Promise<Object|null>} - Active order or null
 */
async function getActiveOrder(userWaId) {
  const res = await db.query(
    `SELECT id, status, payment_method, created_at 
     FROM orders 
     WHERE user_id = $1 AND status NOT IN ('completed', 'cancelled') 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

/**
 * Add an item to an order
 * @param {number} orderId - Order ID
 * @param {number} foodId - Food item ID
 * @param {number} quantity - Quantity to add
 * @returns {Promise<Object>} - Created order item
 */
async function addItem(orderId, foodId, quantity = 1) {
  // Check if item already exists in order
  const existing = await db.query(
    'SELECT id, quantity FROM order_items WHERE order_id = $1 AND food_id = $2',
    [orderId, foodId]
  );

  if (existing.rows.length > 0) {
    // Update quantity
    const newQty = existing.rows[0].quantity + quantity;
    const res = await db.query(
      'UPDATE order_items SET quantity = $1 WHERE id = $2 RETURNING id, order_id, food_id, quantity',
      [newQty, existing.rows[0].id]
    );
    return res.rows[0];
  }

  // Insert new item
  const res = await db.query(
    'INSERT INTO order_items (order_id, food_id, quantity) VALUES ($1, $2, $3) RETURNING id, order_id, food_id, quantity',
    [orderId, foodId, quantity]
  );
  return res.rows[0];
}

/**
 * Remove an item from an order
 * @param {number} orderId - Order ID
 * @param {number} foodId - Food item ID
 * @returns {Promise<boolean>} - Success status
 */
async function removeItem(orderId, foodId) {
  const res = await db.query(
    'DELETE FROM order_items WHERE order_id = $1 AND food_id = $2 RETURNING id',
    [orderId, foodId]
  );
  return res.rowCount > 0;
}

/**
 * Get all items in an order with food details
 * @param {number} orderId - Order ID
 * @returns {Promise<Array>} - Order items with food details
 */
async function getOrderItems(orderId) {
  const res = await db.query(
    `SELECT oi.id, oi.quantity, f.id as food_id, f.name, f.price, f.category,
            (oi.quantity * f.price) as subtotal
     FROM order_items oi
     JOIN foods f ON oi.food_id = f.id
     WHERE oi.order_id = $1
     ORDER BY f.name`,
    [orderId]
  );
  return res.rows;
}

/**
 * Get order total
 * @param {number} orderId - Order ID
 * @returns {Promise<number>} - Total amount
 */
async function getOrderTotal(orderId) {
  const res = await db.query(
    `SELECT COALESCE(SUM(oi.quantity * f.price), 0) as total
     FROM order_items oi
     JOIN foods f ON oi.food_id = f.id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return parseFloat(res.rows[0].total) || 0;
}

/**
 * Update order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated order
 */
async function updateOrderStatus(orderId, status) {
  const res = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status, payment_method',
    [status, orderId]
  );
  return res.rows[0];
}

/**
 * Select payment method and confirm order
 * @param {number} orderId - Order ID
 * @param {string} method - Payment method ('COD' or 'ONLINE')
 * @returns {Promise<Object>} - Updated order
 */
async function selectPayment(orderId, method) {
  const res = await db.query(
    'UPDATE orders SET payment_method = $1, status = $2 WHERE id = $3 RETURNING id, status, payment_method',
    [method, 'confirmed', orderId]
  );
  return res.rows[0];
}

/**
 * Cancel an order
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>} - Cancelled order
 */
async function cancelOrder(orderId) {
  const res = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
    ['cancelled', orderId]
  );
  return res.rows[0];
}

/**
 * Get order history for a user
 * @param {string} userWaId - WhatsApp user ID
 * @param {number} limit - Max number of orders
 * @returns {Promise<Array>} - Order history
 */
async function getOrderHistory(userWaId, limit = 5) {
  const res = await db.query(
    `SELECT o.id, o.status, o.payment_method, o.created_at,
            COUNT(oi.id) as item_count,
            COALESCE(SUM(oi.quantity * f.price), 0) as total
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN foods f ON oi.food_id = f.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

/**
 * Update service type (dine_in vs delivery)
 * @param {number} orderId - Order ID
 * @param {string} type - Service type
 * @returns {Promise<Object>} - Updated order
 */
async function updateServiceType(orderId, type) {
  const res = await db.query(
    'UPDATE orders SET service_type = $1 WHERE id = $2 RETURNING id, service_type',
    [type, orderId]
  );
  return res.rows[0];
}

/**
 * Update delivery address
 * @param {number} orderId - Order ID
 * @param {string} address - Delivery address
 * @returns {Promise<Object>} - Updated order
 */
async function updateDeliveryAddress(orderId, address) {
  const res = await db.query(
    'UPDATE orders SET address = $1 WHERE id = $2 RETURNING id, address',
    [address, orderId]
  );
  return res.rows[0];
}

/**
 * Update reservation details for dine-in orders
 * @param {number} orderId - Order ID
 * @param {number} partySize - Number of people
 * @param {string} arrivalTime - Expected arrival time
 * @returns {Promise<Object>} - Updated order
 */
async function updateReservation(orderId, partySize, arrivalTime) {
  const res = await db.query(
    'UPDATE orders SET party_size = $1, arrival_time = $2 WHERE id = $3 RETURNING id, party_size, arrival_time',
    [partySize, arrivalTime, orderId]
  );
  return res.rows[0];
}

/**
 * Update deposit status for dine-in orders
 * @param {number} orderId - Order ID
 * @param {number} amount - Deposit amount
 * @param {string} status - Deposit status ('pending', 'paid', 'refunded')
 * @returns {Promise<Object>} - Updated order
 */
async function updateDepositStatus(orderId, amount, status) {
  const res = await db.query(
    'UPDATE orders SET deposit_amount = $1, deposit_status = $2 WHERE id = $3 RETURNING id, deposit_amount, deposit_status',
    [amount, status, orderId]
  );
  return res.rows[0];
}

/**
 * Get category image (first item's image from category)
 * @param {string} category - Category name
 * @returns {Promise<string|null>} - Image URL or null
 */
async function getCategoryImage(category) {
  const res = await db.query(
    'SELECT image_url FROM foods WHERE category = $1 AND available = true AND image_url IS NOT NULL LIMIT 1',
    [category]
  );
  return res.rows[0]?.image_url || null;
}

export {
  getMenu,
  getFoodById,
  getFoodByName,
  getRecommendedFoods,
  createOrder,
  getActiveOrder,
  addItem,
  removeItem,
  getOrderItems,
  getOrderTotal,
  updateOrderStatus,
  selectPayment,
  cancelOrder,
  getOrderHistory,
  updateServiceType,
  updateDeliveryAddress,
  updateReservation,
  updateDepositStatus,
  getCategoryImage
};
