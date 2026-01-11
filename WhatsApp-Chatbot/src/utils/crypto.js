/**
 * CRYPTO UTILITY
 * 
 * Cryptographic functions for signature verification
 */

import crypto from 'crypto';

/**
 * Verify Meta webhook signature (X-Hub-Signature-256)
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from header
 * @param {string} appSecret - Facebook App Secret
 * @returns {boolean}
 */
export function verifyMetaSignature(payload, signature, appSecret) {
  if (!signature || !appSecret) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  
  const signatureHash = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate a random string for tokens
 * @param {number} length - Length of string
 * @returns {string}
 */
export function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
