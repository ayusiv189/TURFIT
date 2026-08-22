import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OwnerRealAnalytics } from '../../types';
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
} from 'lucide-react';

interface OwnerAnalyticsDashboardProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const OwnerAnalyticsDashboard: React.FC<OwnerAnalyticsDashboardProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<OwnerRealAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await calculateOwnerRealAnalytics(user.uid);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load owner analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Aggregating verified booking receipts, payments & arena occupancy...
      </div>
    );
  }

  if (!analytics || analytics.totalBookings === 0) {
    return (
      <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white">No Booking Data Available Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          As soon as athletes and teams book your slots and settle payments, real-time revenue breakdown, occupancy rates, and peak hour trends will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner with Key Revenue Metrics */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Real Revenue Ledger</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(analytics.amountCollected)}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Net collected revenue across {analytics.totalBookings} total bookings
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <PieChart className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Turf Occupancy</span>
              <span className="text-xl font-black text-white">{analytics.occupancyRatePercent}%</span>
            </div>
          </div>
        </div>

        {/* 4 Revenue Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gross Value</span>
            <span className="text-lg font-black text-white mt-1 block">
              {formatCurrency(analytics.totalBookingValue)}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Collected (Paid)</span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">
              {formatCurrency(analytics.amountCollected)}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Dues</span>
            <span className="text-lg font-black text-rose-400 mt-1 block">
              {formatCurrency(analytics.amountPending)}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Booking Size</span>
            <span className="text-lg font-black text-amber-400 mt-1 block">
              {formatCurrency(analytics.averageBookingValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Booking Velocity (Today, Weekly, Monthly) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>TODAY'S SLOTS</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-3xl font-black text-white">{analytics.todayBookings}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Booked for today</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>LAST 7 DAYS</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-black text-white">{analytics.weeklyBookings}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Weekly volume</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>LAST 30 DAYS</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-black text-white">{analytics.monthlyBookings}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Monthly volume</span>
        </div>
      </div>

      {/* Arena & Customer Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Peak Demand Patterns</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Most Popular Arena</span>
              <span className="font-bold text-white">{analytics.popularArenaName}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Peak Time Slot</span>
              <span className="font-bold text-indigo-400">{analytics.popularTimeSlot}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Busiest Day</span>
              <span className="font-bold text-emerald-400">{analytics.popularDay}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Top Sport Booked</span>
              <span className="font-bold text-amber-400">{analytics.mostBookedSport}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Player Retention & Loyalty</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Repeat Athletes</span>
              <span className="font-black text-emerald-400 text-sm">{analytics.repeatPlayersCount} Players</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Completed Sessions</span>
              <span className="font-bold text-white">{analytics.completedBookings}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Cancelled Bookings</span>
              <span className="font-bold text-rose-400">{analytics.cancelledBookings}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Total Slot Occupancy</span>
              <span className="font-bold text-white">{analytics.occupancyRatePercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
