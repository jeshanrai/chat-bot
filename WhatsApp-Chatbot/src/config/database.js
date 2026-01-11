/**
 * DATABASE CONFIGURATION
 * 
 * PostgreSQL connection settings
 */

import dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = {
  // Use DATABASE_URL if available (recommended for cloud deployments)
  connectionString: process.env.DATABASE_URL || null,
  
  // Individual connection params (fallback)
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'restaurant_bot',
  port: parseInt(process.env.DB_PORT) || 5432,
  
  // SSL configuration for cloud databases
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  
  // Pool settings
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
};
