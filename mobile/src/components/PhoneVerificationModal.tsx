import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { sendRealSmsOtp, verifyRealSmsOtp } from '../services/smsService';

export interface PhoneVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = 'One-Time Mobile Verification',
  subtitle = 'Turf owners and squad members need to reach you regarding court access and match timing.',
  actionLabel = 'Verify & Continue',
}) => {
  const { profile, updateUserProfile } = useAuth();

  // Step 1: 'PHONE_INPUT' | Step 2: 'OTP_VERIFY' | Step 3: 'SUCCESS'
  const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_VERIFY' | 'SUCCESS'>('PHONE_INPUT');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const timerRef = useRef<any>(null);

  // Initialize phone number from existing profile if available
  useEffect(() => {
    if (visible) {
      setStep('PHONE_INPUT');
      setOtpInput('');
      setErrorMessage('');
      setLoading(false);
      setResendCountdown(30);

      const existingPhone = profile?.phoneNumber?.replace('+91', '').trim() || '';
      if (existingPhone.length >= 10) {
        setPhoneInput(existingPhone.slice(-10));
      } else {
        setPhoneInput('');
      }
    }
  }, [visible, profile?.phoneNumber]);

  // Handle Resend Countdown
  useEffect(() => {
    if (step === 'OTP_VERIFY' && resendCountdown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, resendCountdown]);

  // Clean phone input (only digits, max 10)
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneInput(cleaned);
    if (errorMessage) setErrorMessage('');
  };

  // Clean OTP input (only digits, max 6)
  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpInput(cleaned);
    if (errorMessage) setErrorMessage('');
  };

  // Step 1: Send Real-Time SMS / Firebase OTP
  const handleSendOtp = async () => {
    if (phoneInput.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!['6', '7', '8', '9'].includes(phoneInput[0])) {
      setErrorMessage('Mobile number should start with 6, 7, 8, or 9.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await sendRealSmsOtp(phoneInput);
      setLoading(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to dispatch SMS. Please try again.');
        return;
      }

      setSessionId(result.sessionId || '');
      setStep('OTP_VERIFY');
      setResendCountdown(30);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Failed to send verification SMS.');
    }
  };

  // Step 2: Verify Real-Time SMS / Firebase OTP
  const handleVerifyOtp = async (overrideOtp?: string) => {
    const codeToCheck = overrideOtp || otpInput.trim();

    if (!codeToCheck || codeToCheck.length < 4) {
      setErrorMessage('Please enter the SMS verification code received.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Validate with the real-time Firebase Auth / SMS verification engine
      const verifyResult = await verifyRealSmsOtp(phoneInput, codeToCheck, sessionId);

      if (!verifyResult.success) {
        setLoading(false);
        setErrorMessage(verifyResult.error || 'Invalid OTP code. Please try again.');
        return;
      }

      const fullPhoneNumber = `+91${phoneInput}`;
      const now = new Date().toISOString();

      // Persist verified phone to user's profile in Firestore
      await updateUserProfile({
        phoneNumber: fullPhoneNumber,
        isPhoneVerified: true,
        phoneVerifiedAt: now,
        phoneVerificationProvider: 'firebase_sms',
      });

      setStep('SUCCESS');
      setLoading(false);

      // Automatically complete and call onSuccess after brief visual confirmation
      setTimeout(() => {
        onSuccess(fullPhoneNumber);
        onClose();
      }, 1200);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Failed to update verified phone profile.');
    }
  };

  // Resend OTP via SMS
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const result = await sendRealSmsOtp(phoneInput);
      setLoading(false);
      if (result.success) {
        if (result.sessionId) setSessionId(result.sessionId);
        setResendCountdown(30);
        setErrorMessage('');
        Alert.alert('OTP Sent 📲', `A new verification code has been dispatched via SMS to +91 ${phoneInput}.`);
      } else {
        setErrorMessage(result.error || 'Failed to resend SMS.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Failed to resend SMS.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconCircle}>
                  <ShieldCheck size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.headerBadge}>VERIFIED PLAYER IDENTITY</Text>
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              {/* ================= STEP 1: ENTER PHONE NUMBER ================= */}
              {step === 'PHONE_INPUT' && (
                <>
                  <Text style={styles.subtitle}>{subtitle}</Text>

                  {/* Why Phone Verification Card */}
                  <View style={styles.benefitsCard}>
                    <View style={styles.benefitRow}>
                      <Lock size={14} color="#38bdf8" style={styles.benefitIcon} />
                      <Text style={styles.benefitText}>
                        Guarantees your slot & eliminates ghost reservations.
                      </Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <MessageSquare size={14} color="#10b981" style={styles.benefitIcon} />
                      <Text style={styles.benefitText}>
                        Receive instant WhatsApp booking tickets & gate passes.
                      </Text>
                    </View>
                    <View style={styles.benefitRow}>
                      <Sparkles size={14} color="#f59e0b" style={styles.benefitIcon} />
                      <Text style={styles.benefitText}>
                        One-time only. You will never be asked to verify again.
                      </Text>
                    </View>
                  </View>

                  {/* Input Row */}
                  <Text style={styles.inputLabel}>Enter Mobile Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.countryFlag}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>

                    <TextInput
                      style={styles.phoneInput}
                      placeholder="98765 43210"
                      placeholderTextColor="#64748b"
                      keyboardType="number-pad"
                      value={phoneInput}
                      onChangeText={handlePhoneChange}
                      maxLength={10}
                      autoFocus={false}
                    />
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorRow}>
                      <AlertCircle size={13} color="#f43f5e" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      (phoneInput.length !== 10 || loading) && styles.btnDisabled,
                    ]}
                    disabled={phoneInput.length !== 10 || loading}
                    onPress={handleSendOtp}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#064e3b" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Get Firebase SMS OTP</Text>
                        <ArrowRight size={16} color="#064e3b" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* ================= STEP 2: VERIFY OTP ================= */}
              {step === 'OTP_VERIFY' && (
                <>
                  <Text style={styles.subtitle}>
                    Enter the SMS verification code sent to{' '}
                    <Text style={{ fontWeight: '800', color: '#ffffff' }}>
                      +91 {phoneInput}
                    </Text>
                  </Text>

                  <View style={styles.realSmsSentBadge}>
                    <MessageSquare size={14} color="#10b981" />
                    <Text style={styles.realSmsSentText}>
                      SMS verification code dispatched. Please check your Messages inbox.
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Enter SMS Verification Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    value={otpInput}
                    onChangeText={handleOtpChange}
                    maxLength={6}
                    autoFocus={true}
                  />

                  {errorMessage ? (
                    <View style={styles.errorRow}>
                      <AlertCircle size={13} color="#f43f5e" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {/* Verify Action */}
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      (otpInput.length < 4 || loading) && styles.btnDisabled,
                    ]}
                    disabled={otpInput.length < 4 || loading}
                    onPress={() => handleVerifyOtp()}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#064e3b" />
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#064e3b" />
                        <Text style={styles.primaryBtnText}>{actionLabel}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Resend & Change Number Row */}
                  <View style={styles.secondaryActionsRow}>
                    <TouchableOpacity
                      disabled={resendCountdown > 0}
                      onPress={handleResendOtp}
                      style={{ opacity: resendCountdown > 0 ? 0.6 : 1 }}
                    >
                      <Text style={styles.resendText}>
                        {resendCountdown > 0
                          ? `Resend OTP in ${resendCountdown}s`
                          : 'Resend OTP Code'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setStep('PHONE_INPUT')}>
                      <Text style={styles.changePhoneText}>Edit Number</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ================= STEP 3: SUCCESS CONFIRMATION ================= */}
              {step === 'SUCCESS' && (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 size={56} color="#10b981" />
                  </View>
                  <Text style={styles.successTitle}>Mobile Verified! 🎉</Text>
                  <Text style={styles.successSubtitle}>
                    +91 {phoneInput} is now permanently attached to your player profile.
                  </Text>
                  <View style={styles.successBadge}>
                    <ShieldCheck size={13} color="#10b981" />
                    <Text style={styles.successBadgeText}>
                      Verified via Firebase Authentication
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#0c1220',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#182235',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#131b2e',
  },
  body: {
    padding: 16,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 14,
  },
  benefitsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitIcon: {
    flexShrink: 0,
  },
  benefitText: {
    fontSize: 11,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  otpInput: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  realSmsSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  realSmsSentText: {
    flex: 1,
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    lineHeight: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    color: '#f43f5e',
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  resendText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
  },
  changePhoneText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
});
