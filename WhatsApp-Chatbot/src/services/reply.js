import { sendWhatsAppMessage } from '../whatsapp/sendmessage.js';

async function sendReply(platform, userId, text) {
  if (platform === "whatsapp") {
    await sendWhatsAppMessage(userId, text);
  }

  if (platform === "messenger") {
    console.log('\n✅ [FINAL RESPONSE MESSAGE]');
    console.log(`🎯 User ID: ${userId}`);
    console.log(`📤 Message:\n${text}`);
    console.log('━'.repeat(50));
    // call Messenger Send API
  }
}

export { sendReply };
