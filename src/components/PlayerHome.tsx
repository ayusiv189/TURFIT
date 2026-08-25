import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { Turf, Arena, Slot, Booking, Lobby, Match } from '../types';
import {
  getAllActiveTurfs,
  getTurfArenas,
  getArenaSlotsByDate,
  getPlayerBookings,
  getPaymentTransactionsForUser,
  bookSlotWithTransaction,
} from '../lib/db';
import {
  formatCurrency,
  formatDateString,
  getDayName,
  getTodayDateString,
  getNextDays,
  calculateDistanceKm,
} from '../lib/utils';
import { InteractiveTurfMap } from './InteractiveTurfMap';
import { LobbiesTab } from './community/LobbiesTab';
import { TeamsTab } from './community/TeamsTab';
import { MatchesTab } from './community/MatchesTab';
import { FindPlayersTab } from './community/FindPlayersTab';
import { NotificationsModal } from './community/NotificationsModal';
import { CreateLobbyModal } from './community/CreateLobbyModal';
import { RewardsTab } from './rewards/RewardsTab';
import { PlayerStatsTab } from './player/PlayerStatsTab';
import { PlayerPaymentsTab } from './payments/PlayerPaymentsTab';
import { WriteReviewModal } from './reviews/WriteReviewModal';
import { TurfReviewsSection } from './reviews/TurfReviewsSection';
import { PaymentSplitModal } from './payments/PaymentSplitModal';
import { openDirectionsInMaps } from '../lib/navigation';
import { applyCouponOffer } from '../lib/phase3';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import confetti from 'canvas-confetti';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Filter,
  Navigation,
  Compass,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Bell,
  Users,
  Shield,
  Plus,
  Activity,
  UserPlus,
  Sparkles,
  Share2,
  Gift,
  Star,
  BarChart2,
  Tag,
  ExternalLink,
} from 'lucide-react';

interface PlayerHomeProps {
  currentTab:
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
    | 'profile';
  setCurrentTab: (tab: any) => void;
}

export const PlayerHome: React.FC<PlayerHomeProps> = ({ currentTab, setCurrentTab }) => {
  const { user, profile, updateUserProfile } = useAuth();
  const {
    userLocation,
    permissionGranted,
    permissionDenied,
    loadingLocation,
    requestLocation,
    setManualLocation,
  } = useLocation();

  // Firestore Collections State
  const [allTurfs, setAllTurfs] = useState<Turf[]>([]);
  const [playerBookings, setPlayerBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Booking Flow Steps State
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_LATER_AT_TURF');
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<Booking | null>(null);

  // Discovery Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('ALL');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number>(50);

  // Community state & Live map data
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Cross-feature triggers
  const [showCreateLobbyModal, setShowCreateLobbyModal] = useState<boolean>(false);
  const [selectedBookingForLobby, setSelectedBookingForLobby] = useState<Booking | null>(null);
  const [initialMatchLobby, setInitialMatchLobby] = useState<Lobby | null>(null);

  // Phase 3 State: Reviews, Payment Split, Offers
  const [showWriteReviewModal, setShowWriteReviewModal] = useState<boolean>(false);
  const [reviewTargetTurf, setReviewTargetTurf] = useState<{ id: string; name: string } | null>(null);
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitTargetBooking, setSplitTargetBooking] = useState<Booking | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false);

  // Profile Edit fields
  const [editName, setEditName] = useState<string>(profile?.displayName || '');
  const [editPhone, setEditPhone] = useState<string>(profile?.phoneNumber || '');
  const [editCity, setEditCity] = useState<string>(profile?.city || '');
  const [editSport, setEditSport] = useState<string>(profile?.preferredSport || 'Football');
  const [editPosition, setEditPosition] = useState<string>(profile?.preferredPosition || 'Forward');
  const [editSports, setEditSports] = useState<string[]>(
    profile?.preferredSports?.length
      ? profile.preferredSports
      : profile?.preferredSport
      ? [profile.preferredSport]
      : ['Football']
  );
  const [editPositions, setEditPositions] = useState<string[]>(
    profile?.preferredPositions?.length
      ? profile.preferredPositions
      : profile?.preferredPosition
      ? [profile.preferredPosition]
      : ['Forward']
  );
  const [customPositionInput, setCustomPositionInput] = useState<string>('');
  const [editExperience, setEditExperience] = useState<string>(profile?.experienceLevel || 'INTERMEDIATE');
  const [editBio, setEditBio] = useState<string>(profile?.bio || '');
  const [editInstagram, setEditInstagram] = useState<string>(profile?.instagram || '');
  const [editDiscord, setEditDiscord] = useState<string>(profile?.discord || '');

  // Keep edit state in sync when profile finishes loading
  useEffect(() => {
    if (profile) {
      if (profile.displayName) setEditName(profile.displayName);
      if (profile.phoneNumber) setEditPhone(profile.phoneNumber);
      if (profile.city) setEditCity(profile.city);
      if (profile.experienceLevel) setEditExperience(profile.experienceLevel);
      if (profile.bio !== undefined) setEditBio(profile.bio);
      if (profile.instagram) setEditInstagram(profile.instagram);
      if (profile.discord) setEditDiscord(profile.discord);
      if (profile.preferredSports && profile.preferredSports.length > 0) {
        setEditSports(profile.preferredSports);
      } else if (profile.preferredSport) {
        setEditSports([profile.preferredSport]);
      }
      if (profile.preferredPositions && profile.preferredPositions.length > 0) {
        setEditPositions(profile.preferredPositions);
      } else if (profile.preferredPosition) {
        setEditPositions([profile.preferredPosition]);
      }
    }
  }, [profile]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type: type === 'info' ? 'success' : type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time listener for unread notifications
  useEffect(() => {
    if (!user) {
      setUnreadNotifsCount(0);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadNotifsCount(snap.size);
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for lobbies (for map and quick widgets)
  useEffect(() => {
    const q = query(collection(db, 'lobbies'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Lobby[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Lobby));
      setLobbies(list);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for matches (for map and quick widgets)
  useEffect(() => {
    const q = query(collection(db, 'matches'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Match[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Match));
      setMatches(list);
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const activeTurfs = await getAllActiveTurfs();
      setAllTurfs(activeTurfs);

      if (user) {
        const bookingsData = await getPlayerBookings(user.uid);
        setPlayerBookings(bookingsData);
      }
    } catch (err: any) {
      console.error('Error loading player data:', err);
      showToast('Error loading active turfs from Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // When turf is selected, load its arenas
  const handleSelectTurf = async (turf: Turf) => {
    setSelectedTurf(turf);
    setSelectedSlot(null);
    try {
      const turfArenas = await getTurfArenas(turf.id);
      setArenas(turfArenas);
      if (turfArenas.length > 0) {
        setSelectedArena(turfArenas[0]);
        // load slots for today
        await loadArenaSlots(turfArenas[0].id, selectedDate);
      } else {
        setSelectedArena(null);
        setSlots([]);
      }
    } catch (err) {
      showToast('Failed to load turf courts.', 'error');
    }
  };

  const handleSelectArena = async (arena: Arena) => {
    setSelectedArena(arena);
    setSelectedSlot(null);
    await loadArenaSlots(arena.id, selectedDate);
  };

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (selectedArena) {
      await loadArenaSlots(selectedArena.id, dateStr);
    }
  };

  const loadArenaSlots = async (arenaId: string, dateStr: string) => {
    try {
      const arenaSlots = await getArenaSlotsByDate(arenaId, dateStr);
      // Filter only slots visible to players
      const visibleSlots = arenaSlots.filter((s) => s.visibleToPlayers !== false);
      setSlots(visibleSlots);
    } catch (err) {
      showToast('Failed to load slots for this date.', 'error');
    }
  };

  // Apply Coupon / Discount Code
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim() || !selectedSlot) return;
    setValidatingCoupon(true);
    try {
      const res = await applyCouponOffer(
        couponCodeInput.trim(),
        selectedTurf?.id || '',
        selectedArena?.id || '',
        selectedSlot.date,
        selectedSlot.day,
        selectedSlot.price
      );
      if (res.valid) {
        setAppliedDiscount(res.discountAmount);
        setAppliedCouponCode(couponCodeInput.trim().toUpperCase());
        showToast(res.message || `Saved ₹${res.discountAmount}!`);
      } else {
        showToast(res.message || 'Invalid coupon code', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to apply coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Perform Double-Booking-Guarded Booking Confirmation
  const handleConfirmBooking = async () => {
    if (!user || !selectedTurf || !selectedArena || !selectedSlot) return;

    setBookingLoading(true);
    try {
      const finalAmount = Math.max(0, selectedSlot.price - appliedDiscount);

      const confirmed = await bookSlotWithTransaction({
        playerId: user.uid,
        playerName: profile?.displayName || user.displayName || 'Player',
        playerEmail: user.email || '',
        playerPhone: profile?.phoneNumber || '',
        ownerId: selectedTurf.ownerId,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address,
        turfArea: selectedTurf.area,
        turfCity: selectedTurf.city,
        arenaId: selectedArena.id,
        arenaName: selectedArena.name,
        sport: selectedArena.sport,
        slotId: selectedSlot.id,
        date: selectedSlot.date,
        day: selectedSlot.day,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes,
        totalAmount: finalAmount,
        paymentMethod: paymentOption,
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setConfirmedBookingDetails(confirmed);
      setShowSummaryModal(false);
      setAppliedDiscount(0);
      setAppliedCouponCode(null);
      setCouponCodeInput('');
      showToast('Booking confirmed successfully!');

      // Refresh slot list and player bookings
      await loadArenaSlots(selectedArena.id, selectedDate);
      await loadData();
    } catch (err: any) {
      console.error('Booking failed:', err);
      // Handles slot already booked error gracefully
      showToast(err.message || 'Sorry, this slot was just booked by another player.', 'error');
      // Refresh current slots
      if (selectedArena) {
        await loadArenaSlots(selectedArena.id, selectedDate);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Filter and sort turfs by distance & sport
  const filteredTurfs = allTurfs.filter((turf) => {
    const matchesSearch =
      searchQuery === '' ||
      turf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSport =
      selectedSportFilter === 'ALL' || turf.sports?.includes(selectedSportFilter);

    if (!matchesSearch || !matchesSport) return false;

    if (userLocation) {
      const dist = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        turf.latitude,
        turf.longitude
      );
      if (dist > maxDistanceFilter) return false;
    }

    return true;
  });

  const nextDays = getNextDays(7);
  const upcomingPlayerBookings = playerBookings.filter(
    (b) => b.bookingStatus === 'CONFIRMED' && b.date >= getTodayDateString()
  );
  const pendingPlayerDues = playerBookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 sm:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500'
              : 'bg-rose-950/90 text-rose-200 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-indigo-600/30">
              TF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                  TRUFIT <span className="text-indigo-500 font-medium text-xs sm:text-sm ml-1.5 tracking-widest uppercase">Player</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>{profile?.city || 'Discovery Active'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Bell */}
            <button
              id="notifications-bell-btn"
              onClick={() => setShowNotificationsModal(true)}
              title="Invitations & Notifications"
              className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-indigo-400" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              onClick={loadData}
              title="Refresh Real Turfs"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setCurrentTab('explore')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/40 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Book a Turf</span>
            </button>
          </div>
        </div>
      </header>

      {/* Geolocation Permission Banner if denied */}
      {permissionDenied && (
        <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Location permission is required to show accurate distances to nearby turfs.
            </span>
          </div>
          <button
            onClick={requestLocation}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1 rounded-lg text-xs cursor-pointer"
          >
            Allow Location
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ================= TAB: PLAYER HOME ================= */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Status Cards for Player */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Upcoming booking card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Upcoming Booking
                    </span>
                    <Calendar className="w-4 h-4 text-indigo-400" />
                  </div>
                  {upcomingPlayerBookings.length > 0 ? (
                    <div>
                      <span className="text-base font-bold text-white block">
                        {upcomingPlayerBookings[0].turfName}
                      </span>
                      <span className="text-xs text-indigo-400 font-semibold block mt-0.5">
                        {formatDateString(upcomingPlayerBookings[0].date)} • {upcomingPlayerBookings[0].startTime}
                      </span>
                      <span className="text-xs text-slate-400 mt-1 block">
                        {upcomingPlayerBookings[0].arenaName} ({upcomingPlayerBookings[0].sport})
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm text-slate-400 block">No upcoming matches</span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Find a nearby turf and book your slot.
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentTab('explore')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{upcomingPlayerBookings.length > 0 ? 'View all bookings' : 'Explore turfs now'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pending Payment card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl border-l-4 border-l-amber-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Pending Turf Dues
                    </span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-bold text-amber-400">
                    {formatCurrency(pendingPlayerDues)}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Pay at venue counter upon arrival
                  </span>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentTab('payments')}
                    className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Payment history</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Book Callout */}
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                    Instant Discovery
                  </span>
                  <h3 className="text-base font-bold text-white">Find Active Courts</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Discover {allTurfs.length} sports arenas and lock your slot instantly.
                  </p>
                </div>
                <button
                  id="home-book-turf-btn"
                  onClick={() => setCurrentTab('explore')}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-950/40"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Book a Turf</span>
                </button>
              </div>
            </div>

            {/* Phase 2 Community Quick-Action Banners */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setCurrentTab('lobbies')}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col items-start text-left group transition-all cursor-pointer shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white">Lobbies</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                    {lobbies.length} Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Find & join open pickup games</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('teams')}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl flex flex-col items-start text-left group transition-all cursor-pointer shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Squads</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Build your team & roster</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('matches')}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col items-start text-left group transition-all cursor-pointer shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white">Matches</span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                    {matches.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Host & join friendly fixtures</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('players')}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl flex flex-col items-start text-left group transition-all cursor-pointer shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Find Athletes</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Discover local sports partners</p>
              </button>
            </div>

            {/* Live Interactive Turf Map */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Live Turf & Match Map</h3>
                  <p className="text-xs text-slate-400">
                    Real location markers of sports turfs, active lobbies, and matches around you
                  </p>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">
                  {filteredTurfs.length} Arenas
                </span>
              </div>

              <InteractiveTurfMap
                userLocation={userLocation}
                turfs={allTurfs}
                lobbies={lobbies}
                matches={matches}
                selectedTurfId={selectedTurf?.id}
                onSelectTurf={(turf) => {
                  handleSelectTurf(turf);
                  setCurrentTab('explore');
                }}
                onSelectLobby={(lobby) => {
                  setCurrentTab('lobbies');
                }}
                onSelectMatch={(match) => {
                  setCurrentTab('matches');
                }}
              />
            </div>

            {/* Nearby Turfs List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Nearby Sports Turfs</h3>
                <button
                  onClick={() => setCurrentTab('explore')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  View all ({allTurfs.length}) →
                </button>
              </div>

              {allTurfs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No turfs available in database. (Turf owners will list courts here).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTurfs.slice(0, 3).map((turf, turfIdx) => {
                    const dist = userLocation
                      ? calculateDistanceKm(
                          userLocation.latitude,
                          userLocation.longitude,
                          turf.latitude,
                          turf.longitude
                        )
                      : null;

                    return (
                      <div
                        key={turf.id || `nearby_turf_${turfIdx}`}
                        onClick={() => {
                          handleSelectTurf(turf);
                          setCurrentTab('explore');
                        }}
                        className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-4 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          {/* Photo or placeholder banner */}
                          <div className="w-full h-36 bg-slate-950 rounded-xl overflow-hidden mb-3 relative border border-slate-800">
                            {turf.photos && turf.photos.length > 0 ? (
                              <img
                                src={turf.photos[0]}
                                alt={turf.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-950">
                                <Trophy className="w-12 h-12 opacity-30" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-slate-900/90 text-white font-bold text-xs px-2.5 py-1 rounded-lg backdrop-blur-md border border-slate-700">
                              {formatCurrency(turf.basePrice)} / slot
                            </div>
                            {dist !== null && (
                              <div className="absolute bottom-2 left-2 bg-indigo-950/90 text-indigo-300 font-semibold text-[10px] px-2 py-0.5 rounded backdrop-blur-md border border-indigo-500/30">
                                {dist} km away
                              </div>
                            )}
                          </div>

                          <h4 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors">
                            {turf.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {turf.address}, {turf.area}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {turf.sports?.slice(0, 3).map((s, i) => (
                              <span
                                key={`nearby_${turf.id || turfIdx}_sport_${s}_${i}`}
                                className="bg-slate-950 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-800"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                          <span>View Available Slots</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: EXPLORE & BOOKING FLOW ================= */}
        {currentTab === 'explore' && (
          <div className="space-y-6">
            {/* Turf Selection / Discovery Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Find & Book a Turf</h2>
                  <p className="text-xs text-slate-400">
                    Select court, date, and available time slot
                  </p>
                </div>

                {/* Search query input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by turf name, area, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Sports filter chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {['ALL', 'Football', 'Box Cricket', 'Badminton', 'Basketball', 'Pickleball'].map((sport) => (
                  <button
                    key={`sport_filter_${sport}`}
                    onClick={() => setSelectedSportFilter(sport)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedSportFilter === sport
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sport === 'ALL' ? 'All Sports' : sport}
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column: Left Turf Listings / Right Booking Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Turfs List */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Available Turfs ({filteredTurfs.length})
                </span>

                {filteredTurfs.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    No turfs match your filter.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                    {filteredTurfs.map((turf, turfIdx) => {
                      const isSelected = selectedTurf?.id === turf.id;
                      const dist = userLocation
                        ? calculateDistanceKm(
                            userLocation.latitude,
                            userLocation.longitude,
                            turf.latitude,
                            turf.longitude
                          )
                        : null;

                      return (
                        <div
                          key={turf.id ? `explore_turf_${turf.id}` : `explore_turf_idx_${turfIdx}`}
                          onClick={() => handleSelectTurf(turf)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500/30'
                              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-white">{turf.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {turf.area}, {turf.city}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                              {formatCurrency(turf.basePrice)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                            <span>Hours: {turf.openingTime} - {turf.closingTime}</span>
                            {dist !== null && <span>📍 {dist} km away</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Booking Detail Panel */}
              <div className="lg:col-span-7 space-y-4">
                {!selectedTurf ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                    <Building className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-bold text-white mb-1">Select a Turf</h3>
                    <p className="text-xs">Choose any turf from the left list to view arena courts and available slots.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Turf Header Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <h3 className="text-lg font-bold text-white">{selectedTurf.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {selectedTurf.address}, {selectedTurf.area}, {selectedTurf.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDirectionsInMaps(selectedTurf)}
                            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Directions</span>
                          </button>
                          <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                            📞 {selectedTurf.phoneNumber}
                          </span>
                        </div>
                      </div>

                      {/* Step 1: Arena Selection */}
                      <div className="mt-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          1. Select Arena Court ({arenas.length})
                        </span>
                        {arenas.length === 0 ? (
                          <div className="bg-slate-950 p-4 rounded-xl text-center text-xs text-slate-500">
                            No arenas configured for this turf yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {arenas.map((ar, arIdx) => {
                              const isArSelected = selectedArena?.id === ar.id;
                              return (
                                <button
                                  key={ar.id ? `arena_select_${ar.id}` : `arena_select_idx_${arIdx}`}
                                  onClick={() => handleSelectArena(ar)}
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    isArSelected
                                      ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/40'
                                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-white">{ar.name}</span>
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                      {ar.sport}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Cap: {ar.capacity}</span>
                                    <span className="text-indigo-400 font-bold">
                                      {formatCurrency(ar.pricePerSlot)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Step 2: Date Selector */}
                      <div className="mt-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          2. Select Date ({formatDateString(selectedDate)})
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {nextDays.map((d, dIdx) => {
                            const isDateSelected = d.dateStr === selectedDate;
                            return (
                              <button
                                key={`date_select_${d.dateStr}_${dIdx}`}
                                onClick={() => handleSelectDate(d.dateStr)}
                                className={`min-w-[70px] p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                                  isDateSelected
                                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase">{d.dayName}</span>
                                <span className="text-sm font-bold">{d.formatted.split(' ')[1]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Step 3: Slots Grid */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            3. Select Available Slot
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {slots.filter((s) => s.status === 'AVAILABLE').length} Available
                          </span>
                        </div>

                        {slots.length === 0 ? (
                          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-500">
                            No slots listed for {selectedArena?.name} on this date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {slots.map((slot, slotIdx) => {
                              const isAvailable = slot.status === 'AVAILABLE';
                              const isSelected = selectedSlot?.id === slot.id;

                              return (
                                <button
                                  key={slot.id ? `slot_select_${slot.id}` : `slot_select_${slot.startTime}_${slotIdx}`}
                                  disabled={!isAvailable}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`p-3 rounded-xl border text-center transition-all ${
                                    isSelected
                                      ? 'border-indigo-400 bg-indigo-600 text-white font-bold shadow-lg ring-2 ring-indigo-400/50'
                                      : isAvailable
                                      ? 'border-slate-700 bg-slate-950 text-slate-200 hover:border-indigo-500 hover:bg-slate-800 cursor-pointer'
                                      : 'border-slate-800/60 bg-slate-950/40 text-slate-600 cursor-not-allowed line-through'
                                  }`}
                                >
                                  <span className="text-xs block font-bold">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                  <span
                                    className={`text-[10px] block mt-0.5 ${
                                      isSelected ? 'text-indigo-100' : isAvailable ? 'text-indigo-400 font-semibold' : 'text-slate-600'
                                    }`}
                                  >
                                    {isAvailable ? formatCurrency(slot.price) : 'Booked'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Proceed to Booking Action */}
                      {selectedSlot && (
                        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between animate-in fade-in">
                          <div>
                            <span className="text-xs text-slate-400 block">Selected Slot:</span>
                            <span className="text-sm font-bold text-white">
                              {selectedSlot.startTime} - {selectedSlot.endTime} ({formatCurrency(selectedSlot.price)})
                            </span>
                          </div>
                          <button
                            id="proceed-booking-btn"
                            onClick={() => setShowSummaryModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-lg flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 cursor-pointer"
                          >
                            <span>Proceed to Summary</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Turf Reviews & Ratings Section */}
                    <TurfReviewsSection
                      turfId={selectedTurf.id}
                      turfName={selectedTurf.name}
                      onWriteReview={() => {
                        setReviewTargetTurf({ id: selectedTurf.id, name: selectedTurf.name });
                        setShowWriteReviewModal(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: LOBBIES & MATCHMAKING ================= */}
        {currentTab === 'lobbies' && (
          <LobbiesTab
            onHostMatch={(lobby) => {
              setInitialMatchLobby(lobby);
              setCurrentTab('matches');
            }}
            showToast={showToast}
          />
        )}

        {/* ================= TAB: TEAMS & SQUADS ================= */}
        {currentTab === 'teams' && <TeamsTab showToast={showToast} />}

        {/* ================= TAB: MATCHES & FIXTURES ================= */}
        {currentTab === 'matches' && (
          <MatchesTab
            initialLobbyToHost={initialMatchLobby}
            onClearInitialLobby={() => setInitialMatchLobby(null)}
            showToast={showToast}
          />
        )}

        {/* ================= TAB: FIND PLAYERS ================= */}
        {currentTab === 'players' && <FindPlayersTab showToast={showToast} />}

        {/* ================= TAB: REWARDS & LOYALTY ================= */}
        {currentTab === 'rewards' && (
          <RewardsTab
            showToast={showToast}
            onBookSlot={() => setCurrentTab('explore')}
          />
        )}

        {/* ================= TAB: PLAYER STATS & CAREER ================= */}
        {currentTab === 'stats' && <PlayerStatsTab showToast={showToast} />}

        {/* ================= TAB: BOOKINGS HISTORY ================= */}
        {currentTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">My Bookings History</h2>
                <p className="text-xs text-slate-400">All upcoming, completed, and confirmed reservations</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('explore')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Booking</span>
              </button>
            </div>

            {playerBookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                No bookings yet. Explore turfs and reserve your court.
              </div>
            ) : (
              <div className="space-y-3">
                {playerBookings.map((b, bIdx) => (
                  <div
                    key={b.id ? `booking_card_${b.id}` : `booking_card_idx_${b.bookingId || bIdx}`}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                          {b.bookingId}
                        </span>
                        <h4 className="text-base font-bold text-white">{b.turfName}</h4>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                        <span>{b.arenaName} ({b.sport})</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-semibold">{formatDateString(b.date)}</span>
                        <span>•</span>
                        <span>{b.startTime} - {b.endTime}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{b.turfAddress}, {b.turfCity}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-left md:text-right">
                        <span className="text-base font-bold text-white block">
                          {formatCurrency(b.totalAmount)}
                        </span>
                        <div className="text-xs flex items-center gap-1.5 justify-start md:justify-end">
                          <span
                            className={`font-semibold ${
                              b.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            Payment: {b.paymentStatus}
                          </span>
                        </div>
                        {b.amountDue > 0 && (
                          <span className="text-[11px] text-rose-400 font-bold block">
                            Due at turf: {formatCurrency(b.amountDue)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDirectionsInMaps({ name: b.turfName, address: b.turfAddress, city: b.turfCity })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          title="Get Directions"
                        >
                          <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Maps</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSplitTargetBooking(b);
                            setShowSplitModal(true);
                          }}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Split Bill</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReviewTargetTurf({ id: b.turfId, name: b.turfName });
                            setShowWriteReviewModal(true);
                          }}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Rate Turf</span>
                        </button>

                        {b.bookingStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForLobby(b);
                              setShowCreateLobbyModal(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Host Lobby</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: PAYMENTS & DUES ================= */}
        {currentTab === 'payments' && (
          <PlayerPaymentsTab
            showToast={showToast}
            onPayDue={() => {
              showToast('Direct payment counter settlement recorded.');
            }}
          />
        )}

        {/* ================= TAB: PLAYER PROFILE ================= */}
        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Profile Card Header Preview */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-indigo-950/50 flex-shrink-0">
                    {profile?.displayName?.charAt(0) || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{profile?.displayName || 'Sports Athlete'}</h2>
                      <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase">
                        Verified Player
                      </span>
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                        {profile?.experienceLevel || 'INTERMEDIATE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{profile?.email} • {profile?.city || 'Location not set'}</p>

                    {/* Bio Display Preview */}
                    {profile?.bio && (
                      <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 mt-2 italic">
                        "{profile.bio}"
                      </p>
                    )}

                    {/* Sports & Positions Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {(profile?.preferredSports?.length ? profile.preferredSports : [profile?.preferredSport || 'Football']).map((sp, idx) => (
                        <span key={`prof_sport_${sp}_${idx}`} className="bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold px-2 py-0.5 rounded-lg">
                          ⚽ {sp}
                        </span>
                      ))}
                      {(profile?.preferredPositions?.length ? profile.preferredPositions : [profile?.preferredPosition || 'Forward']).map((pos, idx) => (
                        <span key={`prof_pos_${pos}_${idx}`} className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-lg">
                          🏷️ {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (editSports.length === 0) {
                    showToast('Please select at least one sport you play.', 'error');
                    return;
                  }
                  try {
                    await updateUserProfile({
                      displayName: editName,
                      phoneNumber: editPhone,
                      city: editCity,
                      preferredSport: editSports[0] || editSport,
                      preferredSports: editSports,
                      preferredPosition: editPositions[0] || editPosition,
                      preferredPositions: editPositions,
                      experienceLevel: editExperience as any,
                      bio: editBio,
                      instagram: editInstagram,
                      discord: editDiscord,
                    });
                    showToast('Player profile, sports, positions & bio saved successfully!');
                  } catch (err) {
                    showToast('Failed to update profile.', 'error');
                  }
                }}
                className="space-y-5 pt-4 border-t border-slate-800"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">City / Region</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="e.g. Mumbai, Bangalore..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 1. MULTI-SPORT SELECTION */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <span>⚽ Sports You Play (Select Multiple)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {editSports.length} Selected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tap to add or remove sports. Matchmaking and open lobbies will be tailored to these sports.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: 'Football', icon: '⚽' },
                      { name: 'Box Cricket', icon: '🏏' },
                      { name: 'Badminton', icon: '🏸' },
                      { name: 'Basketball', icon: '🏀' },
                      { name: 'Pickleball', icon: '🏓' },
                      { name: 'Tennis', icon: '🎾' },
                      { name: 'Volleyball', icon: '🏐' },
                      { name: 'Padel', icon: '🎾' },
                      { name: 'Table Tennis', icon: '🏓' },
                    ].map((sp, spIdx) => {
                      const isSelected = editSports.includes(sp.name);
                      return (
                        <button
                          key={`edit_sport_btn_${sp.name}_${spIdx}`}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (editSports.length > 1) {
                                setEditSports(editSports.filter((s) => s !== sp.name));
                              } else {
                                showToast('Keep at least one sport selected.', 'error');
                              }
                            } else {
                              setEditSports([...editSports, sp.name]);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span>{sp.icon}</span>
                          <span>{sp.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. POSITIONS YOU PLAY IN */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <span>🏷️ Positions / Roles You Play In</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {editPositions.length} Selected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Select roles you are comfortable playing in during games and squad matchmaking.
                  </p>

                  {/* Contextual quick suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Striker / Forward',
                      'Winger',
                      'Attacking Midfielder',
                      'Central Midfielder',
                      'Defensive Midfielder',
                      'Center Back',
                      'Full Back',
                      'Goalkeeper',
                      'Top-Order Batsman',
                      'Middle-Order Finisher',
                      'Fast Bowler',
                      'Spin Bowler',
                      'All-Rounder',
                      'Wicketkeeper',
                      'Singles Specialist',
                      'Doubles - Net / Front',
                      'Doubles - Smasher',
                      'Point Guard',
                      'Shooting Guard',
                      'Power Forward',
                      'Center',
                      'Dinker / Net Player',
                      'Baseline Smasher',
                    ].map((pos, posIdx) => {
                      const isSelected = editPositions.includes(pos);
                      return (
                        <button
                          key={`edit_pos_btn_${pos}_${posIdx}`}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditPositions(editPositions.filter((p) => p !== pos));
                            } else {
                              setEditPositions([...editPositions, pos]);
                            }
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {pos}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Position Adder */}
                  <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                    <input
                      type="text"
                      value={customPositionInput}
                      onChange={(e) => setCustomPositionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customPositionInput.trim() && !editPositions.includes(customPositionInput.trim())) {
                            setEditPositions([...editPositions, customPositionInput.trim()]);
                            setCustomPositionInput('');
                          }
                        }
                      }}
                      placeholder="Add custom position (e.g., Box-to-Box, Sweeper Keeper)..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPositionInput.trim() && !editPositions.includes(customPositionInput.trim())) {
                          setEditPositions([...editPositions, customPositionInput.trim()]);
                          setCustomPositionInput('');
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 3. USER BIO */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      📝 Athlete Bio & Playstyle
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {editBio.length}/300 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell other players and turf hosts about yourself (e.g. 'Weekend footballer & box cricketer. Love fast-paced 5v5 matches and always available on Saturday mornings!')..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Skill Tier</label>
                    <select
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="PRO">Pro / Semi-Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Discord Tag</label>
                    <input
                      type="text"
                      value={editDiscord}
                      onChange={(e) => setEditDiscord(e.target.value)}
                      placeholder="username#0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  Save Profile, Sports, Positions & Bio
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">Account Role</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateUserProfile({ role: 'OWNER' });
                      showToast('Switched account mode to Turf Owner!');
                    } catch (err) {
                      showToast('Failed to switch role.', 'error');
                    }
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  Switch to Turf Owner Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOOKING SUMMARY MODAL ================= */}
      {showSummaryModal && selectedTurf && selectedArena && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Booking Summary
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Review & Confirm Slot</h2>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Turf Venue:</span>
                <span className="font-bold text-white">{selectedTurf.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arena & Sport:</span>
                <span className="font-bold text-white">{selectedArena.name} ({selectedArena.sport})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-bold text-indigo-400">{formatDateString(selectedSlot.date)} ({selectedSlot.day})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Slot:</span>
                <span className="font-bold text-white">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-semibold text-white">{selectedSlot.durationMinutes} Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slot Price:</span>
                <span className="text-white font-medium">{formatCurrency(selectedSlot.price)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Voucher Discount:</span>
                  <span>-{formatCurrency(appliedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                <span className="text-slate-300">Net Payable:</span>
                <span className="text-indigo-400">
                  {formatCurrency(Math.max(0, selectedSlot.price - appliedDiscount))}
                </span>
              </div>
            </div>

            {/* Promo / Coupon Code Section */}
            <div className="mb-5 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Apply Promo / Voucher Code</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. TRUFIT50, FIRSTBOOK"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  disabled={!!appliedCouponCode}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                {appliedCouponCode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCouponCode(null);
                      setAppliedDiscount(0);
                      setCouponCodeInput('');
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCodeInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {appliedCouponCode && (
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mt-2 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                  <span>✓ Code {appliedCouponCode} applied</span>
                  <span>Save {formatCurrency(appliedDiscount)}</span>
                </div>
              )}
            </div>

            {/* Payment Choice Selection */}
            <div className="mb-6 space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Choose Payment Option:
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentOption('PAY_LATER_AT_TURF')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                    paymentOption === 'PAY_LATER_AT_TURF'
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold text-white">Pay Later at Turf</span>
                  <span className="text-[10px] text-slate-400">Pay cash/UPI at counter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('PAY_NOW')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                    paymentOption === 'PAY_NOW'
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold text-white">Pay Now Online</span>
                  <span className="text-[10px] text-slate-400">Direct instant clearing</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                id="confirm-booking-final-btn"
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                {bookingLoading ? 'Securing Slot...' : 'Confirm & Reserve Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION SUCCESS MODAL ================= */}
      {confirmedBookingDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Booking Confirmed!</h2>
            <p className="text-xs text-slate-400 mb-6">
              Your slot has been secured in the database.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-800 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Booking ID:</span>
                <span className="font-mono font-bold text-indigo-400">{confirmedBookingDetails.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Venue:</span>
                <span className="font-bold text-white">{confirmedBookingDetails.turfName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Court:</span>
                <span className="text-white">{confirmedBookingDetails.arenaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slot Time:</span>
                <span className="font-bold text-white">
                  {formatDateString(confirmedBookingDetails.date)} • {confirmedBookingDetails.startTime} - {confirmedBookingDetails.endTime}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-slate-300">Payment Status:</span>
                <span className={confirmedBookingDetails.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}>
                  {confirmedBookingDetails.paymentStatus}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const b = confirmedBookingDetails;
                  setConfirmedBookingDetails(null);
                  setSelectedBookingForLobby(b);
                  setShowCreateLobbyModal(true);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-xs shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Host Matchmaking Lobby</span>
              </button>

              <button
                onClick={() => {
                  setConfirmedBookingDetails(null);
                  setCurrentTab('bookings');
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-xs shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                View in My Bookings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMMUNITY MODALS ================= */}
      {showNotificationsModal && (
        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          showToast={showToast}
        />
      )}

      {showCreateLobbyModal && (
        <CreateLobbyModal
          isOpen={showCreateLobbyModal}
          onClose={() => {
            setShowCreateLobbyModal(false);
            setSelectedBookingForLobby(null);
          }}
          initialBooking={selectedBookingForLobby}
          onCreated={(lobbyId) => {
            setCurrentTab('lobbies');
            showToast('Matchmaking lobby hosted! Players can now join.');
          }}
          showToast={showToast}
        />
      )}
      {/* ================= REVIEWS MODAL ================= */}
      {showWriteReviewModal && reviewTargetTurf && (
        <WriteReviewModal
          isOpen={showWriteReviewModal}
          onClose={() => {
            setShowWriteReviewModal(false);
            setReviewTargetTurf(null);
          }}
          turfId={reviewTargetTurf.id}
          turfName={reviewTargetTurf.name}
          onReviewSubmitted={() => {
            showToast('Review submitted successfully!');
          }}
          showToast={showToast}
        />
      )}

      {/* ================= PAYMENT SPLIT MODAL ================= */}
      {showSplitModal && splitTargetBooking && (
        <PaymentSplitModal
          isOpen={showSplitModal}
          onClose={() => {
            setShowSplitModal(false);
            setSplitTargetBooking(null);
          }}
          booking={splitTargetBooking}
          showToast={showToast}
        />
      )}
    </div>
  );
};
