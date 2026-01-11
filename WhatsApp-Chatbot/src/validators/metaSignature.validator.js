/**
 * META SIGNATURE VALIDATOR
 * 
 * Verifies webhook signatures from Meta (WhatsApp/Messenger)
 */

import { verifyMetaSignature } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

/**
 * Express middleware to verify Meta webhook signatures
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
export function validateMetaSignature(req, res, next) {
  // Skip verification in development if configured
  if (process.env.SKIP_SIGNATURE_VALIDATION === 'true') {
    logger.warn('Validator', 'Signature validation skipped (dev mode)');
    return next();
  }
  
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!signature) {
    logger.warn('Validator', 'Missing X-Hub-Signature-256 header');
    // Continue anyway for now (Meta doesn't always send signature for verification)
    return next();
  }
  
  if (!appSecret) {
    logger.warn('Validator', 'FACEBOOK_APP_SECRET not configured');
    return next();
  }
  
  // Get raw body for signature verification
  const rawBody = JSON.stringify(req.body);
  
  if (verifyMetaSignature(rawBody, signature, appSecret)) {
    logger.debug('Validator', 'Meta signature verified');
    return next();
  }
  
  logger.error('Validator', 'Invalid Meta signature');
  return res.status(401).send('Invalid signature');
}
