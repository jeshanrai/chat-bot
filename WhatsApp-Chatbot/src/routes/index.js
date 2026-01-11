/**
 * ROUTES INDEX
 * 
 * Aggregates all route modules and provides registration function
 */

import { Router } from 'express';
import webhookRoutes from './webhook.routes.js';
import healthRoutes from './health.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Mount routes
router.use(webhookRoutes);
router.use(healthRoutes);
router.use(adminRoutes);

/**
 * Register all routes on the Express app
 * @param {Express} app - Express application instance
 */
export function registerRoutes(app) {
  app.use(router);
}

export default router;
