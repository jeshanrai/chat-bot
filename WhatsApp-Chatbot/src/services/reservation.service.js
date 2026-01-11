/**
 * RESERVATION SERVICE
 * 
 * Business logic for table reservations (future feature)
 */

import pool from '../database/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Check table availability
 * @param {number} tableNumber - Table number
 * @param {string} date - Reservation date (YYYY-MM-DD)
 * @param {string} time - Reservation time (HH:MM)
 * @returns {Promise<boolean>}
 */
export async function checkTableAvailability(tableNumber, date, time) {
  try {
    // Check if table exists
    const tableExists = await pool.query(
      'SELECT * FROM tables WHERE table_number = $1 AND is_available = true',
      [tableNumber]
    );
    
    if (tableExists.rows.length === 0) {
      return false;
    }
    
    // Check for existing reservations (2-hour window)
    const result = await pool.query(`
      SELECT * FROM reservations 
      WHERE table_number = $1 
      AND reservation_date = $2 
      AND status NOT IN ('cancelled')
      AND ABS(EXTRACT(EPOCH FROM (reservation_time - $3::time))) < 7200
    `, [tableNumber, date, time]);
    
    return result.rows.length === 0;
  } catch (error) {
    logger.error('ReservationService', 'Failed to check availability', error.message);
    throw error;
  }
}

/**
 * Create a new reservation
 * @param {Object} params - Reservation parameters
 * @returns {Promise<Object>}
 */
export async function createReservation({ 
  userId, 
  platform, 
  tableNumber, 
  partySize, 
  date, 
  time, 
  specialRequests 
}) {
  try {
    const result = await pool.query(`
      INSERT INTO reservations 
      (user_id, platform, table_number, party_size, reservation_date, reservation_time, special_requests, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [userId, platform, tableNumber, partySize, date, time, specialRequests]);
    
    const reservation = result.rows[0];
    logger.info('ReservationService', `Created reservation ${reservation.id} for table ${tableNumber}`);
    
    return reservation;
  } catch (error) {
    logger.error('ReservationService', 'Failed to create reservation', error.message);
    throw error;
  }
}

/**
 * Get user's reservations
 * @param {string} userId - User identifier
 * @returns {Promise<Array>}
 */
export async function getUserReservations(userId) {
  try {
    const result = await pool.query(`
      SELECT * FROM reservations 
      WHERE user_id = $1 
      AND reservation_date >= CURRENT_DATE
      ORDER BY reservation_date, reservation_time
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    logger.error('ReservationService', `Failed to get reservations for ${userId}`, error.message);
    throw error;
  }
}

/**
 * Cancel a reservation
 * @param {number} reservationId - Reservation ID
 * @returns {Promise<Object>}
 */
export async function cancelReservation(reservationId) {
  try {
    const result = await pool.query(
      'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['cancelled', reservationId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Reservation not found');
    }
    
    logger.info('ReservationService', `Cancelled reservation ${reservationId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('ReservationService', `Failed to cancel reservation ${reservationId}`, error.message);
    throw error;
  }
}

/**
 * Get available tables for a given date/time and party size
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} time - Time (HH:MM)
 * @param {number} partySize - Number of guests
 * @returns {Promise<Array>}
 */
export async function getAvailableTables(date, time, partySize) {
  try {
    const result = await pool.query(`
      SELECT t.* FROM tables t
      WHERE t.is_available = true
      AND t.capacity >= $1
      AND t.table_number NOT IN (
        SELECT table_number FROM reservations
        WHERE reservation_date = $2
        AND status NOT IN ('cancelled')
        AND ABS(EXTRACT(EPOCH FROM (reservation_time - $3::time))) < 7200
      )
      ORDER BY t.capacity ASC
    `, [partySize, date, time]);
    
    return result.rows;
  } catch (error) {
    logger.error('ReservationService', 'Failed to get available tables', error.message);
    throw error;
  }
}
