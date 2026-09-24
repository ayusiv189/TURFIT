import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Booking } from '../types';

/**
 * Format raw phone number into WhatsApp international format.
 * Defaults to Indian country code (91) for 10-digit inputs.
 */
export function cleanWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0 and has 11 digits, strip 0 and prepend 91
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  // Standard 10-digit Indian mobile number
  else if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  // If user typed 12 digits starting with 91 (e.g. 919876543210), keep as is

  return cleaned;
}

/**
 * Generate formatted WhatsApp booking confirmation ticket text.
 */
export function generateWhatsAppBookingMessage(
  booking: Booking,
  recipient: 'PLAYER' | 'OWNER' = 'PLAYER'
): string {
  const refCode = booking.bookingId || booking.id.slice(-6).toUpperCase();
  const dateStr = booking.date;
  const dayStr = booking.day ? ` (${booking.day})` : '';
  const timeStr = `${booking.startTime} - ${booking.endTime}`;
  const durationStr = booking.duration ? ` (${booking.duration} mins)` : '';

  const total = booking.totalAmount || 0;
  const paid = booking.amountPaid || 0;
  const due = booking.amountDue !== undefined ? booking.amountDue : Math.max(0, total - paid);

  let paymentText = 'PAID IN FULL';
  if (paid === 0) {
    paymentText = 'PAY AT TURF DESK';
  } else if (due > 0) {
    paymentText = `PARTIAL ADVANCE (₹${paid} paid, ₹${due} due at desk)`;
  }

  const address = [booking.turfAddress, booking.turfArea, booking.turfCity]
    .filter(Boolean)
    .join(', ');

  const titleHeader = recipient === 'OWNER'
    ? `🏟️ *NEW BOOKING ALERT - TRUFIT* 🏟️`
    : `🏟️ *BOOKING CONFIRMATION - TRUFIT* 🏟️`;

  const lines = [
    titleHeader,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎟️ *Booking Ref:* #${refCode}`,
    `✅ *Status:* Confirmed`,
    ``,
    `🏟️ *Venue:* ${booking.turfName}`,
    `🏸 *Court/Arena:* ${booking.arenaName} (${booking.sport})`,
    `📅 *Date:* ${dateStr}${dayStr}`,
    `⏰ *Slot Time:* ${timeStr}${durationStr}`,
    ``,
    `👤 *Player Name:* ${booking.playerName}`,
    ...(booking.playerPhone ? [`📱 *Contact:* ${booking.playerPhone}`] : []),
    ...(booking.numberOfPlayers && booking.numberOfPlayers > 1
      ? [`👥 *Squad Size:* ${booking.numberOfPlayers} players`]
      : []),
    ``,
    `💳 *Payment Summary:*`,
    `• Total Amount: ₹${total}`,
    `• Online Paid: ₹${paid}`,
    ...(due > 0 ? [`• *Due at Venue: ₹${due}*`] : []),
    `• Payment Mode: ${paymentText}`,
    ...(booking.verifiedAutomatically ? [`• Verification: Instant Bank/Gateway Verified ✓`] : []),
    ``,
    `📍 *Venue Address:*`,
    address || booking.turfName,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    recipient === 'OWNER'
      ? `⚡ *TruFit Turf Partner Console* • Slot locked in live schedule`
      : `📌 *Please present this pass or Booking Ref #${refCode} upon arrival at the turf.*\n⚡ Have a great match! Powered by TruFit Sports`,
  ];

  return lines.join('\n');
}

/**
 * Generate full wa.me link with encoded message.
 */
export function getWhatsAppUrl(phone?: string, message?: string): string {
  const cleaned = cleanWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message || '');
  if (cleaned) {
    return `https://wa.me/${cleaned}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Open WhatsApp with pre-filled booking confirmation message.
 * Returns true if successfully triggered.
 */
export function openWhatsAppNotification(
  booking: Booking,
  targetPhone?: string,
  recipient: 'PLAYER' | 'OWNER' = 'PLAYER'
): boolean {
  const phoneToUse = targetPhone || (recipient === 'PLAYER' ? booking.playerPhone : '');
  const message = generateWhatsAppBookingMessage(booking, recipient);
  const url = getWhatsAppUrl(phoneToUse, message);

  try {
    // Open in a new tab / window
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Fallback if popup blocked
      window.location.href = url;
    }

    // Record notification status asynchronously in Firestore
    if (booking.id) {
      markBookingWhatsAppSent(booking.id).catch((err) => {
        console.warn('Silent record of WhatsApp notification update:', err);
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to open WhatsApp URL:', err);
    return false;
  }
}

/**
 * Copy WhatsApp confirmation message to clipboard.
 */
export async function copyWhatsAppMessage(
  booking: Booking,
  recipient: 'PLAYER' | 'OWNER' = 'PLAYER'
): Promise<boolean> {
  const message = generateWhatsAppBookingMessage(booking, recipient);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = message;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Clipboard copy error:', err);
    return false;
  }
}

/**
 * Update booking in Firestore to track that a WhatsApp confirmation was dispatched.
 */
export async function markBookingWhatsAppSent(bookingId: string): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      whatsappNotificationSent: true,
      whatsappNotificationSentAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Error marking booking WhatsApp sent:', e);
  }
}
