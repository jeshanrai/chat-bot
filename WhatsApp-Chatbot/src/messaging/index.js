/**
 * MESSAGING INDEX
 * 
 * Unified messaging interface for all platforms
 */

import { CHANNELS } from '../constants/channels.js';
import * as whatsapp from './whatsapp.js';
import * as messenger from './messenger.js';

// Re-export platform-specific functions
export * from './whatsapp.js';
export * from './messenger.js';
export * from './message.builders.js';

/**
 * Send a text message to any platform
 * @param {string} userId - User identifier
 * @param {string} platform - 'whatsapp' or 'messenger'
 * @param {string} text - Message text
 */
export async function sendMessage(userId, platform, text) {
  if (platform === CHANNELS.MESSENGER) {
    return messenger.sendMessengerMessage(userId, text);
  }
  return whatsapp.sendWhatsAppMessage(userId, text);
}

/**
 * Send a button message to any platform
 * @param {string} userId - User identifier
 * @param {string} platform - Platform
 * @param {string} header - Header text
 * @param {string} body - Body text
 * @param {string} footer - Footer text
 * @param {Array} buttons - Buttons array
 */
export async function sendButtonMessage(userId, platform, header, body, footer, buttons) {
  if (platform === CHANNELS.MESSENGER) {
    const messengerButtons = buttons.map(btn => ({
      type: 'postback',
      title: btn.reply?.title || btn.title,
      payload: btn.reply?.id || btn.payload
    }));
    return messenger.sendMessengerButtonTemplate(userId, `${header}\n\n${body}`, messengerButtons);
  }
  return whatsapp.sendWhatsAppButtonMessage(userId, header, body, footer, buttons);
}

/**
 * Send a list message to any platform
 * @param {string} userId - User identifier
 * @param {string} platform - Platform
 * @param {string} header - Header text
 * @param {string} body - Body text
 * @param {string} buttonText - Button text
 * @param {string} sectionTitle - Section title
 * @param {Array} sections - Sections array
 */
export async function sendListMessage(userId, platform, header, body, buttonText, sectionTitle, sections) {
  if (platform === CHANNELS.MESSENGER) {
    // Convert to generic template for Messenger
    const elements = [];
    sections.forEach(section => {
      section.rows.forEach(row => {
        elements.push({
          title: row.title,
          subtitle: row.description,
          buttons: [{ type: 'postback', title: 'Select', payload: row.id }]
        });
      });
    });
    return messenger.sendMessengerGenericTemplate(userId, elements);
  }
  return whatsapp.sendWhatsAppListMessage(userId, header, body, buttonText, sectionTitle, sections);
}

/**
 * Send a carousel message to any platform
 * @param {string} userId - User identifier
 * @param {string} platform - Platform
 * @param {string} body - Body text
 * @param {Array} cards - Cards array
 */
export async function sendCarouselMessage(userId, platform, body, cards) {
  if (platform === CHANNELS.MESSENGER) {
    const elements = cards.map(card => ({
      title: card.title,
      subtitle: card.description,
      imageUrl: card.image?.url,
      buttons: card.buttons?.map(btn => ({
        type: 'postback',
        title: btn.reply?.title || btn.title,
        payload: btn.reply?.id || btn.payload
      }))
    }));
    return messenger.sendMessengerGenericTemplate(userId, elements);
  }
  return whatsapp.sendWhatsAppCarouselMessage(userId, body, cards);
}
