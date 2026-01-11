/**
 * TOOL ARGUMENTS VALIDATOR
 * 
 * Validates LLM tool call arguments before execution
 */

import { TOOL_NAMES } from '../constants/toolNames.js';

/**
 * Validate tool call arguments
 * @param {string} toolName - Name of the tool
 * @param {object} args - Arguments from LLM
 * @returns {{ isValid: boolean, message: string | null }}
 */
export function validateToolArgs(toolName, args = {}) {
  switch (toolName) {
    case TOOL_NAMES.ADD_ITEM_BY_NAME:
    case TOOL_NAMES.ADD_TO_CART:
      return validateAddToCart(args);
      
    case TOOL_NAMES.PROVIDE_LOCATION:
      return validateLocation(args);
      
    case TOOL_NAMES.RECOMMEND_FOOD:
      return validateRecommendation(args);
      
    case TOOL_NAMES.BOOK_TABLE:
      return validateTableBooking(args);
      
    default:
      return { isValid: true, message: null };
  }
}

function validateAddToCart(args) {
  // Quantity check
  if (args.quantity !== undefined) {
    const qty = parseInt(args.quantity);
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, message: "Please specify a valid quantity (1, 2, 3, etc.)." };
    }
    if (qty > 50) {
      return { isValid: false, message: "For large orders (over 50 items), please call us directly! 📞" };
    }
  }
  
  // Name check
  if (args.name !== undefined && (!args.name || args.name.trim().length < 2)) {
    return { isValid: false, message: "Which item would you like to add? Please specify the name. 🥟" };
  }
  
  return { isValid: true, message: null };
}

function validateLocation(args) {
  const address = args.address;
  if (!address || address.trim().length < 5) {
    return { isValid: false, message: "Please provide a complete address for delivery! 🏠" };
  }
  return { isValid: true, message: null };
}

function validateRecommendation(args) {
  if (args.tag && args.tag.length > 50) {
    return { isValid: false, message: "Try a shorter keyword like 'spicy' or 'momo'. 😅" };
  }
  return { isValid: true, message: null };
}

function validateTableBooking(args) {
  if (args.tableId !== undefined) {
    const tableId = parseInt(args.tableId);
    if (isNaN(tableId) || tableId < 1 || tableId > 20) {
      return { isValid: false, message: "Please specify a valid table number (1-20)." };
    }
  }
  
  if (args.partySize !== undefined) {
    const size = parseInt(args.partySize);
    if (isNaN(size) || size < 1 || size > 20) {
      return { isValid: false, message: "Party size should be between 1 and 20 guests." };
    }
  }
  
  return { isValid: true, message: null };
}
