import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLobbies,
  toggleLobbyJoin,
  leaveLobby,
  deleteLobby,
  getLobbyParticipants,
  getUserProfileByUid,
  createLobbyWithSlotTransaction,
  getPlayerPools,
  createPlayerPool,
  joinPlayerPool,
  leavePlayerPool,
  deletePlayerPool,
  convertPoolToLobby,
  processLobbyStepOutRefund,
  getLobbyGameStatus,
  isLobbyConcluded,
} from '../../services/communityService';
import { getTurfs, getArenasByTurf, getSlotsByArenaAndDate, getAdminPaymentConfig } from '../../services/dbService';
import {
  Lobby,
  Turf,
  Arena,
  Slot,
  LobbyPlayer,
  UserProfile,
  PlayerPool,
  MatchHoursCategory,
} from '../../types';
import { LobbyCard } from '../../components/LobbyCard';
import { PoolCard } from '../../components/PoolCard';
import { PlayerPublicProfileModal } from '../../components/PlayerPublicProfileModal';
import { RatePlayerModal } from '../../components/RatePlayerModal';
import { DirectUpiModal } from '../../components/DirectUpiModal';
import { PhoneVerificationModal } from '../../components/PhoneVerificationModal';
import { LobbyChatModal } from '../../components/LobbyChatModal';
import {
  Users,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Building,
  Search,
  Trash2,
  Crown,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  QrCode,
  Smartphone,
  Layers,
  Lock,
  IndianRupee,
  CheckCircle2,
  MessageSquare,
  Flame,
  ChevronRight,
  Star,
  Award,
} from 'lucide-react-native';

export const LobbiesScreen: React.FC = () => {
  const { user, profile } = useAuth();

  // Top Mode Switcher: 'LOBBIES' | 'POOLS'
  const [activeTab, setActiveTab] = useState<'LOBBIES' | 'POOLS'>('LOBBIES');

  // Data States
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [pools, setPools] = useState<PlayerPool[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filters for Lobbies
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'MY_LOBBIES' | 'PAST'>('ALL');

  // Filters for Pools (Interest Groups)
  const [poolSportFilter, setPoolSportFilter] = useState('All');
  const [poolHoursFilter, setPoolHoursFilter] = useState<MatchHoursCategory>('ALL');

  // Selected Lobby Detailed Modal
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingJoinLobby, setPendingJoinLobby] = useState<Lobby | null>(null);
  const [pendingHostType, setPendingHostType] = useState<'LOBBY' | 'POOL' | null>(null);
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyPlayer[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Player Profile Modal
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Post-Match Player Rating State
  const [ratingTargetPlayer, setRatingTargetPlayer] = useState<{
    uid: string;
    displayName: string;
    photoURL?: string | null;
    sport?: string;
  } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleOpenRatePlayer = (target: { uid: string; displayName: string; photoURL?: string | null; sport?: string }) => {
    setRatingTargetPlayer(target);
    setShowRatingModal(true);
  };

  // Ephemeral Squad Chat State
  const [chatLobby, setChatLobby] = useState<Lobby | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  const handleOpenLobbyChat = (lobby: Lobby) => {
    setChatLobby(lobby);
    setShowChatModal(true);
  };

  // Join & Payment Modal (Lobby)
  const [joiningLobby, setJoiningLobby] = useState<Lobby | null>(null);
  const [joinPaymentMethod, setJoinPaymentMethod] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [showLobbyUpiModal, setShowLobbyUpiModal] = useState(false);
  const [joining, setJoining] = useState(false);

  // Step-Out & Instant Refund Modal
  const [steppingOutLobby, setSteppingOutLobby] = useState<Lobby | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  // Join Pool Modal
  const [joiningPool, setJoiningPool] = useState<PlayerPool | null>(null);
  const [poolPaymentPref, setPoolPaymentPref] = useState<'UPI' | 'PAY_LATER'>('UPI');
  const [joiningPoolLoading, setJoiningPoolLoading] = useState(false);

  // Create Lobby Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [dates, setDates] = useState<{ label: string; day: string; date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [minPlayers, setMinPlayers] = useState('4');
  const [pricePerPlayer, setPricePerPlayer] = useState('150');
  const [initialSquadCount, setInitialSquadCount] = useState('5');
  const [hostAnnouncement, setHostAnnouncement] = useState('We are 5 friends and we booked the slot! Looking for more players to join us.');
  const [createPaymentMethod, setCreatePaymentMethod] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [createUpiId, setCreateUpiId] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Advance payment & UPI Webhook State for Create Lobby
  const [showCreateLobbyUpiModal, setShowCreateLobbyUpiModal] = useState(false);
  const [advanceChoice, setAdvanceChoice] = useState<'SQUAD_SHARE' | 'VENUE_MIN' | 'FULL_SLOT' | 'CUSTOM'>('SQUAD_SHARE');
  const [customAdvanceAmount, setCustomAdvanceAmount] = useState<string>('300');

  // Location / City Filtering for Lobbies (Requirement 4: Show only players/lobbies in their area/city)
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('MY_AREA');

  // Create Pool Form State
  const [showCreatePoolModal, setShowCreatePoolModal] = useState(false);
  const [poolSport, setPoolSport] = useState('Football');
  const [poolCity, setPoolCity] = useState('Mumbai');
  const [poolArea, setPoolArea] = useState('Bandra');
  const [poolDate, setPoolDate] = useState('');
  const [poolHoursCategory, setPoolHoursCategory] = useState<MatchHoursCategory>('EVENING');
  const [poolRequiredPlayers, setPoolRequiredPlayers] = useState('6');
  const [poolMaxPrice, setPoolMaxPrice] = useState('200');
  const [poolDescription, setPoolDescription] = useState('');
  const [creatingPool, setCreatingPool] = useState(false);
  const [convertingPoolId, setConvertingPoolId] = useState<string | null>(null);

  // Action loading cache
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Generate 7-day schedule
  useEffect(() => {
    const nextDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      nextDays.push({ label, day: dayName, date: dateStr });
    }
    setDates(nextDays);
    setSelectedDate(nextDays[0].date);
    setSelectedDay(nextDays[0].day);
    setPoolDate(nextDays[0].date);
  }, []);

  const loadData = async () => {
    try {
      const [allLobbies, allPools, allTurfs, adminCfg] = await Promise.all([
        getLobbies(),
        getPlayerPools({
          sport: poolSportFilter !== 'All' ? poolSportFilter : undefined,
          matchHoursCategory: poolHoursFilter !== 'ALL' ? poolHoursFilter : undefined,
        }),
        getTurfs(),
        getAdminPaymentConfig(),
      ]);
      setLobbies(allLobbies);
      setPools(allPools);
      setTurfs(allTurfs);
      setAdminPaymentConfig(adminCfg);
      if (allTurfs.length > 0 && !selectedTurf) {
        setSelectedTurf(allTurfs[0]);
      }
    } catch (err) {
      console.warn('Error loading community matchmaking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh lobbies & pools periodically every 30s to keep state fresh across days/time
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [poolSportFilter, poolHoursFilter]);

  // Fetch arenas when selected turf changes in create form
  useEffect(() => {
    if (!selectedTurf) return;
    getArenasByTurf(selectedTurf.id).then((arenaList) => {
      setArenas(arenaList);
      if (arenaList.length > 0) {
        setSelectedArena(arenaList[0]);
      } else {
        setSelectedArena(null);
      }
    });
  }, [selectedTurf]);

  // Fetch available slots when arena or date changes
  useEffect(() => {
    if (!selectedArena || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    getSlotsByArenaAndDate(selectedArena.id, selectedDate)
      .then((slotList) => {
        const freeSlots = slotList.filter((s) => s.status === 'AVAILABLE');
        setAvailableSlots(freeSlots);
        if (freeSlots.length > 0) {
          setSelectedSlot(freeSlots[0]);
          const numMax = parseInt(maxPlayers, 10) || 10;
          const perPlayer = Math.round(freeSlots[0].price / numMax);
          setPricePerPlayer(String(perPlayer));
          setLobbyName(`${selectedArena.sport || 'Sports'} Match at ${selectedTurf?.name}`);
        }
      })
      .catch((err) => console.warn('Error fetching slots:', err))
      .finally(() => setLoadingSlots(false));
  }, [selectedArena, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Open Lobby Detail View & Fetch Roster
  const handleOpenLobbyDetails = async (lobby: Lobby) => {
    setSelectedLobby(lobby);
    setLoadingParticipants(true);
    try {
      const participants = await getLobbyParticipants(lobby.id);
      setLobbyParticipants(participants);
    } catch (err) {
      console.warn('Error fetching participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Open Player Profile Modal
  const handleOpenPlayerProfile = async (uid: string) => {
    setLoadingProfile(true);
    try {
      const athleteProfile = await getUserProfileByUid(uid);
      if (athleteProfile) {
        setViewingProfile(athleteProfile);
        setShowProfileModal(true);
      } else {
        Alert.alert('Profile', 'Athlete profile details unavailable.');
      }
    } catch (err) {
      console.warn('Error loading player profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Initiate Join Lobby -> Opens Payment & UPI Modal
  const handleInitiateJoin = (lobby: Lobby) => {
    if (!user || !profile) {
      Alert.alert('Sign In Required', 'Please sign in to join matchmaking lobbies.');
      return;
    }

    if (isLobbyConcluded(lobby)) {
      Alert.alert('Match Concluded', 'This match has already concluded and is archived in Past Bookings.');
      return;
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      Alert.alert('Lobby Full', 'This lobby has reached its maximum player capacity.');
      return;
    }

    if (!profile.isPhoneVerified) {
      setPendingJoinLobby(lobby);
      setShowPhoneModal(true);
      return;
    }

    setJoiningLobby(lobby);
    setJoinPaymentMethod('PAY_NOW');
    setUpiIdInput(user.email ? `${user.email.split('@')[0]}@okaxis` : 'athlete@upi');
  };

  // Confirm Join with UPI / Pay Later
  const handleConfirmJoinLobby = async () => {
    if (!user || !profile || !joiningLobby) return;
    if (joinPaymentMethod === 'PAY_NOW') {
      // Open Direct UPI Modal with Merchant Webhook Auto-Lock listener
      setShowLobbyUpiModal(true);
      return;
    }
    await executeJoinLobby(undefined, 'PAY_LATER_AT_TURF');
  };

  const executeJoinLobby = async (bankUtr?: string, paymentMode: 'PAY_NOW' | 'PAY_LATER_AT_TURF' = 'PAY_NOW') => {
    if (!user || !profile || !joiningLobby) return;
    setJoining(true);
    try {
      const result = await toggleLobbyJoin(
        joiningLobby.id,
        user.uid,
        profile.displayName || user.displayName || 'Athlete',
        profile.photoURL,
        paymentMode,
        user.email || '',
        paymentMode === 'PAY_NOW' ? (bankUtr || `UPI-TXN-${Date.now()}`) : undefined,
        upiIdInput || undefined
      );

      const targetLobby = joiningLobby;
      setJoiningLobby(null);
      setShowLobbyUpiModal(false);
      await loadData();
      if (selectedLobby && selectedLobby.id === targetLobby.id) {
        handleOpenLobbyDetails(targetLobby);
      }

      if (paymentMode === 'PAY_NOW') {
        Alert.alert(
          'Bank Settlement Confirmed! ⚡',
          `Your individual share of ₹${targetLobby.pricePerPlayer || 200} was verified by receiver bank webhook.\n\nBank UTR: ${bankUtr || (result as any)?.transactionId || `TXN-${Date.now()}`}\nYou are locked into the squad!`
        );
      } else {
        Alert.alert(
          'Joined (Pay Later) 📝',
          `You are added to the squad roster!\n\nPlease settle your share of ₹${targetLobby.pricePerPlayer || 200} at the turf counter on match day.`
        );
      }
    } catch (err: any) {
      Alert.alert('Unable to Join', err.message || 'Please try again.');
    } finally {
      setJoining(false);
    }
  };

  // Step-Out & Instant Refund Trigger
  const handleInitiateStepOut = (lobby: Lobby) => {
    if (!user) return;
    if (lobby.hostId === user.uid) {
      Alert.alert('Host Action', 'As the lobby organizer, you can dissolve this lobby instead of stepping out.');
      return;
    }
    const gameStatus = getLobbyGameStatus(lobby);
    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
      Alert.alert(
        'Roster Locked',
        'This match has already started or concluded. Athletes cannot leave the lobby without playing.'
      );
      return;
    }
    setSteppingOutLobby(lobby);
  };

  // Confirm Step-Out & Process Instant Refund
  const handleConfirmStepOut = async () => {
    if (!user || !steppingOutLobby) return;
    setProcessingRefund(true);
    try {
      const res = await processLobbyStepOutRefund(
        steppingOutLobby.id,
        user.uid,
        'Athlete stepped out of lobby prior to kickoff'
      );
      setSteppingOutLobby(null);
      await loadData();
      if (selectedLobby && selectedLobby.id === steppingOutLobby.id) {
        setSelectedLobby(null);
      }

      if (res.refunded) {
        Alert.alert(
          'Step-Out & Instant Refund Processed 💸',
          `You have stepped out of the lobby.\n\nInstant Refund of ₹${res.refundAmount} has been logged and reversed to your UPI source.\nRefund Txn: ${res.refundTxnId}\nRemaining squad counts and dues updated.`
        );
      } else {
        Alert.alert('Stepped Out', 'You have left the match lobby. Pending dues have been cancelled.');
      }
    } catch (err: any) {
      Alert.alert('Step-Out Error', err.message || 'Failed to process step-out.');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Delete / Dissolve Lobby (Host)
  const handleDeleteLobby = (lobby: Lobby) => {
    if (!user || user.uid !== lobby.hostId) {
      Alert.alert('Unauthorized', 'Only the lobby creator can dissolve this lobby.');
      return;
    }

    const gameStatus = getLobbyGameStatus(lobby);
    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
      Alert.alert(
        'Cancellation Disabled',
        `This match is currently ${gameStatus === 'LIVE' ? 'live in progress' : 'concluded'} and cannot be dissolved or cancelled.`
      );
      return;
    }

    Alert.alert(
      'Dissolve Lobby',
      `Are you sure you want to dissolve "${lobby.name}"? The turf slot reservation will be released back for other players.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dissolve Lobby',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(lobby.id);
            try {
              await deleteLobby(lobby.id, user.uid);
              if (selectedLobby && selectedLobby.id === lobby.id) {
                setSelectedLobby(null);
              }
              await loadData();
              Alert.alert('Lobby Dissolved', 'Matchmaking lobby dissolved and turf slot released.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to dissolve lobby.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Delete Player Pool
  const handleDeletePool = async (pool: PlayerPool) => {
    if (!user) return;
    if (pool.creatorId && pool.creatorId !== user.uid) {
      Alert.alert('Unauthorized', 'Only the creator of this squad pool can delete it.');
      return;
    }

    Alert.alert(
      'Delete Squad Pool',
      'Are you sure you want to permanently delete this matchmaking pool? It will be removed from the database.',
      [
        { text: 'Keep Pool', style: 'cancel' },
        {
          text: 'Delete Pool',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlayerPool(pool.id, user.uid);
              await loadData();
              Alert.alert('Pool Deleted', 'Squad pool has been removed from database.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete pool.');
            }
          },
        },
      ]
    );
  };

  // Calculate effective advance amount to pay for lobby
  const getEffectiveLobbyAdvance = () => {
    const maxP = parseInt(maxPlayers, 10) || 10;
    const squadNum = Math.min(maxP, Math.max(1, parseInt(initialSquadCount, 10) || 1));
    const slotCost = selectedSlot?.price || 1500;
    const dynCost = maxP > 0 ? Math.ceil(slotCost / maxP) : 150;
    const squadShareAmount = Math.min(slotCost, dynCost * squadNum);
    const venueMinAdvance = selectedTurf?.minAdvanceAmount || Math.round(slotCost * 0.3);

    if (advanceChoice === 'FULL_SLOT') return slotCost;
    if (advanceChoice === 'VENUE_MIN') return Math.min(slotCost, Math.max(100, venueMinAdvance));
    if (advanceChoice === 'CUSTOM') {
      const parsed = parseInt(customAdvanceAmount, 10) || 0;
      return Math.min(slotCost, Math.max(100, parsed));
    }
    // Default: SQUAD_SHARE
    return squadShareAmount;
  };

  // Execute Create Lobby with verified Receiver Bank Webhook
  const executeCreateLobbyWithWebhook = async (bankUtr: string, gatewayUsed?: string) => {
    if (!user || !profile || !selectedTurf || !selectedArena || !selectedSlot) return;
    setCreating(true);
    setCreateError(null);
    try {
      const maxP = parseInt(maxPlayers, 10) || 10;
      const minP = parseInt(minPlayers, 10) || Math.max(2, Math.floor(maxP / 2));
      const squadNum = Math.min(maxP, Math.max(1, parseInt(initialSquadCount, 10) || 1));
      const dynamicCost = maxP > 0 ? Math.ceil(selectedSlot.price / maxP) : parseInt(pricePerPlayer, 10) || 150;
      const divisionNote = `₹${selectedSlot.price} total turf price / ${maxP} athletes = ₹${dynamicCost} per player (${squadNum} confirmed squad, ${Math.max(0, maxP - squadNum)} spots open)`;
      const advanceToPay = getEffectiveLobbyAdvance();

      await createLobbyWithSlotTransaction({
        hostId: user.uid,
        hostName: profile.displayName || user.displayName || 'Athlete',
        hostEmail: user.email || '',
        hostPhone: profile.phoneNumber || '',
        hostPhotoURL: profile.photoURL || null,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address || '',
        turfCity: selectedTurf.city || 'City',
        arenaId: selectedArena.id,
        arenaName: selectedArena.name,
        sport: selectedArena.sport || selectedTurf.sports?.[0] || 'Football',
        slotId: selectedSlot.id,
        date: selectedDate,
        day: selectedDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes || 60,
        totalAmount: selectedSlot.price,
        lobbyName: lobbyName.trim(),
        maxPlayers: maxP,
        minPlayers: minP,
        pricePerPlayer: dynamicCost,
        initialSquadCount: squadNum,
        hostAnnouncement: hostAnnouncement.trim(),
        costDivisionNote: divisionNote,
        paymentMethod: 'PAY_NOW',
        advanceAmount: advanceToPay,
        bankUtr: bankUtr,
        merchantOrderRef: `LOBBY-${selectedSlot.id.slice(-6)}`,
        verificationSource: 'MERCHANT_UPI_WEBHOOK',
        webhookVerifiedAt: new Date().toISOString(),
        gatewayUsed: gatewayUsed || 'PHONEPE_BUSINESS',
      });

      setShowCreateLobbyUpiModal(false);
      setShowCreateModal(false);
      setLobbyName('');
      await loadData();
      Alert.alert(
        'Slot Locked & Match Lobby Live! 🏆',
        `Advance payment of ₹${advanceToPay} verified via Receiver Bank Webhook.\nBank UTR: ${bankUtr}\n\nYour ground slot is reserved! ${squadNum} squad spots locked, ${Math.max(0, maxP - squadNum)} open spots for teammates to join & split.`
      );
    } catch (err: any) {
      const msg = err.message || 'Payment verified, but could not lock slot. Please contact turf desk.';
      setCreateError(msg);
      Alert.alert('Booking Notice', msg);
    } finally {
      setCreating(false);
    }
  };

  // Handle Create Lobby with Slot Transaction
  const handleCreateLobby = async () => {
    if (!user || !profile) return;
    if (!lobbyName.trim()) {
      setCreateError('Please enter a lobby name.');
      return;
    }
    if (!selectedTurf || !selectedArena || !selectedSlot) {
      setCreateError('Please select an available slot.');
      return;
    }

    // User directive: when booking through lobby, advance payment uses UPI webhook same as slot booking!
    if (createPaymentMethod === 'PAY_NOW') {
      setShowCreateLobbyUpiModal(true);
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const maxP = parseInt(maxPlayers, 10) || 10;
      const minP = parseInt(minPlayers, 10) || Math.max(2, Math.floor(maxP / 2));
      const squadNum = Math.min(maxP, Math.max(1, parseInt(initialSquadCount, 10) || 1));
      const dynamicCost = maxP > 0 ? Math.ceil(selectedSlot.price / maxP) : parseInt(pricePerPlayer, 10) || 150;
      const divisionNote = `₹${selectedSlot.price} total turf price / ${maxP} athletes = ₹${dynamicCost} per player (${squadNum} confirmed squad, ${Math.max(0, maxP - squadNum)} spots open)`;

      await createLobbyWithSlotTransaction({
        hostId: user.uid,
        hostName: profile.displayName || user.displayName || 'Athlete',
        hostEmail: user.email || '',
        hostPhone: profile.phoneNumber || '',
        hostPhotoURL: profile.photoURL || null,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address || '',
        turfCity: selectedTurf.city || 'City',
        arenaId: selectedArena.id,
        arenaName: selectedArena.name,
        sport: selectedArena.sport || selectedTurf.sports?.[0] || 'Football',
        slotId: selectedSlot.id,
        date: selectedDate,
        day: selectedDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes || 60,
        totalAmount: selectedSlot.price,
        lobbyName: lobbyName.trim(),
        maxPlayers: maxP,
        minPlayers: minP,
        pricePerPlayer: dynamicCost,
        initialSquadCount: squadNum,
        hostAnnouncement: hostAnnouncement.trim(),
        costDivisionNote: divisionNote,
        paymentMethod: 'PAY_LATER_AT_TURF',
      });
      setShowCreateModal(false);
      setLobbyName('');
      await loadData();
      Alert.alert('Lobby Created! 🏆', `Slot booked (Pay at Turf Counter)! ${squadNum} squad spots confirmed, ${Math.max(0, maxP - squadNum)} matchmaking spots open.`);
    } catch (err: any) {
      const msg = err.message || 'This slot is no longer available. Please choose another slot.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Handle Create Player Pool
  const handleCreatePool = async () => {
    if (!user || !profile) return;
    if (!poolDate) {
      Alert.alert('Missing Date', 'Please select a preferred match date.');
      return;
    }

    setCreatingPool(true);
    try {
      const reqPlayers = parseInt(poolRequiredPlayers, 10) || 6;
      const maxPrice = parseInt(poolMaxPrice, 10) || 200;

      let hoursRange = '6:00 PM - 8:00 PM';
      if (poolHoursCategory === 'MORNING') hoursRange = '6:00 AM - 9:00 AM';
      else if (poolHoursCategory === 'MIDDAY') hoursRange = '10:00 AM - 3:00 PM';
      else if (poolHoursCategory === 'EVENING') hoursRange = '5:00 PM - 8:00 PM';
      else if (poolHoursCategory === 'NIGHT') hoursRange = '8:00 PM - 11:00 PM';

      await createPlayerPool({
        creatorId: user.uid,
        creatorName: profile.displayName || user.displayName || 'Athlete',
        creatorPhone: profile.phoneNumber,
        creatorPhotoURL: profile.photoURL || undefined,
        sport: poolSport,
        city: poolCity,
        area: poolArea,
        preferredDate: poolDate,
        preferredTime: hoursRange.split(' - ')[0],
        preferredHours: hoursRange,
        matchHoursCategory: poolHoursCategory,
        requiredPlayers: reqPlayers,
        maxPricePerPlayer: maxPrice,
        description:
          poolDescription.trim() ||
          `${poolSport} Squad Interest Group in ${poolCity} (${hoursRange})`,
      });

      setShowCreatePoolModal(false);
      setPoolDescription('');
      await loadData();
      Alert.alert(
        'Player Pool Created! 🎯',
        'Your squad interest group is open. As soon as enough athletes back the pool, it can automatically convert to a confirmed turf match lobby!'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create player pool.');
    } finally {
      setCreatingPool(false);
    }
  };

  // Join Pool Trigger
  const handleInitiateJoinPool = (pool: PlayerPool) => {
    if (!user || !profile) {
      Alert.alert('Sign In Required', 'Please sign in to back athlete pools.');
      return;
    }
    setJoiningPool(pool);
  };

  // Confirm Join Pool
  const handleConfirmJoinPool = async () => {
    if (!user || !profile || !joiningPool) return;
    setJoiningPoolLoading(true);
    try {
      const res = await joinPlayerPool(joiningPool.id, {
        uid: user.uid,
        name: profile.displayName || user.displayName || 'Athlete',
        phone: profile.phoneNumber,
        photoURL: profile.photoURL || undefined,
        skillLevel: 'Athlete',
        paymentPreference: poolPaymentPref,
      });

      setJoiningPool(null);
      await loadData();

      if (res.isFullyBacked) {
        Alert.alert(
          'Squad Pool 100% Backed! ⚡',
          `Quota of ${joiningPool.requiredPlayers} athletes reached! You can now convert this pool directly into a confirmed match lobby at an assigned turf venue.`
        );
      } else {
        Alert.alert(
          'Backed the Pool! 🎯',
          `You backed this ${joiningPool.sport} squad. We will notify you once the quota is full!`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to back pool.');
    } finally {
      setJoiningPoolLoading(false);
    }
  };

  // Leave Pool
  const handleLeavePool = async (pool: PlayerPool) => {
    if (!user) return;
    Alert.alert(
      'Leave Squad Pool',
      'Are you sure you want to step out of this player matchmaking pool?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Step Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await leavePlayerPool(pool.id, user.uid);
              await loadData();
              Alert.alert('Stepped Out', 'You have left the squad pool.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave pool.');
            }
          },
        },
      ]
    );
  };

  // Pool-To-Lobby Auto Conversion
  const handleConvertPool = async (pool: PlayerPool) => {
    setConvertingPoolId(pool.id);
    try {
      const res = await convertPoolToLobby(pool.id);
      await loadData();
      Alert.alert(
        'Pool Converted to Match Lobby! 🏟️',
        `Confirmed turf venue assigned: ${res.turfName}!\nAll squad athletes have been enrolled and notified.`,
        [
          {
            text: 'View Match Lobby',
            onPress: async () => {
              setActiveTab('LOBBIES');
              const freshLobbies = await getLobbies();
              const converted = freshLobbies.find((l) => l.id === res.lobbyId);
              if (converted) handleOpenLobbyDetails(converted);
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Conversion Failed', err.message || 'Could not auto-assign turf venue for lobby.');
    } finally {
      setConvertingPoolId(null);
    }
  };

  // User's city from profile or registered area
  const userCity = profile?.city?.trim() || '';
  const distinctCities = Array.from(
    new Set(
      lobbies
        .map((l) => l.turfCity?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0))
    )
  );

  // Filtered Lobbies List
  const filteredLobbies = lobbies.filter((l) => {
    const isJoined = l.players?.some((p) => p.playerId === user?.uid || p.uid === user?.uid);
    const isHost = l.hostId === user?.uid;
    const isConcluded = isLobbyConcluded(l);

    // USER DIRECTIVE:
    // "don't show all the generated lobby to all the users of app, show just to the players who is in that area, nearest to turf or in same city."
    if (selectedCityFilter === 'MY_AREA' && userCity) {
      if (l.turfCity && l.turfCity.toLowerCase() !== userCity.toLowerCase()) {
        return false;
      }
    } else if (selectedCityFilter !== 'ALL' && selectedCityFilter !== 'MY_AREA') {
      if (l.turfCity?.toLowerCase() !== selectedCityFilter.toLowerCase()) {
        return false;
      }
    }

    if (selectedSport !== 'All' && l.sport?.toLowerCase() !== selectedSport.toLowerCase()) {
      return false;
    }

    // USER DIRECTIVE:
    // When match concluded:
    // 1. Don't show on active lobbies
    // 2. Don't show concluded matches in open spots even if there are spots left
    if (statusFilter === 'OPEN') {
      // Strictly exclude concluded matches from open spots, even if currentPlayers < maxPlayers
      if (isConcluded) return false;
      if (l.currentPlayers >= l.maxPlayers || (l.status && l.status !== 'OPEN')) return false;
    }

    if (statusFilter === 'ALL') {
      // Show active lobbies only (never concluded matches)
      if (isConcluded) return false;
      if (l.status === 'CANCELLED' || l.status === 'CLOSED') return false;
    }

    if (statusFilter === 'MY_LOBBIES') {
      if (!isHost && !isJoined) return false;
      // Show active squads only (never concluded matches)
      if (isConcluded) return false;
      if (l.status === 'CANCELLED') return false;
    }

    if (statusFilter === 'PAST') {
      // Dedicated tab for concluded matches
      if (!isConcluded) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.name?.toLowerCase().includes(q);
      const matchTurf = l.turfName?.toLowerCase().includes(q);
      const matchCity = l.turfCity?.toLowerCase().includes(q);
      const matchHost = l.hostName?.toLowerCase().includes(q);
      if (!matchName && !matchTurf && !matchCity && !matchHost) return false;
    }

    return true;
  });

  // Calculate live lobby counts (strictly excluding concluded matches from active & open spots)
  const activeLobbiesCount = lobbies.filter((l) => !isLobbyConcluded(l) && l.status !== 'CANCELLED' && l.status !== 'CLOSED').length;
  const openSpotsCount = lobbies.filter((l) => !isLobbyConcluded(l) && (l.status === 'OPEN' || !l.status) && l.currentPlayers < l.maxPlayers).length;
  const myActiveCount = lobbies.filter((l) => {
    const isJoined = l.players?.some((p) => p.playerId === user?.uid || p.uid === user?.uid);
    const isHost = l.hostId === user?.uid;
    return (isHost || isJoined) && !isLobbyConcluded(l) && l.status !== 'CANCELLED';
  }).length;
  const pastMatchesCount = lobbies.filter((l) => isLobbyConcluded(l)).length;

  return (
    <View style={styles.container}>
      {/* Top Header & Main Segment Tabs */}
      <View style={styles.headerContainer}>
        <View style={styles.topTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Squad Matchmaking</Text>
            <Text style={styles.headerSubtitle}>
              Split payments, live lobbies & community athlete pools
            </Text>
          </View>
          <TouchableOpacity
            style={styles.hostPrimaryBtn}
            onPress={() => {
              if (!user) {
                Alert.alert('Sign In', 'Please sign in to organize lobbies or pools.');
                return;
              }
              if (!profile?.isPhoneVerified) {
                setPendingHostType(activeTab === 'LOBBIES' ? 'LOBBY' : 'POOL');
                setShowPhoneModal(true);
                return;
              }
              if (activeTab === 'LOBBIES') {
                setShowCreateModal(true);
              } else {
                setShowCreatePoolModal(true);
              }
            }}
          >
            <Plus size={16} color="#064e3b" />
            <Text style={styles.hostPrimaryBtnText}>
              {activeTab === 'LOBBIES' ? 'Host Lobby' : 'Create Pool'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Switcher */}
        <View style={styles.segmentSwitcher}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'LOBBIES' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('LOBBIES')}
          >
            <Layers size={14} color={activeTab === 'LOBBIES' ? '#ffffff' : '#94a3b8'} />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'LOBBIES' && styles.segmentBtnTextActive,
              ]}
            >
              Live Match Lobbies ({activeLobbiesCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'POOLS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('POOLS')}
          >
            <Sparkles size={14} color={activeTab === 'POOLS' ? '#ffffff' : '#94a3b8'} />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'POOLS' && styles.segmentBtnTextActive,
              ]}
            >
              Player Pools ({pools.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================== TAB 1: LIVE MATCH LOBBIES ==================== */}
      {activeTab === 'LOBBIES' ? (
        <View style={styles.tabContentFlex}>
          {/* Search & Filters */}
          <View style={styles.filtersSection}>
            <View style={styles.searchBar}>
              <Search size={16} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search matches, turfs, cities, hosts..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.statusTabsRow}>
              <TouchableOpacity
                style={[styles.statusTab, statusFilter === 'ALL' && styles.statusTabActive]}
                onPress={() => setStatusFilter('ALL')}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    statusFilter === 'ALL' && styles.statusTabTextActive,
                  ]}
                >
                  Active ({activeLobbiesCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusTab, statusFilter === 'OPEN' && styles.statusTabActive]}
                onPress={() => setStatusFilter('OPEN')}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    statusFilter === 'OPEN' && styles.statusTabTextActive,
                  ]}
                >
                  Open Spots ({openSpotsCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusTab, statusFilter === 'MY_LOBBIES' && styles.statusTabActive]}
                onPress={() => setStatusFilter('MY_LOBBIES')}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    statusFilter === 'MY_LOBBIES' && styles.statusTabTextActive,
                  ]}
                >
                  My Squads ({myActiveCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusTab, statusFilter === 'PAST' && styles.statusTabActive]}
                onPress={() => setStatusFilter('PAST')}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    statusFilter === 'PAST' && styles.statusTabTextActive,
                  ]}
                >
                  Past ({pastMatchesCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Location & City Filter Chips (Requirement 4: Show only players/lobbies in their area/city) */}
            <View style={styles.cityFilterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
                <TouchableOpacity
                  style={[styles.cityChip, selectedCityFilter === 'MY_AREA' && styles.cityChipActive]}
                  onPress={() => setSelectedCityFilter('MY_AREA')}
                >
                  <MapPin size={12} color={selectedCityFilter === 'MY_AREA' ? '#064e3b' : '#10b981'} />
                  <Text style={[styles.cityChipText, selectedCityFilter === 'MY_AREA' && styles.cityChipTextActive]}>
                    {userCity ? `In My Area (${userCity})` : 'Near My Area'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cityChip, selectedCityFilter === 'ALL' && styles.cityChipActive]}
                  onPress={() => setSelectedCityFilter('ALL')}
                >
                  <Text style={[styles.cityChipText, selectedCityFilter === 'ALL' && styles.cityChipTextActive]}>
                    All Cities ({lobbies.length})
                  </Text>
                </TouchableOpacity>

                {distinctCities.map((cityName) => (
                  <TouchableOpacity
                    key={cityName}
                    style={[styles.cityChip, selectedCityFilter === cityName && styles.cityChipActive]}
                    onPress={() => setSelectedCityFilter(cityName)}
                  >
                    <Text style={[styles.cityChipText, selectedCityFilter === cityName && styles.cityChipTextActive]}>
                      {cityName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sport Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {['All', 'Football', 'Cricket', 'Badminton', 'Pickleball', 'Tennis', 'Basketball'].map(
                (sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
                    onPress={() => setSelectedSport(sport)}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        selectedSport === sport && styles.sportChipTextActive,
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>

          {/* Lobbies List */}
          <FlatList
            data={filteredLobbies}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
            }
            renderItem={({ item }) => {
              const isJoined = item.players?.some(
                (p) => p.playerId === user?.uid || p.uid === user?.uid
              );
              const isHost = item.hostId === user?.uid;

              return (
                <LobbyCard
                  lobby={item}
                  isJoined={isJoined}
                  isHost={isHost}
                  onJoinToggle={() => {
                    const gameStatus = getLobbyGameStatus(item);
                    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
                      Alert.alert(
                        'Roster Locked',
                        'This match has already started or concluded. Athletes cannot leave the lobby without playing.'
                      );
                      return;
                    }
                    if (isJoined) {
                      handleInitiateStepOut(item);
                    } else {
                      handleInitiateJoin(item);
                    }
                  }}
                  onPressCard={() => handleOpenLobbyDetails(item)}
                  onDeleteLobby={() => handleDeleteLobby(item)}
                  onPressHostProfile={(hostId) => handleOpenPlayerProfile(hostId)}
                  onPressPlayerProfile={(playerId) => handleOpenPlayerProfile(playerId)}
                  onOpenChat={() => handleOpenLobbyChat(item)}
                />
              );
            }}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyBox}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                  <Text style={styles.emptyTitle}>Loading live lobbies...</Text>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Users size={44} color="#334155" />
                  <Text style={styles.emptyTitle}>No Matching Lobbies</Text>
                  <Text style={styles.emptyDesc}>
                    Be the first organizer to host a match lobby with split payments at your favorite turf!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Text style={styles.emptyActionBtnText}>Host Match Lobby</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        </View>
      ) : (
        /* ==================== TAB 2: PLAYER POOLS & SQUAD MATCHMAKING ==================== */
        <View style={styles.tabContentFlex}>
          {/* Interest Group Filters: Sport & Match Hours */}
          <View style={styles.filtersSection}>
            <Text style={styles.filterGroupLabel}>Sport Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {['All', 'Football', 'Cricket', 'Badminton', 'Pickleball', 'Tennis'].map((sport) => (
                <TouchableOpacity
                  key={sport}
                  style={[styles.sportChip, poolSportFilter === sport && styles.sportChipActive]}
                  onPress={() => setPoolSportFilter(sport)}
                >
                  <Text
                    style={[
                      styles.sportChipText,
                      poolSportFilter === sport && styles.sportChipTextActive,
                    ]}
                  >
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterGroupLabel, { marginTop: 8 }]}>Preferred Match Hours</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { id: 'ALL', label: 'All Hours' },
                { id: 'MORNING', label: 'Morning (6 - 9 AM)' },
                { id: 'MIDDAY', label: 'Midday (9 AM - 4 PM)' },
                { id: 'EVENING', label: 'Evening (4 - 8 PM)' },
                { id: 'NIGHT', label: 'Night (8 - 11 PM)' },
              ].map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.hourChip,
                    poolHoursFilter === h.id && styles.hourChipActive,
                  ]}
                  onPress={() => setPoolHoursFilter(h.id as MatchHoursCategory)}
                >
                  <Clock size={11} color={poolHoursFilter === h.id ? '#064e3b' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.hourChipText,
                      poolHoursFilter === h.id && styles.hourChipTextActive,
                    ]}
                  >
                    {h.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Pools List */}
          <FlatList
            data={pools}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
            }
            renderItem={({ item }) => (
              <PoolCard
                pool={item}
                currentUserId={user?.uid}
                onJoin={(p) => handleInitiateJoinPool(p)}
                onLeave={(p) => handleLeavePool(p)}
                onConvert={(p) => handleConvertPool(p)}
                onDelete={(p) => handleDeletePool(p)}
                onViewLobby={(lobbyId) => {
                  setActiveTab('LOBBIES');
                  const found = lobbies.find((l) => l.id === lobbyId);
                  if (found) handleOpenLobbyDetails(found);
                }}
                onPressProfile={(uid) => handleOpenPlayerProfile(uid)}
              />
            )}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyBox}>
                  <ActivityIndicator size="large" color="#f59e0b" />
                  <Text style={styles.emptyTitle}>Loading player pools...</Text>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Sparkles size={44} color="#334155" />
                  <Text style={styles.emptyTitle}>No Open Player Pools</Text>
                  <Text style={styles.emptyDesc}>
                    Start a squad interest pool for your sport and preferred hours. When backed, it auto-converts to a live match lobby!
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={() => setShowCreatePoolModal(true)}
                  >
                    <Text style={[styles.emptyActionBtnText, { color: '#000000' }]}>
                      Start Squad Pool
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        </View>
      )}

      {/* ==================== MODAL: JOIN LOBBY & SQUAD SPLIT PAYMENTS ==================== */}
      <Modal visible={!!joiningLobby} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Join Squad Match</Text>
                <Text style={styles.modalSubtitle}>
                  {joiningLobby?.name} • {joiningLobby?.sport}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setJoiningLobby(null)} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              {/* Cost Division Ledger Summary */}
              <View style={styles.splitCostCard}>
                <View style={styles.splitCostRow}>
                  <Text style={styles.splitCostLabel}>Your Individual Share</Text>
                  <Text style={styles.splitCostAmount}>
                    ₹{joiningLobby?.pricePerPlayer || 200}
                  </Text>
                </View>
                <View style={styles.splitSubDetailRow}>
                  <Text style={styles.splitSubDetailText}>
                    Turf Slot Total: ₹{joiningLobby?.totalSlotPrice || 1500}
                  </Text>
                  <Text style={styles.splitSubDetailText}>
                    Squad Size: {joiningLobby?.currentPlayers || 1} / {joiningLobby?.maxPlayers || 10} Athletes
                  </Text>
                </View>
                <View style={styles.refundGuarantyBadge}>
                  <ShieldCheck size={14} color="#10b981" />
                  <Text style={styles.refundGuarantyText}>
                    Instant source refund if you step out before game kickoff
                  </Text>
                </View>
              </View>

              {/* Payment Methods */}
              <Text style={styles.sectionHeader}>Choose Payment Method</Text>

              {/* Option A: UPI Instant Pay */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.paymentOptionCard,
                  joinPaymentMethod === 'PAY_NOW' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setJoinPaymentMethod('PAY_NOW')}
              >
                <View style={styles.paymentRadio}>
                  <View
                    style={[
                      styles.radioCircle,
                      joinPaymentMethod === 'PAY_NOW' && styles.radioCircleActive,
                    ]}
                  >
                    {joinPaymentMethod === 'PAY_NOW' && <View style={styles.radioDot} />}
                  </View>
                </View>

                <View style={styles.paymentInfo}>
                  <View style={styles.paymentTitleRow}>
                    <Smartphone size={16} color="#38bdf8" />
                    <Text style={styles.paymentTitle}>Pay Individual Share via UPI</Text>
                    <View style={styles.instantBadge}>
                      <Text style={styles.instantBadgeText}>INSTANT</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentSub}>
                    Pay securely via GPay, PhonePe, Paytm, or BHIM. Instant verified transaction ledger generated.
                  </Text>

                  {joinPaymentMethod === 'PAY_NOW' && (
                    <View style={styles.upiInputBox}>
                      <Text style={styles.upiInputLabel}>Your UPI ID / VPA</Text>
                      <TextInput
                        style={styles.upiTextInput}
                        value={upiIdInput}
                        onChangeText={setUpiIdInput}
                        placeholder="athlete@okhdfcbank"
                        placeholderTextColor="#64748b"
                      />
                      <View style={styles.quickVpaRow}>
                        {['@okhdfcbank', '@okicici', '@oksbi', '@paytm'].map((vpa) => (
                          <TouchableOpacity
                            key={vpa}
                            style={styles.vpaChip}
                            onPress={() => {
                              const prefix = upiIdInput.split('@')[0] || 'athlete';
                              setUpiIdInput(`${prefix}${vpa}`);
                            }}
                          >
                            <Text style={styles.vpaChipText}>{vpa}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Option B: Pay Later at Turf Counter */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.paymentOptionCard,
                  joinPaymentMethod === 'PAY_LATER_AT_TURF' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setJoinPaymentMethod('PAY_LATER_AT_TURF')}
              >
                <View style={styles.paymentRadio}>
                  <View
                    style={[
                      styles.radioCircle,
                      joinPaymentMethod === 'PAY_LATER_AT_TURF' && styles.radioCircleActive,
                    ]}
                  >
                    {joinPaymentMethod === 'PAY_LATER_AT_TURF' && <View style={styles.radioDot} />}
                  </View>
                </View>

                <View style={styles.paymentInfo}>
                  <View style={styles.paymentTitleRow}>
                    <Building size={16} color="#f59e0b" />
                    <Text style={styles.paymentTitle}>Pay Later at Turf Counter</Text>
                  </View>
                  <Text style={styles.paymentSub}>
                    Reserve your athlete slot now and settle ₹{joiningLobby?.pricePerPlayer || 200} in cash/UPI upon arrival at the venue.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.confirmJoinBtn, joining && styles.disabledBtn]}
                disabled={joining}
                onPress={handleConfirmJoinLobby}
              >
                {joining ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#064e3b" />
                    <Text style={styles.confirmJoinBtnText}>
                      {joinPaymentMethod === 'PAY_NOW'
                        ? `Pay ₹${joiningLobby?.pricePerPlayer || 200} & Confirm Slot`
                        : 'Confirm Slot (Pay at Turf)'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== DIRECT UPI MODAL (LOBBY JOIN - REAL-TIME BANK WEBHOOK) ==================== */}
      <DirectUpiModal
        visible={showLobbyUpiModal}
        onClose={() => setShowLobbyUpiModal(false)}
        amount={joiningLobby?.pricePerPlayer || 200}
        upiId={adminPaymentConfig?.upiId || 'turfit.sports@okaxis'}
        payeeName={adminPaymentConfig?.beneficiaryName || 'TruFit Sports Admin'}
        transactionNote={`Lobby Join - ${joiningLobby?.name || 'Match'}`}
        bookingRef={`LOBBY-${joiningLobby?.id?.slice(-6) || Date.now().toString().slice(-6)}`}
        subTitle="0% Gateway Commission • Master Admin Escrow"
        turfId={joiningLobby?.turfId}
        ownerId={joiningLobby?.ownerId || turfs.find((t) => t.id === joiningLobby?.turfId)?.ownerId}
        playerId={user?.uid}
        isMerchantUpi={true}
        merchantProvider="PHONEPE_BUSINESS"
        onConfirmPayment={async (utrRef) => {
          await executeJoinLobby(utrRef, 'PAY_NOW');
        }}
      />

      {/* ==================== DIRECT UPI MODAL (LOBBY CREATE - ADVANCE BANK WEBHOOK) ==================== */}
      <DirectUpiModal
        visible={showCreateLobbyUpiModal}
        onClose={() => setShowCreateLobbyUpiModal(false)}
        amount={getEffectiveLobbyAdvance()}
        upiId={adminPaymentConfig?.upiId || 'turfit.sports@okaxis'}
        payeeName={adminPaymentConfig?.beneficiaryName || 'TruFit Sports Admin'}
        transactionNote={`Lobby Advance - ${selectedTurf?.name || 'Venue'} (${selectedSlot?.startTime || ''})`}
        bookingRef={`LOBBY-${selectedSlot?.id?.slice(-6) || Date.now().toString().slice(-6)}`}
        subTitle="0% Gateway Commission • Master Admin Escrow"
        turfId={selectedTurf?.id}
        ownerId={selectedTurf?.ownerId}
        playerId={user?.uid}
        isMerchantUpi={true}
        merchantProvider={selectedTurf?.merchantUpiConfig?.provider || 'PHONEPE_BUSINESS'}
        onConfirmPayment={async (utrRef, gatewayUsed) => {
          await executeCreateLobbyWithWebhook(utrRef, gatewayUsed);
        }}
      />

      {/* ==================== MODAL: STEP-OUT & INSTANT REFUND ==================== */}
      <Modal visible={!!steppingOutLobby} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Step Out of Match Lobby</Text>
              <TouchableOpacity onPress={() => setSteppingOutLobby(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollBody}>
              <View style={styles.stepOutWarningCard}>
                <AlertTriangle size={24} color="#f59e0b" />
                <Text style={styles.stepOutWarningText}>
                  Are you sure you want to step out of "{steppingOutLobby?.name}"?
                </Text>
              </View>

              <View style={styles.refundSummaryBox}>
                <Text style={styles.refundSummaryTitle}>Real-time Refund Ledger</Text>
                <View style={styles.refundSummaryRow}>
                  <Text style={styles.refundSummaryLabel}>Instant UPI Reversal:</Text>
                  <Text style={styles.refundSummaryAmount}>
                    ₹{steppingOutLobby?.pricePerPlayer || 200}
                  </Text>
                </View>
                <Text style={styles.refundSummaryDesc}>
                  Your spot will be released, remaining squad counts adjusted, and any pending dues cancelled immediately.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSteppingOutLobby(null)}
              >
                <Text style={styles.cancelBtnText}>Stay in Lobby</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.destructiveBtn, processingRefund && styles.disabledBtn]}
                disabled={processingRefund}
                onPress={handleConfirmStepOut}
              >
                {processingRefund ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.destructiveBtnText}>Step Out & Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: BACK PLAYER POOL ==================== */}
      <Modal visible={!!joiningPool} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: 460 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Back Athlete Pool</Text>
                <Text style={styles.modalSubtitle}>
                  {joiningPool?.sport} • {joiningPool?.city}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setJoiningPool(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollBody}>
              <View style={styles.poolSummaryCard}>
                <Text style={styles.poolSummaryText}>
                  Backing this pool signals your commitment to play when the squad quota (
                  {joiningPool?.requiredPlayers} athletes) is backed.
                </Text>
                <View style={styles.poolQuotaRow}>
                  <Text style={styles.poolQuotaLabel}>Target Share / Player:</Text>
                  <Text style={styles.poolQuotaVal}>₹{joiningPool?.maxPricePerPlayer || 200}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Preferred Payment When Converted</Text>
              <View style={styles.prefRow}>
                <TouchableOpacity
                  style={[
                    styles.prefChip,
                    poolPaymentPref === 'UPI' && styles.prefChipActive,
                  ]}
                  onPress={() => setPoolPaymentPref('UPI')}
                >
                  <Smartphone size={14} color={poolPaymentPref === 'UPI' ? '#064e3b' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.prefChipText,
                      poolPaymentPref === 'UPI' && styles.prefChipTextActive,
                    ]}
                  >
                    UPI Direct Split
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.prefChip,
                    poolPaymentPref === 'PAY_LATER' && styles.prefChipActive,
                  ]}
                  onPress={() => setPoolPaymentPref('PAY_LATER')}
                >
                  <Building size={14} color={poolPaymentPref === 'PAY_LATER' ? '#064e3b' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.prefChipText,
                      poolPaymentPref === 'PAY_LATER' && styles.prefChipTextActive,
                    ]}
                  >
                    Pay at Turf Counter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.confirmJoinBtn, joiningPoolLoading && styles.disabledBtn]}
                disabled={joiningPoolLoading}
                onPress={handleConfirmJoinPool}
              >
                {joiningPoolLoading ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <>
                    <Zap size={16} color="#064e3b" />
                    <Text style={styles.confirmJoinBtnText}>Back this Squad</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: DETAILED LOBBY VIEW & SQUAD ROSTER ==================== */}
      <Modal visible={!!selectedLobby} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.modalBadgeRow}>
                  <Text style={styles.sportBadgeLarge}>
                    {(selectedLobby?.sport || 'Sports').toUpperCase()}
                  </Text>
                  <Text style={styles.statusBadgeLarge}>{selectedLobby?.status}</Text>
                </View>
                <Text style={styles.modalTitleLarge} numberOfLines={1}>
                  {selectedLobby?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLobby(null)} style={styles.closeBtn}>
                <X size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              {/* Host Open Call Announcement */}
              {!!selectedLobby?.hostAnnouncement && (
                <View style={styles.hostAnnouncementDetailBox}>
                  <Text style={styles.hostAnnouncementDetailTitle}>💬 Host Open Call Announcement</Text>
                  <Text style={styles.hostAnnouncementDetailQuote}>
                    "{selectedLobby.hostAnnouncement}"
                  </Text>
                </View>
              )}

              {/* Squad & Cost Division Note */}
              {(!!selectedLobby?.initialSquadCount || !!selectedLobby?.costDivisionNote) && (
                <View style={styles.squadNoteBox}>
                  <View style={styles.squadNoteRow}>
                    <Text style={styles.squadNoteConfirmed}>
                      Confirmed Squad: {selectedLobby?.initialSquadCount || 1} Players
                    </Text>
                    <Text style={styles.squadNoteOpen}>
                      {Math.max(0, (selectedLobby?.maxPlayers || 10) - (selectedLobby?.currentPlayers || 1))} spots open
                    </Text>
                  </View>
                  {!!selectedLobby?.costDivisionNote && (
                    <Text style={styles.squadNoteDesc}>
                      💡 {selectedLobby.costDivisionNote}
                    </Text>
                  )}
                </View>
              )}

              {/* Venue & Schedule Box */}
              <View style={styles.detailSectionBox}>
                <Text style={styles.detailSectionLabel}>Match Logistics</Text>
                <View style={styles.detailInfoRow}>
                  <MapPin size={14} color="#38bdf8" />
                  <Text style={styles.detailInfoTextBold}>
                    {selectedLobby?.turfName} • {selectedLobby?.turfCity}
                  </Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Calendar size={14} color="#38bdf8" />
                  <Text style={styles.detailInfoText}>
                    {selectedLobby?.date} ({selectedLobby?.day})
                  </Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Clock size={14} color="#38bdf8" />
                  <Text style={styles.detailInfoText}>
                    {selectedLobby?.startTime} - {selectedLobby?.endTime}
                  </Text>
                </View>
              </View>

              {/* Dynamic Split Cost Box */}
              <View style={styles.detailSectionBox}>
                <Text style={styles.detailSectionLabel}>Dynamic Squad Split</Text>
                <View style={styles.splitMatrixRow}>
                  <View style={styles.splitMatrixCol}>
                    <Text style={styles.splitMatrixLabel}>Per-Athlete Share</Text>
                    <Text style={styles.splitMatrixVal}>
                      ₹{selectedLobby?.pricePerPlayer || 200}
                    </Text>
                  </View>
                  <View style={styles.splitMatrixDivider} />
                  <View style={styles.splitMatrixCol}>
                    <Text style={styles.splitMatrixLabel}>Current Squad</Text>
                    <Text style={styles.splitMatrixVal}>
                      {selectedLobby?.currentPlayers || 1} / {selectedLobby?.maxPlayers || 10}
                    </Text>
                  </View>
                  <View style={styles.splitMatrixDivider} />
                  <View style={styles.splitMatrixCol}>
                    <Text style={styles.splitMatrixLabel}>Min Quota</Text>
                    <Text style={styles.splitMatrixVal}>
                      {selectedLobby?.minPlayers || 4} Athletes
                    </Text>
                  </View>
                </View>
              </View>

              {/* Ephemeral Squad Chat Action Banner */}
              <TouchableOpacity
                style={styles.modalSquadChatCard}
                onPress={() => {
                  if (selectedLobby) {
                    handleOpenLobbyChat(selectedLobby);
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.modalSquadChatLeft}>
                  <View style={styles.modalSquadChatIconBox}>
                    <MessageSquare size={18} color="#38bdf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.modalSquadChatTitle}>Squad Match Chat</Text>
                      <View style={styles.modalChatFlamePill}>
                        <Flame size={10} color="#fbbf24" />
                        <Text style={styles.modalChatFlamePillText}>Ephemeral</Text>
                      </View>
                    </View>
                    <Text style={styles.modalSquadChatSub} numberOfLines={1}>
                      Coordinate arrival & tactics • Auto-purges 2h post-match
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#38bdf8" />
              </TouchableOpacity>

              {/* Squad Roster */}
              <View style={styles.detailSectionBox}>
                <View style={styles.rosterTitleRow}>
                  <Text style={styles.detailSectionLabel}>Squad Roster</Text>
                  <Text style={styles.spotsCountText}>
                    {Math.max(
                      0,
                      (selectedLobby?.maxPlayers || 10) - (selectedLobby?.currentPlayers || 1)
                    )}{' '}
                    spots open
                  </Text>
                </View>

                {loadingParticipants ? (
                  <ActivityIndicator size="small" color="#38bdf8" />
                ) : lobbyParticipants.length === 0 ? (
                  <Text style={styles.emptyRosterText}>No players loaded yet.</Text>
                ) : (
                  <>
                    {selectedLobby && getLobbyGameStatus(selectedLobby) === 'OVER' && (
                      <View style={styles.postMatchRosterBanner}>
                        <Award size={15} color="#fbbf24" />
                        <Text style={styles.postMatchRosterBannerText}>
                          Match completed! Rate teammates to award sportsmanship stars & earn +15 TurFit points.
                        </Text>
                      </View>
                    )}
                    <View style={styles.rosterList}>
                      {lobbyParticipants.map((p, idx) => (
                        <View key={p.id || String(idx)} style={styles.rosterItem}>
                          <View style={styles.rosterItemLeft}>
                            <Text style={styles.rosterItemIndex}>{idx + 1}</Text>
                            {p.playerPhotoURL ? (
                              <Image
                                source={{ uri: p.playerPhotoURL }}
                                style={styles.rosterItemAvatar}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.rosterItemAvatarPlaceholder,
                                  p.isHost && styles.hostAvatarPlaceholder,
                                ]}
                              >
                                <Text style={styles.rosterItemAvatarText}>
                                  {(p.playerName || 'P').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.rosterItemName} numberOfLines={1}>
                                  {p.playerName}
                                </Text>
                                {p.isHost && (
                                  <View style={styles.hostBadge}>
                                    <Text style={styles.hostBadgeText}>HOST</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.rosterItemSport}>
                                {p.paymentStatus === 'PAID'
                                  ? 'UPI Paid ⚡'
                                  : 'Pay Later at Turf 📝'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {user && (p.uid || (p as any).playerId) !== user.uid && (
                              <TouchableOpacity
                                style={styles.ratePlayerChip}
                                onPress={() =>
                                  handleOpenRatePlayer({
                                    uid: p.uid || (p as any).playerId,
                                    displayName: p.playerName || 'Teammate',
                                    photoURL: p.playerPhotoURL || null,
                                    sport: selectedLobby?.sport || 'Sports',
                                  })
                                }
                              >
                                <Star size={11} color="#fbbf24" fill="#fbbf24" />
                                <Text style={styles.ratePlayerChipText}>Rate</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.viewProfileChip}
                              onPress={() => handleOpenPlayerProfile(p.uid)}
                            >
                              <Text style={styles.viewProfileChipText}>Profile</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {selectedLobby && (() => {
              const isHost = selectedLobby.hostId === user?.uid;
              const isJoined = (selectedLobby.playerUids || []).includes(user?.uid || '') ||
                (selectedLobby.players || []).some((p: any) => p.playerId === user?.uid || p.uid === user?.uid);
              const lobbyGameStatus = getLobbyGameStatus(selectedLobby);
              const isLiveOrOver = lobbyGameStatus === 'LIVE' || lobbyGameStatus === 'OVER';

              return (
                <View style={styles.modalActionFooter}>
                  {isLiveOrOver ? (
                    <View style={styles.lockedMatchBanner}>
                      <Lock size={15} color="#f59e0b" />
                      <Text style={styles.lockedMatchBannerText}>
                        {lobbyGameStatus === 'LIVE' ? 'Match In Progress' : 'Match Concluded'} • Squad roster locked. Athletes cannot leave without playing.
                      </Text>
                    </View>
                  ) : isJoined ? (
                    !isHost ? (
                      <TouchableOpacity
                        style={styles.modalStepOutBtn}
                        onPress={() => {
                          const target = selectedLobby;
                          setSelectedLobby(null);
                          handleInitiateStepOut(target);
                        }}
                      >
                        <Text style={styles.modalStepOutBtnText}>Step Out of Squad</Text>
                      </TouchableOpacity>
                    ) : null
                  ) : (
                    <TouchableOpacity
                      style={styles.modalJoinBtn}
                      onPress={() => {
                        const target = selectedLobby;
                        setSelectedLobby(null);
                        handleInitiateJoin(target);
                      }}
                    >
                      <Text style={styles.modalJoinBtnText}>
                        Join Match (₹{selectedLobby.pricePerPlayer || 200})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: CREATE LOBBY ==================== */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Host Matchmaking Lobby</Text>
                <Text style={styles.modalSubtitle}>
                  Reserve a slot & invite athletes to split turf fees
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              <Text style={styles.label}>Match Title</Text>
              <TextInput
                style={styles.input}
                value={lobbyName}
                onChangeText={setLobbyName}
                placeholder="e.g. 5v5 Turf Cup - Football"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Select Turf Venue</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {turfs.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.turfPill, selectedTurf?.id === t.id && styles.turfPillActive]}
                    onPress={() => setSelectedTurf(t)}
                  >
                    <Text
                      style={[
                        styles.turfPillText,
                        selectedTurf?.id === t.id && styles.turfPillTextActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {arenas.length > 1 && (
                <>
                  <Text style={styles.label}>Select Pitch / Arena</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {arenas.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.arenaPill, selectedArena?.id === a.id && styles.arenaPillActive]}
                        onPress={() => setSelectedArena(a)}
                      >
                        <Text
                          style={[
                            styles.arenaPillText,
                            selectedArena?.id === a.id && styles.arenaPillTextActive,
                          ]}
                        >
                          {a.name} ({a.sport})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Match Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {dates.map((d) => (
                  <TouchableOpacity
                    key={d.date}
                    style={[styles.datePill, selectedDate === d.date && styles.datePillActive]}
                    onPress={() => {
                      setSelectedDate(d.date);
                      setSelectedDay(d.day);
                    }}
                  >
                    <Text
                      style={[
                        styles.datePillDay,
                        selectedDate === d.date && styles.datePillDayActive,
                      ]}
                    >
                      {d.day.slice(0, 3)}
                    </Text>
                    <Text
                      style={[
                        styles.datePillLabel,
                        selectedDate === d.date && styles.datePillLabelActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Available Turf Slots</Text>
              {loadingSlots ? (
                <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 10 }} />
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotWarning}>
                  <AlertTriangle size={16} color="#f59e0b" />
                  <Text style={styles.noSlotText}>No available slots on this date.</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.slotCard, selectedSlot?.id === s.id && styles.slotCardActive]}
                      onPress={() => {
                        setSelectedSlot(s);
                        const numMax = parseInt(maxPlayers, 10) || 10;
                        setPricePerPlayer(String(Math.round(s.price / numMax)));
                      }}
                    >
                      <Text
                        style={[
                          styles.slotTime,
                          selectedSlot?.id === s.id && styles.slotTimeActive,
                        ]}
                      >
                        {s.startTime} - {s.endTime}
                      </Text>
                      <Text style={styles.slotPrice}>Total: ₹{s.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Max Athletes</Text>
                  <TextInput
                    style={styles.input}
                    value={maxPlayers}
                    onChangeText={(val) => {
                      setMaxPlayers(val);
                      if (selectedSlot) {
                        const num = parseInt(val, 10) || 10;
                        setPricePerPlayer(String(Math.round(selectedSlot.price / num)));
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.col}>
                  <Text style={styles.label}>Your Confirmed Squad</Text>
                  <TextInput
                    style={styles.input}
                    value={initialSquadCount}
                    onChangeText={setInitialSquadCount}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={styles.col}>
                  <Text style={styles.label}>Per Athlete (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={pricePerPlayer}
                    onChangeText={setPricePerPlayer}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Host Open Call Announcement */}
              <Text style={styles.label}>Host Open Call Message (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 65, textAlignVertical: 'top', paddingTop: 8 }]}
                multiline
                numberOfLines={2}
                value={hostAnnouncement}
                onChangeText={setHostAnnouncement}
                placeholder="e.g. We are 5 friends who booked the slot! Looking for 3 more players for a 5v5 friendly match"
                placeholderTextColor="#64748b"
              />

              {/* Cost Split Summary Card */}
              {selectedSlot && (
                <View style={styles.splitCalcSummaryBox}>
                  <View style={styles.splitCalcSummaryRow}>
                    <Text style={styles.splitCalcSummaryLabel}>Total Slot Advance Price:</Text>
                    <Text style={styles.splitCalcSummaryValue}>₹{selectedSlot.price}</Text>
                  </View>
                  <Text style={styles.splitCalcSummaryDesc}>
                    💡 {selectedSlot.price} / {maxPlayers || 10} = ₹{pricePerPlayer || 150} per player • {initialSquadCount || 1} squad confirmed, {Math.max(0, (parseInt(maxPlayers, 10) || 10) - (parseInt(initialSquadCount, 10) || 1))} matchmaking spots open
                  </Text>
                </View>
              )}

              {/* Advance UPI Slot Confirmation */}
              <Text style={styles.label}>Slot Booking Confirmation & Matchmaking Advance</Text>
              <View style={styles.createPaymentSelectBox}>
                <TouchableOpacity
                  style={[
                    styles.createPaymentChip,
                    createPaymentMethod === 'PAY_NOW' && styles.createPaymentChipActive,
                  ]}
                  onPress={() => setCreatePaymentMethod('PAY_NOW')}
                >
                  <Smartphone size={14} color={createPaymentMethod === 'PAY_NOW' ? '#10b981' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.createPaymentChipText,
                      createPaymentMethod === 'PAY_NOW' && styles.createPaymentChipTextActive,
                    ]}
                  >
                    UPI Webhook Advance (Instant Lock)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.createPaymentChip,
                    createPaymentMethod === 'PAY_LATER_AT_TURF' && styles.createPaymentChipActive,
                  ]}
                  onPress={() => setCreatePaymentMethod('PAY_LATER_AT_TURF')}
                >
                  <Building size={14} color={createPaymentMethod === 'PAY_LATER_AT_TURF' ? '#f59e0b' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.createPaymentChipText,
                      createPaymentMethod === 'PAY_LATER_AT_TURF' && styles.createPaymentChipTextActive,
                    ]}
                  >
                    Pay at Turf Counter
                  </Text>
                </TouchableOpacity>
              </View>

              {createPaymentMethod === 'PAY_NOW' && selectedSlot && (
                <View style={styles.advanceChoiceContainer}>
                  <Text style={styles.advanceChoiceTitle}>Select Lobby Advance Deposit</Text>
                  <Text style={styles.advanceChoiceSubtitle}>
                    Verified instantly through turf owner's receiver bank webhook with 0% commission.
                  </Text>

                  <View style={styles.advanceOptionsGrid}>
                    <TouchableOpacity
                      style={[styles.advanceOptionCard, advanceChoice === 'SQUAD_SHARE' && styles.advanceOptionCardActive]}
                      onPress={() => setAdvanceChoice('SQUAD_SHARE')}
                    >
                      <View style={styles.advanceOptionTop}>
                        <Users size={14} color={advanceChoice === 'SQUAD_SHARE' ? '#10b981' : '#94a3b8'} />
                        <Text style={[styles.advanceOptionBadge, advanceChoice === 'SQUAD_SHARE' && styles.advanceOptionBadgeActive]}>
                          RECOMMENDED
                        </Text>
                      </View>
                      <Text style={styles.advanceOptionPrice}>
                        ₹{Math.min(selectedSlot.price, (parseInt(maxPlayers, 10) > 0 ? Math.ceil(selectedSlot.price / (parseInt(maxPlayers, 10) || 10)) : 150) * Math.min(parseInt(maxPlayers, 10) || 10, Math.max(1, parseInt(initialSquadCount, 10) || 1)))}
                      </Text>
                      <Text style={styles.advanceOptionDesc}>Host Squad Share ({initialSquadCount || 1} athletes)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.advanceOptionCard, advanceChoice === 'FULL_SLOT' && styles.advanceOptionCardActive]}
                      onPress={() => setAdvanceChoice('FULL_SLOT')}
                    >
                      <View style={styles.advanceOptionTop}>
                        <CheckCircle2 size={14} color={advanceChoice === 'FULL_SLOT' ? '#10b981' : '#94a3b8'} />
                        <Text style={styles.advanceOptionBadge}>FULL LOCK</Text>
                      </View>
                      <Text style={styles.advanceOptionPrice}>₹{selectedSlot.price}</Text>
                      <Text style={styles.advanceOptionDesc}>Prepay 100% Full Slot</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.webhookBanner}>
                    <Zap size={14} color="#10b981" />
                    <Text style={styles.webhookBannerText}>
                      Direct UPI Webhook: Pay directly from GPay, PhonePe, or Paytm. Once verified by the receiver bank, the slot is locked and lobby opens automatically.
                    </Text>
                  </View>
                </View>
              )}

              {createError && (
                <View style={styles.errorBox}>
                  <AlertTriangle size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  (creating || !selectedSlot) && styles.disabledBtn,
                ]}
                disabled={creating || !selectedSlot}
                onPress={handleCreateLobby}
              >
                {creating ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>
                    {createPaymentMethod === 'PAY_NOW'
                      ? `Pay ₹${getEffectiveLobbyAdvance()} via UPI Webhook & Open Lobby`
                      : 'Confirm Slot (Pay at Turf Desk) & Host Match'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: CREATE PLAYER POOL ==================== */}
      <Modal visible={showCreatePoolModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Player Pool</Text>
                <Text style={styles.modalSubtitle}>
                  Gather interested athletes for auto turf matchmaking
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreatePoolModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              <Text style={styles.label}>Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {['Football', 'Cricket', 'Badminton', 'Pickleball', 'Tennis'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.turfPill, poolSport === s && styles.turfPillActive]}
                    onPress={() => setPoolSport(s)}
                  >
                    <Text style={[styles.turfPillText, poolSport === s && styles.turfPillTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={poolCity}
                    onChangeText={setPoolCity}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Preferred Area / Hub</Text>
                  <TextInput
                    style={styles.input}
                    value={poolArea}
                    onChangeText={setPoolArea}
                    placeholder="e.g. Bandra / Andheri"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <Text style={styles.label}>Preferred Match Hours</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {[
                  { id: 'MORNING', label: 'Morning (6 - 9 AM)' },
                  { id: 'MIDDAY', label: 'Midday (9 AM - 4 PM)' },
                  { id: 'EVENING', label: 'Evening (4 - 8 PM)' },
                  { id: 'NIGHT', label: 'Night (8 - 11 PM)' },
                ].map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[
                      styles.arenaPill,
                      poolHoursCategory === h.id && styles.arenaPillActive,
                    ]}
                    onPress={() => setPoolHoursCategory(h.id as MatchHoursCategory)}
                  >
                    <Text
                      style={[
                        styles.arenaPillText,
                        poolHoursCategory === h.id && styles.arenaPillTextActive,
                      ]}
                    >
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Required Athlete Quota</Text>
                  <TextInput
                    style={styles.input}
                    value={poolRequiredPlayers}
                    onChangeText={setPoolRequiredPlayers}
                    keyboardType="numeric"
                    placeholder="6"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Max Target Share / Player (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={poolMaxPrice}
                    onChangeText={setPoolMaxPrice}
                    keyboardType="numeric"
                    placeholder="200"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <Text style={styles.label}>Pool Description & Rules</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                value={poolDescription}
                onChangeText={setPoolDescription}
                multiline
                placeholder="e.g. Looking for intermediate players for weekend friendly matches"
                placeholderTextColor="#64748b"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.createBtn, creatingPool && styles.disabledBtn]}
                disabled={creatingPool}
                onPress={handleCreatePool}
              >
                {creatingPool ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Open Squad Matchmaking Pool</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <PlayerPublicProfileModal
        visible={showProfileModal}
        athlete={viewingProfile}
        matchContext={{
          lobbyId: selectedLobby?.id,
          turfName: selectedLobby?.turfName,
          sport: selectedLobby?.sport,
        }}
        onClose={() => {
          setShowProfileModal(false);
          setViewingProfile(null);
        }}
        onRatePlayer={(athlete) => {
          setShowProfileModal(false);
          handleOpenRatePlayer({
            uid: athlete.uid,
            displayName: athlete.displayName || 'Teammate',
            photoURL: athlete.photoURL,
            sport: athlete.preferredSports?.[0] || selectedLobby?.sport,
          });
        }}
      />

      {/* Post-Match Rate Player Modal */}
      <RatePlayerModal
        visible={showRatingModal}
        targetPlayer={ratingTargetPlayer}
        matchContext={{
          lobbyId: selectedLobby?.id,
          turfName: selectedLobby?.turfName,
          sport: selectedLobby?.sport,
        }}
        onClose={() => {
          setShowRatingModal(false);
          setRatingTargetPlayer(null);
        }}
      />

      {/* Auto-Expiring / Ephemeral Squad Chat Modal */}
      <LobbyChatModal
        visible={showChatModal}
        lobby={chatLobby}
        onClose={() => {
          setShowChatModal(false);
          setChatLobby(null);
        }}
      />

      {/* Just-In-Time One-Time Mobile Phone Verification Modal for Lobbies */}
      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          setPendingJoinLobby(null);
          setPendingHostType(null);
        }}
        title="Verify Phone to Join Squad"
        subtitle="Squad members and venue hosts need a reachable mobile number to coordinate team roster and court entry."
        actionLabel="Verify & Proceed"
        onSuccess={() => {
          setShowPhoneModal(false);
          if (pendingJoinLobby) {
            const target = pendingJoinLobby;
            setPendingJoinLobby(null);
            setJoiningLobby(target);
            setJoinPaymentMethod('PAY_NOW');
            setUpiIdInput(user?.email ? `${user.email.split('@')[0]}@okaxis` : 'athlete@upi');
          } else if (pendingHostType) {
            const hostType = pendingHostType;
            setPendingHostType(null);
            if (hostType === 'LOBBY') {
              setShowCreateModal(true);
            } else {
              setShowCreatePoolModal(true);
            }
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080d1a',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#0c1220',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  hostPrimaryBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  hostPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064e3b',
  },
  segmentSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#1e293b',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  tabContentFlex: {
    flex: 1,
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0c1220',
    borderBottomWidth: 1,
    borderBottomColor: '#182235',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 0,
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statusTabActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  statusTabTextActive: {
    color: '#064e3b',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 6,
  },
  sportChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  sportChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  sportChipTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  filterGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  hourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 6,
  },
  hourChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  hourChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  hourChipTextActive: {
    color: '#064e3b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
  },
  modalContainerLarge: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollBody: {
    padding: 16,
  },
  splitCostCard: {
    backgroundColor: '#0c1220',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  splitCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  splitCostLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  splitCostAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  splitSubDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  splitSubDetailText: {
    fontSize: 11,
    color: '#64748b',
  },
  refundGuarantyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refundGuarantyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    flex: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    backgroundColor: '#0c1220',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
    gap: 10,
  },
  paymentOptionCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  paymentRadio: {
    paddingTop: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#38bdf8',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  instantBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  instantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  paymentSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  upiInputBox: {
    marginTop: 10,
    backgroundColor: '#131b2e',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upiInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  upiTextInput: {
    backgroundColor: '#0c1220',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickVpaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  vpaChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vpaChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  modalFooterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  confirmJoinBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  confirmJoinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  destructiveBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  stepOutWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
  },
  stepOutWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
  },
  refundSummaryBox: {
    backgroundColor: '#0c1220',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  refundSummaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 8,
  },
  refundSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  refundSummaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  refundSummaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  refundSummaryDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 4,
  },
  poolSummaryCard: {
    backgroundColor: '#0c1220',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  poolSummaryText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 10,
  },
  poolQuotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  poolQuotaLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  poolQuotaVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f59e0b',
  },
  prefRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  prefChipActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  prefChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  prefChipTextActive: {
    color: '#10b981',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  sportBadgeLarge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeLarge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalTitleLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailSectionBox: {
    backgroundColor: '#0c1220',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailInfoTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailInfoText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  splitMatrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  splitMatrixCol: {
    alignItems: 'center',
  },
  splitMatrixLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  splitMatrixVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  splitMatrixDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
  },
  rosterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  spotsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  emptyRosterText: {
    fontSize: 12,
    color: '#64748b',
  },
  rosterList: {
    gap: 8,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rosterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rosterItemIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    width: 14,
  },
  rosterItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rosterItemAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarPlaceholder: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rosterItemAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  rosterItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    maxWidth: 130,
  },
  hostBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
  },
  rosterItemSport: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  viewProfileChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewProfileChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  ratePlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratePlayerChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
  },
  postMatchRosterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  postMatchRosterBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fef08a',
    flex: 1,
    lineHeight: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0c1220',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  turfPill: {
    backgroundColor: '#0c1220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  turfPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  turfPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  turfPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  arenaPill: {
    backgroundColor: '#0c1220',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  arenaPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  arenaPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  arenaPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  datePill: {
    backgroundColor: '#0c1220',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
    alignItems: 'center',
  },
  datePillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  datePillDay: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
  },
  datePillDayActive: {
    color: '#064e3b',
  },
  datePillLabel: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
  },
  datePillLabelActive: {
    color: '#064e3b',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  slotCard: {
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '47%',
  },
  slotCardActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  slotTimeActive: {
    color: '#10b981',
  },
  slotPrice: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  noSlotWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  noSlotText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  col: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  createBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  hostAnnouncementDetailBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  hostAnnouncementDetailTitle: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hostAnnouncementDetailQuote: {
    color: '#e0e7ff',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  squadNoteBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  squadNoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  squadNoteConfirmed: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  squadNoteOpen: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '700',
  },
  squadNoteDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  splitCalcSummaryBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  splitCalcSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  splitCalcSummaryLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  splitCalcSummaryValue: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
  },
  splitCalcSummaryDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  createPaymentSelectBox: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 10,
  },
  createPaymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createPaymentChipActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  createPaymentChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  createPaymentChipTextActive: {
    color: '#ffffff',
  },
  modalActionFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 8,
  },
  lockedMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lockedMatchBannerText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  modalStepOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStepOutBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  modalJoinBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalJoinBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  // City Filter Chips
  cityFilterContainer: {
    marginBottom: 8,
  },
  cityScroll: {
    flexDirection: 'row',
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 8,
  },
  cityChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  cityChipTextActive: {
    color: '#064e3b',
    fontWeight: '800',
  },
  // Advance Choice Section
  advanceChoiceContainer: {
    marginTop: 12,
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  advanceChoiceTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  advanceChoiceSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },
  advanceOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  advanceOptionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#131d31',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    padding: 10,
  },
  advanceOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#091c28',
  },
  advanceOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  advanceOptionBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#0f172a',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  advanceOptionBadgeActive: {
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  advanceOptionPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 2,
  },
  advanceOptionDesc: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 13,
  },
  customAdvanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131d31',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  customAdvanceLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  customAdvanceInput: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '800',
    width: 90,
    textAlign: 'right',
    paddingVertical: 4,
  },
  webhookBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    padding: 9,
    marginTop: 4,
  },
  webhookBannerText: {
    flex: 1,
    color: '#34d399',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  modalSquadChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  modalSquadChatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalSquadChatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSquadChatTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalChatFlamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  modalChatFlamePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
  },
  modalSquadChatSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
