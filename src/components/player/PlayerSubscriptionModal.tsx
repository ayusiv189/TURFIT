import React, { useState, useEffect } from 'react';
import {
  PlayerSubscriptionPlan,
  DEFAULT_PLAYER_SUBSCRIPTION_PLANS,
} from '../../types';
import {
  getPlayerSubscriptionPlans,
  activatePlayerSubscription,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  Star,
  ShieldCheck,
  Check,
  IndianRupee,
  ArrowRight,
} from 'lucide-react';

interface PlayerSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PlayerSubscriptionModal: React.FC<PlayerSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<PlayerSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlayerSubscriptionPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const allPlans = await getPlayerSubscriptionPlans(false);
      const activePlans = allPlans && allPlans.length > 0 ? allPlans : DEFAULT_PLAYER_SUBSCRIPTION_PLANS;
      setPlans(activePlans);
      const defaultSelected = activePlans.find((p) => p.popular) || activePlans[0];
      setSelectedPlan(defaultSelected || null);
    } catch (err) {
      console.error('Error loading player plans:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!user) {
      alert('Please log in to upgrade to TruFit Pro');
      return;
    }
    if (!selectedPlan) return;

    setSubscribing(true);
    try {
      const paymentTxnId = `TRUFIT_PLAYER_PRO_${Date.now()}`;
      await activatePlayerSubscription({
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'TruFit Athlete',
        userEmail: user.email || '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        durationDays: selectedPlan.durationDays,
        amountPaid: selectedPlan.price,
        entitlements: selectedPlan.entitlements,
        badgeIncluded: selectedPlan.badgeIncluded,
        paymentTxnId,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error activating subscription:', err);
      alert(err?.message || 'Failed to activate subscription');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-slate-950 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-slate-950 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="p-3 bg-slate-950 text-amber-400 rounded-2xl shadow-lg">
              <Sparkles className="w-7 h-7" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-950/20 px-2.5 py-0.5 rounded-full">
                TruFit Membership
              </span>
              <h2 className="text-xl font-black tracking-tight">Athlete Pro Passes</h2>
            </div>
          </div>
        </div>

        {showSuccess ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Membership Activated!</h3>
            <p className="text-xs text-slate-300">
              Your {selectedPlan?.name} entitlements are now applied automatically across all turf bookings and squad lobbies.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <p className="text-xs text-slate-300">
              Unlock exclusive turf booking discounts, zero cancellation charges, radar analytics, and priority squad matchmaking across India.
            </p>

            {/* Plan selection cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative rounded-2xl p-4 border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-950/30 ring-2 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full">
                        Best Value
                      </span>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white">{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-400">₹{plan.price}</span>
                        <span className="text-[10px] text-slate-400">/{plan.billingPeriod.toLowerCase()}</span>
                      </div>

                      {plan.entitlements?.bookingDiscountPercent ? (
                        <div className="text-[11px] font-bold text-emerald-400">
                          {plan.entitlements.bookingDiscountPercent}% off all slots
                        </div>
                      ) : null}

                      <div className="space-y-1 pt-2">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1">
                            <Check className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/80">
                      <span
                        className={`block text-center text-xs font-black py-1.5 rounded-xl ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Choose'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Details */}
            {selectedPlan && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Full Plan Perks for {selectedPlan.name}:</span>
                  <span className="text-amber-400 font-black">₹{selectedPlan.price} / {selectedPlan.durationDays} Days</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                  {selectedPlan.features.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                disabled={subscribing || !selectedPlan}
                onClick={handleSubscribe}
                className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-2xl shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {subscribing ? (
                  <span>Activating Membership...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Subscribe Now for ₹{selectedPlan?.price}</span>
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
