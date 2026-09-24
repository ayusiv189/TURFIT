import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenOwnerBookings,
  getOwnerTurfs,
  getArenasByTurf,
  updateBookingStatus,
  createManualBooking,
  cancelBookingWithSlotRelease,
  markBookingNoShow,
  isLobbyBooking,
  getLobbyParticipants,
  settleLobbyPlayerDue,
  collectCounterDueForBooking,
  listenArenaSlots,
} from '../../services/dbService';
import { Booking, Turf, Arena, LobbyPlayer, Slot } from '../../types';
import {
  Search,
  Plus,
  X,
  Phone,
  CheckCircle,
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  Ban,
  AlertTriangle,
  UserX,
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
  User,
  Tag,
  RefreshCw,
  Check,
  Zap,
  MessageSquare,
  Lock,
} from 'lucide-react-native';
import { useOwnerSubscription } from '../../contexts/OwnerSubscriptionContext';
import { openWhatsAppNotification } from '../../services/whatsappService';

type DateFilterMode = 'ALL' | 'TODAY' | 'YESTERDAY' | 'TOMORROW' | 'PAST' | 'CUSTOM';
type StatusFilterMode = 'ALL' | 'LIVE' | 'PAST' | 'UNPAID' | 'NOSHOW' | 'CANCELLED';
type BookingSourceFilter = 'ALL' | 'INDIVIDUAL' | 'LOBBY';

export const OwnerBookingsScreen: React.FC<{ route?: any }> = ({ route }) => {
  const { user } = useAuth();
  const { canAccess } = useOwnerSubscription();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  
  // Date and Status filters
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('ALL');
  const [bookingSourceFilter, setBookingSourceFilter] = useState<BookingSourceFilter>('ALL');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDateInput, setCustomDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Roster / Ledger Modal State
  const [selectedRosterBooking, setSelectedRosterBooking] = useState<Booking | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<LobbyPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [showManualModal, setShowManualModal] = useState(route?.params?.openManualModal || false);

  // Manual booking form & walk-in desk state
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [amount, setAmount] = useState('1500');
  const [amountPaid, setAmountPaid] = useState('1500');
  const [creating, setCreating] = useState(false);

  // Walk-in enhanced states
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [paymentOption, setPaymentOption] = useState<'FULL_PAID' | 'PARTIAL' | 'UNPAID'>('FULL_PAID');
  const [paymentMethod, setPaymentMethod] = useState<'CASH'>('CASH');
  const [isCustomTime, setIsCustomTime] = useState(false);

  // Owner Cancellation State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // No-Show Modal State
  const [bookingForNoShow, setBookingForNoShow] = useState<Booking | null>(null);
  const [noShowPenalty, setNoShowPenalty] = useState('200');
  const [markingNoShow, setMarkingNoShow] = useState(false);

  // Real-time slot listener for walk-in booking desk
  useEffect(() => {
    if (!showManualModal || !selectedArena || !date) return;
    const unsub = listenArenaSlots(selectedArena.id, date, (fetchedSlots) => {
      const sorted = [...fetchedSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      setAvailableSlots(sorted);
    });
    return () => unsub();
  }, [showManualModal, selectedArena, date]);

  // Live real-time listener for owner bookings & turfs
  useEffect(() => {
    if (!user) return;
    const unsub = listenOwnerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    getOwnerTurfs(user.uid).then((tData) => {
      setTurfs(tData);
      if (tData.length > 0 && !selectedTurf) {
        setSelectedTurf(tData[0]);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (selectedTurf) {
      getArenasByTurf(selectedTurf.id).then((aList) => {
        setArenas(aList);
        if (aList.length > 0) {
          setSelectedArena(aList[0]);
          if (aList[0].basePrice) setAmount(aList[0].basePrice.toString());
        }
      });
    }
  }, [selectedTurf]);

  const handleDatePreset = (preset: 'TODAY' | 'TOMORROW' | 'DAY_AFTER') => {
    const d = new Date();
    if (preset === 'TOMORROW') d.setDate(d.getDate() + 1);
    if (preset === 'DAY_AFTER') d.setDate(d.getDate() + 2);
    const formatted = d.toISOString().split('T')[0];
    setDate(formatted);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: Slot) => {
    if (slot.status !== 'AVAILABLE' && slot.status !== 'FREE') {
      Alert.alert('Slot Reserved', 'This slot is already booked or reserved.');
      return;
    }
    setSelectedSlot(slot);
    setIsCustomTime(false);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    const p = (slot.price || selectedArena?.basePrice || 1500).toString();
    setAmount(p);

    if (paymentOption === 'FULL_PAID') {
      setAmountPaid(p);
    } else if (paymentOption === 'UNPAID') {
      setAmountPaid('0');
    } else {
      setAmountPaid(Math.round((parseFloat(p) || 1500) / 2).toString());
    }
  };

  const handlePaymentOptionChange = (option: 'FULL_PAID' | 'PARTIAL' | 'UNPAID') => {
    setPaymentOption(option);
    const tot = parseFloat(amount) || selectedArena?.basePrice || 1500;
    if (option === 'FULL_PAID') {
      setAmountPaid(tot.toString());
    } else if (option === 'UNPAID') {
      setAmountPaid('0');
    } else {
      setAmountPaid(Math.round(tot / 2).toString());
    }
  };

  const handleCollectBookingDue = (booking: Booking) => {
    const due = (booking.amountDue !== undefined && booking.amountDue !== null)
      ? booking.amountDue
      : Math.max(0, (booking.totalAmount || 0) - (booking.amountPaid || 0));

    if (due <= 0) return;

    Alert.alert(
      `Collect Balance: ₹${due}`,
      `Confirm that the remaining balance of ₹${due} for ${booking.playerName} (${booking.arenaName}) has been received at the venue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Confirm Paid (₹${due})`,
          onPress: async () => {
            try {
              await collectCounterDueForBooking(booking.id, due, 'CASH');
              Alert.alert('Payment Recorded', `₹${due} balance marked as received. Slot is now marked as PAID.`);
            } catch (err: any) {
              console.warn('Error collecting counter due:', err);
              Alert.alert('Error', err?.message || 'Failed to record payment.');
            }
          },
        },
      ]
    );
  };

  const handleCreateWalkIn = async () => {
    if (!selectedTurf || !selectedArena || !user) {
      Alert.alert('Selection Error', 'Please select a venue and pitch first.');
      return;
    }

    const guestName = playerName.trim() || 'Walk-in Guest';
    const tot = parseFloat(amount) || selectedArena.basePrice || 1500;
    let pd = parseFloat(amountPaid) || 0;
    if (paymentOption === 'FULL_PAID') pd = tot;
    if (paymentOption === 'UNPAID') pd = 0;
    const due = Math.max(0, tot - pd);

    const payStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' =
      due === 0 ? 'PAID' : pd > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    const payMethod = pd > 0 ? paymentMethod : 'PAY_LATER_AT_TURF';

    setCreating(true);
    try {
      await createManualBooking({
        turfId: selectedTurf.id,
        arenaId: selectedArena.id,
        ownerId: user.uid,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address,
        turfArea: selectedTurf.area,
        turfCity: selectedTurf.city,
        arenaName: selectedArena.name,
        sport: selectedArena.sport,
        playerName: guestName,
        playerPhone: playerPhone.trim(),
        date,
        day: 'Scheduled',
        startTime,
        endTime,
        duration: 60,
        totalAmount: tot,
        amountPaid: pd,
        amountDue: due,
        paymentStatus: payStatus,
        paymentMethod: payMethod,
        slotId: selectedSlot?.id,
        notes: `Walk-in Desk Counter Entry (${payMethod})`,
      });

      Alert.alert(
        'Walk-In Confirmed! ⚡',
        `Slot for ${selectedArena.name} on ${date} (${startTime} - ${endTime}) is now locked in Firebase.\n\nStatus: ${payStatus.replace(/_/g, ' ')}\nPaid: ₹${pd} | Due: ₹${due}`
      );

      setShowManualModal(false);
      setPlayerName('');
      setPlayerPhone('');
      setSelectedSlot(null);
    } catch (err: any) {
      console.warn('Error creating walk-in booking:', err);
      Alert.alert('Error', err?.message || 'Failed to create walk-in booking.');
    } finally {
      setCreating(false);
    }
  };

  const handleOwnerConfirmCancel = async () => {
    if (!bookingToCancel || !user) return;
    const timing = getBookingLiveStatus(bookingToCancel);
    if (timing === 'GAME_OVER' || timing === 'OVER_UNPAID') {
      Alert.alert('Match Concluded', 'This match has already ended and cannot be cancelled.');
      setBookingToCancel(null);
      return;
    }
    setCancelling(true);
    try {
      const reason = cancelReason.trim() || 'Cancelled by Turf Owner';
      await cancelBookingWithSlotRelease(bookingToCancel.id, 'OWNER', reason, bookingToCancel.slotId);
      setCancelSuccessMsg('Booking cancelled, slot released, and dues cleared.');
      setTimeout(() => {
        setBookingToCancel(null);
        setCancelSuccessMsg('');
        setCancelReason('');
      }, 1500);
    } catch (err: any) {
      console.warn('Error cancelling booking:', err);
      Alert.alert('Cancellation Error', err?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!bookingForNoShow) return;
    setMarkingNoShow(true);
    try {
      const penaltyAmt = parseFloat(noShowPenalty) || 200;
      await markBookingNoShow(bookingForNoShow.id, user?.uid || bookingForNoShow.ownerId, penaltyAmt, 'Athlete was absent at scheduled slot start time');
      setBookingForNoShow(null);
      Alert.alert('No-Show Enforced', `Marked as absent. ₹${penaltyAmt} penalty fee logged to player's dues ledger.`);
    } catch (err) {
      console.warn('Error marking no-show:', err);
      Alert.alert('Error', 'Failed to mark no-show.');
    } finally {
      setMarkingNoShow(false);
    }
  };

  const handleOpenRoster = async (booking: Booking) => {
    setSelectedRosterBooking(booking);
    if (isLobbyBooking(booking) && (booking.lobbyId || booking.id)) {
      setLoadingRoster(true);
      try {
        const p = await getLobbyParticipants(booking.lobbyId || booking.id);
        setRosterPlayers(p);
      } catch (err) {
        console.warn('Error loading lobby roster:', err);
        setRosterPlayers([]);
      } finally {
        setLoadingRoster(false);
      }
    } else {
      setRosterPlayers([]);
      setLoadingRoster(false);
    }
  };

  const handleCollectPlayerDue = (booking: Booking, player: LobbyPlayer, dueAmt: number) => {
    Alert.alert(
      `Collect Player Share: ₹${dueAmt}`,
      `Confirm that ₹${dueAmt} remaining share from ${player.playerName || 'Player'} has been received at the venue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Confirm Paid (₹${dueAmt})`,
          onPress: async () => {
            try {
              await settleLobbyPlayerDue(
                booking.lobbyId || booking.id,
                player.uid,
                dueAmt,
                'CASH',
                booking.id
              );
              // Update local roster state
              setRosterPlayers((prev) =>
                prev.map((p) => {
                  if (p.uid === player.uid) {
                    return {
                      ...p,
                      amountPaid: (p.amountPaid || 0) + dueAmt,
                      amountDue: 0,
                      paymentStatus: 'PAID',
                    };
                  }
                  return p;
                })
              );
              // Update selected booking totals
              setSelectedRosterBooking((prev) => {
                if (!prev) return null;
                const newPaid = (prev.amountPaid || 0) + dueAmt;
                const newDue = Math.max(0, (prev.amountDue || 0) - dueAmt);
                return {
                  ...prev,
                  amountPaid: newPaid,
                  amountDue: newDue,
                  paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
                };
              });
              Alert.alert('Payment Recorded', `₹${dueAmt} share marked as received from ${player.playerName || 'Player'}.`);
            } catch (err: any) {
              console.warn('Error collecting player due:', err);
              Alert.alert('Error', err?.message || 'Failed to collect player due.');
            }
          },
        },
      ]
    );
  };

  // Date helpers
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterdayDate = new Date();
  yesterdayDate.setDate(today.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const tomorrowDate = new Date();
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const shiftCustomDate = (days: number) => {
    const current = new Date(customDate);
    current.setDate(current.getDate() + days);
    const newStr = current.toISOString().split('T')[0];
    setCustomDate(newStr);
    setCustomDateInput(newStr);
    setDateFilter('CUSTOM');
  };

  // Helper to determine game live / over / upcoming status
  const getBookingLiveStatus = (b: Booking) => {
    if (b.bookingStatus === 'CANCELLED') return 'CANCELLED';
    if (b.isNoShow) return 'NOSHOW';

    const bookingDate = b.date;
    const now = new Date();
    const curHours = now.getHours().toString().padStart(2, '0');
    const curMins = now.getMinutes().toString().padStart(2, '0');
    const curTime = `${curHours}:${curMins}`;

    const isPendingPayment = (b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID';

    if (bookingDate < todayStr) {
      // Past day
      return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
    } else if (bookingDate > todayStr) {
      // Future day
      return isPendingPayment ? 'UPCOMING_UNPAID' : 'UPCOMING';
    } else {
      // Today: calculate accurate minutes to handle 12-hour AM/PM and 24-hour time strings
      const parseTimeToMinutes = (tStr?: string) => {
        if (!tStr) return 0;
        const clean = tStr.trim();
        const parts = clean.split(' ');
        const timePart = parts[0];
        const ampm = parts[1]?.toUpperCase();
        const [hStr, mStr] = timePart.split(':');
        let h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      const curMinutes = now.getHours() * 60 + now.getMinutes();
      const startMin = parseTimeToMinutes(b.startTime || '00:00');
      const endMin = parseTimeToMinutes(b.endTime || '23:59');
      if (curMinutes >= endMin) {
        return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
      } else if (curMinutes >= startMin && curMinutes < endMin) {
        return 'LIVE';
      } else {
        return isPendingPayment ? 'UPCOMING_UNPAID' : 'UPCOMING';
      }
    }
  };

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      const matchesSearch =
        b.playerName.toLowerCase().includes(search.toLowerCase()) ||
        b.playerPhone?.includes(search) ||
        b.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
        b.turfName?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Date Filter
      if (dateFilter === 'TODAY' && b.date !== todayStr) return false;
      if (dateFilter === 'YESTERDAY' && b.date !== yesterdayStr) return false;
      if (dateFilter === 'TOMORROW' && b.date !== tomorrowStr) return false;
      if (dateFilter === 'PAST' && b.date >= todayStr) return false;
      if (dateFilter === 'CUSTOM' && b.date !== customDate) return false;

      // Status Filter
      const timing = getBookingLiveStatus(b);
      if (statusFilter === 'LIVE' && timing !== 'LIVE') return false;
      if (statusFilter === 'PAST' && timing !== 'GAME_OVER' && timing !== 'OVER_UNPAID') return false;
      if (statusFilter === 'UNPAID') {
        if (b.bookingStatus === 'CANCELLED') return false;
        if ((b.amountDue || 0) <= 0 && b.paymentStatus === 'PAID') return false;
      }
      if (statusFilter === 'NOSHOW' && !b.isNoShow) return false;
      if (statusFilter === 'CANCELLED' && b.bookingStatus !== 'CANCELLED') return false;

      // Booking Source Filter: Individual Booking vs Lobby Hosted Match
      if (bookingSourceFilter === 'INDIVIDUAL' && isLobbyBooking(b)) return false;
      if (bookingSourceFilter === 'LOBBY' && !isLobbyBooking(b)) return false;

      return true;
    });
  }, [bookings, search, dateFilter, statusFilter, bookingSourceFilter, customDate, todayStr, yesterdayStr, tomorrowStr]);

  // Counts for pills
  const counts = useMemo(() => {
    let live = 0;
    let past = 0;
    let unpaid = 0;
    let noShows = 0;
    let cancelled = 0;
    let individual = 0;
    let lobby = 0;

    bookings.forEach((b) => {
      const timing = getBookingLiveStatus(b);
      if (timing === 'LIVE') live++;
      if (timing === 'GAME_OVER' || timing === 'OVER_UNPAID') past++;
      if (b.bookingStatus !== 'CANCELLED' && ((b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID')) unpaid++;
      if (b.isNoShow) noShows++;
      if (b.bookingStatus === 'CANCELLED') cancelled++;
      if (isLobbyBooking(b)) {
        lobby++;
      } else {
        individual++;
      }
    });

    return { total: bookings.length, live, past, unpaid, noShows, cancelled, individual, lobby };
  }, [bookings]);

  return (
    <View style={styles.container}>
      {/* Search and Date Controls Header */}
      <View style={styles.headerArea}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search athlete, phone, or booking ID..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Selection Bar */}
        <View style={styles.dateSelectorContainer}>
          <Text style={styles.sectionLabel}>Select Date View:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'ALL', label: 'All Dates' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'TOMORROW', label: 'Tomorrow' },
              { id: 'PAST', label: 'Past Days' },
              { id: 'CUSTOM', label: dateFilter === 'CUSTOM' ? `📅 ${customDate}` : '📅 Pick Date' },
            ]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.datePillsRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.datePill,
                  dateFilter === item.id && styles.datePillActive,
                ]}
                onPress={() => {
                  if (item.id === 'CUSTOM') {
                    setShowCustomDateModal(true);
                  } else {
                    setDateFilter(item.id as DateFilterMode);
                  }
                }}
              >
                <Text
                  style={[
                    styles.datePillText,
                    dateFilter === item.id && styles.datePillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Stepper if CUSTOM date is active */}
          {dateFilter === 'CUSTOM' && (
            <View style={styles.customDateStepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => shiftCustomDate(-1)}
              >
                <ChevronLeft size={16} color="#38bdf8" />
                <Text style={styles.stepperBtnText}>Prev Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.currentDateDisplay}
                onPress={() => setShowCustomDateModal(true)}
              >
                <Calendar size={13} color="#38bdf8" />
                <Text style={styles.currentDateDisplayText}>{customDate}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => shiftCustomDate(1)}
              >
                <Text style={styles.stepperBtnText}>Next Day</Text>
                <ChevronRight size={16} color="#38bdf8" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Status Filter Chips with Counts */}
        <View style={styles.statusFilterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'ALL', label: `All (${filteredBookings.length})` },
              { id: 'LIVE', label: `Live (${counts.live})` },
              { id: 'PAST', label: `Past (${counts.past})` },
              { id: 'UNPAID', label: `Pending Dues (${counts.unpaid})` },
              { id: 'NOSHOW', label: `No-Shows (${counts.noShows})` },
              { id: 'CANCELLED', label: `Cancelled ✕ (${counts.cancelled})` },
            ]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === item.id && styles.filterChipActive,
                  item.id === 'LIVE' && statusFilter === 'LIVE' && styles.filterChipLiveActive,
                  item.id === 'UNPAID' && statusFilter === 'UNPAID' && styles.filterChipUnpaidActive,
                  item.id === 'CANCELLED' && statusFilter === 'CANCELLED' && styles.filterChipCancelledActive,
                ]}
                onPress={() => setStatusFilter(item.id as StatusFilterMode)}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === item.id && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Booking Source Filter: Individual vs Lobby Hosted Match */}
        <View style={styles.sourceFilterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'ALL', label: `All Match Types (${filteredBookings.length})` },
              { id: 'INDIVIDUAL', label: `👤 Individual (${counts.individual})` },
              { id: 'LOBBY', label: `🏆 Lobby Match (${counts.lobby})` },
            ]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.sourceFilterRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sourceChip,
                  bookingSourceFilter === item.id && styles.sourceChipActive,
                  item.id === 'INDIVIDUAL' && bookingSourceFilter === 'INDIVIDUAL' && styles.sourceChipIndividualActive,
                  item.id === 'LOBBY' && bookingSourceFilter === 'LOBBY' && styles.sourceChipLobbyActive,
                ]}
                onPress={() => setBookingSourceFilter(item.id as BookingSourceFilter)}
              >
                <Text
                  style={[
                    styles.sourceChipText,
                    bookingSourceFilter === item.id && styles.sourceChipTextActive,
                    item.id === 'INDIVIDUAL' && bookingSourceFilter === 'INDIVIDUAL' && styles.sourceChipTextIndividualActive,
                    item.id === 'LOBBY' && bookingSourceFilter === 'LOBBY' && styles.sourceChipTextLobbyActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCancelled = item.bookingStatus === 'CANCELLED';
          const isNoShow = item.isNoShow;
          const isLobby = isLobbyBooking(item);
          const advancePaid = item.amountPaid || 0;
          const dueAmount = item.amountDue || 0;
          const timingStatus = getBookingLiveStatus(item);

          // Card theme selection based on requirements:
          // 1. Canceled -> Just a Cross (✕) in the status box
          // 2. Game is Over -> marked as Red
          // 3. Game is Live -> marked as Green
          // 4. Payment Pending & Game Over -> marked as Yellow
          const isLive = timingStatus === 'LIVE';
          const isGameOver = timingStatus === 'GAME_OVER';
          const isGameOverUnpaid = timingStatus === 'OVER_UNPAID';

          return (
            <View
              style={[
                styles.card,
                isLive && styles.cardLive,
                isGameOver && styles.cardGameOver,
                isGameOverUnpaid && styles.cardGameOverUnpaid,
                isCancelled && styles.cardCancelled,
                isNoShow && styles.cardNoShow,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.playerName}>{item.playerName}</Text>
                    {isLive && (
                      <View style={styles.livePulseBadge}>
                        <Text style={styles.livePulseText}>● LIVE</Text>
                      </View>
                    )}
                  </View>

                  {/* Booking Source Tag: Lobby Match vs Individual Booking */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
                    {isLobby ? (
                      <View style={styles.lobbyMatchBadge}>
                        <Trophy size={11} color="#c084fc" />
                        <Text style={styles.lobbyMatchBadgeText}>LOBBY MATCH • HOST: {item.playerName}</Text>
                      </View>
                    ) : (
                      <View style={styles.individualMatchBadge}>
                        <User size={11} color="#38bdf8" />
                        <Text style={styles.individualMatchBadgeText}>
                          {item.bookingType === 'MANUAL' || item.bookingType === 'OWNER' ? 'VENUE DESK / WALK-IN' : 'INDIVIDUAL BOOKING'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.arenaName}>
                    {item.turfName} • {item.arenaName}
                  </Text>
                </View>

                {/* Status Indicator Box */}
                {isCancelled ? (
                  /* Requirement 1: In bookings when canceled don't show cancel sign just put cross in that box */
                  <View style={styles.crossBox} accessibilityLabel="Booking Cancelled">
                    <X size={18} color="#ef4444" strokeWidth={3} />
                  </View>
                ) : isNoShow ? (
                  <View style={styles.statusNoShowBadge}>
                    <UserX size={12} color="#f87171" />
                    <Text style={styles.statusNoShowText}>NO SHOW</Text>
                  </View>
                ) : isLive ? (
                  /* Requirement 1: when game is live mark as green */
                  <View style={styles.statusLiveBadge}>
                    <Text style={styles.statusLiveText}>● LIVE GAME</Text>
                  </View>
                ) : isGameOverUnpaid ? (
                  /* Requirement 1: payment pending game over yellow color */
                  <View style={styles.statusGameOverUnpaidBadge}>
                    <AlertTriangle size={12} color="#eab308" />
                    <Text style={styles.statusGameOverUnpaidText}>GAME OVER • DUE ₹{dueAmount}</Text>
                  </View>
                ) : isGameOver ? (
                  /* Requirement 1: when the game is over that slot card mark as red */
                  <View style={styles.statusGameOverBadge}>
                    <Text style={styles.statusGameOverText}>GAME OVER</Text>
                  </View>
                ) : (
                  /* Standard / Upcoming */
                  <View
                    style={[
                      styles.statusBadge,
                      item.paymentStatus === 'PAID' ? styles.statusPaid : styles.statusPartial,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.paymentStatus === 'PAID' ? styles.statusTextPaid : styles.statusTextPartial,
                      ]}
                    >
                      {item.paymentStatus === 'PAID' ? 'PAID' : `DUE ₹${dueAmount}`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Schedule and Venue Meta */}
              <View style={styles.metaRow}>
                <Calendar size={13} color="#94a3b8" />
                <Text style={styles.metaText}>
                  {item.date} ({item.startTime} - {item.endTime})
                </Text>
              </View>

              <View style={styles.metaRow}>
                <CreditCard size={13} color="#94a3b8" />
                <Text style={styles.metaText}>
                  Total: ₹{item.totalAmount} (Paid: ₹{advancePaid} • Due: ₹{dueAmount})
                </Text>
              </View>

              {/* Penalty Notice */}
              {isNoShow && item.noShowPenaltyAmount && (
                <View style={styles.noShowBanner}>
                  <UserX size={13} color="#ef4444" />
                  <Text style={styles.noShowBannerText}>
                    No-Show Penalty Applied: ₹{item.noShowPenaltyAmount}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                {/* Roster / Ledger Button (Lobbies Only) */}
                {isLobby && (
                  <TouchableOpacity
                    style={styles.rosterActionBtn}
                    onPress={() => handleOpenRoster(item)}
                  >
                    <Users size={13} color="#c084fc" />
                    <Text style={styles.rosterActionBtnText}>Roster / Ledger</Text>
                  </TouchableOpacity>
                )}

                {!!item.playerPhone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${item.playerPhone}`)}
                  >
                    <Phone size={13} color="#38bdf8" />
                    <Text style={styles.callText}>Call</Text>
                  </TouchableOpacity>
                )}

                {!!item.playerPhone && (
                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => {
                      if (!canAccess('whatsappNotifications')) {
                        Alert.alert(
                          'Pro SaaS Feature',
                          'Instant WhatsApp match passes require a Pro SaaS plan. Upgrade your subscription to send automated WhatsApp tickets.'
                        );
                        return;
                      }
                      openWhatsAppNotification(item, item.playerPhone, 'OWNER');
                    }}
                  >
                    <MessageSquare size={13} color={canAccess('whatsappNotifications') ? '#25D366' : '#94a3b8'} />
                    <Text style={styles.whatsappText}>Pass</Text>
                    {!canAccess('whatsappNotifications') && <Lock size={10} color="#f59e0b" style={{ marginLeft: 2 }} />}
                  </TouchableOpacity>
                )}

                {!isCancelled && !isNoShow && (
                  <TouchableOpacity
                    style={styles.noShowActionBtn}
                    onPress={() => {
                      setBookingForNoShow(item);
                      setNoShowPenalty('200');
                    }}
                  >
                    <UserX size={13} color="#f87171" />
                    <Text style={styles.noShowActionText}>Mark No-Show</Text>
                  </TouchableOpacity>
                )}

                {!isCancelled && dueAmount > 0 && (
                  <TouchableOpacity
                    style={styles.markPaidBtn}
                    onPress={() => handleCollectBookingDue(item)}
                  >
                    <CheckCircle size={13} color="#064e3b" />
                    <Text style={styles.markPaidText}>Collect ₹{dueAmount}</Text>
                  </TouchableOpacity>
                )}

                {!isCancelled && timingStatus !== 'GAME_OVER' && timingStatus !== 'OVER_UNPAID' && (
                  <TouchableOpacity
                    style={styles.cancelSlotBtn}
                    onPress={() => {
                      setBookingToCancel(item);
                    }}
                  >
                    <Ban size={13} color="#ef4444" />
                    <Text style={styles.cancelSlotBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Calendar size={42} color="#64748b" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptyDesc}>
              No match slots found for the selected date and status filters.
            </Text>
          </View>
        }
      />

      {/* Floating Add Walk-in */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowManualModal(true)}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#064e3b" />
        <Text style={styles.fabText}>Add Walk-in</Text>
      </TouchableOpacity>

      {/* Custom Date Picker Modal */}
      <Modal visible={showCustomDateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.customDateModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#38bdf8" />
                <Text style={styles.modalTitle}>Choose Specific Date</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Enter Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={customDateInput}
              onChangeText={setCustomDateInput}
              placeholder="e.g. 2026-08-27"
              placeholderTextColor="#64748b"
            />

            <View style={styles.quickDateSuggestionsRow}>
              {[
                { label: 'Today', val: todayStr },
                { label: 'Yesterday', val: yesterdayStr },
                { label: 'Tomorrow', val: tomorrowStr },
              ].map((q) => (
                <TouchableOpacity
                  key={q.label}
                  style={styles.quickDateSuggestionBtn}
                  onPress={() => setCustomDateInput(q.val)}
                >
                  <Text style={styles.quickDateSuggestionText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyDateBtn}
              onPress={() => {
                setCustomDate(customDateInput.trim());
                setDateFilter('CUSTOM');
                setShowCustomDateModal(false);
              }}
            >
              <Text style={styles.applyDateBtnText}>Apply Date Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Roster & Match Ledger Modal */}
      <Modal
        visible={!!selectedRosterBooking}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRosterBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rosterModalCard}>
            {selectedRosterBooking && (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isLobbyBooking(selectedRosterBooking) ? (
                        <>
                          <Trophy size={16} color="#c084fc" />
                          <Text style={[styles.modalTitle, { color: '#c084fc' }]}>
                            Lobby Match Roster & Ledger
                          </Text>
                        </>
                      ) : (
                        <>
                          <User size={16} color="#38bdf8" />
                          <Text style={[styles.modalTitle, { color: '#38bdf8' }]}>
                            Individual Booking Ledger
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.rosterModalSub}>
                      {selectedRosterBooking.turfName} • {selectedRosterBooking.arenaName} ({selectedRosterBooking.sport})
                    </Text>
                    <Text style={styles.rosterModalDate}>
                      📅 {selectedRosterBooking.date} ({selectedRosterBooking.startTime} - {selectedRosterBooking.endTime})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedRosterBooking(null)}
                  >
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Financial Summary Strip */}
                <View style={styles.rosterFinancialStrip}>
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>SLOT VALUE</Text>
                    <Text style={styles.financialVal}>₹{selectedRosterBooking.totalAmount}</Text>
                  </View>
                  <View style={styles.financialDivider} />
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>COLLECTED</Text>
                    <Text style={[styles.financialVal, { color: '#10b981' }]}>
                      ₹{selectedRosterBooking.amountPaid || 0}
                    </Text>
                  </View>
                  <View style={styles.financialDivider} />
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>DUE AT TURF</Text>
                    <Text
                      style={[
                        styles.financialVal,
                        { color: (selectedRosterBooking.amountDue || 0) > 0 ? '#fbbf24' : '#94a3b8' },
                      ]}
                    >
                      ₹{selectedRosterBooking.amountDue || 0}
                    </Text>
                  </View>
                </View>

                {/* Roster / Players Content */}
                {isLobbyBooking(selectedRosterBooking) ? (
                  /* Case 1: Community Match Lobby Roster */
                  loadingRoster ? (
                    <View style={styles.rosterLoadingBox}>
                      <ActivityIndicator size="small" color="#c084fc" />
                      <Text style={styles.rosterLoadingText}>Loading lobby players...</Text>
                    </View>
                  ) : rosterPlayers.length > 0 ? (
                    <FlatList
                      data={rosterPlayers}
                      keyExtractor={(p, idx) => p.id || p.uid || String(idx)}
                      style={{ maxHeight: 340 }}
                      contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                      renderItem={({ item: p }) => {
                        const pDue = p.amountDue ?? (p.paymentStatus === 'PAID' ? 0 : 0);
                        const isSettled = p.paymentStatus === 'PAID' || pDue === 0;

                        return (
                          <View style={styles.rosterPlayerItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={styles.rosterAvatar}>
                                <Text style={styles.rosterAvatarText}>
                                  {p.playerName ? p.playerName[0].toUpperCase() : 'P'}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.rosterPlayerName}>{p.playerName}</Text>
                                  {p.isHost && (
                                    <View style={styles.hostBadge}>
                                      <Text style={styles.hostBadgeText}>HOST</Text>
                                    </View>
                                  )}
                                </View>
                                {!!p.playerPhone && (
                                  <Text style={styles.rosterPlayerPhone}>📱 {p.playerPhone}</Text>
                                )}
                                <Text style={styles.rosterPlayerMeta}>
                                  {p.preferredSport || selectedRosterBooking.sport} • {p.skillLevel || 'Athlete'}
                                </Text>
                              </View>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text style={styles.rosterPlayerPaid}>
                                Paid: ₹{p.amountPaid || 0}
                              </Text>
                              {pDue > 0 ? (
                                <TouchableOpacity
                                  style={styles.rosterCollectBtn}
                                  onPress={() => handleCollectPlayerDue(selectedRosterBooking, p, pDue)}
                                >
                                  <Text style={styles.rosterCollectBtnText}>Collect ₹{pDue}</Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.rosterSettledBadge}>
                                  <Check size={10} color="#10b981" />
                                  <Text style={styles.rosterSettledText}>Settled</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      }}
                    />
                  ) : (
                    <View style={styles.rosterEmptyBox}>
                      <Text style={styles.rosterEmptyTitle}>
                        Match Hosted by {selectedRosterBooking.playerName}
                      </Text>
                      <Text style={styles.rosterEmptyDesc}>
                        Lobby ID: {selectedRosterBooking.lobbyId || selectedRosterBooking.bookingId || 'Community Match'}
                      </Text>
                      <Text style={[styles.rosterEmptyDesc, { marginTop: 4 }]}>
                        Paid online: ₹{selectedRosterBooking.amountPaid || 0} | Pending due: ₹
                        {selectedRosterBooking.amountDue || 0}
                      </Text>
                    </View>
                  )
                ) : (
                  /* Case 2: Individual Booking */
                  <View style={{ maxHeight: 340, gap: 10, paddingVertical: 6 }}>
                    <View style={styles.rosterPlayerItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.rosterAvatar, { backgroundColor: '#0284c7' }]}>
                          <Text style={styles.rosterAvatarText}>
                            {selectedRosterBooking.playerName ? selectedRosterBooking.playerName[0].toUpperCase() : 'B'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.rosterPlayerName}>{selectedRosterBooking.playerName}</Text>
                            <View style={[styles.hostBadge, { backgroundColor: '#0284c720', borderColor: '#38bdf840' }]}>
                              <Text style={[styles.hostBadgeText, { color: '#38bdf8' }]}>PRIMARY BOOKER</Text>
                            </View>
                          </View>
                          {!!selectedRosterBooking.playerPhone && (
                            <Text style={styles.rosterPlayerPhone}>📱 {selectedRosterBooking.playerPhone}</Text>
                          )}
                          <Text style={styles.rosterPlayerMeta}>
                            Headcount: {selectedRosterBooking.numberOfPlayers || 1} Players
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.rosterPlayerPaid}>
                          Paid: ₹{selectedRosterBooking.amountPaid || 0}
                        </Text>
                        {(selectedRosterBooking.amountDue || 0) > 0 ? (
                          <TouchableOpacity
                            style={styles.rosterCollectBtn}
                            onPress={() => {
                              handleCollectBookingDue(selectedRosterBooking);
                              setSelectedRosterBooking(null);
                            }}
                          >
                            <Text style={styles.rosterCollectBtnText}>
                              Collect ₹{selectedRosterBooking.amountDue}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.rosterSettledBadge}>
                            <Check size={10} color="#10b981" />
                            <Text style={styles.rosterSettledText}>Settled</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Split partners if any */}
                    {selectedRosterBooking.splitWith && selectedRosterBooking.splitWith.length > 0 && (
                      <FlatList
                        data={selectedRosterBooking.splitWith}
                        keyExtractor={(_, idx) => String(idx)}
                        renderItem={({ item: sp, index }) => (
                          <View style={[styles.rosterPlayerItem, { marginTop: 6 }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.rosterPlayerName}>{sp.name || `Split Player #${index + 1}`}</Text>
                              <Text style={styles.rosterPlayerMeta}>
                                Share: ₹{sp.shareAmount || 0} • Status: {sp.isPaid ? 'Paid' : 'Pending'}
                              </Text>
                            </View>
                          </View>
                        )}
                      />
                    )}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.rosterCloseBtn}
                  onPress={() => setSelectedRosterBooking(null)}
                >
                  <Text style={styles.rosterCloseBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* No-Show Penalty Modal */}
      <Modal visible={!!bookingForNoShow} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.noShowModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserX size={20} color="#ef4444" />
                <Text style={styles.cancelModalTitle}>Enforce No-Show Penalty</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingForNoShow(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelModalNotice}>
              Marking <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>{bookingForNoShow?.playerName}</Text> as absent will release the slot and automatically attach a penalty fee to their player dues ledger.
            </Text>

            <View style={styles.nestedInputBox}>
              <Text style={styles.label}>No-Show Penalty Fee (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="200"
                placeholderTextColor="#64748b"
                value={noShowPenalty}
                onChangeText={setNoShowPenalty}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmNoShowBtn, markingNoShow && styles.disabledBtn]}
              disabled={markingNoShow}
              onPress={handleConfirmNoShow}
            >
              {markingNoShow ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmNoShowBtnText}>Apply Penalty & Mark Absent</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepSlotBtn}
              onPress={() => setBookingForNoShow(null)}
            >
              <Text style={styles.keepSlotBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel Slot Modal for Owner */}
      <Modal visible={!!bookingToCancel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalCard}>
            {cancelSuccessMsg ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <CheckCircle size={48} color="#10b981" />
                <Text style={styles.cancelSuccessTitle}>Slot Released</Text>
                <Text style={styles.cancelSuccessSub}>{cancelSuccessMsg}</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.cancelModalTitle}>Cancel Ground Slot?</Text>
                  </View>
                  <TouchableOpacity onPress={() => setBookingToCancel(null)}>
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cancelModalNotice}>
                  Cancelling this slot will instantly make it available for other players and reverse or refund any dues.
                </Text>

                <View style={styles.cancelTurfSummary}>
                  <Text style={styles.cancelTurfName}>
                    {bookingToCancel?.playerName} • {bookingToCancel?.turfName}
                  </Text>
                  <Text style={styles.cancelTurfMeta}>
                    {bookingToCancel?.date} • {bookingToCancel?.startTime} - {bookingToCancel?.endTime}
                  </Text>
                </View>

                <TextInput
                  style={styles.cancelReasonInput}
                  placeholder="Reason for cancellation (e.g. Ground maintenance)"
                  placeholderTextColor="#64748b"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />

                <TouchableOpacity
                  style={[styles.confirmCancelBtn, cancelling && styles.disabledBtn]}
                  disabled={cancelling}
                  onPress={handleOwnerConfirmCancel}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>Yes, Cancel & Release</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keepSlotBtn}
                  onPress={() => setBookingToCancel(null)}
                >
                  <Text style={styles.keepSlotBtnText}>Keep Booking</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Walk-in Counter Desk Booking Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', paddingBottom: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: '#0284c7', padding: 6, borderRadius: 8 }}>
                  <Zap size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Walk-in Counter Desk</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '600' }}>Instant Firebase Slot Lock & Ledger Entry</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowManualModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* 1. Venue & Pitch Picker */}
              <View>
                <Text style={styles.label}>1. Select Venue & Pitch</Text>
                {turfs.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {turfs.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.miniChip, selectedTurf?.id === t.id && styles.miniChipActive]}
                          onPress={() => setSelectedTurf(t)}
                        >
                          <Text style={[styles.miniChipText, selectedTurf?.id === t.id && styles.miniChipTextActive]}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {arenas.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.pitchChip, selectedArena?.id === a.id && styles.pitchChipActive]}
                      onPress={() => {
                        setSelectedArena(a);
                        if (a.basePrice) setAmount(a.basePrice.toString());
                      }}
                    >
                      <Text style={[styles.pitchChipText, selectedArena?.id === a.id && styles.pitchChipTextActive]}>{a.name} ({a.sport})</Text>
                      <Text style={{ fontSize: 10, color: selectedArena?.id === a.id ? '#e0f2fe' : '#64748b' }}>₹{a.basePrice || 1500}/hr</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Date Quick Selector */}
              <View>
                <Text style={styles.label}>2. Booking Date</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                  <TouchableOpacity
                    style={[styles.datePresetBtn, date === new Date().toISOString().split('T')[0] && styles.datePresetBtnActive]}
                    onPress={() => handleDatePreset('TODAY')}
                  >
                    <Text style={[styles.datePresetText, date === new Date().toISOString().split('T')[0] && styles.datePresetTextActive]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.datePresetBtn,
                      date === new Date(Date.now() + 86400000).toISOString().split('T')[0] && styles.datePresetBtnActive
                    ]}
                    onPress={() => handleDatePreset('TOMORROW')}
                  >
                    <Text style={[
                      styles.datePresetText,
                      date === new Date(Date.now() + 86400000).toISOString().split('T')[0] && styles.datePresetTextActive
                    ]}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.datePresetBtn,
                      date === new Date(Date.now() + 172800000).toISOString().split('T')[0] && styles.datePresetBtnActive
                    ]}
                    onPress={() => handleDatePreset('DAY_AFTER')}
                  >
                    <Text style={[
                      styles.datePresetText,
                      date === new Date(Date.now() + 172800000).toISOString().split('T')[0] && styles.datePresetTextActive
                    ]}>Day After</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={(val) => {
                    setDate(val);
                    setSelectedSlot(null);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* 3. Slot Picker from Firebase */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.label}>3. Select Slot (Live Firebase)</Text>
                  <TouchableOpacity onPress={() => setIsCustomTime(!isCustomTime)}>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>
                      {isCustomTime ? 'Select From Slots' : '+ Custom Time'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isCustomTime ? (
                  availableSlots.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {availableSlots.map((s) => {
                          const isBooked = s.status !== 'AVAILABLE' && s.status !== 'FREE';
                          const isSelected = selectedSlot?.id === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              disabled={isBooked}
                              style={[
                                styles.slotBadgeCard,
                                isSelected && styles.slotBadgeCardSelected,
                                isBooked && styles.slotBadgeCardBooked,
                              ]}
                              onPress={() => handleSelectSlot(s)}
                            >
                              <Text style={[styles.slotBadgeTime, isSelected && { color: '#ffffff' }, isBooked && { color: '#94a3b8' }]}>
                                {s.startTime} - {s.endTime}
                              </Text>
                              <Text style={[styles.slotBadgeStatus, isSelected && { color: '#e0f2fe' }, isBooked && { color: '#ef4444' }]}>
                                {isBooked ? '🔴 Booked' : `🟢 ₹${s.price || amount}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  ) : (
                    <View style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>No pre-configured slot templates for this date. Enter custom time below:</Text>
                    </View>
                  )
                ) : null}

                {(isCustomTime || availableSlots.length === 0) && (
                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.label}>Start Time</Text>
                      <TextInput
                        style={styles.input}
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="18:00"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>End Time</Text>
                      <TextInput
                        style={styles.input}
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="19:00"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Player Details */}
              <View>
                <Text style={styles.label}>4. Guest Information</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Player Name (or 'Walk-in Guest')"
                      placeholderTextColor="#64748b"
                      value={playerName}
                      onChangeText={setPlayerName}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone (Optional)"
                      placeholderTextColor="#64748b"
                      value={playerPhone}
                      onChangeText={setPlayerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              {/* 5. Payment Selection & AI Upgrade Engine */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>5. Payment Status</Text>

                {/* Status Selection Cards */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {/* FULL PAID */}
                  <TouchableOpacity
                    style={[
                      styles.payOptionCard,
                      { flex: 1, padding: 10, alignItems: 'center' },
                      paymentOption === 'FULL_PAID' && styles.payOptionCardActivePaid
                    ]}
                    onPress={() => handlePaymentOptionChange('FULL_PAID')}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>🟢</Text>
                    <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 12 }}>FULL PAID</Text>
                    <Text style={{ color: paymentOption === 'FULL_PAID' ? '#34d399' : '#64748b', fontSize: 10, fontWeight: '700', marginTop: 2 }}>₹{amount} Recv</Text>
                  </TouchableOpacity>

                  {/* PARTIAL */}
                  <TouchableOpacity
                    style={[
                      styles.payOptionCard,
                      { flex: 1, padding: 10, alignItems: 'center' },
                      paymentOption === 'PARTIAL' && styles.payOptionCardActivePartial
                    ]}
                    onPress={() => handlePaymentOptionChange('PARTIAL')}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>🟡</Text>
                    <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 12 }}>PARTIAL</Text>
                    <Text style={{ color: paymentOption === 'PARTIAL' ? '#fbbf24' : '#64748b', fontSize: 10, fontWeight: '700', marginTop: 2 }}>₹{amountPaid} Recv</Text>
                  </TouchableOpacity>

                  {/* DUE */}
                  <TouchableOpacity
                    style={[
                      styles.payOptionCard,
                      { flex: 1, padding: 10, alignItems: 'center' },
                      paymentOption === 'UNPAID' && styles.payOptionCardActiveDue
                    ]}
                    onPress={() => handlePaymentOptionChange('UNPAID')}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>🔴</Text>
                    <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 12 }}>100% DUE</Text>
                    <Text style={{ color: paymentOption === 'UNPAID' ? '#f87171' : '#64748b', fontSize: 10, fontWeight: '700', marginTop: 2 }}>₹{amount} Due</Text>
                  </TouchableOpacity>
                </View>

                {/* Pitch Price & Paid Customizer */}
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Pitch Price (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={(val) => {
                        setAmount(val);
                        if (paymentOption === 'FULL_PAID') setAmountPaid(val);
                        if (paymentOption === 'UNPAID') setAmountPaid('0');
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Paid Amount (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {paymentOption !== 'UNPAID' && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>Counter Collection Mode</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View
                        style={[styles.payMethodBtn, styles.payMethodBtnActive, { flex: 1 }]}
                      >
                        <Text style={[styles.payMethodBtnText, styles.payMethodBtnTextActive]}>💵 Counter Cash Collection</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Summary Card */}
              <View style={styles.summaryBox}>
                <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 12, marginBottom: 4 }}>⚡ Booking Summary</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  • {selectedTurf?.name} ({selectedArena?.name})
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  • Date & Time: {date} @ {startTime} - {endTime}
                </Text>
                <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                  • Total: ₹{amount} | Paid: ₹{amountPaid} ({paymentOption !== 'UNPAID' ? paymentMethod : 'DUE'}) | Due: ₹{Math.max(0, (parseFloat(amount) || 0) - (parseFloat(amountPaid) || 0))}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.createBtn, creating && styles.disabledBtn]}
                onPress={handleCreateWalkIn}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.createBtnText}>⚡ Confirm Walk-in & Lock Slot</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  headerArea: {
    backgroundColor: '#0f172a',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
  },
  dateSelectorContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  datePillsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  datePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  datePillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  datePillTextActive: {
    color: '#ffffff',
  },
  customDateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  currentDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentDateDisplayText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  statusFilterContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  filterChipLiveActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  filterChipUnpaidActive: {
    backgroundColor: '#ca8a04',
    borderColor: '#eab308',
  },
  filterChipCancelledActive: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  // Card styles with requirement colors
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLive: {
    borderColor: '#10b981',
    borderWidth: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  cardGameOver: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  cardGameOverUnpaid: {
    borderColor: '#eab308',
    borderWidth: 1.5,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
  },
  cardCancelled: {
    borderColor: '#334155',
    opacity: 0.65,
    backgroundColor: '#0b0f19',
  },
  cardNoShow: {
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  arenaName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  livePulseBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  livePulseText: {
    color: '#064e3b',
    fontSize: 9,
    fontWeight: '900',
  },
  // Status Boxes
  crossBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusPartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  statusLiveBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusLiveText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '900',
  },
  statusGameOverBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusGameOverText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
  },
  statusGameOverUnpaidBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.18)',
    borderWidth: 1,
    borderColor: '#eab308',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusGameOverUnpaidText: {
    color: '#fef08a',
    fontSize: 10,
    fontWeight: '800',
  },
  statusNoShowBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusNoShowText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextPaid: {
    color: '#10b981',
  },
  statusTextPartial: {
    color: '#f59e0b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  noShowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  noShowBannerText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  whatsappText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#25D366',
  },
  noShowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noShowActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f87171',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markPaidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064e3b',
  },
  cancelSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelSlotBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064e3b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customDateModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  noShowModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  input: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  nestedInputBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  createBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmNoShowBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmNoShowBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cancelModalNotice: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
    marginBottom: 12,
  },
  cancelTurfSummary: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cancelTurfName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cancelTurfMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cancelReasonInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  confirmCancelBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmCancelBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  keepSlotBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  keepSlotBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  cancelSuccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 10,
  },
  cancelSuccessSub: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 6,
  },
  quickDateSuggestionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickDateSuggestionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    alignItems: 'center',
  },
  quickDateSuggestionText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  applyDateBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyDateBtnText: {
    color: '#0c1220',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  // Source Filter Pills
  sourceFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sourceFilterRow: {
    gap: 8,
  },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0a0f1d',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sourceChipActive: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f6',
  },
  sourceChipIndividualActive: {
    backgroundColor: '#0284c725',
    borderColor: '#38bdf8',
  },
  sourceChipLobbyActive: {
    backgroundColor: '#9333ea25',
    borderColor: '#c084fc',
  },
  sourceChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sourceChipTextIndividualActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  sourceChipTextLobbyActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  // Badges
  lobbyMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#581c8730',
    borderColor: '#c084fc40',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  lobbyMatchBadgeText: {
    color: '#c084fc',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  individualMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0369a120',
    borderColor: '#38bdf840',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  individualMatchBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Actions
  rosterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#581c8725',
    borderColor: '#c084fc40',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rosterActionBtnText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  // Roster Modal
  rosterModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  rosterModalSub: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 3,
  },
  rosterModalDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  modalCloseBtn: {
    padding: 4,
  },
  rosterFinancialStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  financialCol: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  financialVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  financialDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
  },
  rosterLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 30,
  },
  rosterLoadingText: {
    fontSize: 12,
    color: '#c084fc',
    fontWeight: '600',
  },
  rosterPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b50',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  rosterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7e22ce',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  rosterPlayerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  hostBadge: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b40',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#f59e0b',
    fontSize: 8,
    fontWeight: '800',
  },
  rosterPlayerPhone: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
    fontFamily: 'monospace',
  },
  rosterPlayerMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  rosterPlayerPaid: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  rosterCollectBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rosterCollectBtnText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
  },
  rosterSettledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rosterSettledText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  rosterEmptyBox: {
    padding: 16,
    backgroundColor: '#1e1b4b30',
    borderColor: '#4338ca40',
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 8,
  },
  rosterEmptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  rosterEmptyDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  rosterCloseBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  rosterCloseBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  // Walk-in Counter Desk Enhanced Styles
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  miniChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  miniChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pitchChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pitchChipActive: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  pitchChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  pitchChipTextActive: {
    color: '#ffffff',
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  datePresetBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  datePresetText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  datePresetTextActive: {
    color: '#ffffff',
  },
  slotBadgeCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    minWidth: 100,
  },
  slotBadgeCardSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  slotBadgeCardBooked: {
    backgroundColor: '#1e293b40',
    borderColor: '#334155',
    opacity: 0.6,
  },
  slotBadgeTime: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  slotBadgeStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  payOptionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  payOptionCardActivePaid: {
    backgroundColor: '#022c22',
    borderColor: '#10b981',
  },
  payOptionCardActivePartial: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  payOptionCardActiveDue: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  payRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
  },
  payRadioDotPaid: {
    backgroundColor: '#10b981',
    borderColor: '#34d399',
  },
  payRadioDotPartial: {
    backgroundColor: '#f59e0b',
    borderColor: '#fbbf24',
  },
  payRadioDotDue: {
    backgroundColor: '#ef4444',
    borderColor: '#f87171',
  },
  payMethodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  payMethodBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  payMethodBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  payMethodBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  summaryBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
});
