import { detectIntentAndRespond } from '../ai/intentEngine.js';
import { validateToolCall } from '../ai/validator.js';
import { generateToolResponse } from '../ai/responseGenerator.js';
import {
  sendMessage,
  sendListMessage,
  sendButtonMessage,
  sendCarouselMessage,
  sendOrderConfirmationMessage
} from '../services/response.js';
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

      // Get images for categories (using first item's image)
      const rows = await Promise.all(categories.map(async cat => {
        const imageUrl = await restaurantTools.getCategoryImage(cat.category);
        return {
          id: `cat_${cat.category}`,
          title: `${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ${categoryEmojis[cat.category] || '🍽️'}`,
          description: `Browse our ${cat.category} options`,
          imageUrl: imageUrl // Pass image URL for Messenger
        };
      }));

      const sections = [
        {
          title: 'Food Categories',
          rows: rows.length > 0 ? rows : [
            { id: 'cat_momos', title: 'Momos 🥟', description: 'Steamed, fried, tandoori varieties' }
          ]
        }
      ];

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
          stage: 'viewing_menu',
          lastAction: 'show_food_menu'
        }
      };
    } catch (error) {
      console.error('Error fetching menu:', error);
      await sendMessage(userId, context.platform, "Sorry, I couldn't load the menu. Please try again.");
      return { reply: null, updatedContext: context };
    }
  },

  // Step 2: Show items in a category - FROM DATABASE (as list message)
  show_category_items: async (args, userId, context) => {
    try {
      const category = args.category || 'momos';
      const foods = await restaurantTools.getMenu(category);

      if (foods.length === 0) {
        await sendMessage(userId, context.platform, `No items found in ${category}. Try another category!`);
        return await toolHandlers.show_food_menu({}, userId, context);
      }

      // Show current cart summary if items exist
      const cart = context.cart || [];
      const categoryEmoji = {
        'momos': '🥟',
        'noodles': '🍜',
        'rice': '🍚',
        'beverages': '☕'
      }[category] || '🍽️';

      let bodyText = `Browse our delicious ${category}! Select any item to add it to your cart.`;
      if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        bodyText = `🛒 Cart: ${itemCount} item(s) - Rs.${total}\n\nSelect items to add:`;
      }

      // Build list rows (max 10 items per WhatsApp limit)
      const rows = foods.slice(0, 10).map(food => ({
        id: `add_${food.id}`,
        title: food.name.substring(0, 24), // WhatsApp limit: 24 chars
        description: `Rs.${food.price} - ${(food.description || '').substring(0, 72)}`, // WhatsApp limit: 72 chars
        imageUrl: food.image_url // Pass image URL from DB
      }));

      const sections = [
        {
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} ${categoryEmoji}`,
          rows: rows
        }
      ];

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
          stage: 'viewing_items',
          currentCategory: category,
          lastAction: 'show_category_items',
          cart: context.cart || []
        }
      };
    } catch (error) {
      console.error('Error fetching category items:', error);
      await sendMessage(userId, context.platform, "Sorry, I couldn't load the items. Please try again.");
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

      await sendButtonMessage(
        userId,
        context.platform,
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
      await sendMessage(userId, context.platform, "Sorry, couldn't add that item. Please try again.");
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
        await sendMessage(userId, context.platform, "Please specify which item you want to add.");
        return { reply: null, updatedContext: context };
      }

      // Search for the item in database
      const matchingItems = await restaurantTools.getFoodByName(itemName);

      if (matchingItems.length === 0) {
        // Item not found - show helpful message
        await sendMessage(userId, context.platform,
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

      await sendListMessage(
        userId,
        context.platform,
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
      await sendMessage(userId, context.platform, "Sorry, couldn't find that item. Try browsing our menu!");
      return { reply: null, updatedContext: context };
    }
  },

  // Show cart and checkout options
  show_cart_options: async (args, userId, context) => {
    const cart = context.cart || [];

    if (cart.length === 0) {
      await sendMessage(userId, context.platform, "Your cart is empty! Let me show you our menu.");
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

    await sendButtonMessage(
      userId,
      context.platform,
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
      await sendMessage(userId, context.platform, "Your cart is empty! Let me show you our menu.");
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
      await sendMessage(userId, context.platform,
        `❌ Sorry, none of the items are available:\n${invalidItems.map(n => `• ${n}`).join('\n')}\n\nType "menu" to see what we have! 🍽️`
      );
      return await toolHandlers.show_food_menu({}, userId, context);
    }

    // Notify about invalid items if any
    if (invalidItems.length > 0) {
      await sendMessage(userId, context.platform,
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

    await sendOrderConfirmationMessage(userId, context.platform, orderDetails);

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

  // Show Payment Options for Dine-in (Cash Counter / Online)
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

    await sendButtonMessage(
      userId,
      context.platform,
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

  // New Handler: Welcome Message
  show_welcome_message: async (args, userId, context) => {
    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'view_all_categories',
          title: 'View Menu 🍽️'
        }
      }
    ];

    await sendButtonMessage(
      userId,
      context.platform,
      '👋 Welcome to Momo House!',
      'We serve the best foods in town. Browse our menu to order now!',
      'Tap to start',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'initial',
        lastAction: 'show_welcome_message'
      }
    };
  },

  // New Handler: Collect Party Size (Step 1 of Reservation)
  collect_party_size: async (args, userId, context) => {
    await sendMessage(userId, context.platform,
      "🍽️ *Dine-in Reservation*\n\nHow many people are coming? (Please type a number, e.g., '4')"
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'collecting_party_size',
        lastAction: 'collect_party_size'
      }
    };
  },

  // New Handler: Collect Arrival Time (Step 2 of Reservation)
  collect_arrival_time: async (args, userId, context) => {
    const partySize = args.partySize;

    // Determine today's date context
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' });

    await sendMessage(userId, context.platform,
      `🕒 *Arrival Time*\n\nGreat! Table for ${partySize}. What time will you arrive today?\n(e.g., "7:30 PM" or "19:30")`
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'collecting_arrival_time',
        reservation: { ...context.reservation, partySize },
        lastAction: 'collect_arrival_time'
      }
    };
  },

  // New Handler: Confirm Reservation & Deposit (Step 3)
  confirm_reservation_deposit: async (args, userId, context) => {
    const arrivalTime = args.arrivalTime;
    const { partySize } = context.reservation || {};
    const cartTotal = context.pendingOrder?.total || 0;

    // Deposit calculation: 20% of total
    const depositAmount = Math.ceil(cartTotal * 0.20);

    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'confirm_deposit',
          title: 'Confirm & Pay 💰'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'cancel_order',
          title: 'Cancel ❌'
        }
      }
    ];

    await sendButtonMessage(
      userId,
      context.platform,
      '📝 Reservation Summary',
      `👤 Party Size: ${partySize}\n🕒 Time: ${arrivalTime}\n\n⚠️ *Deposit Required*\nTo confirm your table, we require a 20% deposit.\n\n💰 Total Order: Rs.${cartTotal}\n💳 *Deposit Amount: Rs.${depositAmount}*\n\nℹ️ _This deposit is refundable if cancelled 3+ hours before booking time._`,
      'Confirm to proceed',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'confirming_deposit',
        reservation: { ...context.reservation, arrivalTime, depositAmount },
        lastAction: 'confirm_reservation_deposit'
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

    await sendButtonMessage(
      userId,
      context.platform,
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
        const order = await restaurantTools.createOrder(userId, context.platform);
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
        await sendMessage(userId, context.platform,
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

      await sendMessage(userId, context.platform,
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

      await sendButtonMessage(
        userId,
        context.platform,
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

      await sendButtonMessage(
        userId,
        context.platform,
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

      // For dine-in, start reservation flow instead of payment options
      // Step 1: Ask for party size
      return await toolHandlers.collect_party_size({}, userId, context);
    } else if (type === 'delivery') {
      await restaurantTools.updateServiceType(context.orderId, 'delivery');

      // For delivery, ask for address
      await sendMessage(userId, context.platform,
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
      await sendMessage(userId, context.platform, "Please provide a valid delivery address.");
      return { reply: null, updatedContext: context };
    }

    // Confirm address and proceed to payment
    if (context.orderId) {
      await restaurantTools.updateDeliveryAddress(context.orderId, address);
    }

    await sendMessage(userId, context.platform,
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
        await sendMessage(userId, context.platform,
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
          await sendMessage(userId, context.platform,
            `✅ Order Placed!\n\n` +
            `Your order will be prepared once payment is confirmed.\n\n` +
            `🍽️ Please come to our restaurant to enjoy your meal!\n\n` +
            `Preparation time: 15-20 minutes.\n\n` +
            `Thank you for ordering! 🥟`
          );
        } else {
          await sendMessage(userId, context.platform,
            `✅ Order Placed!\n\n` +
            `Your order will be prepared once payment is confirmed.\n\n` +
            `🛵 Delivery: 30-40 minutes after confirmation.\n\n` +
            `Thank you for ordering! 🥟`
          );
        }
      } else {
        // Cash payment (at counter for dine-in, on delivery for delivery)
        if (isDineIn) {
          await sendMessage(userId, context.platform,
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
          await sendMessage(userId, context.platform,
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
      await sendMessage(userId, context.platform, "Order confirmed! We'll contact you for payment details.");
      return {
        reply: null,
        updatedContext: { stage: 'order_complete', cart: [] }
      };
    }
  },

  // Handler for cash at counter (Dine-in)
  pay_cash_counter: async (args, userId, context) => {
    // Just reuse process_payment with CASH method
    return await toolHandlers.process_payment({ method: 'CASH_COUNTER' }, userId, context);
  },

  // Show order history
  show_order_history: async (args, userId, context) => {
    try {
      const orders = await restaurantTools.getOrderHistory(userId, 5);

      if (orders.length === 0) {
        await sendMessage(userId, context.platform,
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

      await sendMessage(userId, context.platform, historyText);

      return {
        reply: null,
        updatedContext: {
          ...context,
          lastAction: 'show_order_history'
        }
      };

    } catch (error) {
      console.error('Error fetching order history:', error);
      await sendMessage(userId, context.platform, "Sorry, I couldn't check your order history right now.");
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
        await sendMessage(userId, context.platform,
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

      await sendListMessage(
        userId,
        context.platform,
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
      await sendMessage(userId, context.platform, "Sorry, I'm having trouble getting recommendations right now.");
      return { reply: null, updatedContext: context };
    }
  },

  // Simple text reply
  send_text_reply: async (args, userId, context) => {
    const message = args.message || "Hello! Welcome to our restaurant 🍽️ Type 'menu' to see our delicious options!";
    console.log(`━━━ SENDING TEXT REPLY ━━━`);
    console.log(`💬 Message: ${message}`);
    await sendMessage(userId, context.platform, message);
    return {
      reply: null,
      updatedContext: context
    };
  }
};

// Handle button/list reply callbacks from WhatsApp
// Handle button/list reply callbacks from WhatsApp AND Messenger
function parseInteractiveReply(message) {
  // WhatsApp Button
  if (message.interactive?.type === 'button_reply') {
    return {
      type: 'button',
      id: message.interactive.button_reply.id,
      title: message.interactive.button_reply.title
    };
  }
  // WhatsApp List
  if (message.interactive?.type === 'list_reply') {
    return {
      type: 'list',
      id: message.interactive.list_reply.id,
      title: message.interactive.list_reply.title
    };
  }

  // Messenger Postback
  if (message.interactive?.type === 'postback') {
    return {
      type: 'button', // Treat as button
      id: message.interactive.payload,
      title: message.interactive.title
    };
  }

  // Messenger Quick Reply
  if (message.interactive?.type === 'quick_reply') {
    return {
      type: 'button', // Treat as button
      id: message.interactive.payload,
      title: message.interactive.payload // Title often same as payload if no separate title
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

    // Handle Get Started (Welcome)
    if (id === 'GET_STARTED') {
      return await toolHandlers.show_welcome_message({}, userId, context);
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
    if (id === 'pay_online') {
      return await toolHandlers.process_payment({ method: 'ONLINE' }, userId, context);
    }
    // Handle dine-in cash payment
    if (id === 'pay_cash_counter') {
      return await toolHandlers.pay_cash_counter({}, userId, context);
    }

    // Reservation Flow
    if (id === 'confirm_deposit') {
      // After deposit confirmation, show payment options
      return await toolHandlers.show_dine_in_payment_options({}, userId, context);
    }
  }

  // Handle Text Inputs based on Stage
  if (!interactiveReply && text) {
    if (context.stage === 'collecting_party_size') {
      const size = parseInt(text);
      if (!isNaN(size) && size > 0) {
        return await toolHandlers.collect_arrival_time({ partySize: size }, userId, context);
      } else {
        await sendMessage(userId, context.platform, "Please enter a valid number for party size.");
        return { reply: null, updatedContext: context };
      }
    }

    if (context.stage === 'collecting_arrival_time') {
      return await toolHandlers.confirm_reservation_deposit({ arrivalTime: text }, userId, context);
    }

    if (context.stage === 'providing_location') {
      return await toolHandlers.provide_location({ address: text }, userId, context);
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
      await sendMessage(userId, context.platform, validationMsg);
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
  await sendMessage(userId, context.platform, fallbackMessage);
  return {
    reply: null,
    updatedContext: context
  };
}

export { routeIntent, parseInteractiveReply };
