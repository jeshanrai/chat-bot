
import { detectIntentAndRespond } from './src/ai/intentEngine.js';

async function testEntityExtraction() {
    console.log('Testing Entity Extraction...');

    const scenarios = [
        {
            text: 'place the order for 2 plate veg momo',
            expectedIntent: 'add_item_by_name',
            expectedName: 'Veg Momo',
            expectedQuantity: 2
        },
        {
            text: 'add 3 chicken momo',
            expectedIntent: 'add_item_by_name',
            expectedName: 'Chicken Momo',
            expectedQuantity: 3
        },
        {
            text: 'I want one steam momo',
            expectedIntent: 'add_item_by_name',
            expectedName: 'Steam Momo', // partial match is fine, just checking clean extraction
            expectedQuantity: 1
        }
    ];

    for (const scenario of scenarios) {
        console.log(`\nTesting: "${scenario.text}"`);
        try {
            const result = await detectIntentAndRespond(scenario.text, {});

            console.log(`  Intent: ${result.intent}`);
            let passed = true;
            if (result.intent !== scenario.expectedIntent) {
                console.log(`  ❌ Intent Mismatch (Expected: ${scenario.expectedIntent})`);
                passed = false;
            }

            if (result.toolCall && result.toolCall.arguments) {
                const args = result.toolCall.arguments;
                console.log(`  Args: ${JSON.stringify(args)}`);

                // Loose check for name containment
                if (!args.name || !args.name.toLowerCase().includes(scenario.expectedName.split(' ')[0].toLowerCase())) {
                    console.log(`  ❌ Name Mismatch (Expected approx: ${scenario.expectedName}, Got: ${args.name})`);
                    passed = false;
                }
                // Loose check for quantity (parsing might return string "2" or number 2)
                if (args.quantity != scenario.expectedQuantity) {
                    console.log(`  ❌ Quantity Mismatch (Expected: ${scenario.expectedQuantity}, Got: ${args.quantity})`);
                    passed = false;
                }
            }

            if (passed) console.log('  ✅ Passed');

        } catch (e) {
            console.error('  ERROR:', e);
        }
    }
}

import fs from 'fs';
if (fs.existsSync('.env')) {
    import('dotenv/config');
    testEntityExtraction();
} else {
    console.log('No .env found, skipping live LLM test.');
}
