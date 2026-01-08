export const availableTools = [
    {
        type: "function",
        function: {
            name: "show_food_menu",
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
            name: "show_momo_varieties",
            description: "Show a carousel of momo varieties with images. Use this when user selects momos from the menu, wants to see momo options, or asks specifically about momos.",
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
            name: "add_item_by_name",
            description: "Add an item to cart by name. Use this when user wants to add a specific item by typing its name (e.g., 'add momo', 'I want tandoori momo', 'add 2 steam momo'). This validates the item against the menu before adding.",
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
            name: "confirm_order",
            description: "Show order confirmation with confirm and cancel buttons. ONLY use this when user explicitly says 'checkout', 'place order', 'confirm order', or clicks checkout. Do NOT use this when user is adding items.",
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
            name: "process_order_response",
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
            name: "send_text_reply",
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
            name: "show_order_history",
            description: "Show the user's past orders and order history. Use when user asks about their previous orders, order history, past orders, or wants to see what they ordered before.",
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
            name: "select_service_type",
            description: "Select between 'Dine-in' or 'Delivery' service. Use without arguments to ask user, or with 'type' argument when user makes a selection.",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["dine_in", "delivery"],
                        description: "The service type selected by the user"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "provide_location",
            description: "Provide delivery address or location. Use this when user sends their address for delivery.",
            parameters: {
                type: "object",
                properties: {
                    address: {
                        type: "string",
                        description: "The delivery address provided by the user"
                    }
                },
                required: ["address"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "recommend_food",
            description: "Recommend food items. If user specifies a preference (e.g. spicy, soup), pass the 'tag'. If user just asks for 'something' or 'recommendation' without preference, do NOT pass any tag.",
            parameters: {
                type: "object",
                properties: {
                    tag: {
                        type: "string",
                        description: "The keyword or tag to search for (e.g., 'spicy', 'soup')"
                    }
                },
                required: []
            }
        }
    }
];
