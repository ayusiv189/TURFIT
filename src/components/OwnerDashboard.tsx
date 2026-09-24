import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Turf, Arena, Slot, Booking, LobbyPlayer, PlanFeatureConfig, DEFAULT_PLAN_FEATURES, OwnerBrandProfile } from '../types';
import {
  getOwnerTurfs,
  getOwnerSlots,
  getOwnerBookings,
  createTurf,
  updateTurf,
  deleteTurf,
  checkTurfActiveBookings,
  checkArenaActiveBookings,
  createArena,
  getTurfArenas,
  deleteArena,
  createSlot,
  createBulkSlots,
  updateSlot,
  deleteSlot,
  updateBookingPaymentStatus,
  bookSlotWithTransaction,
  generate7DaySlots,
  toggleArenaMaintenance,
  toggleTurfClosedStatus,
  isLobbyBooking,
  getLobbyParticipants,
  getEffectiveOwnerPlanFeatures,
  listenOwnerBrandProfile,
} from '../lib/db';
import {
  formatCurrency,
  formatDateString,
  getDayName,
  getTodayDateString,
  getNextDays,
  formatTime24to12,
  readFileAsDataURL,
  sortSlotsChronologically,
} from '../lib/utils';
import { OwnerAnalyticsDashboard } from './owner/OwnerAnalyticsDashboard';
import { OwnerPlayerDues } from './owner/OwnerPlayerDues';
import { OwnerOffersTab } from './owner/OwnerOffersTab';
import { OwnerReviewsTab } from './owner/OwnerReviewsTab';
import { RecurringSlotsModal } from './owner/RecurringSlotsModal';
import { SevenDaySlotsModal } from './owner/SevenDaySlotsModal';
import { OwnerPaymentSettingsTab } from './owner/OwnerPaymentSettingsTab';
import { OwnerVerificationCard } from './owner/OwnerVerificationCard';
import { EditArenaModal } from './owner/EditArenaModal';
import { OwnerSubscriptionTab } from './owner/OwnerSubscriptionTab';
import { OwnerBrandProfileTab } from './owner/OwnerBrandProfileTab';
import { OwnerBrandProfileModal } from './social/OwnerBrandProfileModal';
import { SocialProfileView } from './profile/SocialProfileView';
import { SocialProfileModal } from './profile/SocialProfileModal';
import { DirectMessagesInboxModal } from './messaging/DirectMessagesInboxModal';
import { subscribeUserConversations } from '../lib/directMessagingService';
import { PromotionalBannerCarousel } from './PromotionalBannerCarousel';
import {
  Building2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  IndianRupee,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  DollarSign,
  Lock,
  Unlock,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Tag,
  Star,
  Repeat,
  Zap,
  Wrench,
  Power,
  Ban,
  QrCode,
  UserX,
  ChevronDown,
  ChevronUp,
  X as XIcon,
  Trophy,
  User,
  Phone,
  Pencil,
  ExternalLink,
  Banknote,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import {
  openWhatsAppNotification,
  copyWhatsAppMessage,
} from '../lib/whatsappService';

interface OwnerDashboardProps {
  currentTab:
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
    | 'profile';
  setCurrentTab: (tab: any) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ currentTab, setCurrentTab }) => {
  const { user, profile, updateUserProfile, isAdmin, setActiveRole } = useAuth();

  // Primary Data State from Firestore
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [allArenasMap, setAllArenasMap] = useState<Record<string, Arena[]>>({});
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureConfig>(DEFAULT_PLAN_FEATURES);

  // Forms and Modals
  const [showAddTurfModal, setShowAddTurfModal] = useState<boolean>(false);
  const [showAddArenaModal, setShowAddArenaModal] = useState<boolean>(false);
  const [showAddSlotModal, setShowAddSlotModal] = useState<boolean>(false);
  const [showBulkSlotModal, setShowBulkSlotModal] = useState<boolean>(false);
  const [showRecurringSlotsModal, setShowRecurringSlotsModal] = useState<boolean>(false);
  const [showSevenDayModal, setShowSevenDayModal] = useState<boolean>(false);
  const [slotViewMode, setSlotViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(getTodayDateString());

  // Bookings Filter & Roster View States
  const [bookingSearchTerm, setBookingSearchTerm] = useState<string>('');
  const [bookingDateFilter, setBookingDateFilter] = useState<string>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'PENDING' | 'LIVE' | 'OVER' | 'NOSHOW' | 'CANCELLED'>('ALL');
  const [bookingSourceFilter, setBookingSourceFilter] = useState<'ALL' | 'INDIVIDUAL' | 'LOBBY'>('ALL');
  const [expandedBookingRosterId, setExpandedBookingRosterId] = useState<string | null>(null);
  const [lobbyPlayersMap, setLobbyPlayersMap] = useState<Record<string, LobbyPlayer[]>>({});
  const [loadingRosterMap, setLoadingRosterMap] = useState<Record<string, boolean>>({});

  // Owner Profile Sub-tab & Brand Page State
  const [ownerProfileTab, setOwnerProfileTab] = useState<'profile' | 'brand'>('profile');
  const [brandProfile, setBrandProfile] = useState<OwnerBrandProfile | null>(null);
  const [isPreviewBrandOpen, setIsPreviewBrandOpen] = useState<boolean>(false);
  const [viewUserProfileId, setViewUserProfileId] = useState<string | null>(null);

  const handleToggleBookingRoster = async (b: Booking) => {
    if (expandedBookingRosterId === b.id) {
      setExpandedBookingRosterId(null);
      return;
    }
    setExpandedBookingRosterId(b.id);
    if (isLobbyBooking(b) && b.lobbyId && !lobbyPlayersMap[b.lobbyId]) {
      setLoadingRosterMap((prev) => ({ ...prev, [b.lobbyId!]: true }));
      try {
        const participants = await getLobbyParticipants(b.lobbyId);
        setLobbyPlayersMap((prev) => ({ ...prev, [b.lobbyId!]: participants }));
      } catch (err) {
        console.error('Error fetching lobby participants for roster:', err);
      } finally {
        setLoadingRosterMap((prev) => ({ ...prev, [b.lobbyId!]: false }));
      }
    }
  };

  // Add & Edit Turf Form Fields
  const [turfName, setTurfName] = useState<string>('');
  const [turfDesc, setTurfDesc] = useState<string>('');
  const [turfAddress, setTurfAddress] = useState<string>('');
  const [turfArea, setTurfArea] = useState<string>('');
  const [turfCity, setTurfCity] = useState<string>('Mumbai');
  const [turfLocationUrl, setTurfLocationUrl] = useState<string>('');
  const [turfPhone, setTurfPhone] = useState<string>(profile?.phoneNumber || '');
  const [turfOpenTime, setTurfOpenTime] = useState<string>('06:00');
  const [turfCloseTime, setTurfCloseTime] = useState<string>('23:00');
  const [turfBasePrice, setTurfBasePrice] = useState<number>(1200);
  const [turfSports, setTurfSports] = useState<string[]>(['Football', 'Box Cricket']);
  const [turfFacilities, setTurfFacilities] = useState<string[]>([
    'Floodlights',
    'Changing Room',
    'Parking',
    'Drinking Water',
  ]);
  const [turfLat, setTurfLat] = useState<number>(19.076);
  const [turfLng, setTurfLng] = useState<number>(72.8777);
  const [turfPhotos, setTurfPhotos] = useState<string[]>([]);
  const [turfAllowPayAtVenue, setTurfAllowPayAtVenue] = useState<boolean>(true);
  const [editingTurf, setEditingTurf] = useState<Turf | null>(null);
  const [showEditTurfModal, setShowEditTurfModal] = useState<boolean>(false);

  // Direct Messaging Inbox State
  const [showDirectMessagesInboxModal, setShowDirectMessagesInboxModal] = useState<boolean>(false);
  const [unreadDirectMessagesCount, setUnreadDirectMessagesCount] = useState<number>(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserConversations(user.uid, (convs) => {
      const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount?.[user.uid] || 0), 0);
      setUnreadDirectMessagesCount(totalUnread);
    });
    return () => unsub();
  }, [user?.uid]);

  // Facility Category for Turf / Gaming Zone creation
  const [turfFacilityCategory, setTurfFacilityCategory] = useState<'OUTDOOR_TURF' | 'INDOOR_GAME'>('OUTDOOR_TURF');
  const [turfIndoorGameType, setTurfIndoorGameType] = useState<string>('Pool');

  // Add Arena Form Fields
  const [arenaFacilityType, setArenaFacilityType] = useState<'OUTDOOR_TURF' | 'INDOOR_GAME'>('OUTDOOR_TURF');
  const [arenaIndoorGame, setArenaIndoorGame] = useState<string>('Pool');
  const [arenaHasAC, setArenaHasAC] = useState<boolean>(true);
  const [arenaHasLounge, setArenaHasLounge] = useState<boolean>(true);
  const [arenaEquipment, setArenaEquipment] = useState<string[]>(['Standard Equipment Provided', 'Sanitized Gear']);
  const [arenaName, setArenaName] = useState<string>('');
  const [arenaSport, setArenaSport] = useState<string>('Football');
  const [arenaSports, setArenaSports] = useState<string[]>(['Football']);
  const [arenaDesc, setArenaDesc] = useState<string>('');
  const [arenaCapacity, setArenaCapacity] = useState<number>(14);
  const [arenaPrice, setArenaPrice] = useState<number>(1200);
  const [arenaPhotos, setArenaPhotos] = useState<string[]>([]);

  // Single Slot Form Fields
  const [slotDate, setSlotDate] = useState<string>(getTodayDateString());
  const [slotStartTime, setSlotStartTime] = useState<string>('18:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('19:00');
  const [slotPrice, setSlotPrice] = useState<number>(1200);
  const [slotVisible, setSlotVisible] = useState<boolean>(true);
  const [slotStatus, setSlotStatus] = useState<any>('AVAILABLE');

  // Bulk Slot Form Fields
  const [bulkDate, setBulkDate] = useState<string>(getTodayDateString());
  const [bulkStartHour, setBulkStartHour] = useState<number>(16); // 4 PM
  const [bulkEndHour, setBulkEndHour] = useState<number>(23); // 11 PM
  const [bulkDurationHours, setBulkDurationHours] = useState<number>(1);
  const [bulkSlotPrice, setBulkSlotPrice] = useState<number>(1200);

  // Profile Edit fields
  const [editName, setEditName] = useState<string>(profile?.displayName || '');
  const [editPhone, setEditPhone] = useState<string>(profile?.phoneNumber || '');
  const [editCity, setEditCity] = useState<string>(profile?.city || '');
  const [editBio, setEditBio] = useState<string>(profile?.bio || '');
  const [editBusiness, setEditBusiness] = useState<string>(profile?.businessName || '');

  // Payment Settlement Dialog State
  const [settlementBooking, setSettlementBooking] = useState<Booking | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);

  // Edit Arena Modal state
  const [editingArena, setEditingArena] = useState<Arena | null>(null);
  const [showEditArenaModal, setShowEditArenaModal] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    if (!user || !user.uid || typeof user.uid !== 'string' || !user.uid.trim()) return;
    setLoading(true);
    try {
      const ownerTurfs = await getOwnerTurfs(user.uid);
      setTurfs(ownerTurfs || []);

      const arenaMap: Record<string, Arena[]> = {};
      for (const t of (ownerTurfs || [])) {
        if (t && t.id) {
          arenaMap[t.id] = await getTurfArenas(t.id);
        }
      }
      setAllArenasMap(arenaMap);

      if (ownerTurfs && ownerTurfs.length > 0) {
        const activeT = selectedTurf && ownerTurfs.find((t) => t.id === selectedTurf.id)
          ? selectedTurf
          : ownerTurfs[0];
        setSelectedTurf(activeT);

        const turfArenas = (activeT?.id && arenaMap[activeT.id]) || (activeT?.id ? await getTurfArenas(activeT.id) : []);
        setArenas(turfArenas || []);
        if (turfArenas && turfArenas.length > 0) {
          setSelectedArena(turfArenas[0]);
        } else {
          setSelectedArena(null);
        }
      } else {
        setSelectedTurf(null);
        setArenas([]);
        setSelectedArena(null);
      }

      const allSlots = await getOwnerSlots(user.uid);
      setSlots(allSlots || []);

      const allBookings = await getOwnerBookings(user.uid);
      setBookings(allBookings || []);

      const feats = await getEffectiveOwnerPlanFeatures(user.uid);
      setPlanFeatures(feats);
    } catch (err: any) {
      console.error('Error loading owner data:', err);
      showToast('Error loading records from Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenOwnerBrandProfile(user.uid, (bp) => {
      setBrandProfile(bp);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleSelectTurf = async (turf: Turf) => {
    setSelectedTurf(turf);
    const turfArenas = await getTurfArenas(turf.id);
    setArenas(turfArenas);
    if (turfArenas.length > 0) {
      setSelectedArena(turfArenas[0]);
    } else {
      setSelectedArena(null);
    }
  };

  // ------------------ ADD TURF ------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isTurf: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await readFileAsDataURL(file);
        urls.push(dataUrl);
      }
      if (isTurf) {
        setTurfPhotos((prev) => [...prev, ...urls]);
      } else {
        setArenaPhotos((prev) => [...prev, ...urls]);
      }
      showToast(`Uploaded ${urls.length} photo(s) successfully!`);
    } catch (err) {
      showToast('Failed to process image file.', 'error');
    }
  };

  const handleCreateTurf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!turfName.trim() || !turfAddress.trim() || !turfCity.trim() || !turfLocationUrl.trim()) {
      showToast('Turf name, address, city, and Google Maps Location Link are compulsory fields.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const newTurfId = await createTurf({
        ownerId: user.uid,
        name: turfName.trim(),
        description: turfDesc.trim(),
        address: turfAddress.trim(),
        area: turfArea.trim() || 'Central',
        city: turfCity.trim(),
        locationUrl: turfLocationUrl.trim(),
        phoneNumber: turfPhone.trim(),
        openingTime: turfOpenTime,
        closingTime: turfCloseTime,
        sports: turfSports,
        facilities: turfFacilities,
        basePrice: turfBasePrice,
        latitude: turfLat,
        longitude: turfLng,
        photos: turfPhotos,
        allowPayAtVenue: turfAllowPayAtVenue,
        allowPayLater: turfAllowPayAtVenue,
        active: true,
      });

      // Automatically create a default arena for this turf
      let initialArenaName = 'Main 7v7 Arena';
      let initialSport = turfSports[0] || 'Football';
      let initialDesc = 'Full sized high-grade astroturf sports arena with floodlights';
      let initialCapacity = 14;

      if (turfFacilityCategory === 'INDOOR_GAME') {
        initialArenaName = `${turfIndoorGameType} Table #1`;
        initialSport = turfIndoorGameType;
        initialDesc = `Climate-controlled indoor gaming zone for ${turfIndoorGameType} with AC lounge and pro equipment`;
        initialCapacity = 4;
      }

      await createArena({
        turfId: newTurfId,
        ownerId: user.uid,
        name: initialArenaName,
        sport: initialSport,
        sports: [initialSport],
        facilityType: turfFacilityCategory,
        indoorGameType: turfFacilityCategory === 'INDOOR_GAME' ? turfIndoorGameType : undefined,
        description: initialDesc,
        capacity: initialCapacity,
        pricePerSlot: turfBasePrice,
        photos: turfPhotos.slice(0, 1),
        active: true,
      });

      showToast(
        turfFacilityCategory === 'INDOOR_GAME'
          ? 'Dedicated Gaming Zone created with default Arena station!'
          : 'Sports Turf created with default Arena court!'
      );
      setShowAddTurfModal(false);
      // Reset form
      setTurfName('');
      setTurfDesc('');
      setTurfAddress('');
      setTurfLocationUrl('');
      setTurfPhotos([]);
      setTurfFacilityCategory('OUTDOOR_TURF');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditTurfModal = (turf: Turf) => {
    setEditingTurf(turf);
    setTurfName(turf.name || '');
    setTurfDesc(turf.description || '');
    setTurfAddress(turf.address || '');
    setTurfArea(turf.area || '');
    setTurfCity(turf.city || '');
    setTurfLocationUrl(turf.locationUrl || '');
    setTurfPhone(turf.phoneNumber || '');
    setTurfOpenTime(turf.openingTime || '06:00');
    setTurfCloseTime(turf.closingTime || '23:00');
    setTurfBasePrice(turf.basePrice || 1200);
    setTurfSports(turf.sports && turf.sports.length > 0 ? turf.sports : ['Football']);
    setTurfFacilities(turf.facilities && turf.facilities.length > 0 ? turf.facilities : ['Floodlights']);
    setTurfLat(turf.latitude || 19.076);
    setTurfLng(turf.longitude || 72.8777);
    setTurfPhotos(turf.photos || []);
    setTurfAllowPayAtVenue(turf.allowPayAtVenue !== false && turf.allowPayLater !== false);
    setShowEditTurfModal(true);
  };

  const handleToggleTurfPayAtVenueQuick = async (turf: Turf) => {
    const currentAllowed = turf.allowPayAtVenue !== false && turf.allowPayLater !== false;
    const nextAllowed = !currentAllowed;
    try {
      await updateTurf(turf.id, {
        allowPayAtVenue: nextAllowed,
        allowPayLater: nextAllowed,
      });
      showToast(
        nextAllowed
          ? `Pay at Venue turned ON for "${turf.name}". Players can pay cash at counter.`
          : `Pay at Venue turned OFF for "${turf.name}". 100% online advance payment is now enforced.`
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment option.', 'error');
    }
  };

  const handleUpdateTurf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTurf) return;
    if (!turfName.trim() || !turfAddress.trim() || !turfCity.trim() || !turfLocationUrl.trim()) {
      showToast('Turf name, address, city, and Google Maps Location Link are compulsory fields.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await updateTurf(editingTurf.id, {
        name: turfName.trim(),
        description: turfDesc.trim(),
        address: turfAddress.trim(),
        area: turfArea.trim() || 'Central',
        city: turfCity.trim(),
        locationUrl: turfLocationUrl.trim(),
        phoneNumber: turfPhone.trim(),
        openingTime: turfOpenTime,
        closingTime: turfCloseTime,
        sports: turfSports,
        facilities: turfFacilities,
        basePrice: turfBasePrice,
        latitude: turfLat,
        longitude: turfLng,
        photos: turfPhotos,
        allowPayAtVenue: turfAllowPayAtVenue,
        allowPayLater: turfAllowPayAtVenue,
      });

      showToast('Venue updated successfully!');
      setShowEditTurfModal(false);
      setEditingTurf(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update venue.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ ADD ARENA ------------------
  const handleCreateArena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf) return;
    if (planFeatures.multiCourtSetup === false && arenas.length >= 1) {
      showToast('Multi-Court / Multi-Arena setup is locked on your current plan. Please upgrade to Pro to add multiple courts or arenas.', 'error');
      return;
    }
    if (!arenaName.trim()) {
      showToast('Arena name is required.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (arenaFacilityType === 'INDOOR_GAME') {
        const gameName = arenaIndoorGame;
        await createArena({
          turfId: selectedTurf.id,
          ownerId: user.uid,
          name: arenaName.trim(),
          sport: gameName,
          sports: [gameName],
          facilityType: 'INDOOR_GAME',
          indoorGameType: gameName,
          tableOrBoardNumber: arenaName.trim(),
          equipmentIncluded: arenaEquipment,
          hasAirConditioning: arenaHasAC,
          hasLoungeAccess: arenaHasLounge,
          description: arenaDesc.trim() || `${gameName} station at ${selectedTurf.name}`,
          capacity: Number(arenaCapacity) || 4,
          pricePerSlot: Number(arenaPrice) || 200,
          photos: arenaPhotos.length > 0 ? arenaPhotos : (selectedTurf.photos?.slice(0, 1) || []),
          active: true,
        });

        // Ensure parent turf lists this indoor game & has gaming zone enabled
        const updatedSports = Array.from(new Set([...(selectedTurf.sports || []), gameName]));
        const updatedIndoorGames = Array.from(new Set([...(selectedTurf.indoorGames || []), gameName]));
        await updateTurf(selectedTurf.id, {
          hasGamingZone: true,
          sports: updatedSports,
          indoorGames: updatedIndoorGames,
        });

        showToast(`Indoor gaming station "${arenaName}" (${gameName}) added to Gaming Zone!`);
      } else {
        const finalSports = arenaSports.length > 0 ? arenaSports : [arenaSport || 'Football'];
        await createArena({
          turfId: selectedTurf.id,
          ownerId: user.uid,
          name: arenaName.trim(),
          sport: finalSports[0],
          sports: finalSports,
          facilityType: 'OUTDOOR_TURF',
          description: arenaDesc.trim() || `${finalSports.join(' & ')} arena at ${selectedTurf.name}`,
          capacity: Number(arenaCapacity) || 12,
          pricePerSlot: Number(arenaPrice) || selectedTurf.basePrice,
          photos: arenaPhotos,
          active: true,
        });

        showToast(`Outdoor pitch added! Sports: ${finalSports.join(', ')}`);
      }

      setShowAddArenaModal(false);
      setArenaName('');
      setArenaDesc('');
      setArenaSports(['Football']);
      setArenaFacilityType('OUTDOOR_TURF');
      setArenaIndoorGame('Pool');
      setArenaPhotos([]);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create arena.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ ADD SINGLE SLOT ------------------
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf || !selectedArena) {
      showToast('Please select a Turf and Arena first.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const dayName = getDayName(slotDate);
      await createSlot({
        turfId: selectedTurf.id,
        arenaId: selectedArena.id,
        ownerId: user.uid,
        date: slotDate,
        day: dayName,
        startTime: formatTime24to12(slotStartTime),
        endTime: formatTime24to12(slotEndTime),
        durationMinutes: 60,
        price: Number(slotPrice) || selectedArena.pricePerSlot,
        visibleToPlayers: slotVisible,
        status: slotStatus,
        bookingType: slotStatus === 'BOOKED_BY_OWNER' ? 'OWNER' : undefined,
      });

      showToast('Slot created successfully!');
      setShowAddSlotModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create slot.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ BULK CREATE SLOTS ------------------
  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf || !selectedArena) {
      showToast('Please select a Turf and Arena first.', 'error');
      return;
    }

    if (bulkStartHour >= bulkEndHour) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const bulkPayload = [];
      const dayName = getDayName(bulkDate);

      for (let h = bulkStartHour; h < bulkEndHour; h += bulkDurationHours) {
        const startH24 = `${h < 10 ? '0' : ''}${h}:00`;
        const endH24 = `${h + bulkDurationHours < 10 ? '0' : ''}${h + bulkDurationHours}:00`;

        bulkPayload.push({
          turfId: selectedTurf.id,
          arenaId: selectedArena.id,
          ownerId: user.uid,
          date: bulkDate,
          day: dayName,
          startTime: formatTime24to12(startH24),
          endTime: formatTime24to12(endH24),
          durationMinutes: bulkDurationHours * 60,
          price: Number(bulkSlotPrice),
          visibleToPlayers: true,
          status: 'AVAILABLE' as const,
        });
      }

      const createdCount = await createBulkSlots(bulkPayload);
      showToast(`Generated ${createdCount} slots for ${bulkDate}!`);
      setShowBulkSlotModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create bulk slots.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ TOGGLE SLOT VISIBILITY / BLOCK ------------------
  const handleToggleSlotVisibility = async (slot: Slot) => {
    try {
      await updateSlot(slot.id, {
        visibleToPlayers: !slot.visibleToPlayers,
      });
      showToast(`Slot visibility updated to ${!slot.visibleToPlayers ? 'Visible' : 'Hidden'}.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to toggle visibility.', 'error');
    }
  };

  const handleToggleSlotBlock = async (slot: Slot) => {
    try {
      const newStatus = slot.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
      await updateSlot(slot.id, {
        status: newStatus,
      });
      showToast(`Slot is now ${newStatus}.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to change slot status.', 'error');
    }
  };

  const handleToggleTurfClosed = async (turf: Turf) => {
    const isCurrentlyClosed = !!turf.isClosed;
    const newClosedState = !isCurrentlyClosed;
    let reason = '';
    if (newClosedState) {
      reason = prompt('Optional reason for closing turf (e.g. Heavy Rain / Maintenance / Event / Facility Upgrade):') || 'Temporary closure by turf management';
    }
    try {
      await toggleTurfClosedStatus(turf.id, newClosedState, reason);
      showToast(`Turf marked as ${newClosedState ? 'CLOSED / SHUTDOWN' : 'OPEN & ACTIVE'}.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update turf status.', 'error');
    }
  };

  const handleToggleArenaMaintenance = async (arena: Arena) => {
    const isUnderMaintenance = !!arena.isUnderMaintenance;
    const newMaintenanceState = !isUnderMaintenance;
    let reason = '';
    if (newMaintenanceState) {
      reason = prompt('Reason for arena maintenance (e.g. Grass Resurfacing / Net Repairs / Lighting Upgrades):') || 'Scheduled arena maintenance';
    }
    try {
      await toggleArenaMaintenance(arena.id, newMaintenanceState, reason, true);
      showToast(`Arena "${arena.name}" is now ${newMaintenanceState ? 'UNDER MAINTENANCE (Future slots blocked)' : 'ACTIVE (Slots available)'}.`);
      await loadData();
      if (selectedTurf) {
        const updatedArenas = await getTurfArenas(selectedTurf.id);
        setArenas(updatedArenas);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update arena maintenance mode.', 'error');
    }
  };

  const handleOwnerBookSlot = async (slot: Slot) => {
    if (!user || !selectedTurf || !selectedArena) return;
    try {
      await bookSlotWithTransaction({
        playerId: user.uid,
        playerName: `${profile?.displayName || 'Owner'} (Owner Direct)`,
        playerEmail: user.email || '',
        playerPhone: profile?.phoneNumber || '',
        ownerId: user.uid,
        turfId: slot.turfId,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address,
        turfArea: selectedTurf.area,
        turfCity: selectedTurf.city,
        arenaId: slot.arenaId,
        arenaName: selectedArena.name,
        sport: selectedArena.sport,
        slotId: slot.id,
        date: slot.date,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.durationMinutes,
        totalAmount: slot.price,
        paymentMethod: 'PAY_NOW',
        isOwnerBooking: true,
      });
      showToast('Slot reserved as BOOKED BY OWNER.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to book slot for owner.', 'error');
    }
  };

  // ------------------ SETTLE DUE PAYMENT ------------------
  const handleRecordPaymentSettlement = async () => {
    if (!settlementBooking || settlementAmount <= 0) {
      showToast('Enter a valid settlement amount.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await updateBookingPaymentStatus(
        settlementBooking.id,
        settlementAmount,
        'Settlement collected at turf counter'
      );
      showToast(`Recorded payment of ${formatCurrency(settlementAmount)} successfully!`);
      setSettlementBooking(null);
      setSettlementAmount(0);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ CALCULATE REAL METRICS ------------------
  const todayStr = getTodayDateString();
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const upcomingBookings = bookings.filter((b) => b.date >= todayStr && b.bookingStatus === 'CONFIRMED');
  const availableSlotsCount = slots.filter((s) => s.status === 'AVAILABLE' && s.date >= todayStr).length;
  const pendingDuesTotal = bookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);
  const totalRevenueCollected = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);

  const nextSevenDays = getNextDays(7);

  // Filter and sort slots chronologically for current view
  const currentArenaSlots: Slot[] = sortSlotsChronologically<Slot>(
    slots.filter(
      (s) => (!selectedArena || s.arenaId === selectedArena.id) && s.date === selectedSlotDate
    )
  );

  // Helper: Live status calculation for bookings
  const getBookingGameStatus = (b: Booking): 'LIVE' | 'OVER' | 'UPCOMING' => {
    if (b.date < todayStr) return 'OVER';
    if (b.date > todayStr) return 'UPCOMING';

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const parseToMins = (timeStr: string) => {
      if (!timeStr) return 0;
      const isPM = timeStr.toUpperCase().includes('PM');
      const isAM = timeStr.toUpperCase().includes('AM');
      const clean = timeStr.replace(/[^0-9:]/g, '');
      const parts = clean.split(':').map(Number);
      let h = parts[0] || 0;
      const m = parts[1] || 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    };

    const startMins = parseToMins(b.startTime);
    const endMins = parseToMins(b.endTime);

    if (currentMins >= startMins && currentMins <= endMins) return 'LIVE';
    if (currentMins > endMins) return 'OVER';
    return 'UPCOMING';
  };

  // Filter bookings for the Owner Bookings view
  const filteredOwnerBookings = bookings.filter((b) => {
    const isLobby = isLobbyBooking(b);
    const term = bookingSearchTerm.trim().toLowerCase();

    // Source Filter: ALL / INDIVIDUAL / LOBBY
    if (bookingSourceFilter === 'INDIVIDUAL' && isLobby) return false;
    if (bookingSourceFilter === 'LOBBY' && !isLobby) return false;

    const matchesSearch =
      !term ||
      b.playerName.toLowerCase().includes(term) ||
      b.playerEmail?.toLowerCase().includes(term) ||
      b.playerPhone?.includes(term) ||
      b.bookingId?.toLowerCase().includes(term) ||
      b.turfName.toLowerCase().includes(term) ||
      b.arenaName?.toLowerCase().includes(term) ||
      b.sport?.toLowerCase().includes(term) ||
      (term === 'lobby' && isLobby) ||
      (term === 'individual' && !isLobby) ||
      (term === 'private' && !isLobby);

    if (!matchesSearch) return false;

    // Date filtering
    const dObj = new Date();
    dObj.setDate(dObj.getDate() - 1);
    const yestStr = dObj.toISOString().split('T')[0];
    const tObj = new Date();
    tObj.setDate(tObj.getDate() + 1);
    const tomoStr = tObj.toISOString().split('T')[0];

    if (bookingDateFilter === 'TODAY' && b.date !== todayStr) return false;
    if (bookingDateFilter === 'YESTERDAY' && b.date !== yestStr) return false;
    if (bookingDateFilter === 'TOMORROW' && b.date !== tomoStr) return false;
    if (bookingDateFilter === 'PAST' && b.date >= todayStr) return false;
    if (
      bookingDateFilter !== 'ALL' &&
      bookingDateFilter !== 'TODAY' &&
      bookingDateFilter !== 'YESTERDAY' &&
      bookingDateFilter !== 'TOMORROW' &&
      bookingDateFilter !== 'PAST'
    ) {
      if (b.date !== bookingDateFilter) return false;
    }

    const gameStatus = getBookingGameStatus(b);
    const isCancelled = b.bookingStatus === 'CANCELLED';
    const isNoShow = b.isNoShow;
    const hasPendingDue = (b.amountDue || 0) > 0;

    if (bookingStatusFilter === 'PENDING') return hasPendingDue && !isCancelled;
    if (bookingStatusFilter === 'LIVE') return gameStatus === 'LIVE' && !isCancelled;
    if (bookingStatusFilter === 'OVER') return gameStatus === 'OVER' && !isCancelled;
    if (bookingStatusFilter === 'NOSHOW') return isNoShow;
    if (bookingStatusFilter === 'CANCELLED') return isCancelled;

    return true;
  });

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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                TURFIT <span className="text-indigo-500 font-medium text-xs sm:text-sm ml-1.5 tracking-widest uppercase">Owner</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-100">{profile?.displayName || 'Turf Owner'}</span>
              <span className="text-xs text-slate-400">{profile?.businessName || selectedTurf?.name || 'Sports Arena Hub'}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 p-0.5 bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-sm text-indigo-300 shadow-md">
              {profile?.displayName?.charAt(0) || '👤'}
            </div>

            <div className="flex items-center gap-2">
              {/* Direct Messages Inbox Button */}
              <button
                id="owner-direct-messages-inbox-btn"
                onClick={() => setShowDirectMessagesInboxModal(true)}
                title="1-on-1 Direct Messages & Athlete Inquiries"
                className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                {unreadDirectMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">
                    {unreadDirectMessagesCount > 9 ? '9+' : unreadDirectMessagesCount}
                  </span>
                )}
              </button>

              <button
                onClick={loadData}
                title="Refresh Firestore data"
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {turfs.length > 0 && (
                <button
                  id="header-add-turf-btn"
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* TAB: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <PromotionalBannerCarousel audience="OWNERS" onNavigate={(screen) => setCurrentTab(screen as any)} />

            {/* Real Stats Metric Cards Grid - Sleek Interface */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Today's Bookings</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{todayBookings.length}</h2>
                  <span className="text-emerald-400 text-sm font-medium">Live schedule</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{formatCurrency(totalRevenueCollected)}</h2>
                  <span className="text-indigo-400 text-sm font-medium">Collected</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl border-l-4 border-l-amber-500">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Pending Dues</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{formatCurrency(pendingDuesTotal)}</h2>
                  <span className="text-amber-500 text-sm font-medium italic">Action Required</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Slots</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{availableSlotsCount}</h2>
                  <span className="text-slate-500 text-sm font-medium italic">{arenas.length} Arenas</span>
                </div>
              </div>
            </section>

            {/* Secondary Stat bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Total Revenue Collected</span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatCurrency(totalRevenueCollected)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Total Turfs Managed</span>
                    <span className="text-base font-bold text-white">{turfs.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Active Arenas</span>
                    <span className="text-base font-bold text-white">{arenas.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Turf Selector */}
            {turfs.length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 rounded-3xl p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No turfs added yet</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  Start by adding your real sports turf, arena courts, and time slots to begin accepting player bookings.
                </p>
                <button
                  id="empty-add-turf-btn"
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Turf</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Active Turf Overview & Arenas */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Selected Turf Card */}
                  {selectedTurf && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white">{selectedTurf.name}</h2>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2 py-0.5 rounded font-medium">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {selectedTurf.address}, {selectedTurf.area}, {selectedTurf.city}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentTab('slots')}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Manage Slots
                          </button>
                          <button
                            onClick={() => setShowAddArenaModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Arena</span>
                          </button>
                        </div>
                      </div>

                      {/* Arenas Under this turf */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-slate-200">My Arenas ({arenas.length})</h3>
                        </div>

                        {arenas.length === 0 ? (
                          <div className="bg-slate-950 p-4 rounded-xl text-center text-xs text-slate-500">
                            No arenas created for this turf. Click "+ Add Arena" above.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {arenas.map((ar, arIdx) => (
                              <div
                                key={ar.id ? `owner-arena-${ar.id}` : `owner-arena-idx-${arIdx}`}
                                onClick={() => setSelectedArena(ar)}
                                className={`p-4 rounded-xl bg-slate-800 border transition-all cursor-pointer ${
                                  selectedArena?.id === ar.id
                                    ? 'border-slate-700 ring-2 ring-indigo-500/20 shadow-lg'
                                    : 'border-slate-700/60 opacity-85 hover:opacity-100 hover:border-indigo-500/60'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-slate-100 text-sm">{ar.name}</h4>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingArena(ar);
                                        setShowEditArenaModal(true);
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      <span>Edit Pitch</span>
                                    </button>
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                      Active
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400">{ar.description || `${ar.sport} court`}</p>
                                <div className="mt-3 flex items-center gap-3">
                                  <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded font-semibold">
                                    Pitch Price: {formatCurrency(ar.pricePerSlot)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Cap: {ar.capacity}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Today's Schedule Feed */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Today's Schedule</h3>
                        <span className="text-xs text-slate-400">{formatDateString(todayStr)}</span>
                      </div>
                      <button
                        onClick={() => setCurrentTab('bookings')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        View all bookings →
                      </button>
                    </div>

                    {todayBookings.length === 0 ? (
                      <div className="bg-slate-950/60 rounded-xl p-6 text-center text-xs text-slate-400">
                        No bookings scheduled for today yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {todayBookings.map((b, bIdx) => (
                          <div
                            key={b.id ? `today-bk-${b.id}` : `today-bk-idx-${bIdx}`}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                                {b.startTime.split(' ')[0]}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-white block">
                                  {b.playerName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {b.arenaName} • {b.startTime} - {b.endTime}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="text-right">
                                <span className="text-xs font-bold text-white block">
                                  {formatCurrency(b.totalAmount)}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold ${
                                    b.paymentStatus === 'PAID'
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {b.paymentStatus}
                                </span>
                              </div>
                              {b.amountDue > 0 && (
                                <button
                                  onClick={() => {
                                    setSettlementBooking(b);
                                    setSettlementAmount(b.amountDue);
                                  }}
                                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  Collect
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Col: Quick Turf Selector list */}
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                      My Turfs ({turfs.length})
                    </span>
                    <div className="space-y-2">
                      {turfs.map((t, tIdx) => (
                        <div
                          key={t.id ? `quick-turf-${t.id}` : `quick-turf-idx-${tIdx}`}
                          onClick={() => handleSelectTurf(t)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            selectedTurf?.id === t.id
                              ? 'border-indigo-500 bg-indigo-950/20 font-semibold ring-1 ring-indigo-500/30'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm text-white block">{t.name}</span>
                            <span className="text-[11px] text-slate-400">{t.city} • {t.area}</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-400">
                            {formatCurrency(t.basePrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Turf Location preview */}
                  {selectedTurf && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                        Turf Geolocation
                      </span>
                      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Latitude:</span>
                          <span className="text-white">{selectedTurf.latitude != null ? Number(selectedTurf.latitude).toFixed(6) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Longitude:</span>
                          <span className="text-white">{selectedTurf.longitude != null ? Number(selectedTurf.longitude).toFixed(6) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                          <span className="text-slate-500">Address:</span>
                          <span className="text-indigo-400 font-sans">{selectedTurf.area}, {selectedTurf.city}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MY TURF MANAGEMENT */}
        {currentTab === 'my-turf' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Turf & Arena Management</h2>
                <p className="text-xs text-slate-400">Manage real properties, arenas, sports and photos</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="tab-add-turf-btn"
                  onClick={() => {
                    setTurfFacilityCategory('OUTDOOR_TURF');
                    setShowAddTurfModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Outdoor Turf</span>
                </button>
                <button
                  id="tab-add-gamingzone-btn"
                  onClick={() => {
                    setTurfFacilityCategory('INDOOR_GAME');
                    setTurfSports(['Pool', 'Snooker', 'Table Tennis', 'Carrom', 'PS5', 'Foosball']);
                    setTurfFacilities(['Air Conditioning', 'AC Player Lounge', 'Refreshment Cafe', 'Sanitized Equipment']);
                    setTurfBasePrice(250);
                    setShowAddTurfModal(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-amber-950/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Gaming Zone</span>
                </button>
              </div>
            </div>

            {turfs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-4">No turfs created yet.</p>
                <button
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Add Turf Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {turfs.map((turf, turfIdx) => (
                  <div
                    key={turf.id ? `turf-card-${turf.id}` : `turf-card-idx-${turfIdx}`}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-white">{turf.name}</h3>
                          <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            {turf.city}
                          </span>
                          {turf.isClosed ? (
                            <span className="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Ban className="w-3 h-3" /> Turf Closed
                            </span>
                          ) : (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Open & Active
                            </span>
                          )}

                          {turf.allowPayAtVenue !== false && turf.allowPayLater !== false ? (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-emerald-400" /> Pay at Venue ON
                            </span>
                          ) : (
                            <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-amber-400" /> 100% Online Advance
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{turf.address}, {turf.area}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>Hours: {turf.openingTime} - {turf.closingTime}</span>
                          <span>•</span>
                          <span>Phone: {turf.phoneNumber}</span>
                          {turf.locationUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={turf.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                              >
                                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Google Maps Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                        {turf.photos && turf.photos.length > 0 && (
                          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto">
                            {turf.photos.map((p, pIdx) => (
                              <img
                                key={`turf-${turf.id}-top-photo-${pIdx}`}
                                src={p}
                                alt={`${turf.name} photo ${pIdx + 1}`}
                                className="w-14 h-10 object-cover rounded-md border border-slate-700/60 shadow-sm"
                              />
                            ))}
                          </div>
                        )}
                        {turf.isClosed && turf.closedReason && (
                          <p className="text-xs text-rose-400 font-medium mt-1">
                            Closure Note: {turf.closedReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {/* Edit Turf Button */}
                        <button
                          type="button"
                          onClick={() => openEditTurfModal(turf)}
                          className="bg-amber-500/20 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/40 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Edit Venue Details, Location & Photos"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit Venue</span>
                        </button>

                        {/* Turf Closed / Open Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleTurfClosed(turf)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            turf.isClosed
                              ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border-emerald-500/40'
                              : 'bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white border-rose-500/40'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{turf.isClosed ? 'Reopen Turf' : 'Close Turf'}</span>
                        </button>

                        {/* Pay at Venue Quick Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleTurfPayAtVenueQuick(turf)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            turf.allowPayAtVenue !== false && turf.allowPayLater !== false
                              ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-600 hover:text-white border-emerald-500/40'
                              : 'bg-amber-950/40 text-amber-300 hover:bg-amber-600 hover:text-white border-amber-500/40'
                          }`}
                          title={
                            turf.allowPayAtVenue !== false && turf.allowPayLater !== false
                              ? 'Pay at Venue is active: Click to turn OFF and require 100% online advance'
                              : 'Online only: Click to turn ON and permit cash at counter'
                          }
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>
                            {turf.allowPayAtVenue !== false && turf.allowPayLater !== false
                              ? 'Pay at Venue: ON'
                              : 'Pay at Venue: OFF'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTurf(turf);
                            setShowAddArenaModal(true);
                          }}
                          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
                        >
                          + Add Arena
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // 1. Check for upcoming active bookings
                              const { activeCount } = await checkTurfActiveBookings(turf.id);
                              if (activeCount > 0) {
                                alert(`Cannot delete venue "${turf.name}". It has ${activeCount} upcoming active booking(s). Please cancel or fulfill them first.`);
                                return;
                              }
                              // 2. Explicit confirmation prompt
                              const confirmed = window.confirm(
                                `Are you sure you want to permanently delete "${turf.name}"?\n\nThis will remove all associated arenas, slots, and photos. This action cannot be undone.`
                              );
                              if (!confirmed) return;

                              await deleteTurf(turf.id);
                              showToast(`Venue "${turf.name}" deleted successfully.`);
                              await loadData();
                            } catch (err: any) {
                              showToast(err.message || 'Failed to delete turf.', 'error');
                            }
                          }}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Venue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Turf Verification Status & Document Upload Hub */}
                    <OwnerVerificationCard
                      turf={turf}
                      ownerName={profile?.displayName || 'Owner'}
                      onRefresh={loadData}
                    />

                    {/* Arenas breakdown with Maintenance Toggles */}
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Turf Arenas / Pitches ({(allArenasMap[turf.id] || []).length})
                        </span>
                        <span className="text-[11px] text-slate-500">Arena Maintenance & Controls</span>
                      </div>

                      {(allArenasMap[turf.id] || []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">No arenas created yet. Click "+ Add Arena" above.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {(allArenasMap[turf.id] || []).map((arena, aIdx) => (
                            <div
                              key={arena.id ? `turf-arena-${arena.id}` : `turf-${turf.id || turfIdx}-arena-${aIdx}`}
                              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                arena.isUnderMaintenance
                                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{arena.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {arena.sports && arena.sports.length > 1
                                      ? `⚡ Multi-Sport: ${arena.sports.join(' • ')}`
                                      : arena.sport}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {formatCurrency(arena.defaultPricePerHour || 1000)}/hr • Capacity: {arena.capacity || 10} players
                                </p>
                                {arena.isUnderMaintenance && arena.maintenanceReason && (
                                  <p className="text-[10px] text-amber-400 italic mt-0.5">
                                    Reason: {arena.maintenanceReason}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArena(arena);
                                    setShowEditArenaModal(true);
                                  }}
                                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border-indigo-500/30 flex items-center gap-1 transition-all cursor-pointer"
                                  title="Edit Pitch Details, Price, Photos & Amenities"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit Pitch</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleArenaMaintenance(arena)}
                                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                    arena.isUnderMaintenance
                                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-amber-950/50 hover:text-amber-300 border-slate-700'
                                  }`}
                                  title={
                                    arena.isUnderMaintenance
                                      ? 'Click to finish maintenance & make slots available'
                                      : 'Click to put arena under maintenance and block future slots'
                                  }
                                >
                                  <Wrench className="w-3 h-3" />
                                  <span>{arena.isUnderMaintenance ? 'In Maintenance' : 'Set Maint.'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const { activeCount } = await checkArenaActiveBookings(arena.id);
                                      if (activeCount > 0) {
                                        alert(`Cannot delete pitch "${arena.name}". It has ${activeCount} upcoming active booking(s). Please cancel or fulfill them first.`);
                                        return;
                                      }
                                      const confirmed = window.confirm(
                                        `Are you sure you want to delete pitch "${arena.name}"? Future unbooked slots for this pitch will be removed.`
                                      );
                                      if (!confirmed) return;

                                      await deleteArena(arena.id);
                                      showToast(`Pitch "${arena.name}" deleted.`);
                                      await loadData();
                                    } catch (err: any) {
                                      showToast(err.message || 'Failed to delete pitch.', 'error');
                                    }
                                  }}
                                  className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Pitch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Photos Preview */}
                    {turf.photos && turf.photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto py-2">
                        {turf.photos.map((p, idx) => (
                          <img
                            key={`turf-${turf.id}-bottom-photo-${idx}`}
                            src={p}
                            alt="Turf"
                            className="w-24 h-20 object-cover rounded-xl border border-slate-700 flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* Sports & Facilities tags */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {turf.sports?.map((s, i) => (
                        <span key={`turf-${turf.id}-sport-${s}-${i}`} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                          ⚽ {s}
                        </span>
                      ))}
                      {turf.facilities?.map((f, i) => (
                        <span key={`turf-${turf.id}-fac-${f}-${i}`} className="bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SLOT MANAGEMENT (MANUAL, BULK, WEEKLY, VISIBILITY) */}
        {currentTab === 'slots' && (
          <div className="space-y-6">
            {/* Header / Selectors */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Slot Management</h2>
                  <p className="text-xs text-slate-400">
                    Create, edit, block, and control player visibility for slots
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="open-7day-slot-btn"
                    onClick={() => {
                      if (planFeatures.autoSlotGenerator === false) {
                        showToast('Auto Slot Generator is locked on your current subscription plan. Upgrade your plan to unlock automated slot generation.', 'error');
                        return;
                      }
                      setShowSevenDayModal(true);
                    }}
                    className={`text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      planFeatures.autoSlotGenerator !== false
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {planFeatures.autoSlotGenerator !== false ? <Zap className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                    <span>7-Day Generator</span>
                  </button>

                  <button
                    id="open-recurring-slot-btn"
                    onClick={() => {
                      if (planFeatures.autoSlotGenerator === false) {
                        showToast('Recurring Slots Generator is locked on your current subscription plan. Upgrade your plan to unlock automated slot generation.', 'error');
                        return;
                      }
                      setShowRecurringSlotsModal(true);
                    }}
                    className={`text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      planFeatures.autoSlotGenerator !== false
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {planFeatures.autoSlotGenerator !== false ? <Repeat className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Recurring Slots</span>
                  </button>

                  <button
                    id="open-bulk-slot-btn"
                    onClick={() => setShowBulkSlotModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bulk Generate</span>
                  </button>

                  <button
                    id="open-add-slot-btn"
                    onClick={() => setShowAddSlotModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Single Slot</span>
                  </button>
                </div>
              </div>

              {/* Turf & Arena Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select Turf</label>
                  <select
                    value={selectedTurf?.id || ''}
                    onChange={(e) => {
                      const t = turfs.find((item) => item.id === e.target.value);
                      if (t) handleSelectTurf(t);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {turfs.map((t, tIdx) => (
                      <option key={t.id ? `slot-turf-${t.id}` : `slot-turf-idx-${tIdx}`} value={t.id}>
                        {t.name} ({t.city}) {t.isClosed ? '🔴 [CLOSED]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-400">Select Arena</label>
                    {selectedArena && (
                      <button
                        type="button"
                        onClick={() => handleToggleArenaMaintenance(selectedArena)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          selectedArena.isUnderMaintenance
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        {selectedArena.isUnderMaintenance ? 'Under Maintenance' : 'Set Maintenance'}
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedArena?.id || ''}
                    onChange={(e) => {
                      const a = arenas.find((item) => item.id === e.target.value);
                      if (a) setSelectedArena(a);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {arenas.map((a, aIdx) => (
                      <option key={a.id ? `slot-arena-${a.id}` : `slot-arena-idx-${aIdx}`} value={a.id}>
                        {a.name} ({a.sport}) {a.isUnderMaintenance ? '🔧 [MAINTENANCE]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Weekly Calendar Day Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Select Date ({getDayName(selectedSlotDate)})
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {nextSevenDays.map((d, dIdx) => {
                  const isSelected = d.dateStr === selectedSlotDate;
                  const daySlotsCount = slots.filter(
                    (s) => (!selectedArena || s.arenaId === selectedArena.id) && s.date === d.dateStr
                  ).length;

                  return (
                    <button
                      key={d.dateStr || `day-tab-${dIdx}`}
                      onClick={() => setSelectedSlotDate(d.dateStr)}
                      className={`min-w-[80px] p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[11px] font-semibold uppercase">{d.dayName}</span>
                      <span className="text-sm font-extrabold">{d.formatted.split(' ')[1]}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {daySlotsCount} slots
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots List for Date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  Slots for {formatDateString(selectedSlotDate)} ({currentArenaSlots.length})
                </span>
                <span className="text-xs text-indigo-400 font-medium">
                  {currentArenaSlots.filter((s) => s.status === 'AVAILABLE').length} Available
                </span>
              </div>

              {currentArenaSlots.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No slots created for this day. Click "Bulk Generate" or "Add Single Slot" to populate the schedule.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentArenaSlots.map((slot, sIdx) => {
                    const isAvailable = slot.status === 'AVAILABLE';
                    const isBookedPlayer = slot.status === 'BOOKED_BY_PLAYER';
                    const isBookedOwner = slot.status === 'BOOKED_BY_OWNER';
                    const isBlocked = slot.status === 'BLOCKED';

                    return (
                      <div
                        key={slot.id ? `owner-slot-${slot.id}` : `owner-slot-idx-${sIdx}`}
                        className={`p-4 rounded-xl border transition-all relative ${
                          isAvailable
                            ? 'bg-slate-900 border-2 border-indigo-500/50 shadow-lg shadow-indigo-950/20'
                            : isBookedPlayer
                            ? 'bg-slate-950 border border-slate-800'
                            : isBookedOwner
                            ? 'bg-slate-950 border border-slate-800'
                            : 'bg-slate-900 border border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              isAvailable
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : isBookedPlayer
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : isBookedOwner
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-500'
                            }`}
                          >
                            {isBookedOwner ? 'OWNER RESERVED' : slot.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="text-lg font-bold italic text-white">{formatCurrency(slot.price)}</span>
                          <span className="flex items-center gap-1">
                            {slot.visibleToPlayers ? (
                              <span className="text-indigo-400 text-[10px] flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> Visible
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                                <EyeOff className="w-3 h-3" /> Hidden
                              </span>
                            )}
                          </span>
                        </div>

                        {slot.bookedByPlayerName && (
                          <div className="bg-slate-950 p-2 rounded-lg text-xs text-slate-300 mb-2 border border-slate-800">
                            Booked by: <strong className="text-white">{slot.bookedByPlayerName}</strong>
                          </div>
                        )}

                        {/* Owner Controls Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                          <button
                            onClick={() => handleToggleSlotVisibility(slot)}
                            className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer text-[11px]"
                            title={slot.visibleToPlayers ? 'Hide from players' : 'Make visible to players'}
                          >
                            {slot.visibleToPlayers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{slot.visibleToPlayers ? 'Hide' : 'Show'}</span>
                          </button>

                          {isAvailable && (
                            <>
                              <button
                                onClick={() => handleToggleSlotBlock(slot)}
                                className="text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer text-[11px]"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Block</span>
                              </button>

                              <button
                                onClick={() => handleOwnerBookSlot(slot)}
                                className="text-amber-400 hover:text-amber-300 font-bold text-[11px] cursor-pointer"
                              >
                                Reserve
                              </button>
                            </>
                          )}

                          {isBlocked && (
                            <button
                              onClick={() => handleToggleSlotBlock(slot)}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unblock</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              if (confirm('Delete this slot?')) {
                                await deleteSlot(slot.id);
                                showToast('Slot deleted.');
                                await loadData();
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: BOOKINGS */}
        {currentTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  All Bookings & Slot Reservations
                </h2>
                <p className="text-xs text-slate-400">
                  Filter by date, track live matches, view player rosters and collect split dues
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookingSearchTerm}
                  onChange={(e) => setBookingSearchTerm(e.target.value)}
                  placeholder="Search player, phone, ID..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Date & Quick Filters Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter Date:
                  </span>
                  {[
                    { key: 'ALL', label: 'All Dates' },
                    { key: 'TODAY', label: 'Today' },
                    { key: 'YESTERDAY', label: 'Yesterday' },
                    { key: 'TOMORROW', label: 'Tomorrow' },
                    { key: 'PAST', label: 'Past Bookings' },
                  ].map((df) => (
                    <button
                      key={df.key}
                      onClick={() => setBookingDateFilter(df.key)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        bookingDateFilter === df.key
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Input */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Custom Date:</span>
                  <input
                    type="date"
                    value={
                      bookingDateFilter !== 'ALL' &&
                      bookingDateFilter !== 'TODAY' &&
                      bookingDateFilter !== 'YESTERDAY' &&
                      bookingDateFilter !== 'TOMORROW' &&
                      bookingDateFilter !== 'PAST'
                        ? bookingDateFilter
                        : ''
                    }
                    onChange={(e) => setBookingDateFilter(e.target.value || 'ALL')}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  {bookingDateFilter !== 'ALL' && (
                    <button
                      onClick={() => setBookingDateFilter('ALL')}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Pills with Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
                {[
                  { key: 'ALL', label: 'All Bookings', count: bookings.length },
                  {
                    key: 'PENDING',
                    label: 'Pending Dues',
                    count: bookings.filter((b) => (b.amountDue || 0) > 0 && b.bookingStatus !== 'CANCELLED').length,
                    color: 'text-amber-400',
                  },
                  {
                    key: 'LIVE',
                    label: 'Live Matches',
                    count: bookings.filter((b) => getBookingGameStatus(b) === 'LIVE' && b.bookingStatus !== 'CANCELLED').length,
                    color: 'text-emerald-400',
                  },
                  {
                    key: 'OVER',
                    label: 'Game Over',
                    count: bookings.filter((b) => getBookingGameStatus(b) === 'OVER' && b.bookingStatus !== 'CANCELLED').length,
                    color: 'text-rose-400',
                  },
                  {
                    key: 'NOSHOW',
                    label: 'No-Shows',
                    count: bookings.filter((b) => b.isNoShow).length,
                    color: 'text-purple-400',
                  },
                  {
                    key: 'CANCELLED',
                    label: 'Cancelled',
                    count: bookings.filter((b) => b.bookingStatus === 'CANCELLED').length,
                    color: 'text-rose-400',
                  },
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => setBookingStatusFilter(st.key as any)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      bookingStatusFilter === st.key
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      bookingStatusFilter === st.key ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Booking Source Filter Pills (Individual vs Lobby Hosted Match) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" /> Booking Type:
                  </span>
                  {[
                    { key: 'ALL', label: 'All Match Types', count: bookings.length },
                    {
                      key: 'INDIVIDUAL',
                      label: '👤 Individual Bookings',
                      count: bookings.filter((b) => !isLobbyBooking(b)).length,
                      activeColor: 'bg-sky-600/40 border-sky-500 text-sky-200',
                      badgeColor: 'bg-sky-500 text-slate-950',
                    },
                    {
                      key: 'LOBBY',
                      label: '🏆 Lobby-Hosted Matches',
                      count: bookings.filter((b) => isLobbyBooking(b)).length,
                      activeColor: 'bg-purple-600/40 border-purple-500 text-purple-200',
                      badgeColor: 'bg-purple-500 text-slate-950',
                    },
                  ].map((sf) => (
                    <button
                      key={sf.key}
                      onClick={() => setBookingSourceFilter(sf.key as any)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        bookingSourceFilter === sf.key
                          ? (sf.activeColor || 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm')
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>{sf.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                        bookingSourceFilter === sf.key
                          ? (sf.badgeColor || 'bg-indigo-500 text-white')
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {sf.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredOwnerBookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                No bookings match your selected date or status filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOwnerBookings.map((b, bIdx) => {
                  const gameStatus = getBookingGameStatus(b);
                  const isCancelled = b.bookingStatus === 'CANCELLED';
                  const isNoShow = b.isNoShow;
                  const isLive = gameStatus === 'LIVE' && !isCancelled;
                  const isOver = gameStatus === 'OVER' && !isCancelled;
                  const hasDue = (b.amountDue || 0) > 0;
                  const isExpanded = expandedBookingRosterId === b.id;
                  const isLobby = isLobbyBooking(b);

                  // Dynamic Card Border & Background styling strictly following prompt instructions:
                  // 1. Canceled -> dark box with red cross (no text)
                  // 2. Live -> Green
                  // 3. Game Over + Pending Due -> Yellow
                  // 4. Game Over + Settled -> Red
                  let cardStyle = 'bg-slate-900 border-slate-800';
                  if (isCancelled) {
                    cardStyle = 'bg-slate-950/70 border-rose-900/40 opacity-80';
                  } else if (isLive) {
                    cardStyle = 'bg-emerald-950/20 border-emerald-500/80 shadow-lg shadow-emerald-950/30';
                  } else if (isOver && hasDue) {
                    cardStyle = 'bg-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-950/30';
                  } else if (isOver && !hasDue) {
                    cardStyle = 'bg-rose-950/20 border-rose-500/70 shadow-lg shadow-rose-950/30';
                  }

                  // Synthesize player roster from booking for split / individual ledger
                  const totalPlayersCount = b.numberOfPlayers || (b.splitWith && b.splitWith.length > 0 ? b.splitWith.length + 1 : 1);
                  const hostShare = b.playerShareAmount || Math.round(b.totalAmount / totalPlayersCount);
                  const hostPaid = Math.min(b.amountPaid, hostShare);
                  const hostDue = Math.max(0, hostShare - hostPaid);

                  return (
                    <div
                      key={b.id ? `owner-bk-${b.id}` : `owner-bk-idx-${bIdx}`}
                      className={`border rounded-2xl p-5 shadow-xl transition-all ${cardStyle}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left: Info */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/80 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                              {b.bookingId || 'TF-BOOKING'}
                            </span>

                            {/* Booking Type Badge */}
                            {isLobby ? (
                              <span className="inline-flex items-center gap-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-sm">
                                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                                Lobby Match {b.playerName ? `(Host: ${b.playerName})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-sm">
                                <User className="w-3.5 h-3.5 text-sky-400" />
                                {b.bookingType === 'OWNER' ? 'Venue Walk-in / Desk' : 'Individual Booking'}
                              </span>
                            )}

                            <span className="text-base font-bold text-white">{b.playerName}</span>
                            {b.playerPhone && (
                              <span className="text-xs text-slate-400 font-mono">📱 {b.playerPhone}</span>
                            )}
                            <span className="text-xs text-slate-500">({b.playerEmail})</span>
                          </div>

                          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                            <span className="text-white font-medium">{b.turfName}</span>
                            <span>•</span>
                            <span className="text-slate-300">{b.arenaName} ({b.sport})</span>
                            <span>•</span>
                            <span className="text-indigo-400 font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3 inline" />
                              {formatDateString(b.date)} ({b.day})
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 inline" />
                              {b.startTime} - {b.endTime}
                            </span>
                          </div>

                          {/* Quick Badges Row */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {isLive && (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black px-2.5 py-0.5 rounded-md animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                LIVE MATCH IN PROGRESS
                              </span>
                            )}

                            {isOver && hasDue && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                <AlertCircle className="w-3 h-3" />
                                GAME OVER • ₹{b.amountDue} PENDING DUE
                              </span>
                            )}

                            {isOver && !hasDue && (
                              <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                GAME OVER • ALL SETTLED
                              </span>
                            )}

                            {!isOver && !isLive && !isCancelled && (
                              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                UPCOMING
                              </span>
                            )}

                            {isNoShow && (
                              <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                NO-SHOW
                              </span>
                            )}

                            <span className="bg-slate-800/80 text-slate-400 text-[11px] px-2 py-0.5 rounded-md border border-slate-700/50">
                              👥 {totalPlayersCount} Players in Slot
                            </span>
                          </div>
                        </div>

                        {/* Right: Status Indicator / Amount & Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                          <div className="text-right">
                            <span className="text-base font-bold text-white block">
                              {formatCurrency(b.totalAmount)}
                            </span>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 justify-end">
                              <span>Paid: {formatCurrency(b.amountPaid)}</span>
                              {b.amountDue > 0 && (
                                <span className="text-amber-400 font-bold">Due: {formatCurrency(b.amountDue)}</span>
                              )}
                            </div>
                          </div>

                          {/* Requirement 3: When cancelled, don't show cancel text, just put cross in that box */}
                          {isCancelled ? (
                            <div
                              className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-black text-xl select-none"
                              title="Booking Cancelled"
                            >
                              ✕
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {hasDue ? (
                                <button
                                  onClick={() => {
                                    setSettlementBooking(b);
                                    setSettlementAmount(b.amountDue);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-md"
                                >
                                  Collect ₹{b.amountDue}
                                </button>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                  ✓ Paid Full
                                </span>
                              )}

                              {/* Toggle Roster & Split Ledger */}
                              <button
                                onClick={() => handleToggleBookingRoster(b)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="View Players Played in Slot & Match Ledger"
                              >
                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Roster/Ledger</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {/* WhatsApp Booking Confirmation Pass Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (planFeatures.whatsappNotifications === false) {
                                    showToast('WhatsApp booking passes require a Pro SaaS plan. Upgrade your subscription to send automated WhatsApp tickets.', 'error');
                                    setCurrentTab('subscription');
                                    return;
                                  }
                                  const ok = openWhatsAppNotification(b, b.playerPhone, 'OWNER');
                                  if (ok) {
                                    showToast('Opening WhatsApp with booking ticket for player!', 'success');
                                  } else {
                                    showToast('Could not open WhatsApp. Ensure popup is allowed.', 'error');
                                  }
                                }}
                                className={planFeatures.whatsappNotifications === false
                                  ? "bg-slate-800/60 hover:bg-slate-800 text-slate-400 border border-slate-700/60 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                  : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                }
                                title={planFeatures.whatsappNotifications === false ? "WhatsApp pass locked (Pro SaaS Plan)" : "Send booking confirmation pass to player via WhatsApp"}
                              >
                                <MessageSquare className={`w-3.5 h-3.5 ${planFeatures.whatsappNotifications === false ? 'text-slate-500' : 'text-[#25D366]'}`} />
                                <span>WhatsApp Pass</span>
                                {planFeatures.whatsappNotifications === false && (
                                  <Lock className="w-3 h-3 text-amber-400 ml-0.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Requirement 1 & 2: Owner can see players played in game in roster/ledger (Lobby Match vs Individual Booking) */}
                      {isExpanded && !isCancelled && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                {isLobby ? (
                                  <>
                                    <Trophy className="w-4 h-4 text-purple-400" />
                                    <span>Community Match Lobby Roster & Player Ledger</span>
                                    {b.lobbyId && (
                                      <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                                        Lobby #{b.lobbyId.slice(-6)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <User className="w-4 h-4 text-sky-400" />
                                    <span>Individual Booking Ledger & Player Roster</span>
                                    <span className="bg-sky-500/20 text-sky-300 text-[10px] px-2 py-0.5 rounded border border-sky-500/30">
                                      {b.bookingType === 'OWNER' ? 'Venue Walk-in' : 'Private Booking'}
                                    </span>
                                  </>
                                )}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {isLobby
                                  ? `Host: ${b.playerName} • Registered community athletes and match dues`
                                  : `Booked by: ${b.playerName} • Total players in slot: ${totalPlayersCount}`}
                              </p>
                            </div>
                            <div className="text-[11px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-3">
                              <span>Slot Value: <strong className="text-white">₹{b.totalAmount}</strong></span>
                              <span>•</span>
                              <span>Collected: <strong className="text-emerald-400">₹{b.amountPaid}</strong></span>
                              <span>•</span>
                              <span>Pending: <strong className="text-amber-400">₹{b.amountDue}</strong></span>
                            </div>
                          </div>

                          {/* CASE 1: LOBBY HOSTED MATCH */}
                          {isLobby && b.lobbyId ? (
                            loadingRosterMap[b.lobbyId] ? (
                              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                                <span>Loading match players from lobby roster...</span>
                              </div>
                            ) : (lobbyPlayersMap[b.lobbyId] && lobbyPlayersMap[b.lobbyId].length > 0) ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                      <th className="py-2 px-3 font-semibold">Player</th>
                                      <th className="py-2 px-3 font-semibold">Role</th>
                                      <th className="py-2 px-3 font-semibold">Sport & Skill</th>
                                      <th className="py-2 px-3 font-semibold">Payment Mode</th>
                                      <th className="py-2 px-3 font-semibold">Amount Paid</th>
                                      <th className="py-2 px-3 font-semibold">Pending Due</th>
                                      <th className="py-2 px-3 font-semibold">Status</th>
                                      <th className="py-2 px-3 font-semibold text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {lobbyPlayersMap[b.lobbyId].map((lp, lpIdx) => {
                                      const pDue = lp.amountDue ?? (lp.paymentStatus === 'PAID' ? 0 : (lp.paymentMethod === 'PAY_LATER_AT_TURF' ? hostShare : 0));
                                      const pPaid = lp.amountPaid ?? (lp.paymentStatus === 'PAID' ? hostShare : 0);
                                      const isSettled = lp.paymentStatus === 'PAID' || pDue === 0;

                                      return (
                                        <tr key={`lp-${b.id}-${lp.id || lp.uid || lpIdx}`} className="hover:bg-slate-900/40">
                                          <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                              {lp.playerPhotoURL ? (
                                                <img
                                                  src={lp.playerPhotoURL}
                                                  alt={lp.playerName}
                                                  referrerPolicy="no-referrer"
                                                  className="w-6 h-6 rounded-full object-cover border border-slate-700"
                                                />
                                              ) : (
                                                <div className="w-6 h-6 rounded-full bg-purple-950 text-purple-300 font-bold flex items-center justify-center text-[10px] border border-purple-700/50">
                                                  {lp.playerName ? lp.playerName[0].toUpperCase() : 'P'}
                                                </div>
                                              )}
                                              <div>
                                                <div className="font-bold text-white flex items-center gap-1.5">
                                                  <span>{lp.playerName}</span>
                                                  {lp.isHost && (
                                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-semibold">
                                                      Host
                                                    </span>
                                                  )}
                                                </div>
                                                {lp.playerPhone && (
                                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                    <Phone className="w-2.5 h-2.5 text-slate-500" />
                                                    <span>{lp.playerPhone}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {lp.isHost ? (
                                              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                                                Match Host
                                              </span>
                                            ) : (
                                              <span className="bg-purple-500/10 text-purple-300 text-[10px] font-medium px-2 py-0.5 rounded border border-purple-500/30">
                                                Community Player
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <div className="text-slate-300 font-medium">{lp.preferredSport || b.sport}</div>
                                            <div className="text-[10px] text-slate-500">{lp.skillLevel || 'Athlete'}</div>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className="text-slate-300 text-[11px]">
                                              {lp.paymentMethod === 'PAY_LATER_AT_TURF' ? 'Pay at Turf' : 'Online'}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                                            ₹{pPaid}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-bold">
                                            {pDue > 0 ? (
                                              <span className="text-amber-400">₹{pDue}</span>
                                            ) : (
                                              <span className="text-slate-500">₹0</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {isSettled ? (
                                              <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span>
                                            ) : (
                                              <span className="text-amber-400 font-bold text-[11px]">Due</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {pDue > 0 && (
                                              <button
                                                onClick={() => {
                                                  setSettlementBooking(b);
                                                  setSettlementAmount(pDue);
                                                }}
                                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer shadow-sm"
                                              >
                                                Collect ₹{pDue}
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* Fallback for lobby match when sub-players haven't joined yet */
                              <div className="space-y-3">
                                <div className="text-xs text-slate-400 italic bg-purple-950/20 border border-purple-800/30 p-2.5 rounded-lg">
                                  Community match hosted by {b.playerName}. Waiting for community players to join or check-in at turf.
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="py-2 px-3 font-semibold">Player</th>
                                        <th className="py-2 px-3 font-semibold">Role</th>
                                        <th className="py-2 px-3 font-semibold">Amount Paid</th>
                                        <th className="py-2 px-3 font-semibold">Pending Due</th>
                                        <th className="py-2 px-3 font-semibold">Status</th>
                                        <th className="py-2 px-3 font-semibold text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      <tr className="hover:bg-slate-900/40">
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-white">{b.playerName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{b.playerPhone || b.playerEmail}</div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                                            Lobby Host
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">₹{b.amountPaid}</td>
                                        <td className="py-2.5 px-3 font-mono font-bold">
                                          {b.amountDue > 0 ? <span className="text-amber-400">₹{b.amountDue}</span> : <span className="text-slate-500">₹0</span>}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {b.amountDue === 0 ? <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span> : <span className="text-amber-400 font-bold text-[11px]">Due</span>}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          {b.amountDue > 0 && (
                                            <button
                                              onClick={() => {
                                                setSettlementBooking(b);
                                                setSettlementAmount(b.amountDue);
                                              }}
                                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                                            >
                                              Collect ₹{b.amountDue}
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          ) : (
                            /* CASE 2: INDIVIDUAL BOOKING ROSTER / LEDGER */
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 px-3 font-semibold">Player</th>
                                    <th className="py-2 px-3 font-semibold">Role</th>
                                    <th className="py-2 px-3 font-semibold">Split Share</th>
                                    <th className="py-2 px-3 font-semibold">Amount Paid</th>
                                    <th className="py-2 px-3 font-semibold">Pending Due</th>
                                    <th className="py-2 px-3 font-semibold">Status</th>
                                    <th className="py-2 px-3 font-semibold text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {/* Primary Athlete / Booker Row */}
                                  <tr className="hover:bg-slate-900/40">
                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-white">{b.playerName}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{b.playerPhone || b.playerEmail}</div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-500/30">
                                        Primary Booker
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                                      ₹{hostShare}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                                      ₹{hostPaid}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold">
                                      {hostDue > 0 ? (
                                        <span className="text-amber-400">₹{hostDue}</span>
                                      ) : (
                                        <span className="text-slate-500">₹0</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {hostDue === 0 ? (
                                        <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span>
                                      ) : (
                                        <span className="text-amber-400 font-bold text-[11px]">Due</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {hostDue > 0 && (
                                        <button
                                          onClick={() => {
                                            setSettlementBooking(b);
                                            setSettlementAmount(hostDue);
                                          }}
                                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                                        >
                                          Collect ₹{hostDue}
                                        </button>
                                      )}
                                    </td>
                                  </tr>

                                  {/* Split Roster Rows if present */}
                                  {b.splitWith && b.splitWith.length > 0 ? (
                                    b.splitWith.map((p, idx) => {
                                      const pShare = p.shareAmount || hostShare;
                                      const pPaid = p.isPaid ? pShare : 0;
                                      const pDue = p.isPaid ? 0 : pShare;
                                      return (
                                        <tr key={`split-${b.id}-${p.phone || p.email || idx}`} className="hover:bg-slate-900/40">
                                          <td className="py-2.5 px-3">
                                            <div className="font-medium text-slate-200">{p.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{p.phone || p.email || `Player #${idx + 2}`}</div>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className="bg-slate-800 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-700">
                                              Split Player
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                                            ₹{pShare}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                                            ₹{pPaid}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-bold">
                                            {pDue > 0 ? (
                                              <span className="text-amber-400">₹{pDue}</span>
                                            ) : (
                                              <span className="text-slate-500">₹0</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {p.isPaid ? (
                                              <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span>
                                            ) : (
                                              <span className="text-amber-400 font-bold text-[11px]">Due</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {!p.isPaid && (
                                              <button
                                                onClick={() => {
                                                  setSettlementBooking(b);
                                                  setSettlementAmount(pDue);
                                                }}
                                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                                              >
                                                Collect ₹{pDue}
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    // When no explicit split is saved, show general squad quota balance
                                    totalPlayersCount > 1 && (
                                      Array.from({ length: totalPlayersCount - 1 }).map((_, i) => (
                                        <tr key={`squad-${b.id}-${i}`} className="hover:bg-slate-900/40">
                                          <td className="py-2.5 px-3">
                                            <div className="font-medium text-slate-300">Squad Player #{i + 2}</div>
                                            <div className="text-[10px] text-slate-500">In group match roster</div>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className="bg-slate-800 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded">
                                              Squad Mate
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono text-slate-300">₹{hostShare}</td>
                                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                                            ₹{b.amountPaid >= (i + 2) * hostShare ? hostShare : Math.max(0, b.amountPaid - hostShare - i * hostShare)}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono text-amber-400">
                                            ₹{Math.max(0, hostShare - (b.amountPaid >= (i + 2) * hostShare ? hostShare : Math.max(0, b.amountPaid - hostShare - i * hostShare)))}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {b.amountPaid >= (i + 2) * hostShare ? (
                                              <span className="text-emerald-400 font-bold text-[11px]">✓ Settled</span>
                                            ) : (
                                              <span className="text-amber-400 font-bold text-[11px]">Due</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {b.amountDue > 0 && (
                                              <button
                                                onClick={() => {
                                                  setSettlementBooking(b);
                                                  setSettlementAmount(Math.min(hostShare, b.amountDue));
                                                }}
                                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                                              >
                                                Collect
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: OWNER SUBSCRIPTION */}
        {currentTab === 'subscription' && <OwnerSubscriptionTab showToast={showToast} />}

        {/* TAB: OWNER BRAND PROFILE & COMMUNITY FEED */}
        {currentTab === 'brand-profile' && (
          <OwnerBrandProfileTab
            turfs={turfs}
            showToast={showToast}
            onNavigateToSubscription={() => setCurrentTab('subscription')}
          />
        )}

        {/* TAB: OWNER ANALYTICS DASHBOARD */}
        {currentTab === 'analytics' && (
          planFeatures.analytics !== false ? (
            <OwnerAnalyticsDashboard
              showToast={showToast}
              planFeatures={planFeatures}
              onNavigateToSubscription={() => setCurrentTab('subscription')}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Revenue Analytics Module Locked</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Occupancy charts, revenue reports, and peak hour heatmaps are disabled in your current subscription plan. Upgrade your plan to unlock full venue analytics.
              </p>
              <button
                onClick={() => setCurrentTab('subscription')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Subscription Plans & Upgrade</span>
              </button>
            </div>
          )
        )}

        {/* TAB: PROMOTIONS & OFFERS */}
        {currentTab === 'offers' && (
          planFeatures.offers !== false ? (
            <OwnerOffersTab turfs={turfs} showToast={showToast} planFeatures={planFeatures} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Offers & Promo Codes Locked</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Custom coupon creation and promo code management are disabled in your current subscription plan. Upgrade your plan to create promotional campaigns.
              </p>
              <button
                onClick={() => setCurrentTab('subscription')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Subscription Plans & Upgrade</span>
              </button>
            </div>
          )
        )}

        {/* TAB: REVIEWS & RATINGS */}
        {currentTab === 'reviews' && (
          planFeatures.reviewsManager !== false ? (
            <OwnerReviewsTab turfs={turfs} showToast={showToast} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Reviews & Ratings Management Locked</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Customer ratings and review moderation are disabled in your current subscription plan. Upgrade your plan to manage player feedback.
              </p>
              <button
                onClick={() => setCurrentTab('subscription')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Subscription Plans & Upgrade</span>
              </button>
            </div>
          )
        )}

        {/* TAB: OWNER PAYMENT ID & PAYOUTS */}
        {(currentTab === 'payments' || currentTab === 'payouts') && (
          <OwnerPaymentSettingsTab
            turfs={turfs}
            showToast={showToast}
            onTurfsUpdated={loadData}
          />
        )}

        {/* TAB: PLAYERS DUES & COUNTER SETTLEMENTS */}
        {currentTab === 'dues' && (
          planFeatures.duesTracker !== false ? (
            <OwnerPlayerDues
              showToast={showToast}
              onSettleBooking={(b) => {
                setSettlementBooking(b);
                setSettlementAmount(b.amountDue);
              }}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Player Dues Tracker Locked</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Offline cash dues tracking and player balance ledgers are disabled in your current subscription plan. Upgrade your plan to track unpaid balances.
              </p>
              <button
                onClick={() => setCurrentTab('subscription')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Subscription Plans & Upgrade</span>
              </button>
            </div>
          )
        )}

        {/* TAB: PROFILE & BUSINESS SETTINGS */}
        {currentTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Sub-tab Navigation Header */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                id="owner-profile-subtab-account"
                onClick={() => setOwnerProfileTab('profile')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ownerProfileTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account & Business Settings</span>
              </button>

              <button
                type="button"
                id="owner-profile-subtab-brand"
                onClick={() => setOwnerProfileTab('brand')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ownerProfileTab === 'brand'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Official Brand Page</span>
                {brandProfile?.isVerified && (
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">
                    VERIFIED
                  </span>
                )}
                {brandProfile && (
                  <span className="text-slate-400 text-[10px] ml-1">
                    {brandProfile.handle || `@${brandProfile.brandName.toLowerCase().replace(/\s+/g, '')}`}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-view 1: Account Settings with integrated Brand Overview Card */}
            {ownerProfileTab === 'profile' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Official Brand Page Snapshot Card */}
                {brandProfile ? (
                  <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-950 border border-amber-500/30 shadow-md flex-shrink-0 flex items-center justify-center">
                          {brandProfile.logoUrl ? (
                            <img
                              src={brandProfile.logoUrl}
                              alt={brandProfile.brandName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Building2 className="w-7 h-7 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base font-extrabold text-white">{brandProfile.brandName}</h3>
                            {brandProfile.isVerified && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <ShieldCheck className="w-3 h-3 text-amber-400" />
                                <span>Verified Partner</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-400/90 font-mono font-bold mt-0.5">
                            {brandProfile.handle || `@${brandProfile.brandName.toLowerCase().replace(/\s+/g, '')}`}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                            <span className="flex items-center gap-1 text-white font-semibold">
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                              {brandProfile.followersCount || 0} Followers
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                              {brandProfile.city || profile?.city || 'Local Arena'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          type="button"
                          id="btn-owner-preview-brand-profile"
                          onClick={() => setIsPreviewBrandOpen(true)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Public Page</span>
                        </button>
                        <button
                          type="button"
                          id="btn-owner-manage-brand-profile"
                          onClick={() => setOwnerProfileTab('brand')}
                          className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-950/40 flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-950" />
                          <span>Edit Brand Page</span>
                        </button>
                      </div>
                    </div>

                    {brandProfile.tagline && (
                      <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800/80 italic">
                        "{brandProfile.tagline}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-5 shadow-lg flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Create Official Arena Brand Page</h3>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                          Give your facility an official public identity on the TurFit community feed. Showcase photos, gain followers, and run verified flash promotions.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-owner-setup-brand-page"
                      onClick={() => setOwnerProfileTab('brand')}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-950/40 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                      <span>Set Up Brand Page</span>
                    </button>
                  </div>
                )}

                {/* Account & Profile Social Card */}
                {profile && (
                  <SocialProfileView
                    profile={profile}
                    isSelf={true}
                    showToast={showToast}
                  />
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">Account Role</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-1 rounded-md">
                        {isAdmin || profile?.role === 'ADMIN' ? 'Super Administrator' : 'Turf Owner / Ground Manager'}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRole('PLAYER');
                        showToast('Admin: Switched view to Player Portal');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Switch to Player View →</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sub-view 2: Full Brand Page Editor inside Owner Profile */}
            {ownerProfileTab === 'brand' && (
              <OwnerBrandProfileTab
                turfs={turfs}
                showToast={showToast}
                onNavigateToSubscription={() => setCurrentTab('subscription')}
              />
            )}
          </div>
        )}
      </main>

      {/* ================= MODAL: ADD TURF ================= */}
      {showAddTurfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">
              {turfFacilityCategory === 'INDOOR_GAME'
                ? 'Add Dedicated Gaming Zone Arena'
                : 'Add Outdoor Sports Turf'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Create a venue listing for outdoor pitch sports or indoor gaming lounge tables
            </p>

            <form onSubmit={handleCreateTurf} className="space-y-4">
              {/* Category Selector: Outdoor Turf vs Dedicated Gaming Zone */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  What type of venue are you registering? *
                </label>
                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTurfFacilityCategory('OUTDOOR_TURF');
                      setTurfSports(['Football', 'Box Cricket']);
                      setTurfBasePrice(1200);
                      if (!turfName || turfName.includes('Gaming')) setTurfName('Apex Sports Turf & Arena');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                      turfFacilityCategory === 'OUTDOOR_TURF'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>🌿</span> Outdoor Sports Turf
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Football, Box Cricket, Tennis, Badminton</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTurfFacilityCategory('INDOOR_GAME');
                      setTurfSports(['Pool', 'Snooker', 'Table Tennis', 'Carrom', 'PS5', 'Foosball']);
                      setTurfFacilities(['Air Conditioning', 'AC Player Lounge', 'Refreshment Cafe', 'Sanitized Equipment']);
                      setTurfBasePrice(250);
                      if (!turfName || turfName.includes('Sports')) setTurfName('CyberPulse Gaming & Snooker Zone');
                      if (!turfDesc) setTurfDesc('Climate-controlled indoor gaming zone with tournament tables, AC lounge, and snacks.');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                      turfFacilityCategory === 'INDOOR_GAME'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>🎮</span> Dedicated Gaming Zone Arena
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Pool, Snooker, Table Tennis, PS5, Carrom, VR</span>
                  </button>
                </div>
              </div>

              {turfFacilityCategory === 'INDOOR_GAME' && (
                <div>
                  <label className="block text-xs font-medium text-amber-300 mb-1">
                    Primary Game / Table Station *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'Pool', label: '🎱 Snooker & Pool' },
                      { id: 'Table Tennis', label: '🏓 Table Tennis' },
                      { id: 'Carrom', label: '🎯 Carrom Board' },
                      { id: 'Foosball', label: '⚽ Foosball' },
                      { id: 'Console PS5', label: '🎮 PS5 Lounge' },
                      { id: 'VR Gaming', label: '🥽 VR Virtual Reality' },
                    ].map((g) => (
                      <button
                        key={`turf_indoor_opt_${g.id}`}
                        type="button"
                        onClick={() => setTurfIndoorGameType(g.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                          turfIndoorGameType === g.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {turfIndoorGameType === g.id ? '✓ ' : ''}{g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {turfFacilityCategory === 'INDOOR_GAME' ? 'Gaming Zone / Arena Name *' : 'Turf Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={turfName}
                  onChange={(e) => setTurfName(e.target.value)}
                  placeholder={
                    turfFacilityCategory === 'INDOOR_GAME'
                      ? 'e.g. BreakPoint Gaming & Snooker Arena'
                      : 'e.g. TurFit Kickoff Arena'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={turfDesc}
                  onChange={(e) => setTurfDesc(e.target.value)}
                  placeholder="Premium FIFA-certified turf with night floodlights and refreshments..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={turfAddress}
                    onChange={(e) => setTurfAddress(e.target.value)}
                    placeholder="e.g. Linking Road, Bandra West"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={turfArea}
                    onChange={(e) => setTurfArea(e.target.value)}
                    placeholder="e.g. Bandra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  📍 Google Maps Location Link * <span className="text-rose-400 font-bold">(Compulsory)</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={turfLocationUrl}
                    onChange={(e) => setTurfLocationUrl(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {turfLocationUrl && (
                    <a
                      href={turfLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-2.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                    >
                      Test <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Open Google Maps on your phone or browser, find your venue, tap "Share" and copy the link. When players tap "View on Map" or "Get Directions", they are guided directly here.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    City * <span className="text-rose-400 font-bold">(Compulsory)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={turfCity}
                    onChange={(e) => setTurfCity(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={turfPhone}
                    onChange={(e) => setTurfPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Opens</label>
                  <input
                    type="time"
                    value={turfOpenTime}
                    onChange={(e) => setTurfOpenTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Closes</label>
                  <input
                    type="time"
                    value={turfCloseTime}
                    onChange={(e) => setTurfCloseTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Base Price per Hour (₹)
                </label>
                <input
                  type="number"
                  value={turfBasePrice}
                  onChange={(e) => setTurfBasePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Location Coordinates Selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Location Coordinates
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">GPS (WGS 84)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={turfLat}
                      onChange={(e) => setTurfLat(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. 12.9716"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={turfLng}
                      onChange={(e) => setTurfLng(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. 77.5946"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Enter the decimal coordinates of your turf location to allow regional distance estimation.
                </p>
              </div>

              {/* Pay at Venue Payment Acceptance Toggle */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Allow Pay at Venue (Counter Cash)</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When enabled, athletes can choose to pay at the venue. When disabled, 100% online advance payment is enforced.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTurfAllowPayAtVenue(!turfAllowPayAtVenue)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      turfAllowPayAtVenue
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {turfAllowPayAtVenue ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-white" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turf Photos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, true)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {turfPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {turfPhotos.map((p, idx) => (
                      <div key={idx} className="relative">
                        <img src={p} alt="Preview" className="w-16 h-14 object-cover rounded-lg border border-slate-700" />
                        <button
                          type="button"
                          onClick={() => setTurfPhotos(turfPhotos.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTurfModal(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Creating Turf...' : 'Save Turf Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT TURF ================= */}
      {showEditTurfModal && editingTurf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-400" />
                  <span>Edit Venue Details</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update "{editingTurf.name}" venue configuration, photos, and location
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditTurfModal(false);
                  setEditingTurf(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTurf} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turf Name *</label>
                <input
                  type="text"
                  required
                  value={turfName}
                  onChange={(e) => setTurfName(e.target.value)}
                  placeholder="e.g. TurFit Kickoff Arena"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={turfDesc}
                  onChange={(e) => setTurfDesc(e.target.value)}
                  placeholder="Premium FIFA-certified turf with night floodlights and refreshments..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={turfAddress}
                    onChange={(e) => setTurfAddress(e.target.value)}
                    placeholder="e.g. Linking Road, Bandra West"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={turfArea}
                    onChange={(e) => setTurfArea(e.target.value)}
                    placeholder="e.g. Bandra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  📍 Google Maps Location Link * <span className="text-rose-400 font-bold">(Compulsory)</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={turfLocationUrl}
                    onChange={(e) => setTurfLocationUrl(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  {turfLocationUrl && (
                    <a
                      href={turfLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-2.5 text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                    >
                      Test <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Players clicking "View on Map" or "Directions" on TurFit will open this exact Google Maps link directly.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    City * <span className="text-rose-400 font-bold">(Compulsory)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={turfCity}
                    onChange={(e) => setTurfCity(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={turfPhone}
                    onChange={(e) => setTurfPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Opens</label>
                  <input
                    type="time"
                    value={turfOpenTime}
                    onChange={(e) => setTurfOpenTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Closes</label>
                  <input
                    type="time"
                    value={turfCloseTime}
                    onChange={(e) => setTurfCloseTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Base Price per Hour (₹)
                </label>
                <input
                  type="number"
                  value={turfBasePrice}
                  onChange={(e) => setTurfBasePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Pay at Venue Payment Acceptance Toggle */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Allow Pay at Venue (Counter Cash)</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When enabled, athletes can choose to pay at the venue. When disabled, 100% online advance payment is enforced.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTurfAllowPayAtVenue(!turfAllowPayAtVenue)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      turfAllowPayAtVenue
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {turfAllowPayAtVenue ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-white" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Photo Management */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manage Turf Photos (Add / Delete)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, true)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                />
                {turfPhotos.length > 0 ? (
                  <div className="flex gap-2.5 mt-3 overflow-x-auto p-1">
                    {turfPhotos.map((p, idx) => (
                      <div key={idx} className="relative group flex-shrink-0">
                        <img
                          src={p}
                          alt={`Venue photo ${idx + 1}`}
                          className="w-20 h-16 object-cover rounded-lg border border-slate-700 group-hover:border-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setTurfPhotos(turfPhotos.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
                          title="Delete photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic mt-1">No photos added yet. Upload venue images to attract players.</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTurfModal(false);
                    setEditingTurf(null);
                  }}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-amber-950/50 cursor-pointer flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Saving Changes...' : 'Save Venue Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddArenaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1">
              {arenaFacilityType === 'INDOOR_GAME'
                ? 'Add Arena: Gaming Zone (Indoor)'
                : 'Add Arena: Turf (Outdoor)'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">Adding facility under {selectedTurf?.name}</p>

            <form onSubmit={handleCreateArena} className="space-y-4">
              {/* Prompt: Ask Owner whether it is Turf (Outdoor) or Gaming Zone (Indoor) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  What type of arena are you adding?
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Choose between an outdoor turf pitch or an indoor gaming zone station.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setArenaFacilityType('OUTDOOR_TURF');
                      setArenaName('Pitch B');
                      setArenaCapacity(14);
                      setArenaPrice(selectedTurf?.basePrice || 1500);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                      arenaFacilityType === 'OUTDOOR_TURF'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>🌿</span> Turf (Outdoor)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Football, Cricket, Tennis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArenaFacilityType('INDOOR_GAME');
                      setArenaName('Table #1 - 8-Ball Pool');
                      setArenaIndoorGame('Pool');
                      setArenaCapacity(4);
                      setArenaPrice(220);
                      setArenaEquipment(['2 Ash Wood Cues', 'Pioneer Chalk', 'Triangle Rack', 'Pro Ball Set']);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                      arenaFacilityType === 'INDOOR_GAME'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>🎮</span> Gaming Zone (Indoor)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Pool, TT, Carrom, PS5</span>
                  </button>
                </div>
              </div>

              {/* Conditional Configuration based on Turf (Outdoor) vs Gaming Zone (Indoor) */}
              {arenaFacilityType === 'INDOOR_GAME' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Indoor Game / Station Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Pool', label: '🎱 Snooker & Pool', defaultTitle: 'Table #1 - 8-Ball Pool', defaultPrice: 220, defaultEquip: ['2 Ash Wood Cues', 'Pioneer Chalk', 'Triangle Rack'] },
                        { id: 'Table Tennis', label: '🏓 Table Tennis', defaultTitle: 'Table #1 - ITTF Pro TT', defaultPrice: 180, defaultEquip: ['4 Stiga Allround Bats', '6 3-Star Balls'] },
                        { id: 'Carrom', label: '🎯 Carrom & Boards', defaultTitle: 'Board A - Champion Hardwood', defaultPrice: 120, defaultEquip: ['Wooden Coins Set', 'Tournament Striker', 'Boroc Powder'] },
                        { id: 'Foosball', label: '⚽ Foosball & Arcade', defaultTitle: 'Table 1 - 4-Player Foosball', defaultPrice: 150, defaultEquip: ['3 Match Cork Balls', 'Score Tracker'] },
                        { id: 'Console PS5', label: '🎮 Console PS5 Lounge', defaultTitle: 'Pod #1 - PS5 4K Recliner', defaultPrice: 300, defaultEquip: ['EA Sports FC 25', '4 DualSense Wireless Controllers'] },
                      ].map((game) => {
                        const isSelected = arenaIndoorGame === game.id;
                        return (
                          <button
                            key={game.id}
                            type="button"
                            onClick={() => {
                              setArenaIndoorGame(game.id);
                              setArenaName(game.defaultTitle);
                              setArenaPrice(game.defaultPrice);
                              setArenaEquipment(game.defaultEquip);
                            }}
                            className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{game.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Station / Table Name or Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={arenaName}
                      onChange={(e) => setArenaName(e.target.value)}
                      placeholder="e.g. Table #1 - 8-Ball Tournament Pool"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Max Players (Capacity)</label>
                      <input
                        type="number"
                        value={arenaCapacity}
                        onChange={(e) => setArenaCapacity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Hourly Price (₹)</label>
                      <input
                        type="number"
                        value={arenaPrice}
                        onChange={(e) => setArenaPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex gap-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={arenaHasAC}
                        onChange={(e) => setArenaHasAC(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span>❄️ Air Conditioned</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={arenaHasLounge}
                        onChange={(e) => setArenaHasLounge(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span>🛋️ Sofa Lounge Access</span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Arena Name *</label>
                    <input
                      type="text"
                      required
                      value={arenaName}
                      onChange={(e) => setArenaName(e.target.value)}
                      placeholder="e.g. Arena 2 - Box Cricket Court"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Supported Sports (Multi-Select)
                    </label>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Select all sports playable on this physical ground (e.g., Football + Cricket share one schedule).
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Football', label: '⚽ Football / Turf Soccer' },
                        { id: 'Cricket', label: '🏏 Box Cricket' },
                        { id: 'Badminton', label: '🏸 Badminton' },
                        { id: 'Tennis', label: '🎾 Tennis' },
                        { id: 'Pickleball', label: '🏓 Pickleball' },
                        { id: 'Basketball', label: '🏀 Basketball' },
                      ].map((s) => {
                        const isSelected = arenaSports.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (arenaSports.includes(s.id)) {
                                if (arenaSports.length === 1) return;
                                setArenaSports(arenaSports.filter((item) => item !== s.id));
                              } else {
                                setArenaSports([...arenaSports, s.id]);
                              }
                            }}
                            className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{s.label}
                          </button>
                        );
                      })}
                    </div>
                    {arenaSports.length > 1 && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-300 leading-relaxed">
                        ⚡ <strong>Shared Ground:</strong> Players can book either {arenaSports.join(' or ')}. Booking one sport automatically locks the schedule so no other game can be booked at that time.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Player Capacity</label>
                      <input
                        type="number"
                        value={arenaCapacity}
                        onChange={(e) => setArenaCapacity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Pitch Price (₹)</label>
                      <input
                        type="number"
                        value={arenaPrice}
                        onChange={(e) => setArenaPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddArenaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Adding...' : 'Create Arena'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SINGLE SLOT ================= */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create Slot</h2>
            <p className="text-xs text-slate-400 mb-6">
              Create a slot for {selectedArena?.name} on {formatDateString(slotDate)}
            </p>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Status</label>
                  <select
                    value={slotStatus}
                    onChange={(e) => setSlotStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="BOOKED_BY_OWNER">BOOKED BY OWNER</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-visible"
                  checked={slotVisible}
                  onChange={(e) => setSlotVisible(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chk-visible" className="text-xs text-slate-300 cursor-pointer">
                  Make visible to players for booking
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK GENERATE SLOTS ================= */}
      {showBulkSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Bulk Slot Generator</h2>
            <p className="text-xs text-slate-400 mb-6">
              Generate sequential 1-hour slots automatically for {selectedArena?.name}
            </p>

            <form onSubmit={handleCreateBulkSlots} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Hour (24h)</label>
                  <select
                    value={bulkStartHour}
                    onChange={(e) => setBulkStartHour(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 ({formatTime24to12(`${h}:00`)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Hour (24h)</label>
                  <select
                    value={bulkEndHour}
                    onChange={(e) => setBulkEndHour(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 ({formatTime24to12(`${h}:00`)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Price per Slot (₹)</label>
                <input
                  type="number"
                  value={bulkSlotPrice}
                  onChange={(e) => setBulkSlotPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Preview calculation */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
                <span className="font-bold text-indigo-400 block mb-1">Preview Generation:</span>
                <span>
                  Will generate{' '}
                  <strong className="text-white">
                    {Math.max(0, Math.floor((bulkEndHour - bulkStartHour) / bulkDurationHours))} slots
                  </strong>{' '}
                  from {formatTime24to12(`${bulkStartHour}:00`)} to {formatTime24to12(`${bulkEndHour}:00`)}.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkSlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Generating...' : 'Confirm & Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SETTLE DUE PAYMENT ================= */}
      {settlementBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Collect Due Settlement</h2>
            <p className="text-xs text-slate-400 mb-4">
              Recording payment for {settlementBooking.playerName} ({settlementBooking.bookingId})
            </p>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-xs mb-4 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Booking Amount:</span>
                <span className="text-white font-bold">{formatCurrency(settlementBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Already Paid:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(settlementBooking.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-rose-400">Outstanding Due:</span>
                <span className="text-rose-400">{formatCurrency(settlementBooking.amountDue)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount Receiving (₹)</label>
              <input
                type="number"
                max={settlementBooking.amountDue}
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSettlementBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPaymentSettlement}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                {actionLoading ? 'Recording...' : 'Record Payment Cleared'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= MODAL: RECURRING SLOTS GENERATOR ================= */}
      {showRecurringSlotsModal && (
        <RecurringSlotsModal
          isOpen={showRecurringSlotsModal}
          onClose={() => setShowRecurringSlotsModal(false)}
          turf={selectedTurf || (turfs.length > 0 ? turfs[0] : undefined)}
          turfs={turfs}
          arenas={arenas}
          onGenerated={async () => {
            showToast('Recurring slots generated successfully!');
            await loadData();
          }}
          onSlotsGenerated={async () => {
            showToast('Recurring slots generated successfully!');
            await loadData();
          }}
          showToast={showToast}
        />
      )}
      {/* ================= MODAL: 7-DAY SLOT GENERATOR ================= */}
      {showSevenDayModal && (selectedTurf || turfs.length > 0) && (
        <SevenDaySlotsModal
          isOpen={showSevenDayModal}
          onClose={() => setShowSevenDayModal(false)}
          turf={selectedTurf || turfs[0]}
          arenas={arenas}
          onSlotsGenerated={async () => {
            await loadData();
            showToast('7-day slots generated successfully!');
          }}
          showToast={showToast}
        />
      )}
      {/* ================= MODAL: EDIT ARENA / PITCH ================= */}
      {showEditArenaModal && editingArena && (
        <EditArenaModal
          arena={editingArena}
          isOpen={showEditArenaModal}
          onClose={() => {
            setShowEditArenaModal(false);
            setEditingArena(null);
          }}
          onSuccess={async () => {
            await loadData();
          }}
          showToast={showToast}
        />
      )}
      {/* ================= MODAL: OWNER BRAND PROFILE PREVIEW ================= */}
      {isPreviewBrandOpen && brandProfile && (
        <OwnerBrandProfileModal
          brandProfile={brandProfile}
          turfs={turfs}
          onClose={() => setIsPreviewBrandOpen(false)}
          onNavigateToBooking={(turfId) => {
            setIsPreviewBrandOpen(false);
            const targetTurf = turfs.find((t) => t.id === turfId);
            if (targetTurf) {
              handleSelectTurf(targetTurf);
            }
            setCurrentTab('slots');
          }}
          showToast={showToast}
        />
      )}

      {/* ================= MODAL: SOCIAL PROFILE ================= */}
      <SocialProfileModal
        isOpen={!!viewUserProfileId}
        onClose={() => setViewUserProfileId(null)}
        userId={viewUserProfileId}
        showToast={showToast}
      />

      {/* ================= MODAL: DIRECT MESSAGES INBOX ================= */}
      <DirectMessagesInboxModal
        isOpen={showDirectMessagesInboxModal}
        onClose={() => setShowDirectMessagesInboxModal(false)}
        showToast={showToast}
      />
    </div>
  );
};
