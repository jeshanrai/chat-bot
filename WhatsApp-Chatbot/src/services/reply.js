import { sendWhatsAppMessage } from '../whatsapp/sendmessage.js';
import { sendMessengerMessage } from '../messenger/sendmessage.js';

async function sendReply(platform, userId, text) {
  if (platform === "whatsapp") {
    await sendWhatsAppMessage(userId, text);
  }

  if (platform === "messenger") {
    await sendMessengerMessage(userId, text);
  }
}

export { sendReply };
