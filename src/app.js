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
/*
/*
// app.get('/init-db', async (req, res) => {
//   // ... (code removed/commented out as requested) ...
// });
*/


/* ======================
   UPDATE IMAGES ENDPOINT
   Call this to fix image URLs in existing data
====================== */
/*
// app.get('/update-images', async (req, res) => {
//   // ... (code removed/commented out as requested) ...
// });
*/

/* ======================
   DATABASE VIEWER ENDPOINTS
   View all data in the database
====================== */

// View all foods
/*
// app.get('/db/foods', ...
// app.get('/db/orders', ...
// app.get('/db/orders/:id', ...
// app.get('/db/order-items', ...
// app.get('/db', ...
*/

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
  return whatsappWebhook(req, res);
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