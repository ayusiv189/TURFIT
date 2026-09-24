import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerSubscription } from '../../contexts/OwnerSubscriptionContext';
import {
  getOwnerTurfs,
  getOwnerBookings,
  isLobbyBooking,
  collectCounterDueForBooking,
} from '../../services/dbService';
import { Turf, Booking } from '../../types';
import {
  TrendingUp,
  Calendar,
  Users,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  CreditCard,
  Building,
  X,
  AlertTriangle,
  Trophy,
  Lock,
  Sparkles,
  ShieldAlert,
  Tag,
  Search,
  Phone,
  DollarSign,
  ChevronRight,
  Zap,
  Check,
  Filter,
  SlidersHorizontal,
} from 'lucide-react-native';

interface OwnerDashboardScreenProps {
  navigation: any;
}

export const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const { status: subStatus, isExpired, isTrial, daysRemaining, canAccess, isSystemEnforced } = useOwnerSubscription();

  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & State
  const [selectedTurfId, setSelectedTurfId] = useState<string>('ALL');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'DUES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Counter Settlement Modal
  const [settlementBooking, setSettlementBooking] = useState<Booking | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<string>('');
  const [settlementMode, setSettlementMode] = useState<'CASH' | 'UPI'>('CASH');
  const [settlementNote, setSettlementNote] = useState<string>('');
  const [settling, setSettling] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [tData, bData] = await Promise.all([
        getOwnerTurfs(user.uid),
        getOwnerBookings(user.uid),
      ]);
      setTurfs(tData || []);
      setBookings(bData || []);
    } catch (err) {
      console.warn('Error loading owner dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenSettlement = (b: Booking) => {
    setSettlementBooking(b);
    setSettlementAmount((b.amountDue || 0).toString());
    setSettlementMode('CASH');
    setSettlementNote('');
  };

  const handleConfirmSettlement = async () => {
    if (!settlementBooking) return;
    const amt = parseFloat(settlementAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid settlement amount greater than ₹0.');
      return;
    }

    try {
      setSettling(true);
      await collectCounterDueForBooking(
        settlementBooking.id,
        amt,
        settlementMode,
        settlementNote.trim() || 'Counter settlement recorded via Mobile Control'
      );
      setSettlementBooking(null);
      await loadData();
      Alert.alert('Payment Recorded!', `₹${amt} collected via ${settlementMode} successfully.`);
    } catch (err: any) {
      console.error('Error settling booking dues:', err);
      Alert.alert('Error', err?.message || 'Failed to record settlement payment.');
    } finally {
      setSettling(false);
    }
  };

  const getLocalTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalTodayStr();

  // Base Filtered Data
  const activeBookings = bookings.filter((b) => b.bookingStatus !== 'CANCELLED');
  const turfFilteredBookings = selectedTurfId === 'ALL'
    ? activeBookings
    : activeBookings.filter((b) => b.turfId === selectedTurfId);

  const todayBookings = turfFilteredBookings.filter((b) => b.date === todayStr);

  // Financial Metrics
  const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const todayOnlineAdvance = todayBookings.reduce(
    (sum, b) => sum + (b.advancePaid !== undefined ? b.advancePaid : (b.paymentMode === 'PAY_FULL' ? b.amountPaid || 0 : 0)),
    0
  );
  const todayCounterCash = todayBookings.reduce((sum, b) => sum + (b.counterAmountPaid || 0), 0);
  const pendingDuesTotal = turfFilteredBookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);

  // Booking Live Status
  const getBookingLiveStatus = (b: Booking) => {
    if (b.bookingStatus === 'CANCELLED') return 'CANCELLED';
    if (b.isNoShow) return 'NOSHOW';

    const now = new Date();
    const curHours = now.getHours().toString().padStart(2, '0');
    const curMins = now.getMinutes().toString().padStart(2, '0');
    const curTime = `${curHours}:${curMins}`;

    const isPendingPayment = (b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID';

    if (b.date < todayStr) {
      return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
    } else if (b.date > todayStr) {
      return isPendingPayment ? 'UPCOMING_UNPAID' : 'UPCOMING';
    } else {
      const start = b.startTime || '00:00';
      const end = b.endTime || '23:59';
      if (curTime >= end) {
        return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
      } else if (curTime >= start && curTime < end) {
        return 'LIVE';
      } else {
        return isPendingPayment ? 'UPCOMING_UNPAID' : 'UPCOMING';
      }
    }
  };

  // Schedule Search & Filter
  const searchedSchedule = (scheduleFilter === 'UPCOMING'
    ? turfFilteredBookings.filter((b) => b.date >= todayStr)
    : scheduleFilter === 'DUES'
    ? turfFilteredBookings // show dues from any day (past or future)
    : todayBookings
  ).filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      b.playerName?.toLowerCase().includes(q) ||
      b.playerPhone?.includes(q) ||
      b.arenaName?.toLowerCase().includes(q) ||
      b.sport?.toLowerCase().includes(q) ||
      b.bookingId?.toLowerCase().includes(q)
    );
  });

  const displaySchedule = searchedSchedule.filter((b) => {
    const status = getBookingLiveStatus(b);
    if (scheduleFilter === 'LIVE') return status === 'LIVE';
    if (scheduleFilter === 'UPCOMING') return status === 'UPCOMING' || status === 'UPCOMING_UNPAID';
    if (scheduleFilter === 'DUES') return (b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID';
    return true; // 'ALL'
  });

  const liveCount = todayBookings.filter((b) => getBookingLiveStatus(b) === 'LIVE').length;
  const duesCount = turfFilteredBookings.filter((b) => (b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID').length;
  const upcomingCount = turfFilteredBookings.filter((b) => {
    const status = getBookingLiveStatus(b);
    return status === 'UPCOMING' || status === 'UPCOMING_UNPAID';
  }).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading Arena Control Center...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Top Hero Header */}
        <View style={styles.heroHeader}>
          <View style={styles.bizCol}>
            <View style={styles.badgeRow}>
              <View style={styles.liveDotPill}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.liveDotText}>LIVE DISPATCH</Text>
              </View>
              {turfs.length > 0 && (
                <Text style={styles.turfCountText}>{turfs.length} Venue{turfs.length > 1 ? 's' : ''}</Text>
              )}
            </View>
            <Text style={styles.bizName} numberOfLines={1}>
              {profile?.businessName || 'My Sports Arena'}
            </Text>
            <Text style={styles.subText}>Partner Control Panel & Pitch Dispatch</Text>
          </View>

          <TouchableOpacity
            style={styles.walkInBtn}
            onPress={() => navigation.navigate('OwnerBookings', { openManualModal: true })}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#064e3b" strokeWidth={3} />
            <Text style={styles.walkInBtnText}>+ Walk-In</Text>
          </TouchableOpacity>
        </View>

        {/* Venue Filter Pills Carousel (If multiple turfs) */}
        {turfs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.turfSelectorScroll}
            contentContainerStyle={styles.turfSelectorContainer}
          >
            <TouchableOpacity
              style={[styles.turfFilterChip, selectedTurfId === 'ALL' && styles.turfFilterChipActive]}
              onPress={() => setSelectedTurfId('ALL')}
            >
              <Building size={12} color={selectedTurfId === 'ALL' ? '#10b981' : '#94a3b8'} />
              <Text style={[styles.turfFilterChipText, selectedTurfId === 'ALL' && styles.turfFilterChipTextActive]}>
                All Venues ({turfs.length})
              </Text>
            </TouchableOpacity>

            {turfs.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.turfFilterChip, selectedTurfId === t.id && styles.turfFilterChipActive]}
                onPress={() => setSelectedTurfId(t.id)}
              >
                <Text style={[styles.turfFilterChipText, selectedTurfId === t.id && styles.turfFilterChipTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Partner Subscription Banner */}
        <TouchableOpacity
          style={[
            styles.subBadgeBox,
            isExpired ? styles.subBadgeBoxExpired : isTrial ? styles.subBadgeBoxTrial : styles.subBadgeBoxActive,
          ]}
          onPress={() => navigation.navigate('OwnerProfileTab')}
          activeOpacity={0.8}
        >
          <View style={styles.subBadgeInner}>
            <Sparkles size={14} color={isExpired ? '#f43f5e' : isTrial ? '#38bdf8' : '#10b981'} />
            <Text
              style={[
                styles.subBadgeText,
                isExpired ? styles.subBadgeTextExpired : isTrial ? styles.subBadgeTextTrial : styles.subBadgeTextActive,
              ]}
            >
              {!isSystemEnforced
                ? 'PRO PARTNER FEATURES UNLOCKED'
                : isExpired
                ? 'SUBSCRIPTION EXPIRED • RE-ACTIVATE NOW'
                : isTrial
                ? `PRO TRIAL ACTIVE: ${daysRemaining} DAYS REMAINING`
                : `${(subStatus?.planName || 'PRO ANNUAL').toUpperCase()} • ACTIVE`}
            </Text>
          </View>
          <ChevronRight size={14} color="#94a3b8" />
        </TouchableOpacity>

        {/* Expiry Warning Banner */}
        {isSystemEnforced && (isExpired || (isTrial && daysRemaining <= 3)) && (
          <View style={[styles.warningBanner, isExpired ? styles.warningBannerExpired : styles.warningBannerTrial]}>
            <ShieldAlert size={20} color={isExpired ? '#f43f5e' : '#f59e0b'} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>
                {isExpired ? 'Partner Pro Features Restricted' : `Trial Ending in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`}
              </Text>
              <Text style={styles.warningDesc}>
                Manage your arena subscription on TruFit Web or tap to view available plans.
              </Text>
            </View>
          </View>
        )}

        {/* Financial & Operational KPI Overview */}
        <View style={styles.kpiGrid}>
          {/* Revenue Card */}
          <View style={styles.kpiCardMain}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiLabel}>Today's Revenue</Text>
              <View style={styles.kpiIconWrapGreen}>
                <DollarSign size={14} color="#10b981" />
              </View>
            </View>
            <Text style={styles.kpiValueGreen}>₹{todayRevenue}</Text>
            <View style={styles.revenueBreakdownRow}>
              <Text style={styles.revenueSubText}>
                Online: <Text style={{ color: '#38bdf8', fontWeight: '700' }}>₹{todayOnlineAdvance}</Text>
              </Text>
              <Text style={styles.revenueSubText}>
                Desk: <Text style={{ color: '#34d399', fontWeight: '700' }}>₹{todayCounterCash}</Text>
              </Text>
            </View>
          </View>

          {/* Pending Counter Dues */}
          <TouchableOpacity
            style={styles.kpiCardAlert}
            onPress={() => navigation.navigate('OwnerPlayersDues')}
            activeOpacity={0.8}
          >
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiLabelAmber}>Pending Dues</Text>
              <View style={styles.kpiIconWrapAmber}>
                <AlertCircle size={14} color="#f59e0b" />
              </View>
            </View>
            <Text style={styles.kpiValueAmber}>₹{pendingDuesTotal}</Text>
            <Text style={styles.kpiSubAmber}>Tap to Open Ledger →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiSubGrid}>
          {/* Today's Slots */}
          <View style={styles.kpiSubCard}>
            <Text style={styles.kpiSubLabel}>Today's Slots</Text>
            <Text style={styles.kpiSubVal}>{todayBookings.length} Booked</Text>
            <Text style={styles.kpiSubDesc}>
              {liveCount > 0 ? `● ${liveCount} Game${liveCount > 1 ? 's' : ''} Live Now` : 'No live game right now'}
            </Text>
          </View>

          {/* Pitches */}
          <View style={styles.kpiSubCard}>
            <Text style={styles.kpiSubLabel}>My Arenas</Text>
            <Text style={styles.kpiSubVal}>{turfs.length} Pitches</Text>
            <Text style={styles.kpiSubDesc}>Active & Ready for Slots</Text>
          </View>
        </View>

        {/* Owner Command Hub Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleHeader}>Control & Dispatch Hub</Text>
          <View style={styles.hubGrid}>
            {/* Walk-in Desk */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerBookings', { openManualModal: true })}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Plus size={20} color="#10b981" />
              </View>
              <Text style={styles.hubTileTitle}>Walk-In Desk</Text>
              <Text style={styles.hubTileSub}>Desk Booking</Text>
            </TouchableOpacity>

            {/* 7-Day Slots */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerSlots')}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Clock size={20} color="#38bdf8" />
                {!canAccess('autoSlotGenerator') && (
                  <View style={styles.lockBadge}>
                    <Lock size={8} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.hubTileTitle}>7-Day Slots</Text>
              <Text style={styles.hubTileSub}>Slot Generator</Text>
            </TouchableOpacity>

            {/* Payment VPA */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerPaymentSettings')}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                <CreditCard size={20} color="#34d399" />
              </View>
              <Text style={styles.hubTileTitle}>Payment ID</Text>
              <Text style={styles.hubTileSub}>Merchant VPA & QR</Text>
            </TouchableOpacity>

            {/* Player Dues */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerPlayersDues')}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <AlertCircle size={20} color="#f59e0b" />
                {!canAccess('duesTracker') && !canAccess('athleteAccounts') && (
                  <View style={styles.lockBadge}>
                    <Lock size={8} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.hubTileTitle}>Player Dues</Text>
              <Text style={styles.hubTileSub}>Counter Register</Text>
            </TouchableOpacity>

            {/* Promo Offers */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerOffers')}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Tag size={20} color="#ec4899" />
                {!canAccess('offers') && (
                  <View style={styles.lockBadge}>
                    <Lock size={8} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.hubTileTitle}>Offers</Text>
              <Text style={styles.hubTileSub}>Promos & Coupons</Text>
            </TouchableOpacity>

            {/* Analytics */}
            <TouchableOpacity
              style={styles.hubTile}
              onPress={() => navigation.navigate('OwnerAnalytics')}
            >
              <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                <TrendingUp size={20} color="#818cf8" />
                {!canAccess('analytics') && (
                  <View style={styles.lockBadge}>
                    <Lock size={8} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.hubTileTitle}>Analytics</Text>
              <Text style={styles.hubTileSub}>Revenue Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Pitch Dispatch Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today's Pitch Dispatch</Text>
              <Text style={styles.sectionSubTitle}>
                {todayBookings.length} booking{todayBookings.length === 1 ? '' : 's'} scheduled for today
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerBookings')}>
              <Text style={styles.seeAllText}>All Bookings →</Text>
            </TouchableOpacity>
          </View>

          {/* Schedule Search & Quick Filter Pills */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={14} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search player, phone, pitch..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
              <TouchableOpacity
                style={[styles.filterPill, scheduleFilter === 'ALL' && styles.filterPillActive]}
                onPress={() => setScheduleFilter('ALL')}
              >
                <Text style={[styles.filterPillText, scheduleFilter === 'ALL' && styles.filterPillTextActive]}>
                  All ({todayBookings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, scheduleFilter === 'LIVE' && styles.filterPillLiveActive]}
                onPress={() => setScheduleFilter('LIVE')}
              >
                <Text style={[styles.filterPillText, scheduleFilter === 'LIVE' && styles.filterPillLiveTextActive]}>
                  ● Live ({liveCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, scheduleFilter === 'UPCOMING' && styles.filterPillActive]}
                onPress={() => setScheduleFilter('UPCOMING')}
              >
                <Text style={[styles.filterPillText, scheduleFilter === 'UPCOMING' && styles.filterPillTextActive]}>
                  Upcoming ({upcomingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, scheduleFilter === 'DUES' && styles.filterPillDuesActive]}
                onPress={() => setScheduleFilter('DUES')}
              >
                <Text style={[styles.filterPillText, scheduleFilter === 'DUES' && styles.filterPillDuesTextActive]}>
                  ⚠️ Dues ({duesCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Schedule List */}
          {displaySchedule.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={32} color="#64748b" />
              <Text style={styles.emptyTitle}>No Matching Slots</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? `No bookings found for "${searchQuery}"`
                  : 'No slots match the selected schedule filter.'}
              </Text>
            </View>
          ) : (
            displaySchedule.map((b) => {
              const timing = getBookingLiveStatus(b);
              const isCancelled = b.bookingStatus === 'CANCELLED';
              const isLive = timing === 'LIVE';
              const isGameOver = timing === 'GAME_OVER';
              const isGameOverUnpaid = timing === 'OVER_UNPAID';
              const dueAmount = b.amountDue || 0;
              const isLobby = isLobbyBooking(b);
              const isWalkIn = b.bookingType === 'OWNER';

              return (
                <View
                  key={b.id}
                  style={[
                    styles.bookingCard,
                    isLive && styles.bookingCardLive,
                    isGameOverUnpaid && styles.bookingCardUnpaid,
                    isCancelled && styles.bookingCardCancelled,
                  ]}
                >
                  <View style={styles.bookingCardTop}>
                    {/* Time Badge */}
                    <View style={[styles.timeBadge, isLive && styles.timeBadgeLive, isGameOver && styles.timeBadgeOver]}>
                      <Clock size={12} color={isLive ? '#34d399' : isGameOver ? '#f87171' : '#10b981'} />
                      <Text style={[styles.timeBadgeText, isLive && styles.timeBadgeTextLive]}>
                        {b.date !== todayStr ? `${b.date} • ` : ''}{b.startTime} - {b.endTime}
                      </Text>
                    </View>

                    {/* Booking Source Tag */}
                    {isLobby ? (
                      <View style={styles.lobbyTag}>
                        <Trophy size={9} color="#c084fc" />
                        <Text style={styles.lobbyTagText}>LOBBY MATCH</Text>
                      </View>
                    ) : isWalkIn ? (
                      <View style={styles.walkInTag}>
                        <Text style={styles.walkInTagText}>WALK-IN DESK</Text>
                      </View>
                    ) : (
                      <View style={styles.onlineTag}>
                        <Text style={styles.onlineTagText}>ONLINE PLAYER</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.bookingCardBody}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.playerName}>{b.playerName}</Text>
                        {isLive && (
                          <View style={styles.liveTag}>
                            <Text style={styles.liveTagText}>● LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.arenaDetail}>
                        {b.arenaName} • {b.sport}
                      </Text>
                      {b.playerPhone && (
                        <TouchableOpacity
                          style={styles.phoneRow}
                          onPress={() => Linking.openURL(`tel:${b.playerPhone}`)}
                        >
                          <Phone size={10} color="#38bdf8" />
                          <Text style={styles.phoneText}>{b.playerPhone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Amount & Status */}
                    <View style={styles.amountCol}>
                      <Text style={styles.totalAmountText}>₹{b.totalAmount}</Text>
                      {dueAmount > 0 ? (
                        <View style={styles.duePill}>
                          <Text style={styles.duePillText}>DUE ₹{dueAmount}</Text>
                        </View>
                      ) : (
                        <View style={styles.paidPill}>
                          <Check size={10} color="#10b981" />
                          <Text style={styles.paidPillText}>PAID</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Actions Bar on Card */}
                  {!isCancelled && (
                    <View style={styles.cardActionsRow}>
                      {dueAmount > 0 ? (
                        <TouchableOpacity
                          style={styles.settleBtn}
                          onPress={() => handleOpenSettlement(b)}
                          activeOpacity={0.8}
                        >
                          <DollarSign size={13} color="#064e3b" />
                          <Text style={styles.settleBtnText}>Settle Dues (₹{dueAmount})</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.completedIndicator}>
                          <CheckCircle size={12} color="#10b981" />
                          <Text style={styles.completedText}>Fully Paid at Counter</Text>
                        </View>
                      )}

                      {b.playerPhone && (
                        <TouchableOpacity
                          style={styles.callIconBtn}
                          onPress={() => Linking.openURL(`tel:${b.playerPhone}`)}
                        >
                          <Phone size={13} color="#38bdf8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Registered Turfs & Venues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Registered Venues ({turfs.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerTurfs')}>
              <Text style={styles.seeAllText}>Manage All</Text>
            </TouchableOpacity>
          </View>

          {turfs.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.turfItem}
              onPress={() => navigation.navigate('OwnerTurfs')}
            >
              <View style={styles.turfIconBox}>
                <Building size={20} color="#10b981" />
              </View>
              <View style={styles.turfTextCol}>
                <Text style={styles.turfItemName}>{t.name}</Text>
                <Text style={styles.turfItemLoc}>{t.area}, {t.city}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.turfItemPrice}>₹{t.basePrice}/hr</Text>
                <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: '700', marginTop: 2 }}>
                  Edit Venue →
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Quick Counter Settlement Modal */}
      <Modal
        visible={!!settlementBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setSettlementBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Collect Counter Payment</Text>
                <Text style={styles.modalSub}>
                  Record payment for {settlementBooking?.playerName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSettlementBooking(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {settlementBooking && (
              <View style={styles.modalBody}>
                <View style={styles.dueSummaryBox}>
                  <View style={styles.dueSummaryRow}>
                    <Text style={styles.dueSummaryLabel}>Total Slot Fee:</Text>
                    <Text style={styles.dueSummaryVal}>₹{settlementBooking.totalAmount}</Text>
                  </View>
                  <View style={styles.dueSummaryRow}>
                    <Text style={styles.dueSummaryLabel}>Amount Paid So Far:</Text>
                    <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 13 }}>
                      ₹{settlementBooking.amountPaid || 0}
                    </Text>
                  </View>
                  <View style={[styles.dueSummaryRow, { borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 6 }]}>
                    <Text style={{ color: '#f59e0b', fontWeight: '800', fontSize: 13 }}>Remaining Due:</Text>
                    <Text style={{ color: '#f59e0b', fontWeight: '900', fontSize: 16 }}>
                      ₹{settlementBooking.amountDue || 0}
                    </Text>
                  </View>
                </View>

                {/* Amount Input */}
                <Text style={styles.inputLabel}>Collected Amount (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={settlementAmount}
                  onChangeText={setSettlementAmount}
                  placeholder="e.g. 500"
                  placeholderTextColor="#64748b"
                />

                {/* Payment Mode Selection */}
                <Text style={styles.inputLabel}>Collection Mode</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, settlementMode === 'CASH' && styles.modeBtnActive]}
                    onPress={() => setSettlementMode('CASH')}
                  >
                    <Text style={[styles.modeBtnText, settlementMode === 'CASH' && styles.modeBtnTextActive]}>
                      💵 Cash
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, settlementMode === 'UPI' && styles.modeBtnActive]}
                    onPress={() => setSettlementMode('UPI')}
                  >
                    <Text style={[styles.modeBtnText, settlementMode === 'UPI' && styles.modeBtnTextActive]}>
                      📱 UPI / QR
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Note */}
                <Text style={styles.inputLabel}>Optional Payment Note</Text>
                <TextInput
                  style={styles.textInput}
                  value={settlementNote}
                  onChangeText={setSettlementNote}
                  placeholder="e.g. Paid cash at desk"
                  placeholderTextColor="#64748b"
                />

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[styles.confirmBtn, settling && styles.disabledBtn]}
                  onPress={handleConfirmSettlement}
                  disabled={settling}
                >
                  {settling ? (
                    <ActivityIndicator size="small" color="#064e3b" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Record Payment (₹{settlementAmount || 0})</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bizCol: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveDotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveDotText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  turfCountText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  bizName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  walkInBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '900',
  },
  turfSelectorScroll: {
    marginBottom: 14,
  },
  turfSelectorContainer: {
    gap: 8,
  },
  turfFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfFilterChipActive: {
    backgroundColor: '#064e3b25',
    borderColor: '#10b981',
  },
  turfFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  turfFilterChipTextActive: {
    color: '#34d399',
  },
  subBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  subBadgeBoxActive: {
    backgroundColor: '#064e3b25',
    borderColor: '#05966940',
  },
  subBadgeBoxTrial: {
    backgroundColor: '#0284c725',
    borderColor: '#0ea5e940',
  },
  subBadgeBoxExpired: {
    backgroundColor: '#88133725',
    borderColor: '#e11d4840',
  },
  subBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subBadgeTextActive: {
    color: '#34d399',
  },
  subBadgeTextTrial: {
    color: '#38bdf8',
  },
  subBadgeTextExpired: {
    color: '#fb7185',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  warningBannerExpired: {
    backgroundColor: '#450a0a90',
    borderColor: '#b91c1c',
  },
  warningBannerTrial: {
    backgroundColor: '#451a0390',
    borderColor: '#b45309',
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#cbd5e1',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  kpiCardMain: {
    flex: 1.2,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiCardAlert: {
    flex: 1,
    backgroundColor: '#1c170a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  kpiLabelAmber: {
    fontSize: 11,
    color: '#fcd34d',
    fontWeight: '700',
  },
  kpiIconWrapGreen: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiIconWrapAmber: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValueGreen: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 6,
  },
  kpiValueAmber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f59e0b',
    marginTop: 6,
  },
  revenueBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  revenueSubText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  kpiSubAmber: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '700',
    marginTop: 6,
  },
  kpiSubGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiSubCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiSubLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiSubVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  kpiSubDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitleHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubTile: {
    width: '31%',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  hubTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#020617',
  },
  hubTileTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  hubTileSub: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  sectionSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  filterBar: {
    marginBottom: 14,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#ffffff',
    padding: 0,
  },
  pillsContainer: {
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterPillActive: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
  },
  filterPillLiveActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  filterPillDuesActive: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterPillTextActive: {
    color: '#10b981',
  },
  filterPillLiveTextActive: {
    color: '#34d399',
  },
  filterPillDuesTextActive: {
    color: '#fcd34d',
  },
  emptyCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bookingCardLive: {
    borderColor: '#10b981',
    backgroundColor: '#0c1a1f',
    borderWidth: 1.5,
  },
  bookingCardUnpaid: {
    borderColor: '#f59e0b',
    backgroundColor: '#1c170a',
    borderWidth: 1.5,
  },
  bookingCardCancelled: {
    opacity: 0.6,
    borderColor: '#ef4444',
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timeBadgeLive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  timeBadgeOver: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  timeBadgeTextLive: {
    color: '#34d399',
  },
  walkInTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  walkInTagText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  onlineTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onlineTagText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  lobbyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lobbyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c084fc',
  },
  bookingCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
  },
  arenaDetail: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '700',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  totalAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  duePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  duePillText: {
    color: '#fcd34d',
    fontSize: 9,
    fontWeight: '900',
  },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  paidPillText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleBtnText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '900',
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
  },
  callIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  turfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  turfTextCol: {
    flex: 1,
  },
  turfItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  turfItemLoc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  turfItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalBody: {
    gap: 12,
  },
  dueSummaryBox: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dueSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueSummaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  dueSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#ffffff',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeBtnTextActive: {
    color: '#34d399',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '900',
  },
});
