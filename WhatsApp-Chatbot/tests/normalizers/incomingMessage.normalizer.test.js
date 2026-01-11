/**
 * NORMALIZER TESTS
 * 
 * Tests for message normalization
 */

import { describe, it, expect } from 'node:test';
import assert from 'node:assert';
import { normalizeWhatsAppMessage, normalizeMessengerMessage } from '../src/normalizers/incomingMessage.normalizer.js';

describe('WhatsApp Message Normalizer', () => {
  
  it('should normalize a text message', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '1234567890',
              type: 'text',
              text: { body: 'Hello' },
              timestamp: '1234567890'
            }]
          }
        }]
      }]
    };
    
    const result = normalizeWhatsAppMessage(payload);
    
    assert.strictEqual(result.userId, '1234567890');
    assert.strictEqual(result.text, 'Hello');
    assert.strictEqual(result.type, 'text');
    assert.strictEqual(result.platform, 'whatsapp');
  });
  
  it('should normalize an interactive button reply', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '1234567890',
              type: 'interactive',
              interactive: {
                type: 'button_reply',
                button_reply: { id: 'view_menu', title: 'View Menu' }
              },
              timestamp: '1234567890'
            }]
          }
        }]
      }]
    };
    
    const result = normalizeWhatsAppMessage(payload);
    
    assert.strictEqual(result.type, 'interactive');
    assert.strictEqual(result.interactive.type, 'button_reply');
    assert.strictEqual(result.interactive.button_reply.id, 'view_menu');
  });
  
  it('should return null for invalid payload', () => {
    const result = normalizeWhatsAppMessage({});
    assert.strictEqual(result, null);
  });
  
});

describe('Messenger Message Normalizer', () => {
  
  it('should normalize a text message', () => {
    const payload = {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'USER_123' },
          message: { text: 'Hello from Messenger' }
        }]
      }]
    };
    
    const result = normalizeMessengerMessage(payload);
    
    assert.strictEqual(result.userId, 'USER_123');
    assert.strictEqual(result.text, 'Hello from Messenger');
    assert.strictEqual(result.platform, 'messenger');
  });
  
});
