/**
 * TOOL NAMES CONSTANTS
 * 
 * All LLM tool names in one place to prevent typos
 */

export const TOOL_NAMES = {
  // Menu tools
  SHOW_FOOD_MENU: 'show_food_menu',
  SHOW_CATEGORY_ITEMS: 'show_category_items',
  SHOW_MOMO_VARIETIES: 'show_momo_varieties',
  
  // Cart tools
  ADD_TO_CART: 'add_to_cart',
  ADD_ITEM_BY_NAME: 'add_item_by_name',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',
  UPDATE_CART_QUANTITY: 'update_cart_quantity',
  CLEAR_CART: 'clear_cart',
  
  // Order tools
  CONFIRM_ORDER: 'confirm_order',
  PROCESS_ORDER_RESPONSE: 'process_order_response',
  SELECT_SERVICE_TYPE: 'select_service_type',
  PROVIDE_LOCATION: 'provide_location',
  SHOW_PAYMENT_OPTIONS: 'show_payment_options',
  SHOW_ORDER_HISTORY: 'show_order_history',
  
  // Reservation tools (future)
  BOOK_TABLE: 'book_table',
  CHECK_AVAILABILITY: 'check_availability',
  CANCEL_RESERVATION: 'cancel_reservation',
  
  // General tools
  SEND_TEXT_REPLY: 'send_text_reply',
  RECOMMEND_FOOD: 'recommend_food'
};

Object.freeze(TOOL_NAMES);
