/**
 * RESERVATION TOOLS
 * 
 * Tool adapters for table reservation operations (future feature)
 * These call services - NO direct database access
 */

import * as reservationService from '../services/reservation.service.js';
import { sendMessage, sendButtonMessage } from '../messaging/index.js';
import { buildWhatsAppButton } from '../messaging/message.builders.js';
import { formatDate, formatTime } from '../utils/time.js';
import { logger } from '../utils/logger.js';

/**
 * Book a table
 */
export async function bookTable(args, userId, context) {
  try {
    const { tableNumber, partySize = 2, date, time } = args;
    
    // Default to today if not specified
    const reservationDate = date || new Date().toISOString().split('T')[0];
    const reservationTime = time || '19:00';
    
    // Check availability
    const isAvailable = await reservationService.checkTableAvailability(
      tableNumber, 
      reservationDate, 
      reservationTime
    );
    
    if (!isAvailable) {
      // Get alternative tables
      const alternatives = await reservationService.getAvailableTables(
        reservationDate, 
        reservationTime, 
        partySize
      );
      
      if (alternatives.length > 0) {
        const altText = alternatives.slice(0, 3)
          .map(t => `Table ${t.table_number} (seats ${t.capacity})`)
          .join(', ');
        
        await sendMessage(
          userId, 
          context.platform, 
          `Sorry, Table ${tableNumber} is not available at that time.\n\nAvailable alternatives: ${altText}\n\nWould you like to book one of these?`
        );
      } else {
        await sendMessage(
          userId, 
          context.platform, 
          `Sorry, Table ${tableNumber} is not available and we don't have alternatives for that time. Try a different time?`
        );
      }
      
      return { reply: null, updatedContext: context };
    }
    
    // Create reservation
    const reservation = await reservationService.createReservation({
      userId,
      platform: context.platform,
      tableNumber,
      partySize,
      date: reservationDate,
      time: reservationTime
    });
    
    await sendMessage(
      userId,
      context.platform,
      `🎉 Table ${tableNumber} booked!\n\n📅 ${formatDate(reservationDate)}\n⏰ ${reservationTime}\n👥 ${partySize} guests\n\nReservation ID: #${reservation.id}\n\nSee you then! 🍽️`
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastReservationId: reservation.id,
        lastAction: 'book_table'
      }
    };
  } catch (error) {
    logger.error('ReservationTools', 'Failed to book table', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't book that table. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Check table availability
 */
export async function checkAvailability(args, userId, context) {
  try {
    const { date, time, partySize = 2 } = args;
    
    const reservationDate = date || new Date().toISOString().split('T')[0];
    const reservationTime = time || '19:00';
    
    const availableTables = await reservationService.getAvailableTables(
      reservationDate, 
      reservationTime, 
      partySize
    );
    
    if (availableTables.length === 0) {
      await sendMessage(
        userId, 
        context.platform, 
        `Sorry, no tables available for ${partySize} guests at ${reservationTime} on ${formatDate(reservationDate)}. Try a different time?`
      );
      return { reply: null, updatedContext: context };
    }
    
    const tableList = availableTables.slice(0, 5)
      .map(t => `• Table ${t.table_number} - seats ${t.capacity} (${t.location})`)
      .join('\n');
    
    await sendMessage(
      userId,
      context.platform,
      `📋 Available tables for ${formatDate(reservationDate)} at ${reservationTime}:\n\n${tableList}\n\nTo book, say "book table X" where X is the table number.`
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastAction: 'check_availability'
      }
    };
  } catch (error) {
    logger.error('ReservationTools', 'Failed to check availability', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't check availability. Please try again.");
    return { reply: null, updatedContext: context };
  }
}

/**
 * Show user's reservations
 */
export async function showReservations(args, userId, context) {
  try {
    const reservations = await reservationService.getUserReservations(userId);
    
    if (reservations.length === 0) {
      await sendMessage(userId, context.platform, "You don't have any upcoming reservations. Would you like to book a table?");
      return { reply: null, updatedContext: context };
    }
    
    const lines = reservations.map(r => 
      `• Table ${r.table_number} - ${formatDate(r.reservation_date)} at ${r.reservation_time} (${r.party_size} guests)`
    );
    
    await sendMessage(
      userId,
      context.platform,
      `📅 Your Reservations:\n\n${lines.join('\n')}\n\nTo cancel, say "cancel reservation".`
    );
    
    return {
      reply: null,
      updatedContext: {
        ...context,
        lastAction: 'show_reservations'
      }
    };
  } catch (error) {
    logger.error('ReservationTools', 'Failed to show reservations', error.message);
    await sendMessage(userId, context.platform, "Sorry, I couldn't load your reservations. Please try again.");
    return { reply: null, updatedContext: context };
  }
}
