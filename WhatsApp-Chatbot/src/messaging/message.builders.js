/**
 * MESSAGE BUILDERS
 * 
 * Shared payload construction for WhatsApp and Messenger
 */

/**
 * Build a button object for WhatsApp
 * @param {string} id - Button ID
 * @param {string} title - Button title (max 20 chars)
 * @returns {Object}
 */
export function buildWhatsAppButton(id, title) {
  return {
    type: 'reply',
    reply: {
      id,
      title: title.substring(0, 20)
    }
  };
}

/**
 * Build list rows for WhatsApp list message
 * @param {Array<{id: string, title: string, description?: string}>} items 
 * @returns {Array}
 */
export function buildWhatsAppListRows(items) {
  return items.map(item => ({
    id: item.id,
    title: item.title.substring(0, 24),
    description: item.description?.substring(0, 72) || ''
  }));
}

/**
 * Build a quick reply for Messenger
 * @param {string} title - Button title (max 20 chars)
 * @param {string} payload - Payload string
 * @returns {Object}
 */
export function buildMessengerQuickReply(title, payload) {
  return {
    content_type: 'text',
    title: title.substring(0, 20),
    payload: payload || title
  };
}

/**
 * Build a generic template element for Messenger
 * @param {Object} params 
 * @returns {Object}
 */
export function buildMessengerElement({ title, subtitle, imageUrl, buttons }) {
  return {
    title: title.substring(0, 80),
    subtitle: subtitle?.substring(0, 80),
    image_url: imageUrl,
    buttons: buttons?.slice(0, 3).map(btn => ({
      type: btn.type || 'postback',
      title: btn.title.substring(0, 20),
      payload: btn.payload
    }))
  };
}

/**
 * Category emojis mapping
 */
export const CATEGORY_EMOJIS = {
  momos: '🥟',
  noodles: '🍜',
  rice: '🍚',
  beverages: '☕',
  default: '🍽️'
};

/**
 * Get emoji for category
 * @param {string} category 
 * @returns {string}
 */
export function getCategoryEmoji(category) {
  return CATEGORY_EMOJIS[category?.toLowerCase()] || CATEGORY_EMOJIS.default;
}

/**
 * Format price in Rupees
 * @param {number} price 
 * @returns {string}
 */
export function formatPrice(price) {
  return `Rs.${parseFloat(price).toFixed(0)}`;
}

/**
 * Format cart summary
 * @param {Array} cart - Cart items
 * @returns {string}
 */
export function formatCartSummary(cart) {
  if (!cart || cart.length === 0) {
    return 'Your cart is empty.';
  }
  
  const lines = cart.map((item, i) => 
    `${i + 1}. ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
  );
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  lines.push('─'.repeat(20));
  lines.push(`Total: ${formatPrice(total)}`);
  
  return lines.join('\n');
}

/**
 * Format order summary for confirmation
 * @param {Array} cart - Cart items
 * @param {Object} options - Additional options
 * @returns {string}
 */
export function formatOrderSummary(cart, options = {}) {
  const lines = ['📋 Order Summary:', ''];
  
  cart.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.name}`);
    lines.push(`   ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}`);
  });
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  lines.push('');
  lines.push('─'.repeat(25));
  lines.push(`💰 Total: ${formatPrice(total)}`);
  
  if (options.serviceType) {
    lines.push(`📍 Service: ${options.serviceType === 'dine_in' ? 'Dine-in' : 'Delivery'}`);
  }
  
  if (options.address) {
    lines.push(`🏠 Address: ${options.address}`);
  }
  
  return lines.join('\n');
}
