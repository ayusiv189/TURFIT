import { Linking, Platform, Share } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';

/**
 * Format raw phone number into WhatsApp international format.
 * Defaults to Indian country code (91) for 10-digit inputs.
 */
export function cleanWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

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

  const total = booking.playerShareAmount || booking.totalAmount || 0;
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
    ...(booking.verificationSource === 'MERCHANT_UPI_WEBHOOK'
      ? [`• Verification: Receiver Bank Webhook Auto-Verified ✓`]
      : []),
    ``,
    `📍 *Venue Address:*`,
    address || booking.turfName,
    ...(booking.turfLocationUrl ? [`🗺️ *Directions:* ${booking.turfLocationUrl}`] : []),
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    recipient === 'OWNER'
      ? `⚡ *TruFit Partner Console* • Slot locked in live calendar`
      : `📌 *Please present this pass or Booking Ref #${refCode} upon arrival at the turf.*\n⚡ Have a great match! Powered by TruFit Sports`,
  ];

  return lines.join('\n');
}

/**
 * Open WhatsApp with pre-filled booking confirmation message.
 */
export async function openWhatsAppNotification(
  booking: Booking,
  targetPhone?: string,
  recipient: 'PLAYER' | 'OWNER' = 'PLAYER'
): Promise<boolean> {
  const phoneToUse = targetPhone || (recipient === 'PLAYER' ? booking.playerPhone : '');
  const cleanedPhone = cleanWhatsAppPhone(phoneToUse);
  const message = generateWhatsAppBookingMessage(booking, recipient);
  const encodedText = encodeURIComponent(message);

  // Preferred deep links depending on presence of target phone
  const whatsappAppUrl = cleanedPhone
    ? `whatsapp://send?phone=${cleanedPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  const webUrl = cleanedPhone
    ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappAppUrl);
    if (canOpen) {
      await Linking.openURL(whatsappAppUrl);
    } else {
      await Linking.openURL(webUrl);
    }

    if (booking.id) {
      markBookingWhatsAppSent(booking.id).catch((err) => {
        console.warn('Silent record of WhatsApp update:', err);
      });
    }

    return true;
  } catch (err) {
    console.warn('Could not launch WhatsApp directly, falling back to Web URL:', err);
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch (fallbackErr) {
      console.error('All WhatsApp link attempts failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Share WhatsApp Booking Confirmation via native share sheet.
 */
export async function shareWhatsAppTicket(
  booking: Booking,
  recipient: 'PLAYER' | 'OWNER' = 'PLAYER'
): Promise<boolean> {
  const message = generateWhatsAppBookingMessage(booking, recipient);
  try {
    const result = await Share.share({
      title: `TruFit Booking Pass - ${booking.turfName}`,
      message,
    });
    return result.action === Share.sharedAction;
  } catch (e) {
    console.warn('Share error:', e);
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
