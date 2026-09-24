import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Building,
  Users,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  Info,
} from 'lucide-react';
import { CoachProfile, CoachEnrollment, CoachVerificationStatus } from '../../types';
import {
  getCoaches,
  listenCoaches,
  verifyCoachProfile,
  getAllCoachEnrollments,
} from '../../lib/db';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface AdminCoachVerificationManagerProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminCoachVerificationManager: React.FC<AdminCoachVerificationManagerProps> = ({ showToast }) => {
  const { user, profile } = useAuth();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [enrollments, setEnrollments] = useState<CoachEnrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME'>('ALL_TIME');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  // Modal / Inspection state
  const [inspectCoach, setInspectCoach] = useState<CoachProfile | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalCoach, setRejectModalCoach] = useState<CoachProfile | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allCoaches, allEnrollments] = await Promise.all([
        getCoaches().catch(() => []),
        getAllCoachEnrollments().catch(() => []),
      ]);
      setCoaches(allCoaches);
      setEnrollments(allEnrollments);
    } catch (err) {
      console.error('Error loading coaches for admin verification:', err);
      showToast('Failed to load coaches list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time listener for coaches
    const unsubscribe = listenCoaches((updatedCoaches) => {
      setCoaches(updatedCoaches);
      setLoading(false);
    });
    // Load enrollments
    getAllCoachEnrollments().then((res) => setEnrollments(res)).catch(() => {});

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleApprove = async (coach: CoachProfile) => {
    try {
      setActionLoading(true);
      const adminEmail = user?.email || profile?.displayName || 'admin@turfit.com';
      await verifyCoachProfile(coach.id, true, 'VERIFIED', 'Verified ID and certification credentials confirmed by Turfit Admin.', adminEmail);
      showToast(`Coach "${coach.name}" approved & published live on Turfit!`, 'success');
      if (inspectCoach?.id === coach.id) {
        setInspectCoach(null);
      }
      loadData();
    } catch (err: any) {
      console.error('Failed to approve coach:', err);
      showToast(err.message || 'Failed to approve coach.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModalCoach) return;
    try {
      setActionLoading(true);
      const adminEmail = user?.email || profile?.displayName || 'admin@turfit.com';
      await verifyCoachProfile(
        rejectModalCoach.id,
        false,
        'REJECTED',
        rejectReason.trim() || 'ID or Certification documents require clarification. Please update and re-submit.',
        adminEmail
      );
      showToast(`Coach "${rejectModalCoach.name}" verification rejected. Feedback recorded.`, 'success');
      setRejectModalCoach(null);
      setRejectReason('');
      if (inspectCoach?.id === rejectModalCoach.id) {
        setInspectCoach(null);
      }
      loadData();
    } catch (err: any) {
      console.error('Failed to reject coach:', err);
      showToast(err.message || 'Failed to update coach status.', 'error');
    } finally {
      setActionLoading(false);
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

  const effectiveCoaches = coaches.filter((c) =>
    isDateInTimeRange(c.createdAt || c.verifiedAt || c.subscription?.subscribedAt)
  );

  // Metrics
  const pendingCoachesList = effectiveCoaches.filter(
    (c) => c.verificationStatus === 'PENDING_VERIFICATION' || (!c.isVerified && c.verificationStatus !== 'REJECTED')
  );
  const verifiedCoachesList = effectiveCoaches.filter((c) => c.isVerified || c.verificationStatus === 'VERIFIED');
  const rejectedCoachesList = effectiveCoaches.filter((c) => c.verificationStatus === 'REJECTED');

  const pendingCount = pendingCoachesList.length;
  const verifiedCount = verifiedCoachesList.length;
  const rejectedCount = rejectedCoachesList.length;
  const totalSubRevenue = effectiveCoaches.reduce((acc, c) => acc + (c.subscription?.amountPaid || c.platformFeePaid || 0), 0);

  // Ratio calculations
  const totalCoachProfiles = effectiveCoaches.length;
  const verifiedPercent = totalCoachProfiles > 0 ? Math.round((verifiedCount / totalCoachProfiles) * 100) : 0;
  const pendingPercent = totalCoachProfiles > 0 ? Math.round((pendingCount / totalCoachProfiles) * 100) : 0;
  const rejectedPercent = totalCoachProfiles > 0 ? 100 - verifiedPercent - pendingPercent : 0;

  // Sports list for filtering
  const allSports = Array.from(new Set(effectiveCoaches.flatMap((c) => c.sports || []))).filter(Boolean);

  // Filtered coaches
  const filteredCoaches = effectiveCoaches.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.academyName && c.academyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.sports && c.sports.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (selectedSport !== 'ALL' && !c.sports?.includes(selectedSport)) {
      return false;
    }

    if (statusFilter === 'PENDING') {
      return c.verificationStatus === 'PENDING_VERIFICATION' || (!c.isVerified && c.verificationStatus !== 'REJECTED');
    }
    if (statusFilter === 'VERIFIED') {
      return c.isVerified || c.verificationStatus === 'VERIFIED';
    }
    if (statusFilter === 'REJECTED') {
      return c.verificationStatus === 'REJECTED';
    }

    return true;
  });

  return (
    <div id="admin-coach-verification-manager" className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Coach & Academy Verification Hub
            </h1>
            {pendingCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Review submitted government IDs, phone verification status, coaching certifications, and yearly subscription passes before publishing live on Turfit.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Time Horizon Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Coach Approvals Time Horizon</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {timeRange === 'TODAY' && '⚡ TODAY'}
                {timeRange === 'WEEKLY' && '📅 WEEKLY (7 DAYS)'}
                {timeRange === 'MONTHLY' && '📆 MONTHLY (30 DAYS)'}
                {timeRange === 'YEARLY' && '📊 YEARLY (365 DAYS)'}
                {timeRange === 'ALL_TIME' && '♾️ ALL TIME'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Filter coach registrations, verification queues, and pass payments by date.
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
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 ring-1 ring-amber-400/50'
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Verification with Hover Inspection Tooltip */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-visible group/pendingInspection hover:border-amber-500/50 transition-all">
          <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
          <h3 className="text-2xl font-black text-amber-400 mt-1.5">{pendingCount}</h3>
          
          {/* Mini Ratio Bar */}
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex cursor-pointer">
            <div style={{ width: `${pendingPercent}%` }} className="bg-amber-500 h-full"></div>
            <div style={{ width: `${verifiedPercent}%` }} className="bg-emerald-500 h-full"></div>
            <div style={{ width: `${rejectedPercent}%` }} className="bg-rose-500 h-full"></div>
          </div>
          <span className="text-[10px] text-amber-400/90 block mt-1 font-medium">{pendingPercent}% of all registrations</span>

          {/* FLOATING HOVER INSPECTION TOOLTIP */}
          <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/pendingInspection:opacity-100 pointer-events-none group-hover/pendingInspection:pointer-events-auto transition-all z-50 space-y-2.5">
            <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Pending Review Queue ({pendingCount})</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{pendingPercent}% Queue</span>
            </div>

            {pendingCount === 0 ? (
              <p className="text-[11px] text-emerald-400 font-medium italic">🎉 All submitted coach profiles are verified!</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pendingCoachesList.slice(0, 5).map((c) => (
                  <div key={c.id} className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-amber-200 block truncate">{c.academyName || c.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {c.sports?.join(', ') || 'General Athletics'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                      REVIEW
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Verified Coaches with Hover Inspection Tooltip */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-visible group/verifiedInspection hover:border-emerald-500/50 transition-all">
          <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Verified Live Coaches</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1.5">{verifiedCount}</h3>
          
          {/* Mini Ratio Bar */}
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex cursor-pointer">
            <div style={{ width: `${verifiedPercent}%` }} className="bg-emerald-500 h-full"></div>
            <div style={{ width: `${pendingPercent}%` }} className="bg-amber-500 h-full"></div>
            <div style={{ width: `${rejectedPercent}%` }} className="bg-rose-500 h-full"></div>
          </div>
          <span className="text-[10px] text-emerald-400/90 block mt-1 font-medium">{verifiedPercent}% Active Verification Rate</span>

          {/* FLOATING HOVER INSPECTION TOOLTIP */}
          <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/verifiedInspection:opacity-100 pointer-events-none group-hover/verifiedInspection:pointer-events-auto transition-all z-50 space-y-2.5">
            <div className="text-xs font-bold text-emerald-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Coaches Breakdown</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{verifiedPercent}% Verified</span>
            </div>

            {verifiedCount === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No verified coaches yet</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {verifiedCoachesList.slice(0, 5).map((c) => (
                  <div key={c.id} className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-emerald-200 block truncate">{c.academyName || c.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {c.sports?.slice(0, 2).join(', ') || 'Multi-Sport'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      LIVE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Yearly Subscription Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Coach Pass Revenue</span>
          <h3 className="text-2xl font-black text-white mt-1.5">{formatCurrency(totalSubRevenue)}</h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Annual subscription passes paid</span>
          </div>
        </div>

        {/* Total Trainees Enrolled */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="absolute right-3 top-3 p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Trainees Joined</span>
          <h3 className="text-2xl font-black text-purple-400 mt-1.5">{enrollments.length}</h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Across all batches</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Coach, Academy, Email, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({coaches.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'PENDING' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('VERIFIED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'VERIFIED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Verified ({verifiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'REJECTED' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          {/* Sport filter */}
          {allSports.length > 0 && (
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Sports</option>
              {allSports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Coach Queue Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Registered Coaches Verification Queue</h3>
            <p className="text-xs text-slate-400">
              Showing {filteredCoaches.length} registered coaches and academies
            </p>
          </div>
        </div>

        {filteredCoaches.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">No coaches found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredCoaches.map((coach) => {
              const isPending =
                coach.verificationStatus === 'PENDING_VERIFICATION' ||
                (!coach.isVerified && coach.verificationStatus !== 'REJECTED');
              const isVerified = coach.isVerified || coach.verificationStatus === 'VERIFIED';
              const isRejected = coach.verificationStatus === 'REJECTED';
              const coachEnrollmentsCount = enrollments.filter((e) => e.coachId === coach.id).length;

              return (
                <div
                  key={coach.id}
                  className="p-5 hover:bg-slate-800/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left: Coach Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={
                        coach.photoUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={coach.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shrink-0 shadow-md"
                    />

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white">{coach.name}</h4>
                        {coach.academyName && (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {coach.academyName}
                          </span>
                        )}

                        {/* Status Badge */}
                        {isVerified && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Live on TurFit
                          </span>
                        )}
                        {isPending && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Admin Review
                          </span>
                        )}
                        {isRejected && (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {coach.phone}
                          {coach.phoneVerified && (
                            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> OTP Verified
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {coach.email}
                        </span>
                        <span className="text-slate-300">
                          <strong>{coach.experienceYears || 1}</strong> yrs experience
                        </span>
                        <span className="text-purple-300 font-semibold">
                          {coachEnrollmentsCount} students joined
                        </span>
                      </div>

                      {/* Sports & Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {coach.sports?.map((sp) => (
                          <span
                            key={sp}
                            className="bg-slate-800 text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-700"
                          >
                            {sp}
                          </span>
                        ))}
                        {coach.specialization && (
                          <span className="bg-indigo-500/10 text-indigo-300 text-[11px] font-medium px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {coach.specialization}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Verification Details & Subscription Pass */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row gap-4 shrink-0 lg:w-96 text-xs">
                    {/* ID & Certification Card */}
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-slate-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                        ID & Certification
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-300 font-semibold">{coach.idProofType || 'Government ID'}:</span>{' '}
                        {coach.idProofNumber || 'Submitted'}
                      </div>
                      {coach.certificationTitle && (
                        <div className="text-slate-400 truncate">
                          <span className="text-slate-300 font-semibold">Cert:</span> {coach.certificationTitle}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {coach.idProofImageUrl && (
                          <button
                            onClick={() =>
                              setPreviewDocUrl({
                                url: coach.idProofImageUrl!,
                                title: `${coach.name}'s ID Proof (${coach.idProofType || 'ID Card'})`,
                              })
                            }
                            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer underline"
                          >
                            <Eye className="w-3 h-3" /> View ID
                          </button>
                        )}
                        {coach.certificationProofUrl && (
                          <button
                            onClick={() =>
                              setPreviewDocUrl({
                                url: coach.certificationProofUrl!,
                                title: `${coach.name}'s Certification Document`,
                              })
                            }
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer underline"
                          >
                            <Award className="w-3 h-3" /> View Certificate
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subscription Pass Info */}
                    <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-3.5 flex-1">
                      <div className="font-bold text-slate-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        Annual Pass
                      </div>
                      <div className="font-semibold text-white">
                        {coach.subscription?.planName || 'Coach Pro Pass'}
                      </div>
                      <div className="text-emerald-400 font-bold font-mono">
                        {formatCurrency(coach.subscription?.amountPaid || coach.platformFeePaid || 2999)}/yr
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Status:{' '}
                        <span className="text-emerald-400 font-bold">
                          {coach.subscription?.paymentStatus || 'PAID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap lg:flex-col items-center justify-end gap-2 shrink-0">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleApprove(coach)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve & Publish Live
                        </button>
                        <button
                          onClick={() => {
                            setRejectModalCoach(coach);
                            setRejectReason(coach.verificationNotes || '');
                          }}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject / Feedback
                        </button>
                      </>
                    ) : isVerified ? (
                      <>
                        <button
                          onClick={() => {
                            setRejectModalCoach(coach);
                            setRejectReason('Temporarily suspended for verification audit.');
                          }}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Suspend Coach
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleApprove(coach)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Re-Approve Live
                      </button>
                    )}

                    <button
                      onClick={() => setInspectCoach(coach)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Full Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                {previewDocUrl.title}
              </h3>
              <button
                onClick={() => setPreviewDocUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={previewDocUrl.url}
                alt="Document preview"
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDocUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Feedback Modal */}
      {rejectModalCoach && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Reject Verification / Request Changes
              </h3>
              <button
                onClick={() => setRejectModalCoach(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide feedback for <strong className="text-white">{rejectModalCoach.name}</strong> regarding why their ID or Certification was rejected so they can re-submit.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Aadhaar card photo is blurry. Please upload a clear color photo showing name and number clearly."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalCoach(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Full Coach Details Modal */}
      {inspectCoach && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    inspectCoach.photoUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={inspectCoach.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{inspectCoach.name}</h3>
                  <p className="text-xs text-emerald-400 font-semibold">{inspectCoach.academyName || 'Independent Coach'}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectCoach(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Contact & Verification</span>
                <div className="text-slate-200">Phone: <strong>{inspectCoach.phone}</strong> {inspectCoach.phoneVerified ? '(OTP Verified)' : ''}</div>
                <div className="text-slate-200">Email: <strong>{inspectCoach.email}</strong></div>
                <div className="text-slate-200">Experience: <strong>{inspectCoach.experienceYears || 1} Years</strong></div>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Subscription & Revenue</span>
                <div className="text-slate-200">Plan: <strong>{inspectCoach.subscription?.planName || 'Coach Pro'}</strong></div>
                <div className="text-emerald-400 font-bold">Paid: {formatCurrency(inspectCoach.subscription?.amountPaid || 2999)}</div>
                <div className="text-slate-400 text-[11px]">Validity: 365 Days</div>
              </div>
            </div>

            {/* ID & Certification */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Submitted Verification Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-300">Govt ID: {inspectCoach.idProofType || 'Aadhaar'}</div>
                  <div className="text-slate-400 font-mono">{inspectCoach.idProofNumber || 'Submitted'}</div>
                  {inspectCoach.idProofImageUrl && (
                    <button
                      onClick={() =>
                        setPreviewDocUrl({
                          url: inspectCoach.idProofImageUrl!,
                          title: `${inspectCoach.name}'s ID Card`,
                        })
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold pt-1 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Uploaded ID Photo
                    </button>
                  )}
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-300">Certification: {inspectCoach.certificationTitle || 'Coaching License'}</div>
                  <div className="text-slate-400">{inspectCoach.certificationIssuer || 'Federation'} ({inspectCoach.certificationYear || '2023'})</div>
                  {inspectCoach.certificationProofUrl && (
                    <button
                      onClick={() =>
                        setPreviewDocUrl({
                          url: inspectCoach.certificationProofUrl!,
                          title: `${inspectCoach.name}'s Certification`,
                        })
                      }
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold pt-1 flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" /> View Certificate Document
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Enrolled Students list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                Joined Athletes / Students ({enrollments.filter((e) => e.coachId === inspectCoach.id).length})
              </h4>
              <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                {enrollments.filter((e) => e.coachId === inspectCoach.id).length === 0 ? (
                  <div className="p-4 text-center text-slate-500">No students enrolled yet.</div>
                ) : (
                  enrollments
                    .filter((e) => e.coachId === inspectCoach.id)
                    .map((enr) => (
                      <div key={enr.id} className="p-3 flex items-center justify-between text-slate-300">
                        <div>
                          <div className="font-semibold text-white">{enr.playerName}</div>
                          <div className="text-[11px] text-slate-400">{enr.playerPhone || 'Direct App Enrollment'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold font-mono">{formatCurrency(enr.feePaid || 0)}</div>
                          <div className="text-[10px] text-slate-400">{new Date(enr.enrolledAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setInspectCoach(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
              {inspectCoach.verificationStatus !== 'VERIFIED' && (
                <button
                  onClick={() => handleApprove(inspectCoach)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  Approve & Publish Live
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
