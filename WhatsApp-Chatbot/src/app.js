/**
 * EXPRESS APP
 * 
 * Express application configuration
 * Separates Express setup from HTTP server
 */

import express from 'express';
import { registerRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';
import config from './config/index.js';

// Create Express app
const app = express();

// ====================
// MIDDLEWARE
// ====================

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
    
    logger[logLevel]('HTTP', `${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// ====================
// ROUTES
// ====================

// Register all routes
registerRoutes(app);

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('App', `Unhandled error: ${err.message}`, err.stack);
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: config.app.nodeEnv === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    ...(config.app.nodeEnv !== 'production' && { stack: err.stack })
  });
});

export default app;
