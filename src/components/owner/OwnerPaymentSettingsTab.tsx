import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Turf, PlanFeatureConfig, DEFAULT_PLAN_FEATURES, OwnerPayoutRequest } from '../../types';
import { calculateStandardBookingFinancials } from '../../lib/utils';
import {
  getOwnerBookings,
  getOwnerPayoutRequests,
  listenOwnerPayoutRequests,
  deleteOwnerTestData,
  updateTurf,
  getEffectiveOwnerPlanFeatures,
  cancelOwnerPayoutRequest,
} from '../../lib/db';
import {
  ShieldCheck,
  DollarSign,
  Landmark,
  Save,
  Info,
  Trash2,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Smartphone,
  Receipt,
  ArrowDownToLine,
  CreditCard,
  Banknote,
  ToggleLeft,
  ToggleRight,
  Lock,
  XCircle,
  History,
  Filter,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { OwnerWithdrawalModal } from './OwnerWithdrawalModal';
import { OwnerPayoutReceiptModal } from './OwnerPayoutReceiptModal';

interface OwnerPaymentSettingsTabProps {
  turfs: Turf[];
  showToast: (text: string, type?: 'success' | 'error') => void;
  onTurfsUpdated?: () => void;
}

export const OwnerPaymentSettingsTab: React.FC<OwnerPaymentSettingsTabProps> = ({
  turfs,
  showToast,
  onTurfsUpdated,
}) => {
  const { user, profile, updateUserProfile } = useAuth();

  // Payout Destination Preferences for receiving settlements from Admin
  const existingPayout = profile?.paymentSettings || {};
  const [payoutUpi, setPayoutUpi] = useState<string>(existingPayout.upiId || '');
  const [payoutBankName, setPayoutBankName] = useState<string>(existingPayout.bankName || '');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState<string>(existingPayout.accountNumber || '');
  const [payoutIfscCode, setPayoutIfscCode] = useState<string>(existingPayout.ifscCode || '');
  const [payoutBeneficiary, setPayoutBeneficiary] = useState<string>(
    existingPayout.beneficiaryName || profile?.businessName || profile?.displayName || ''
  );
  const [savingPayoutPref, setSavingPayoutPref] = useState<boolean>(false);

  // Modals & Selection States
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [selectedReceiptRequest, setSelectedReceiptRequest] = useState<OwnerPayoutRequest | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<OwnerPayoutRequest[]>([]);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(true);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureConfig>(DEFAULT_PLAN_FEATURES);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'REQUESTED' | 'COMPLETED' | 'REJECTED'>('ALL');

  useEffect(() => {
    if (user?.uid) {
      loadWalletData();
      getEffectiveOwnerPlanFeatures(user.uid).then((feats) => {
        if (feats) setPlanFeatures(feats);
      });

      const unsub = listenOwnerPayoutRequests(user.uid, (reqs: any) => {
        setPayoutRequests(reqs);
      });
      return () => unsub();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user?.uid) return;
    try {
      setLoadingWallet(true);
      const ownerBookings = await getOwnerBookings(user.uid);
      setBookings(ownerBookings);
      const requests = await getOwnerPayoutRequests(user.uid);
      setPayoutRequests(requests);
    } catch (err) {
      console.warn('Error loading wallet data:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const isCashMethod = (method?: string, mode?: string) =>
    method === 'CASH' ||
    method === 'PAY_AT_VENUE' ||
    method === 'PAY_LATER_AT_TURF' ||
    method === 'CASH_OR_COUNTER_UPI' ||
    mode === 'PAY_LATER_AT_TURF';

  // Accurate financial split per booking:
  // - Online Revenue: Payments routed through central admin gateway escrow (withdrawable by owner)
  // - Counter Cash: Payments collected directly at turf desk in person (in-hand at venue)
  const financialTotals = bookings.reduce(
    (acc, b) => {
      const split = calculateStandardBookingFinancials(b);
      return {
        onlineRevenue: acc.onlineRevenue + split.onlineRevenue,
        cashRevenue: acc.cashRevenue + split.cashRevenue,
        pendingDue: acc.pendingDue + split.pendingDue,
      };
    },
    { onlineRevenue: 0, cashRevenue: 0, pendingDue: 0 }
  );

  const onlineRevenue = financialTotals.onlineRevenue;
  const cashRevenue = financialTotals.cashRevenue;
  const totalRevenue = onlineRevenue + cashRevenue;

  const pendingPayouts = payoutRequests
    .filter((p) => p.status === 'REQUESTED' || p.status === 'PROCESSING')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const settledPayouts = payoutRequests
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const availableOnlineBalance = Math.max(0, onlineRevenue - pendingPayouts - settledPayouts);

  const [togglingTurfId, setTogglingTurfId] = useState<string | null>(null);

  const handleToggleTurfPayAtVenue = async (turf: Turf) => {
    if (planFeatures.allowPayAtVenue === false) {
      showToast('Pay at Venue (Counter Cash) is disabled on your current subscription plan. Upgrade your plan to enable cash payments.', 'error');
      return;
    }
    const currentAllowed = turf.allowPayAtVenue !== false && turf.allowPayLater !== false;
    const nextAllowed = !currentAllowed;
    try {
      setTogglingTurfId(turf.id);
      await updateTurf(turf.id, {
        allowPayAtVenue: nextAllowed,
        allowPayLater: nextAllowed,
      });
      showToast(
        nextAllowed
          ? `Pay at Venue turned ON for "${turf.name}". Players can choose to pay cash at counter.`
          : `Pay at Venue turned OFF for "${turf.name}". 100% online advance payment is now required.`
      );
      if (onTurfsUpdated) onTurfsUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment option.', 'error');
    } finally {
      setTogglingTurfId(null);
    }
  };

  const handleSavePayoutPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) return;

    setSavingPayoutPref(true);
    try {
      await updateUserProfile({
        paymentSettings: {
          ...(profile?.paymentSettings || {}),
          upiId: payoutUpi.trim() || undefined,
          bankName: payoutBankName.trim() || undefined,
          accountNumber: payoutAccountNumber.trim() || undefined,
          ifscCode: payoutIfscCode.trim().toUpperCase() || undefined,
          beneficiaryName: payoutBeneficiary.trim() || undefined,
          updatedAt: new Date().toISOString(),
        },
      });
      showToast('Admin payout settlement details saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settlement preferences', 'error');
    } finally {
      setSavingPayoutPref(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!user?.uid) return;
    try {
      setCancellingRequestId(requestId);
      await cancelOwnerPayoutRequest(requestId, user.uid);
      showToast('Withdrawal request cancelled successfully. Funds restored to available balance.');
      setSelectedReceiptRequest(null);
      loadWalletData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel withdrawal request.', 'error');
    } finally {
      setCancellingRequestId(null);
    }
  };

  const handleClearTestData = async () => {
    if (!user?.uid) return;
    try {
      await deleteOwnerTestData(user.uid);
      showToast('Test data cleared successfully.');
      loadWalletData();
    } catch (err) {
      showToast('Failed to clear test data.', 'error');
    }
  };

  const filteredPayoutRequests = payoutRequests.filter((req) => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'REQUESTED') return req.status === 'REQUESTED' || req.status === 'PROCESSING';
    if (historyFilter === 'COMPLETED') return req.status === 'COMPLETED';
    if (historyFilter === 'REJECTED') return req.status === 'REJECTED' || req.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Central Escrow Policy Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Central Escrow & Admin Settlement
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Owner Earnings & Payout Wallet
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              All athlete payments for online slot bookings and lobby matches are securely processed through the <strong className="text-white">Central TruFit Admin Gateway</strong>.
              Your earnings accumulate in your wallet and are disbursed directly to your bank account or UPI ID by TruFit Admin.
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-3 bg-slate-950/90 border border-emerald-500/30 p-3.5 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Platform Escrow
              </span>
              <span className="text-xs font-bold text-emerald-400">
                Central Admin Gateway Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown [Online | Cash] & Withdraw Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Revenue Transparency & Withdrawal Balance</span>
            </h3>
            <p className="text-xs text-slate-400">
              Clear segregation between in-person desk cash and online gateway earnings held in platform escrow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            disabled={availableOnlineBalance <= 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer self-start sm:self-auto"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Initiate Formal Withdrawal (₹{availableOnlineBalance.toLocaleString('en-IN')})</span>
          </button>
        </div>

        {/* 4-Stat Mathematical Financial Ledger Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Net Available Balance */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/40 p-5 rounded-2xl relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Available to Withdraw
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono">
              ₹{availableOnlineBalance.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              Ready for immediate payout
            </span>
          </div>

          {/* 2. Total Online Gross */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Online Gateway Gross
            </span>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              ₹{onlineRevenue.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Disbursed: ₹{settledPayouts.toLocaleString('en-IN')} | In-Review: ₹{pendingPayouts.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 3. In-Person Desk Cash */}
          <div className="bg-slate-950 border border-amber-950/60 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute right-3 top-3 text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              In-Hand at Venue
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Direct Counter Cash
            </span>
            <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
              ₹{cashRevenue.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Kept directly by owner (0% escrow)
            </span>
          </div>

          {/* 4. Combined Total Revenue */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Combined Turnover
            </span>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              All {turfs.length} arenas combined
            </span>
          </div>
        </div>
      </div>

      {/* Venue Payment Options: Pay at Venue / Cash Acceptance Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>Venue Payment Acceptance: Pay at Venue (Counter Cash)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Turn <strong className="text-white">Pay at Venue ON</strong> to let athletes pay in cash at the counter, or turn <strong className="text-white">OFF</strong> to mandate 100% online advance prepaid bookings.
            </p>
          </div>
        </div>

        {planFeatures.allowPayAtVenue === false && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <span><strong>Pay at Venue Feature Locked:</strong> Counter cash payments are disabled in your current subscription plan. All player bookings enforce 100% online advance payment.</span>
          </div>
        )}

        {turfs.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 text-center">
            No venues registered yet. Add a turf to manage its payment acceptance policies.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {turfs.map((turf) => {
              const isAllowed = turf.allowPayAtVenue !== false && turf.allowPayLater !== false;
              const isUpdating = togglingTurfId === turf.id;

              return (
                <div
                  key={turf.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                    isAllowed
                      ? 'bg-slate-950 border-emerald-500/30'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <h4 className="text-sm font-bold text-white">{turf.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        {turf.area ? `${turf.area}, ${turf.city}` : turf.city} • ₹{turf.basePrice}/hr
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isAllowed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isAllowed ? 'Pay at Venue ON' : 'Online Only (OFF)'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      {isAllowed
                        ? 'Athletes can choose "Pay at Turf" at checkout'
                        : 'Athletes must pay online via UPI/Card in advance'}
                    </span>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleTurfPayAtVenue(turf)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 ${
                        isAllowed
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      }`}
                    >
                      {isUpdating ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : isAllowed ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                          <span>Turn OFF</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                          <span>Turn ON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payout Destination Account for Admin Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSavePayoutPreferences}
          className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5"
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-400" />
              <span>Admin Settlement Receiving Details</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide your Bank Account or UPI ID where TruFit Admin should deposit your online earning withdrawals.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Account Holder / Beneficiary Name
              </label>
              <input
                type="text"
                value={payoutBeneficiary}
                onChange={(e) => setPayoutBeneficiary(e.target.value)}
                placeholder="e.g. Apex Sports Management LLP"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Payout UPI ID / VPA (For Instant Settlement)
              </label>
              <input
                type="text"
                value={payoutUpi}
                onChange={(e) => setPayoutUpi(e.target.value.toLowerCase().trim())}
                placeholder="e.g. owner@okaxis or 9876543210@paytm"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={payoutBankName}
                  onChange={(e) => setPayoutBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={payoutAccountNumber}
                  onChange={(e) => setPayoutAccountNumber(e.target.value.trim())}
                  placeholder="50100234567890"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={payoutIfscCode}
                  onChange={(e) => setPayoutIfscCode(e.target.value.toUpperCase().trim())}
                  placeholder="HDFC0001234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPayoutPref}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {savingPayoutPref ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settlement Details</span>
              </>
            )}
          </button>
        </form>

        {/* Right Info Box */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>How TruFit Payments Work</span>
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-0.5">1. Central Athlete Checkout</span>
                <p className="text-slate-400 text-[11px]">
                  When athletes book slots or join lobbies, payments route through the Master Admin Payment Gateway.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-0.5">2. Guaranteed Online Balance</span>
                <p className="text-slate-400 text-[11px]">
                  Funds are credited to your owner wallet immediately upon completed booking.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-0.5">3. 24-48hr Admin Settlement</span>
                <p className="text-slate-400 text-[11px]">
                  Withdrawal requests are processed and settled directly to your registered bank or UPI ID with UTR confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center gap-2 text-xs text-indigo-300">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Zero payment gateway setup or maintenance required by turf owners.</span>
          </div>
        </div>
      </div>

      {/* Payout History & Formal Requests List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <span>Withdrawal & Payout History</span>
            </h4>
            <p className="text-xs text-slate-400">
              Audit log of all initiated withdrawal requests, bank UTR clearance, and statement receipts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['ALL', 'REQUESTED', 'COMPLETED', 'REJECTED'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setHistoryFilter(filterKey)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    historyFilter === filterKey
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filterKey === 'ALL' ? 'All' : filterKey === 'REQUESTED' ? 'In Review' : filterKey === 'COMPLETED' ? 'Settled' : 'Rejected'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearTestData}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Test</span>
            </button>
          </div>
        </div>

        {filteredPayoutRequests.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No withdrawal requests match the selected filter.</p>
            {payoutRequests.length === 0 && (
              <p className="text-slate-500 text-[11px]">
                Click <strong className="text-emerald-400">Initiate Formal Withdrawal</strong> above to disburse your online earnings.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayoutRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedReceiptRequest(req)}
                className="bg-slate-950 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-black text-white font-mono">
                      ₹{req.amount?.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : req.status === 'REQUESTED' || req.status === 'PROCESSING'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {req.status === 'REQUESTED' ? 'UNDER ADMIN REVIEW' : req.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono break-all line-clamp-1">
                    Destination: {req.destination}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>
                      Requested: {new Date(req.date || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {req.processedAt && (
                      <span className="text-emerald-400">
                        • Settled: {new Date(req.processedAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {req.utr && req.utr !== 'Pending Admin Settlement' && (
                    <div className="text-xs font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                      UTR: {req.utr}
                    </div>
                  )}

                  <button
                    type="button"
                    className="p-2 rounded-xl bg-slate-900 group-hover:bg-slate-800 text-slate-400 group-hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dedicated Formal Withdrawal Request Modal */}
      <OwnerWithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          loadWalletData();
          showToast('Withdrawal request submitted successfully! TruFit Admin will process settlement.');
        }}
        ownerId={user?.uid || ''}
        ownerName={profile?.displayName || profile?.businessName || user?.displayName || user?.email || 'Turf Owner'}
        turfs={turfs}
        availableOnlineBalance={availableOnlineBalance}
        onlineRevenue={onlineRevenue}
        cashRevenue={cashRevenue}
        pendingPayouts={pendingPayouts}
        settledPayouts={settledPayouts}
        savedUpi={payoutUpi}
        savedBankName={payoutBankName}
        savedAccountNumber={payoutAccountNumber}
        savedIfscCode={payoutIfscCode}
        savedBeneficiary={payoutBeneficiary}
      />

      {/* Formal Payout Statement / Receipt Modal */}
      <OwnerPayoutReceiptModal
        request={selectedReceiptRequest}
        onClose={() => setSelectedReceiptRequest(null)}
        onCancelRequest={handleCancelRequest}
        isCancelling={Boolean(cancellingRequestId)}
      />
    </div>
  );
};
