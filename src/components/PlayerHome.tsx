import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { Turf, Arena, Slot, Booking, Lobby, Match, SocialPost } from '../types';
import {
  getAllActiveTurfs,
  getTurfArenas,
  getArenaSlotsByDate,
  getPlayerBookings,
  getPaymentTransactionsForUser,
  bookSlotWithTransaction,
  isBookingConcluded,
  getAdminPaymentConfig,
  listenSocialPosts,
  createSocialPost,
  deleteSocialPost,
} from '../lib/db';
import {
  formatCurrency,
  formatDateString,
  getDayName,
  getTodayDateString,
  getNextDays,
  calculateDistanceKm,
} from '../lib/utils';
import { LobbiesTab } from './community/LobbiesTab';
import { TeamsTab } from './community/TeamsTab';
import { MatchesTab } from './community/MatchesTab';
import { FindPlayersTab } from './community/FindPlayersTab';
import { NotificationsModal } from './player/NotificationsModal';
import { GamingZoneTab } from './player/GamingZoneTab';
import { CreateLobbyModal } from './community/CreateLobbyModal';
import { RewardsTab } from './rewards/RewardsTab';
import { PlayerStatsTab } from './player/PlayerStatsTab';
import { PlayerPaymentsTab } from './payments/PlayerPaymentsTab';
import { WriteReviewModal } from './reviews/WriteReviewModal';
import { TurfReviewsSection } from './reviews/TurfReviewsSection';
import { PaymentSplitModal } from './payments/PaymentSplitModal';
import { PhoneVerificationModal } from './PhoneVerificationModal';
import { openDirectionsInMaps } from '../lib/navigation';
import { applyCouponOffer } from '../lib/phase3';
import { getAppConfigAndFlags } from '../lib/configService';
import { generateUpiQrCodeUrl, generateUpiUri, openRazorpayCheckout, verifyPaymentWithOwnerBank } from '../lib/razorpay';
import { subscribeUserNotifications } from '../lib/pushNotificationService';
import { PromotionalBannerCarousel } from './PromotionalBannerCarousel';
import { GoogleAdSenseBanner } from './GoogleAdSenseBanner';
import { CoachesTab } from './coaches/CoachesTab';
import { TournamentsTab } from './tournaments/TournamentsTab';
import { CommunityFeedTab } from './social/CommunityFeedTab';
import { CitySelectorModal } from './CitySelectorModal';
import { SocialProfileView } from './profile/SocialProfileView';
import { SocialProfileModal } from './profile/SocialProfileModal';
import { DirectMessagesInboxModal } from './messaging/DirectMessagesInboxModal';
import { PlayerVerificationModal } from './player/PlayerVerificationModal';
import { PlayerSubscriptionModal } from './player/PlayerSubscriptionModal';
import { subscribeUserConversations } from '../lib/directMessagingService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import confetti from 'canvas-confetti';

const SPORT_ICONS: Record<string, string> = {
  Football: '⚽',
  Cricket: '🏏',
  'Box Cricket': '🏏',
  Badminton: '🏸',
  Tennis: '🎾',
  Basketball: '🏀',
  Pickleball: '🏓',
  'Table Tennis': '🏓',
  Volleyball: '🏐',
  Squash: '🎾',
  Snooker: '🎱',
  Pool: '🎱',
  Futsal: '⚽',
  Padel: '🎾',
  Golf: '⛳',
};
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
  User,
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
  Gamepad2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  QrCode,
  Smartphone,
  X,
  MessageSquare,
  GraduationCap,
  Flame,
  Heart,
  Trash2,
  Award,
} from 'lucide-react';
import {
  openWhatsAppNotification,
  copyWhatsAppMessage,
  generateWhatsAppBookingMessage,
} from '../lib/whatsappService';

interface PlayerHomeProps {
  currentTab:
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
    | 'profile';
  setCurrentTab: (tab: any) => void;
}

export const PlayerHome: React.FC<PlayerHomeProps> = ({ currentTab, setCurrentTab }) => {
  const { user, profile, updateUserProfile, isAdmin, isOwnerRegistered, setActiveRole } = useAuth();
  const {
    userLocation,
    permissionGranted,
    permissionDenied,
    loadingLocation,
    requestLocation,
    setManualLocation,
    selectedCity,
    setSelectedCity,
    isCityModalOpen,
    openCityModal,
    closeCityModal,
  } = useLocation();

  // Firestore Collections State
  const [allTurfs, setAllTurfs] = useState<Turf[]>([]);
  const [playerBookings, setPlayerBookings] = useState<Booking[]>([]);
  const [bookingTabFilter, setBookingTabFilter] = useState<'UPCOMING' | 'PAST' | 'CANCELLED'>('UPCOMING');
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showDirectMessagesInboxModal, setShowDirectMessagesInboxModal] = useState<boolean>(false);
  const [initialDMTargetUserId, setInitialDMTargetUserId] = useState<string | undefined>(undefined);

  // Booking Flow Steps State
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [hideBookedSlots, setHideBookedSlots] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'PARTIAL_ADVANCE' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [upiTxnRefInput, setUpiTxnRefInput] = useState<string>('');
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<Booking | null>(null);
  const [showQrCodeInPayment, setShowQrCodeInPayment] = useState<boolean>(false);
  const [vpaCopied, setVpaCopied] = useState<boolean>(false);
  const [showBookingDetailsAccordion, setShowBookingDetailsAccordion] = useState<boolean>(false);

  // Discovery Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>(selectedCity || profile?.city || 'Mumbai');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number>(50);

  // Synchronize city filter whenever global selectedCity updates
  useEffect(() => {
    if (selectedCity && selectedCityFilter !== 'ALL') {
      setSelectedCityFilter(selectedCity);
    }
  }, [selectedCity]);

  // Community state & Live map data
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerPools, setPlayerPools] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [unreadDirectMessagesCount, setUnreadDirectMessagesCount] = useState<number>(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserConversations(user.uid, (convs) => {
      const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount?.[user.uid] || 0), 0);
      setUnreadDirectMessagesCount(totalUnread);
    });
    return () => unsub();
  }, [user?.uid]);

  // Cross-feature triggers
  const [showCreateLobbyModal, setShowCreateLobbyModal] = useState<boolean>(false);
  const [selectedBookingForLobby, setSelectedBookingForLobby] = useState<Booking | null>(null);
  const [initialMatchLobby, setInitialMatchLobby] = useState<Lobby | null>(null);

  // Phase 3 State: Reviews, Payment Split, Offers
  const [showWriteReviewModal, setShowWriteReviewModal] = useState<boolean>(false);
  const [reviewTargetTurf, setReviewTargetTurf] = useState<{ id: string; name: string } | null>(null);
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitTargetBooking, setSplitTargetBooking] = useState<Booking | null>(null);

  // WhatsApp Notification State
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState<string>('');
  const [whatsappSentStatus, setWhatsappSentStatus] = useState<boolean>(false);
  const [whatsappCopied, setWhatsappCopied] = useState<boolean>(false);

  const handleSendWhatsAppNotification = (booking: Booking, customPhone?: string) => {
    const phone = (customPhone || whatsappRecipientPhone || booking.playerPhone || profile?.phoneNumber || '').trim();
    const success = openWhatsAppNotification(booking, phone, 'PLAYER');
    if (success) {
      setWhatsappSentStatus(true);
      showToast('Opening WhatsApp with booking confirmation pass!', 'success');
    } else {
      showToast('Could not launch WhatsApp. You can also copy the pass.', 'error');
    }
  };

  const handleCopyWhatsAppTicket = async (booking: Booking) => {
    const ok = await copyWhatsAppMessage(booking, 'PLAYER');
    if (ok) {
      setWhatsappCopied(true);
      showToast('WhatsApp booking ticket copied to clipboard!', 'success');
      setTimeout(() => setWhatsappCopied(false), 3000);
    } else {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  // Social Profile Modal state
  const [viewSocialProfileUserId, setViewSocialProfileUserId] = useState<string | null>(null);

  // Player Verification & Subscription Modals
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // Profile Edit fields
  const [isSmsModalOpen, setIsSmsModalOpen] = useState<boolean>(false);
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

  // Player Profile Feed & Highlights State
  const [playerProfileSubTab, setPlayerProfileSubTab] = useState<'profile' | 'feed'>('profile');
  const [mySocialPosts, setMySocialPosts] = useState<SocialPost[]>([]);
  const [isPlayerCreatePostOpen, setIsPlayerCreatePostOpen] = useState<boolean>(false);
  const [newPostCaption, setNewPostCaption] = useState<string>('');
  const [newPostSport, setNewPostSport] = useState<string>('Football');
  const [newPostMomentTag, setNewPostMomentTag] = useState<string>('Match Highlight ⚽');
  const [newPostMediaUrl, setNewPostMediaUrl] = useState<string>('');
  const [isPublishingPlayerPost, setIsPublishingPlayerPost] = useState<boolean>(false);

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

  // Real-time listener for unread notifications using shared notification service
  useEffect(() => {
    if (!user) {
      setUnreadNotifsCount(0);
      return;
    }
    const unsubscribe = subscribeUserNotifications(user.uid, (notifs) => {
      const unread = notifs.filter((n) => !n.isRead && !n.read).length;
      setUnreadNotifsCount(unread);
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

  // Real-time listener for player pools
  useEffect(() => {
    const q = query(collection(db, 'playerPools'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setPlayerPools(list);
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeTurfs, configData, adminPay] = await Promise.all([
        getAllActiveTurfs(),
        getAppConfigAndFlags(),
        getAdminPaymentConfig(),
      ]);
      setAllTurfs(activeTurfs);
      setPricingConfig(configData.pricing);
      setAdminPaymentConfig(adminPay);

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

  // Real-time listener for player's personal social posts
  useEffect(() => {
    if (!user?.uid) {
      setMySocialPosts([]);
      return;
    }
    const unsub = listenSocialPosts(undefined, (allPosts) => {
      const userPosts = allPosts.filter((p) => p.authorId === user.uid);
      setMySocialPosts(userPosts);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleCreatePlayerPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption.trim()) {
      showToast('Please enter a caption for your highlight', 'error');
      return;
    }
    if (!user?.uid) {
      showToast('Please log in to publish a highlight', 'error');
      return;
    }

    setIsPublishingPlayerPost(true);
    try {
      await createSocialPost({
        authorId: user.uid,
        authorType: 'PLAYER',
        authorName: profile?.displayName || user.displayName || 'Sports Athlete',
        authorAvatar: profile?.photoURL || user.photoURL || undefined,
        authorCity: profile?.city || selectedCity || 'Local',
        caption: newPostCaption.trim(),
        mediaUrl: newPostMediaUrl.trim() || undefined,
        sport: newPostSport || 'Football',
        promoTag: newPostMomentTag || undefined,
        city: profile?.city || selectedCity || 'ALL',
        isPromotional: false,
      });
      showToast('Match highlight published to Community Feed!', 'success');
      setNewPostCaption('');
      setNewPostMediaUrl('');
      setIsPlayerCreatePostOpen(false);
      setPlayerProfileSubTab('feed');
    } catch (err: any) {
      console.error('Failed to publish highlight:', err);
      showToast('Failed to post highlight.', 'error');
    } finally {
      setIsPublishingPlayerPost(false);
    }
  };

  const handleDeletePlayerPost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this highlight from the feed?')) return;
    try {
      await deleteSocialPost(postId);
      showToast('Highlight removed successfully', 'success');
    } catch (err) {
      showToast('Failed to delete highlight', 'error');
    }
  };

  // When turf is selected, load its arenas
  const handleSelectTurf = async (turf: Turf) => {
    setSelectedTurf(turf);
    setSelectedSlot(null);
    try {
      const turfArenas = await getTurfArenas(turf.id);
      const activeArenas = turfArenas.filter((ar) => ar.active !== false);
      setArenas(activeArenas);
      if (activeArenas.length > 0) {
        setSelectedArena(activeArenas[0]);
        // load slots for today
        await loadArenaSlots(activeArenas[0].id, selectedDate);
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

  // Perform Double-Booking-Guarded Booking Confirmation
  const handleConfirmBooking = async () => {
    if (!user || !selectedTurf || !selectedArena || !selectedSlot) return;

    setBookingLoading(true);
    try {
      const baseSlotPrice = selectedSlot.price;
      const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
        ? Number(adminPaymentConfig.platformFeePercent)
        : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

      const feeAmount = feePercent !== undefined
        ? Math.round((baseSlotPrice * feePercent) / 100)
        : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee || 0) : 0);

      const convenienceFee = paymentOption === 'PAY_LATER_AT_TURF' ? 0 : feeAmount;
      const finalAmount = baseSlotPrice + convenienceFee;
      const ownerShare = baseSlotPrice;

      let amountPaid = 0;
      let amountDue = finalAmount;

      if (paymentOption === 'PAY_NOW') {
        amountPaid = finalAmount;
        amountDue = 0;
      } else if (paymentOption === 'PARTIAL_ADVANCE') {
        amountPaid = Math.round(finalAmount * 0.30); // 30% advance token
        amountDue = Math.max(0, finalAmount - amountPaid);
      } else {
        amountPaid = 0;
        amountDue = finalAmount;
      }

      let razorpayTxnId = upiTxnRefInput.trim() || undefined;
      let razorpayOrderId: string | undefined = undefined;

      // If paying online, trigger Razorpay Gateway (Centralized TruFit platform checkout)
      if ((paymentOption === 'PAY_NOW' || paymentOption === 'PARTIAL_ADVANCE') && amountPaid > 0) {
        try {
          const rzpResult = await openRazorpayCheckout({
            amount: amountPaid,
            name: selectedTurf.name,
            description: `Booking ${selectedArena.name} (${selectedSlot.startTime})`,
            prefill: {
              name: profile?.displayName || user.displayName || 'Athlete',
              email: user.email || 'athlete@trufit.app',
              contact: profile?.phoneNumber || '9876543210',
            },
          });
          if (rzpResult && rzpResult.paymentId) {
            const isVerifiedWithBank = await verifyPaymentWithOwnerBank(
              rzpResult.paymentId,
              amountPaid,
              selectedTurf.ownerId
            );
            if (!isVerifiedWithBank) {
              setBookingLoading(false);
              showToast('Payment verification with platform gateway failed. Please try again.', 'error');
              return;
            }
            razorpayTxnId = rzpResult.paymentId;
            razorpayOrderId = rzpResult.orderId;
          }
        } catch (rzpErr: any) {
          setBookingLoading(false);
          showToast(rzpErr.message || 'Payment cancelled or failed', 'error');
          return;
        }
      }

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
        amountPaid: amountPaid,
        amountDue: amountDue,
        convenienceFee: convenienceFee,
        ownerShare: ownerShare,
        upiTxnRef: razorpayTxnId,
        gatewayPaymentId: razorpayTxnId,
        gatewayOrderId: razorpayOrderId,
        verifiedAutomatically: (paymentOption === 'PAY_NOW' || paymentOption === 'PARTIAL_ADVANCE') && amountPaid > 0,
        paymentMethod: paymentOption,
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setConfirmedBookingDetails(confirmed);
      setWhatsappRecipientPhone(confirmed.playerPhone || profile?.phoneNumber || '');
      setWhatsappSentStatus(false);
      setShowSummaryModal(false);
      setUpiTxnRefInput('');
      showToast(
        paymentOption === 'PAY_NOW'
          ? 'Payment successful! Slot reserved.'
          : paymentOption === 'PARTIAL_ADVANCE'
          ? `Advance token received (₹${amountPaid}). Slot confirmed!`
          : 'Booking reserved! Pay balance at turf reception.'
      );

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

  // Derive available cities from allTurfs
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    allTurfs.forEach((t) => {
      if (t.city && typeof t.city === 'string' && t.city.trim()) {
        citySet.add(t.city.trim());
      }
    });
    return Array.from(citySet);
  }, [allTurfs]);

  // Filter and sort turfs by distance, sport, & city
  const filteredTurfs = allTurfs.filter((turf) => {
    const matchesSearch =
      searchQuery === '' ||
      turf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSport =
      selectedSportFilter === 'ALL' || turf.sports?.includes(selectedSportFilter);

    const matchesCity =
      selectedCityFilter === 'ALL' ||
      turf.city.toLowerCase().trim() === selectedCityFilter.toLowerCase().trim();

    if (!matchesSearch || !matchesSport || !matchesCity) return false;

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

  // Derive registered sports dynamically from allTurfs
  const registeredSportsList = useMemo(() => {
    const sportSet = new Set<string>();
    allTurfs.forEach((t) => {
      if (Array.isArray(t.sports)) {
        t.sports.forEach((s) => {
          if (s && typeof s === 'string' && s.trim()) {
            sportSet.add(s.trim());
          }
        });
      }
    });

    const popularOrder = [
      'Football',
      'Cricket',
      'Box Cricket',
      'Badminton',
      'Tennis',
      'Pickleball',
      'Basketball',
      'Table Tennis',
      'Volleyball',
      'Snooker',
    ];

    const sorted = Array.from(sportSet).sort((a, b) => {
      const idxA = popularOrder.indexOf(a);
      const idxB = popularOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    if (sorted.length === 0) {
      return ['Football', 'Cricket', 'Badminton', 'Tennis', 'Pickleball', 'Basketball'];
    }
    return sorted;
  }, [allTurfs]);

  const nextDays = getNextDays(7);
  const isMatchConcluded = (b: Booking) => isBookingConcluded(b);

  // Strictly exclude concluded matches from upcoming bookings (concluded matches show ONLY on past bookings)
  const upcomingPlayerBookings = playerBookings.filter(
    (b) => b.bookingStatus === 'CONFIRMED' && !isMatchConcluded(b)
  );
  const pendingPlayerDues = playerBookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);

  // Filtered Bookings for the Bookings History Tab
  const filteredPlayerBookings = playerBookings.filter((b) => {
    if (bookingTabFilter === 'CANCELLED') {
      return b.bookingStatus === 'CANCELLED';
    }
    if (b.bookingStatus === 'CANCELLED') return false;

    const concluded = isMatchConcluded(b);
    if (bookingTabFilter === 'UPCOMING') {
      return !concluded;
    }
    if (bookingTabFilter === 'PAST') {
      return concluded;
    }
    return true;
  });

  const playerUpcomingCount = playerBookings.filter((b) => b.bookingStatus !== 'CANCELLED' && !isMatchConcluded(b)).length;
  const playerPastCount = playerBookings.filter((b) => b.bookingStatus !== 'CANCELLED' && isMatchConcluded(b)).length;
  const playerCancelledCount = playerBookings.filter((b) => b.bookingStatus === 'CANCELLED').length;

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

      {/* Top Header - Hidden on mobile (< md), replaced by sleek bottom nav bar with location selector */}
      <header className="hidden md:block bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-indigo-600/30">
              TF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                  TURFIT <span className="text-indigo-500 font-medium text-xs sm:text-sm ml-1.5 tracking-widest uppercase">Player</span>
                </h1>
              </div>
              <button
                onClick={openCityModal}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 mt-0.5 group cursor-pointer bg-slate-800/80 hover:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-700 transition-colors"
                title="Change discovery city"
              >
                <MapPin className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-white">{selectedCity || profile?.city || 'Select City'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Messages Inbox Button */}
            <button
              id="direct-messages-inbox-btn"
              onClick={() => setShowDirectMessagesInboxModal(true)}
              title="1-on-1 Direct Messages"
              className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              {unreadDirectMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {unreadDirectMessagesCount > 9 ? '9+' : unreadDirectMessagesCount}
                </span>
              )}
            </button>

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
            {/* Book a Turf button hidden per user request */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Gaming Zone Indoor Card */}
              <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl border-l-4 border-l-purple-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Gaming Zone
                    </span>
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Indoor Arena</h4>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Snooker, 8-Ball Pool, PS5 & Table Tennis
                  </span>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80">
                  <button
                    id="home-goto-gaming-btn"
                    onClick={() => setCurrentTab('gaming')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Explore Lounges</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Coaches & Academies Card */}
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl border-l-4 border-l-emerald-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Coaches & Academies
                    </span>
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Pro Training Batches</h4>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Football, Cricket & Racket Professional Coaching
                  </span>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80">
                  <button
                    id="home-goto-coaches-btn"
                    onClick={() => setCurrentTab('coaches')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Browse Coaches</span>
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

            {/* Horizontal Scrollable Row of 'Sport Category' Chips Immediately Below Hero Action Cards */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Explore by Sport
                  </span>
                  {selectedSportFilter !== 'ALL' && (
                    <span className="text-[11px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-800/60">
                      Filtering: {selectedSportFilter}
                    </span>
                  )}
                </div>
                {selectedSportFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSportFilter('ALL')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Clear filter ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                {/* 'All Sports' chip */}
                <button
                  type="button"
                  onClick={() => setSelectedSportFilter('ALL')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    selectedSportFilter === 'ALL'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">⚡</span>
                  <span>All Sports</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      selectedSportFilter === 'ALL'
                        ? 'bg-emerald-700 text-emerald-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {allTurfs.length}
                  </span>
                </button>

                {/* Dynamic Registered Sport Chips */}
                {registeredSportsList.map((sport) => {
                  const isSelected = selectedSportFilter === sport;
                  const count = allTurfs.filter(
                    (t) => t.sports && t.sports.includes(sport)
                  ).length;
                  const icon = SPORT_ICONS[sport] || '🏅';

                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => {
                        setSelectedSportFilter(isSelected ? 'ALL' : sport);
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span>{sport}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected
                            ? 'bg-emerald-700 text-emerald-100'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
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

            {/* TruFit Pro Pass & Verification Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">TruFit Athlete Pro & Verified Identity</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      New
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Get your official Gold profile tick, slot discounts, and priority squad matchmaking.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Get Verified</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Athlete Passes</span>
                </button>
              </div>
            </div>

            {/* Nearby Turfs List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {selectedSportFilter === 'ALL'
                        ? `Sports Turfs in ${selectedCity || profile?.city || 'Selected City'}`
                        : `${selectedSportFilter} in ${selectedCity || profile?.city || 'Selected City'}`}
                    </h3>
                    <button
                      onClick={openCityModal}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Change City</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Showing {filteredTurfs.length} {filteredTurfs.length === 1 ? 'venue' : 'venues'} registered in {selectedCityFilter === 'ALL' ? 'all cities' : selectedCityFilter}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab('explore')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore all venues ({filteredTurfs.length})</span>
                  <span>→</span>
                </button>
              </div>

              {filteredTurfs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm space-y-3">
                  <p className="text-3xl">{SPORT_ICONS[selectedSportFilter] || '📍'}</p>
                  <p className="font-semibold text-white">
                    No {selectedSportFilter === 'ALL' ? '' : selectedSportFilter} turfs registered in {selectedCityFilter}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are no venues listed in {selectedCityFilter} matching your filters. You can change your city or view all cities.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={openCityModal}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Select Another City</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCityFilter('ALL');
                        setSelectedSportFilter('ALL');
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-slate-700"
                    >
                      Show All Cities
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTurfs.slice(0, 6).map((turf, turfIdx) => {
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
            <PromotionalBannerCarousel audience="PLAYERS" onNavigate={(screen) => setCurrentTab(screen as any)} />

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

              {/* City filter banner & quick selector */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Selected Discovery City:</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wide bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                        {selectedCityFilter === 'ALL' ? 'All Cities' : selectedCityFilter}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Showing {filteredTurfs.length} {filteredTurfs.length === 1 ? 'venue' : 'venues'} registered in {selectedCityFilter === 'ALL' ? 'all regions' : selectedCityFilter}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCityModal}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/40 cursor-pointer transition-all shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Select / Change City</span>
                </button>
              </div>

              {/* Quick City filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-800 pb-3">
                <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" /> Quick Filter:
                </span>
                <button
                  onClick={() => setSelectedCityFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCityFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  All Cities
                </button>
                {availableCities.map((city) => (
                  <button
                    key={`city_filter_${city}`}
                    onClick={() => {
                      setSelectedCityFilter(city);
                      setSelectedCity(city);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCityFilter.toLowerCase() === city.toLowerCase()
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center text-xl">
                      📍
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">
                        No turfs registered in {selectedCityFilter === 'ALL' ? 'selected filters' : selectedCityFilter}
                      </p>
                      <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
                        {selectedCityFilter !== 'ALL'
                          ? `There are no active turfs registered in ${selectedCityFilter} matching your filters. Switch your city to explore other regions.`
                          : 'Try clearing your search query or selecting all sports.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={openCityModal}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Select Another City</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCityFilter('ALL');
                          setSelectedSportFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-slate-700"
                      >
                        View All Cities
                      </button>
                    </div>
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
                            turf.isFeatured
                              ? isSelected
                                ? 'border-amber-500 bg-amber-950/30 shadow-lg ring-1 ring-amber-500/40'
                                : 'border-amber-500/60 bg-slate-900/90 hover:border-amber-400'
                              : isSelected
                              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500/30'
                              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          {turf.isFeatured && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md mb-2.5 w-fit">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>⭐ SPONSORED • TOP RANKED</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{turf.name}</span>
                                {turf.isFeatured && (
                                  <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                                    FEATURED
                                  </span>
                                )}
                              </h4>
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

                {/* Google AdSense / Ad Unit Placeholder */}
                <GoogleAdSenseBanner
                  slotId="explore-turf-bottom-banner"
                  format="horizontal"
                  className="mt-4"
                />
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

                        {/* Selected Arena Detailed Card with Specs, Photos, & Amenities */}
                        {selectedArena && (
                          <div className="mt-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 shadow-inner">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>🏟️ {selectedArena.name}</span>
                                  {selectedArena.sports && selectedArena.sports.length > 1 && (
                                    <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-semibold">
                                      Multi-Sport: {selectedArena.sports.join(', ')}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Capacity: <strong className="text-slate-200">{selectedArena.capacity} players</strong>
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-xs text-slate-400 block">Slot Price:</span>
                                <span className="text-base font-extrabold text-emerald-400">
                                  {formatCurrency(selectedArena.pricePerSlot)}
                                </span>
                              </div>
                            </div>

                            {/* Pitch Description / Details */}
                            {selectedArena.description && (
                              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                                {selectedArena.description}
                              </p>
                            )}

                            {/* Pitch Amenities */}
                            {((selectedArena.amenities && selectedArena.amenities.length > 0) ||
                              selectedArena.hasAirConditioning ||
                              selectedArena.hasLoungeAccess) && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                                  Pitch & Court Amenities
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedArena.hasAirConditioning && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                      <span>❄️ Air Conditioned</span>
                                    </span>
                                  )}
                                  {selectedArena.hasLoungeAccess && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                      <span>🛋️ Sofa Lounge Access</span>
                                    </span>
                                  )}
                                  {selectedArena.amenities?.map((amenity, idx) => (
                                    <span
                                      key={`player_arena_amenity_${idx}`}
                                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 font-medium"
                                    >
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Included Equipment */}
                            {selectedArena.equipmentIncluded && selectedArena.equipmentIncluded.length > 0 && (
                              <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                                <strong className="text-slate-300">Gear Provided: </strong>
                                <span>{selectedArena.equipmentIncluded.join(' • ')}</span>
                              </div>
                            )}

                            {/* Pitch Photos Gallery */}
                            {selectedArena.photos && selectedArena.photos.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                                  Pitch Photos ({selectedArena.photos.length})
                                </span>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {selectedArena.photos.map((photo, pIdx) => (
                                    <img
                                      key={`player_arena_photo_${pIdx}`}
                                      src={photo}
                                      alt={`${selectedArena.name} photo ${pIdx + 1}`}
                                      className="w-24 h-16 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">
                              {slots.filter((s) => s.status === 'AVAILABLE').length} Available
                            </span>
                            {slots.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setHideBookedSlots(!hideBookedSlots)}
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  hideBookedSlots
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {hideBookedSlots ? '✓ Available Only' : 'Hide Reserved'}
                              </button>
                            )}
                          </div>
                        </div>

                        {slots.length === 0 ? (
                          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-500">
                            No slots listed for {selectedArena?.name} on this date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {slots
                              .filter((s) => !hideBookedSlots || s.status === 'AVAILABLE')
                              .map((slot, slotIdx) => {
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
                                      : 'border-rose-800/40 bg-rose-950/20 text-rose-300 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs block font-bold">
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                    {!isAvailable && (
                                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        Reserved
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] block mt-1 ${
                                      isSelected
                                        ? 'text-indigo-100'
                                        : isAvailable
                                        ? 'text-indigo-400 font-semibold'
                                        : 'text-slate-500 line-through'
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
                            <span>Proceed to Pay</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Live Hosted Lobbies at this Turf/Arena */}
                    {(() => {
                      const turfMatchingLobbies = lobbies.filter(
                        (l) => l.turfId === selectedTurf.id || l.turfName === selectedTurf.name
                      );
                      return (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-sm font-bold text-white">
                                Live Hosted Match Lobbies ({turfMatchingLobbies.length})
                              </h4>
                            </div>
                            <button
                              onClick={() => setCurrentTab('lobbies')}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                            >
                              Explore All Lobbies →
                            </button>
                          </div>

                          {turfMatchingLobbies.length === 0 ? (
                            <div className="bg-slate-950 rounded-xl p-4 text-center border border-slate-800/80">
                              <p className="text-xs text-slate-400">No active match lobbies hosted at this arena yet.</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Book any slot or create a community split lobby to invite other players!
                              </p>
                              <button
                                onClick={() => setCurrentTab('lobbies')}
                                className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Host Game Lobby</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {turfMatchingLobbies.map((lobby) => (
                                <div
                                  key={lobby.id}
                                  className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3 flex items-center justify-between transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white">{lobby.lobbyName}</span>
                                      <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                        {lobby.sport}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {lobby.date} • {lobby.timeSlot} • Hosted by {lobby.hostName}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-emerald-400 block">
                                        {formatCurrency(lobby.pricePerPlayer || 150)}/player
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {lobby.currentPlayersCount || 1}/{lobby.maxPlayers || 10} players
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setCurrentTab('lobbies')}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md cursor-pointer"
                                    >
                                      Join Lobby
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pool of Interested Players for this Turf/Sport */}
                    {(() => {
                      const turfMatchingPools = playerPools.filter(
                        (p) =>
                          (selectedTurf.sports && selectedTurf.sports.includes(p.sport)) ||
                          p.city?.toLowerCase() === selectedTurf.city?.toLowerCase()
                      );
                      return (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-cyan-400" />
                              <h4 className="text-sm font-bold text-white">
                                Pool of Interested Players ({turfMatchingPools.length})
                              </h4>
                            </div>
                            <button
                              onClick={() => setCurrentTab('lobbies')}
                              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                            >
                              Matchmaking Pools →
                            </button>
                          </div>

                          {turfMatchingPools.length === 0 ? (
                            <div className="bg-slate-950 rounded-xl p-4 text-center border border-slate-800/80">
                              <p className="text-xs text-slate-400">No active matchmaking pool for this sport yet.</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Join or start an interest pool to match with other athletes in {selectedTurf.city || 'your area'}.
                              </p>
                              <button
                                onClick={() => setCurrentTab('lobbies')}
                                className="mt-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-md"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Join Matchmaking Pool</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {turfMatchingPools.slice(0, 3).map((pool) => (
                                <div
                                  key={pool.id}
                                  className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 flex items-center justify-between transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white">{pool.sport} Interest Pool</span>
                                      <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                                        {pool.matchHoursCategory}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      📍 {pool.area || pool.city} • Target: Max ₹{pool.maxPricePerPlayer}/player
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-cyan-400 font-bold">
                                      {pool.currentPlayersCount}/{pool.requiredPlayers} players
                                    </span>
                                    <button
                                      onClick={() => setCurrentTab('lobbies')}
                                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md cursor-pointer"
                                    >
                                      Join Pool
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

        {/* ================= TAB: COMMUNITY SOCIAL FEED ================= */}
        {currentTab === 'feed' && (
          <CommunityFeedTab
            turfs={allTurfs}
            selectedCity={selectedCityFilter}
            showToast={showToast}
            onNavigateToBooking={(turfId) => {
              const matchedTurf = allTurfs.find((t) => t.id === turfId);
              if (matchedTurf) {
                handleSelectTurf(matchedTurf);
              } else {
                setCurrentTab('explore');
              }
            }}
          />
        )}

        {/* ================= TAB: GAMING ZONE & INDOOR LOUNGES ================= */}
        {currentTab === 'gaming' && <GamingZoneTab showToast={showToast} selectedCity={selectedCityFilter} />}

        {/* ================= TAB: COACHES & ACADEMIES ================= */}
        {currentTab === 'coaches' && <CoachesTab user={profile} turfs={allTurfs} selectedCity={selectedCityFilter} />}

        {/* ================= TAB: TOURNAMENTS & CORPORATE LEAGUES ================= */}
        {currentTab === 'tournaments' && <TournamentsTab user={profile} turfs={allTurfs} selectedCity={selectedCityFilter} />}

        {/* ================= TAB: LOBBIES & MATCHMAKING ================= */}
        {currentTab === 'lobbies' && (
          <LobbiesTab
            onHostMatch={(lobby) => {
              setInitialMatchLobby(lobby);
              setCurrentTab('matches');
            }}
            showToast={showToast}
            selectedCity={selectedCityFilter}
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
        {currentTab === 'players' && <FindPlayersTab showToast={showToast} selectedCity={selectedCityFilter} />}

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">My Bookings History</h2>
                <p className="text-xs text-slate-400">All upcoming, completed, and confirmed reservations</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('explore')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Booking</span>
              </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start w-fit">
              <button
                type="button"
                onClick={() => setBookingTabFilter('UPCOMING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  bookingTabFilter === 'UPCOMING'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upcoming ({playerUpcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingTabFilter('PAST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  bookingTabFilter === 'PAST'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Past Bookings ({playerPastCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingTabFilter('CANCELLED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  bookingTabFilter === 'CANCELLED'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cancelled ({playerCancelledCount})
              </button>
            </div>

            {filteredPlayerBookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                {bookingTabFilter === 'UPCOMING' && 'No upcoming bookings. Book a slot to play!'}
                {bookingTabFilter === 'PAST' && 'No past concluded matches yet.'}
                {bookingTabFilter === 'CANCELLED' && 'No cancelled bookings.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayerBookings.map((b, bIdx) => {
                  const concluded = isMatchConcluded(b);
                  return (
                    <div
                      key={b.id ? `booking_card_${b.id}` : `booking_card_idx_${b.bookingId || bIdx}`}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                            {b.bookingId}
                          </span>
                          {b.bookingStatus === 'CANCELLED' ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-rose-950/60 text-rose-400 px-2 py-0.5 rounded border border-rose-800/40">
                              Cancelled
                            </span>
                          ) : concluded ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                              Match Concluded
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
                              Upcoming
                            </span>
                          )}
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
                            onClick={() => handleSendWhatsAppNotification(b, b.playerPhone)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                            title="Send or view WhatsApp booking confirmation pass"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>WhatsApp Pass</span>
                          </button>

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

                          {(b.amountDue || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setCurrentTab('payments')}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer transition-colors"
                              title="Pay outstanding dues online, direct UPI QR, or cash"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Due (₹{b.amountDue})</span>
                            </button>
                          )}

                          {b.bookingStatus === 'CONFIRMED' && !concluded && (
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
                  );
                })}
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Sub-tab Navigation Header */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                id="player-profile-subtab-main"
                onClick={() => setPlayerProfileSubTab('profile')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  playerProfileSubTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Player Profile & Sports</span>
              </button>

              <button
                type="button"
                id="player-profile-subtab-feed"
                onClick={() => setPlayerProfileSubTab('feed')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  playerProfileSubTab === 'feed'
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Flame className="w-4 h-4 text-orange-400" />
                <span>My Feed & Highlights</span>
                {mySocialPosts.length > 0 && (
                  <span className="bg-orange-500/20 text-orange-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-orange-500/30">
                    {mySocialPosts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-view 1: Professional Athlete Social Profile */}
            {playerProfileSubTab === 'profile' && (
              <div className="space-y-6">
                {profile && (
                  <SocialProfileView
                    profile={profile}
                    isSelf={true}
                    showToast={showToast}
                  />
                )}

                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">Account Security & Role</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                        {isAdmin || profile?.role === 'ADMIN' ? 'Super Administrator' : 'TruFit Athlete / Player'}
                      </span>
                    </div>
                  </div>
                  {isOwnerRegistered && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRole('OWNER');
                        showToast('Switched to Turf Owner Portal');
                      }}
                      className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-indigo-950/40"
                    >
                      <span>Switch to Owner Portal →</span>
                    </button>
                  )}
                </div>
              </div>
            )}

        {/* Sub-view 2: Dedicated Player Feed & Highlights Tab */}
        {playerProfileSubTab === 'feed' && (
          <div className="space-y-6">
            {/* Highlights Hub Header */}
            <div className="bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border border-orange-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-orange-950/60 flex-shrink-0">
                    {profile?.displayName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{profile?.displayName || 'Sports Athlete'}</h2>
                      <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                        Athlete Highlights
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your personal reel of screamers, tournament trophies, and post-game squad moments
                    </p>
                    <div className="flex items-center gap-4 text-xs mt-2 text-slate-300">
                      <span className="flex items-center gap-1 font-bold text-white">
                        <Flame className="w-4 h-4 text-orange-400" />
                        {mySocialPosts.length} Highlights Posted
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-rose-400">
                        <Heart className="w-4 h-4 fill-rose-500/40 text-rose-400" />
                        {mySocialPosts.reduce((acc, p) => acc + (p.likesCount || 0), 0)} High Fives Earned
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-player-profile-create-highlight"
                    onClick={() => setIsPlayerCreatePostOpen(true)}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-950/60 cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post Match Moment</span>
                  </button>
                  <button
                    type="button"
                    id="btn-player-profile-open-global-feed"
                    onClick={() => setCurrentTab('feed')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Explore Community Feed</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Highlights Grid */}
            {mySocialPosts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                  <Flame className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No Match Moments Posted Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Capture and share your screamer goals, cricket hat-tricks, or victory squad selfies. They'll appear on your profile and on the TurFit community feed.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-player-empty-first-post"
                  onClick={() => setIsPlayerCreatePostOpen(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-950/50 cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Your First Highlight</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySocialPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    {post.mediaUrl ? (
                      <div className="h-48 w-full bg-slate-950 relative overflow-hidden">
                        <img
                          src={post.mediaUrl}
                          alt={post.caption}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                            {post.sport}
                          </span>
                          {post.promoTag && (
                            <span className="bg-orange-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/40">
                              {post.promoTag}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 bg-gradient-to-r from-orange-950/40 to-slate-950 p-4 flex items-center justify-between border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                            {post.sport}
                          </span>
                          {post.promoTag && (
                            <span className="bg-orange-500/20 text-orange-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-500/30">
                              {post.promoTag}
                            </span>
                          )}
                        </div>
                        <Flame className="w-8 h-8 text-orange-500/40" />
                      </div>
                    )}

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-200 line-clamp-3">
                        {post.caption}
                      </p>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-rose-400 font-semibold">
                            <Heart className="w-3.5 h-3.5 fill-rose-500/40 text-rose-400" />
                            {post.likesCount || 0}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post.commentsCount || 0}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentTab('feed')}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                          >
                            View in Feed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlayerPost(post.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-1"
                            title="Delete highlight"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )}
      </main>

      {/* ================= BOOKING INVOICE & PAYMENT MODAL ================= */}
      {showSummaryModal && selectedTurf && selectedArena && selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl relative my-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Official Booking Invoice & Summary
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  Booking Invoice #{selectedSlot.id.slice(-6).toUpperCase()}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Official Invoice Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 space-y-4">
              {/* Invoice Metadata Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Issue</div>
                  <div className="text-xs font-semibold text-slate-300">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice Ref</div>
                  <div className="text-xs font-mono font-bold text-indigo-400">
                    INV-{selectedSlot.id.slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Billed To & Venue Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-slate-800/80 pb-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Billed To (Player)
                  </span>
                  <div className="font-bold text-white text-sm">
                    {profile?.displayName || (user as any)?.displayName || 'Athlete'}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {profile?.phoneNumber || (user as any)?.phoneNumber || (user as any)?.email || 'Direct Booking'}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    {profile?.city || selectedTurf.city || 'India'}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Venue & Facility
                  </span>
                  <div className="font-bold text-white text-sm">
                    {selectedTurf.name}
                  </div>
                  <div className="text-indigo-300 text-[11px] mt-0.5 font-medium">
                    {selectedArena.name} • {selectedArena.sport}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                    {selectedTurf.address || selectedTurf.city || 'Sports Facility'}
                  </div>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Itemized Reservation Details
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">
                        Court Reservation ({selectedArena.name})
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{formatDateString(selectedSlot.date)} ({selectedSlot.day})</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-indigo-300 font-semibold">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                        <span>({selectedSlot.durationMinutes} min)</span>
                      </div>
                    </div>
                    <div className="font-bold text-white shrink-0">
                      {formatCurrency(selectedSlot.price)}
                    </div>
                  </div>

                  {(() => {
                    const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
                      ? Number(adminPaymentConfig.platformFeePercent)
                      : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

                    const feeAmount = feePercent !== undefined
                      ? Math.round((selectedSlot.price * feePercent) / 100)
                      : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee || 0) : 0);

                    if (paymentOption === 'PAY_LATER_AT_TURF' || feeAmount <= 0) return null;

                    return (
                      <div className="flex items-center justify-between text-[11px] text-sky-400 pt-2 border-t border-slate-800/80">
                        <span>Platform Convenience Fee {feePercent !== undefined ? `(${feePercent}%)` : ''}</span>
                        <span>+{formatCurrency(feeAmount)}</span>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Applicable GST / Taxes</span>
                    <span className="text-emerald-400 font-medium">₹0.00 (Included)</span>
                  </div>

                  {(() => {
                    const basePrice = selectedSlot.price;
                    const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
                      ? Number(adminPaymentConfig.platformFeePercent)
                      : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

                    const feeAmount = feePercent !== undefined
                      ? Math.round((basePrice * feePercent) / 100)
                      : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee || 0) : 0);

                    const convenienceFee = paymentOption === 'PAY_LATER_AT_TURF' ? 0 : feeAmount;
                    const totalPayable = basePrice + convenienceFee;

                    return (
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-700/80 text-sm font-extrabold text-white">
                        <span>Total Invoice Amount</span>
                        <span className="text-indigo-400 text-base">{formatCurrency(totalPayable)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Payment Mode:
                </label>
                {selectedTurf && selectedTurf.allowPayAtVenue === false && (
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                    100% Online Advance Required by Venue
                  </span>
                )}
              </div>

              {(() => {
                const isPayAtVenueAllowed = selectedTurf ? (selectedTurf.allowPayAtVenue !== false && selectedTurf.allowPayLater !== false) : true;
                const basePrice = selectedSlot.price;
                const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
                  ? Number(adminPaymentConfig.platformFeePercent)
                  : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

                const feeAmount = feePercent !== undefined
                  ? Math.round((basePrice * feePercent) / 100)
                  : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee || 0) : 0);

                const convenienceFee = paymentOption === 'PAY_LATER_AT_TURF' ? 0 : feeAmount;
                const totalPayable = basePrice + convenienceFee;
                const advancePayable = Math.round(totalPayable * 0.30);

                return (
                  <div className={`grid grid-cols-1 ${isPayAtVenueAllowed ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5`}>
                    <button
                      type="button"
                      onClick={() => setPaymentOption('PAY_NOW')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        paymentOption === 'PAY_NOW'
                          ? 'border-indigo-500 bg-indigo-950/50 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/30'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>⚡ Pay 100% Online</span>
                        </span>
                        {paymentOption === 'PAY_NOW' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">Instant UPI & Cards</p>
                      <span className="text-xs font-black text-indigo-400 block mt-1.5">
                        {formatCurrency(totalPayable)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('PARTIAL_ADVANCE')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        paymentOption === 'PARTIAL_ADVANCE'
                          ? 'border-amber-500 bg-amber-950/40 text-white ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>🛡️ Advance Token</span>
                        </span>
                        {paymentOption === 'PARTIAL_ADVANCE' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">30% Token deposit</p>
                      <span className="text-xs font-black text-amber-400 block mt-1.5">
                        {formatCurrency(advancePayable)} Token
                      </span>
                    </button>

                    {isPayAtVenueAllowed && (
                      <button
                        type="button"
                        onClick={() => setPaymentOption('PAY_LATER_AT_TURF')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          paymentOption === 'PAY_LATER_AT_TURF'
                            ? 'border-emerald-500 bg-emerald-950/40 text-white ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/30'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>🏢 Pay at Turf</span>
                          </span>
                          {paymentOption === 'PAY_LATER_AT_TURF' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">Pay cash/UPI at venue</p>
                        <span className="text-xs font-black text-emerald-400 block mt-1.5">
                          {formatCurrency(0)} Now
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SEAMLESS DIRECT UPI APP LAUNCHER (NO UPI ID & NO QR CODE SHOWN) */}
            {(paymentOption === 'PAY_NOW' || paymentOption === 'PARTIAL_ADVANCE') && (() => {
              const basePrice = selectedSlot.price;
              const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
                ? Number(adminPaymentConfig.platformFeePercent)
                : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

              const feeAmount = feePercent !== undefined
                ? Math.round((basePrice * feePercent) / 100)
                : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee || 0) : 0);

              const convenienceFee = paymentOption === 'PAY_LATER_AT_TURF' ? 0 : feeAmount;
              const totalAmountWithFee = basePrice + convenienceFee;

              const payableAmt =
                paymentOption === 'PAY_NOW'
                  ? totalAmountWithFee
                  : Math.round(totalAmountWithFee * 0.30);
              const dueAmt = Math.max(0, totalAmountWithFee - payableAmt);
              const upiVpa = adminPaymentConfig?.upiId || 'trufit.admin@okaxis';
              const upiBeneficiary = adminPaymentConfig?.beneficiaryName || selectedTurf?.name || 'TruFit Sports Treasury';
              const upiUri = generateUpiUri({
                upiId: upiVpa,
                beneficiaryName: upiBeneficiary,
                amount: payableAmt,
                transactionNote: `Slot ${selectedSlot.startTime} ${selectedArena.name}`,
              });

              return (
                <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 mb-5 space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Online Settlement: {formatCurrency(payableAmt)}
                      </span>
                    </div>
                    {dueAmt > 0 && (
                      <span className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-0.5 rounded-full font-semibold">
                        Pay {formatCurrency(dueAmt)} at Venue
                      </span>
                    )}
                  </div>

                  {/* Primary Prominent Launch UPI App Button */}
                  <a
                    href={upiUri}
                    className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>🚀 Pay {formatCurrency(payableAmt)} via UPI App</span>
                  </a>

                  <p className="text-[11px] text-slate-400 text-center">
                    Seamless 1-tap payment via installed UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED).
                  </p>
                </div>
              );
            })()}

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-booking-final-btn"
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-950/50 cursor-pointer transition-all transform active:scale-95"
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
              {confirmedBookingDetails.convenienceFee !== undefined && confirmedBookingDetails.convenienceFee > 0 && (
                <div className="flex justify-between text-sky-400">
                  <span>Convenience Fee:</span>
                  <span>{formatCurrency(confirmedBookingDetails.convenienceFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-medium">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-bold">{formatCurrency(confirmedBookingDetails.totalAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-slate-300">Payment Status:</span>
                <span className={confirmedBookingDetails.paymentStatus === 'PAID' ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-400'}>
                  {confirmedBookingDetails.paymentStatus === 'PAID' && <span>✓</span>}
                  {confirmedBookingDetails.paymentStatus}
                  {confirmedBookingDetails.verifiedAutomatically && (
                    <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40 ml-1">
                      Gateway Verified
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* WhatsApp Booking Confirmation Card */}
            <div className="bg-emerald-950/40 border border-[#25D366]/40 rounded-2xl p-4 text-left mb-5 space-y-3 shadow-lg shadow-emerald-950/40">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/20 border border-[#25D366]/50 flex items-center justify-center text-[#25D366] shrink-0">
                    <MessageSquare className="w-4 h-4 fill-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>WhatsApp Match Pass</span>
                      <span className="text-[10px] font-semibold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-1.5 py-0.2 rounded-full">
                        Live Ticket
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Send official booking receipt, timing & directions directly to WhatsApp
                    </p>
                  </div>
                </div>
              </div>

              {/* Recipient WhatsApp Phone */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <span className="text-slate-400 text-[11px] whitespace-nowrap font-medium">WhatsApp No:</span>
                <input
                  type="tel"
                  value={whatsappRecipientPhone}
                  onChange={(e) => setWhatsappRecipientPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="bg-transparent text-emerald-400 font-mono text-xs w-full focus:outline-none placeholder-slate-600 font-semibold"
                />
              </div>

              {/* Send & Copy Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppNotification(confirmedBookingDetails)}
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 cursor-pointer transition-all transform active:scale-98"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{whatsappSentStatus ? 'Re-send WhatsApp Ticket' : 'Send WhatsApp Pass'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppTicket(confirmedBookingDetails)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700 cursor-pointer transition-colors"
                  title="Copy full WhatsApp ticket message"
                >
                  {whatsappCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{whatsappCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {whatsappSentStatus && (
                <div className="text-[11px] text-emerald-400 flex items-center justify-center gap-1 pt-0.5 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>WhatsApp confirmation ticket opened successfully</span>
                </div>
              )}
            </div>

            {/* Google AdSense / Sponsor Reward Card */}
            <GoogleAdSenseBanner
              slotId="post-booking-receipt-sponsor"
              format="in-article"
              className="my-3"
            />

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
          onOpenDirectMessageWithUser={(userId) => {
            setInitialDMTargetUserId(userId);
            setShowDirectMessagesInboxModal(true);
          }}
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

      {/* ================= PLAYER MATCH HIGHLIGHT CREATION MODAL ================= */}
      {isPlayerCreatePostOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Post Match Highlight</h3>
                  <p className="text-xs text-slate-400">Share your match moment on the TurFit community feed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayerCreatePostOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlayerPost} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  What went down? (Caption & Story) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  placeholder="Scored a 90th-minute screamer top bins! Unbelievable squad victory under the floodlights ⚽🔥"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Sport</label>
                  <select
                    value={newPostSport}
                    onChange={(e) => setNewPostSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Football">⚽ Football</option>
                    <option value="Cricket">🏏 Cricket</option>
                    <option value="Badminton">🏸 Badminton</option>
                    <option value="Tennis">🎾 Tennis</option>
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Pickleball">🏓 Pickleball</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Moment Type</label>
                  <select
                    value={newPostMomentTag}
                    onChange={(e) => setNewPostMomentTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Match Highlight ⚽">Match Highlight ⚽</option>
                    <option value="Screamer Goal 🚀">Screamer Goal 🚀</option>
                    <option value="Victory Squad 🏆">Victory Squad 🏆</option>
                    <option value="Hat-Trick Hero 🏏">Hat-Trick Hero 🏏</option>
                    <option value="Badminton Smash 🏸">Badminton Smash 🏸</option>
                    <option value="Training Grind 💪">Training Grind 💪</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Photo / Highlight Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={newPostMediaUrl}
                  onChange={(e) => setNewPostMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                  <span className="text-slate-500">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPostMediaUrl(
                        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    ⚽ Match Field
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPostMediaUrl(
                        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80'
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    🏏 Stadium Night
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPostMediaUrl(
                        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    🏸 Badminton Court
                  </button>
                </div>
              </div>

              {newPostMediaUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-800 h-36 bg-slate-950">
                  <img
                    src={newPostMediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPostMediaUrl('')}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlayerCreatePostOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishingPlayerPost}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-950/60 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>{isPublishingPlayerPost ? 'Publishing...' : 'Publish to Feed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PHONE VERIFICATION MODAL ================= */}
      {isSmsModalOpen && (
        <PhoneVerificationModal
          isOpen={isSmsModalOpen}
          phoneNumber={editPhone}
          onVerifySuccess={async (verifiedPhone) => {
            try {
              await updateUserProfile({
                phoneNumber: verifiedPhone,
                phoneVerified: true,
              });
              setEditPhone(verifiedPhone);
              showToast('Phone number verified & linked to account successfully!', 'success');
            } catch (err) {
              console.error('Failed to save verified phone profile:', err);
              showToast('Verification succeeded but failed to link profile.', 'error');
            }
          }}
          onClose={() => setIsSmsModalOpen(false)}
        />
      )}
      {/* ================= SOCIAL PROFILE MODAL ================= */}
      <SocialProfileModal
        isOpen={!!viewSocialProfileUserId}
        onClose={() => setViewSocialProfileUserId(null)}
        userId={viewSocialProfileUserId}
        showToast={showToast}
      />

      {/* ================= DIRECT MESSAGES INBOX MODAL ================= */}
      <DirectMessagesInboxModal
        isOpen={showDirectMessagesInboxModal}
        onClose={() => {
          setShowDirectMessagesInboxModal(false);
          setInitialDMTargetUserId(undefined);
        }}
        showToast={showToast}
        initialTargetUserId={initialDMTargetUserId}
      />

      {/* ================= PLAYER VERIFICATION MODAL ================= */}
      <PlayerVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {
          showToast('Gold Athlete Verification Badge is now active on your profile!', 'success');
        }}
      />

      {/* ================= PLAYER SUBSCRIPTION MODAL ================= */}
      <PlayerSubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={() => {
          showToast('TruFit Pro Athlete Membership activated successfully!', 'success');
        }}
      />

      {/* ================= CITY SELECTOR MODAL ================= */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={closeCityModal}
        turfs={allTurfs}
        onSelectCity={(city) => {
          setSelectedCityFilter(city);
          showToast(`Now exploring venues in ${city}`, 'success');
        }}
      />
    </div>
  );
};
