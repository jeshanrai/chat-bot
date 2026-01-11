/**
 * CART TOOLS
 * 
 * Tool adapters for cart operations
 * These call services - NO direct database access
 */

import * as menuService from '../services/menu.service.js';
import { sendMessage, sendButtonMessage } from '../messaging/index.js';
import { formatPrice, formatCartSummary, buildWhatsAppButton } from '../messaging/message.builders.js';
import { CONVERSATION_STAGES } from '../constants/messageTypes.js';
import { logger } from '../utils/logger.js';

/**
 * Add item to cart by ID
 */
export async function addToCart(args, userId, context) {
  try {
    const foodId = parseInt(args.foodId);
    const quantity = args.quantity || 1;
    const cart = context.cart || [];
    
    const food = await menuService.getFoodById(foodId);
    
    if (!food) {
      await sendMessage(userId, context.platform, "Sorry, that item is not available.");
      return { reply: null, updatedContext: context };
    }
    
    // Check if item already in cart
    const existingItem = cart.find(item => item.foodId === foodId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        foodId: food.id,
        name: food.name,
        price: parseFloat(food.price),
        quantity
      });
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const buttons = [
      buildWhatsAppButton(`more_${context.currentCategory || 'momos'}`, 'Add More ➕'),
      buildWhatsAppButton('view_all_categories', 'Other Categories 📋'),
      buildWhatsAppButton('proceed_checkout', 'Checkout 🛒')
    ];
    
    await sendButtonMessage(
      userId,
      context.platform,
      '✅ Added to Cart',
      `${food.name} x${quantity} added!\n\n🛒 Cart: ${itemCount} items - ${formatPrice(total)}`,
      'What would you like to do next?',
      buttons
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.ADDING_TO_CART,
        cart,
        lastAction: 'add_to_cart'
      }
    };
  } catch (error) {
    logger.error('CartTools', 'Failed to add to cart', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't add that item. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Add item to cart by name
 */
export async function addItemByName(args, userId, context) {
  try {
    const name = args.name;
    const quantity = args.quantity || 1;
    const cart = context.cart || [];
    
    // Search for the food item
    const results = await menuService.searchFoodByName(name);
    
    if (results.length === 0) {
      await sendMessage(userId, context.platform, `Sorry, I couldn't find "${name}" in our menu. Try browsing our categories!`);
      return { reply: null, updatedContext: context };
    }
    
    // Use the first match
    const food = results[0];
    
    // Check if item already in cart
    const existingItem = cart.find(item => item.foodId === food.id);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        foodId: food.id,
        name: food.name,
        price: parseFloat(food.price),
        quantity
      });
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const buttons = [
      buildWhatsAppButton('add_more', 'Add More ➕'),
      buildWhatsAppButton('view_cart', 'View Cart 🛒'),
      buildWhatsAppButton('proceed_checkout', 'Checkout ✅')
    ];
    
    await sendButtonMessage(
      userId,
      context.platform,
      '✅ Added to Cart',
      `${food.name} x${quantity} added!\n\n🛒 Cart: ${itemCount} items - ${formatPrice(total)}`,
      'What would you like to do next?',
      buttons
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.ADDING_TO_CART,
        cart,
        lastAction: 'add_item_by_name'
      }
    };
  } catch (error) {
    logger.error('CartTools', 'Failed to add item by name', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't add that item. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * View current cart
 */
export async function viewCart(args, userId, context) {
  try {
    const cart = context.cart || [];
    
    if (cart.length === 0) {
      await sendMessage(userId, context.platform, "Your cart is empty! Browse our menu to add items. 🍽️");
      return { reply: null, updatedContext: context };
    }
    
    const summary = formatCartSummary(cart);
    
    const buttons = [
      buildWhatsAppButton('add_more', 'Add More ➕'),
      buildWhatsAppButton('clear_cart', 'Clear Cart 🗑️'),
      buildWhatsAppButton('proceed_checkout', 'Checkout ✅')
    ];
    
    await sendButtonMessage(
      userId,
      context.platform,
      '🛒 Your Cart',
      summary,
      'Ready to checkout?',
      buttons
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastAction: 'view_cart'
      }
    };
  } catch (error) {
    logger.error('CartTools', 'Failed to view cart', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't load your cart. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Clear the cart
 */
export async function clearCart(args, userId, context) {
  await sendMessage(userId, context.platform, "🗑️ Your cart has been cleared. Start fresh!");
  
  return {
    reply: null,
    updatedContext: {
      ...context,
      cart: [],
      stage: CONVERSATION_STAGES.INITIAL,
      lastAction: 'clear_cart'
    }
  };
}
