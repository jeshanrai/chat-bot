/**
 * ORDER TOOLS
 * 
 * Tool adapters for order operations
 * These call services - NO direct database access
 */

import * as orderService from '../services/order.service.js';
import { sendMessage, sendButtonMessage } from '../messaging/index.js';
import { formatOrderSummary, formatPrice, buildWhatsAppButton } from '../messaging/message.builders.js';
import { CONVERSATION_STAGES, ORDER_STATUS } from '../constants/messageTypes.js';
import { logger } from '../utils/logger.js';

/**
 * Show order confirmation
 */
export async function confirmOrder(args, userId, context) {
  try {
    const cart = context.cart || [];
    
    if (cart.length === 0) {
      await sendMessage(userId, context.platform, "Your cart is empty! Add some items first. 🍽️");
      return { reply: null, updatedContext: context };
    }
    
    const summary = formatOrderSummary(cart);
    
    const buttons = [
      buildWhatsAppButton('confirm_order', 'Confirm Order ✅'),
      buildWhatsAppButton('cancel_order', 'Cancel Order ❌')
    ];
    
    await sendButtonMessage(
      userId,
      context.platform,
      '🛒 Confirm Your Order',
      `${summary}\n\nPlease confirm your order or cancel to make changes.`,
      'Thank you for ordering with Momo House!',
      buttons
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.CONFIRMING_ORDER,
        lastAction: 'confirm_order'
      }
    };
  } catch (error) {
    logger.error('OrderTools', 'Failed to show confirmation', error.message);
    await sendMessage(userId, context.platform, "Sorry, something went wrong. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Process order confirmation/cancellation
 */
export async function processOrderResponse(args, userId, context) {
  try {
    const action = args.action;
    
    if (action === 'cancelled') {
      await sendMessage(userId, context.platform, "❌ Order cancelled. Your cart is still saved - let me know when you're ready to order!");
      
      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: CONVERSATION_STAGES.VIEWING_MENU,
          lastAction: 'order_cancelled'
        }
      };
    }
    
    if (action === 'confirmed') {
      // Show service type selection
      const buttons = [
        buildWhatsAppButton('service_dine_in', 'Dine-in 🍽️'),
        buildWhatsAppButton('service_delivery', 'Delivery 🚗')
      ];
      
      await sendButtonMessage(
        userId,
        context.platform,
        '📍 Service Type',
        'How would you like to receive your order?',
        'Choose an option',
        buttons
      );
      
      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: CONVERSATION_STAGES.SELECTING_SERVICE,
          lastAction: 'awaiting_service_type'
        }
      };
    }
    
    return { reply: null, updatedContext: context };
  } catch (error) {
    logger.error('OrderTools', 'Failed to process order response', error.message);
    await sendMessage(userId, context.platform, "Sorry, something went wrong. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Set service type (dine-in or delivery)
 */
export async function selectServiceType(args, userId, context) {
  try {
    const serviceType = args.type;
    
    // If no type provided, show options
    if (!serviceType) {
      const buttons = [
        buildWhatsAppButton('service_dine_in', 'Dine-in 🍽️'),
        buildWhatsAppButton('service_delivery', 'Delivery 🚗')
      ];
      
      await sendButtonMessage(
        userId,
        context.platform,
        '📍 Service Type',
        'How would you like to receive your order?',
        'Choose an option',
        buttons
      );
      
      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: CONVERSATION_STAGES.SELECTING_SERVICE,
          lastAction: 'awaiting_service_type'
        }
      };
    }
    
    // Set service type
    if (serviceType === 'delivery') {
      await sendMessage(userId, context.platform, "🚗 Great! Please share your delivery address:");
      
      return {
        reply: null,
        updatedContext: {
          ...context,
          serviceType: 'delivery',
          stage: CONVERSATION_STAGES.PROVIDING_ADDRESS,
          lastAction: 'awaiting_address'
        }
      };
    }
    
    // Dine-in - proceed to payment
    return await showPaymentOptions({}, userId, {
      ...context,
      serviceType: 'dine_in'
    });
  } catch (error) {
    logger.error('OrderTools', 'Failed to select service type', error.message);
    await sendMessage(userId, context.platform, "Sorry, something went wrong. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Set delivery address
 */
export async function provideLocation(args, userId, context) {
  try {
    const address = args.address;
    
    return await showPaymentOptions({}, userId, {
      ...context,
      deliveryAddress: address
    });
  } catch (error) {
    logger.error('OrderTools', 'Failed to set address', error.message);
    await sendMessage(userId, context.platform, "Sorry, something went wrong. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Show payment options
 */
export async function showPaymentOptions(args, userId, context) {
  try {
    const buttons = [
      buildWhatsAppButton('pay_cash', 'Cash 💵'),
      buildWhatsAppButton('pay_card', 'Card 💳'),
      buildWhatsAppButton('pay_esewa', 'eSewa 📱')
    ];
    
    await sendButtonMessage(
      userId,
      context.platform,
      '💰 Payment Method',
      'How would you like to pay?',
      'Select your preferred payment method',
      buttons
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: CONVERSATION_STAGES.SELECTING_PAYMENT,
        lastAction: 'awaiting_payment'
      }
    };
  } catch (error) {
    logger.error('OrderTools', 'Failed to show payment options', error.message);
    await sendMessage(userId, context.platform, "Sorry, something went wrong. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Finalize and save order
 */
export async function finalizeOrder(args, userId, context) {
  try {
    const cart = context.cart || [];
    const paymentMethod = args.paymentMethod || 'cash';
    
    // Create order in database
    const order = await orderService.createOrder(userId, context.platform);
    
    // Add items to order
    for (const item of cart) {
      await orderService.addOrderItem(order.id, item.foodId, item.quantity, item.price);
    }
    
    // Set service details
    await orderService.setServiceDetails(order.id, context.serviceType, context.deliveryAddress);
    
    // Set payment method
    await orderService.setPaymentMethod(order.id, paymentMethod);
    
    // Calculate total
    const total = await orderService.calculateOrderTotal(order.id);
    
    // Confirm order
    await orderService.updateOrderStatus(order.id, ORDER_STATUS.CONFIRMED);
    
    const summary = formatOrderSummary(cart, {
      serviceType: context.serviceType,
      address: context.deliveryAddress
    });
    
    await sendMessage(
      userId, 
      context.platform, 
      `🎉 Order #${order.id} Confirmed!\n\n${summary}\n\n💳 Payment: ${paymentMethod.toUpperCase()}\n\nThank you for ordering with Momo House! We're preparing your order. 🥟`
    );
    
    return {
      reply: null,
      updatedContext: {
        stage: CONVERSATION_STAGES.ORDER_COMPLETE,
        orderId: order.id,
        cart: [],
        lastAction: 'order_finalized'
      }
    };
  } catch (error) {
    logger.error('OrderTools', 'Failed to finalize order', error.message);
    await sendMessage(userId, context.platform, "Sorry, we couldn't process your order. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Show order history
 */
export async function showOrderHistory(args, userId, context) {
  try {
    const orders = await orderService.getUserOrderHistory(userId);
    
    if (orders.length === 0) {
      await sendMessage(userId, context.platform, "You haven't placed any orders yet! Browse our menu to get started. 🍽️");
      return { reply: null, updatedContext: context };
    }
    
    const lines = orders.map((order, i) => {
      const date = new Date(order.created_at).toLocaleDateString();
      return `${i + 1}. Order #${order.id} - ${formatPrice(order.total)} (${order.status}) - ${date}`;
    });
    
    await sendMessage(
      userId,
      context.platform,
      `📋 Your Order History:\n\n${lines.join('\n')}\n\nWant to place a new order? Just say "menu"!`
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastAction: 'show_order_history'
      }
    };
  } catch (error) {
    logger.error('OrderTools', 'Failed to show order history', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't load your order history. Please try again.");
    return { reply: null, updatedContext: context };
  }
}
