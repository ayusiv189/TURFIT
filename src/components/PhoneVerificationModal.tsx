import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  Lock,
  ArrowRight,
  RefreshCw,
  Zap,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { sendRealSmsOtp, verifyRealSmsOtp } from '../lib/smsService';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  phoneNumber: string;
  onVerifySuccess: (verifiedPhone: string) => void;
  onClose: () => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  phoneNumber,
  onVerifySuccess,
  onClose,
}) => {
  const [phone, setPhone] = useState<string>(phoneNumber || '');
  const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_INPUT'>('PHONE_INPUT');
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [smsResult, setSmsResult] = useState<{
    provider: 'firebase' | 'gateway';
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    }
  }, [timer]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendRealSmsOtp(cleanPhone);
      if (res.success) {
        setSmsResult({ provider: res.provider, message: res.message });
        setStep('OTP_INPUT');
        setTimer(60);
        setInfoMsg(res.message || 'Verification code sent successfully.');
      } else {
        setErrorMsg(res.error || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while sending SMS.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (otp.length < 4) {
      setErrorMsg('Please enter the complete OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyRealSmsOtp(phone, otp);
      if (res.success) {
        setInfoMsg('Phone number verified successfully!');
        setTimeout(() => {
          onVerifySuccess(phone);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Incorrect verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live SMS Phone Verification</h3>
              <p className="text-[11px] text-slate-400">Secure dual-gateway failover protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-950/45 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="bg-emerald-950/45 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 'PHONE_INPUT' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Verify your identity on TurFit using your personal 10-digit mobile number.
                The system routes requests through Firebase Identity Platform, with instant fallback to premium SMS gateways.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Mobile Number (India)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || phone.length !== 10}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Triggering Gateways...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Secure OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">Enter code sent to</span>
                <span className="font-mono text-sm font-extrabold text-indigo-400">+91 {phone}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Enter SMS Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 4 or 6 digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center bg-slate-950 border border-slate-800 rounded-xl py-3 text-lg font-bold text-white tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-700 placeholder:text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {smsResult && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>
                    Active Route: <strong className="text-slate-200 capitalize">{smsResult.provider} Network</strong>.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 4}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{loading ? 'Authenticating...' : 'Confirm & Link Account'}</span>
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => setStep('PHONE_INPUT')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Change Number
                </button>
                {timer > 0 ? (
                  <span className="text-slate-500 font-mono">Resend in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Gateway Info */}
        <div className="px-6 py-3 border-t border-slate-800/60 bg-slate-950/40 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>End-to-End Encrypted</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Dual Gate Sync</span>
          </span>
        </div>
      </div>
    </div>
  );
};
