/**
 * Validates tool calls and arguments before execution.
 * Returns an object with { isValid: boolean, message: string | null }
 */
export function validateToolCall(toolName, args) {
    const safeArgs = args || {};

    switch (toolName) {
        case 'add_item_by_name':
        case 'add_to_cart':
            return validateAddToCart(safeArgs);

        case 'provide_location':
            return validateLocation(safeArgs);

        case 'recommend_food':
            return validateRecommendation(safeArgs);

        default:
            // Default to valid for other tools
            return { isValid: true, message: null };
    }
}

function validateAddToCart(args) {
    // Quantity check
    if (args.quantity) {
        const qty = parseInt(args.quantity);
        if (isNaN(qty) || qty <= 0) {
            return { isValid: false, message: "Use a valid number for quantity (like 1, 2, 3)." };
        }
        if (qty > 50) {
            return { isValid: false, message: "For large orders (over 50 items), please call us directly! 📞" };
        }
    }

    // Name check (only for add_item_by_name)
    if (args.name !== undefined && (!args.name || args.name.trim().length < 2)) {
        return { isValid: false, message: "Which item would you like to add? Please specify the name. 🥟" };
    }

    return { isValid: true, message: null };
}

function validateLocation(args) {
    const address = args.address;
    if (!address || address.trim().length < 5) {
        return { isValid: false, message: "Please provide a complete address so our rider can find you! 🏠" };
    }
    return { isValid: true, message: null };
}

function validateRecommendation(args) {
    // Ensure tag isn't too long (prevent abuse)
    if (args.tag && args.tag.length > 50) {
        return { isValid: false, message: "That's a very long request! Try a shorter keyword like 'spicy' or 'momo'. 😅" };
    }
    return { isValid: true, message: null };
}
