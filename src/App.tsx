import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { CitySelectorModal } from './components/CitySelectorModal';
import { AuthScreen } from './components/AuthScreen';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PlayerHome } from './components/PlayerHome';
import { AdminVerificationDashboard } from './components/admin/AdminVerificationDashboard';
import { AdminRoleSwitcherBar } from './components/admin/AdminRoleSwitcherBar';
import { AdminPortalLayout } from './components/admin/portal/AdminPortalLayout';
import { AdminLoginScreen } from './components/admin/portal/AdminLoginScreen';
import { AdminAccessDeniedScreen } from './components/admin/portal/AdminAccessDeniedScreen';
import { TruFitLandingPage } from './components/landing/TruFitLandingPage';
import { TabVisibilityConfig, PlanFeatureConfig, DEFAULT_PLAN_FEATURES, UserRole } from './types';
import { getTabVisibilityConfig, DEFAULT_TAB_VISIBILITY_CONFIG, getEffectiveOwnerPlanFeatures } from './lib/db';
import { DirectMessagesInboxModal } from './components/messaging/DirectMessagesInboxModal';
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
  Flame,
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
  Gamepad2,
  Bell,
  GraduationCap,
  Medal,
  Globe,
  Menu,
  X,
  MessageSquare,
  RefreshCw,
  MapPin,
  ChevronDown,
} from 'lucide-react';

const FootballLoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(10);
  const [stepText, setStepText] = useState('Dribbling onto the pitch...');

  useEffect(() => {
    const steps = [
      'Dribbling onto the pitch...',
      'Checking grass & turf conditions...',
      'Powering up arena floodlights...',
      'Syncing live match slots...',
      'Ready for kickoff! ⚽',
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 15;
        return prev + 18;
      });
      stepIdx = (stepIdx + 1) % steps.length;
      setStepText(steps[stepIdx]);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="app-loading-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
      {/* Brand logo */}
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-4xl mb-4 shadow-xl shadow-emerald-500/20 animate-bounce">
        ⚽
      </div>
      <h1 className="text-2xl font-black tracking-wider text-white">TURFIT</h1>
      <p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mt-1 mb-8">
        Sports Arenas • Community • Bookings
      </p>

      {/* Football pitch track */}
      <div className="w-72 max-w-full">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2 px-1">
          <span className="text-emerald-400 tracking-wider">KICKOFF LOADING</span>
          <span className="text-slate-500 font-mono">00:90</span>
        </div>

        {/* Pitch bar */}
        <div className="relative h-10 bg-[#062013] border border-emerald-500/80 rounded-full overflow-hidden shadow-lg shadow-emerald-950/60 flex items-center">
          {/* Pitch markings */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/15" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/15" />
          <div className="absolute right-0 top-1.5 bottom-1.5 w-7 border-l border-t border-b border-white/15" />

          {/* Green progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-emerald-500/30 transition-all duration-500 ease-out rounded-l-full"
            style={{ width: `${Math.min(progress, 88)}%` }}
          />

          {/* Rolling football */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-10 select-none text-base"
            style={{
              left: `calc(${Math.min(progress, 82)}% + 2px)`,
              transform: `translateY(-50%) rotate(${progress * 7.2}deg)`,
            }}
          >
            ⚽
          </div>

          {/* Goal Net */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm select-none">
            🥅
          </div>
        </div>

        {/* Loading status message */}
        <p className="text-xs text-slate-400 font-medium text-center mt-3 animate-pulse">
          {stepText}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const { user, profile, loading, role, isAdmin, isOwnerRegistered, activeRole, setActiveRole, emailVerified, logout } = useAuth();

  // Tab states for Owner and Player
  const [playerTab, setPlayerTab] = useState<
    | 'home'
    | 'explore'
    | 'feed'
    | 'gaming'
    | 'coaches'
    | 'tournaments'
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
    | 'subscription'
    | 'brand-profile'
    | 'profile'
  >('dashboard');

  const [tabConfig, setTabConfig] = useState<TabVisibilityConfig>(DEFAULT_TAB_VISIBILITY_CONFIG);
  const [ownerPlanFeatures, setOwnerPlanFeatures] = useState<PlanFeatureConfig>(DEFAULT_PLAN_FEATURES);

  // Public Landing Website vs Admin Portal vs App screen controls
  const [isAdminPortalRoute, setIsAdminPortalRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      return (
        hash.startsWith('#admin') ||
        searchParams.get('admin') === 'true' ||
        searchParams.get('portal') === 'admin'
      );
    }
    return false;
  });

  // Robust Admin Route Guard to prevent any authentication / redirect loops
  useEffect(() => {
    if (isAdminPortalRoute && user && !isAdmin) {
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#admin')) {
        window.location.hash = '';
      }
      setIsAdminPortalRoute(false);
    }
  }, [isAdminPortalRoute, user, isAdmin]);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('PLAYER');
  const [showLandingForLoggedIn, setShowLandingForLoggedIn] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [showInboxModal, setShowInboxModal] = useState<boolean>(false);
  const [showCityModal, setShowCityModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronize hash changes for direct #admin route navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin')) {
        setIsAdminPortalRoute(true);
      } else if (isAdminPortalRoute && !hash.startsWith('#admin')) {
        setIsAdminPortalRoute(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdminPortalRoute]);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = () => {
      getTabVisibilityConfig().then((cfg) => {
        if (isMounted && cfg) setTabConfig(cfg);
      });
      if (user?.uid) {
        getEffectiveOwnerPlanFeatures(user.uid).then((feats) => {
          if (isMounted && feats) setOwnerPlanFeatures(feats);
        });
      }
    };
    loadConfig();
    const interval = setInterval(loadConfig, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Strict Navigation Guard: Route player-only accounts away from Owner Portal
  useEffect(() => {
    if (activeRole === 'OWNER' && !isOwnerRegistered) {
      setActiveRole('PLAYER');
    }
  }, [activeRole, isOwnerRegistered, setActiveRole]);

  // Loading state with football loading bar
  if (loading) {
    return <FootballLoadingScreen />;
  }

  // --- PRIVATE ADMIN PORTAL GATED ROUTE ---
  if (isAdminPortalRoute) {
    if (!user) {
      return (
        <AdminLoginScreen
          onLoginSuccess={() => {
            // Trigger auth modal or reload/check admin status
            setShowAuthModal(true);
            setAuthInitialRole('ADMIN');
          }}
          onBack={() => {
            setIsAdminPortalRoute(false);
            if (window.location.hash.startsWith('#admin')) {
              window.location.hash = '';
            }
          }}
        />
      );
    }

    if (!isAdmin) {
      return (
        <AdminAccessDeniedScreen
          onBack={() => {
            setIsAdminPortalRoute(false);
            if (window.location.hash.startsWith('#admin')) {
              window.location.hash = '';
            }
          }}
        />
      );
    }

    // 3. Authenticated Super Admin -> Full TruFit Private Admin Portal
    return (
      <AdminPortalLayout
        onBackToWebsite={() => {
          setIsAdminPortalRoute(false);
          if (window.location.hash.startsWith('#admin')) {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  // If user is not authenticated or email is not verified:
  // Render the Public TruFit Landing Website by default
  if (!user || !emailVerified) {
    if (showAuthModal) {
      return (
        <AuthScreen
          initialRole={authInitialRole}
          onBackToLanding={() => setShowAuthModal(false)}
        />
      );
    }

    return (
      <TruFitLandingPage
        onOpenAdmin={() => {
          setIsAdminPortalRoute(true);
          window.location.hash = '#admin';
        }}
        isLoggedIn={false}
        isAdmin={false}
        onGoToApp={() => {
          setAuthInitialRole('PLAYER');
          setShowAuthModal(true);
        }}
      />
    );
  }

  // If authenticated user chooses to view the Public Website
  if (showLandingForLoggedIn) {
    return (
      <TruFitLandingPage
        onOpenAdmin={() => {
          setIsAdminPortalRoute(true);
          window.location.hash = '#admin';
        }}
        isLoggedIn={true}
        isAdmin={isAdmin}
        onGoToApp={() => setShowLandingForLoggedIn(false)}
        activeRole={activeRole}
      />
    );
  }

  return (
    <LocationProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {/* Admin Bar (Only visible to authenticated Super Admins) */}
        {isAdmin && <AdminRoleSwitcherBar />}

        {/* Mobile Top App Header Bar (Visible on < md screens) */}
        <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
              <span className="text-white font-black text-xs tracking-widest font-mono">TF</span>
            </div>
            <div>
              <h1 className="text-xs font-black text-white tracking-wider flex items-center gap-1 leading-tight">
                TRUFIT <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">OS</span>
              </h1>
              <p className="text-[9px] text-emerald-400 font-medium capitalize mt-0.5">
                {activeRole === 'OWNER' ? 'Owner Portal' : 'Player Arena'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Message Icon */}
            <button
              onClick={() => setShowInboxModal(true)}
              className="p-2 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 relative cursor-pointer active:scale-95 transition-all shadow-md"
              title="Messages & Inbox"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
            </button>

            {/* Refresh Icon */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => {
                  window.location.reload();
                }, 300);
              }}
              className="p-2 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 cursor-pointer active:scale-95 transition-all shadow-md"
              title="Refresh App"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Profile Icon */}
            <button
              onClick={() => {
                if (activeRole === 'OWNER') {
                  setOwnerTab('profile');
                } else {
                  setPlayerTab('profile');
                }
              }}
              className={`p-2 rounded-xl border cursor-pointer active:scale-95 transition-all shadow-md ${
                (activeRole === 'OWNER' && ownerTab === 'profile') || (activeRole === 'PLAYER' && playerTab === 'profile')
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60 ring-2 ring-indigo-500/30'
                  : 'bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700/80 border-slate-700/60'
              }`}
              title="My Profile"
            >
              <User className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Main Content Router based on activeRole (ADMIN / OWNER / PLAYER) */}
        <div className="flex-1 pb-20 md:pb-16 overflow-x-hidden">
          {activeRole === 'ADMIN' && isAdmin ? (
            <div className="pt-0 overflow-x-hidden">
              <AdminPortalLayout onBackToWebsite={() => setShowLandingForLoggedIn(true)} />
            </div>
          ) : activeRole === 'OWNER' && isOwnerRegistered ? (
            <OwnerDashboard currentTab={ownerTab} setCurrentTab={setOwnerTab} />
          ) : (
            <PlayerHome currentTab={playerTab} setCurrentTab={setPlayerTab} />
          )}
        </div>

        {/* Global Bottom Navigation Bar */}
        <nav
          id="global-bottom-navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl py-2 px-3"
        >
          {/* Mobile Simplified Bottom Nav (< md) */}
          <div className="md:hidden flex items-center justify-around gap-1">
            {activeRole === 'ADMIN' && isAdmin ? (
              <div className="py-1 text-center text-xs font-semibold text-amber-400 flex items-center justify-between gap-2 w-full px-2">
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Admin Portal</span>
                <button onClick={() => setActiveRole('PLAYER')} className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-1 rounded">Player View</button>
              </div>
            ) : activeRole === 'OWNER' ? (
              <>
                <button
                  onClick={() => setOwnerTab('dashboard')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    ownerTab === 'dashboard' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setOwnerTab('bookings')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    ownerTab === 'bookings' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </button>
                <button
                  onClick={() => setShowCityModal(true)}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 transition-all max-w-[70px] cursor-pointer"
                  title="Select Location / City"
                >
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Location</span>
                </button>
                <button
                  onClick={() => setOwnerTab('my-turf')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    ownerTab === 'my-turf' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>My Turf</span>
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400 p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 cursor-pointer"
                >
                  <Menu className="w-4 h-4 text-indigo-400" />
                  <span>Menu</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setPlayerTab('home')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    playerTab === 'home' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setPlayerTab('explore')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    playerTab === 'explore' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Turfs</span>
                </button>
                <button
                  onClick={() => setShowCityModal(true)}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 transition-all max-w-[70px] cursor-pointer"
                  title="Select Location / City"
                >
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Location</span>
                </button>
                <button
                  onClick={() => setPlayerTab('bookings')}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-all p-1.5 rounded-xl cursor-pointer ${
                    playerTab === 'bookings' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400 p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 cursor-pointer"
                >
                  <Menu className="w-4 h-4 text-indigo-400" />
                  <span>Menu</span>
                </button>
              </>
            )}
          </div>

          {/* Desktop Full Navigation (hidden on < md) */}
          <div className="hidden md:flex max-w-5xl mx-auto items-center justify-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {activeRole === 'ADMIN' && isAdmin ? (
              <div className="py-2 text-center text-xs font-semibold text-amber-400 flex items-center justify-between gap-2 w-full px-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>TruFit Private Admin Portal</span>
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
                {tabConfig.ownerTabs.dashboard !== false && (
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
                )}

                {tabConfig.ownerTabs.analytics !== false && (
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
                )}

                {tabConfig.ownerTabs['my-turf'] !== false && (
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
                )}

                {tabConfig.ownerTabs.slots !== false && (
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
                )}

                {tabConfig.ownerTabs.bookings !== false && (
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
                )}

                {tabConfig.ownerTabs.dues !== false && (ownerPlanFeatures.duesTracker !== false || ownerPlanFeatures.athleteAccounts !== false) && (
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
                )}

                {tabConfig.ownerTabs.payments !== false && (
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
                )}

                {tabConfig.ownerTabs.offers !== false && (
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
                )}

                {tabConfig.ownerTabs.reviews !== false && (
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
                )}

                <button
                  id="nav-owner-brand-profile"
                  onClick={() => setOwnerTab('brand-profile')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'brand-profile'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Brand Page</span>
                </button>

                <button
                  id="nav-owner-subscription"
                  onClick={() => setOwnerTab('subscription')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0 ${
                    ownerTab === 'subscription'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Subscription</span>
                </button>

                {tabConfig.ownerTabs.profile !== false && (
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
                )}

                {isAdmin && (
                  <button
                    id="nav-owner-switch-admin"
                    onClick={() => setActiveRole('ADMIN')}
                    title="Switch to Super Admin Console"
                    className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 transition-all cursor-pointer py-1.5 px-2.5 rounded-xl shrink-0 shadow-lg shadow-amber-950/40"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Admin Mode</span>
                  </button>
                )}

                <button
                  id="nav-owner-website"
                  onClick={() => setShowLandingForLoggedIn(true)}
                  title="View Public TruFit Website"
                  className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer py-1.5 px-2 rounded-xl shrink-0"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
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
                {tabConfig.playerTabs.home !== false && (
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
                )}

                {tabConfig.playerTabs.explore !== false && (
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
                )}

                <button
                  id="nav-player-feed"
                  onClick={() => setPlayerTab('feed')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'feed'
                      ? 'text-orange-400 bg-orange-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Feed</span>
                </button>

                {tabConfig.playerTabs.gaming !== false && (
                  <button
                    id="nav-player-gaming"
                    onClick={() => setPlayerTab('gaming')}
                    className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                      playerTab === 'gaming'
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Gaming</span>
                  </button>
                )}

                <button
                  id="nav-player-coaches"
                  onClick={() => setPlayerTab('coaches')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'coaches'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Coaches</span>
                </button>

                <button
                  id="nav-player-tournaments"
                  onClick={() => setPlayerTab('tournaments')}
                  className={`flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0 ${
                    playerTab === 'tournaments'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Medal className="w-4 h-4" />
                  <span>Tournaments</span>
                </button>

                {tabConfig.playerTabs.lobbies !== false && (
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
                )}

                {tabConfig.playerTabs.teams !== false && (
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
                )}

                {tabConfig.playerTabs.matches !== false && (
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
                )}

                {tabConfig.playerTabs.rewards !== false && (
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
                )}

                {tabConfig.playerTabs.stats !== false && (
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
                )}

                {tabConfig.playerTabs.bookings !== false && (
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
                )}

                {tabConfig.playerTabs.payments !== false && (
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
                )}

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

                {isOwnerRegistered && (
                  <button
                    id="nav-player-switch-owner"
                    onClick={() => setActiveRole('OWNER')}
                    title="Switch to Owner Portal"
                    className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/40 transition-all cursor-pointer py-1 px-2 rounded-xl shrink-0 shadow-sm"
                  >
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Owner Portal</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    id="nav-player-switch-admin"
                    onClick={() => setActiveRole('ADMIN')}
                    title="Switch to Super Admin Console"
                    className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 transition-all cursor-pointer py-1 px-2 rounded-xl shrink-0 shadow-lg shadow-amber-950/40"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Admin Mode</span>
                  </button>
                )}

                <button
                  id="nav-player-website"
                  onClick={() => setShowLandingForLoggedIn(true)}
                  title="View Public TruFit Website"
                  className="flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer py-1 px-1.5 rounded-xl shrink-0"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
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

        {/* Mobile More Menu Drawer / Modal */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fadeIn">
            <div className="w-full max-w-xs bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs">
                    TF
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">TruFit Menu</h2>
                    <p className="text-[10px] text-slate-400 capitalize">{activeRole} Navigation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex-1 space-y-4">
                {activeRole === 'OWNER' ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner Management</p>
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                      { id: 'my-turf', label: 'My Turf', icon: Building2 },
                      { id: 'slots', label: 'Slots', icon: Clock },
                      { id: 'bookings', label: 'Bookings', icon: Calendar },
                      { id: 'dues', label: 'Dues', icon: CreditCard },
                      { id: 'payments', label: 'Payment ID', icon: QrCode },
                      { id: 'offers', label: 'Offers', icon: Tag },
                      { id: 'reviews', label: 'Reviews', icon: Star },
                      { id: 'brand-profile', label: 'Brand Page', icon: Building2 },
                      { id: 'subscription', label: 'Subscription', icon: Sparkles },
                      { id: 'profile', label: 'Profile', icon: User },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = ownerTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setOwnerTab(item.id as any);
                            setShowMobileMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    {isOwnerRegistered && (
                      <button
                        onClick={() => {
                          setActiveRole('PLAYER');
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 mt-4"
                      >
                        <User className="w-4 h-4" />
                        <span>Switch to Player View</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Player & Community</p>
                    {[
                      { id: 'home', label: 'Home', icon: Home },
                      { id: 'explore', label: 'Turfs & Arenas', icon: Compass },
                      { id: 'feed', label: 'Community Feed', icon: Flame },
                      { id: 'gaming', label: 'Gaming Zone', icon: Gamepad2 },
                      { id: 'coaches', label: 'Coaches & Academies', icon: GraduationCap },
                      { id: 'tournaments', label: 'Tournaments', icon: Medal },
                      { id: 'lobbies', label: 'Lobbies', icon: Users },
                      { id: 'teams', label: 'Squads', icon: Shield },
                      { id: 'matches', label: 'Matches', icon: Trophy },
                      { id: 'rewards', label: 'Rewards', icon: Gift },
                      { id: 'bookings', label: 'My Bookings', icon: Calendar },
                      { id: 'payments', label: 'Player Payments', icon: CreditCard },
                      { id: 'profile', label: 'My Profile', icon: User },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = playerTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setPlayerTab(item.id as any);
                            setShowMobileMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    {isOwnerRegistered && (
                      <button
                        onClick={() => {
                          setActiveRole('OWNER');
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 mt-4"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Switch to Owner Portal</span>
                      </button>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveRole('ADMIN');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Mode Console</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowLandingForLoggedIn(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                >
                  <Globe className="w-4 h-4" />
                  <span>View Public Website</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Direct Messages Inbox Modal triggered from top mobile header */}
        {showInboxModal && (
          <DirectMessagesInboxModal
            isOpen={showInboxModal}
            onClose={() => setShowInboxModal(false)}
          />
        )}
        {/* City Location Selector Modal */}
        {showCityModal && (
          <CitySelectorModal
            isOpen={showCityModal}
            onClose={() => setShowCityModal(false)}
          />
        )}
      </div>
    </LocationProvider>
  );
}
