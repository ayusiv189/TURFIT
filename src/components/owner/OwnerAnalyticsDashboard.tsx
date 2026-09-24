import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OwnerRealAnalytics, PlanFeatureConfig } from '../../types';
import { calculateOwnerRealAnalytics } from '../../lib/phase3';
import { formatCurrency } from '../../lib/utils';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  DollarSign,
  PieChart,
  Layers,
  Sparkles,
  ArrowUpRight,
  Flame,
  AlertCircle,
  Download,
  RefreshCw,
  Zap,
  CreditCard,
  Banknote,
  Award,
  ChevronRight,
  ShieldCheck,
  Target,
  Percent,
  Lock,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';

interface OwnerAnalyticsDashboardProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
  planFeatures?: PlanFeatureConfig;
  onNavigateToSubscription?: () => void;
}

export const OwnerAnalyticsDashboard: React.FC<OwnerAnalyticsDashboardProps> = ({
  showToast,
  planFeatures,
  onNavigateToSubscription,
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<OwnerRealAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  // Timeframe and Arena Selection
  const [timeframe, setTimeframe] = useState<'ALL' | '30D' | '7D' | 'TODAY'>('7D');
  const [selectedArenaId, setSelectedArenaId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'arenas' | 'retention' | 'recommendations'>('overview');

  // SaaS Upgrade Modal State
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    featureKey: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    featureKey: '',
  });

  // Feature Permissions (fallback to true if planFeatures not provided)
  const can7Days = planFeatures?.analytics7Days !== false;
  const can30Days = planFeatures?.analytics30Days !== false;
  const canAllTime = planFeatures?.analyticsAllTime !== false;
  const canArenaAnalytics = planFeatures?.individualArenaAnalytics !== false;
  const canDownloadReports = planFeatures?.downloadReports !== false;

  const loadAnalytics = async (selectedTimeframe = timeframe, arenaId = selectedArenaId) => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await calculateOwnerRealAnalytics(user.uid, selectedTimeframe, arenaId);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load owner analytics', err);
      showToast?.('Failed to fetch real-time analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(timeframe, selectedArenaId);
  }, [user, timeframe, selectedArenaId]);

  // Prompt SaaS Plan Upgrade
  const promptUpgrade = (title: string, description: string, featureKey: string) => {
    setUpgradeModal({
      isOpen: true,
      title,
      description,
      featureKey,
    });
  };

  // Handle Timeframe Switch with Gating
  const handleTimeframeChange = (newTf: 'ALL' | '30D' | '7D' | 'TODAY') => {
    if (newTf === '7D' && !can7Days) {
      promptUpgrade(
        '7-Day Weekly Analytics Locked',
        'Weekly utilization velocity, 7-day revenue pacing, and peak slot trends are available on Pro SaaS plans.',
        'analytics7Days'
      );
      return;
    }
    if (newTf === '30D' && !can30Days) {
      promptUpgrade(
        '30-Day Monthly Analytics Locked',
        'Monthly financial audits, 30-day occupancy curves, and month-over-month comparisons are exclusive to Pro SaaS plans.',
        'analytics30Days'
      );
      return;
    }
    if (newTf === 'ALL' && !canAllTime) {
      promptUpgrade(
        'All-Time Historical Analytics Locked',
        'Lifetime revenue tracking, cumulative player ledger audits, and historical all-time growth metrics are exclusive to Pro SaaS plans.',
        'analyticsAllTime'
      );
      return;
    }
    setTimeframe(newTf);
  };

  // Handle Individual Arena Switch with Gating
  const handleArenaChange = (arenaId: string) => {
    if (arenaId !== 'ALL' && !canArenaAnalytics) {
      promptUpgrade(
        'Individual Arena & Court Analytics Locked',
        'Drilling down into court-by-court financial performance, single pitch load heatmaps, and individual turf revenue is a Pro SaaS feature.',
        'individualArenaAnalytics'
      );
      return;
    }
    setSelectedArenaId(arenaId);
  };

  // Generate and Download Report (Weekly, Monthly, All-Time, Today, or Subsections)
  const handleDownloadSectionReport = async (
    targetTimeframe: 'ALL' | '30D' | '7D' | 'TODAY',
    reportSectionLabel: string,
    specificArenaId: string = selectedArenaId
  ) => {
    if (!canDownloadReports) {
      promptUpgrade(
        'Downloadable Business Reports Locked',
        'Exporting CSV / PDF business audit reports for Today, Weekly, Monthly, and All-Time performance is available on Pro SaaS plans.',
        'downloadReports'
      );
      return;
    }

    if (!user) return;
    setDownloadingReport(targetTimeframe + '_' + reportSectionLabel);

    try {
      // If requested timeframe/arena is different from current, compute its analytics
      let dataToExport = analytics;
      if (targetTimeframe !== timeframe || specificArenaId !== selectedArenaId || !dataToExport) {
        dataToExport = await calculateOwnerRealAnalytics(user.uid, targetTimeframe, specificArenaId);
      }

      if (!dataToExport) {
        showToast?.('No data available to export', 'error');
        return;
      }

      const tfLabels = {
        TODAY: "Today's Daily Ledger",
        '7D': 'Weekly (7-Day) Performance',
        '30D': 'Monthly (30-Day) Financial Statement',
        ALL: 'All-Time Lifetime Business Audit',
      };

      const arenaLabel =
        dataToExport.selectedArenaName ||
        (specificArenaId === 'ALL' ? 'All Arenas & Courts Combined' : 'Specific Court');

      const rows: (string | number)[][] = [
        ['TRUFIT TURF & ARENA MANAGEMENT PLATFORM'],
        [`OFFICIAL BUSINESS REPORT: ${reportSectionLabel.toUpperCase()}`],
        [`Timeframe: ${tfLabels[targetTimeframe]} (${targetTimeframe})`],
        [`Scope: ${arenaLabel}`],
        [`Generated At: ${new Date().toLocaleString()}`],
        [''],
        ['=================== 1. FINANCIAL SUMMARY ==================='],
        ['Metric', 'Amount (INR)', 'Notes'],
        ['Total Gross Booking Value', `INR ${dataToExport.totalBookingValue}`, 'Face value of all bookings in timeframe'],
        ['Net Collected Revenue', `INR ${dataToExport.amountCollected}`, 'Total funds received & settled'],
        ['Online Gateway Escrow', `INR ${dataToExport.onlineRevenue || 0}`, 'Paid via UPI, Cards, NetBanking'],
        ['Counter Cash / Pay-at-Venue', `INR ${dataToExport.cashRevenue || 0}`, 'Collected physically at the turf desk'],
        ['Pending Player Dues', `INR ${dataToExport.amountPending}`, 'Outstanding balances yet to be settled'],
        ['Cancelled Booking Value', `INR ${dataToExport.cancelledAmount}`, 'Total loss from cancelled match bookings'],
        ['Average Ticket Size', `INR ${dataToExport.averageBookingValue}`, 'Average spend per reservation'],
        [''],
        ['=================== 2. OCCUPANCY & UTILIZATION ==================='],
        ['Metric', 'Count / Value'],
        ['Total Reservations Requested', dataToExport.totalBookings],
        ['Completed & Paid Matches', dataToExport.completedBookings],
        ['Cancelled Matches', dataToExport.cancelledBookings],
        ['Overall Turf Occupancy Rate', `${dataToExport.occupancyRatePercent}%`],
        ['Repeat Customer Loyalty Rate', `${dataToExport.repeatRatePercent || 0}%`],
        ['Avg Advance Booking Lead Time', `${dataToExport.leadTimeHoursAvg || 0} hours ahead`],
        ['Most Popular Sport', dataToExport.mostBookedSport],
        ['Peak Time Slot', dataToExport.popularTimeSlot],
        ['Busiest Day of Week', dataToExport.popularDay],
        [''],
        ['=================== 3. INDIVIDUAL ARENA PERFORMANCE ==================='],
        ['Arena ID', 'Arena Name', 'Total Bookings', 'Revenue Generated (INR)', 'Occupancy Share (%)'],
        ...(dataToExport.arenaPerformances || []).map((a) => [
          a.arenaId,
          a.arenaName,
          a.totalBookings,
          `INR ${a.totalRevenue}`,
          `${a.occupancyPercent}%`,
        ]),
        [''],
        ['=================== 4. SPORT REVENUE DISTRIBUTION ==================='],
        ['Sport', 'Bookings Count', 'Revenue (INR)', 'Revenue Share (%)'],
        ...(dataToExport.sportShares || []).map((s) => [
          s.sport,
          s.bookingsCount,
          `INR ${s.revenue}`,
          `${s.percentage}%`,
        ]),
        [''],
        ['=================== 5. TIME-BLOCK OCCUPANCY BREAKDOWN ==================='],
        ['Time Window', 'Hours', 'Bookings Count', 'Revenue (INR)', 'Occupancy (%)'],
        ...(dataToExport.timeBlocks || []).map((tb) => [
          tb.label,
          tb.hours,
          tb.bookingsCount,
          `INR ${tb.revenue}`,
          `${tb.occupancyPercent}%`,
        ]),
        [''],
        ['=================== 6. TOP VIP REGULAR ATHLETES ==================='],
        ['Athlete Name', 'Phone', 'Bookings Completed', 'Total Amount Spent (INR)', 'Favorite Sport', 'Last Active Date'],
        ...(dataToExport.topRegularPlayers || []).map((p) => [
          p.playerName,
          p.playerPhone || 'Private',
          p.totalBookings,
          `INR ${p.totalSpent}`,
          p.favoriteSport || 'Multi-Sport',
          p.lastBookingDate || 'Recent',
        ]),
      ];

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows
          .map((row) =>
            row
              .map((val) => {
                const str = String(val ?? '');
                return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
              })
              .join(',')
          )
          .join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const fileName = `turfit_report_${targetTimeframe.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Downloaded ${reportSectionLabel} report successfully!`, 'success');
    } catch (err) {
      console.error('Export report failed:', err);
      showToast?.('Could not export report', 'error');
    } finally {
      setDownloadingReport(null);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm space-y-3">
        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="font-medium text-slate-300">Syncing booking ledgers, arena performance & financial reports...</p>
        <span className="text-xs text-slate-500">Live analytics powered by TruFit</span>
      </div>
    );
  }

  if (!analytics || (analytics.totalBookings === 0 && selectedArenaId === 'ALL')) {
    return (
      <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white">No Booking Ledger Data Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          As soon as athletes and teams book match slots, settle advance tokens, or pay at venue, 7-day velocity, 30-day monthly audits, and individual arena stats will populate here automatically.
        </p>
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => loadAnalytics()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Analytics
          </button>
        </div>
      </div>
    );
  }

  const onlineShare =
    analytics.amountCollected > 0
      ? Math.round(((analytics.onlineRevenue || 0) / analytics.amountCollected) * 100)
      : 0;
  const cashShare = 100 - onlineShare;
  const availableArenas = analytics.availableArenas || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-2 sm:px-4">
      {/* SaaS Upgrade Modal */}
      {upgradeModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <button
                onClick={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Pro SaaS Feature
              </span>
              <h3 className="text-lg font-black text-white">{upgradeModal.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{upgradeModal.description}</p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant WhatsApp booking confirmation passes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>7-Day, 30-Day and All-Time Individual Arena Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Downloadable business reports (Today, Weekly, Monthly, All-Time)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setUpgradeModal((prev) => ({ ...prev, isOpen: false }));
                  onNavigateToSubscription?.();
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade SaaS Plan</span>
              </button>
              <button
                onClick={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Timeframe Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Turf Owner Intelligence Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Revenue & Occupancy Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            7-Day, 30-Day & All-Time Individual Arena Analytics with one-click report downloads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector with SaaS Gating Badges */}
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'TODAY', label: 'Today', locked: false },
              { id: '7D', label: '7 Days', locked: !can7Days },
              { id: '30D', label: '30 Days', locked: !can30Days },
              { id: 'ALL', label: 'All Time', locked: !canAllTime },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleTimeframeChange(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeframe === t.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t.locked ? 'Locked (Requires Pro SaaS Plan)' : t.label}
              >
                <span>{t.label}</span>
                {t.locked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAnalytics(timeframe, selectedArenaId)}
            disabled={loading}
            title="Refresh Data"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700/50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Individual Arena Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Arena / Court Scope:
          </span>
          <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
            {analytics.selectedArenaName || 'All Arenas & Courts'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleArenaChange('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedArenaId === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Arenas & Courts
          </button>

          {availableArenas.map((arena) => {
            const isSelected = selectedArenaId === arena.id;
            return (
              <button
                key={arena.id}
                onClick={() => handleArenaChange(arena.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title={!canArenaAnalytics ? 'Individual Arena Analytics (Pro SaaS Plan)' : arena.name}
              >
                <span>{arena.name}</span>
                {!canArenaAnalytics && <Lock className="w-2.5 h-2.5 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requirement 3: Dedicated "Download Report in each section: Weekly, Monthly, All-Time, Today" Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download Section Reports (Audit CSV)
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant one-click exports formatted for accounting, tax verification, and court operations
            </p>
          </div>
          {!canDownloadReports && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 self-start sm:self-auto">
              <Lock className="w-3 h-3" />
              <span>Pro SaaS Feature</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Button 1: Today's Report */}
          <button
            onClick={() => handleDownloadSectionReport('TODAY', "Today's Daily Ledger")}
            disabled={downloadingReport !== null}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-400 transition">
                Daily Ledger
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
              Download Today Report
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Today's match slots & cash</span>
          </button>

          {/* Button 2: Weekly (7D) Report */}
          <button
            onClick={() => handleDownloadSectionReport('7D', 'Weekly (7-Day) Performance')}
            disabled={downloadingReport !== null}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-400 transition">
                Weekly (7D)
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
              Download Weekly Report
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">7-Day velocity & occupancy</span>
          </button>

          {/* Button 3: Monthly (30D) Report */}
          <button
            onClick={() => handleDownloadSectionReport('30D', 'Monthly (30-Day) Statement')}
            disabled={downloadingReport !== null}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-400 transition">
                Monthly (30D)
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
              Download Monthly Report
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">30-Day financial statement</span>
          </button>

          {/* Button 4: All-Time Report */}
          <button
            onClick={() => handleDownloadSectionReport('ALL', 'All-Time Lifetime Audit')}
            disabled={downloadingReport !== null}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-400 transition">
                All-Time Audit
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
              Download All-Time Report
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Full lifetime business ledger</span>
          </button>
        </div>
      </div>

      {/* Main Stats Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Verified Net Revenue Collected ({timeframe})
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {formatCurrency(analytics.amountCollected)}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {analytics.completedBookings} Completed Matches
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Total booking turnover across {analytics.totalBookings} reservation requests for{' '}
              <span className="text-slate-200 font-semibold">{analytics.selectedArenaName || 'All Arenas'}</span>
            </p>
          </div>

          {/* Occupancy and Repeat Rate Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Turf Occupancy</span>
              <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
                {analytics.occupancyRatePercent}%
              </span>
              <span className="text-[10px] text-slate-500">Active utilization</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Repeat Athletes</span>
              <span className="text-2xl font-black text-sky-400 mt-0.5 block">
                {analytics.repeatRatePercent || 0}%
              </span>
              <span className="text-[10px] text-slate-500">{analytics.repeatPlayersCount} regulars</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Avg Lead Time</span>
              <span className="text-2xl font-black text-amber-400 mt-0.5 block">
                {analytics.leadTimeHoursAvg || 0}h
              </span>
              <span className="text-[10px] text-slate-500">Advance booking</span>
            </div>
          </div>
        </div>

        {/* 4 Financial KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-slate-700 transition">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Booking Value</span>
            <span className="text-lg font-black text-white mt-1 block">
              {formatCurrency(analytics.totalBookingValue)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Total face value</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-emerald-500/30 transition">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-between">
              <span>Online Gateway</span>
              <CreditCard className="w-3 h-3 text-emerald-400" />
            </span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">
              {formatCurrency(analytics.onlineRevenue || 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{onlineShare}% of collection</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-sky-500/30 transition">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-between">
              <span>Counter Cash</span>
              <Banknote className="w-3 h-3 text-sky-400" />
            </span>
            <span className="text-lg font-black text-sky-400 mt-1 block">
              {formatCurrency(analytics.cashRevenue || 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{cashShare}% in hand</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 hover:border-rose-500/30 transition">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Dues</span>
            <span className="text-lg font-black text-rose-400 mt-1 block">
              {formatCurrency(analytics.amountPending)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Unsettled counter balances</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview & Velocity', icon: BarChart3 },
          { id: 'arenas', label: 'Individual Arenas', icon: Layers },
          { id: 'heatmap', label: 'Slot Utilization Heatmap', icon: Flame },
          { id: 'retention', label: 'Athlete Retention & VIPs', icon: Users },
          { id: 'recommendations', label: 'Smart Pricing & Growth', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-400 text-emerald-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & VELOCITY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Booking Velocity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>TODAY'S SLOTS</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-3xl font-black text-white">{analytics.todayBookings}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Booked match slots for today</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>WEEKLY 7-DAY SLOTS</span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-3xl font-black text-white">{analytics.weeklyBookings}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Rolling 7-day volume</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>MONTHLY 30-DAY SLOTS</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-3xl font-black text-white">{analytics.monthlyBookings}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Rolling 30-day volume</span>
            </div>
          </div>

          {/* Day-of-Week Occupancy & Sports Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Day-of-Week Revenue Pacing</span>
                  </h3>
                  <p className="text-xs text-slate-400">Peak match traffic by weekday vs weekend</p>
                </div>
                <button
                  onClick={() => handleDownloadSectionReport(timeframe, 'Day-of-Week Pacing')}
                  className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {(analytics.dayBreakdown || []).map((item) => (
                  <div key={item.dayName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{item.dayName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{item.bookingsCount} slots</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sport Revenue Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-sky-400" />
                    <span>Sport Revenue Distribution</span>
                  </h3>
                  <p className="text-xs text-slate-400">Breakdown by sport categories hosted at turf</p>
                </div>
                <button
                  onClick={() => handleDownloadSectionReport(timeframe, 'Sport Revenue Distribution')}
                  className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {(analytics.sportShares || []).map((sport) => (
                  <div key={sport.sport} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{sport.sport}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{sport.bookingsCount} matches</span>
                        <span className="text-sky-400 font-bold">{formatCurrency(sport.revenue)}</span>
                        <span className="text-[10px] text-slate-500">({sport.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${sport.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL ARENAS DRILLDOWN */}
      {activeTab === 'arenas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Court-by-Court Performance Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">
                Individual arena occupancy, gross revenue, and match share for {timeframe}
              </p>
            </div>
            <button
              onClick={() => handleDownloadSectionReport(timeframe, 'Individual Arenas Performance')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Arena Report (CSV)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(analytics.arenaPerformances || []).map((arena) => {
              const isSelected = selectedArenaId === arena.arenaId;
              return (
                <div
                  key={arena.arenaId}
                  onClick={() => handleArenaChange(arena.arenaId)}
                  className={`rounded-2xl p-5 border transition-all cursor-pointer space-y-4 ${
                    isSelected
                      ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {arena.sport || 'Sports Pitch'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500 text-white">
                        ACTIVE FILTER
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">{arena.arenaName}</h4>
                    <span className="text-xs text-slate-400">
                      {arena.totalBookings} total match bookings
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">REVENUE</span>
                      <span className="text-sm font-black text-emerald-400 mt-0.5 block">
                        {formatCurrency(arena.totalRevenue)}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">SHARE</span>
                      <span className="text-sm font-black text-sky-400 mt-0.5 block">
                        {arena.occupancyPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${arena.occupancyPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SLOT UTILIZATION HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          {/* Time Blocks */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Time-of-Day Booking Windows</span>
                </h3>
                <p className="text-xs text-slate-400">Shift load across morning, afternoon, evening & night</p>
              </div>
              <button
                onClick={() => handleDownloadSectionReport(timeframe, 'Time-of-Day Breakdown')}
                className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {(analytics.timeBlocks || []).map((block) => (
                <div
                  key={block.block}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden"
                >
                  <span className="text-xs font-bold text-slate-300 block">{block.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{block.bookingsCount}</span>
                    <span className="text-xs text-slate-400">slots</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 block">
                    {formatCurrency(block.revenue)}
                  </span>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full"
                      style={{ width: `${block.occupancyPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Heatmap 06:00 to 23:00 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Hourly Slot Load Heatmap (06:00 AM - 11:00 PM)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visual utilization distribution for slot management & dynamic pricing
                </p>
              </div>
              <button
                onClick={() => handleDownloadSectionReport(timeframe, 'Hourly Slot Heatmap')}
                className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2 pt-2">
              {(analytics.hourlyHeatmap || []).map((slot) => {
                const occ = slot.occupancyPercent;
                const bgTint =
                  occ >= 80
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : occ >= 50
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : occ >= 20
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500';

                return (
                  <div
                    key={slot.hourLabel}
                    className={`border rounded-xl p-2.5 text-center transition flex flex-col justify-between ${bgTint}`}
                  >
                    <span className="text-[10px] font-bold block">{slot.hourLabel}</span>
                    <span className="text-base font-black my-1 block">{slot.bookingsCount}</span>
                    <span className="text-[9px] font-semibold opacity-80">{occ}% load</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ATHLETE RETENTION & VIP REGULARS */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          {/* Repeat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">REPEAT ATHLETE RATE</span>
              <span className="text-3xl font-black text-sky-400 mt-1 block">
                {analytics.repeatRatePercent || 0}%
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Booked more than once at your venue</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">REGULAR TEAMS & PLAYERS</span>
              <span className="text-3xl font-black text-emerald-400 mt-1 block">
                {analytics.repeatPlayersCount}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Loyal captains booking recurring matches</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold block">NEW PLAYERS INTRODUCED</span>
              <span className="text-3xl font-black text-white mt-1 block">
                {analytics.newPlayersCount}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">First-time reservations this timeframe</p>
            </div>
          </div>

          {/* Top VIP Athletes / Captains Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Top Regular Captains & VIP Organizers</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Your most valuable repeat players ranked by total spend and match volume
                </p>
              </div>
              <button
                onClick={() => handleDownloadSectionReport(timeframe, 'Top VIP Regular Athletes')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export VIPs</span>
              </button>
            </div>

            {analytics.topRegularPlayers && analytics.topRegularPlayers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Athlete</th>
                      <th className="py-3 px-3">Sport</th>
                      <th className="py-3 px-3">Match Bookings</th>
                      <th className="py-3 px-3">Total Spend</th>
                      <th className="py-3 px-3">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics.topRegularPlayers.map((p, index) => (
                      <tr key={p.playerId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                              index === 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : index === 1
                                ? 'bg-slate-700 text-slate-200'
                                : index === 2
                                ? 'bg-amber-800/30 text-amber-500'
                                : 'text-slate-500'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {p.playerPhotoURL ? (
                              <img
                                src={p.playerPhotoURL}
                                alt={p.playerName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                                {p.playerName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-white block">{p.playerName}</span>
                              {p.playerPhone && (
                                <span className="text-[10px] text-slate-500">{p.playerPhone}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                            {p.favoriteSport || 'Multi-Sport'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-black text-white text-sm">{p.totalBookings}</span>
                          <span className="text-[10px] text-slate-500 ml-1">slots</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-black text-emerald-400 text-sm">
                            {formatCurrency(p.totalSpent)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                          {p.lastBookingDate || 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">No regular athlete profiles yet</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SMART PRICING & RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Contextual Revenue Optimization Engine</span>
            </div>
            <h3 className="text-xl font-black text-white">
              Data-Driven Growth & Dynamic Pricing Suggestions
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              These suggestions are generated using your real booking patterns, slot load heatmaps, and customer frequency to help you monetize empty hours and reward top regular athletes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(analytics.smartRecommendations || []).map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-3 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        rec.impactLevel === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : rec.impactLevel === 'GROWTH'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {rec.impactLevel} Impact • {rec.type}
                    </span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                </div>

                {rec.actionLabel && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400">{rec.actionLabel}</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
