import fetch from 'node-fetch';
import { momoImages } from '../assets/momoImages.js';

function logFinalResponse(to, type, content) {
  console.log('\n✅ [FINAL RESPONSE MESSAGE]');
  console.log(`🎯 User ID: ${to}`);
  console.log(`📝 Type: ${type}`);
  console.log(`📤 Content: ${content}`);
  console.log('━'.repeat(50));
}

export async function sendWhatsAppImageMessage(to, imageUrl, caption) {
  logFinalResponse(to, 'Image', caption ? `[Image] ${caption}` : '[Image]');

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption
    }
  };

  console.log('📷 [WhatsApp Image Message]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return;
    }

    const result = await response.json();
    console.log('Image message sent successfully:', result.messages?.[0]?.id);
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp image message:', error);
  }
}

// Send interactive button message
export async function sendWhatsAppButtonMessage(to, headerText, bodyText, footerText, buttons) {
  logFinalResponse(to, 'Button Message', `${headerText ? `[Header: ${headerText}]\n` : ''}${bodyText}\n[Buttons: ${buttons.map(b => b.reply.title).join(', ')}]`);

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: headerText
      },
      body: {
        text: bodyText
      },
      footer: {
        text: footerText
      },
      action: {
        buttons: buttons
      }
    }
  };

  console.log('🔘 [WhatsApp Button Message]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return;
    }

    const result = await response.json();
    console.log('Button message sent successfully:', result.messages?.[0]?.id);
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp button message:', error);
  }
}

// Send order confirmation message with Confirm and Cancel buttons
export async function sendOrderConfirmationMessage(to, orderDetails) {
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

  return sendWhatsAppButtonMessage(
    to,
    '🛒 Confirm Your Order',
    bodyText,
    'Thank you for ordering with Momo House!',
    buttons
  );
}

export async function sendWhatsAppCarouselMessage(to, bodyText, cards) {
  logFinalResponse(to, 'Carousel Message', bodyText);

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'carousel',
      body: {
        text: bodyText
      },
      action: {
        cards: cards
      }
    }
  };

  console.log('🎠 [WhatsApp Carousel Message]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return;
    }

    const result = await response.json();
    console.log('Carousel message sent successfully:', result.messages?.[0]?.id);
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp carousel message:', error);
  }
}

export async function sendWhatsAppListMessage(to, header, body, footer, buttonText, sections) {
  logFinalResponse(to, 'List Message', `${header ? `[Header: ${header}]\n` : ''}${body}\n[Button: ${buttonText}]`);

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: header
      },
      body: {
        text: body
      },
      footer: {
        text: footer
      },
      action: {
        button: buttonText,
        sections: sections
      }
    }
  };

  console.log('📋 [WhatsApp List Message]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return;
    }

    const result = await response.json();
    console.log('List message sent successfully:', result.messages?.[0]?.id);
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp list message:', error);
  }
}

export async function sendWhatsAppMessage(to, text) {
  logFinalResponse(to, 'Text Message', text);

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: text }
  };

  console.log('💬 [WhatsApp Text Message]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return;
    }

    const result = await response.json();
    console.log('Message sent successfully:', result.messages?.[0]?.id);
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
  }
}
