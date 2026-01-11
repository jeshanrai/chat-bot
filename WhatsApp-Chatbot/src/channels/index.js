/**
 * CHANNELS INDEX
 * 
 * Central export for all channel handlers
 */

export { 
  isWhatsAppWebhook, 
  extractWhatsAppMessages, 
  getWhatsAppVerifyToken 
} from './whatsapp.js';

export { 
  isMessengerWebhook, 
  extractMessengerMessages, 
  getMessengerVerifyToken 
} from './messenger.js';
