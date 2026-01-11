/**
 * TEST SETUP
 * 
 * Common test utilities and setup
 */

// Mock environment for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.WHATSAPP_TOKEN = 'test_token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
process.env.VERIFY_TOKEN = 'test_verify';
process.env.GROQ_API_KEY = 'test_groq_key';

/**
 * Create mock request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides
  };
}

/**
 * Create mock response object
 */
export function createMockResponse() {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    },
    send: function(data) {
      this.sendData = data;
      return this;
    },
    sendStatus: function(code) {
      this.statusCode = code;
      return this;
    }
  };
  return res;
}

/**
 * Create mock WhatsApp webhook payload
 */
export function createWhatsAppPayload(text, userId = '1234567890') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '1234567890',
            phone_number_id: '123456789'
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: userId
          }],
          messages: [{
            from: userId,
            id: `wamid.${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: text }
          }]
        },
        field: 'messages'
      }]
    }]
  };
}

/**
 * Create mock Messenger webhook payload
 */
export function createMessengerPayload(text, userId = 'USER_ID') {
  return {
    object: 'page',
    entry: [{
      id: 'PAGE_ID',
      time: Date.now(),
      messaging: [{
        sender: { id: userId },
        recipient: { id: 'PAGE_ID' },
        timestamp: Date.now(),
        message: {
          mid: `mid.${Date.now()}`,
          text: text
        }
      }]
    }]
  };
}

/**
 * Mock database pool
 */
export function createMockPool() {
  return {
    query: async (sql, params) => {
      console.log('Mock query:', sql);
      return { rows: [], rowCount: 0 };
    },
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {}
    }),
    end: async () => {}
  };
}

/**
 * Wait for async operations
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  createMockRequest,
  createMockResponse,
  createWhatsAppPayload,
  createMessengerPayload,
  createMockPool,
  wait
};
