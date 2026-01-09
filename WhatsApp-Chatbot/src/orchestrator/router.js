import { detectIntentAndRespond } from '../ai/intentEngine.js';
import { validateToolCall } from '../ai/validator.js';
import { generateToolResponse } from '../ai/responseGenerator.js';
import {
  sendWhatsAppMessage,
  sendWhatsAppListMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppButtonMessage,
  sendWhatsAppCarouselMessage,
  sendOrderConfirmationMessage
} from '../whatsapp/sendmessage.js';
import * as restaurantTools from '../tools/restaurant.tools.js';

// Tool execution handlers
const toolHandlers = {
  // Step 1: Show food category menu (List Message) - FROM DATABASE
  show_food_menu: async (args, userId, context) => {
    try {
      // Fetch categories from database
      const categories = await restaurantTools.getMenu();

      const categoryEmojis = {
        'momos': '🥟',
        'noodles': '🍜',
        'rice': '🍚',
        'beverages': '☕'
      };

      const rows = categories.map(cat => ({
        id: `cat_${cat.category}`,
        title: `${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ${categoryEmojis[cat.category] || '🍽️'}`,
        description: `Browse our ${cat.category} options`
      }));

      const sections = [
        {
          title: 'Food Categories',
          rows: rows.length > 0 ? rows : [
            { id: 'cat_momos', title: 'Momos 🥟', description: 'Steamed, fried, tandoori varieties' }
          ]
        }
      ];

      await sendWhatsAppListMessage(
        userId,
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
          stage: 'viewing_menu',
          lastAction: 'show_food_menu'
        }
      };
    } catch (error) {
      console.error('Error fetching menu:', error);
      await sendWhatsAppMessage(userId, "Sorry, I couldn't load the menu. Please try again.");
      return { reply: null, updatedContext: context };
    }
  },

  // Step 2: Show items in a category - FROM DATABASE (with images in carousel)
  show_category_items: async (args, userId, context) => {
    try {
      const category = args.category || 'momos';
      const foods = await restaurantTools.getMenu(category);

      if (foods.length === 0) {
        await sendWhatsAppMessage(userId, `No items found in ${category}. Try another category!`);
        return await toolHandlers.show_food_menu({}, userId, context);
      }

      // Show current cart summary if items exist
      const cart = context.cart || [];
      let bodyText = `Browse our delicious ${category}! Tap any item to add it to your cart.`;
      if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        bodyText = `🛒 Cart: ${cart.length} item(s) - Rs.${total}\n\nBrowse our ${category}:`;
      }

      // Build carousel cards with images (max 10 cards per WhatsApp limit)
      const cards = foods.slice(0, 10).map(food => ({
        card_index: foods.indexOf(food),
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: food.image_url || 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400&q=80'
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: `**${food.name}**\n${food.description || ''}\n\n💰 Rs.${food.price}`
              }
            ]
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: 0,
            parameters: [
              {
                type: 'payload',
                payload: `add_${food.id}`
              }
            ]
          }
        ]
      }));

      await sendWhatsAppCarouselMessage(
        userId,
        bodyText,
        cards
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: 'viewing_items',
          currentCategory: category,
          lastAction: 'show_category_items',
          cart: context.cart || []
        }
      };
    } catch (error) {
      console.error('Error fetching category items:', error);
      await sendWhatsAppMessage(userId, "Sorry, I couldn't load the items. Please try again.");
      return { reply: null, updatedContext: context };
    }
  },

  // Backward compatibility - show_momo_varieties calls show_category_items
  show_momo_varieties: async (args, userId, context) => {
    return await toolHandlers.show_category_items({ category: 'momos' }, userId, context);
  },

  // Add item to cart - uses database to get item details (IMPROVED: Quick add with quantity options)
  add_to_cart: async (args, userId, context) => {
    try {
      const foodId = args.foodId;
      const quantity = args.quantity || 1;
      const cart = context.cart || [];

      // Get food details from database
      const food = await restaurantTools.getFoodById(foodId);

      if (!food) {
        await sendWhatsAppMessage(userId, "Sorry, that item is not available.");
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

      // Calculate cart total
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

      // Show quick action buttons - makes adding more items much easier!
      const buttons = [
        {
          type: 'reply',
          reply: {
            id: `more_${context.currentCategory || 'momos'}`,
            title: 'Add More ➕'
          }
        },
        {
          type: 'reply',
          reply: {
            id: 'view_all_categories',
            title: 'Other Categories 📋'
          }
        },
        {
          type: 'reply',
          reply: {
            id: 'proceed_checkout',
            title: 'Checkout 🛒'
          }
        }
      ];

      await sendWhatsAppButtonMessage(
        userId,
        '✅ Added to Cart!',
        `*${food.name}* x${quantity} - Rs.${food.price * quantity}\n\n🛒 Cart: ${itemCount} item(s) | Total: Rs.${total}\n\nWhat would you like to do?`,
        'Keep adding or checkout!',
        buttons
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          cart,
          stage: 'quick_cart_action',
          lastAddedItem: food.name,
          lastAction: 'add_to_cart'
        }
      };
    } catch (error) {
      console.error('Error adding to cart:', error);
      await sendWhatsAppMessage(userId, "Sorry, couldn't add that item. Please try again.");
      return { reply: null, updatedContext: context };
    }
  },

  // Add item by name - validates against database before adding
  add_item_by_name: async (args, userId, context) => {
    try {
      const itemName = args.name || args.itemName || '';
      const quantity = args.quantity || 1;
      const cart = context.cart || [];

      if (!itemName) {
        await sendWhatsAppMessage(userId, "Please specify which item you want to add.");
        return { reply: null, updatedContext: context };
      }

      // Search for the item in database
      const matchingItems = await restaurantTools.getFoodByName(itemName);

      if (matchingItems.length === 0) {
        // Item not found - show helpful message
        await sendWhatsAppMessage(
          userId,
          `❌ Sorry, "${itemName}" is not available on our menu.\n\nType "menu" to see what we have! 🍽️`
        );
        return { reply: null, updatedContext: context };
      }

      if (matchingItems.length === 1) {
        // Exact match - add directly
        const food = matchingItems[0];

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
          {
            type: 'reply',
            reply: {
              id: `more_${food.category || 'momos'}`,
              title: 'Add More ➕'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'view_all_categories',
              title: 'Other Categories 📋'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'proceed_checkout',
              title: 'Checkout 🛒'
            }
          }
        ];

        await sendWhatsAppButtonMessage(
          userId,
          '✅ Added to Cart!',
          `*${food.name}* x${quantity} - Rs.${food.price * quantity}\n\n🛒 Cart: ${itemCount} item(s) | Total: Rs.${total}\n\nWhat would you like to do?`,
          'Keep adding or checkout!',
          buttons
        );

        return {
          reply: null,
          updatedContext: {
            ...context,
            cart,
            stage: 'quick_cart_action',
            lastAddedItem: food.name,
            lastAction: 'add_item_by_name'
          }
        };
      }

      // Multiple matches - show options
      const rows = matchingItems.slice(0, 10).map(food => ({
        id: `add_${food.id}`,
        title: food.name.substring(0, 24),
        description: `Rs.${food.price} - ${(food.description || '').substring(0, 50)}`
      }));

      await sendWhatsAppListMessage(
        userId,
        '🔍 Multiple Matches Found',
        `Found ${matchingItems.length} item(s) matching "${itemName}".\nSelect the one you want:`,
        'Tap to add to cart',
        'Select Item',
        [{ title: 'Matching Items', rows }]
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: 'selecting_item',
          lastAction: 'add_item_by_name'
        }
      };
    } catch (error) {
      console.error('Error adding item by name:', error);
      await sendWhatsAppMessage(userId, "Sorry, couldn't find that item. Try browsing our menu!");
      return { reply: null, updatedContext: context };
    }
  },

  // Show cart and checkout options
  show_cart_options: async (args, userId, context) => {
    const cart = context.cart || [];

    if (cart.length === 0) {
      await sendWhatsAppMessage(userId, "Your cart is empty! Let me show you our menu.");
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    const cartLines = cart.map(item =>
      `• ${item.name} x${item.quantity} - Rs.${item.price * item.quantity}`
    ).join('\n');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'add_more_items',
          title: 'Add More Items ➕'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'proceed_checkout',
          title: 'Checkout 🛒'
        }
      }
    ];

    await sendWhatsAppButtonMessage(
      userId,
      '🛒 Your Cart',
      `${cartLines}\n━━━━━━━━━━━━━━━\nSubtotal: Rs.${total}\n\nWould you like to add more items or proceed to checkout?`,
      'You can add more items anytime!',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'cart_options',
        lastAction: 'show_cart_options'
      }
    };
  },

  // Confirm order with payment options
  confirm_order: async (args, userId, context) => {
    const safeArgs = args || {};
    let items = safeArgs.items || context.cart || [];

    if (items.length === 0) {
      await sendWhatsAppMessage(userId, "Your cart is empty! Let me show you our menu.");
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    // VALIDATE ITEMS AGAINST DATABASE - filter out items that don't exist
    const validatedItems = [];
    const invalidItems = [];

    for (const item of items) {
      // If item has foodId, validate by ID
      if (item.foodId) {
        const dbItem = await restaurantTools.getFoodById(item.foodId);
        if (dbItem) {
          validatedItems.push({
            foodId: dbItem.id,
            name: dbItem.name,
            price: parseFloat(dbItem.price),
            quantity: item.quantity || 1
          });
        } else {
          invalidItems.push(item.name);
        }
      } else {
        // Item from LLM - validate by name
        const matches = await restaurantTools.getFoodByName(item.name);
        if (matches.length > 0) {
          // Use the first exact or closest match
          const dbItem = matches[0];
          const existingValid = validatedItems.find(v => v.foodId === dbItem.id);
          if (existingValid) {
            existingValid.quantity += item.quantity || 1;
          } else {
            validatedItems.push({
              foodId: dbItem.id,
              name: dbItem.name,
              price: parseFloat(dbItem.price), // Use DB price, not LLM-generated
              quantity: item.quantity || 1
            });
          }
        } else {
          invalidItems.push(item.name);
        }
      }
    }

    // If no valid items after validation
    if (validatedItems.length === 0) {
      await sendWhatsAppMessage(
        userId,
        `❌ Sorry, none of the items are available:\n${invalidItems.map(n => `• ${n}`).join('\n')}\n\nType "menu" to see what we have! 🍽️`
      );
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    // Notify about invalid items if any
    if (invalidItems.length > 0) {
      await sendWhatsAppMessage(
        userId,
        `⚠️ Note: These items are not available and were removed:\n${invalidItems.map(n => `• ${n}`).join('\n')}`
      );
    }

    // Use validated items
    items = validatedItems;

    const orderLines = items.map(item =>
      `• ${item.name} x${item.quantity} - Rs.${item.price * item.quantity}`
    ).join('\n');

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderDetails = `${orderLines}\n━━━━━━━━━━━━━━━\nTotal: Rs.${total}`;

    await sendOrderConfirmationMessage(userId, orderDetails);

    return {
      reply: null,
      updatedContext: {
        ...context,
        cart: items, // Update cart with validated items
        stage: 'confirming_order',
        lastAction: 'confirm_order',
        pendingOrder: { items, total }
      }
    };
  },

  // Show payment method selection buttons for DINE-IN
  show_dine_in_payment_options: async (args, userId, context) => {
    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'pay_cash_counter',
          title: 'Cash at Counter 💵'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'pay_online',
          title: 'Online Payment 📱'
        }
      }
    ];

    await sendWhatsAppButtonMessage(
      userId,
      '💳 Payment Method (Dine-in)',
      'How would you like to pay for your dine-in order?',
      'Select to continue',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'selecting_payment',
        lastAction: 'show_dine_in_payment_options'
      }
    };
  },

  // Show payment method selection buttons for DELIVERY
  show_payment_options: async (args, userId, context) => {
    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'pay_cod',
          title: 'Cash on Delivery 💵'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'pay_online',
          title: 'Online Payment 📱'
        }
      }
    ];

    await sendWhatsAppButtonMessage(
      userId,
      '💳 Payment Method (Delivery)',
      'Choose your preferred payment method:',
      'Select to continue',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'selecting_payment',
        lastAction: 'show_payment_options'
      }
    };
  },

  // Process order confirmation - saves to DATABASE
  process_order_response: async (args, userId, context) => {
    const { action } = args;

    if (action === 'confirmed') {
      try {
        // Create order in database
        const order = await restaurantTools.createOrder(userId);
        const cart = context.cart || [];

        // Add items to order
        for (const item of cart) {
          await restaurantTools.addItem(order.id, item.foodId, item.quantity);
        }

        // Ask for service type instead of payment
        return await toolHandlers.select_service_type({}, userId, {
          ...context,
          orderId: order.id,
          stage: 'selecting_service'
        });
      } catch (error) {
        console.error('Error creating order:', error);
        // Fallback without database
        const orderId = `MH${Date.now().toString().slice(-6)}`;
        await sendWhatsAppMessage(
          userId,
          `✅ Order Confirmed!\n\nThank you for your order! Your delicious food is being prepared and will be delivered in 30-40 minutes.\n\nOrder ID: #${orderId}\n\nEnjoy your meal! 🥟`
        );
        return {
          reply: null,
          updatedContext: {
            stage: 'order_complete',
            lastAction: 'order_confirmed',
            cart: []
          }
        };
      }
    } else if (action === 'cancel_confirm') {
      // User confirmed cancellation
      const cart = context.cart || [];
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

      await sendWhatsAppMessage(
        userId,
        `❌ Order Cancelled\n\n${itemCount} item(s) removed from cart.\n\nNo worries! Feel free to browse our menu again whenever you're ready.\n\nType "menu" to start a new order! 🍽️`
      );
      return {
        reply: null,
        updatedContext: {
          stage: 'initial',
          lastAction: 'order_cancelled',
          cart: []
        }
      };
    } else {
      // Ask for cancellation confirmation first
      const cart = context.cart || [];
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

      const buttons = [
        {
          type: 'reply',
          reply: {
            id: 'confirm_cancel',
            title: 'Yes, Cancel ❌'
          }
        },
        {
          type: 'reply',
          reply: {
            id: 'back_to_cart',
            title: 'No, Go Back 🔙'
          }
        }
      ];

      await sendWhatsAppButtonMessage(
        userId,
        '⚠️ Cancel Order?',
        `Are you sure you want to cancel?\n\n🛒 Cart: ${itemCount} item(s)\n💰 Total: Rs.${total}\n\nThis will remove all items from your cart.`,
        'Please confirm',
        buttons
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: 'confirming_cancel',
          lastAction: 'ask_cancel_confirmation'
        }
      };
    }
  },

  // Select Service Type (Dine-in vs Delivery)
  select_service_type: async (args, userId, context) => {
    const type = args.type || args.serviceType;

    // Phase 1: Ask user to select
    if (!type) {
      const buttons = [
        {
          type: 'reply',
          reply: {
            id: 'service_dine_in',
            title: 'Dine-in 🍽️'
          }
        },
        {
          type: 'reply',
          reply: {
            id: 'service_delivery',
            title: 'Delivery 🛵'
          }
        }
      ];

      await sendWhatsAppButtonMessage(
        userId,
        '🍽️ Service Type',
        'Would you like to Dine-in or have it Delivered?',
        'Please select one',
        buttons
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: 'selecting_service',
          lastAction: 'ask_service_type'
        }
      };
    }

    // Phase 2: Handle Selection
    if (type === 'dine_in') {
      if (context.orderId) {
        await restaurantTools.updateServiceType(context.orderId, 'dine_in');
        await restaurantTools.updateDeliveryAddress(context.orderId, 'Dine-in');
      }

      // For dine-in, show dine-in specific payment options
      return await toolHandlers.show_dine_in_payment_options({}, userId, {
        ...context,
        serviceType: 'dine_in',
        deliveryAddress: "Dine-in"
      });
    } else if (type === 'delivery') {
      await restaurantTools.updateServiceType(context.orderId, 'delivery');

      // For delivery, ask for address
      await sendWhatsAppMessage(
        userId,
        `📍 *Delivery Location*\n\nPlease type your delivery address/location so we can bring your food to you! 🏠`
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          serviceType: 'delivery',
          stage: 'providing_location',
          lastAction: 'ask_location'
        }
      };
    }
  },

  // Handle Delivery Location Input
  provide_location: async (args, userId, context) => {
    const address = args.address;

    if (!address) {
      await sendWhatsAppMessage(userId, "Please provide a valid delivery address.");
      return { reply: null, updatedContext: context };
    }

    // Confirm address and proceed to payment
    if (context.orderId) {
      await restaurantTools.updateDeliveryAddress(context.orderId, address);
    }

    await sendWhatsAppMessage(
      userId,
      `✅ Delivery address set to: *${address}*`
    );

    return await toolHandlers.show_payment_options({}, userId, {
      ...context,
      deliveryAddress: address
    });
  },

  // Process payment selection - saves to DATABASE
  process_payment: async (args, userId, context) => {
    const { method } = args;
    const orderId = context.orderId;
    const cart = context.cart || [];
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceType = context.serviceType || 'delivery';
    const isDineIn = serviceType === 'dine_in';

    try {
      if (orderId) {
        await restaurantTools.selectPayment(orderId, method);
      }

      if (method === 'ONLINE') {
        // Show online payment details with dummy values
        await sendWhatsAppMessage(
          userId,
          `💳 *Online Payment Details*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `📱 *eSewa*\n` +
          `   ID: 9800000001\n` +
          `   Name: Momo House Pvt Ltd\n\n` +
          `📱 *Khalti*\n` +
          `   ID: 9800000002\n` +
          `   Name: Momo House\n\n` +
          `🏦 *Bank Transfer*\n` +
          `   Bank: Nepal Bank Ltd\n` +
          `   A/C: 0123456789012\n` +
          `   Name: Momo House Pvt Ltd\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `💰 *Amount to Pay: Rs.${total}*\n\n` +
          `📝 Please send payment screenshot to confirm.\n` +
          `Order ID: #${orderId || 'MH' + Date.now().toString().slice(-6)}`
        );

        if (isDineIn) {
          await sendWhatsAppMessage(
            userId,
            `✅ Order Placed!\n\n` +
            `Your order will be prepared once payment is confirmed.\n\n` +
            `🍽️ Please come to our restaurant to enjoy your meal!\n\n` +
            `Preparation time: 15-20 minutes.\n\n` +
            `Thank you for ordering! 🥟`
          );
        } else {
          await sendWhatsAppMessage(
            userId,
            `✅ Order Placed!\n\n` +
            `Your order will be prepared once payment is confirmed.\n\n` +
            `🛵 Delivery: 30-40 minutes after confirmation.\n\n` +
            `Thank you for ordering! 🥟`
          );
        }
      } else {
        // Cash payment (at counter for dine-in, on delivery for delivery)
        if (isDineIn) {
          await sendWhatsAppMessage(
            userId,
            `✅ Order Confirmed!\n\n` +
            `💳 Payment: Cash at Counter\n` +
            `💰 Amount: Rs.${total}\n\n` +
            `Your delicious food is being prepared!\n\n` +
            `🍽️ Please come to our restaurant and pay at the counter.\n\n` +
            `Order ID: #${orderId || 'MH' + Date.now().toString().slice(-6)}\n\n` +
            `Preparation time: 15-20 minutes.\n\n` +
            `Enjoy your meal! 🥟`
          );
        } else {
          await sendWhatsAppMessage(
            userId,
            `✅ Order Confirmed!\n\n` +
            `💳 Payment: Cash on Delivery\n` +
            `💰 Amount: Rs.${total}\n\n` +
            `Your delicious food is being prepared and will be delivered in 30-40 minutes.\n\n` +
            `Order ID: #${orderId || 'MH' + Date.now().toString().slice(-6)}\n\n` +
            `Please keep Rs.${total} ready!\n\nEnjoy your meal! 🥟`
          );
        }
      }

      return {
        reply: null,
        updatedContext: {
          stage: 'order_complete',
          lastAction: 'order_confirmed',
          paymentMethod: method,
          cart: []
        }
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      await sendWhatsAppMessage(userId, "Order confirmed! We'll contact you for payment details.");
      return {
        reply: null,
        updatedContext: { stage: 'order_complete', cart: [] }
      };
    }
  },

  // Show order history
  show_order_history: async (args, userId, context) => {
    try {
      const orders = await restaurantTools.getOrderHistory(userId, 5);

      if (orders.length === 0) {
        await sendWhatsAppMessage(
          userId,
          `📋 *Order History*\n\nYou haven't placed any orders yet!\n\nType "menu" to start your first order! 🍽️`
        );
        return { reply: null, updatedContext: context };
      }

      let historyText = `📋 *Your Order History*\n\n`;

      for (const order of orders) {
        const statusEmoji = {
          'created': '🆕',
          'confirmed': '✅',
          'preparing': '👨‍🍳',
          'delivered': '📦',
          'completed': '✔️',
          'cancelled': '❌'
        }[order.status] || '📝';

        const date = new Date(order.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        historyText += `${statusEmoji} *Order #${order.id}*\n`;
        historyText += `   📅 ${date}\n`;
        historyText += `   🛒 ${order.item_count} item(s) | Rs.${parseFloat(order.total).toFixed(0)}\n`;
        historyText += `   💳 ${order.payment_method || 'Pending'}\n`;
      }

      await sendWhatsAppMessage(userId, historyText);

      return {
        reply: null,
        updatedContext: {
          ...context,
          lastAction: 'show_order_history'
        }
      };

    } catch (error) {
      console.error('Error fetching order history:', error);
      await sendWhatsAppMessage(userId, "Sorry, I couldn't check your order history right now.");
      return { reply: null, updatedContext: context };
    }
  },

  // Recommend Food
  recommend_food: async (args, userId, context) => {
    try {
      const safeArgs = args || {};
      const tag = safeArgs.tag || 'random';
      console.log(`Getting recommendations for tag: ${tag}`);

      const foods = await restaurantTools.getRecommendedFoods(tag);

      if (foods.length === 0) {
        await sendWhatsAppMessage(
          userId,
          `🤔 I couldn't find any specific items for "${tag}", but we have lots of other delicious options!\n\nType "menu" to see our full range. 🍽️`
        );
        return { reply: null, updatedContext: context };
      }

      // Format as list
      const rows = foods.map(food => ({
        id: `add_${food.id}`,
        title: food.name.substring(0, 24),
        description: `Rs.${food.price} - ${food.category}`
      }));

      // Different title for random
      const isRandom = tag === 'random';
      const title = isRandom ? '🎲 Chef\'s Choice' : `🌟 Recommendations: "${tag}"`;

      // Dynamic Body using LLM
      const body = await generateToolResponse('recommend_food', { tag }, foods, context);

      await sendWhatsAppListMessage(
        userId,
        title,
        body,
        'Tap to add to cart',
        'View Recommendations',
        [{ title: 'Recommended', rows }]
      );

      return {
        reply: null,
        updatedContext: {
          ...context,
          stage: 'viewing_recommendations',
          lastAction: 'recommend_food'
        }
      };

    } catch (error) {
      console.error('Error getting recommendations:', error);
      await sendWhatsAppMessage(userId, "Sorry, I'm having trouble getting recommendations right now.");
      return { reply: null, updatedContext: context };
    }
  },

  // Simple text reply
  send_text_reply: async (args, userId, context) => {
    const message = args.message || "Hello! Welcome to our restaurant 🍽️ Type 'menu' to see our delicious options!";
    console.log(`━━━ SENDING TEXT REPLY ━━━`);
    console.log(`💬 Message: ${message}`);
    await sendWhatsAppMessage(userId, message);
    return {
      reply: null,
      updatedContext: context
    };
  }
};

// Handle button/list reply callbacks from WhatsApp
function parseInteractiveReply(message) {
  if (message.interactive?.type === 'button_reply') {
    return {
      type: 'button',
      id: message.interactive.button_reply.id,
      title: message.interactive.button_reply.title
    };
  }
  if (message.interactive?.type === 'list_reply') {
    return {
      type: 'list',
      id: message.interactive.list_reply.id,
      title: message.interactive.list_reply.title
    };
  }
  return null;
}

async function routeIntent({ text, context, userId, interactiveReply }) {
  console.log(`━━━ ROUTING MESSAGE ━━━`);
  console.log(`📍 Context stage: ${context.stage || 'initial'}`);

  // Handle interactive replies (button clicks, list selections)
  if (interactiveReply) {
    const { id, title } = interactiveReply;
    console.log(`🔘 Interactive reply: ${id} - ${title}`);

    // Category selection from menu
    if (id.startsWith('cat_')) {
      const category = id.replace('cat_', '');
      return await toolHandlers.show_category_items({ category }, userId, context);
    }

    // Add item to cart (id format: add_<foodId>)
    if (id.startsWith('add_')) {
      const foodId = parseInt(id.replace('add_', ''));
      if (!isNaN(foodId)) {
        return await toolHandlers.add_to_cart({ foodId }, userId, context);
      }
    }

    // User wants to add more items
    if (id === 'add_more_items') {
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    // Quick add more from same category (new flow)
    if (id.startsWith('more_')) {
      const category = id.replace('more_', '');
      return await toolHandlers.show_category_items({ category }, userId, context);
    }

    // View all categories (new flow)
    if (id === 'view_all_categories') {
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    // Service type selection
    if (id === 'service_dine_in') {
      return await toolHandlers.select_service_type({ type: 'dine_in' }, userId, context);
    }
    if (id === 'service_delivery') {
      return await toolHandlers.select_service_type({ type: 'delivery' }, userId, context);
    }

    // User wants to checkout
    if (id === 'proceed_checkout') {
      return await toolHandlers.confirm_order({ items: context.cart }, userId, context);
    }

    // Order confirmation/cancellation
    if (id === 'confirm_order') {
      return await toolHandlers.process_order_response({ action: 'confirmed' }, userId, context);
    }
    if (id === 'cancel_order') {
      return await toolHandlers.process_order_response({ action: 'cancelled' }, userId, context);
    }

    // Cancel confirmation flow
    if (id === 'confirm_cancel') {
      return await toolHandlers.process_order_response({ action: 'cancel_confirm' }, userId, context);
    }
    if (id === 'back_to_cart') {
      return await toolHandlers.show_cart_options({}, userId, context);
    }

    // Payment method selection
    if (id === 'pay_cod') {
      return await toolHandlers.process_payment({ method: 'COD' }, userId, context);
    }
    if (id === 'pay_online') {
      return await toolHandlers.process_payment({ method: 'ONLINE' }, userId, context);
    }
  }

  // Check for order history keywords
  const lowerText = text?.toLowerCase() || '';
  if (lowerText.includes('order history') || lowerText.includes('my orders') || lowerText.includes('past orders') || lowerText.includes('previous orders')) {
    return await toolHandlers.show_order_history({}, userId, context);
  }

  // Use LLM to detect intent and decide which tool to call
  console.log(`🤖 Asking LLM for intent...`);
  const decision = await detectIntentAndRespond(text, context);

  console.log(`━━━ LLM DECISION ━━━`);
  console.log(`🎯 Intent: ${decision.intent}`);
  console.log(`🔧 Tool: ${decision.toolCall?.name || 'none'}`);
  console.log(`📝 Args: ${JSON.stringify(decision.toolCall?.arguments || {})}`);

  if (decision.toolCall && toolHandlers[decision.toolCall.name]) {
    // 🛡️ VALIDATION LAYER
    const { isValid, message: validationMsg } = validateToolCall(
      decision.toolCall.name,
      decision.toolCall.arguments
    );

    if (!isValid) {
      console.warn(`Validation failed for ${decision.toolCall.name}: ${validationMsg}`);
      await sendWhatsAppMessage(userId, validationMsg);
      return { reply: null, updatedContext: context }; // Stop execution
    }

    return await toolHandlers[decision.toolCall.name](
      decision.toolCall.arguments,
      userId,
      context
    );
  }

  // Fallback
  const fallbackMessage = decision.response || "Hello! Welcome to our restaurant 🍽️ Type 'menu' to see our delicious options!";
  await sendWhatsAppMessage(userId, fallbackMessage);
  return {
    reply: null,
    updatedContext: context
  };
}

export { routeIntent, parseInteractiveReply };