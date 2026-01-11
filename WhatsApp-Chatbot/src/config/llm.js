/**
 * LLM CONFIGURATION
 * 
 * Settings for AI/LLM providers
 */

import dotenv from 'dotenv';
dotenv.config();

export const llmConfig = {
  // Current provider: 'groq' | 'openai' | 'gemini'
  provider: process.env.LLM_PROVIDER || 'groq',
  
  // Groq settings
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.1,
    toolChoice: 'auto'
  },
  
  // OpenAI settings (future)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1
  },
  
  // Gemini settings (future)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro'
  }
};
