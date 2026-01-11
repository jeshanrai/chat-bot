/**
 * WEBHOOK ROUTES
 * 
 * Routes for Meta webhook verification and message handling
 */

import { Router } from 'express';
import { 
  isWhatsAppWebhook, 
  extractWhatsAppMessages, 
  getWhatsAppVerifyToken,
  isMessengerWebhook,
  extractMessengerMessages,
  getMessengerVerifyToken
} from '../channels/index.js';
import { processMessage } from '../agent/index.js';
import { sendMessengerSenderAction } from '../messaging/messenger.js';
import { logger } from '../utils/logger.js';

const router = Router();

/* ========================
   WHATSAPP WEBHOOK
======================== */

// WhatsApp Verification
router.get('/whatsapp-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  logger.info('WhatsApp', 'Webhook verification request received');
  
  if (mode === 'subscribe' && token === getWhatsAppVerifyToken()) {
    logger.info('WhatsApp', 'Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  
  logger.warn('WhatsApp', 'Webhook verification failed');
  res.sendStatus(403);
});

// WhatsApp Message Handler
router.post('/whatsapp-webhook', async (req, res) => {
  logger.info('WhatsApp', 'Webhook POST received');
  
  if (!isWhatsAppWebhook(req.body)) {
    logger.warn('WhatsApp', 'Not a WhatsApp event, ignoring');
    return res.sendStatus(200);
  }
  
  // Acknowledge immediately (required by Meta)
  res.sendStatus(200);
  
  // Process messages asynchronously
  const messages = extractWhatsAppMessages(req.body);
  
  for (const message of messages) {
    try {
      await processMessage(message);
      logger.info('WhatsApp', `Message processed for ${message.userId}`);
    } catch (error) {
      logger.error('WhatsApp', 'Error processing message', error.message);
    }
  }
});

/* ========================
   MESSENGER WEBHOOK
======================== */

// Messenger Verification
router.get('/messenger-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  logger.info('Messenger', 'Webhook verification request received');
  
  if (mode === 'subscribe' && token === getMessengerVerifyToken()) {
    logger.info('Messenger', 'Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  
  logger.warn('Messenger', 'Webhook verification failed');
  res.sendStatus(403);
});

// Messenger Message Handler
router.post('/messenger-webhook', async (req, res) => {
  logger.info('Messenger', 'Webhook POST received');
  
  if (!isMessengerWebhook(req.body)) {
    logger.warn('Messenger', 'Not a page event, ignoring');
    return res.sendStatus(404);
  }
  
  // Acknowledge immediately (required by Facebook)
  res.status(200).send('EVENT_RECEIVED');
  
  // Process messages asynchronously
  const results = extractMessengerMessages(req.body);
  
  for (const { message } of results) {
    try {
      // Send typing indicator
      await sendMessengerSenderAction(message.userId, 'typing_on');
      
      await processMessage(message);
      logger.info('Messenger', `Message processed for ${message.userId}`);
    } catch (error) {
      logger.error('Messenger', 'Error processing message', error.message);
    }
  }
});

/* ========================
   LEGACY COMBINED WEBHOOK
======================== */

// Legacy Verification (routes to appropriate platform)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.VERIFY_TOKEN;
  
  logger.info('Webhook', 'Legacy verification request');
  
  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Webhook', 'Legacy webhook verified');
    return res.status(200).send(challenge);
  }
  
  res.sendStatus(403);
});

// Legacy Message Handler (routes to appropriate platform)
router.post('/webhook', async (req, res) => {
  logger.info('Webhook', 'Legacy POST received');
  
  // Route to WhatsApp
  if (isWhatsAppWebhook(req.body)) {
    res.sendStatus(200);
    
    const messages = extractWhatsAppMessages(req.body);
    for (const message of messages) {
      try {
        await processMessage(message);
      } catch (error) {
        logger.error('Webhook', 'Error processing WhatsApp message', error.message);
      }
    }
    return;
  }
  
  // Route to Messenger
  if (isMessengerWebhook(req.body)) {
    res.status(200).send('EVENT_RECEIVED');
    
    const results = extractMessengerMessages(req.body);
    for (const { message } of results) {
      try {
        await sendMessengerSenderAction(message.userId, 'typing_on');
        await processMessage(message);
      } catch (error) {
        logger.error('Webhook', 'Error processing Messenger message', error.message);
      }
    }
    return;
  }
  
  res.sendStatus(200);
});

export default router;
