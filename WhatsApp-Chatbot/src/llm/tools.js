/**
 * TOOL DEFINITIONS
 * 
 * JSON Schema definitions for LLM function calling
 */

import { TOOL_NAMES } from '../constants/toolNames.js';

export const availableTools = [
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SHOW_FOOD_MENU,
      description: "Show a list of food categories available in the restaurant menu. Use this when user wants to see the menu, browse food options, or asks what's available.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SHOW_CATEGORY_ITEMS,
      description: "Show items in a specific food category. Use when user selects a category or asks about specific food types like momos, noodles, rice, or beverages.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "The food category (momos, noodles, rice, beverages)"
          }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.ADD_ITEM_BY_NAME,
      description: "Add an item to cart by name. Use this when user wants to add a specific item by typing its name (e.g., 'add momo', 'I want tandoori momo', 'add 2 steam momo').",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the food item to add"
          },
          quantity: {
            type: "number",
            description: "Quantity to add (default 1)"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.CONFIRM_ORDER,
      description: "Show order confirmation with confirm and cancel buttons. ONLY use this when user explicitly says 'checkout', 'place order', 'confirm order', or clicks checkout.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.PROCESS_ORDER_RESPONSE,
      description: "Process the user's response to order confirmation (confirmed or cancelled).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["confirmed", "cancelled"],
            description: "Whether the order was confirmed or cancelled"
          }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SELECT_SERVICE_TYPE,
      description: "Set the service type for the order (dine-in or delivery). Call without arguments to show options, or with type to set it.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["dine_in", "delivery"],
            description: "The service type"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.PROVIDE_LOCATION,
      description: "Set the delivery address for the order.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The delivery address"
          }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SHOW_PAYMENT_OPTIONS,
      description: "Show available payment options to the user.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SEND_TEXT_REPLY,
      description: "Send a simple text reply for greetings, general questions, or when no special UI is needed.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The text message to send to the user"
          }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SHOW_ORDER_HISTORY,
      description: "Show the user's past orders and order history.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.RECOMMEND_FOOD,
      description: "Recommend food items based on a tag or preference. Use when user asks for suggestions or mentions preferences.",
      parameters: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description: "The preference or keyword (e.g., 'spicy', 'soup', 'veg', 'random')"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.BOOK_TABLE,
      description: "Book a table reservation. Use when user wants to reserve a table for dining.",
      parameters: {
        type: "object",
        properties: {
          tableNumber: {
            type: "number",
            description: "The table number to book"
          },
          partySize: {
            type: "number",
            description: "Number of guests"
          },
          date: {
            type: "string",
            description: "Reservation date (YYYY-MM-DD)"
          },
          time: {
            type: "string",
            description: "Reservation time (HH:MM)"
          }
        },
        required: ["tableNumber"]
      }
    }
  }
];
