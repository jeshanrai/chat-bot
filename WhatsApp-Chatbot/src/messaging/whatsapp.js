/**
 * WHATSAPP MESSAGING
 * 
 * Send messages via WhatsApp Cloud API
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

/**
 * Get WhatsApp API configuration
 */
function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0'
  };
}

/**
 * Send a request to WhatsApp Cloud API
 * @param {Object} payload - Message payload
 * @returns {Promise<Object|null>}
 */
async function sendRequest(payload) {
  const { phoneNumberId, accessToken, apiVersion } = getConfig();
  
  if (!phoneNumberId || !accessToken) {
    logger.error('WhatsApp', 'Missing credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return null;
  }
  
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('WhatsApp', 'API error', error);
      return null;
    }
    
    const result = await response.json();
    logger.info('WhatsApp', `Message sent: ${result.messages?.[0]?.id}`);
    return result;
  } catch (error) {
    logger.error('WhatsApp', 'Request failed', error.message);
    return null;
  }
}

/**
 * Send a text message
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text
 */
export async function sendWhatsAppMessage(to, text) {
  logger.response(to, 'Text', text);
  
  return sendRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text }
  });
}

/**
 * Send a button message
 * @param {string} to - Recipient
 * @param {string} header - Header text
 * @param {string} body - Body text
 * @param {string} footer - Footer text
 * @param {Array} buttons - Buttons array
 */
export async function sendWhatsAppButtonMessage(to, header, body, footer, buttons) {
  logger.response(to, 'Buttons', `${header}: ${buttons.map(b => b.reply?.title).join(', ')}`);
  
  return sendRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: header ? { type: 'text', text: header } : undefined,
      body: { text: body },
      footer: footer ? { text: footer } : undefined,
      action: { buttons }
    }
  });
}

/**
 * Send a list message
 * @param {string} to - Recipient
 * @param {string} header - Header text
 * @param {string} body - Body text
 * @param {string} buttonText - Button text
 * @param {string} sectionTitle - Section title
 * @param {Array} sections - Sections array
 */
export async function sendWhatsAppListMessage(to, header, body, buttonText, sectionTitle, sections) {
  logger.response(to, 'List', `${header} (${sections.length} sections)`);
  
  return sendRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: header ? { type: 'text', text: header } : undefined,
      body: { text: body },
      action: {
        button: buttonText,
        sections
      }
    }
  });
}

/**
 * Send a carousel message
 * @param {string} to - Recipient
 * @param {string} body - Body text
 * @param {Array} cards - Cards array
 */
export async function sendWhatsAppCarouselMessage(to, body, cards) {
  logger.response(to, 'Carousel', `${cards.length} cards`);
  
  return sendRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'carousel',
      body: { text: body },
      action: { cards }
    }
  });
}

/**
 * Send an image message
 * @param {string} to - Recipient
 * @param {string} imageUrl - Image URL
 * @param {string} caption - Optional caption
 */
export async function sendWhatsAppImageMessage(to, imageUrl, caption) {
  logger.response(to, 'Image', caption || '[Image]');
  
  return sendRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      caption
    }
  });
}
