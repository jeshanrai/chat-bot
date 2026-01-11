/**
 * WHATSAPP CHANNEL
 * 
 * Handles incoming WhatsApp webhook payloads
 */

import { normalizeWhatsAppMessage } from '../normalizers/index.js';
import { logger } from '../utils/logger.js';
import { WEBHOOK_OBJECTS } from '../constants/channels.js';

/**
 * Check if webhook payload is from WhatsApp
 * @param {Object} body - Request body
 * @returns {boolean}
 */
export function isWhatsAppWebhook(body) {
  return body?.object === WEBHOOK_OBJECTS.WHATSAPP;
}

/**
 * Extract messages from WhatsApp webhook payload
 * @param {Object} body - Webhook request body
 * @returns {Array<NormalizedMessage>}
 */
export function extractWhatsAppMessages(body) {
  const messages = [];
  
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const rawMessages = value?.messages;
  
  if (!Array.isArray(rawMessages)) {
    return messages;
  }
  
  for (const message of rawMessages) {
    const normalized = normalizeWhatsAppMessage(message, value);
    
    if (normalized && normalized.text) {
      logger.info('WhatsApp', `Message from ${normalized.userName}: ${normalized.text}`);
      messages.push(normalized);
    } else {
      logger.debug('WhatsApp', `Skipping unsupported message type: ${message.type}`);
    }
  }
  
  return messages;
}

/**
 * Get verification token for WhatsApp
 * @returns {string}
 */
export function getWhatsAppVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || process.env.VERIFY_TOKEN;
}
