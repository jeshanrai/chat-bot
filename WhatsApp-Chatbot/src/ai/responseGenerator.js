import { groq } from './groqClient.js';
import { AI_CONFIG } from './config.js';

/**
 * Generates a natural language response based on tool execution results.
 * @param {string} toolName - Name of the tool executed
 * @param {object} args - Arguments passed to the tool
 * @param {any} result - Result returned by the tool
 * @param {object} userContext - Current conversation userContext
 * @returns {Promise<string>} - Generated text response
 */
export async function generateToolResponse(toolName, args, result, userContext) {
    try {
        const prompt = `
    You are a friendly restaurant waiter AI at Momo House.
    
    CONTEXT:
    Tool Executed: ${toolName}
    Arguments: ${JSON.stringify(args)}
    Result (Data found): ${JSON.stringify(result, null, 2)}
    User Stage: ${userContext.stage || 'unknown'}

    TASK:
    Generate a short, engaging WhatsApp message body to introduce these results to the user.
    
    RULES:
    1. Be enthusiastic and helpful. 🥟
    2. Do NOT list the items in detail (they will be shown in a UI list below your text).
    3. Just acknowledge what was found and invite them to look.
    4. Keep it under 160 characters if possible.
    5. If the tool was 'recommend_food' with tag 'random', act like it's a special Chef's Choice.
    
    OUTPUT:
    Just the message text, nothing else.
    `;

        const completion = await groq().chat.completions.create({
            model: AI_CONFIG.model,
            temperature: 0.7, // Slightly higher for creativity
            messages: [
                { role: 'system', content: prompt }
            ]
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error generating tool response:', error);
        // Fallback static responses
        if (toolName === 'recommend_food') {
            return "Here are some delicious options for you!";
        }
        return "Here is what I found:";
    }
}
