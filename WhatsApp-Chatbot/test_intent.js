
import { detectIntentAndRespond } from './src/ai/intentEngine.js';

async function testYesNoMetrics() {
    console.log('Testing Yes/No handling...');

    const scenarios = [
        {
            text: 'Yes',
            context: { stage: 'confirming_order', cart: [{ name: 'Momo', price: 100, quantity: 1 }] },
            expectedIntent: 'process_order_response',
            expectedAction: 'confirmed'
        },
        {
            text: 'No',
            context: { stage: 'confirming_order', cart: [{ name: 'Momo', price: 100, quantity: 1 }] },
            expectedIntent: 'process_order_response',
            expectedAction: 'cancel_confirm'
        },
        {
            text: 'Okay',
            context: { stage: 'confirming_order', cart: [{ name: 'Momo', price: 100, quantity: 1 }] },
            expectedIntent: 'process_order_response',
            expectedAction: 'confirmed'
        },
        {
            text: 'Sure',
            context: { stage: 'confirming_order', cart: [{ name: 'Momo', price: 100, quantity: 1 }] },
            expectedIntent: 'process_order_response',
            expectedAction: 'confirmed'
        },
        {
            text: 'Dine in',
            context: { stage: 'selecting_service', orderId: 123 },
            expectedIntent: 'select_service_type',
            expectedType: 'dine_in'
        }
    ];

    for (const scenario of scenarios) {
        console.log(`\nTesting: "${scenario.text}" in stage "${scenario.context.stage}"`);
        try {
            // We mock the DB calls inside intentEngine -> tools, but intentEngine calls LLM.
            // This test relies on LLM response. 
            // Note: This requires the API key to be set in .env
            const result = await detectIntentAndRespond(scenario.text, scenario.context);

            console.log(`  Intent: ${result.intent}`);
            if (result.toolCall) {
                console.log(`  ToolArgs: ${JSON.stringify(result.toolCall.arguments)}`);
            }

            if (result.intent === scenario.expectedIntent) {
                console.log('  ✅ Intent Match');
            } else {
                console.log(`  ❌ Intent Mismatch (Expected: ${scenario.expectedIntent})`);
            }
        } catch (e) {
            console.error('  ERROR:', e);
        }
    }
}

// Check if .env exists
import fs from 'fs';
if (fs.existsSync('.env')) {
    import('dotenv/config');
    testYesNoMetrics();
} else {
    console.log('No .env found, skipping live LLM test.');
}
