import { handleIncomingMessage } from '../orchestrator/index.js';
import { sendMessengerSenderAction, sendMessengerMessage } from '../messenger/sendmessage.js';

/**
 * Extract message text from various Messenger message types
 */
function extractMessageText(message = {}) {
  // Text message
  if (message.text) return message.text;

  // Quick reply
  if (message.quick_reply?.payload) return message.quick_reply.payload;

  // Attachments (stickers, images, etc.)
  if (message.attachments?.length > 0) {
    const attachment = message.attachments[0];
    if (attachment.type === 'image') return '[Image attachment]';
    if (attachment.type === 'sticker') return '[Sticker]';
    if (attachment.type === 'audio') return '[Audio message]';
    if (attachment.type === 'video') return '[Video]';
    if (attachment.type === 'file') return '[File attachment]';
    if (attachment.type === 'location') {
      const coords = attachment.payload?.coordinates;
      if (coords) return `[Location: ${coords.lat}, ${coords.long}]`;
      return '[Location shared]';
    }
  }

  return null;
}

/**
 * Extract postback payload
 */
function extractPostbackPayload(postback = {}) {
  return postback.payload || postback.title || null;
}

/**
 * Messenger Webhook Handler
 * Processes incoming messages from Facebook Messenger
 */
export default async function messengerWebhook(req, res) {
  const body = req.body;

  console.log('\n🟦 [MESSENGER WEBHOOK RECEIVED]');
  console.log('📦 Body:', JSON.stringify(body, null, 2));

  // Verify this is a page subscription
  if (body.object !== 'page') {
    console.log('⚠️ Not a page event, ignoring');
    return res.sendStatus(404);
  }

  // Return 200 immediately to acknowledge receipt (required by Facebook)
  res.status(200).send('EVENT_RECEIVED');

  // Process each entry (there may be multiple if batched)
  for (const entry of body.entry || []) {
    const webhookEvents = entry.messaging || [];

    for (const event of webhookEvents) {
      const senderPsid = event.sender?.id;
      const recipientId = event.recipient?.id;
      const timestamp = event.timestamp;

      if (!senderPsid) {
        console.log('⚠️ No sender PSID, skipping event');
        continue;
      }

      console.log(`\n━━━ MESSENGER MESSAGE ━━━`);
      console.log(`📱 From PSID: ${senderPsid}`);
      console.log(`📍 To Page: ${recipientId}`);
      console.log(`🕐 Timestamp: ${new Date(timestamp).toISOString()}`);

      try {
        // Send typing indicator
        await sendMessengerSenderAction(senderPsid, 'typing_on');

        // Handle different event types
        if (event.message) {
          await handleMessengerMessage(senderPsid, event.message);
        } else if (event.postback) {
          await handleMessengerPostback(senderPsid, event.postback);
        } else if (event.referral) {
          await handleMessengerReferral(senderPsid, event.referral);
        } else if (event.read) {
          console.log(`👁️ Message read at: ${event.read.watermark}`);
        } else if (event.delivery) {
          console.log(`✅ Message delivered at: ${event.delivery.watermark}`);
        }
      } catch (error) {
        console.error(`❌ Error processing Messenger event:`, error);
        // Send friendly error message
        try {
          await sendMessengerMessage(senderPsid, "Currently chat unavailable, please call for details.");
        } catch (sendErr) {
          console.error('Failed to send error notification:', sendErr);
        }
      }
    }
  }
}

/**
 * Handle incoming Messenger text/media messages
 */
async function handleMessengerMessage(senderPsid, receivedMessage) {
  const messageId = receivedMessage.mid;
  const text = extractMessageText(receivedMessage);
  const isQuickReply = !!receivedMessage.quick_reply;

  console.log(`📝 Message ID: ${messageId}`);
  console.log(`💬 Text: ${text || '[No text]'}`);
  console.log(`⚡ Quick Reply: ${isQuickReply}`);

  if (!text) {
    console.log('⏭️ No processable text, skipping');
    return;
  }

  // Build message object for orchestrator (same format as WhatsApp)
  const msgObject = {
    userId: senderPsid,
    platform: 'messenger',
    type: isQuickReply ? 'quick_reply' : 'text',
    text: text,
    messageId: messageId
  };

  // Handle quick replies as interactive selections
  if (isQuickReply) {
    msgObject.interactive = {
      type: 'quick_reply',
      payload: receivedMessage.quick_reply.payload
    };
  }

  // Process through the same orchestrator as WhatsApp
  try {
    await handleIncomingMessage(msgObject);
    console.log(`✅ Messenger message processed for PSID: ${senderPsid}\n`);
  } catch (error) {
    console.error(`❌ Error in orchestrator:`, error);
  }
}

/**
 * Handle Messenger postback events (button clicks)
 */
async function handleMessengerPostback(senderPsid, receivedPostback) {
  const payload = extractPostbackPayload(receivedPostback);
  const title = receivedPostback.title;

  console.log(`🔘 Postback Title: ${title}`);
  console.log(`📦 Postback Payload: ${payload}`);

  // Handle special postbacks
  if (payload === 'GET_STARTED') {
    // Welcome message for new users
    const msgObject = {
      userId: senderPsid,
      platform: 'messenger',
      type: 'postback',
      text: 'GET_STARTED',
      interactive: {
        type: 'postback',
        payload: 'GET_STARTED',
        title: 'Get Started'
      }
    };

    try {
      await handleIncomingMessage(msgObject);
      console.log(`✅ GET_STARTED processed for PSID: ${senderPsid}\n`);
    } catch (error) {
      console.error(`❌ Error processing GET_STARTED:`, error);
    }
    return;
  }

  // Regular postback - treat as interactive selection
  const msgObject = {
    userId: senderPsid,
    platform: 'messenger',
    type: 'postback',
    text: title || payload,
    interactive: {
      type: 'postback',
      payload: payload,
      title: title
    }
  };

  try {
    await handleIncomingMessage(msgObject);
    console.log(`✅ Postback processed for PSID: ${senderPsid}\n`);
  } catch (error) {
    console.error(`❌ Error processing postback:`, error);
  }
}

/**
 * Handle Messenger referral events (m.me links, ads, etc.)
 */
async function handleMessengerReferral(senderPsid, referral) {
  const ref = referral.ref;
  const source = referral.source;
  const type = referral.type;

  console.log(`🔗 Referral: source=${source}, type=${type}, ref=${ref}`);

  // Treat referral as a special entry point
  // DISABLED per user request
  console.log('Referral processing disabled');
  return;

  /*
  const msgObject = {
    userId: senderPsid,
    platform: 'messenger',
    type: 'referral',
    text: ref || 'Hello',
    referral: {
      source,
      type,
      ref
    }
  };

  try {
    await handleIncomingMessage(msgObject);
    console.log(`✅ Referral processed for PSID: ${senderPsid}\n`);
  } catch (error) {
    console.error(`❌ Error processing referral:`, error);
  }
  */
}
