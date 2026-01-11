/**
 * DATABASE CONNECTION
 * 
 * PostgreSQL connection pool using pg library
 */

import pg from 'pg';
import { databaseConfig } from '../config/database.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Create pool based on configuration
const pool = databaseConfig.connectionString
  ? new Pool({
      connectionString: databaseConfig.connectionString,
      ssl: databaseConfig.ssl,
      ...databaseConfig.pool
    })
  : new Pool({
      host: databaseConfig.host,
      user: databaseConfig.user,
      password: databaseConfig.password,
      database: databaseConfig.database,
      port: databaseConfig.port,
      ...databaseConfig.pool
    });

// Connection event handlers
pool.on('connect', () => {
  logger.info('Database', 'Connected to PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Database', 'Pool error', err.message);
});

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database', `Connection verified: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    logger.error('Database', 'Connection test failed', error.message);
    return false;
  }
}

/**
 * Close all pool connections
 */
export async function closePool() {
  await pool.end();
  logger.info('Database', 'Pool closed');
}

// Export pool both as named and default export
export { pool };
export default pool;
