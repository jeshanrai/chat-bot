import fetch from 'node-fetch';

// Messenger-specific environment variables
const getConfig = () => ({
  pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN,
  apiVersion: process.env.MESSENGER_API_VERSION || 'v18.0'
});

function logFinalResponse(to, type, content) {
  console.log('\n✅ [MESSENGER FINAL RESPONSE]');
  console.log(`🎯 User PSID: ${to}`);
  console.log(`📝 Type: ${type}`);
  console.log(`📤 Content: ${content}`);
  console.log('━'.repeat(50));
}

/**
 * Send a text message via Facebook Messenger Send API
 */
export async function sendMessengerMessage(recipientPsid, messageText) {
  logFinalResponse(recipientPsid, 'Text', messageText);

  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) {
    console.error('❌ Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }

  if (!recipientPsid || recipientPsid === '' || recipientPsid === 'undefined') {
    console.error('❌ Invalid PSID: Cannot send message without a valid recipient ID');
    return null;
  }

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    message: { text: messageText },
    messaging_type: 'RESPONSE'
  };

  console.log('📤 [Messenger Text Message]', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }

    console.log('✅ Messenger message sent:', json.message_id);
    return json;
  } catch (error) {
    console.error('❌ Network error sending Messenger message:', error.message);
    return null;
  }
}

/**
 * Send a message with quick reply buttons
 */
export async function sendMessengerQuickReplies(recipientPsid, text, quickReplies) {
  logFinalResponse(recipientPsid, 'Quick Replies', `${text}\n[Options: ${quickReplies.map(q => q.title).join(', ')}]`);

  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) {
    console.error('❌ Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
    message: {
      text,
      quick_replies: quickReplies.map(qr => ({
        content_type: 'text',
        title: qr.title.substring(0, 20), // Max 20 chars for quick reply
        payload: qr.payload || qr.title
      }))
    }
  };

  console.log('🔘 [Messenger Quick Replies]', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }

    console.log('✅ Messenger quick replies sent:', json.message_id);
    return json;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

/**
 * Send a generic template (carousel of cards)
 */
export async function sendMessengerGenericTemplate(recipientPsid, elements) {
  logFinalResponse(recipientPsid, 'Generic Template', `[${elements.length} cards]`);

  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) {
    console.error('❌ Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements.slice(0, 10).map(el => ({
            title: el.title.substring(0, 80),
            subtitle: el.subtitle?.substring(0, 80),
            image_url: el.imageUrl,
            buttons: el.buttons?.slice(0, 3).map(btn => ({
              type: btn.type || 'postback',
              title: btn.title.substring(0, 20),
              payload: btn.payload
            }))
          }))
        }
      }
    }
  };

  console.log('🎴 [Messenger Generic Template]', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }

    console.log('✅ Messenger template sent:', json.message_id);
    return json;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

/**
 * Send a button template (text with up to 3 buttons)
 */
export async function sendMessengerButtonTemplate(recipientPsid, text, buttons) {
  logFinalResponse(recipientPsid, 'Button Template', `${text}\n[Buttons: ${buttons.map(b => b.title).join(', ')}]`);

  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) {
    console.error('❌ Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text.substring(0, 640),
          buttons: buttons.slice(0, 3).map(btn => ({
            type: btn.type || 'postback',
            title: btn.title.substring(0, 20),
            payload: btn.payload || btn.title,
            ...(btn.url && { type: 'web_url', url: btn.url })
          }))
        }
      }
    }
  };

  console.log('🔳 [Messenger Button Template]', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }

    console.log('✅ Messenger button template sent:', json.message_id);
    return json;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

/**
 * Send an image message
 */
export async function sendMessengerImage(recipientPsid, imageUrl, isReusable = true) {
  logFinalResponse(recipientPsid, 'Image', `[Image: ${imageUrl}]`);

  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) {
    console.error('❌ Missing MESSENGER_PAGE_ACCESS_TOKEN');
    return null;
  }

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl,
          is_reusable: isReusable
        }
      }
    }
  };

  console.log('📷 [Messenger Image]', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (json.error) {
      handleMessengerError(json.error);
      return null;
    }

    console.log('✅ Messenger image sent:', json.message_id);
    return json;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

/**
 * Send sender action (typing indicator, mark seen)
 */
export async function sendMessengerSenderAction(recipientPsid, action) {
  const { pageAccessToken, apiVersion } = getConfig();

  if (!pageAccessToken) return null;

  const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${pageAccessToken}`;

  const requestBody = {
    recipient: { id: recipientPsid },
    sender_action: action // 'typing_on', 'typing_off', 'mark_seen'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Sender action error:', error.message);
    return null;
  }
}

/**
 * Handle and log Messenger API errors
 */
function handleMessengerError(error) {
  const errorCode = error.code;
  const errorMessage = error.message;

  switch (errorCode) {
    case 551:
      console.error(`❌ Error #551: This person isn't available right now.`);
      console.error('Possible reasons: User blocked the page, deleted account, or hasn\'t opted in.');
      break;
    case 100:
      console.error(`❌ Error #100: Invalid parameter.`);
      console.error('Check if PSID is correct and user has messaged the page first.');
      break;
    case 10:
      console.error(`❌ Error #10: Permission denied.`);
      console.error('Check if MESSENGER_PAGE_ACCESS_TOKEN has \'pages_messaging\' permission.');
      break;
    case 190:
      console.error(`❌ Error #190: Invalid access token.`);
      console.error('MESSENGER_PAGE_ACCESS_TOKEN may be expired or invalid.');
      break;
    case 200:
      console.error(`❌ Error #200: Permission error.`);
      console.error('App doesn\'t have permission to send to this user.');
      break;
    case 1200:
      console.error(`❌ Error #1200: Temporary send message failure.`);
      console.error('Retry the request.');
      break;
    case 2018001:
      console.error(`❌ Error #2018001: No matching user.`);
      console.error('The PSID doesn\'t match any user for this page.');
      break;
    default:
      console.error(`❌ Messenger API Error #${errorCode}: ${errorMessage}`);
  }
  console.error('Full error:', JSON.stringify(error, null, 2));
}

export default {
  sendMessengerMessage,
  sendMessengerQuickReplies,
  sendMessengerGenericTemplate,
  sendMessengerButtonTemplate,
  sendMessengerImage,
  sendMessengerSenderAction
};
