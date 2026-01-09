import express from 'express';
import whatsappWebhook from './webhooks/whatsapp.js';
import messengerWebhook from './webhooks/messenger.js';
import { handleIncomingMessage } from './orchestrator/index.js';
import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Handle JSON parse errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON Parse Error:', err.message);
    return res.status(400).send({ status: 400, message: err.message }); // Bad request
  }
  next();
});

const port = process.env.PORT || 3000;

// Platform-specific verification tokens
const verifyToken = process.env.VERIFY_TOKEN; // Legacy/shared token
const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.VERIFY_TOKEN;
const messengerVerifyToken = process.env.MESSENGER_VERIFY_TOKEN || process.env.VERIFY_TOKEN;

/* ======================
   DATABASE HEALTH CHECK
====================== */
async function checkDatabase() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Server will continue but database features may not work');
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

/* ======================
   DATABASE INITIALIZATION ENDPOINT
   Call this once after deployment to create tables
====================== */
app.get('/init-db', async (req, res) => {
  const schema = `
    CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_url TEXT,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_wa_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'created',
        payment_method VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
    CREATE INDEX IF NOT EXISTS idx_foods_available ON foods(available);
    CREATE INDEX IF NOT EXISTS idx_orders_user_wa_id ON orders(user_wa_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `;

  const seedData = `
    INSERT INTO foods (name, description, price, category, image_url, available) VALUES
    ('Steamed Veg Momo', 'Fresh vegetables & herbs wrapped in soft dough, steamed to perfection', 180.00, 'momos', 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&q=80', true),
    ('Steamed Chicken Momo', 'Juicy chicken filling in soft steamed dumplings', 220.00, 'momos', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80', true),
    ('Fried Veg Momo', 'Crispy fried vegetable momos with crunchy exterior', 200.00, 'momos', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80', true),
    ('Fried Chicken Momo', 'Golden fried chicken momos, crispy and delicious', 240.00, 'momos', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80', true),
    ('Tandoori Momo', 'Momos grilled in tandoor with special spices', 260.00, 'momos', 'https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=400&q=80', true),
    ('Jhol Momo', 'Steamed momos served in spicy soup gravy', 250.00, 'momos', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80', true),
    ('Veg Thukpa', 'Traditional Tibetan noodle soup with vegetables', 200.00, 'noodles', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', true),
    ('Chicken Thukpa', 'Hearty noodle soup with tender chicken pieces', 250.00, 'noodles', 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80', true),
    ('Veg Chowmein', 'Stir-fried noodles with fresh vegetables', 180.00, 'noodles', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80', true),
    ('Chicken Chowmein', 'Stir-fried noodles with chicken and vegetables', 220.00, 'noodles', 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&q=80', true),
    ('Veg Chopsuey', 'Crispy noodles with vegetable gravy', 220.00, 'noodles', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80', true),
    ('Veg Fried Rice', 'Wok-tossed rice with mixed vegetables', 180.00, 'rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80', true),
    ('Chicken Fried Rice', 'Delicious fried rice with chicken pieces', 220.00, 'rice', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80', true),
    ('Egg Fried Rice', 'Classic egg fried rice with vegetables', 190.00, 'rice', 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&q=80', true),
    ('Chicken Biryani', 'Aromatic basmati rice with spiced chicken', 300.00, 'rice', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', true),
    ('Masala Tea', 'Traditional spiced tea', 40.00, 'beverages', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', true),
    ('Coffee', 'Hot brewed coffee', 60.00, 'beverages', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80', true),
    ('Fresh Lime Soda', 'Refreshing lime soda (sweet/salty)', 80.00, 'beverages', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80', true),
    ('Mango Lassi', 'Creamy mango yogurt drink', 100.00, 'beverages', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80', true),
    ('Cold Coffee', 'Iced coffee with cream', 120.00, 'beverages', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80', true)
    ON CONFLICT DO NOTHING;
  `;

  try {
    console.log('🚀 Initializing database...');

    // Create tables
    await db.query(schema);
    console.log('✅ Tables created');

    // Check if data exists
    const existingData = await db.query('SELECT COUNT(*) FROM foods');
    const count = parseInt(existingData.rows[0].count);

    if (count === 0) {
      await db.query(seedData);
      console.log('✅ Seed data inserted');
    }

    // Get counts
    const foods = await db.query('SELECT COUNT(*) FROM foods');
    const orders = await db.query('SELECT COUNT(*) FROM orders');

    res.json({
      success: true,
      message: 'Database initialized successfully',
      tables: {
        foods: parseInt(foods.rows[0].count),
        orders: parseInt(orders.rows[0].count)
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   UPDATE IMAGES ENDPOINT
   Call this to fix image URLs in existing data
====================== */
app.get('/update-images', async (req, res) => {
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
      const result = await db.query(
        'UPDATE foods SET image_url = $1 WHERE name = $2',
        [item.url, item.name]
      );
      if (result.rowCount > 0) updated++;
    }

    res.json({
      success: true,
      message: `Updated ${updated} food images with real URLs`,
      updated
    });
  } catch (error) {
    console.error('❌ Image update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   DATABASE VIEWER ENDPOINTS
   View all data in the database
====================== */

// View all foods
app.get('/db/foods', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM foods ORDER BY category, id');
    res.json({
      success: true,
      count: result.rows.length,
      foods: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// View all orders
app.get('/db/orders', async (req, res) => {
  try {
    const orders = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({
      success: true,
      count: orders.rows.length,
      orders: orders.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// View order details with items
app.get('/db/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const items = await db.query(`
      SELECT oi.*, f.name, f.price, f.category 
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
      total: items.rows.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// View all order items
app.get('/db/order-items', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT oi.*, f.name as food_name, f.price, o.user_wa_id, o.status 
      FROM order_items oi 
      JOIN foods f ON oi.food_id = f.id 
      JOIN orders o ON oi.order_id = o.id 
      ORDER BY oi.created_at DESC
    `);
    res.json({
      success: true,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database summary dashboard
app.get('/db', async (req, res) => {
  try {
    const foods = await db.query('SELECT COUNT(*) as count FROM foods');
    const orders = await db.query('SELECT COUNT(*) as count FROM orders');
    const orderItems = await db.query('SELECT COUNT(*) as count FROM order_items');
    const recentOrders = await db.query(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(f.price * oi.quantity) FROM order_items oi JOIN foods f ON oi.food_id = f.id WHERE oi.order_id = o.id) as total
      FROM orders o 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    const categoryStats = await db.query(`
      SELECT category, COUNT(*) as count, AVG(price) as avg_price 
      FROM foods 
      GROUP BY category 
      ORDER BY category
    `);

    res.json({
      success: true,
      summary: {
        totalFoods: parseInt(foods.rows[0].count),
        totalOrders: parseInt(orders.rows[0].count),
        totalOrderItems: parseInt(orderItems.rows[0].count)
      },
      categoryStats: categoryStats.rows,
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   WHATSAPP WEBHOOK ENDPOINTS
   Dedicated endpoints for WhatsApp Business API
====================== */

// WhatsApp Webhook Verification
app.get('/whatsapp-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🟢 [WhatsApp Webhook Verification]');
  console.log(`Mode: ${mode}, Token: ${token ? '***' : 'missing'}`);

  if (mode === 'subscribe' && token === whatsappVerifyToken) {
    console.log('✅ WHATSAPP WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  console.log('❌ WhatsApp webhook verification failed');
  res.sendStatus(403);
});

// WhatsApp Webhook Receiver
app.post('/whatsapp-webhook', async (req, res) => {
  console.log('\n🟢 [WHATSAPP WEBHOOK] POST /whatsapp-webhook');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));

  const object = req.body.object;

  if (object !== 'whatsapp_business_account') {
    console.log('⚠️ Not a WhatsApp event, ignoring');
    return res.sendStatus(200);
  }

  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;

  if (Array.isArray(messages)) {
    for (const message of messages) {
      const userId = message.from;
      const userName = value?.contacts?.[0]?.profile?.name || 'Unknown';
      const messageType = message.type || 'text';

      console.log(`\n━━━ WHATSAPP MESSAGE ━━━`);
      console.log(`📱 From: ${userName} (${userId})`);
      console.log(`📝 Type: ${messageType}`);

      // Build message object for orchestrator
      const msgObject = {
        userId,
        platform: 'whatsapp',
        type: messageType
      };

      // Handle different message types
      if (messageType === 'text') {
        msgObject.text = message.text?.body || '';
        console.log(`💬 Message: ${msgObject.text}`);
      } else if (messageType === 'interactive') {
        // Handle button replies and list replies
        msgObject.interactive = message.interactive;
        if (message.interactive?.type === 'button_reply') {
          msgObject.text = message.interactive.button_reply.title;
          console.log(`🔘 Button: ${message.interactive.button_reply.title} (${message.interactive.button_reply.id})`);
        } else if (message.interactive?.type === 'list_reply') {
          msgObject.text = message.interactive.list_reply.title;
          console.log(`📋 List Selection: ${message.interactive.list_reply.title} (${message.interactive.list_reply.id})`);
        }
      }

      // Skip if no processable content
      if (!msgObject.text && !msgObject.interactive) {
        console.log(`⏭️ Skipping unsupported message type`);
        continue;
      }

      try {
        await handleIncomingMessage(msgObject);
        console.log(`✅ WhatsApp message processed for ${userId}\n`);
      } catch (error) {
        console.error(`❌ Error processing WhatsApp message:`, error);
      }
    }
  }

  return res.sendStatus(200);
});

/* ======================
   MESSENGER WEBHOOK ENDPOINTS
   Dedicated endpoints for Facebook Messenger
====================== */

// Messenger Webhook Verification
app.get('/messenger-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🟦 [Messenger Webhook Verification]');
  console.log(`Mode: ${mode}, Token: ${token ? '***' : 'missing'}`);

  if (mode === 'subscribe' && token === messengerVerifyToken) {
    console.log('✅ MESSENGER WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  console.log('❌ Messenger webhook verification failed');
  res.sendStatus(403);
});

// Messenger Webhook Receiver
app.post('/messenger-webhook', async (req, res) => {
  console.log('\n🟦 [MESSENGER WEBHOOK] POST /messenger-webhook');
  return messengerWebhook(req, res);
});

/* ======================
   LEGACY COMBINED WEBHOOK (backward compatibility)
   Routes to appropriate handler based on body.object
====================== */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔔 [Legacy Webhook Verification]');

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ LEGACY WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  console.log('\n🔔 [LEGACY WEBHOOK] POST /webhook');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));

  const object = req.body.object;

  // Route to WhatsApp handler
  if (object === 'whatsapp_business_account') {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (Array.isArray(messages)) {
      for (const message of messages) {
        const userId = message.from;
        const userName = value?.contacts?.[0]?.profile?.name || 'Unknown';
        const messageType = message.type || 'text';

        console.log(`\n━━━ INCOMING MESSAGE ━━━`);
        console.log(`📱 From: ${userName} (${userId})`);
        console.log(`📝 Type: ${messageType}`);

        const msgObject = {
          userId,
          platform: 'whatsapp',
          type: messageType
        };

        if (messageType === 'text') {
          msgObject.text = message.text?.body || '';
          console.log(`💬 Message: ${msgObject.text}`);
        } else if (messageType === 'interactive') {
          msgObject.interactive = message.interactive;
          if (message.interactive?.type === 'button_reply') {
            msgObject.text = message.interactive.button_reply.title;
            console.log(`🔘 Button: ${message.interactive.button_reply.title} (${message.interactive.button_reply.id})`);
          } else if (message.interactive?.type === 'list_reply') {
            msgObject.text = message.interactive.list_reply.title;
            console.log(`📋 List Selection: ${message.interactive.list_reply.title} (${message.interactive.list_reply.id})`);
          }
        }

        if (!msgObject.text && !msgObject.interactive) {
          console.log(`⏭️ Skipping unsupported message type`);
          continue;
        }

        try {
          await handleIncomingMessage(msgObject);
          console.log(`✅ Message processed for ${userId}\n`);
        } catch (error) {
          console.error(`❌ Error processing message:`, error);
        }
      }
    }

    return res.sendStatus(200);
  }

  // Route to Messenger handler
  if (object === 'page') {
    return messengerWebhook(req, res);
  }

  res.sendStatus(200);
});

/* ======================
   SERVER START
====================== */
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await checkDatabase();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Keep the server alive and handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});