import React, { useState, useEffect } from 'react';
import { Turf, VerificationDocument, VerificationHistory, TurfVerificationStatus } from '../../types';
import {
  getAllTurfsForAdmin,
  getVerificationDocuments,
  getVerificationHistory,
  adminApproveTurf,
  adminRejectTurf,
  adminRequestMoreInfo,
  adminSuspendTurf,
  adminRequestPhysicalVerification,
  adminReviewDocument,
  checkNearbyTurfDuplicates,
  getAllOwnerSubscriptions,
  getOwnerSubscriptionPlans,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  Camera,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Building2,
  Award,
  Ban,
  Check,
  Eye,
  SlidersHorizontal,
  CreditCard,
  Megaphone,
  Landmark,
  QrCode,
  TrendingUp,
  Zap,
  Info,
  Calendar,
} from 'lucide-react';
import { AdminTabVisibilityManager } from './AdminTabVisibilityManager';
import { AdminSubscriptionManager } from './AdminSubscriptionManager';
import { AdminBannerManager } from './AdminBannerManager';
import { AdminPricingManager } from './AdminPricingManager';
import { AdminSettingsManager } from './AdminSettingsManager';
import { AdminPayoutManager } from './AdminPayoutManager';
import { AdminPaymentIdScreen } from './AdminPaymentIdScreen';
import { AdminRevenueAnalyticsDashboard } from './AdminRevenueAnalyticsDashboard';
import { AdminCoachVerificationManager } from './AdminCoachVerificationManager';
import { AdminTournamentManager } from './AdminTournamentManager';
import { AdminUserControlManager } from './AdminUserControlManager';
import { AdminFirebaseAdminDashboard } from './AdminFirebaseAdminDashboard';
import { AdminPlayerSubscriptionManager } from './AdminPlayerSubscriptionManager';
import { AdminCoachSubscriptionManager } from './AdminCoachSubscriptionManager';
import { AdminVerificationBadgeManager } from './AdminVerificationBadgeManager';
import { AdminAuditLogsViewer } from './AdminAuditLogsViewer';
import { listenCoaches } from '../../lib/db';
import { GraduationCap, Trophy, Database, Users, Sparkles } from 'lucide-react';

export const AdminVerificationDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // SaaS subscriptions tracking state
  const [ownerSubscriptions, setOwnerSubscriptions] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [pendingCoachesCount, setPendingCoachesCount] = useState<number>(0);

  const [adminActiveSection, setAdminActiveSection] = useState<'VERIFICATION' | 'COACH_VERIFICATION' | 'TOURNAMENTS' | 'TAB_VISIBILITY' | 'SUBSCRIPTIONS' | 'COACH_SUBSCRIPTIONS' | 'PLAYER_SUBSCRIPTIONS' | 'VERIFICATION_BADGES' | 'AUDIT_LOGS' | 'BANNERS' | 'PRICING' | 'SETTINGS' | 'PAYOUTS' | 'ADMIN_PAYMENT_ID' | 'REVENUE_ANALYTICS' | 'USER_CONTROLS' | 'FIREBASE_MONITORING'>('VERIFICATION');
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TurfVerificationStatus | 'DUPLICATES' | 'SAAS_PLAN'>('ALL');
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME'>('ALL_TIME');

  // Action Modals
  const [modalType, setModalType] = useState<
    'NONE' | 'REJECT' | 'MORE_INFO' | 'SUSPEND' | 'APPROVE_CONFIRM' | 'REQUEST_PHYSICAL'
  >('NONE');
  const [modalText, setModalText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate info for selected turf
  const [duplicateCheck, setDuplicateCheck] = useState<{
    hasDuplicate: boolean;
    duplicateTurfName?: string;
    distanceMeters?: number;
  } | null>(null);

  const getOwnerSubscription = (ownerId?: string) => {
    if (!ownerId) return null;
    const sub = ownerSubscriptions.find((s) => s.ownerId === ownerId);
    if (!sub) return null;
    const plan = subscriptionPlans.find((p) => p.id === sub.planId);
    return {
      ...sub,
      planName: plan?.name || sub.planName || 'Pro Annual',
      planPrice: plan?.price || 9999,
    };
  };

  const loadTurfs = async () => {
    setLoading(true);
    try {
      const [allTurfs, subs, plans] = await Promise.all([
        getAllTurfsForAdmin(),
        getAllOwnerSubscriptions(),
        getOwnerSubscriptionPlans(true),
      ]);
      setTurfs(allTurfs);
      setOwnerSubscriptions(subs);
      setSubscriptionPlans(plans);
      if (selectedTurf) {
        const updated = allTurfs.find((t) => t.id === selectedTurf.id);
        if (updated) setSelectedTurf(updated);
      }
    } catch (err) {
      console.warn('Error loading admin turfs & subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurfs();
    const unsubCoaches = listenCoaches((coachList) => {
      const pending = coachList.filter(
        (c) => c.verificationStatus === 'PENDING_VERIFICATION' || (!c.isVerified && c.verificationStatus !== 'REJECTED')
      ).length;
      setPendingCoachesCount(pending);
    });
    return () => {
      if (typeof unsubCoaches === 'function') unsubCoaches();
    };
  }, []);

  const loadTurfDetails = async (turf: Turf) => {
    setSelectedTurf(turf);
    setLoadingDetails(true);
    try {
      const [docs, hist, dup] = await Promise.all([
        getVerificationDocuments(turf.id),
        getVerificationHistory(turf.id),
        turf.latitude && turf.longitude
          ? checkNearbyTurfDuplicates(turf.latitude, turf.longitude, turf.id)
          : Promise.resolve({ hasDuplicate: false }),
      ]);
      setDocuments(docs as VerificationDocument[]);
      setHistory(hist as VerificationHistory[]);
      setDuplicateCheck(dup);
    } catch (err) {
      console.warn('Error loading turf inspection data:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (level: 2 | 3) => {
    if (!selectedTurf) return;
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TurFit Admin';
      await adminApproveTurf(selectedTurf.id, adminUid, adminName, level, modalText || undefined);
      showToast(
        `Venue approved at Level ${level} (${level === 3 ? 'Physically Verified' : 'Turf Verified'})!`
      );
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please provide a mandatory rejection reason.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TurFit Admin';
      await adminRejectTurf(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Venue verification rejected. Feedback dispatched to owner.');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please specify the requested information.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TurFit Admin';
      await adminRequestMoreInfo(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Requested clarification sent to owner.');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to request info.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedTurf || !modalText.trim()) {
      showToast('Please provide a suspension reason.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TurFit Admin';
      await adminSuspendTurf(selectedTurf.id, adminUid, adminName, modalText.trim());
      showToast('Venue suspended and future bookings blocked.', 'error');
      setModalType('NONE');
      setModalText('');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPhysical = async () => {
    if (!selectedTurf) return;
    setActionLoading(true);
    try {
      const adminUid = user?.uid || 'admin-ops';
      const adminName = profile?.displayName || 'TurFit Admin';
      const code = await adminRequestPhysicalVerification(selectedTurf.id, adminUid, adminName);
      showToast(`Physical verification requested with code: ${code}`);
      setModalType('NONE');
      await loadTurfs();
      await loadTurfDetails(selectedTurf);
    } catch (err: any) {
      showToast(err.message || 'Failed to request physical verification.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentReview = async (docId: string, status: 'verified' | 'rejected') => {
    if (!selectedTurf) return;
    try {
      const adminUid = user?.uid || 'admin-ops';
      await adminReviewDocument(selectedTurf.id, docId, adminUid, status);
      showToast(`Document marked as ${status}.`);
      const updatedDocs = await getVerificationDocuments(selectedTurf.id);
      setDocuments(updatedDocs as VerificationDocument[]);
    } catch (err: any) {
      showToast(err.message || 'Failed to review document.', 'error');
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

  const effectiveTurfs = turfs.filter((t) =>
    isDateInTimeRange((t as any).submittedAt || (t as any).createdAt || (t as any).verifiedAt || (t as any).updatedAt)
  );

  // Filtered Turfs
  const filteredTurfs = effectiveTurfs.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.area.toLowerCase().includes(searchQuery.toLowerCase());

    const tStatus = t.verificationStatus || 'pending_verification';

    if (statusFilter === 'DUPLICATES') {
      return matchesSearch && t.verification?.duplicateWarning?.flagged;
    }
    if (statusFilter === 'SAAS_PLAN') {
      const sub = ownerSubscriptions.find((s) => s.ownerId === t.ownerId);
      return matchesSearch && sub && (sub.status === 'ACTIVE' || sub.status === 'TRIAL');
    }
    if (statusFilter !== 'ALL') {
      return matchesSearch && tStatus === statusFilter;
    }
    return matchesSearch;
  });

  return (
    <div id="admin-verification-dashboard" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold text-white animate-fade-in ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 border border-rose-500'
              : 'bg-emerald-600 border border-emerald-500'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Admin Navigation Bar with Refresh button */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-1.5 sm:p-2 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setAdminActiveSection('VERIFICATION')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'VERIFICATION'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Venue Queue</span>
          {turfs.filter((t) => t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review').length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {turfs.filter((t) => t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review').length}
            </span>
          )}
        </button>

        <button
          type="button"
          id="admin-nav-coach-queue-btn"
          onClick={() => setAdminActiveSection('COACH_VERIFICATION')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'COACH_VERIFICATION'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Coach Approvals</span>
          {pendingCoachesCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
              {pendingCoachesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          id="admin-nav-tournaments-btn"
          onClick={() => setAdminActiveSection('TOURNAMENTS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'TOURNAMENTS'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Tournaments</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminActiveSection('TAB_VISIBILITY')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'TAB_VISIBILITY'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Tab Visibility</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminActiveSection('SUBSCRIPTIONS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'SUBSCRIPTIONS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Owner SaaS</span>
        </button>

        <button
          type="button"
          id="admin-nav-coach-plans-btn"
          onClick={() => setAdminActiveSection('COACH_SUBSCRIPTIONS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'COACH_SUBSCRIPTIONS'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Coach & Academy SaaS</span>
        </button>

        <button
          type="button"
          id="admin-nav-player-plans-btn"
          onClick={() => setAdminActiveSection('PLAYER_SUBSCRIPTIONS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'PLAYER_SUBSCRIPTIONS'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Player SaaS</span>
        </button>

        <button
          type="button"
          id="admin-nav-verification-badges-btn"
          onClick={() => setAdminActiveSection('VERIFICATION_BADGES')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'VERIFICATION_BADGES'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/40 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Badges & Ticks</span>
        </button>

        <button
          type="button"
          id="admin-nav-audit-logs-btn"
          onClick={() => setAdminActiveSection('AUDIT_LOGS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'AUDIT_LOGS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Audit Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminActiveSection('BANNERS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'BANNERS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Banners</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminActiveSection('PRICING')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'PRICING'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Pricing</span>
        </button>

        <button
          type="button"
          id="admin-nav-payouts-btn"
          onClick={() => setAdminActiveSection('PAYOUTS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'PAYOUTS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Payouts & Settlements</span>
        </button>

        <button
          type="button"
          id="admin-nav-payment-id-btn"
          onClick={() => setAdminActiveSection('ADMIN_PAYMENT_ID')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'ADMIN_PAYMENT_ID'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Payment Gateway ID</span>
        </button>

        <button
          type="button"
          id="admin-nav-settings-btn"
          onClick={() => setAdminActiveSection('SETTINGS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'SETTINGS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-purple-400 shrink-0" />
          <span>App Settings</span>
        </button>

        <button
          type="button"
          id="admin-nav-revenue-analytics-btn"
          onClick={() => setAdminActiveSection('REVENUE_ANALYTICS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'REVENUE_ANALYTICS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Revenue Analytics</span>
        </button>

        <button
          type="button"
          id="admin-nav-user-controls-btn"
          onClick={() => setAdminActiveSection('USER_CONTROLS')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'USER_CONTROLS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>User & Owner Controls</span>
        </button>

        <button
          type="button"
          id="admin-nav-firebase-monitoring-btn"
          onClick={() => setAdminActiveSection('FIREBASE_MONITORING')}
          className={`py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            adminActiveSection === 'FIREBASE_MONITORING'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Firebase Admin (P1)</span>
        </button>
        </div>

        <button
          onClick={loadTurfs}
          title="Refresh All Admin Data"
          className="px-3.5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border border-slate-700/60 shadow-sm ml-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh All</span>
        </button>
      </div>

      {adminActiveSection === 'COACH_VERIFICATION' ? (
        <AdminCoachVerificationManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'TOURNAMENTS' ? (
        <AdminTournamentManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'USER_CONTROLS' ? (
        <AdminUserControlManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'TAB_VISIBILITY' ? (
        <AdminTabVisibilityManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'SUBSCRIPTIONS' ? (
        <AdminSubscriptionManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'COACH_SUBSCRIPTIONS' ? (
        <AdminCoachSubscriptionManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'PLAYER_SUBSCRIPTIONS' ? (
        <AdminPlayerSubscriptionManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'VERIFICATION_BADGES' ? (
        <AdminVerificationBadgeManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'AUDIT_LOGS' ? (
        <AdminAuditLogsViewer showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'BANNERS' ? (
        <AdminBannerManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'PRICING' ? (
        <AdminPricingManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'PAYOUTS' ? (
        <AdminPayoutManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'ADMIN_PAYMENT_ID' ? (
        <AdminPaymentIdScreen showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'SETTINGS' ? (
        <AdminSettingsManager showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'REVENUE_ANALYTICS' ? (
        <AdminRevenueAnalyticsDashboard showToast={(t, s) => showToast(t, s)} />
      ) : adminActiveSection === 'FIREBASE_MONITORING' ? (
        <AdminFirebaseAdminDashboard showToast={(t, s) => showToast(t, s === 'error' ? 'error' : 'success')} />
      ) : (
        <>
          {/* Time Horizon Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Venue Queue Time Horizon</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    {timeRange === 'TODAY' && '⚡ TODAY'}
                    {timeRange === 'WEEKLY' && '📅 WEEKLY (7 DAYS)'}
                    {timeRange === 'MONTHLY' && '📆 MONTHLY (30 DAYS)'}
                    {timeRange === 'YEARLY' && '📊 YEARLY (365 DAYS)'}
                    {timeRange === 'ALL_TIME' && '♾️ ALL TIME'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Filter venue submissions, audit logs, and verification queues by date.
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

          {/* Stats Ribbon with Hover Inspection Tooltips */}
          {(() => {
            const pendingVenues = effectiveTurfs.filter((t) => t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review');
            const verifiedVenues = effectiveTurfs.filter((t) => t.verificationStatus === 'verified');
            const rejectedVenues = effectiveTurfs.filter((t) => t.verificationStatus === 'rejected');
            const suspendedVenues = effectiveTurfs.filter((t) => t.verificationStatus === 'suspended');

            const totalVenuesCount = effectiveTurfs.length;
            const verifiedVenuePercent = totalVenuesCount > 0 ? Math.round((verifiedVenues.length / totalVenuesCount) * 100) : 0;
            const pendingVenuePercent = totalVenuesCount > 0 ? Math.round((pendingVenues.length / totalVenuesCount) * 100) : 0;
            const rejectedVenuePercent = totalVenuesCount > 0 ? Math.round((rejectedVenues.length / totalVenuesCount) * 100) : 0;
            const suspendedVenuePercent = totalVenuesCount > 0 ? 100 - verifiedVenuePercent - pendingVenuePercent - rejectedVenuePercent : 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Total Venues Card */}
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl relative overflow-visible group/venueTotal hover:border-indigo-500/50 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Total Venues</span>
                    <Info className="w-3 h-3 text-slate-500 group-hover/venueTotal:text-indigo-400" />
                  </span>
                  <p className="text-xl font-extrabold text-white mt-0.5">{totalVenuesCount}</p>
                  
                  {/* Ratio Bar */}
                  <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex cursor-pointer">
                    <div style={{ width: `${verifiedVenuePercent}%` }} className="bg-emerald-500 h-full"></div>
                    <div style={{ width: `${pendingVenuePercent}%` }} className="bg-amber-500 h-full"></div>
                    <div style={{ width: `${rejectedVenuePercent}%` }} className="bg-rose-500 h-full"></div>
                    <div style={{ width: `${suspendedVenuePercent}%` }} className="bg-red-600 h-full"></div>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-72 bg-slate-950/95 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/venueTotal:opacity-100 pointer-events-none group-hover/venueTotal:pointer-events-auto transition-all z-50 space-y-2">
                    <div className="text-xs font-bold text-white border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span className="text-indigo-300">Venue Audit Breakdown</span>
                      <span className="font-mono text-[10px] text-slate-400">{totalVenuesCount} Total</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between p-1 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
                        <span>🟢 Verified Live</span>
                        <span className="font-mono font-bold">{verifiedVenues.length} ({verifiedVenuePercent}%)</span>
                      </div>
                      <div className="flex items-center justify-between p-1 rounded bg-amber-950/40 border border-amber-500/20 text-amber-300">
                        <span>⏳ Pending Review</span>
                        <span className="font-mono font-bold">{pendingVenues.length} ({pendingVenuePercent}%)</span>
                      </div>
                      <div className="flex items-center justify-between p-1 rounded bg-rose-950/40 border border-rose-500/20 text-rose-300">
                        <span>❌ Rejected</span>
                        <span className="font-mono font-bold">{rejectedVenues.length} ({rejectedVenuePercent}%)</span>
                      </div>
                      <div className="flex items-center justify-between p-1 rounded bg-red-950/40 border border-red-500/20 text-red-300">
                        <span>🚫 Suspended</span>
                        <span className="font-mono font-bold">{suspendedVenues.length} ({suspendedVenuePercent}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending Review Card */}
                <div className="bg-slate-900 border border-amber-900/40 p-3.5 rounded-2xl relative overflow-visible group/venuePending hover:border-amber-500/60 transition-all">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Pending Review</span>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{pendingVenuePercent}%</span>
                  </span>
                  <p className="text-xl font-extrabold text-amber-400 mt-0.5">{pendingVenues.length}</p>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-72 bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/venuePending:opacity-100 pointer-events-none group-hover/venuePending:pointer-events-auto transition-all z-50 space-y-2">
                    <div className="text-xs font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>Pending Verification Queue</span>
                      <span className="font-mono text-[10px] text-slate-400">{pendingVenues.length} Venues</span>
                    </div>
                    {pendingVenues.length === 0 ? (
                      <p className="text-[11px] text-emerald-400 italic">No pending venues in queue</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {pendingVenues.slice(0, 4).map((t) => (
                          <div key={t.id} className="p-1.5 rounded bg-amber-950/40 border border-amber-500/20 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-amber-200 truncate max-w-[170px]">{t.name}</span>
                            <span className="font-mono text-[9px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">{t.city || 'Location'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verified Live Card */}
                <div className="bg-slate-900 border border-emerald-900/40 p-3.5 rounded-2xl relative overflow-visible group/venueVerified hover:border-emerald-500/60 transition-all">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Verified Live</span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">{verifiedVenuePercent}%</span>
                  </span>
                  <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{verifiedVenues.length}</p>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-72 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl opacity-0 group-hover/venueVerified:opacity-100 pointer-events-none group-hover/venueVerified:pointer-events-auto transition-all z-50 space-y-2">
                    <div className="text-xs font-bold text-emerald-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>Verified Live Arenas</span>
                      <span className="font-mono text-[10px] text-slate-400">{verifiedVenues.length} Live</span>
                    </div>
                    {verifiedVenues.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No verified live venues</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {verifiedVenues.slice(0, 4).map((t) => (
                          <div key={t.id} className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-emerald-200 truncate max-w-[170px]">{t.name}</span>
                            <span className="font-mono text-[9px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">LIVE</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejected Card */}
                <div className="bg-slate-900 border border-rose-900/40 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejected</span>
                  <p className="text-xl font-extrabold text-rose-400 mt-0.5">{rejectedVenues.length}</p>
                </div>

                {/* Suspended Card */}
                <div className="bg-slate-900 border border-red-900/40 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Suspended</span>
                  <p className="text-xl font-extrabold text-red-400 mt-0.5">{suspendedVenues.length}</p>
                </div>
              </div>
            );
          })()}

      {/* Main Grid: List & Detailed Inspection Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Venue Queue List */}
        <div className={`lg:col-span-5 space-y-3 ${selectedTurf ? 'hidden lg:block' : 'block'}`}>
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search venue name, area, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

             <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pb-1">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'SAAS_PLAN', label: '⚡ SaaS Plan' },
                  { id: 'pending_verification', label: 'Pending' },
                  { id: 'under_review', label: 'In Review' },
                  { id: 'verified', label: 'Verified' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'suspended', label: 'Suspended' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Turfs */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredTurfs.map((turf) => {
              const tStatus = turf.verificationStatus || 'pending_verification';
              const isSelected = selectedTurf?.id === turf.id;

              return (
                <div
                  key={turf.id}
                  onClick={() => loadTurfDetails(turf)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-white truncate">{turf.name}</span>
                        {turf.verificationLevel === 3 && (
                          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Level 3 Physically Verified" />
                        )}
                        {(() => {
                          const sub = getOwnerSubscription(turf.ownerId);
                          if (!sub) return null;
                          const isExpired = sub.status === 'EXPIRED';
                          return (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border shrink-0 ${
                              isExpired 
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' 
                                : sub.status === 'TRIAL' 
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' 
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            }`} title={`Owner on SaaS ${sub.planName} (${sub.status})`}>
                              <Zap className="w-2.5 h-2.5 text-amber-400" />
                              <span>{sub.planName.split(' ')[0]}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{turf.area}, {turf.city}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {tStatus === 'verified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                      {(tStatus === 'pending_verification' || tStatus === 'under_review') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Review
                        </span>
                      )}
                      {tStatus === 'rejected' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" /> Rejected
                        </span>
                      )}
                      {tStatus === 'suspended' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" /> Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proximity / Duplicate warning flag */}
                  {turf.verification?.duplicateWarning?.flagged && (
                    <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="truncate">Duplicate warning ({turf.verification.duplicateWarning.distanceMeters}m to nearby turf)</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTurfs.length === 0 && (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No venues match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inspection Details & Action Console */}
        <div className={`lg:col-span-7 ${!selectedTurf ? 'hidden lg:block' : 'block'}`}>
          {selectedTurf ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5 sm:space-y-6">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setSelectedTurf(null)}
                className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold mb-2 pb-2 border-b border-slate-800/80 cursor-pointer"
              >
                <span>← Back to Venue Queue</span>
              </button>

              {/* Header Info */}
              <div className="flex flex-col gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white">{selectedTurf.name}</h2>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        ID: {selectedTurf.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedTurf.address}, {selectedTurf.area}, {selectedTurf.city}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApprove(2)}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve L2</span>
                  </button>

                  <button
                    onClick={() => handleApprove(3)}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Approve L3</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalType('MORE_INFO');
                      setModalText('');
                    }}
                    className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Request Info
                  </button>

                  <button
                    onClick={() => {
                      setModalType('REJECT');
                      setModalText('');
                    }}
                    className="px-3 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => {
                      setModalType('SUSPEND');
                      setModalText('');
                    }}
                    className="col-span-2 sm:col-span-1 px-3 py-2 bg-red-900/80 hover:bg-red-800 text-red-200 hover:text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center border border-red-700/40"
                  >
                    Suspend Venue
                  </button>
                </div>
              </div>

              {/* Duplicate & Proximity Check Alert */}
              {duplicateCheck?.hasDuplicate && (
                <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Potential Duplicate Turf Flagged</span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    This venue is located within <strong>{duplicateCheck.distanceMeters} meters</strong> of existing turf "<strong>{duplicateCheck.duplicateTurfName}</strong>".
                    Ensure ownership deed and signboard are distinct before approving.
                  </p>
                </div>
              )}

              {/* Contact Verification Checkpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Owner Identity & Contact</span>
                  <div className="flex items-center gap-2 text-xs text-white">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Owner UID: {selectedTurf.ownerId.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedTurf.phoneNumber} (OTP Verified ✓)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Location Pin</span>
                  <p className="text-xs text-white">
                    Lat: {selectedTurf.latitude || 'N/A'}, Lon: {selectedTurf.longitude || 'N/A'}
                  </p>
                  {selectedTurf.latitude && selectedTurf.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedTurf.latitude},${selectedTurf.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Open in Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* SaaS subscription status check */}
              {(() => {
                const sub = getOwnerSubscription(selectedTurf.ownerId);
                if (sub) {
                  const isExpired = sub.status === 'EXPIRED';
                  return (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isExpired 
                        ? 'bg-rose-950/20 border-rose-500/20 text-rose-300' 
                        : sub.status === 'TRIAL'
                        ? 'bg-amber-950/20 border-amber-500/20 text-amber-300'
                        : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span>Owner SaaS Plan: {sub.planName}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          This turf belongs to a premium subscription plan. Status: 
                          <strong className={`ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-black ${
                            isExpired ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>{sub.status}</strong>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Active since {new Date(sub.startDate).toLocaleDateString()} • Expires {new Date(sub.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right sm:text-right shrink-0">
                        <span className="text-xs text-slate-400 block font-medium">Subscription Rate</span>
                        <strong className="text-sm text-white block">₹{sub.planPrice}/year</strong>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-slate-400">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                          <CreditCard className="w-4 h-4 text-slate-500" />
                          <span>Owner SaaS Plan: Free / Trial Setup</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          No active subscription record found for this owner.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        NONE
                      </span>
                    </div>
                  );
                }
              })()}

              {/* Photo Verification Gallery */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  Signboard & Grounds Photos
                </h4>
                {selectedTurf.photos && selectedTurf.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedTurf.photos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video">
                        <img
                          src={photo}
                          alt={`Venue photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white">
                          {idx === 0 ? 'Entrance' : idx === 1 ? 'Signboard' : `Photo ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No photos uploaded by owner.</p>
                )}
              </div>

              {/* Legal & Ownership Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Legal Verification Documents ({documents.length})
                </h4>

                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{doc.documentName}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {doc.documentType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View Doc
                            </a>
                          )}

                          {doc.status !== 'verified' && (
                            <button
                              onClick={() => handleDocumentReview(doc.id, 'verified')}
                              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {doc.status !== 'rejected' && (
                            <button
                              onClick={() => handleDocumentReview(doc.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No legal documents submitted yet.</p>
                )}
              </div>

              {/* Physical Live Verification Video Review */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">Level 3 Physical Video Walk-Through</span>
                  </div>
                  <button
                    onClick={handleRequestPhysical}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[11px] font-semibold rounded-lg border border-amber-500/30 cursor-pointer"
                  >
                    Generate Verification Code
                  </button>
                </div>

                {selectedTurf.verification?.physicalVerificationCode && (
                  <p className="text-xs text-slate-400">
                    Active Code: <strong className="text-amber-400">{selectedTurf.verification.physicalVerificationCode}</strong>
                  </p>
                )}

                {selectedTurf.verification?.physicalVerificationVideoUrl ? (
                  <div className="pt-1">
                    <a
                      href={selectedTurf.verification.physicalVerificationVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Watch Submitted Walk-Through Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No physical walkthrough video submitted yet.</p>
                )}
              </div>

              {/* Verification Audit Log */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-400">Chronological Audit History</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-start justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white capitalize">{h.action.replace('_', ' ')}</span>
                            <span className="text-slate-500">by {h.performedByName}</span>
                          </div>
                          {h.notes && <p className="text-slate-400 text-[11px] mt-0.5">{h.notes}</p>}
                        </div>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h3 className="text-base font-bold text-slate-300">Select a Venue to Inspect</h3>
              <p className="text-xs max-w-sm mx-auto">
                Choose any turf from the left queue to inspect photos, documents, and execute verification approvals.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal (Reject / More Info / Suspend) */}
      {modalType !== 'NONE' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">
              {modalType === 'REJECT' && 'Reject Venue Verification'}
              {modalType === 'MORE_INFO' && 'Request More Information'}
              {modalType === 'SUSPEND' && 'Suspend Venue Access'}
            </h3>

            <p className="text-xs text-slate-400">
              {modalType === 'REJECT' && 'Please specify the exact reasons for rejection so the owner can rectify and resubmit.'}
              {modalType === 'MORE_INFO' && 'Specify what additional documents, photos, or clarifications are required.'}
              {modalType === 'SUSPEND' && 'Provide reason for venue suspension (e.g. policy violations, expired lease, player disputes).'}
            </p>

            <textarea
              rows={4}
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="Enter detailed notes for the venue owner..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalType('NONE')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              {modalType === 'REJECT' && (
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}

              {modalType === 'MORE_INFO' && (
                <button
                  onClick={handleRequestMoreInfo}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Sending...' : 'Send Request'}
                </button>
              )}

              {modalType === 'SUSPEND' && (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading || !modalText.trim()}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
