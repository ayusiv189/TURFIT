import React, { useState, useEffect } from 'react';
import {
  OwnerSettlementOverview,
  getOwnerSettlementOverviews,
  getAllOwnerProfilesWithSubscriptions,
  getOwnerSubscriptionPlans,
  getCoachSubscriptionPlans,
  getAllSubscriptionTransactions,
  getAllTurfsForAdmin,
  getCoaches,
  getAllCoachEnrollments,
  getAllBookingsAdmin,
} from '../../lib/db';
import {
  OwnerSubscriptionPlan,
  CoachSubscriptionPlan,
  OwnerSubscriptionTransaction,
  Turf,
  CoachProfile,
  CoachEnrollment,
  Booking,
} from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
  TrendingUp,
  IndianRupee,
  Building2,
  Calendar,
  Wallet,
  Receipt,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  BarChart3,
  CreditCard,
  Users,
  ShieldAlert,
  Award,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Phone,
  Mail,
  ShieldCheck,
  Filter,
  Layers,
  Sparkles,
  PieChart,
  Tag,
  MapPin,
  Globe,
  ExternalLink,
  Info,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

export type RevenueStreamFilter = 'ALL' | 'TURF_SAAS' | 'COACH_SAAS' | 'BOOKINGS';
export type TimeRangeFilter = 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';

interface AdminRevenueAnalyticsDashboardProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminRevenueAnalyticsDashboard: React.FC<AdminRevenueAnalyticsDashboardProps> = ({ showToast }) => {
  const [streamFilter, setStreamFilter] = useState<RevenueStreamFilter>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL_TIME');
  const [overviews, setOverviews] = useState<OwnerSettlementOverview[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Array<any>>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<OwnerSubscriptionPlan[]>([]);
  const [coachSubscriptionPlans, setCoachSubscriptionPlans] = useState<CoachSubscriptionPlan[]>([]);
  const [subscriptionTransactions, setSubscriptionTransactions] = useState<OwnerSubscriptionTransaction[]>([]);
  const [allTurfs, setAllTurfs] = useState<Turf[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [enrollments, setEnrollments] = useState<CoachEnrollment[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [coachSearchTerm, setCoachSearchTerm] = useState<string>('');
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null);

  // Helper to detect if a Turf Owner is also registered as a Coach or runs an Academy
  const getLinkedCoachForOwner = (op: any): CoachProfile | undefined => {
    if (!op) return undefined;
    const opEmail = op.email ? op.email.toLowerCase().trim() : '';
    const opPhone = op.phone ? op.phone.replace(/[^0-9]/g, '') : '';

    return coaches.find((c) => {
      if (c.userId && (c.userId === op.ownerId || c.userId === op.id)) return true;
      if (c.id && (c.id === op.ownerId || c.id === op.id)) return true;
      if (opEmail && c.email && c.email.toLowerCase().trim() === opEmail) return true;
      if (opPhone && opPhone.length >= 8 && c.phone && c.phone.replace(/[^0-9]/g, '') === opPhone) return true;
      return false;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        settlementsData,
        profilesData,
        plansData,
        coachPlansData,
        transactionsData,
        turfsData,
        coachesData,
        enrollmentsData,
        bookingsData,
      ] = await Promise.all([
        getOwnerSettlementOverviews(),
        getAllOwnerProfilesWithSubscriptions(),
        getOwnerSubscriptionPlans(true),
        getCoachSubscriptionPlans(true).catch(() => []),
        getAllSubscriptionTransactions().catch(() => []),
        getAllTurfsForAdmin().catch(() => []),
        getCoaches().catch(() => []),
        getAllCoachEnrollments().catch(() => []),
        getAllBookingsAdmin().catch(() => []),
      ]);

      setOverviews(settlementsData || []);
      setOwnerProfiles(profilesData || []);
      setSubscriptionPlans(plansData || []);
      setCoachSubscriptionPlans(coachPlansData || []);
      setSubscriptionTransactions(transactionsData || []);
      setAllTurfs(turfsData || []);
      setCoaches(coachesData || []);
      setEnrollments(enrollmentsData || []);
      setAllBookings(bookingsData || []);
    } catch (err) {
      console.error('Error loading admin revenue analytics:', err);
      showToast('Failed to load revenue and analytics data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Date filtering helper for time horizon
  const isDateInTimeRange = (dateInput?: string | number | Date): boolean => {
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

  const effectiveTransactions = subscriptionTransactions.filter((tx) =>
    isDateInTimeRange(tx.createdAt || (tx as any).timestamp || (tx as any).date)
  );

  const effectiveCoaches = coaches.filter((c) => {
    if (timeRange === 'ALL') return true;
    const isCurrentlyActive = c.subscription?.isActive || c.isVerified;
    if (isCurrentlyActive) return true;
    return isDateInTimeRange(c.subscription?.subscribedAt || c.createdAt || c.verifiedAt || c.updatedAt);
  });

  const effectiveOwnerProfiles = ownerProfiles.filter((op) =>
    isDateInTimeRange(op.subscription?.subscribedAt || op.createdAt)
  );

  const effectiveBookings = allBookings.filter((b) => {
    if (b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PARTIAL') return false;
    return isDateInTimeRange(b.createdAt || b.bookingDate || b.date);
  });

  const allTimeGross = overviews.reduce((acc, o) => acc + (o.grossAmountCollected || 0), 0);
  const allTimeOnline = overviews.reduce((acc, o) => acc + (o.onlineAmountCollected || 0), 0);
  const allTimeCash = overviews.reduce((acc, o) => acc + (o.cashAmountCollected || 0), 0);
  const allTimeFees = overviews.reduce((acc, o) => acc + (o.platformConvenienceFees || 0), 0);
  const allTimeSettled = overviews.reduce((acc, o) => acc + (o.totalSettledAmount || 0), 0);
  const allTimePending = overviews.reduce((acc, o) => acc + (o.pendingPayoutAmount || 0), 0);
  const allTimeBookingsCount = overviews.reduce((acc, o) => acc + (o.totalPaidBookings || 0), 0);

  let totalGrossVolume = 0;
  let totalOnlineEscrow = 0;
  let totalCashCollected = 0;
  let totalPlatformFees = 0;
  let totalSettledPayouts = 0;
  let totalPendingPayouts = 0;
  let totalBookingsCount = 0;

  if (timeRange === 'ALL_TIME') {
    totalGrossVolume = allTimeGross;
    totalOnlineEscrow = allTimeOnline;
    totalCashCollected = allTimeCash;
    totalPlatformFees = allTimeFees;
    totalSettledPayouts = allTimeSettled;
    totalPendingPayouts = allTimePending;
    totalBookingsCount = allTimeBookingsCount;
  } else {
    const calcGross = effectiveBookings.reduce((acc, b) => acc + (b.amountPaid || b.totalAmount || 0), 0);
    const calcOnline = effectiveBookings.reduce((acc, b) => {
      const m = (b.paymentMethod as string) || '';
      const isCash = m === 'CASH' || m === 'PAY_AT_VENUE' || m === 'PAY_LATER_AT_TURF' || m === 'CASH_OR_COUNTER_UPI';
      return !isCash ? acc + (b.amountPaid || b.totalAmount || 0) : acc;
    }, 0);
    const calcCash = effectiveBookings.reduce((acc, b) => {
      const m = (b.paymentMethod as string) || '';
      const isCash = m === 'CASH' || m === 'PAY_AT_VENUE' || m === 'PAY_LATER_AT_TURF' || m === 'CASH_OR_COUNTER_UPI';
      return isCash ? acc + (b.amountPaid || b.totalAmount || 0) : acc;
    }, 0);
    const calcFees = effectiveBookings.reduce((acc, b) => acc + (b.convenienceFee || 0), 0);

    totalGrossVolume = Math.min(calcGross, allTimeGross);
    totalOnlineEscrow = Math.min(calcOnline, allTimeOnline);
    totalCashCollected = Math.min(calcCash, allTimeCash);
    totalPlatformFees = Math.min(calcFees, allTimeFees);
    totalSettledPayouts = allTimeSettled;
    totalPendingPayouts = allTimePending;
    totalBookingsCount = Math.min(effectiveBookings.length, allTimeBookingsCount);
  }

  const effectiveOverviews = overviews.filter((o) =>
    isDateInTimeRange((o as any).lastSettlementDate || (o as any).createdAt || (o as any).updatedAt)
  );

  // Map plan ID to plan object for quick lookup
  const planMap = new Map<string, OwnerSubscriptionPlan>();
  subscriptionPlans.forEach((p) => planMap.set(p.id, p));

  // Helper to match turf plan flexibly by id or name
  const findMatchingPlan = (targetIdOrName?: string) => {
    if (!targetIdOrName) return null;
    const clean = targetIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const p of subscriptionPlans) {
      const pCleanId = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const pCleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        clean === pCleanId ||
        clean === pCleanName ||
        pCleanId.includes(clean) ||
        clean.includes(pCleanId) ||
        pCleanName.includes(clean)
      ) {
        return p;
      }
    }
    return null;
  };

  // Helper to match coach plan flexibly by id or name
  const findMatchingCoachPlan = (targetIdOrName?: string) => {
    if (!targetIdOrName) return null;
    const clean = targetIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const p of coachSubscriptionPlans) {
      const pCleanId = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const pCleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        clean === pCleanId ||
        clean === pCleanName ||
        pCleanId.includes(clean) ||
        clean.includes(pCleanId) ||
        pCleanName.includes(clean)
      ) {
        return p;
      }
    }
    return null;
  };

  // 1. Turf SaaS Stats by Plan (Strictly Turf Owner Plans Only)
  const turfPlanStats: {
    [planId: string]: {
      count: number;
      name: string;
      price: number;
      durationDays: number;
      soldCount: number;
      soldRevenue: number;
    };
  } = {};

  subscriptionPlans.forEach((p) => {
    const isCoachOrAcademy =
      (p as any).role === 'COACH' ||
      (p as any).role === 'ACADEMY' ||
      p.id?.toLowerCase().includes('coach') ||
      p.id?.toLowerCase().includes('academy') ||
      p.name?.toLowerCase().includes('coach') ||
      p.name?.toLowerCase().includes('academy');

    if (!isCoachOrAcademy) {
      turfPlanStats[p.id] = {
        count: 0,
        name: p.name,
        price: p.price,
        durationDays: p.durationDays,
        soldCount: 0,
        soldRevenue: 0,
      };
    }
  });

  // Calculate sold volume and count from transactions for turf plans ONLY (strictly excluding coach and academy transactions)
  effectiveTransactions.forEach((tx) => {
    const isCoachOrAcademyTx =
      (tx as any).role === 'COACH' ||
      (tx as any).role === 'ACADEMY' ||
      tx.planId?.toLowerCase().includes('coach') ||
      tx.planId?.toLowerCase().includes('academy') ||
      tx.planName?.toLowerCase().includes('coach') ||
      tx.planName?.toLowerCase().includes('academy');
    if (isCoachOrAcademyTx) return;

    const matchedPlan = findMatchingPlan(tx.planId) || findMatchingPlan(tx.planName);
    const planKey = matchedPlan ? matchedPlan.id : (tx.planId || 'plan_pro_annual');
    if (!turfPlanStats[planKey]) {
      turfPlanStats[planKey] = {
        count: 0,
        name: tx.planName || matchedPlan?.name || planKey,
        price: tx.amountPaid || matchedPlan?.price || 0,
        durationDays: matchedPlan?.durationDays || 365,
        soldCount: 0,
        soldRevenue: 0,
      };
    }
    turfPlanStats[planKey].soldCount += 1;
    turfPlanStats[planKey].soldRevenue += (tx.amountPaid || 0);
  });

  // Count active owners assigned to each turf plan & accumulate amount paid for turf owner plans
  effectiveOwnerProfiles.forEach((op) => {
    const matchedPlan =
      findMatchingPlan(op.subscription?.planId) ||
      findMatchingPlan(op.subscription?.planName);
    const planKey = matchedPlan ? matchedPlan.id : (op.subscription?.planId || 'plan_standard_monthly');
    const isCoachKey =
      planKey.toLowerCase().includes('coach') ||
      planKey.toLowerCase().includes('academy') ||
      (op.subscription?.planName && (
        op.subscription.planName.toLowerCase().includes('coach') ||
        op.subscription.planName.toLowerCase().includes('academy')
      ));
    if (isCoachKey) return;

    if (!turfPlanStats[planKey]) {
      turfPlanStats[planKey] = {
        count: 0,
        name: op.subscription?.planName || matchedPlan?.name || planKey,
        price: matchedPlan?.price || 0,
        durationDays: matchedPlan?.durationDays || 30,
        soldCount: 0,
        soldRevenue: 0,
      };
    }
    turfPlanStats[planKey].count += 1;

    // If effectiveTransactions is empty, add amount paid by this owner for their turf owner plan
    if (effectiveTransactions.length === 0) {
      const isPaidStatus = op.subscription?.status === 'ACTIVE' || op.subscription?.paymentStatus === 'PAID';
      if (isPaidStatus) {
        const ownerAmountPaid = op.subscription?.amountPaid ?? op.subscription?.amount ?? matchedPlan?.price ?? 0;
        turfPlanStats[planKey].soldRevenue += ownerAmountPaid;
        turfPlanStats[planKey].soldCount += 1;
      }
    }
  });

  // Strict Turf Owner SaaS Revenue: Sum transactions for Turf Owner plans only, or owner plan amounts
  const turfOnlyTransactions = effectiveTransactions.filter((tx) => {
    const isCoachOrAcademy =
      (tx as any).role === 'COACH' ||
      (tx as any).role === 'ACADEMY' ||
      tx.planId?.toLowerCase().includes('coach') ||
      tx.planId?.toLowerCase().includes('academy') ||
      tx.planName?.toLowerCase().includes('coach') ||
      tx.planName?.toLowerCase().includes('academy');
    return !isCoachOrAcademy;
  });

  const totalTurfSaasRevenue = turfOnlyTransactions.length > 0
    ? turfOnlyTransactions.reduce((acc, tx) => acc + (tx.amountPaid || 0), 0)
    : Object.values(turfPlanStats).reduce((acc, stats) => acc + (stats.soldRevenue || 0), 0);

  // 2. Coach SaaS Stats by Plan
  const coachPlanStats: {
    [planId: string]: {
      count: number;
      name: string;
      price: number;
      durationDays: number;
      soldRevenue: number;
    };
  } = {};

  coachSubscriptionPlans.forEach((cp) => {
    coachPlanStats[cp.id] = {
      count: 0,
      name: cp.name,
      price: cp.price,
      durationDays: cp.durationDays || 365,
      soldRevenue: 0,
    };
  });

  effectiveCoaches.forEach((c) => {
    const hasPaid =
      c.subscription?.isActive ||
      c.subscription?.paymentStatus === 'PAID' ||
      ((c as any).platformFeePaid && (c as any).platformFeePaid > 0) ||
      c.isVerified;
    const matchedCoachPlan =
      findMatchingCoachPlan(c.subscription?.planId) ||
      findMatchingCoachPlan(c.subscription?.planName);
    const planKey = matchedCoachPlan ? matchedCoachPlan.id : (c.subscription?.planId || (c.academyName ? 'YEARLY_ACADEMY_ELITE' : 'YEARLY_COACH_PRO'));
    const amountPaid = hasPaid
      ? Number(
          c.subscription?.amountPaid ||
          (c as any).platformFeePaid ||
          matchedCoachPlan?.price ||
          (c.academyName ? 4999 : 2999)
        )
      : 0;

    if (!coachPlanStats[planKey]) {
      coachPlanStats[planKey] = {
        count: 0,
        name: c.subscription?.planName || matchedCoachPlan?.name || (c.academyName ? 'Academy Elite Annual Pass' : 'Coach Pro Annual Pass'),
        price: matchedCoachPlan?.price || (c.academyName ? 4999 : 2999),
        durationDays: matchedCoachPlan?.durationDays || 365,
        soldRevenue: 0,
      };
    }
    if (hasPaid) {
      coachPlanStats[planKey].count += 1;
      coachPlanStats[planKey].soldRevenue += (amountPaid > 0 ? amountPaid : (c.academyName ? 4999 : 2999));
    }
  });

  const revenueFromCoachSubs = Object.values(coachPlanStats).reduce(
    (acc, stats) => acc + stats.soldRevenue,
    0
  );

  const coachTransactions = effectiveTransactions.filter((tx) => {
    return (
      (tx as any).role === 'COACH' ||
      (tx as any).role === 'ACADEMY' ||
      tx.planId?.toLowerCase().includes('coach') ||
      tx.planId?.toLowerCase().includes('academy') ||
      tx.planName?.toLowerCase().includes('coach') ||
      tx.planName?.toLowerCase().includes('academy') ||
      (tx as any).type === 'COACH_SUBSCRIPTION'
    );
  });
  const revenueFromCoachTxns = coachTransactions.reduce(
    (acc, tx) => acc + (Number(tx.amountPaid) || 0),
    0
  );

  const totalCoachSubscriptionRevenue = Math.max(revenueFromCoachSubs, revenueFromCoachTxns);

  // Combined SaaS Platform Totals
  const totalCombinedSaasRevenue = totalTurfSaasRevenue + totalCoachSubscriptionRevenue;
  const turfSaasShare = totalCombinedSaasRevenue > 0 ? Math.round((totalTurfSaasRevenue / totalCombinedSaasRevenue) * 100) : 50;
  const coachSaasShare = totalCombinedSaasRevenue > 0 ? Math.round((totalCoachSubscriptionRevenue / totalCombinedSaasRevenue) * 100) : 50;

  const ownerTurfsMap = new Map<string, string[]>();
  allTurfs.forEach((t) => {
    if (t.ownerId) {
      const list = ownerTurfsMap.get(t.ownerId) || [];
      list.push(t.name);
      ownerTurfsMap.set(t.ownerId, list);
    }
  });

  const ownersWithTurfs = effectiveOwnerProfiles.filter(
    (op) => (ownerTurfsMap.get(op.ownerId) || []).length > 0
  );
  const ownersWithoutTurfs = effectiveOwnerProfiles.filter(
    (op) => (ownerTurfsMap.get(op.ownerId) || []).length === 0
  );
  const withTurfsPercent =
    effectiveOwnerProfiles.length > 0
      ? Math.round((ownersWithTurfs.length / effectiveOwnerProfiles.length) * 100)
      : 0;
  const withoutTurfsPercent =
    effectiveOwnerProfiles.length > 0 ? 100 - withTurfsPercent : 0;

  // Coach Pass Inspection Metrics
  const paidCoaches = effectiveCoaches.filter(
    (c) => c.subscription?.isActive || c.subscription?.paymentStatus === 'PAID' || (c.platformFeePaid && c.platformFeePaid > 0)
  );
  const unpaidCoaches = effectiveCoaches.filter(
    (c) => !(c.subscription?.isActive || c.subscription?.paymentStatus === 'PAID' || (c.platformFeePaid && c.platformFeePaid > 0))
  );
  const paidCoachesPercent = effectiveCoaches.length > 0 ? Math.round((paidCoaches.length / effectiveCoaches.length) * 100) : 0;
  const unpaidCoachesPercent = effectiveCoaches.length > 0 ? 100 - paidCoachesPercent : 0;

  // Booking Escrow Payment Split Inspection Metrics
  const onlineBookingPercent = totalGrossVolume > 0 ? Math.round((totalOnlineEscrow / totalGrossVolume) * 100) : 0;
  const cashBookingPercent = totalGrossVolume > 0 ? 100 - onlineBookingPercent : 0;

  // Payout Settlement Inspection Metrics
  const totalPayoutsPool = totalSettledPayouts + totalPendingPayouts;
  const settledPayoutPercent = totalPayoutsPool > 0 ? Math.round((totalSettledPayouts / totalPayoutsPool) * 100) : 0;
  const pendingPayoutPercent = totalPayoutsPool > 0 ? 100 - settledPayoutPercent : 0;

  const filteredOverviews = effectiveOverviews.filter(
    (o) =>
      o.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.turfNames?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredOwners = effectiveOwnerProfiles.filter(
    (op) =>
      op.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.phone?.includes(searchTerm) ||
      (ownerTurfsMap.get(op.ownerId) || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCoachesCount = effectiveCoaches.length;
  const verifiedCoachesCount = effectiveCoaches.filter((c) => c.isVerified || c.verificationStatus === 'VERIFIED').length;
  const pendingCoachesCount = effectiveCoaches.filter(
    (c) => c.verificationStatus === 'PENDING_VERIFICATION' || (!c.isVerified && c.verificationStatus !== 'REJECTED')
  ).length;
  const totalJoinedStudents = enrollments.length;
  const totalStudentTuitionCollected = enrollments.reduce((acc, e) => acc + (e.feePaid || 0), 0);

  const filteredCoaches = effectiveCoaches.filter(
    (c) =>
      c.name.toLowerCase().includes(coachSearchTerm.toLowerCase()) ||
      (c.academyName && c.academyName.toLowerCase().includes(coachSearchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(coachSearchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(coachSearchTerm)) ||
      (c.sports && c.sports.some((s) => s.toLowerCase().includes(coachSearchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar with Stream Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Revenue & SaaS Financial Analytics</h1>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Dedicated financial reporting: Turf Owner SaaS plans, Coach & Academy passes, and Venue booking escrow are strictly segregated.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Admin Dashboard Time Horizon Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Dashboard Time Filter</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                {timeRange === 'TODAY' && '⚡ TODAY'}
                {timeRange === 'WEEKLY' && '📅 WEEKLY (7 DAYS)'}
                {timeRange === 'MONTHLY' && '📆 MONTHLY (30 DAYS)'}
                {timeRange === 'YEARLY' && '📊 YEARLY (365 DAYS)'}
                {timeRange === 'ALL_TIME' && '♾️ ALL TIME'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {timeRange === 'TODAY' && 'Viewing metrics and transactions recorded today.'}
              {timeRange === 'WEEKLY' && 'Viewing metrics and transactions recorded over the last 7 days.'}
              {timeRange === 'MONTHLY' && 'Viewing metrics and transactions recorded over the last 30 days.'}
              {timeRange === 'YEARLY' && 'Viewing metrics and transactions recorded over the last 365 days.'}
              {timeRange === 'ALL_TIME' && 'Viewing total historical records across all time.'}
            </span>
          </div>
        </div>

        {/* Time Horizon Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setTimeRange('TODAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              timeRange === 'TODAY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>⚡ Today</span>
          </button>

          <button
            onClick={() => setTimeRange('WEEKLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              timeRange === 'WEEKLY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>📅 Weekly</span>
          </button>

          <button
            onClick={() => setTimeRange('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              timeRange === 'MONTHLY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>📆 Monthly</span>
          </button>

          <button
            onClick={() => setTimeRange('YEARLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              timeRange === 'YEARLY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>📊 Yearly</span>
          </button>

          <button
            onClick={() => setTimeRange('ALL_TIME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              timeRange === 'ALL_TIME'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>♾️ All Time</span>
          </button>
        </div>
      </div>

      {/* Stream Selector Tab Pills */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto w-full sm:w-fit">
        <button
          onClick={() => setStreamFilter('TURF_SAAS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            streamFilter === 'TURF_SAAS'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Turf Owners SaaS ({ownerProfiles.length})</span>
        </button>

        <button
          onClick={() => setStreamFilter('COACH_SAAS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            streamFilter === 'COACH_SAAS'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Coach & Academy Passes ({totalCoachesCount})</span>
        </button>

        <button
          onClick={() => setStreamFilter('BOOKINGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            streamFilter === 'BOOKINGS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Venue Bookings & Commission</span>
        </button>

        <button
          onClick={() => setStreamFilter('ALL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            streamFilter === 'ALL'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Financial Streams</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Turf SaaS Sold Amount (When TURF_SAAS or ALL is selected) */}
        {(streamFilter === 'TURF_SAAS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Turf SaaS Subscriptions</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalTurfSaasRevenue)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Across {ownerProfiles.length} registered owners</span>
            </div>
          </div>
        )}

        {/* Turf Owners Count Card with Interactive Hover Inspection Tooltip */}
        {streamFilter === 'TURF_SAAS' && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-visible group hover:border-emerald-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Registered Turf Owners</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5">{ownerProfiles.length} Owners</h3>
            
            {/* Interactive Inspection Ratio Bar & Tooltip Trigger */}
            <div className="mt-3 space-y-1.5 relative group/inspection">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {ownersWithTurfs.length} With Turfs ({withTurfsPercent}%)
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  {ownersWithoutTurfs.length} Without Turfs ({withoutTurfsPercent}%)
                </span>
              </div>

              {/* Progress Ratio Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex cursor-pointer">
                <div style={{ width: `${withTurfsPercent}%` }} className="bg-emerald-500 h-full transition-all"></div>
                <div style={{ width: `${withoutTurfsPercent}%` }} className="bg-amber-500 h-full transition-all"></div>
              </div>

              {/* FLOATING HOVER INSPECTION TOOLTIP */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl opacity-0 group-hover/inspection:opacity-100 pointer-events-none group-hover/inspection:pointer-events-auto transition-all z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Owner Allocation Inspection</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Total: {ownerProfiles.length}</span>
                </div>

                {/* Section A: With Turfs */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                    <span>🟢 With Registered Turfs ({ownersWithTurfs.length})</span>
                    <span>{withTurfsPercent}%</span>
                  </div>
                  {ownersWithTurfs.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No owners with registered turfs</p>
                  ) : (
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {ownersWithTurfs.slice(0, 5).map((op) => {
                        const count = (ownerTurfsMap.get(op.ownerId) || []).length;
                        return (
                          <div key={op.ownerId} className="flex items-center justify-between text-[11px] bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            <span className="font-semibold text-emerald-200 truncate max-w-[170px]">{op.businessName || op.displayName}</span>
                            <span className="font-mono text-[9px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                              {count} {count === 1 ? 'Venue' : 'Venues'}
                            </span>
                          </div>
                        );
                      })}
                      {ownersWithTurfs.length > 5 && (
                        <p className="text-[9px] text-slate-400 text-center font-medium">+ {ownersWithTurfs.length - 5} more owners with active turfs</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Section B: Without Turfs */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                    <span>⚠️ Without Registered Turfs ({ownersWithoutTurfs.length})</span>
                    <span>{withoutTurfsPercent}%</span>
                  </div>
                  {ownersWithoutTurfs.length === 0 ? (
                    <p className="text-[10px] text-emerald-400/80 font-medium">🎉 100% of owners have registered turfs!</p>
                  ) : (
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {ownersWithoutTurfs.slice(0, 5).map((op) => (
                        <div key={op.ownerId} className="flex items-center justify-between text-[11px] bg-amber-950/30 border border-amber-500/20 px-2 py-1 rounded-lg">
                          <span className="font-semibold text-amber-200 truncate max-w-[170px]">{op.businessName || op.displayName}</span>
                          <span className="font-mono text-[9px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                            0 Venues
                          </span>
                        </div>
                      ))}
                      {ownersWithoutTurfs.length > 5 && (
                        <p className="text-[9px] text-slate-400 text-center font-medium">+ {ownersWithoutTurfs.length - 5} more pending venue setup</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Turf SaaS Active Tiers (When TURF_SAAS is selected) */}
        {streamFilter === 'TURF_SAAS' && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Owner SaaS Tiers</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5">{Object.keys(turfPlanStats).length} Active Tiers</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <Tag className="w-3.5 h-3.5" />
              <span>Standard, Pro & Enterprise tiers</span>
            </div>
          </div>
        )}

        {/* Coach Passes Revenue (When COACH_SAAS or ALL is selected) */}
        {(streamFilter === 'COACH_SAAS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-5 shadow-xl relative overflow-visible group hover:border-teal-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">Coach Pass SaaS</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalCoachSubscriptionRevenue)}</h3>
            
            {/* Interactive Inspection Ratio Bar & Tooltip */}
            <div className="mt-3 space-y-1.5 relative group/coachInspection">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-teal-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  {paidCoaches.length} Active Paid ({paidCoachesPercent}%)
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  {unpaidCoaches.length} Pending ({unpaidCoachesPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex cursor-pointer">
                <div style={{ width: `${paidCoachesPercent}%` }} className="bg-teal-500 h-full transition-all"></div>
                <div style={{ width: `${unpaidCoachesPercent}%` }} className="bg-amber-500 h-full transition-all"></div>
              </div>

              {/* FLOATING HOVER INSPECTION TOOLTIP */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-teal-500/40 rounded-2xl p-4 shadow-2xl opacity-0 group-hover/coachInspection:opacity-100 pointer-events-none group-hover/coachInspection:pointer-events-auto transition-all z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-teal-400" />
                    <span>Coach Pass Status Inspection</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Total: {coaches.length}</span>
                </div>

                {/* Section: Paid Passes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-teal-300">
                    <span>🟢 Active Paid Passes ({paidCoaches.length})</span>
                    <span>{paidCoachesPercent}%</span>
                  </div>
                  {paidCoaches.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No active paid coach passes</p>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {paidCoaches.slice(0, 4).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-[11px] bg-teal-950/40 border border-teal-500/20 px-2 py-1 rounded-lg">
                          <span className="font-semibold text-teal-200 truncate max-w-[170px]">{c.academyName || c.name}</span>
                          <span className="font-mono text-[9px] text-teal-300 font-bold bg-teal-500/20 px-1.5 py-0.5 rounded">
                            PAID
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Pending Passes */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                    <span>⚠️ Pending / Unpaid Passes ({unpaidCoaches.length})</span>
                    <span>{unpaidCoachesPercent}%</span>
                  </div>
                  {unpaidCoaches.length === 0 ? (
                    <p className="text-[10px] text-teal-400 font-medium">🎉 100% of coaches hold active paid passes!</p>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {unpaidCoaches.slice(0, 4).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-[11px] bg-amber-950/30 border border-amber-500/20 px-2 py-1 rounded-lg">
                          <span className="font-semibold text-amber-200 truncate max-w-[170px]">{c.academyName || c.name}</span>
                          <span className="font-mono text-[9px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                            UNPAID
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Enrollments Volume (When COACH_SAAS is selected) */}
        {streamFilter === 'COACH_SAAS' && (
          <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-teal-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">Student Tuition Flow</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalStudentTuitionCollected)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Across {totalJoinedStudents} student enrollments</span>
            </div>
          </div>
        )}

        {/* Gross Platform Volume (When BOOKINGS or ALL is selected) */}
        {(streamFilter === 'BOOKINGS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-visible group hover:border-indigo-500/50 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Booking Volume</span>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalGrossVolume)}</h3>
            
            {/* Interactive Inspection Ratio Bar & Tooltip */}
            <div className="mt-3 space-y-1.5 relative group/bookingInspection">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-blue-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-400" />
                  Online ({onlineBookingPercent}%)
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-emerald-400" />
                  On-Spot Cash ({cashBookingPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex cursor-pointer">
                <div style={{ width: `${onlineBookingPercent}%` }} className="bg-blue-500 h-full transition-all"></div>
                <div style={{ width: `${cashBookingPercent}%` }} className="bg-emerald-500 h-full transition-all"></div>
              </div>

              {/* FLOATING HOVER INSPECTION TOOLTIP */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl opacity-0 group-hover/bookingInspection:opacity-100 pointer-events-none group-hover/bookingInspection:pointer-events-auto transition-all z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <span>Booking Payment Mode Inspection</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{totalBookingsCount} Bookings</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-500/30">
                    <div className="space-y-0.5">
                      <span className="font-bold text-blue-300 block">💳 Gateway Online Escrow</span>
                      <span className="text-[10px] text-slate-400">Secured via Razorpay/UPI gateway</span>
                    </div>
                    <div className="text-right font-mono font-bold text-blue-400">
                      {formatCurrency(totalOnlineEscrow)}
                      <span className="block text-[9px] text-slate-400 font-sans">{onlineBookingPercent}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <div className="space-y-0.5">
                      <span className="font-bold text-emerald-300 block">💵 On-Spot Cash at Venue</span>
                      <span className="text-[10px] text-slate-400">Collected directly at turf counter</span>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(totalCashCollected)}
                      <span className="block text-[9px] text-slate-400 font-sans">{cashBookingPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform Convenience Fees (When BOOKINGS or ALL is selected) */}
        {(streamFilter === 'BOOKINGS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Convenience Fee Revenue</span>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalPlatformFees)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Direct platform commission</span>
            </div>
          </div>
        )}

        {/* Total Amount Withdrawn by Owners (When BOOKINGS or ALL is selected) */}
        {(streamFilter === 'BOOKINGS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Total Amount Withdrawn</span>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalSettledPayouts)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transferred & settled to owners</span>
            </div>
          </div>
        )}

        {/* Pending Payout Balance (When BOOKINGS or ALL is selected) */}
        {(streamFilter === 'BOOKINGS' || streamFilter === 'ALL') && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Pending Payout Balance</span>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalPendingPayouts)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Unsettled venue balances</span>
            </div>
          </div>
        )}

        {/* Online Escrow Collected (when viewing Bookings) */}
        {streamFilter === 'BOOKINGS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Online Gateway Escrow</span>
            <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalOnlineEscrow)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Secured in payment gateway</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: Turf Owner SaaS Plan Breakdown Cards */}
      {(streamFilter === 'ALL' || streamFilter === 'TURF_SAAS') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Turf Owner SaaS Plans Breakdown</h3>
              </div>
              <p className="text-xs text-slate-400">Distribution, subscriber count, and collected revenue by turf management tier</p>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Turf SaaS Tier Analysis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(turfPlanStats).map(([planId, stats]) => {
              const intervalLabel = stats.durationDays >= 360 ? 'year' : stats.durationDays >= 90 ? 'quarter' : 'month';
              const displaySoldRevenue = stats.soldRevenue > 0 ? stats.soldRevenue : (stats.count * stats.price);
              return (
                <div key={planId} className="bg-slate-950 border border-emerald-500/20 rounded-xl p-4 space-y-2 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{stats.name}</span>
                    <span className="bg-emerald-950/80 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {stats.count} {stats.count === 1 ? 'Owner' : 'Owners'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-white">
                    {formatCurrency(stats.price)} <span className="text-xs font-normal text-slate-400">/{intervalLabel}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Total Sold Volume:</span>
                    <div className="text-right">
                      <span className="font-semibold text-emerald-400 block">{formatCurrency(displaySoldRevenue)}</span>
                      {stats.soldCount > 0 && (
                        <span className="text-[10px] text-slate-400">({stats.soldCount} {stats.soldCount === 1 ? 'plan sold' : 'plans sold'})</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Coach & Academy SaaS Plan Breakdown Cards */}
      {(streamFilter === 'ALL' || streamFilter === 'COACH_SAAS') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Coach & Academy SaaS Plans Breakdown</h3>
              </div>
              <p className="text-xs text-slate-400">Annual coach passes, academy roster tiers, and direct coach pass subscription revenues</p>
            </div>
            <span className="bg-teal-500/20 text-teal-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30">
              Coach SaaS Tier Analysis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(coachPlanStats).map(([planId, stats]) => {
              const intervalLabel = stats.durationDays >= 360 ? 'year' : 'month';
              return (
                <div key={planId} className="bg-slate-950 border border-teal-500/20 rounded-xl p-4 space-y-2 hover:border-teal-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">{stats.name}</span>
                    <span className="bg-teal-950/80 text-teal-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30">
                      {stats.count} {stats.count === 1 ? 'Coach' : 'Coaches'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-white">
                    {formatCurrency(stats.price)} <span className="text-xs font-normal text-slate-400">/{intervalLabel}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Total Pass Volume:</span>
                    <div className="text-right">
                      <span className="font-semibold text-teal-400 block">{formatCurrency(stats.soldRevenue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Owner SaaS Plans & Details Table */}
      {(streamFilter === 'ALL' || streamFilter === 'TURF_SAAS') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Registered Turf Owners & Active SaaS Plans ({ownerProfiles.length})</h3>
              </div>
              <p className="text-xs text-slate-400">List of all turf owners, their businesses, and assigned subscription tiers</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search owner, business or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Hover Inspection Tooltips Banner */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Owner Inspection:</span>
            </span>

            {/* With Turfs Interactive Badge */}
            <div className="relative group/badgeWith">
              <span className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{ownersWithTurfs.length} Owners with Registered Turfs ({withTurfsPercent}%)</span>
              </span>

              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-emerald-500/40 rounded-xl p-3 shadow-2xl opacity-0 group-hover/badgeWith:opacity-100 pointer-events-none group-hover/badgeWith:pointer-events-auto transition-all z-50 space-y-2">
                <div className="text-xs font-bold text-emerald-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>🟢 Active Turfs Registered ({ownersWithTurfs.length})</span>
                  <span>{withTurfsPercent}%</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {ownersWithTurfs.map((op) => {
                    const count = (ownerTurfsMap.get(op.ownerId) || []).length;
                    return (
                      <div key={op.ownerId} className="flex items-center justify-between text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        <span className="text-white font-medium truncate max-w-[170px]">{op.businessName || op.displayName}</span>
                        <span className="text-emerald-400 font-bold font-mono text-[10px]">{count} venue{count > 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Without Turfs Interactive Badge */}
            <div className="relative group/badgeWithout">
              <span className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{ownersWithoutTurfs.length} Owners without Registered Turfs ({withoutTurfsPercent}%)</span>
              </span>

              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-amber-500/40 rounded-xl p-3 shadow-2xl opacity-0 group-hover/badgeWithout:opacity-100 pointer-events-none group-hover/badgeWithout:pointer-events-auto transition-all z-50 space-y-2">
                <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>⚠️ Pending Turf Registration ({ownersWithoutTurfs.length})</span>
                  <span>{withoutTurfsPercent}%</span>
                </div>
                {ownersWithoutTurfs.length === 0 ? (
                  <p className="text-[11px] text-emerald-400 font-medium italic">All registered owners have active turfs!</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {ownersWithoutTurfs.map((op) => (
                      <div key={op.ownerId} className="flex items-center justify-between text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        <span className="text-white font-medium truncate max-w-[170px]">{op.businessName || op.displayName}</span>
                        <span className="text-amber-400 font-mono text-[10px]">0 venues</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Registered Turfs</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Turf SaaS Plan</th>
                  <th className="py-3 px-4">Plan Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details & Passes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredOwners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching turf owners found.
                    </td>
                  </tr>
                ) : (
                  filteredOwners.map((op) => {
                    const matchedPlan =
                      findMatchingPlan(op.subscription?.planId) ||
                      findMatchingPlan(op.subscription?.planName);
                    const planInfo = matchedPlan || planMap.get(op.subscription?.planId) || {
                      name: op.subscription?.planName || op.subscription?.planId || 'Standard Monthly',
                      price: 0,
                      durationDays: 30,
                    };
                    const isExpired =
                      op.subscription?.status === 'EXPIRED' ||
                      (op.subscription?.expiryDate && new Date(op.subscription.expiryDate).getTime() < Date.now());
                    const isTrial = op.subscription?.status === 'TRIAL' || op.subscription?.isTrialActive;
                    const isActive = op.subscription?.status === 'ACTIVE' && !isExpired;

                    const intervalLabel = planInfo.durationDays >= 360 ? 'year' : 'month';
                    const ownerTurfs = ownerTurfsMap.get(op.ownerId) || [];
                    const linkedCoach = getLinkedCoachForOwner(op);
                    const linkedCoachEnrollments = linkedCoach ? enrollments.filter((e) => e.coachId === linkedCoach.id) : [];
                    const isExpanded = expandedOwnerId === op.ownerId;

                    // Compute location URL and website URL for banner links
                    const ownerTurfObjects = allTurfs.filter((t) => t.ownerId === op.ownerId || t.ownerId === op.id);
                    const firstTurfWithLocation = ownerTurfObjects.find((t) => t.locationUrl && t.locationUrl.trim().length > 0);
                    const locationUrl = firstTurfWithLocation?.locationUrl
                      ? firstTurfWithLocation.locationUrl
                      : ownerTurfObjects.length > 0 && (ownerTurfObjects[0].address || ownerTurfObjects[0].city)
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${op.businessName || ''} ${ownerTurfObjects[0].address || ''} ${ownerTurfObjects[0].city || ''}`)}`
                      : null;

                    const rawWebsite = op.website || (op as any).websiteUrl || (linkedCoach as any)?.website || (ownerTurfObjects[0] as any)?.website;
                    const websiteUrl = rawWebsite && rawWebsite.trim().length > 0 ? rawWebsite.trim() : null;

                    return (
                      <React.Fragment key={op.ownerId}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div>{op.displayName || op.businessName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {ownerTurfs.length === 0 ? (
                              <span className="text-slate-500 italic text-[11px]">No registered turfs</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {ownerTurfs.map((tName, i) => (
                                  <span key={i} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-slate-700/50">
                                    {tName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div>{op.email || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500">{op.phone || 'N/A'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase text-[10px]">
                              {planInfo.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {formatCurrency(planInfo.price)} <span className="text-[10px] text-slate-400 font-normal">/{intervalLabel}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Active
                              </span>
                            ) : isTrial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                14-Day Trial
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Pending Plan
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedOwnerId(isExpanded ? null : op.ownerId)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                linkedCoach
                                  ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {linkedCoach ? (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                                  <span>Coach & Plan Details</span>
                                </span>
                              ) : (
                                <span>Turf & Plan Info</span>
                              )}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Dropdown Sub-Panel for Owner & Coach/Academy Overview */}
                        {isExpanded && (
                          <tr className="bg-slate-950/90">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xl">
                                
                                {/* Header of dropdown panel */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-white">{op.businessName} — Entity Profile Overview</h4>
                                      <p className="text-[10px] text-slate-400">Owner ID: <span className="font-mono text-slate-300">{op.ownerId}</span></p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Location Link */}
                                    {locationUrl ? (
                                      <a
                                        href={locationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Location Link</span>
                                        <ExternalLink className="w-3 h-3 text-emerald-400/80" />
                                      </a>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-500 border border-slate-700/50 text-[10px] font-medium flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                        <span>No Location Link</span>
                                      </span>
                                    )}

                                    {/* Website Link */}
                                    {websiteUrl ? (
                                      <a
                                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                      >
                                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Website Link</span>
                                        <ExternalLink className="w-3 h-3 text-blue-400/80" />
                                      </a>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-500 border border-slate-700/50 text-[10px] font-medium flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                                        <span>No Website Link</span>
                                      </span>
                                    )}

                                    {linkedCoach ? (
                                      <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                        Dual Role: Turf Owner + Coach/Academy Head
                                      </span>
                                    ) : (
                                      <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                        Standard Turf Owner Entity
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left Panel: Turf Facility & Active SaaS Plan */}
                                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Registered Turfs & Turf SaaS Plan</span>
                                      </span>
                                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                        {ownerTurfs.length} {ownerTurfs.length === 1 ? 'Venue' : 'Venues'}
                                      </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Turf Business Name:</span>
                                        <span className="font-bold text-white">{op.businessName || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Owner Full Name:</span>
                                        <span className="font-bold text-white">{op.displayName || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Active Turf Plan:</span>
                                        <span className="font-bold text-emerald-400">{planInfo.name}</span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Price & Billing:</span>
                                        <span className="font-mono font-bold text-emerald-400">{formatCurrency(planInfo.price)} / {intervalLabel}</span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Subscription Status:</span>
                                        <span className="font-bold uppercase text-slate-200">{isActive ? 'Active' : isTrial ? '14-Day Free Trial' : isExpired ? 'Expired' : 'Pending'}</span>
                                      </div>
                                      <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Renewal / Expiry Date:</span>
                                        <span className="font-mono text-slate-200">
                                          {op.subscription?.expiryDate ? new Date(op.subscription.expiryDate).toLocaleDateString() : op.subscription?.trialEndsAt ? new Date(op.subscription.trialEndsAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                            All Registered Venues Under Account ({ownerTurfObjects.length || ownerTurfs.length}):
                                          </span>
                                        </div>
                                        {ownerTurfObjects.length === 0 && ownerTurfs.length === 0 ? (
                                          <p className="text-slate-500 italic text-[11px]">No registered turfs</p>
                                        ) : ownerTurfObjects.length > 0 ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {ownerTurfObjects.map((turf) => (
                                              <div
                                                key={turf.id}
                                                className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-sm"
                                              >
                                                <div className="space-y-0.5">
                                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="truncate">{turf.name}</span>
                                                  </div>
                                                  {(turf.city || turf.address) && (
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                                      <span className="truncate">{[turf.address, turf.city].filter(Boolean).join(', ')}</span>
                                                    </div>
                                                  )}
                                                  {turf.sports && turf.sports.length > 0 && (
                                                    <div className="text-[9px] text-emerald-300 font-medium pt-0.5">
                                                      Sports: {turf.sports.slice(0, 3).join(', ')}
                                                    </div>
                                                  )}
                                                </div>
                                                {turf.locationUrl ? (
                                                  <a
                                                    href={turf.locationUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0"
                                                    title="Open Location"
                                                  >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                  </a>
                                                ) : (turf.address || turf.city) ? (
                                                  <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${turf.name} ${turf.address || ''} ${turf.city || ''}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                                                    title="Search Map"
                                                  >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                  </a>
                                                ) : null}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5">
                                            {ownerTurfs.map((tName, i) => (
                                              <span key={i} className="bg-slate-900 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                {tName}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Panel: Coach & Academy Details (If linked) */}
                                  {linkedCoach ? (
                                    <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-4 space-y-3">
                                      <div className="flex items-center justify-between border-b border-teal-500/30 pb-2">
                                        <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                                          <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                                          <span>Coach & Academy SaaS Pass</span>
                                        </span>
                                        <span className="text-[10px] font-mono text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded font-bold">
                                          {linkedCoach.academyName || 'Independent Coaching'}
                                        </span>
                                      </div>

                                      <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-teal-950/60">
                                          <span className="text-slate-400">Academy / Coaching Business:</span>
                                          <span className="font-bold text-white">{linkedCoach.academyName || 'Independent Coach'}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-teal-950/60">
                                          <span className="text-slate-400">Coach Full Name:</span>
                                          <span className="font-bold text-teal-200">{linkedCoach.name || op.displayName}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-teal-950/60">
                                          <span className="text-slate-400">Sports & Specialization:</span>
                                          <span className="font-medium text-teal-200">{linkedCoach.sports?.join(', ') || 'General Sports'} ({linkedCoach.experienceYears || 1} yrs)</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-teal-950/60">
                                          <span className="text-slate-400">Annual Fee & Pass Status:</span>
                                          <span className="font-mono font-bold text-white">
                                            {linkedCoach.subscription?.isActive || linkedCoach.subscription?.paymentStatus === 'PAID'
                                              ? `Active (₹${(linkedCoach.subscription?.amountPaid || linkedCoach.platformFeePaid || (linkedCoach.academyName ? 4999 : 2999)).toLocaleString()}/yr)`
                                              : 'Unpaid / Pending Pass'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-teal-950/60">
                                          <span className="text-slate-400">Pass Expiry Date:</span>
                                          <span className="font-mono font-bold text-teal-300">
                                            {linkedCoach.subscription?.expiresAt ? new Date(linkedCoach.subscription.expiresAt).toLocaleDateString() : 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-slate-400">Enrolled Students / Trainees:</span>
                                          <span className="font-mono font-black text-purple-300">
                                            {linkedCoachEnrollments.length} {linkedCoachEnrollments.length === 1 ? 'player' : 'players'} enrolled
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center text-center space-y-2">
                                      <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
                                      <p className="text-xs font-bold text-slate-300">No Associated Coaching Academy</p>
                                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                        This turf owner has not registered as a coach or created an academy profile on TruFit.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Enrolled Trainees Roster if Coach Profile Exists */}
                                {linkedCoach && linkedCoachEnrollments.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-teal-400" />
                                      <span>Active Students Under {linkedCoach.academyName || linkedCoach.name}'s Academy ({linkedCoachEnrollments.length})</span>
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                                            <th className="py-2 px-3">Student Name</th>
                                            <th className="py-2 px-3">Sport / Batch</th>
                                            <th className="py-2 px-3">Contact</th>
                                            <th className="py-2 px-3">Enrollment Date</th>
                                            <th className="py-2 px-3">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40">
                                          {linkedCoachEnrollments.map((enr) => (
                                            <tr key={enr.id} className="text-slate-300">
                                              <td className="py-2 px-3 font-semibold text-white">{enr.playerName || 'Student'}</td>
                                              <td className="py-2 px-3 text-teal-300">{enr.sport || 'Sports Coaching'}</td>
                                              <td className="py-2 px-3 font-mono text-[11px]">{enr.playerPhone || enr.playerEmail || 'N/A'}</td>
                                              <td className="py-2 px-3 font-mono text-[11px]">
                                                {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : 'Active'}
                                              </td>
                                              <td className="py-2 px-3">
                                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                  Enrolled
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Venue-by-Venue Financial Breakdown Table */}
      {(streamFilter === 'ALL' || streamFilter === 'BOOKINGS') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Venue & Booking Revenue Breakdown</h3>
              <p className="text-xs text-slate-400">Detailed financial summary per turf business entity</p>
            </div>
          </div>

          {/* Interactive Payout Settlement Hover Inspection Banner */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Payout Settlement Inspection:</span>
            </span>

            {/* Settled Payouts Interactive Badge */}
            <div className="relative group/badgeSettled">
              <span className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatCurrency(totalSettledPayouts)} Disbursed ({settledPayoutPercent}%)</span>
              </span>

              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl opacity-0 group-hover/badgeSettled:opacity-100 pointer-events-none group-hover/badgeSettled:pointer-events-auto transition-all z-50 space-y-2">
                <div className="text-xs font-bold text-emerald-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>✅ Disbursed / Settled Payouts</span>
                  <span className="font-mono">{formatCurrency(totalSettledPayouts)}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Funds successfully processed and transferred into venue owner bank accounts after platform commission deduction.
                </p>
              </div>
            </div>

            {/* Pending Payout Requests Interactive Badge */}
            <div className="relative group/badgePending">
              <span className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{formatCurrency(totalPendingPayouts)} Pending Escrow ({pendingPayoutPercent}%)</span>
              </span>

              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-amber-500/40 rounded-xl p-3.5 shadow-2xl opacity-0 group-hover/badgePending:opacity-100 pointer-events-none group-hover/badgePending:pointer-events-auto transition-all z-50 space-y-2">
                <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>⏳ Pending Escrow Held in Gateway</span>
                  <span className="font-mono">{formatCurrency(totalPendingPayouts)}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Escrow funds secured for upcoming bookings awaiting completion or automated settlement cycle dispatch.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-3 px-4">Business / Venue</th>
                  <th className="py-3 px-4">Paid Bookings</th>
                  <th className="py-3 px-4">Online Escrow</th>
                  <th className="py-3 px-4">Cash Collected</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Disbursed</th>
                  <th className="py-3 px-4">Pending Escrow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredOverviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching turf businesses found.
                    </td>
                  </tr>
                ) : (
                  filteredOverviews.map((o) => (
                    <tr key={o.ownerId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div>{o.businessName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{o.turfNames?.join(', ')}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{o.totalPaidBookings}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        {formatCurrency(o.onlineAmountCollected)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                        {formatCurrency(o.cashAmountCollected)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white font-bold">
                        {formatCurrency(o.grossAmountCollected)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-300">
                        {formatCurrency(o.totalSettledAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-300 font-bold">
                        {formatCurrency(o.pendingPayoutAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coach & Academy Subscription Revenue & Student Enrollments Section */}
      {(streamFilter === 'ALL' || streamFilter === 'COACH_SAAS') && (
        <div id="admin-coach-revenue-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Coach & Academy SaaS Subscriptions & Player Enrollments
                </h3>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                  Coach SaaS Passes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated yearly subscription fees paid by coaches to TruFit Admin and live player enrollments roster.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search coach, academy, sport..."
                value={coachSearchTerm}
                onChange={(e) => setCoachSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Coach Breakdown Table with expandable students drilldown */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-3 px-4">Coach & Academy</th>
                  <th className="py-3 px-4">Sport / Specialization</th>
                  <th className="py-3 px-4">Pass Status</th>
                  <th className="py-3 px-4">Annual Fee & Pass Expiry</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Joined Players</th>
                  <th className="py-3 px-4 text-right">Student Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredCoaches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No coaches found. Coaches will appear here once they register and subscribe.
                    </td>
                  </tr>
                ) : (
                  filteredCoaches.map((c) => {
                    const coachEnrollments = enrollments.filter((e) => e.coachId === c.id);
                    const isExpanded = expandedCoachId === c.id;
                    const isVerified = c.isVerified || c.verificationStatus === 'VERIFIED';
                    const isPending = c.verificationStatus === 'PENDING_VERIFICATION' || (!c.isVerified && c.verificationStatus !== 'REJECTED');
                    
                    const hasPaid = Boolean(
                      c.subscription?.isActive ||
                      c.subscription?.paymentStatus === 'PAID' ||
                      (c.platformFeePaid && c.platformFeePaid > 0)
                    );

                    const amountPaid = hasPaid
                      ? (c.subscription?.amountPaid || c.platformFeePaid || (c.academyName ? 4999 : 2999))
                      : 0;

                    const isPassExpired = Boolean(
                      c.subscription?.expiresAt && new Date(c.subscription.expiresAt).getTime() < Date.now()
                    );

                    return (
                      <React.Fragment key={c.id}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={
                                  c.photoUrl ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                                }
                                alt={c.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                              />
                              <div>
                                <div className="font-bold text-white">{c.name}</div>
                                <div className="text-[11px] text-teal-400 font-normal">{c.academyName || 'Independent'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="font-medium text-slate-200">{c.sports?.join(', ') || 'General Sports'}</div>
                            <div className="text-[10px] text-slate-400">{c.experienceYears || 1} yrs experience</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {hasPaid && !isPassExpired ? (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Active Pass
                              </span>
                            ) : isPassExpired ? (
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                Expired
                              </span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pass Unpaid
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-teal-400">
                              {formatCurrency(amountPaid)}
                              <span className="text-[10px] text-slate-400 font-normal">/yr</span>
                            </div>
                            <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                              {c.subscription?.expiresAt ? (
                                <span>
                                  Expiry: {new Date(c.subscription.expiresAt).toLocaleDateString()}
                                  {isPassExpired && <span className="text-rose-400 ml-1">(Expired)</span>}
                                </span>
                              ) : hasPaid && c.createdAt ? (
                                <span>
                                  Expiry: {new Date(new Date(c.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-amber-400/80">Pending Payment</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isVerified ? (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            ) : isPending ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            ) : (
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                            {coachEnrollments.length} {coachEnrollments.length === 1 ? 'player' : 'players'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setExpandedCoachId(isExpanded ? null : c.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>{coachEnrollments.length} Trainees</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Enrolled Players Sub-Table */}
                        {isExpanded && (
                          <tr className="bg-slate-950/90">
                            <td colSpan={7} className="p-4">
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    Players Enrolled with {c.name} ({coachEnrollments.length})
                                  </h5>
                                  <span className="text-[11px] text-slate-400">
                                    Coach Contact: {c.phone} • {c.email}
                                  </span>
                                </div>

                                {coachEnrollments.length === 0 ? (
                                  <div className="p-4 text-center text-slate-500 text-xs">
                                    No players enrolled in this coach's batches yet.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">
                                          <th className="py-2 px-3">Player Name</th>
                                          <th className="py-2 px-3">Contact</th>
                                          <th className="py-2 px-3">Batch / Sport</th>
                                          <th className="py-2 px-3">Fee Paid</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3">Enrolled On</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60">
                                        {coachEnrollments.map((enr) => (
                                          <tr key={enr.id} className="hover:bg-slate-800/40">
                                            <td className="py-2.5 px-3 font-semibold text-white">{enr.playerName}</td>
                                            <td className="py-2.5 px-3 text-slate-400">{enr.playerPhone || 'Direct App'}</td>
                                            <td className="py-2.5 px-3 text-slate-300">{enr.batchTitle || 'Coaching Batch'}</td>
                                            <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">{formatCurrency(enr.feePaid || 0)}</td>
                                            <td className="py-2.5 px-3">
                                              <span className="bg-emerald-500/10 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                                                {enr.status || 'ACTIVE'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                              {new Date(enr.enrolledAt).toLocaleDateString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

