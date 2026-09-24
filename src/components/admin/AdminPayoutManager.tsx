import React, { useState, useEffect } from 'react';
import {
  OwnerSettlementOverview,
  OwnerPayoutRequest,
  getOwnerSettlementOverviews,
  markOwnerPayoutSettled,
  rejectOwnerPayoutRequest,
  listenAllPayoutRequests,
  getAllBookingsAdmin,
  getAllPayoutRecordsAdmin,
} from '../../lib/db';
import { Booking, OwnerPayoutRecord } from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
  Landmark,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  Building2,
  Copy,
  Check,
  Search,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Info,
  Calendar,
} from 'lucide-react';

interface AdminPayoutManagerProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminPayoutManager: React.FC<AdminPayoutManagerProps> = ({ showToast }) => {
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME'>('ALL_TIME');
  const [overviews, setOverviews] = useState<OwnerSettlementOverview[]>([]);
  const [allRequests, setAllRequests] = useState<OwnerPayoutRequest[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allPayouts, setAllPayouts] = useState<OwnerPayoutRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  // Settle / Disburse Modal State
  const [selectedOwner, setSelectedOwner] = useState<OwnerSettlementOverview | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OwnerPayoutRequest | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutTxnRef, setPayoutTxnRef] = useState<string>('');
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [settling, setSettling] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reject Request Modal State
  const [rejectingRequest, setRejectingRequest] = useState<OwnerPayoutRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [processingReject, setProcessingReject] = useState<boolean>(false);

  // Expanded turf request histories
  const [expandedOwnerHistory, setExpandedOwnerHistory] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewsData, bookingsData, payoutsData] = await Promise.all([
        getOwnerSettlementOverviews(),
        getAllBookingsAdmin(),
        getAllPayoutRecordsAdmin(),
      ]);
      setOverviews(overviewsData);
      setAllBookings(bookingsData);
      setAllPayouts(payoutsData);
    } catch (err) {
      showToast('Failed to load owner settlements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = listenAllPayoutRequests((reqs) => {
      setAllRequests(reqs);
      // Reload overviews when requests change to update badges
      getOwnerSettlementOverviews().then((data) => setOverviews(data)).catch(() => {});
    });
    return () => unsub();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('Copied to clipboard!', 'success');
  };

  const handleOpenDisburse = (owner: OwnerSettlementOverview, request?: OwnerPayoutRequest) => {
    setSelectedOwner(owner);
    setSelectedRequest(request || null);
    if (request) {
      setPayoutAmount(request.amount);
      setPayoutNotes(`Fulfilling withdrawal request for ${request.turfName || owner.businessName || 'turf'}`);
    } else {
      setPayoutAmount(owner.pendingPayoutAmount);
      setPayoutNotes('');
    }
    setPayoutTxnRef('');
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;
    if (!payoutTxnRef.trim()) {
      showToast('Please enter the bank transfer / UPI transaction UTR reference', 'error');
      return;
    }
    if (!payoutAmount || payoutAmount <= 0) {
      showToast('Please enter a valid payout amount', 'error');
      return;
    }

    try {
      setSettling(true);
      await markOwnerPayoutSettled({
        ownerId: selectedOwner.ownerId,
        amount: payoutAmount,
        payoutTxnRef: payoutTxnRef.trim(),
        requestId: selectedRequest?.id || undefined,
        notes: payoutNotes.trim() || undefined,
      });
      showToast(`Payout of ₹${payoutAmount.toLocaleString('en-IN')} marked as SETTLED!`, 'success');
      setSelectedOwner(null);
      setSelectedRequest(null);
      setPayoutTxnRef('');
      setPayoutNotes('');
      await loadData();
    } catch (err) {
      showToast('Failed to record payout settlement', 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleRejectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejecting the withdrawal request', 'error');
      return;
    }

    try {
      setProcessingReject(true);
      await rejectOwnerPayoutRequest({
        requestId: rejectingRequest.id,
        reason: rejectReason.trim(),
      });
      showToast(`Withdrawal request of ₹${rejectingRequest.amount} marked as REJECTED`, 'success');
      setRejectingRequest(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      showToast('Failed to reject withdrawal request', 'error');
    } finally {
      setProcessingReject(false);
    }
  };

  const toggleHistory = (ownerId: string) => {
    setExpandedOwnerHistory((prev) => ({
      ...prev,
      [ownerId]: !prev[ownerId],
    }));
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

  const effectiveBookings = allBookings.filter((b) => {
    if (b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PARTIAL') return false;
    return isDateInTimeRange(b.createdAt || b.bookingDate || b.date);
  });

  const effectiveRequests = allRequests.filter((r) =>
    isDateInTimeRange(r.requestedAt || r.date || (r as any).createdAt || (r as any).processedAt)
  );

  const effectiveSettledRequests = allRequests.filter((r) =>
    r.status === 'COMPLETED' && isDateInTimeRange(r.processedAt || r.date || (r as any).createdAt)
  );

  const effectivePayouts = allPayouts.filter((p) =>
    isDateInTimeRange(p.paidAt || p.createdAt)
  );

  // Pending Withdrawal Requests across all owners
  const pendingRequests = effectiveRequests.filter((r) => r.status === 'REQUESTED');
  const totalRequestedWithdrawals = pendingRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Aggregate Totals calculation
  const allTimeGross = overviews.reduce((acc, o) => acc + o.grossAmountCollected, 0);
  const allTimeOnline = overviews.reduce((acc, o) => acc + (o.onlineAmountCollected || 0), 0);
  const allTimeCash = overviews.reduce((acc, o) => acc + (o.cashAmountCollected || 0), 0);
  const allTimeFees = overviews.reduce((acc, o) => acc + o.platformConvenienceFees, 0);
  const allTimeSettled = overviews.reduce((acc, o) => acc + o.totalSettledAmount, 0);
  const allTimePending = overviews.reduce((acc, o) => acc + o.pendingPayoutAmount, 0);

  let totalGrossCollected = 0;
  let totalOnlineCollected = 0;
  let totalCashCollected = 0;
  let totalPlatformFees = 0;
  let totalSettled = 0;
  let totalPending = 0;

  if (timeRange === 'ALL_TIME') {
    // When ALL_TIME is selected, use cumulative overviews totals
    totalGrossCollected = allTimeGross;
    totalOnlineCollected = allTimeOnline;
    totalCashCollected = allTimeCash;
    totalPlatformFees = allTimeFees;
    totalSettled = allTimeSettled;
    totalPending = allTimePending;
  } else {
    // Calculate exact totals for selected time range (Today, Weekly, Monthly, Yearly)
    const calcGross = effectiveBookings.reduce((acc, b) => acc + (b.amountPaid || b.totalAmount || 0), 0);
    
    const calcOnline = effectiveBookings.reduce((acc, b) => {
      const methodStr = (b.paymentMethod as string) || '';
      const isCash = methodStr === 'CASH' || methodStr === 'PAY_AT_VENUE' || methodStr === 'PAY_LATER_AT_TURF' || methodStr === 'CASH_OR_COUNTER_UPI';
      return !isCash ? acc + (b.amountPaid || b.totalAmount || 0) : acc;
    }, 0);

    const calcCash = effectiveBookings.reduce((acc, b) => {
      const methodStr = (b.paymentMethod as string) || '';
      const isCash = methodStr === 'CASH' || methodStr === 'PAY_AT_VENUE' || methodStr === 'PAY_LATER_AT_TURF' || methodStr === 'CASH_OR_COUNTER_UPI';
      return isCash ? acc + (b.amountPaid || b.totalAmount || 0) : acc;
    }, 0);

    const calcFees = effectiveBookings.reduce((acc, b) => acc + (b.convenienceFee || 0), 0);

    // Settled payouts in this time range
    const settledFromRequests = effectiveSettledRequests.reduce((acc, r) => acc + (r.amount || 0), 0);
    const settledFromRecords = effectivePayouts.reduce((acc, p) => acc + (p.netPayoutAmount || p.grossAmount || 0), 0);
    const settledFromBookings = effectiveBookings
      .filter((b) => b.settlementStatus === 'SETTLED')
      .reduce((acc, b) => {
        const paid = b.amountPaid || b.totalAmount || 0;
        const cFee = b.convenienceFee || 0;
        const oShare = b.ownerShare !== undefined ? b.ownerShare : Math.max(0, paid - cFee);
        return acc + oShare;
      }, 0);

    const calcSettled = Math.max(settledFromRequests, settledFromRecords, settledFromBookings);

    const calcPending = effectiveBookings
      .filter((b) => {
        const methodStr = (b.paymentMethod as string) || '';
        const isCash = methodStr === 'CASH' || methodStr === 'PAY_AT_VENUE' || methodStr === 'PAY_LATER_AT_TURF' || methodStr === 'CASH_OR_COUNTER_UPI';
        return !isCash && b.settlementStatus !== 'SETTLED';
      })
      .reduce((acc, b) => {
        const paid = b.amountPaid || b.totalAmount || 0;
        const cFee = b.convenienceFee || 0;
        const oShare = b.ownerShare !== undefined ? b.ownerShare : Math.max(0, paid - cFee);
        return acc + oShare;
      }, 0);

    totalGrossCollected = Math.min(calcGross, allTimeGross);
    totalOnlineCollected = Math.min(calcOnline, allTimeOnline);
    totalCashCollected = Math.min(calcCash, allTimeCash);
    totalPlatformFees = Math.min(calcFees, allTimeFees);
    totalSettled = Math.min(calcSettled, allTimeSettled);
    totalPending = Math.min(calcPending, allTimePending);
  }

  // Inspection Ratio Calculations
  const onlinePercent = totalGrossCollected > 0 ? Math.round((totalOnlineCollected / totalGrossCollected) * 100) : 0;
  const cashPercent = totalGrossCollected > 0 ? 100 - onlinePercent : 0;

  const totalPayoutPool = totalSettled + totalRequestedWithdrawals;
  const settledPercent = totalPayoutPool > 0 ? Math.round((totalSettled / totalPayoutPool) * 100) : 0;
  const requestedPercent = totalPayoutPool > 0 ? 100 - settledPercent : 0;

  const filtered = overviews.filter(
    (o) =>
      o.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      o.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      o.turfNames.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs">Calculating platform collections & owner shares...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model 1 Educational Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Model 1: Centralized TruFit Gateway & Automated Settlements
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Active Architecture
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              All athletes pay centrally through the TruFit Razorpay Gateway. Bookings are automatically verified with zero manual checking by turf owners. TruFit retains convenience fees, and you disburse the net turf shares directly to each owner's bank account or UPI ID when they request a withdrawal.
            </p>
          </div>
        </div>
      </div>

      {/* Time Horizon Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Payouts & Collections Time Horizon</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {timeRange === 'TODAY' && '⚡ TODAY'}
                {timeRange === 'WEEKLY' && '📅 WEEKLY (7 DAYS)'}
                {timeRange === 'MONTHLY' && '📆 MONTHLY (30 DAYS)'}
                {timeRange === 'YEARLY' && '📊 YEARLY (365 DAYS)'}
                {timeRange === 'ALL_TIME' && '♾️ ALL TIME'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Filter settlement balances and owner withdrawal queue requests by date.
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
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60 ring-1 ring-indigo-400/50'
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

      {/* Stats Ribbon with Online & Cash Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl relative overflow-visible group/revInspection hover:border-indigo-500/50 transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-slate-300" />
              <span>Total Revenue</span>
            </span>
            <Info className="w-3 h-3 text-slate-500 group-hover/revInspection:text-indigo-400 transition-colors" />
          </span>
          <p className="text-xl font-extrabold text-white mt-1">₹{totalGrossCollected.toLocaleString('en-IN')}</p>
          
          {/* Mini Ratio Bar */}
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex cursor-pointer">
            <div style={{ width: `${onlinePercent}%` }} className="bg-indigo-500 h-full"></div>
            <div style={{ width: `${cashPercent}%` }} className="bg-amber-500 h-full"></div>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1 font-medium">{onlinePercent}% Online | {cashPercent}% Cash</span>

          {/* FLOATING HOVER INSPECTION TOOLTIP */}
          <div className="absolute left-0 top-full mt-2 w-72 bg-slate-950/95 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/revInspection:opacity-100 pointer-events-none group-hover/revInspection:pointer-events-auto transition-all z-50 space-y-2">
            <div className="text-xs font-bold text-white border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span>Gross Collection Split</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">100%</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20">
                <span className="text-indigo-200 font-medium text-[11px]">💳 Razorpay App Online</span>
                <span className="font-mono font-bold text-indigo-300 text-[11px]">₹{totalOnlineCollected.toLocaleString('en-IN')} ({onlinePercent}%)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/20">
                <span className="text-amber-200 font-medium text-[11px]">💵 Venue On-Spot Cash</span>
                <span className="font-mono font-bold text-amber-300 text-[11px]">₹{totalCashCollected.toLocaleString('en-IN')} ({cashPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-indigo-900/40 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paid Online (App)</span>
          </span>
          <p className="text-xl font-extrabold text-indigo-300 mt-1">₹{totalOnlineCollected.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-indigo-400/80">Razorpay & App Gateway</span>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Cash at Venue</span>
          </span>
          <p className="text-xl font-extrabold text-amber-300 mt-1">₹{totalCashCollected.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-amber-400/80">Collected at Turf counter</span>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Platform Revenue</span>
          </span>
          <p className="text-xl font-extrabold text-emerald-400 mt-1">₹{totalPlatformFees.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-500/70">Convenience fees retained</span>
        </div>

        {/* Total Amount Withdrawn Card */}
        <div className="bg-slate-900 border border-emerald-900/40 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Withdrawn</span>
          </span>
          <p className="text-xl font-extrabold text-emerald-400 mt-1">₹{totalSettled.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-400/80">Transferred to owner accounts</span>
        </div>

        {/* Requested Withdrawal Queue Card */}
        <div className={`p-3.5 rounded-2xl border relative overflow-visible group/withdrawInspection transition-all ${
          pendingRequests.length > 0
            ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-950/30 hover:border-amber-400'
            : 'bg-slate-900 border-amber-900/40 hover:border-amber-700/60'
        }`}>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Requested Payouts</span>
            </span>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </span>
          <p className="text-xl font-extrabold text-amber-400 mt-1">₹{totalRequestedWithdrawals.toLocaleString('en-IN')}</p>
          
          {/* Mini Ratio Bar */}
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex cursor-pointer">
            <div style={{ width: `${settledPercent}%` }} className="bg-emerald-500 h-full"></div>
            <div style={{ width: `${requestedPercent}%` }} className="bg-amber-500 h-full"></div>
          </div>
          <span className="text-[9px] text-amber-300/80 block mt-1 font-medium">
            {pendingRequests.length > 0 ? `${pendingRequests.length} pending requests` : 'No active requests'}
          </span>

          {/* FLOATING HOVER INSPECTION TOOLTIP */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/withdrawInspection:opacity-100 pointer-events-none group-hover/withdrawInspection:pointer-events-auto transition-all z-50 space-y-2.5">
            <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Withdrawal Queue Inspection</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{pendingRequests.length} Requests</span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-[11px] text-emerald-400 font-medium italic">🎉 All withdrawal requests are processed & settled!</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-amber-200 block truncate">{req.ownerName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{req.payoutMethod || 'UPI / Bank Transfer'}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 text-xs shrink-0">₹{(req.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Total Unsettled Pending Balance Card */}
        <div className="bg-slate-900 border border-sky-900/40 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Pending Payout</span>
          </span>
          <p className="text-xl font-extrabold text-sky-300 mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-sky-400/80">Unsettled venue balances</span>
        </div>
      </div>

      {/* ACTIVE WITHDRAWAL REQUESTS QUEUE */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-2">
                  <span>Active Owner Withdrawal Requests</span>
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Turf owners have submitted withdrawal requests for their online earnings. Review details and disburse.
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded-xl">
              Total Requested: ₹{totalRequestedWithdrawals.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingRequests.map((req) => {
              const matchedOwner = overviews.find((o) => o.ownerId === req.ownerId);
              return (
                <div
                  key={req.id}
                  className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{req.turfName || matchedOwner?.businessName || 'Turf Arena'}</span>
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {req.ownerName || matchedOwner?.ownerName || 'Turf Owner'}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Requested Amount</span>
                        <span className="text-base font-black text-amber-400">
                          ₹{req.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Destination Coordinates */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate font-mono">{req.destination}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(req.destination, `dest-${req.id}`)}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                        title="Copy Destination"
                      >
                        {copiedKey === `dest-${req.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Date: {new Date(req.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {matchedOwner && (
                        <span className="text-slate-300">
                          Pending Balance: <strong className="text-white">₹{matchedOwner.pendingPayoutAmount.toLocaleString('en-IN')}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRejectingRequest(req)}
                      className="px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-rose-900/40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (matchedOwner) {
                          handleOpenDisburse(matchedOwner, req);
                        } else {
                          // Fallback mock owner overview for disburse
                          handleOpenDisburse({
                            ownerId: req.ownerId,
                            ownerName: req.ownerName || 'Turf Owner',
                            businessName: req.turfName,
                            turfNames: req.turfName ? [req.turfName] : [],
                            totalPaidBookings: 0,
                            grossAmountCollected: req.amount,
                            onlineAmountCollected: req.amount,
                            cashAmountCollected: 0,
                            platformConvenienceFees: 0,
                            netOwnerShareTotal: req.amount,
                            totalSettledAmount: 0,
                            pendingPayoutAmount: req.amount,
                            unsettledBookingsCount: 0,
                            upiId: req.destination.includes('@') ? req.destination : undefined,
                            accountNumber: !req.destination.includes('@') ? req.destination : undefined,
                          }, req);
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Settle Requested ₹{req.amount.toLocaleString('en-IN')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Owner Settlements Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-400" />
              <span>Owner Payout Ledger (By Turf)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review accumulated earnings and withdrawal requests per turf and disburse payouts directly to their bank or UPI.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search turf or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No owner settlement records found matching your search.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const pendingReqs = item.pendingWithdrawalRequests || [];
              const hasPendingWithdrawal = pendingReqs.length > 0;
              const isHistoryOpen = !!expandedOwnerHistory[item.ownerId];
              const allOwnerRequests = item.allWithdrawalRequests || [];

              return (
                <div
                  key={item.ownerId}
                  className={`bg-slate-950/70 border rounded-2xl p-4 sm:p-5 transition-all ${
                    hasPendingWithdrawal
                      ? 'border-amber-500/50 shadow-lg shadow-amber-950/20'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Owner Info & Bank Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{item.ownerName}</h4>
                        {item.businessName && item.businessName !== item.ownerName && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({item.businessName})
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          ⚡ Plan: {item.subscribedPlanName || 'Standard Plan'} ({item.subscriptionStatus || 'ACTIVE'})
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {item.totalPaidBookings} Online Bookings
                        </span>
                        {hasPendingWithdrawal && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <ArrowDownToLine className="w-3 h-3 text-amber-400" />
                            <span>Withdrawal Asked: ₹{item.requestedWithdrawalTotal?.toLocaleString('en-IN')}</span>
                          </span>
                        )}
                      </div>

                      {item.turfNames.length > 0 && (
                        <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{item.turfNames.join(', ')}</span>
                        </p>
                      )}

                      {/* Bank / UPI Details Badge */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {item.accountNumber ? (
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                            <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              {item.bankName || 'Bank'}: ••••{item.accountNumber.slice(-4)} | IFSC: {item.ifscCode || 'N/A'}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${item.accountNumber} ${item.ifscCode}`, `bank-${item.ownerId}`)}
                              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                              title="Copy Account & IFSC"
                            >
                              {copiedKey === `bank-${item.ownerId}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No bank account saved</span>
                        )}

                        {item.upiId && (
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                            <span>UPI: {item.upiId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.upiId!, `upi-${item.ownerId}`)}
                              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                              title="Copy UPI ID"
                            >
                              {copiedKey === `upi-${item.ownerId}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Request History Dropdown Toggle */}
                        {allOwnerRequests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleHistory(item.ownerId)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                          >
                            <span>{allOwnerRequests.length} Withdrawal Request{allOwnerRequests.length !== 1 ? 's' : ''}</span>
                            {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Breakdown & Action */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-left">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                            Gross Revenue
                          </span>
                          <p className="text-xs font-black text-white">
                            ₹{item.grossAmountCollected.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-indigo-400 uppercase font-bold tracking-wider block">
                            Paid Online
                          </span>
                          <p className="text-xs font-black text-indigo-300">
                            ₹{(item.onlineAmountCollected || 0).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-amber-400 uppercase font-bold tracking-wider block">
                            Cash at Venue
                          </span>
                          <p className="text-xs font-black text-amber-300">
                            ₹{(item.cashAmountCollected || 0).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider block">
                            Net Online Share
                          </span>
                          <p className="text-xs font-black text-emerald-300">
                            ₹{item.netOwnerShareTotal.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left pl-2 border-l border-slate-800">
                          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                            Pending Payout
                          </span>
                          <p className="text-sm font-extrabold text-amber-400">
                            ₹{item.pendingPayoutAmount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {item.unsettledBookingsCount} unsettled
                          </span>
                        </div>

                      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {hasPendingWithdrawal ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDisburse(item, pendingReqs[0])}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-950/50 whitespace-nowrap"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>Settle Withdrawal (₹{pendingReqs[0].amount.toLocaleString('en-IN')})</span>
                          </button>
                        ) : item.pendingPayoutAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDisburse(item)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Disburse Payout</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 w-full sm:w-auto">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>All Settled</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Expandable Withdrawal History for this Turf */}
                  {isHistoryOpen && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Withdrawal History for {item.businessName || item.turfNames.join(', ') || item.ownerName}</span>
                      </h5>
                      <div className="divide-y divide-slate-800/60 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                        {allOwnerRequests.map((req) => (
                          <div key={req.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">₹{req.amount.toLocaleString('en-IN')}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                  req.status === 'COMPLETED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : req.status === 'REJECTED'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Dest: {req.destination} {req.utr && req.utr !== 'Pending' ? `• UTR: ${req.utr}` : ''}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400">
                                {new Date(req.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {req.status === 'REQUESTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDisburse(item, req)}
                                  className="text-amber-400 hover:text-amber-300 text-[11px] font-bold ml-3 cursor-pointer underline"
                                >
                                  Process Now
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disburse / Settle Payout Modal */}
      {selectedOwner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {selectedRequest ? 'Settle Requested Withdrawal' : 'Record Owner Payout'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOwner(null);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedRequest && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold">⚡ Fulfilling Owner Withdrawal Request:</span>
                  <span className="text-amber-400 font-extrabold text-sm">₹{selectedRequest.amount.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Requested on: {new Date(selectedRequest.date).toLocaleString('en-IN')}
                </p>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Recipient Turf & Owner:</span>
                <span className="font-bold text-white text-right">
                  {selectedOwner.businessName || selectedOwner.turfNames.join(', ') || selectedOwner.ownerName}
                  <span className="block text-[11px] text-slate-400 font-normal">({selectedOwner.ownerName})</span>
                </span>
              </div>
              {selectedRequest?.destination ? (
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Requested Payout To:</span>
                  <span className="font-mono text-emerald-300 font-bold">{selectedRequest.destination}</span>
                </div>
              ) : (
                <>
                  {selectedOwner.accountNumber && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Bank Account:</span>
                      <span className="font-mono text-slate-200">
                        {selectedOwner.bankName}: {selectedOwner.accountNumber} ({selectedOwner.ifscCode})
                      </span>
                    </div>
                  )}
                  {selectedOwner.upiId && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">UPI ID:</span>
                      <span className="font-mono text-emerald-300">{selectedOwner.upiId}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Payout Amount (₹): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm font-bold focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Bank Transfer / UPI UTR Reference: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR19283019283 or IMPS-928192"
                  value={payoutTxnRef}
                  onChange={(e) => setPayoutTxnRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the transaction UTR reference number from your bank or UPI app after transferring the funds.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Payout Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Settled weekly earnings for booked slots"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOwner(null);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  {settling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{settling ? 'Recording...' : 'Confirm Settlement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Reject Withdrawal Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Turf / Owner:</span>
                <span className="font-bold text-white">{rejectingRequest.turfName || rejectingRequest.ownerName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-rose-400">₹{rejectingRequest.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleRejectRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Reason for Rejection: <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Invalid bank account details or pending dispute resolution"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs focus:border-rose-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReject}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {processingReject ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{processingReject ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
