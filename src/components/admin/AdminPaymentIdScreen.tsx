import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getAdminPaymentConfig, 
  saveAdminPaymentConfig, 
  getOwnerSettlementOverviews, 
  getAllOwnerSubscriptions,
  getAllSubscriptionTransactions,
  getAllTurfsForAdmin,
  getOwnerSubscriptionPlans,
  OwnerSettlementOverview,
} from '../../lib/db';
import {
  OwnerSubscriptionStatus,
  OwnerSubscriptionTransaction,
  OwnerSubscriptionPlan,
  Turf
} from '../../types';
import { 
  ShieldCheck, 
  QrCode, 
  CreditCard, 
  Landmark, 
  Building2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Receipt, 
  Smartphone, 
  RefreshCw, 
  Lock, 
  Send,
  Sparkles,
  X,
  Search,
  ChevronRight,
  User,
  Calendar,
  Zap,
  Check,
  Award,
  Clock,
  TrendingUp,
  Users,
  BadgeCheck,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';

interface AdminPaymentIdScreenProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export interface SubscribedTurfItem {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  turfNames: string[];
  planId: string;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  price: number;
  startDate: string;
  expiryDate: string;
  isTrialActive: boolean;
  totalPaid: number;
  lastPaymentTxnId?: string;
  lastPaymentDate?: string;
}

export const AdminPaymentIdScreen: React.FC<AdminPaymentIdScreenProps> = ({ showToast }) => {
  const { user } = useAuth();
  
  const [upiId, setUpiId] = useState<string>('trufit.admin@okaxis');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('TruFit Platform Admin');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('rzp_live_trufitAdminMaster');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState<string>('************************');
  const [bankName, setBankName] = useState<string>('HDFC Bank Corporate');
  const [accountNumber, setAccountNumber] = useState<string>('50200012345678');
  const [ifscCode, setIfscCode] = useState<string>('HDFC0001234');
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10);
  
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [overviews, setOverviews] = useState<OwnerSettlementOverview[]>([]);

  // Subscription analytics state
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME'>('ALL_TIME');
  const [subscribersList, setSubscribersList] = useState<SubscribedTurfItem[]>([]);
  const [allSubTxns, setAllSubTxns] = useState<OwnerSubscriptionTransaction[]>([]);
  const [totalSubRevenue, setTotalSubRevenue] = useState<number>(0);
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'>('ALL');

  const isCoachPlanTx = (pId = '', pName = '') => {
    const id = (pId || '').toLowerCase();
    const name = (pName || '').toLowerCase();
    return id.includes('coach') || id.includes('academy') || name.includes('coach') || name.includes('academy');
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingStats(true);
        const [config, settlementData, subStatuses, subTxns, turfs, plans] = await Promise.all([
          getAdminPaymentConfig(),
          getOwnerSettlementOverviews(),
          getAllOwnerSubscriptions(),
          getAllSubscriptionTransactions(),
          getAllTurfsForAdmin(),
          getOwnerSubscriptionPlans(true),
        ]);

        if (isMounted && config) {
          if (config.upiId) setUpiId(config.upiId);
          if (config.beneficiaryName) setBeneficiaryName(config.beneficiaryName);
          if (config.razorpayKeyId) setRazorpayKeyId(config.razorpayKeyId);
          if (config.bankName) setBankName(config.bankName);
          if (config.accountNumber) setAccountNumber(config.accountNumber);
          if (config.ifscCode) setIfscCode(config.ifscCode);
          if (config.platformFeePercent !== undefined) setPlatformFeePercent(config.platformFeePercent);
        }

        if (isMounted) {
          setOverviews(settlementData);
          setAllSubTxns(subTxns);

          const isCoachPlanTx = (pId = '', pName = '') => {
            const id = (pId || '').toLowerCase();
            const name = (pName || '').toLowerCase();
            return id.includes('coach') || id.includes('academy') || name.includes('coach') || name.includes('academy');
          };

          const ownerSubTxns = subTxns.filter(t => !isCoachPlanTx(t.planId, t.planName));

          // Sum up all owner subscription payments (excluding coach plans)
          const totalSubRev = ownerSubTxns.reduce((acc, t) => acc + (t.amountPaid || 0), 0);
          setTotalSubRevenue(totalSubRev);

          // Build unified SubscribedTurfItem list
          const ownerMap: Record<string, SubscribedTurfItem> = {};

          // 1. Collect all owners from turfs
          turfs.forEach((t: Turf) => {
            if (!t.ownerId) return;
            const matchedOverview = settlementData.find(o => o.ownerId === t.ownerId);
            if (!ownerMap[t.ownerId]) {
              ownerMap[t.ownerId] = {
                ownerId: t.ownerId,
                ownerName: matchedOverview?.ownerName || t.phoneNumber || 'Turf Owner',
                ownerEmail: '',
                turfNames: [t.name],
                planId: 'plan_pro_annual',
                planName: 'Pro Annual',
                status: 'TRIAL',
                price: 9999,
                startDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                isTrialActive: true,
                totalPaid: 0,
              };
            } else {
              if (t.name && !ownerMap[t.ownerId].turfNames.includes(t.name)) {
                ownerMap[t.ownerId].turfNames.push(t.name);
              }
            }
          });

          // 2. Attach actual subscription status
          subStatuses.forEach((st: OwnerSubscriptionStatus) => {
            if (isCoachPlanTx(st.planId, st.planName)) return;
            const planObj = plans.find(p => p.id === st.planId);
            const normalizedStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' = 
              st.status === 'ACTIVE'
                ? 'ACTIVE'
                : (st.status === 'EXPIRED' || st.status === 'TRIAL_EXPIRED' || (st.status as string) === 'CANCELLED')
                ? 'EXPIRED'
                : 'TRIAL';

            if (!ownerMap[st.ownerId]) {
              ownerMap[st.ownerId] = {
                ownerId: st.ownerId,
                ownerName: 'Turf Owner',
                ownerEmail: '',
                turfNames: ['Turf Venue'],
                planId: st.planId || 'plan_pro_annual',
                planName: st.planName || 'Pro Annual',
                status: normalizedStatus,
                price: planObj ? planObj.price : 9999,
                startDate: st.startDate || new Date().toISOString(),
                expiryDate: st.expiryDate || new Date().toISOString(),
                isTrialActive: st.isTrialActive ?? true,
                totalPaid: 0,
              };
            } else {
              ownerMap[st.ownerId].planId = st.planId || ownerMap[st.ownerId].planId;
              ownerMap[st.ownerId].planName = st.planName || ownerMap[st.ownerId].planName;
              ownerMap[st.ownerId].status = normalizedStatus;
              ownerMap[st.ownerId].startDate = st.startDate || ownerMap[st.ownerId].startDate;
              ownerMap[st.ownerId].expiryDate = st.expiryDate || ownerMap[st.ownerId].expiryDate;
              ownerMap[st.ownerId].isTrialActive = st.isTrialActive ?? ownerMap[st.ownerId].isTrialActive;
              if (planObj) {
                ownerMap[st.ownerId].price = planObj.price;
              }
            }
          });

          // 3. Attach subscription transactions info (excluding coach plans)
          subTxns.forEach((tx: OwnerSubscriptionTransaction) => {
            if (isCoachPlanTx(tx.planId, tx.planName)) return;
            if (ownerMap[tx.ownerId]) {
              ownerMap[tx.ownerId].totalPaid += (tx.amountPaid || 0);
              if (tx.ownerName && ownerMap[tx.ownerId].ownerName === 'Turf Owner') {
                ownerMap[tx.ownerId].ownerName = tx.ownerName;
              }
              if (tx.ownerEmail) {
                ownerMap[tx.ownerId].ownerEmail = tx.ownerEmail;
              }
              if (!ownerMap[tx.ownerId].lastPaymentDate || tx.createdAt > ownerMap[tx.ownerId].lastPaymentDate!) {
                ownerMap[tx.ownerId].lastPaymentDate = tx.createdAt;
                ownerMap[tx.ownerId].lastPaymentTxnId = tx.paymentTxnId;
              }
            }
          });

          setSubscribersList(Object.values(ownerMap));
        }
      } catch (err) {
        console.warn('Failed to load admin payment config and subscriptions:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      showToast('Please enter a valid Admin UPI ID / VPA', 'error');
      return;
    }
    try {
      setSaving(true);
      await saveAdminPaymentConfig({
        upiId: upiId.trim(),
        beneficiaryName: beneficiaryName.trim() || 'TruFit Platform Admin',
        razorpayKeyId: razorpayKeyId.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        platformFeePercent: typeof platformFeePercent === 'number' ? platformFeePercent : (parseFloat(platformFeePercent) || 0),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'admin',
      });
      showToast('Admin payment gateway ID & routing rules saved successfully!');
    } catch (err: any) {
      console.error('Failed to save admin payment settings:', err);
      showToast(err?.message || 'Failed to save admin payment settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isDateInTimeRange = (dateInput?: string | number | Date | null): boolean => {
    if (timeRange === 'ALL_TIME' || !dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    if (timeRange === 'TODAY') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d >= startOfToday;
    }
    if (timeRange === 'WEEKLY') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= sevenDaysAgo;
    }
    if (timeRange === 'MONTHLY') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= thirtyDaysAgo;
    }
    if (timeRange === 'YEARLY') {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return d >= oneYearAgo;
    }
    return true;
  };

  const effectiveOverviews = overviews.filter((o) =>
    isDateInTimeRange((o as any).lastSettlementDate || (o as any).createdAt || (o as any).updatedAt)
  );

  const effectiveSubscribersList = subscribersList.filter((s) =>
    isDateInTimeRange(s.lastPaymentDate || s.startDate)
  );

  const ownerSubTxns = allSubTxns.filter((tx) => !isCoachPlanTx(tx.planId, tx.planName));
  const effectiveSubTxns = ownerSubTxns.filter((tx) =>
    isDateInTimeRange(tx.createdAt)
  );

  const totalPlatformCommissions = effectiveOverviews.reduce((acc, o) => acc + o.platformConvenienceFees, 0);
  const effectiveTotalSubRevenue = timeRange === 'ALL_TIME' 
    ? ownerSubTxns.reduce((acc, t) => acc + (t.amountPaid || 0), 0)
    : effectiveSubTxns.reduce((acc, t) => acc + (t.amountPaid || 0), 0);
  const totalSettledPayouts = effectiveOverviews.reduce((acc, o) => acc + (o.totalSettledAmount || 0), 0);
  const totalPendingPayouts = effectiveOverviews.reduce((acc, o) => acc + (o.pendingPayoutAmount || 0), 0);

  // Filtered subscribers list for modal
  const filteredSubscribers = effectiveSubscribersList.filter(item => {
    const matchesSearch = 
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.turfNames.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && item.status === statusFilter;
  });

  const activeSubCount = effectiveSubscribersList.filter(s => s.status === 'ACTIVE').length;
  const trialSubCount = effectiveSubscribersList.filter(s => s.status === 'TRIAL').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none select-none text-8xl sm:text-9xl">
          💳
        </div>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
            <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Admin Payment Gateway ID & Treasury Setup
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-black px-2.5 py-1 rounded-full border border-emerald-500/40">
                Master Treasury
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              All player booking payments and turf owner subscription plans are routed directly to this Master Admin Payment ID. Click below to view subscribed turfs, tier plans, and platform revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Time Horizon Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Gateway Revenue Time Horizon</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {timeRange === 'TODAY' && '⚡ TODAY'}
                {timeRange === 'WEEKLY' && '📅 WEEKLY (7 DAYS)'}
                {timeRange === 'MONTHLY' && '📆 MONTHLY (30 DAYS)'}
                {timeRange === 'YEARLY' && '📊 YEARLY (365 DAYS)'}
                {timeRange === 'ALL_TIME' && '♾️ ALL TIME'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Filter platform fees and subscription revenue stream dates.
            </span>
          </div>
        </div>

        {/* Time Horizon Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          {(['TODAY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'] as const).map((tr) => (
            <button
              key={tr}
              onClick={() => setTimeRange(tr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                timeRange === tr
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>
                {tr === 'TODAY' && '⚡ Today'}
                {tr === 'WEEKLY' && '📅 Weekly'}
                {tr === 'MONTHLY' && '📆 Monthly'}
                {tr === 'YEARLY' && '📊 Yearly'}
                {tr === 'ALL_TIME' && '♾️ All Time'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Platform Convenience Fees (Per Slot & Lobby Booking) */}
        <div className="bg-slate-900 border border-emerald-900/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Platform Convenience Fees</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Slot & Lobby</span>
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-400 mt-4">
              ₹{totalPlatformCommissions.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Retained at <strong className="text-white font-bold">{platformFeePercent}%</strong> rate on every booking
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commission Rate</span>
            </span>
            <span className="font-bold text-emerald-300">{platformFeePercent}% Fee</span>
          </div>
        </div>

        {/* Card 2: Turf Owner SaaS Subscriptions */}
        <button
          type="button"
          onClick={() => setShowSubModal(true)}
          className="group text-left bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Owner SaaS Subscriptions</span>
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/40 flex items-center gap-1 transition-all">
                <span>View Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-3xl font-black text-white mt-4">
              ₹{effectiveTotalSubRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-indigo-300 mt-1.5">
              {effectiveSubscribersList.length} Owners ({activeSubCount} Active, {trialSubCount} Trial)
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-indigo-900/40 flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span>Inspect subscribed turfs</span>
            <span className="font-bold text-indigo-200">Inspect →</span>
          </div>
        </button>

        {/* Card 3: Total Amount Withdrawn by Owners */}
        <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Total Amount Withdrawn</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                Settled
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-400 mt-4">
              ₹{totalSettledPayouts.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Transferred to turf owners' bank & UPI accounts
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Disbursed Payouts</span>
            <span className="font-bold text-emerald-300">Completed</span>
          </div>
        </div>

        {/* Card 4: Pending Payout Balance */}
        <div className="bg-slate-900 border border-amber-900/40 p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pending Payout</span>
              </span>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                Unsettled Pool
              </span>
            </div>
            <p className="text-3xl font-black text-amber-300 mt-4">
              ₹{totalPendingPayouts.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Net balance sitting in venue wallets awaiting settlement
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Escrow Unsettled Pool</span>
            <span className="font-bold text-amber-300">Awaiting Request</span>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Central Admin Merchant Credentials</h2>
              <p className="text-xs text-slate-400">Configure master account for owner subscription payments and booking routing</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Gateway Config</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* UPI ID */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Admin Master UPI ID / VPA *</span>
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. trufit.admin@okaxis"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Owners paying subscription fees or players paying via UPI QR route to this VPA.
              </p>
            </div>

            {/* Beneficiary Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Admin Legal Entity / Business Name</span>
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="e.g. TruFit Platform Private Limited"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Razorpay Key ID */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Razorpay Key ID (Live / Test)</span>
              </label>
              <input
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_live_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Platform Convenience Fee % */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Platform Convenience Fee (%)</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  Current: {platformFeePercent}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={platformFeePercent}
                  onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors pr-8"
                />
                <span className="absolute right-3 top-3.5 text-slate-400 text-xs font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active fee saved in Firestore: {platformFeePercent}%. Applied dynamically across Web & Mobile checkout invoices.
              </p>
            </div>
          </div>

          {/* Admin Bank Settlement Details */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-amber-400" />
              <span>Admin Settlement Bank Account (Internal Record)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50200012345678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ========================================== */}
      {/* MODAL: SUBSCRIBED TURFS & TIER PLANS LIST  */}
      {/* ========================================== */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Subscribed Turfs & Tier Plans Directory</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time list of all turf owners, active subscription tiers, pricing, and revenue collected.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Top Metric Bar */}
            <div className="bg-slate-900/80 border-b border-slate-800 p-4 grid grid-cols-3 gap-3 shrink-0 text-center sm:text-left">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Total Subscription Revenue</span>
                <p className="text-lg sm:text-xl font-black text-white mt-0.5">₹{totalSubRevenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Active Paid Turfs</span>
                <p className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">{activeSubCount} Turfs</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-amber-400">Trial / Unpaid Turfs</span>
                <p className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">{trialSubCount} Turfs</p>
              </div>
            </div>

            {/* Modal Search & Filter Controls */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search turf, owner name or plan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {(['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === filter
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Venues' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Subscriber List Scroll Container */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredSubscribers.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">No subscribed turfs found</p>
                  <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query.</p>
                </div>
              ) : (
                filteredSubscribers.map((item) => (
                  <div
                    key={item.ownerId}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
                  >
                    {/* Left: Turf & Owner Metadata */}
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white">
                          {item.turfNames.join(', ') || 'Turf Venue'}
                        </h4>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : item.status === 'TRIAL'
                            ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border-rose-500/40'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{item.ownerName}</span>
                        </span>
                        {item.ownerEmail && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.ownerEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Tier Plan & Revenue Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl text-left">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Subscription Plan
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-white">{item.planName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                          ₹{item.price.toLocaleString('en-IN')}/yr
                        </span>
                      </div>

                      <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                          Total Revenue Paid
                        </span>
                        <p className="text-sm font-black text-indigo-300 mt-0.5">
                          ₹{item.totalPaid.toLocaleString('en-IN')}
                        </p>
                        {item.lastPaymentTxnId ? (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                            Ref: {item.lastPaymentTxnId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 block">
                            Trial / Complimentary
                          </span>
                        )}
                      </div>

                      <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Expiry Date
                        </span>
                        <span className="text-xs font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Showing {filteredSubscribers.length} of {subscribersList.length} registered turfs
              </span>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
