import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlayerRealStats, Booking, TurfReview, MatchPlayer } from '../../types';
import { calculatePlayerRealStats, getPlayerReviews } from '../../lib/phase3';
import { getPlayerBookings } from '../../lib/db';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Trophy,
  Flame,
  Clock,
  Activity,
  Users,
  MapPin,
  Calendar,
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
  Shield,
} from 'lucide-react';

interface PlayerStatsTabProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const PlayerStatsTab: React.FC<PlayerStatsTabProps> = ({ showToast }) => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<PlayerRealStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<TurfReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAllPlayerStats = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [statsData, bookingsData, reviewsData] = await Promise.all([
        calculatePlayerRealStats(user.uid),
        getPlayerBookings(user.uid),
        getPlayerReviews(user.uid),
      ]);
      setStats(statsData);
      setBookings(bookingsData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Failed to load player statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPlayerStats();
  }, [user]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Computing verified athlete activity & performance statistics...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Profile Summary */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black text-2xl overflow-hidden shadow-xl">
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.displayName?.charAt(0).toUpperCase() || 'P'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{profile?.displayName || 'Player'}</h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {profile?.experienceLevel || 'Intermediate'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {profile?.city || 'India'} • {profile?.preferredSport || 'All-Rounder Athlete'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Playtime</span>
              <span className="text-sm font-black text-white">{stats?.hoursPlayed || 0} Hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Verified Statistics */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Performance Overview</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-slate-400 text-xs font-semibold block uppercase">Matches Played</span>
            <span className="text-2xl font-black text-white mt-1 block">{stats?.matchesPlayed || 0}</span>
            <span className="text-[10px] text-slate-500">Hosted: {stats?.matchesHosted || 0}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-slate-400 text-xs font-semibold block uppercase">Lobbies Joined</span>
            <span className="text-2xl font-black text-indigo-400 mt-1 block">{stats?.lobbiesJoined || 0}</span>
            <span className="text-[10px] text-slate-500">Community games</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-slate-400 text-xs font-semibold block uppercase">Teams Joined</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats?.teamsJoined || 0}</span>
            <span className="text-[10px] text-slate-500">Active squads</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-slate-400 text-xs font-semibold block uppercase">Bookings Completed</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{stats?.bookingsCompleted || 0}</span>
            <span className="text-[10px] text-slate-500">Confirmed slots</span>
          </div>
        </div>
      </div>

      {/* Sport & Turf Affinity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
            <Trophy className="w-4 h-4" />
            <span>Favorite Sport</span>
          </div>
          <p className="text-xl font-black text-white">{stats?.favoriteSport}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {stats?.sportsPlayed && stats.sportsPlayed.length > 0 ? (
              stats.sportsPlayed.map((s, idx) => (
                <span
                  key={idx}
                  className="bg-slate-950 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-800"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">No sports logged yet</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
            <MapPin className="w-4 h-4" />
            <span>Home Turf Affinity</span>
          </div>
          <p className="text-xl font-black text-white">{stats?.favoriteTurf}</p>
          <p className="text-xs text-slate-400">
            Total lifetime investment in turf bookings: <span className="text-white font-bold">{formatCurrency(stats?.totalAmountSpent || 0)}</span>
          </p>
        </div>
      </div>

      {/* Real Activity Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Recent Activity & Booking History</span>
        </h3>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No booking activity recorded yet. Explore turfs and book a slot to start playing!
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {bookings.slice(0, 8).map((b) => (
              <div key={b.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{b.turfName}</span>
                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.2 rounded-full">
                      {b.sport}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {b.arenaName} • {b.date} at {b.startTime} ({b.duration} mins)
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-white block">{formatCurrency(b.totalAmount)}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      b.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {b.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
