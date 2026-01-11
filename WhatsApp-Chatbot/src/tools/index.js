/**
 * TOOLS INDEX
 * 
 * Central export for all tool adapters
 * 
 * Tools are thin adapters that:
 * - Accept args from the AI agent
 * - Call services for business logic
 * - Format and send responses to users
 */

// Menu tools
export { showFoodMenu, showCategoryItems, recommendFood } from './menu.tools.js';

// Cart tools
export { addToCart, addItemByName, viewCart, clearCart } from './cart.tools.js';

// Order tools
export { 
  confirmOrder, 
  processOrderResponse, 
  selectServiceType, 
  provideLocation,
  showPaymentOptions,
  finalizeOrder,
  showOrderHistory 
} from './order.tools.js';

// Reservation tools
export { bookTable, checkAvailability, showReservations } from './reservation.tools.js';
