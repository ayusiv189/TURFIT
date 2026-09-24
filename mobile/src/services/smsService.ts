/**
 * Real-time Firebase Authentication & SMS Phone Verification Service
 * Uses Firebase Identity Platform (10,000 Free Monthly Verifications)
 * with live SMS Gateway fallback (Fast2SMS / 2Factor).
 *
 * All test numbers and demo code bypasses are strictly disabled for production.
 */

export interface SendSmsResult {
  success: boolean;
  sessionId?: string;
  provider: 'firebase' | 'gateway';
  message?: string;
  error?: string;
}

export interface VerifySmsResult {
  success: boolean;
  provider?: 'firebase' | 'gateway';
  error?: string;
}

interface VerificationSession {
  phoneNumber: string;
  provider: 'firebase' | 'gateway';
  sessionInfo?: string;
  localOtp?: string;
  expiresAt: number;
  attempts: number;
}

const activeSessions: Map<string, VerificationSession> = new Map();

const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBD6sRLGsIZN1l0MEtNtXFbOyB1PGmeM1g';

/**
 * Send real-time SMS verification code to the given Indian mobile number.
 */
export async function sendRealSmsOtp(rawPhone: string): Promise<SendSmsResult> {
  const cleanNumber = rawPhone.replace(/[^0-9]/g, '');
  const phone10 = cleanNumber.slice(-10);

  if (phone10.length !== 10) {
    return {
      success: false,
      provider: 'firebase',
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  const fullPhoneNumber = `+91${phone10}`;
  const fast2SmsKey = process.env.EXPO_PUBLIC_FAST2SMS_API_KEY;
  const twoFactorKey = process.env.EXPO_PUBLIC_2FACTOR_API_KEY;
  const customSmsEndpoint = process.env.EXPO_PUBLIC_SMS_GATEWAY_URL;

  // 1. Primary: Firebase Authentication (Identity Platform 10,000 Free Verifications)
  try {
    const fbResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
        }),
      }
    );

    const fbData: any = await fbResponse.json();

    if (fbResponse.ok && fbData.sessionInfo) {
      activeSessions.set(phone10, {
        phoneNumber: fullPhoneNumber,
        provider: 'firebase',
        sessionInfo: fbData.sessionInfo,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10-minute expiry
        attempts: 0,
      });

      return {
        success: true,
        sessionId: fbData.sessionInfo,
        provider: 'firebase',
        message: `Official Firebase SMS OTP dispatched to ${fullPhoneNumber}`,
      };
    }

    // If Firebase returns an error (such as CAPTCHA required or phone auth disabled), check error
    console.warn('[Firebase Auth Phone] sendVerificationCode notice:', fbData.error?.message);
  } catch (err: any) {
    console.warn('[Firebase Auth Phone] Network error contacting Firebase:', err);
  }

  // 2. Secondary Live SMS Gateway: 2Factor.in
  const generated6DigitOtp = Math.floor(100000 + Math.random() * 900000).toString();

  if (twoFactorKey) {
    try {
      const response = await fetch(
        `https://2factor.in/v1/API/${twoFactorKey}/SMS/${fullPhoneNumber}/${generated6DigitOtp}/TurfIt+OTP`,
        { method: 'GET' }
      );
      const data: any = await response.json();
      if (data.Status === 'Success') {
        activeSessions.set(phone10, {
          phoneNumber: fullPhoneNumber,
          provider: 'gateway',
          localOtp: generated6DigitOtp,
          sessionInfo: data.Details,
          expiresAt: Date.now() + 5 * 60 * 1000,
          attempts: 0,
        });

        return {
          success: true,
          sessionId: data.Details,
          provider: 'gateway',
          message: `Real SMS OTP dispatched via SMS Gateway to ${fullPhoneNumber}`,
        };
      }
    } catch (gatewayErr) {
      console.warn('[2Factor Gateway] Failed to dispatch SMS:', gatewayErr);
    }
  }

  // 3. Secondary Live SMS Gateway: Fast2SMS
  if (fast2SmsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: generated6DigitOtp,
          route: 'otp',
          numbers: phone10,
        }),
      });
      const data: any = await response.json();
      if (data.return === true) {
        activeSessions.set(phone10, {
          phoneNumber: fullPhoneNumber,
          provider: 'gateway',
          localOtp: generated6DigitOtp,
          sessionInfo: data.request_id,
          expiresAt: Date.now() + 5 * 60 * 1000,
          attempts: 0,
        });

        return {
          success: true,
          sessionId: data.request_id,
          provider: 'gateway',
          message: `Real SMS OTP dispatched via Fast2SMS to ${fullPhoneNumber}`,
        };
      }
    } catch (fastErr) {
      console.warn('[Fast2SMS Gateway] Failed to dispatch SMS:', fastErr);
    }
  }

  // 4. Custom SMS Gateway Endpoint
  if (customSmsEndpoint) {
    try {
      const response = await fetch(customSmsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          otp: generated6DigitOtp,
        }),
      });
      const data: any = await response.json();
      if (data.success) {
        activeSessions.set(phone10, {
          phoneNumber: fullPhoneNumber,
          provider: 'gateway',
          localOtp: generated6DigitOtp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          attempts: 0,
        });

        return {
          success: true,
          provider: 'gateway',
          message: `Real SMS OTP sent to ${fullPhoneNumber}`,
        };
      }
    } catch (customErr) {
      console.warn('[Custom Gateway] Failed to dispatch SMS:', customErr);
    }
  }

  // If no SMS gateway or Firebase configuration succeeded
  return {
    success: false,
    provider: 'firebase',
    error:
      'Unable to send SMS code. Please check that Phone Authentication is enabled in Firebase Console or configure your SMS API key.',
  };
}

/**
 * Verify real-time SMS OTP with Firebase Authentication or live Gateway.
 * Test bypasses (1234, 7492, etc.) are NOT permitted.
 */
export async function verifyRealSmsOtp(
  rawPhone: string,
  enteredOtp: string,
  sessionId?: string
): Promise<VerifySmsResult> {
  const phone10 = rawPhone.replace(/[^0-9]/g, '').slice(-10);
  const cleanOtp = enteredOtp.trim();

  if (!cleanOtp || cleanOtp.length < 4) {
    return {
      success: false,
      error: 'Please enter the complete SMS verification code.',
    };
  }

  const session = activeSessions.get(phone10);

  // 1. If active Firebase session exists, verify directly with Firebase Auth
  const currentSessionInfo = sessionId || session?.sessionInfo;
  if (session?.provider === 'firebase' && currentSessionInfo) {
    try {
      const fbResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionInfo: currentSessionInfo,
            code: cleanOtp,
          }),
        }
      );

      const fbData: any = await fbResponse.json();

      if (fbResponse.ok && fbData.idToken) {
        activeSessions.delete(phone10);
        return {
          success: true,
          provider: 'firebase',
        };
      }

      const fbError = fbData.error?.message;
      if (fbError === 'INVALID_CODE') {
        return {
          success: false,
          error: 'Incorrect SMS OTP code. Please check the SMS and re-enter.',
        };
      } else if (fbError === 'SESSION_EXPIRED') {
        activeSessions.delete(phone10);
        return {
          success: false,
          error: 'Verification session expired. Please tap "Resend OTP".',
        };
      } else {
        return {
          success: false,
          error: fbError || 'Invalid verification code. Please try again.',
        };
      }
    } catch (err: any) {
      console.warn('[Firebase Auth] Verification error:', err);
    }
  }

  // 2. Gateway session validation
  if (!session) {
    return {
      success: false,
      error: 'Verification session expired. Please tap "Resend OTP".',
    };
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(phone10);
    return {
      success: false,
      error: 'This OTP has expired. Please request a new code.',
    };
  }

  session.attempts += 1;
  if (session.attempts > 5) {
    activeSessions.delete(phone10);
    return {
      success: false,
      error: 'Too many incorrect attempts. Please request a new code.',
    };
  }

  if (session.localOtp && session.localOtp !== cleanOtp) {
    return {
      success: false,
      error: 'Incorrect OTP code. Please enter the code sent to your phone.',
    };
  }

  activeSessions.delete(phone10);
  return {
    success: true,
    provider: session.provider,
  };
}
