import { Linking, Alert } from 'react-native';

export interface BookingAlertData {
  bookingId?: string;
  turfName: string;
  arenaName?: string;
  playerName: string;
  playerPhone?: string;
  date: string;
  timeSlot: string; // e.g. "06:00 PM - 07:00 PM"
  totalPrice: number;
  advancePaid?: number;
  balanceDue?: number;
  paymentMode?: string;
  googleMapsUrl?: string;
  ownerPhone?: string;
}

/**
 * Builds standard WhatsApp booking confirmation alert message
 */
export function buildBookingWhatsAppMessage(data: BookingAlertData, targetRole: 'OWNER' | 'PLAYER' = 'OWNER'): string {
  const isOwner = targetRole === 'OWNER';
  const balance = (data.balanceDue ?? 0) > 0 ? `₹${data.balanceDue}` : 'None (Fully Paid)';
  const advance = (data.advancePaid ?? 0) > 0 ? `₹${data.advancePaid}` : '₹0';
  const mapsLink = data.googleMapsUrl ? `\n📍 *Map Location:* ${data.googleMapsUrl}` : '';

  if (isOwner) {
    return (
      `🏟️ *NEW BOOKING ALERT - ${data.turfName.toUpperCase()}*\n\n` +
      `👤 *Athlete:* ${data.playerName || 'Customer'}\n` +
      `📞 *Phone:* ${data.playerPhone || 'Not provided'}\n` +
      `📅 *Date:* ${data.date}\n` +
      `⏰ *Slot:* ${data.timeSlot}\n` +
      `🎾 *Pitch / Arena:* ${data.arenaName || 'Main Turf'}\n` +
      `💰 *Total Amount:* ₹${data.totalPrice}\n` +
      `💵 *Advance Received:* ${advance}\n` +
      `⚖️ *Due at Counter:* ${balance}\n` +
      `💳 *Mode:* ${data.paymentMode || 'Online / Advance'}\n` +
      `🔖 *Booking ID:* #${(data.bookingId || '').slice(-6).toUpperCase() || 'TRUFIT'}\n` +
      `${mapsLink}\n\n` +
      `_Powered by TruFit Sports Hub_`
    );
  }

  return (
    `✅ *BOOKING CONFIRMED - ${data.turfName.toUpperCase()}*\n\n` +
    `Hello ${data.playerName || 'Player'},\n` +
    `Your sports slot reservation is confirmed!\n\n` +
    `🏟️ *Venue:* ${data.turfName}\n` +
    `🎾 *Pitch / Court:* ${data.arenaName || 'Main Pitch'}\n` +
    `📅 *Date:* ${data.date}\n` +
    `⏰ *Time:* ${data.timeSlot}\n` +
    `💰 *Total Booking Value:* ₹${data.totalPrice}\n` +
    `💵 *Advance Paid:* ${advance}\n` +
    `⚖️ *Balance to Pay at Desk:* ${balance}\n` +
    `🔖 *Pass Code:* #${(data.bookingId || '').slice(-6).toUpperCase() || 'TRUFIT'}\n` +
    `${mapsLink}\n\n` +
    `_Please arrive 10 minutes prior with appropriate non-marking shoes / turf studs. Have a great match!_`
  );
}

/**
 * Opens WhatsApp with pre-filled booking confirmation message
 */
export async function sendWhatsAppBookingAlert(
  data: BookingAlertData,
  recipientPhone?: string,
  targetRole: 'OWNER' | 'PLAYER' = 'OWNER'
): Promise<boolean> {
  const message = buildBookingWhatsAppMessage(data, targetRole);
  const encodedMsg = encodeURIComponent(message);

  let phone = recipientPhone || (targetRole === 'OWNER' ? data.ownerPhone : data.playerPhone) || '';
  phone = phone.replace(/[^0-9]/g, '');
  if (phone.length === 10) {
    phone = '91' + phone; // default to India country code
  }

  const url = phone ? `https://wa.me/${phone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // Fallback open via browser web
      await Linking.openURL(`https://api.whatsapp.com/send?text=${encodedMsg}`);
      return true;
    }
  } catch (err) {
    console.warn('Error opening WhatsApp booking alert:', err);
    Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please check if WhatsApp is installed on this device.');
    return false;
  }
}

