/**
 * MENU TOOLS
 * 
 * Tool adapters for menu-related operations
 * These call services - NO direct database access
 */

import * as menuService from '../services/menu.service.js';
import { sendListMessage, sendMessage } from '../messaging/index.js';
import { getCategoryEmoji, formatPrice } from '../messaging/message.builders.js';
import { CONVERSATION_STAGES } from '../constants/messageTypes.js';
import { logger } from '../utils/logger.js';

/**
 * Show food categories menu
 */
export async function showFoodMenu(args, userId, context) {
  try {
    const categories = await menuService.getCategories();
    
    const rows = categories.map(cat => ({
      id: `cat_${cat.category}`,
      title: `${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ${getCategoryEmoji(cat.category)}`,
      description: `Browse our ${cat.category} options`
    }));
    
    const sections = [{
      title: 'Food Categories',
      rows: rows.length > 0 ? rows : [
        { id: 'cat_momos', title: 'Momos 🥟', description: 'Steamed, fried, tandoori varieties' }
      ]
    }];
    
    await sendListMessage(
      userId,
      context.platform,
      '🍽️ Restaurant Menu',
      'Welcome! What would you like to order today? Browse our delicious categories below.',
      'Tap to view options',
      'View Categories',
      sections
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.VIEWING_MENU,
        lastAction: 'show_food_menu'
      }
    };
  } catch (error) {
    logger.error('MenuTools', 'Failed to show menu', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't load the menu. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Show items in a specific category
 */
export async function showCategoryItems(args, userId, context) {
  try {
    const category = args.category || 'momos';
    const foods = await menuService.getFoodsByCategory(category);
    
    if (foods.length === 0) {
      await sendMessage(userId, context.platform, `No items found in ${category}. Try another category!`);
      return await showFoodMenu({}, userId, context);
    }
    
    const cart = context.cart || [];
    const categoryEmoji = getCategoryEmoji(category);
    
    let bodyText = `Browse our delicious ${category}! Select any item to add it to your cart.`;
    if (cart.length > 0) {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      bodyText = `🛒 Cart: ${itemCount} item(s) - ${formatPrice(total)}\n\nSelect items to add:`;
    }
    
    const rows = foods.slice(0, 10).map(food => ({
      id: `add_${food.id}`,
      title: food.name.substring(0, 24),
      description: `${formatPrice(food.price)} - ${(food.description || '').substring(0, 50)}`
    }));
    
    const sections = [{
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} ${categoryEmoji}`,
      rows
    }];
    
    await sendListMessage(
      userId,
      context.platform,
      `${categoryEmoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      bodyText,
      'Tap to add items to cart',
      'Select Item',
      sections
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.VIEWING_ITEMS,
        currentCategory: category,
        lastAction: 'show_category_items',
        cart
      }
    };
  } catch (error) {
    logger.error('MenuTools', 'Failed to show category items', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't load the items. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Recommend food items based on preference
 */
export async function recommendFood(args, userId, context) {
  try {
    const tag = args.tag || 'random';
    const recommendations = await menuService.getRecommendations(tag);
    
    if (recommendations.length === 0) {
      await sendMessage(userId, context.platform, `Sorry, I couldn't find items matching "${tag}". Try browsing our menu!`);
      return await showFoodMenu({}, userId, context);
    }
    
    const rows = recommendations.map(food => ({
      id: `add_${food.id}`,
      title: food.name.substring(0, 24),
      description: `${formatPrice(food.price)} - ${(food.description || '').substring(0, 50)}`
    }));
    
    const sections = [{ title: 'Recommendations', rows }];
    
    const headerText = tag === 'random' 
      ? "🎲 Chef's Special Picks" 
      : `🔍 Results for "${tag}"`;
    
    await sendListMessage(
      userId,
      context.platform,
      headerText,
      `Here are some great options for you! Tap to add to cart.`,
      'View Recommendations',
      'Our Picks',
      sections
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastAction: 'recommend_food'
      }
    };
  } catch (error) {
    logger.error('MenuTools', 'Failed to get recommendations', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't find recommendations. Try browsing our menu!");
    return { reply: null, updatedContext: context };
  }
}
