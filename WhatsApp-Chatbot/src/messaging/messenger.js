/**
 * MESSENGER MESSAGING
 * 
 * Send messages via Facebook Messenger Send API
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

/**
 * Get Messenger API configuration
 */
function getConfig() {
  return {
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN,
    apiVersion: process.env.MESSENGER_API_VERSION || 'v18.0'
  };
}

/**
 * Handle Messenger API errors
 * @param {Object} error - Error object from API
 */
function handleMessengerError(error) {
  const code = error.code;
  const message = error.message;
  
  logger.error('Messenger', `API Error [${code}]: ${message}`);
  
  // Common error codes
  if (code === 10) {
    logger.warn('Messenger', 'User has blocked the page or conversation is inactive');
  } else if (code === 200) {
    logger.warn('Messenger', 'Message was not sent - user may have messaging disabled');
  } else if (code === 551) {
    logger.warn('Messenger', 'User is not available for messaging');
  }
}

/**
 * Send a request to Messenger Send API
 * @param {Object} body - Request body
 * @returns {Promise<Object|null>}
 */
async function sendRequest(body) {
  const { pageAccessToken, apiVersion } = getConfig();
  
  if (!pageAccessToken) {
    logger.error('Messenger', 'Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }
  
  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const json = await response.json();
    
    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }
    
    logger.info('Messenger', `Message sent: ${json.message_id}`);
    return json;
  } catch (error) {
    logger.error('Messenger', 'Request failed', error.message);
    return null;
  }
}

/**
 * Send a text message
 * @param {string} recipientId - Recipient PSID
 * @param {string} text - Message text
 */
export async function sendMessengerMessage(recipientId, text) {
  if (!recipientId || recipientId === 'undefined') {
    logger.error('Messenger', 'Invalid recipient ID');
    return null;
  }
  
  logger.response(recipientId, 'Text', text);
  
  return sendRequest({
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE'
  });
}

/**
 * Send typing indicator or other sender actions
 * @param {string} recipientId - Recipient PSID
 * @param {string} action - 'typing_on', 'typing_off', 'mark_seen'
 */
export async function sendMessengerSenderAction(recipientId, action) {
  if (!recipientId) return null;
  
  return sendRequest({
    recipient: { id: recipientId },
    sender_action: action
  });
}

/**
 * Send quick replies
 * @param {string} recipientId - Recipient PSID
 * @param {string} text - Message text
 * @param {Array} quickReplies - Quick reply buttons
 */
export async function sendMessengerQuickReplies(recipientId, text, quickReplies) {
  logger.response(recipientId, 'QuickReplies', `${text} [${quickReplies.length} options]`);
  
  return sendRequest({
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: {
      text,
      quick_replies: quickReplies.map(qr => ({
        content_type: 'text',
        title: qr.title.substring(0, 20),
        payload: qr.payload || qr.title
      }))
    }
  });
}

/**
 * Send a generic template (carousel)
 * @param {string} recipientId - Recipient PSID
 * @param {Array} elements - Template elements
 */
export async function sendMessengerGenericTemplate(recipientId, elements) {
  logger.response(recipientId, 'GenericTemplate', `${elements.length} cards`);
  
  return sendRequest({
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements.slice(0, 10).map(el => ({
            title: el.title.substring(0, 80),
            subtitle: el.subtitle?.substring(0, 80),
            image_url: el.imageUrl,
            buttons: el.buttons?.slice(0, 3).map(btn => ({
              type: btn.type || 'postback',
              title: btn.title.substring(0, 20),
              payload: btn.payload
            }))
          }))
        }
      }
    }
  });
}

/**
 * Send a button template
 * @param {string} recipientId - Recipient PSID
 * @param {string} text - Message text
 * @param {Array} buttons - Buttons array
 */
export async function sendMessengerButtonTemplate(recipientId, text, buttons) {
  logger.response(recipientId, 'ButtonTemplate', `${text.substring(0, 50)}...`);
  
  return sendRequest({
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text.substring(0, 640),
          buttons: buttons.slice(0, 3).map(btn => ({
            type: btn.type || 'postback',
            title: btn.title.substring(0, 20),
            payload: btn.payload
          }))
        }
      }
    }
  });
}
