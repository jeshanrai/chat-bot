import { getContext, updateContext } from './context.js';
import { routeIntent, parseInteractiveReply } from './router.js';
import { sendReply } from '../services/reply.js';

async function handleIncomingMessage(message) {
  const userId = message.userId;
  const platform = message.platform || 'whatsapp'; // Default to whatsapp if missing
  let context = await getContext(userId, platform);

  // Ensure platform is stored in context
  if (message.platform && context.platform !== message.platform) {
    context.platform = message.platform;
    await updateContext(userId, context, platform);
  }

  // Check for interactive reply (button click or list selection)
  const interactiveReply = parseInteractiveReply(message);

  // Add USER message to history
  const history = context.history || [];
  history.push({ role: 'user', content: message.text || (interactiveReply ? `[Selected: ${interactiveReply.title}]` : '[Media/Other]') });

  // Keep last 10 messages
  if (history.length > 10) history.shift();

  const decision = await routeIntent({
    text: message.text,
    context,
    userId,
    interactiveReply
  });

  // Add ASSISTANT message to history (if text reply)
  if (decision.reply) {
    history.push({ role: 'assistant', content: decision.reply });
    if (history.length > 10) history.shift();
  } else if (decision.updatedContext && decision.updatedContext.lastAction) {
    // If tool execution without direct text reply (e.g. showing a menu), log it as system action
    history.push({ role: 'system', content: `Tool executed: ${decision.updatedContext.lastAction}` });
    if (history.length > 10) history.shift();
  }

  await updateContext(userId, { ...decision.updatedContext, history }, platform);

  // Only send reply if there's one (interactive messages handle their own replies)
  if (decision.reply) {
    await sendReply(message.platform, userId, decision.reply);
  }
}

export { handleIncomingMessage };
