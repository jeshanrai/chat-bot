import { sendMessage } from './response.js';

async function sendReply(platform, userId, text) {
  await sendMessage(userId, platform, text);
}

export { sendReply };
