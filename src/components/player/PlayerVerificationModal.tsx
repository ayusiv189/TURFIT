import React, { useState, useEffect } from 'react';
import { VerificationBadgeConfig, DEFAULT_VERIFICATION_BADGE_CONFIG } from '../../types';
import { getVerificationBadgeConfig, activatePlayerVerificationBadge } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  Zap,
  Star,
  Users,
  Trophy,
  Shield,
  CreditCard,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface PlayerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PlayerVerificationModal: React.FC<PlayerVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<VerificationBadgeConfig>(DEFAULT_VERIFICATION_BADGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'GOLD' | 'PRO'>('GOLD');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getVerificationBadgeConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load verification badge config:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const price = config.playerBadgePrice || 499;

  const handlePurchase = async () => {
    if (!user) {
      alert('Please log in to get verified');
      return;
    }

    setPurchasing(true);
    try {
      // Simulate Razorpay / Instant Activation
      const paymentTxnId = `TRUFIT_BADGE_${Date.now()}`;
      await activatePlayerVerificationBadge({
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'TruFit Athlete',
        userEmail: user.email || '',
        badgeType: selectedTier,
        durationDays: config.playerBadgeDurationDays || 365,
        amountPaid: price,
        paymentTxnId,
        source: 'DIRECT_PURCHASE',
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to activate verification badge:', err);
      alert(err?.message || 'Failed to activate badge');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8">
        {/* Header Ribbon / Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-6 text-slate-950 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-slate-950 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="p-3 bg-slate-950 text-amber-400 rounded-2xl shadow-lg">
              <Award className="w-7 h-7" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-950/20 px-2.5 py-0.5 rounded-full">
                TruFit Official Badge
              </span>
              <h2 className="text-xl font-black tracking-tight">Verified Athlete Identity</h2>
            </div>
          </div>
        </div>

        {showSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Congratulations!</h3>
            <p className="text-xs text-slate-300">
              Your Gold Verified Athlete badge is now active on your TruFit profile, match lobbies, and tournament cards.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Value Proposition */}
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Stand out across India's premier turf network. The TruFit Verified Badge confirms your authentic athlete identity, sportsmanship record, and priority matchmaking privileges.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Gold Profile Tick</div>
                    <div className="text-[11px] text-slate-400">Exclusive badge beside your name everywhere</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Priority Squad Join</div>
                    <div className="text-[11px] text-slate-400">Jump the queue in competitive lobbies</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                  <Trophy className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Official Tournament Entry</div>
                    <div className="text-[11px] text-slate-400">Verified status for corporate & open cups</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Anti-Impersonation</div>
                    <div className="text-[11px] text-slate-400">Protected authentic profile reputation</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Box */}
            <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Annual Verification</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-white">₹{price}</span>
                  <span className="text-xs text-slate-400">/ 365 Days</span>
                  <span className="text-xs text-slate-500 line-through">₹999</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Instant Activation
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-colors"
              >
                Maybe Later
              </button>

              <button
                type="button"
                disabled={purchasing}
                onClick={handlePurchase}
                className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-2xl shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {purchasing ? (
                  <span>Activating Badge...</span>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Get Verified for ₹{price}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
