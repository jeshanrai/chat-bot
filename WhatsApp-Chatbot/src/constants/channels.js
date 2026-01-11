/**
 * CHANNEL CONSTANTS
 * 
 * Supported messaging platforms
 */

export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  MESSENGER: 'messenger'
};

// Webhook object types from Meta
export const WEBHOOK_OBJECTS = {
  WHATSAPP: 'whatsapp_business_account',
  MESSENGER: 'page'
};

// Export as frozen object to prevent modification
Object.freeze(CHANNELS);
Object.freeze(WEBHOOK_OBJECTS);
