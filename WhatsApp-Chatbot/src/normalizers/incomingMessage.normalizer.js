/**
 * INCOMING MESSAGE NORMALIZER
 * 
 * Converts platform-specific payloads into a unified internal format
 */

import { CHANNELS, MESSAGE_TYPES } from '../constants/index.js';

/**
 * @typedef {Object} NormalizedMessage
 * @property {string} userId - User identifier (WhatsApp ID or Messenger PSID)
 * @property {string} platform - 'whatsapp' or 'messenger'
 * @property {string} type - Message type (text, interactive, etc.)
 * @property {string} text - The message text content
 * @property {Object} [interactive] - Interactive reply data (button/list selection)
 * @property {string} [messageId] - Original message ID
 * @property {string} [userName] - User's display name if available
 */

/**
 * Normalize WhatsApp message to internal format
 * @param {Object} message - Raw WhatsApp message object
 * @param {Object} value - The 'value' object from webhook payload
 * @returns {NormalizedMessage | null}
 */
export function normalizeWhatsAppMessage(message, value = {}) {
  if (!message) return null;
  
  const userId = message.from;
  const userName = value.contacts?.[0]?.profile?.name || 'Unknown';
  const messageType = message.type || 'text';
  
  const normalized = {
    userId,
    platform: CHANNELS.WHATSAPP,
    type: messageType,
    text: null,
    interactive: null,
    messageId: message.id,
    userName
  };
  
  // Handle different message types
  switch (messageType) {
    case 'text':
      normalized.text = message.text?.body || '';
      break;
      
    case 'interactive':
      normalized.interactive = message.interactive;
      if (message.interactive?.type === 'button_reply') {
        normalized.text = message.interactive.button_reply.title;
        normalized.type = MESSAGE_TYPES.BUTTON_REPLY;
      } else if (message.interactive?.type === 'list_reply') {
        normalized.text = message.interactive.list_reply.title;
        normalized.type = MESSAGE_TYPES.LIST_REPLY;
      }
      break;
      
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker':
    case 'location':
      normalized.text = `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)}]`;
      break;
      
    default:
      return null;
  }
  
  return normalized;
}

/**
 * Normalize Messenger message to internal format
 * @param {string} senderPsid - Sender's Page-scoped ID
 * @param {Object} receivedMessage - Raw Messenger message object
 * @returns {NormalizedMessage | null}
 */
export function normalizeMessengerMessage(senderPsid, receivedMessage) {
  if (!senderPsid || !receivedMessage) return null;
  
  const normalized = {
    userId: senderPsid,
    platform: CHANNELS.MESSENGER,
    type: MESSAGE_TYPES.TEXT,
    text: null,
    interactive: null,
    messageId: receivedMessage.mid
  };
  
  // Text message
  if (receivedMessage.text) {
    normalized.text = receivedMessage.text;
  }
  
  // Quick reply
  if (receivedMessage.quick_reply?.payload) {
    normalized.text = receivedMessage.quick_reply.payload;
    normalized.type = MESSAGE_TYPES.QUICK_REPLY;
    normalized.interactive = {
      type: 'quick_reply',
      payload: receivedMessage.quick_reply.payload
    };
  }
  
  // Attachments
  if (receivedMessage.attachments?.length > 0) {
    const attachment = receivedMessage.attachments[0];
    switch (attachment.type) {
      case 'image':
        normalized.text = '[Image attachment]';
        normalized.type = MESSAGE_TYPES.IMAGE;
        break;
      case 'sticker':
        normalized.text = '[Sticker]';
        normalized.type = MESSAGE_TYPES.STICKER;
        break;
      case 'audio':
        normalized.text = '[Audio message]';
        normalized.type = MESSAGE_TYPES.AUDIO;
        break;
      case 'video':
        normalized.text = '[Video]';
        normalized.type = MESSAGE_TYPES.VIDEO;
        break;
      case 'location':
        const coords = attachment.payload?.coordinates;
        normalized.text = coords 
          ? `[Location: ${coords.lat}, ${coords.long}]`
          : '[Location shared]';
        normalized.type = MESSAGE_TYPES.LOCATION;
        break;
      default:
        normalized.text = '[Attachment]';
    }
  }
  
  return normalized.text ? normalized : null;
}

/**
 * Normalize Messenger postback to internal format
 * @param {string} senderPsid - Sender's Page-scoped ID
 * @param {Object} postback - Postback object
 * @returns {NormalizedMessage | null}
 */
export function normalizeMessengerPostback(senderPsid, postback) {
  if (!senderPsid || !postback) return null;
  
  return {
    userId: senderPsid,
    platform: CHANNELS.MESSENGER,
    type: MESSAGE_TYPES.POSTBACK,
    text: postback.payload || postback.title,
    interactive: {
      type: 'postback',
      payload: postback.payload,
      title: postback.title
    }
  };
}
