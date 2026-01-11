/**
 * HTTP SERVER
 * 
 * Entry point for the application
 * Starts the HTTP server after bootstrap
 */

import app from './app.js';
import { bootstrap, shutdown } from './bootstrap.js';
import { logger } from './utils/logger.js';
import config from './config/index.js';

const PORT = config.app.port;

/**
 * Start the server
 */
async function start() {
  try {
    // Run bootstrap (database, config, etc.)
    await bootstrap();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info('Server', `🚀 Server running on port ${PORT}`);
      logger.info('Server', `📍 Environment: ${config.app.nodeEnv}`);
      logger.info('Server', `🔗 Webhook URL: ${config.app.baseUrl}/webhooks/whatsapp`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info('Server', `Received ${signal}, starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('Server', 'HTTP server closed');
        await shutdown();
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Server', 'Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Server', `Failed to start: ${error.message}`, error.stack);
    process.exit(1);
  }
}

// Start the server
start();
