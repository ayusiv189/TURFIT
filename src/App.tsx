import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { AuthScreen } from './components/AuthScreen';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PlayerHome } from './components/PlayerHome';
import { AdminVerificationDashboard } from './components/admin/AdminVerificationDashboard';
import { AdminRoleSwitcherBar } from './components/admin/AdminRoleSwitcherBar';
import {
  Home,
  Compass,
  Calendar,
  CreditCard,
  User,
  LayoutDashboard,
  Building2,
  Clock,
  LogOut,
  Sparkles,
  Users,
  Shield,
  ShieldCheck,
  Trophy,
  BarChart3,
  Tag,
  Star,
  Gift,
  BarChart2,
  QrCode,
} from 'lucide-react';

export default function App() {
  const { user, profile, loading, role, isAdmin, activeRole, setActiveRole, emailVerified, logout } = useAuth();

  // Tab states for Owner and Player
  const [playerTab, setPlayerTab] = useState<
    | 'home'
    | 'explore'
    | 'lobbies'
    | 'teams'
    | 'matches'
    | 'players'
    | 'rewards'
    | 'stats'
    | 'bookings'
    | 'payments'
    | 'profile'
  >('home');
  const [ownerTab, setOwnerTab] = useState<
    | 'dashboard'
    | 'analytics'
    | 'my-turf'
    | 'slots'
    | 'bookings'
    | 'dues'
    | 'offers'
    | 'reviews'
    | 'payments'
    | 'payouts'
    | 'profile'
  >('dashboard');

  // Loading state
  if (loading) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xl italic text-white mb-4 shadow-xl shadow-indigo-500/20 animate-pulse">
          TF
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">TRUFIT</h1>
          <span className="text-indigo-500 font-semibold text-xs tracking-widest uppercase">Connecting</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Loading verified session & arena data...</p>
      </div>
    );
  }

  // If user is not authenticated or email is not verified, show Auth / Verification screen
  if (!user || !emailVerified) {
    return <AuthScreen initialRole="PLAYER" />;
  }

  return (
    <LocationProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {/* Admin Bar (Only visible to authenticated Super Admins) */}
        {isAdmin && <AdminRoleSwitcherBar />}

        {/* Main Content Router based on activeRole (ADMIN / OWNER / PLAYER) */}
        <div className="flex-1 pb-16">
          {activeRole === 'ADMIN' && isAdmin ? (
            <div className="pt-2">
              <AdminVerificationDashboard />
            </div>
          ) : activeRole === 'OWNER' ? (
            <OwnerDashboard currentTab={ownerTab} setCurrentTab={setOwnerTab} />
          ) : (
            <PlayerHome currentTab={playerTab} setCurrentTab={setPlayerTab} />
          )}
        </div>

        {/* Global Bottom Navigation Bar */}
        <nav
          id="global-bottom-navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl py-1.5 px-2"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-start md:justify-around gap-1 overflow-x-auto no-scrollbar">
            {activeRole === 'ADMIN' && isAdmin ? (
              <div className="py-2 text-center text-xs font-semibold text-amber-400 flex items-center justify-between gap-2 w-full px-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin Operations Verification Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveRole('OWNER')}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-md border border-slate-700 font-bold cursor-pointer"
                  >
                    Switch to Owner View →
                  </button>
                  <button
                    onClick={() => setActiveRole('PLAYER')}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-md border border-slate-700 font-bold cursor-pointer"
                  >
                    Switch to Player View →
                  </button>
                </div>
              </div>
            ) : activeRole === 'OWNER' ? (
              // Owner Navigation Tabs
              <>
                <button
                  id="nav-owner-dashboard"
                  onClick={() => setOwnerTab('dashboard')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'dashboard'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  id="nav-owner-analytics"
                  onClick={() => setOwnerTab('analytics')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'analytics'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>

                <button
                  id="nav-owner-turf"
                  onClick={() => setOwnerTab('my-turf')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'my-turf'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>My Turf</span>
                </button>

                <button
                  id="nav-owner-slots"
                  onClick={() => setOwnerTab('slots')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'slots'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Slots</span>
                </button>

                <button
                  id="nav-owner-bookings"
                  onClick={() => setOwnerTab('bookings')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'bookings'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </button>

                <button
                  id="nav-owner-dues"
                  onClick={() => setOwnerTab('dues')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'dues'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Dues</span>
                </button>

                <button
                  id="nav-owner-payment-id"
                  onClick={() => setOwnerTab('payments')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'payments' || ownerTab === 'payouts'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Payment ID</span>
                </button>

                <button
                  id="nav-owner-offers"
                  onClick={() => setOwnerTab('offers')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'offers'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>Offers</span>
                </button>

                <button
                  id="nav-owner-reviews"
                  onClick={() => setOwnerTab('reviews')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'reviews'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>Reviews</span>
                </button>

                <button
                  id="nav-owner-profile"
                  onClick={() => setOwnerTab('profile')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'profile'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  id="nav-owner-logout"
                  onClick={logout}
                  title="Logout"
                  className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              // Player Navigation Tabs
              <>
                <button
                  id="nav-player-home"
                  onClick={() => setPlayerTab('home')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'home'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>

                <button
                  id="nav-player-explore"
                  onClick={() => setPlayerTab('explore')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'explore'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Turfs</span>
                </button>

                <button
                  id="nav-player-lobbies"
                  onClick={() => setPlayerTab('lobbies')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'lobbies'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Lobbies</span>
                </button>

                <button
                  id="nav-player-teams"
                  onClick={() => setPlayerTab('teams')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'teams'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Squads</span>
                </button>

                <button
                  id="nav-player-matches"
                  onClick={() => setPlayerTab('matches')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'matches'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Matches</span>
                </button>

                <button
                  id="nav-player-rewards"
                  onClick={() => setPlayerTab('rewards')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'rewards'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>Rewards</span>
                </button>

                <button
                  id="nav-player-stats"
                  onClick={() => setPlayerTab('stats')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'stats'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Stats</span>
                </button>

                <button
                  id="nav-player-bookings"
                  onClick={() => setPlayerTab('bookings')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'bookings'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </button>

                <button
                  id="nav-player-payments"
                  onClick={() => setPlayerTab('payments')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'payments'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Dues</span>
                </button>

                <button
                  id="nav-player-profile"
                  onClick={() => setPlayerTab('profile')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'profile'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  id="nav-player-logout"
                  onClick={logout}
                  title="Logout"
                  className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </LocationProvider>
  );
}
