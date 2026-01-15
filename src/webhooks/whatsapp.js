import { handleIncomingMessage } from '../orchestrator/index.js';
import { sendWhatsAppMessage } from '../whatsapp/sendmessage.js';

export default async function whatsappWebhook(req, res) {
  console.log('\n🟢 [WHATSAPP WEBHOOK] POST /whatsapp-webhook');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));

  const object = req.body.object;

  if (object !== 'whatsapp_business_account') {
    console.log('⚠️ Not a WhatsApp event, ignoring');
    return res.sendStatus(200);
  }

  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;

  if (Array.isArray(messages)) {
    for (const message of messages) {
      const userId = message.from;
      const userName = value?.contacts?.[0]?.profile?.name || 'Unknown';
      const messageType = message.type || 'text';

      console.log(`\n━━━ WHATSAPP MESSAGE ━━━`);
      console.log(`📱 From: ${userName} (${userId})`);
      console.log(`📝 Type: ${messageType}`);

      // Build message object for orchestrator
      const msgObject = {
        userId,
        platform: 'whatsapp',
        type: messageType
      };

      // Handle different message types
      if (messageType === 'text') {
        msgObject.text = message.text?.body || '';
        console.log(`💬 Message: ${msgObject.text}`);
      } else if (messageType === 'interactive') {
        // Handle button replies and list replies
        msgObject.interactive = message.interactive;
        if (message.interactive?.type === 'button_reply') {
          msgObject.text = message.interactive.button_reply.title;
          console.log(`🔘 Button: ${message.interactive.button_reply.title} (${message.interactive.button_reply.id})`);
        } else if (message.interactive?.type === 'list_reply') {
          msgObject.text = message.interactive.list_reply.title;
          console.log(`📋 List Selection: ${message.interactive.list_reply.title} (${message.interactive.list_reply.id})`);
        }
      }

      // Skip if no processable content
      if (!msgObject.text && !msgObject.interactive) {
        console.log(`⏭️ Skipping unsupported message type`);
        continue;
      }

      try {
        await handleIncomingMessage(msgObject);
        console.log(`✅ WhatsApp message processed for ${userId}\n`);
      } catch (error) {
        console.error(`❌ Error processing WhatsApp message:`, error);
        // Send friendly error message
        try {
          await sendWhatsAppMessage(userId, "Currently chat unavailable, please call for details.");
        } catch (sendErr) {
          console.error('Failed to send error notification:', sendErr);
        }
      }
    }
  }

  return res.sendStatus(200);
}

