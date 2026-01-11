/**
 * MESSENGER CHANNEL
 * 
 * Handles incoming Messenger webhook payloads
 */

import { normalizeMessengerMessage, normalizeMessengerPostback } from '../normalizers/index.js';
import { logger } from '../utils/logger.js';
import { WEBHOOK_OBJECTS } from '../constants/channels.js';

/**
 * Check if webhook payload is from Messenger
 * @param {Object} body - Request body
 * @returns {boolean}
 */
export function isMessengerWebhook(body) {
  return body?.object === WEBHOOK_OBJECTS.MESSENGER;
}

/**
 * Extract messages from Messenger webhook payload
 * @param {Object} body - Webhook request body
 * @returns {Array<{ message: NormalizedMessage, event: Object }>}
 */
export function extractMessengerMessages(body) {
  const results = [];
  
  for (const entry of body.entry || []) {
    const webhookEvents = entry.messaging || [];
    
    for (const event of webhookEvents) {
      const senderPsid = event.sender?.id;
      
      if (!senderPsid) {
        logger.warn('Messenger', 'No sender PSID, skipping event');
        continue;
      }
      
      let normalized = null;
      
      // Handle different event types
      if (event.message) {
        normalized = normalizeMessengerMessage(senderPsid, event.message);
        if (normalized) {
          logger.info('Messenger', `Message from ${senderPsid}: ${normalized.text}`);
        }
      } else if (event.postback) {
        normalized = normalizeMessengerPostback(senderPsid, event.postback);
        if (normalized) {
          logger.info('Messenger', `Postback from ${senderPsid}: ${normalized.text}`);
        }
      } else if (event.read) {
        logger.debug('Messenger', `Message read at: ${event.read.watermark}`);
      } else if (event.delivery) {
        logger.debug('Messenger', `Message delivered at: ${event.delivery.watermark}`);
      }
      
      if (normalized) {
        results.push({ message: normalized, event });
      }
    }
  }
  
  return results;
}

/**
 * Get verification token for Messenger
 * @returns {string}
 */
export function getMessengerVerifyToken() {
  return process.env.MESSENGER_VERIFY_TOKEN || process.env.VERIFY_TOKEN;
}
