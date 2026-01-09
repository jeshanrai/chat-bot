import {
    sendWhatsAppMessage,
    sendWhatsAppListMessage,
    sendWhatsAppButtonMessage,
    sendWhatsAppCarouselMessage
} from '../whatsapp/sendmessage.js';

import {
    sendMessengerMessage,
    sendMessengerQuickReplies,
    sendMessengerGenericTemplate,
    sendMessengerButtonTemplate
} from '../messenger/sendmessage.js';

/**
 * Send a basic text message
 */
export async function sendMessage(userId, platform, text) {
    if (platform === 'messenger') {
        return await sendMessengerMessage(userId, text);
    }
    // Default to WhatsApp
    return await sendWhatsAppMessage(userId, text);
}

/**
 * Send a list message (Menu, Categories, etc.)
 * WhatsApp: Uses List Message
 * Messenger: Uses Generic Template (Carousel) as list replacement
 */
export async function sendListMessage(userId, platform, title, body, buttonText, sectionTitle, sections) {
    if (platform === 'messenger') {
        // Convert List format to Messenger Generic Template
        // Flatten all rows from all sections
        const elements = [];

        sections.forEach(section => {
            section.rows.forEach(row => {
                elements.push({
                    title: row.title,
                    subtitle: row.description,
                    imageUrl: row.imageUrl || 'https://via.placeholder.com/300?text=Menu', // Messenger cards need images usually
                    buttons: [
                        {
                            type: 'postback',
                            title: 'Select',
                            payload: row.id
                        }
                    ]
                });
            });
        });

        return await sendMessengerGenericTemplate(userId, elements);
    }

    // WhatsApp
    return await sendWhatsAppListMessage(userId, title, body, buttonText, sectionTitle, sections);
}

/**
 * Send a button message
 * WhatsApp: Uses Button Message (max 3 buttons)
 * Messenger: Uses Button Template (max 3 buttons)
 */
export async function sendButtonMessage(userId, platform, title, body, footer, buttons) {
    if (platform === 'messenger') {
        // Convert to Messenger Button Template
        const messengerButtons = buttons.map(btn => {
            if (btn.type === 'reply') {
                return {
                    type: 'postback',
                    title: btn.reply.title,
                    payload: btn.reply.id
                };
            }
            return {
                type: 'postback',
                title: btn.title || 'Button',
                payload: btn.id || btn.payload
            };
        });

        return await sendMessengerButtonTemplate(userId, `${title}\n\n${body}`, messengerButtons);
    }

    // WhatsApp
    return await sendWhatsAppButtonMessage(userId, title, body, footer, buttons);
}

/**
 * Send a carousel/gallery message
 * WhatsApp: Uses Carousel Message (if available/implemented) or fallback
 * Messenger: Uses Generic Template
 */
export async function sendCarouselMessage(userId, platform, cards) {
    if (platform === 'messenger') {
        // Map to Messenger elements
        const elements = cards.map(card => ({
            title: card.title,
            subtitle: card.description,
            imageUrl: card.image?.url,
            buttons: card.buttons?.map(btn => ({
                type: 'postback',
                title: btn.reply?.title || btn.title,
                payload: btn.reply?.id || btn.payload
            }))
        }));

        return await sendMessengerGenericTemplate(userId, elements);
    }

    // WhatsApp
    return await sendWhatsAppCarouselMessage(userId, cards);
}

/**
 * Send order confirmation message with Confirm and Cancel buttons
 */
export async function sendOrderConfirmationMessage(userId, platform, orderDetails) {
    const buttons = [
        {
            type: 'reply',
            reply: {
                id: 'confirm_order',
                title: 'Confirm Order ✅'
            }
        },
        {
            type: 'reply',
            reply: {
                id: 'cancel_order',
                title: 'Cancel Order ❌'
            }
        }
    ];

    const bodyText = `📋 Order Summary:\n${orderDetails}\n\nPlease confirm your order or cancel if you'd like to make changes.`;

    return await sendButtonMessage(
        userId,
        platform,
        '🛒 Confirm Your Order',
        bodyText,
        'Thank you for ordering with Momo House!',
        buttons
    );
}
