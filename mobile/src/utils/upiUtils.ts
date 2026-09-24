import { Linking, Platform, Alert } from 'react-native';

export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
  transactionRef?: string;
  currency?: string;
  merchantCode?: string;
}

export type UpiApp = 'GENERIC' | 'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM' | 'CRED';

/**
 * Validates whether a UPI VPA is in standard format (e.g., username@bank)
 */
export function isValidUpiId(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  const clean = vpa.trim();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(clean);
}

/**
 * Calculates payment gateway fees saved with 0% Direct UPI
 * Standard PG fees in India: 2.00% + 18% GST = 2.36%
 */
export function calculatePgSavings(amount: number): {
  feePercent: number;
  traditionalPgFee: number;
  directUpiFee: number;
  savings: number;
} {
  const feePercent = 2.36; // 2% + 18% GST
  const traditionalPgFee = Math.round((amount * (feePercent / 100)) * 100) / 100;
  return {
    feePercent,
    traditionalPgFee,
    directUpiFee: 0,
    savings: traditionalPgFee,
  };
}

/**
 * Builds the official NPCI standard UPI URI
 * Spec: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}&tr={ref}
 */
export function buildUpiUri(params: UpiPaymentParams, app: UpiApp = 'GENERIC'): string {
  const vpa = encodeURIComponent(params.upiId.trim());
  // Sanitize payee name to alphanumeric & spaces for strict banking gateway acceptance
  const cleanName = (params.payeeName || 'Turf Owner')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 50);
  const name = encodeURIComponent(cleanName);
  const amount = params.amount.toFixed(2);
  const currency = params.currency || 'INR';
  const note = encodeURIComponent(
    (params.transactionNote || 'Turf Booking Payment').replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)
  );
  const ref = encodeURIComponent(
    params.transactionRef || `TRU${Date.now().toString().slice(-8)}`
  );

  let query = `pa=${vpa}&pn=${name}&am=${amount}&cu=${currency}&tn=${note}&tr=${ref}`;
  if (params.merchantCode) {
    query += `&mc=${encodeURIComponent(params.merchantCode)}`;
  }

  switch (app) {
    case 'GPAY':
      // Google Pay UPI scheme
      return `tez://upi/pay?${query}`;
    case 'PHONEPE':
      // PhonePe UPI scheme
      return `phonepe://pay?${query}`;
    case 'PAYTM':
      // Paytm UPI scheme
      return `paytmmp://pay?${query}`;
    case 'BHIM':
      // BHIM UPI scheme
      return `bhim://pay?${query}`;
    case 'CRED':
      // CRED UPI scheme
      return `cred://pay?${query}`;
    case 'GENERIC':
    default:
      // Standard NPCI generic UPI intent (triggers OS chooser on Android/iOS)
      return `upi://pay?${query}`;
  }
}

/**
 * Generates dynamic high-resolution QR code URL for any UPI URI string
 */
export function generateUpiQrCodeUrl(upiUri: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&format=png&data=${encodeURIComponent(
    upiUri
  )}`;
}

/**
 * Attempts to launch a UPI app or generic intent
 */
export async function launchUpiPayment(
  params: UpiPaymentParams,
  app: UpiApp = 'GENERIC'
): Promise<{ success: boolean; url: string; error?: string }> {
  const specificUrl = buildUpiUri(params, app);
  const genericUrl = buildUpiUri(params, 'GENERIC');

  try {
    if (Platform.OS === 'web') {
      // In web browser / web simulator
      const win = (globalThis as any).window;
      if (win && win.location) {
        // Try opening intent or protocol
        win.location.href = specificUrl;
      }
      return { success: true, url: specificUrl };
    }

    // On native Android or iOS
    const canOpen = await Linking.canOpenURL(specificUrl);
    if (canOpen) {
      await Linking.openURL(specificUrl);
      return { success: true, url: specificUrl };
    }

    // Fallback to generic upi://
    const canOpenGeneric = await Linking.canOpenURL(genericUrl);
    if (canOpenGeneric) {
      await Linking.openURL(genericUrl);
      return { success: true, url: genericUrl };
    }

    return {
      success: false,
      url: specificUrl,
      error: `No app installed to handle ${app === 'GENERIC' ? 'UPI' : app}. Please scan the QR code or copy the UPI ID.`,
    };
  } catch (err: any) {
    console.warn('Error launching UPI intent:', err);
    return {
      success: false,
      url: specificUrl,
      error: err?.message || 'Failed to open UPI app.',
    };
  }
}
