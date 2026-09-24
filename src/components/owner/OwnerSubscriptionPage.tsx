import React, { useState, useEffect } from 'react';
import { OwnerSubscriptionPlan, OwnerSubscriptionStatus, DEFAULT_OWNER_PLANS } from '../../types';
import {
  getOwnerSubscriptionPlans,
  getOwnerSubscriptionStatus,
  subscribeOwnerToPlan,
  getVerificationBadgeConfig,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  Zap,
  Check,
  ArrowRight,
  RefreshCw,
  Award,
  ChevronLeft,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface OwnerSubscriptionPageProps {
  onBackToDashboard?: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const OwnerSubscriptionPage: React.FC<OwnerSubscriptionPageProps> = ({
  onBackToDashboard,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<OwnerSubscriptionPlan[]>([]);
  const [status, setStatus] = useState<OwnerSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<OwnerSubscriptionPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedPlans, currentStatus] = await Promise.all([
        getOwnerSubscriptionPlans(false),
        user ? getOwnerSubscriptionStatus(user.uid) : Promise.resolve(null),
      ]);
      const activePlans = fetchedPlans && fetchedPlans.length > 0 ? fetchedPlans : DEFAULT_OWNER_PLANS;
      setPlans(activePlans);
      setStatus(currentStatus);
      const popular = activePlans.find((p) => p.popular) || activePlans[0];
      setSelectedPlan(popular || null);
    } catch (err) {
      console.error('Error loading owner subscription page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubscribe = async (plan: OwnerSubscriptionPlan) => {
    if (!user) {
      alert('Please log in as an arena / turf owner.');
      return;
    }

    setSubscribing(true);
    try {
      const paymentTxnId = `TXN_OWNER_${Date.now()}`;
      await subscribeOwnerToPlan({
        ownerId: user.uid,
        ownerName: profile?.displayName || user.displayName || 'Turf Owner',
        ownerEmail: user.email || '',
        planId: plan.id,
        planName: plan.name,
        amountPaid: plan.price,
        paymentTxnId,
        durationDays: plan.durationDays,
      });

      setSuccessModal(true);
      if (showToast) showToast(`Successfully upgraded to ${plan.name}!`, 'success');
      loadData();
    } catch (err: any) {
      console.error('Failed to subscribe:', err);
      if (showToast) showToast(err?.message || 'Subscription failed', 'error');
      else alert(err?.message || 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </span>
            <span className="text-sm font-black text-white tracking-tight">TruFit Turf Owner SaaS</span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Trial Status or Subscription Banner */}
        {status && (
          <div
            className={`rounded-3xl p-6 border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              status.status === 'TRIAL_ACTIVE'
                ? 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border-indigo-500/30'
                : status.status === 'TRIAL_EXPIRED'
                ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/70 border-rose-500/40'
                : status.status === 'ACTIVE'
                ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-emerald-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    status.status === 'TRIAL_ACTIVE'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : status.status === 'TRIAL_EXPIRED'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {status.status === 'TRIAL_ACTIVE' && '✨ 30-Day Free Trial Active'}
                  {status.status === 'TRIAL_EXPIRED' && '⚠️ Free Trial Expired (Read-Only Mode)'}
                  {status.status === 'ACTIVE' && '🛡️ Active SaaS Subscription'}
                  {status.status === 'EXPIRED' && '⚠️ Subscription Expired'}
                </span>

                {status.trialDaysLeft !== undefined && status.status === 'TRIAL_ACTIVE' && (
                  <span className="text-xs font-bold text-amber-400">
                    ({status.trialDaysLeft} days remaining)
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-white">
                {status.status === 'TRIAL_ACTIVE' && 'Enjoy full access to court creation, slot management, and WhatsApp passes!'}
                {status.status === 'TRIAL_EXPIRED' && 'Your 30-day trial has ended. Existing slots & data remain safe in Read-Only mode.'}
                {status.status === 'ACTIVE' && `Plan: ${status.planName} • Valid until ${new Date(status.expiryDate).toLocaleDateString()}`}
              </h2>

              <p className="text-xs text-slate-300">
                {status.status === 'TRIAL_EXPIRED'
                  ? 'Upgrade to any SaaS plan below to immediately re-enable court editing, creating new slot batches, sending WhatsApp passes, and launching tournaments.'
                  : 'SaaS plans guarantee automated bookings, zero double-booking locks, and seamless automated owner payouts.'}
              </p>
            </div>

            {status.status === 'TRIAL_EXPIRED' && (
              <a
                href="#pricing-plans"
                className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-rose-950/40 shrink-0"
              >
                Upgrade Now to Unlock Writes
              </a>
            )}
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powering India's Leading Sports Arenas & Turf Operators</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Simple, Transparent Plans for Every Turf Venue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Automate time slots, manage court maintenance, accept UPI bookings with zero downtime, and build an authentic athlete following.
          </p>
        </div>

        {/* Plans Grid */}
        <div id="pricing-plans" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-7 border flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-2xl shadow-amber-950/30'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase px-3.5 py-1 rounded-full shadow-lg shadow-amber-950/50 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Recommended For Growing Arenas
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {plan.billingPeriod} • {plan.durationDays} Days
                    </span>
                    {plan.badgeIncluded && (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" /> Verified Badge Included
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-black text-amber-400">₹{plan.price}</span>
                      {plan.originalPrice && plan.originalPrice > plan.price && (
                        <span className="text-sm text-slate-500 line-through font-bold">₹{plan.originalPrice}</span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">/{plan.billingPeriod.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Courts Supported:</span>
                      <span className="font-bold text-white">{plan.entitlements?.maxCourts || 'Unlimited'} Courts</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Commission Rate:</span>
                      <span className="font-bold text-emerald-400">{plan.entitlements?.commissionPercent || 0}% Platform Fee</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>WhatsApp Pass Generation:</span>
                      <span className={plan.entitlements?.whatsappNotifications ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {plan.entitlements?.whatsappNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 pt-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={subscribing}
                    onClick={() => handleSubscribe(plan)}
                    className={`w-full py-3 rounded-2xl text-xs font-black shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      plan.popular
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-950/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {subscribing && selectedPlan?.id === plan.id ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>Activate {plan.name}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-black text-white">Compare Plan Capabilities</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Free Trial (30d)</th>
                  <th className="py-3 px-4">Starter Plan</th>
                  <th className="py-3 px-4">Pro Plan</th>
                  <th className="py-3 px-4">Enterprise Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-bold text-white">Court & Arena Creation</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Included (30d)</td>
                  <td className="py-3 px-4">Up to 2 Courts</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">Up to 6 Courts</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-white">Slot Generator & Bulk Pricing</td>
                  <td className="py-3 px-4 text-emerald-400">Included (30d)</td>
                  <td className="py-3 px-4 text-emerald-400">Included</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-white">WhatsApp Digital Pass QR</td>
                  <td className="py-3 px-4 text-slate-500">Limited</td>
                  <td className="py-3 px-4 text-slate-500">Basic</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Automated Instant</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Custom Brand Passes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-white">Verified Venue Gold Seal</td>
                  <td className="py-3 px-4 text-slate-500">Optional Add-on</td>
                  <td className="py-3 px-4 text-slate-500">Optional Add-on</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Included Free</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Included Free</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-white">Custom Tournaments Hosting</td>
                  <td className="py-3 px-4 text-slate-500">1 Cup</td>
                  <td className="py-3 px-4 text-slate-500">2 Cups/yr</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Unlimited Cups</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Unlimited + Sponsor Hub</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">SaaS Plan Activated!</h3>
            <p className="text-xs text-slate-300">
              Your write permissions, court editing capabilities, and WhatsApp automated booking passes are immediately enabled.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(false);
                  if (onBackToDashboard) onBackToDashboard();
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl shadow-xl shadow-emerald-950/40"
              >
                Return to Owner Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
