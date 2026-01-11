/**
 * MESSAGE TYPES CONSTANTS
 * 
 * Types of messages from platforms
 */

export const MESSAGE_TYPES = {
  // Common types
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
  LOCATION: 'location',
  STICKER: 'sticker',
  
  // Interactive types (WhatsApp)
  INTERACTIVE: 'interactive',
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
  
  // Messenger-specific
  QUICK_REPLY: 'quick_reply',
  POSTBACK: 'postback',
  REFERRAL: 'referral'
};

// Conversation stages
export const CONVERSATION_STAGES = {
  INITIAL: 'initial',
  VIEWING_MENU: 'viewing_menu',
  VIEWING_ITEMS: 'viewing_items',
  ADDING_TO_CART: 'adding_to_cart',
  CONFIRMING_ORDER: 'confirming_order',
  SELECTING_SERVICE: 'selecting_service',
  PROVIDING_ADDRESS: 'providing_address',
  SELECTING_PAYMENT: 'selecting_payment',
  ORDER_COMPLETE: 'order_complete'
};

// Order statuses
export const ORDER_STATUS = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

Object.freeze(MESSAGE_TYPES);
Object.freeze(CONVERSATION_STAGES);
Object.freeze(ORDER_STATUS);
