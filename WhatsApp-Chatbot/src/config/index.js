/**
 * CONFIG INDEX
 * 
 * Central configuration module
 * All environment variables are accessed through this module
 */

import 'dotenv/config';

export { databaseConfig } from './database.js';
export { llmConfig } from './llm.js';

/**
 * Application configuration
 */
const config = {
  // App settings
  app: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
  },
  
  // WhatsApp settings
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.VERIFY_TOKEN,
    apiVersion: 'v20.0'
  },
  
  // Messenger settings
  messenger: {
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    appSecret: process.env.MESSENGER_APP_SECRET,
    verifyToken: process.env.VERIFY_TOKEN,
    apiVersion: 'v18.0'
  },
  
  // LLM settings
  llm: {
    provider: process.env.LLM_PROVIDER || 'groq',
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    }
  },
  
  // Database settings
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'chatbot',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  }
};

export default config;
