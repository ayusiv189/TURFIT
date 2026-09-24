import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerSubscription } from '../../contexts/OwnerSubscriptionContext';
import { SubscriptionFeatureGate } from '../../components/SubscriptionFeatureGate';
import {
  listenOwnerDues,
  payPlayerDue,
  listenOwnerBookings,
  collectCounterDueForBooking,
  getOwnerTurfs,
  updateTurfPartnerPolicies,
  isLobbyBooking,
} from '../../services/dbService';
import { PlayerDue, Booking, Turf } from '../../types';
import {
  Phone,
  CheckCircle,
  CreditCard,
  Banknote,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Trophy,
  User,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react-native';

interface PlayerLedgerGroup {
  playerId: string;
  playerName: string;
  playerEmail?: string;
  playerPhone?: string;
  totalOutstanding: number;
  totalOriginalDue: number;
  totalPaid: number;
  duesCount: number;
  unpaidCount: number;
  lastActivityDate?: string;
  dues: PlayerDue[];
}

export const OwnerPlayersDuesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const { canAccess, plan } = useOwnerSubscription();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [dues, setDues] = useState<PlayerDue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const hasAccess = canAccess('duesTracker') || canAccess('athleteAccounts');

  // Setting: Player Dues ON / OFF
  const [enablePlayerDues, setEnablePlayerDues] = useState<boolean>(true);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);

  // Active view tab when Player Dues is ON: 'LOBBY_DUES' | 'COUNTER_DUES'
  // When Player Dues is OFF, it is locked to 'COUNTER_DUES'
  const [activeTab, setActiveTab] = useState<'LOBBY_DUES' | 'COUNTER_DUES'>('LOBBY_DUES');

  // Filter for Lobby Dues tab
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'SETTLED'>('PENDING');

  // Expanded ledger items in Lobby Dues view
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  // Loading states for actions
  const [settlingDueId, setSettlingDueId] = useState<string | null>(null);
  const [settlingPlayerId, setSettlingPlayerId] = useState<string | null>(null);
  const [settlingBookingId, setSettlingBookingId] = useState<string | null>(null);

  // Load owner's turfs to read policies
  useEffect(() => {
    if (!user) return;
    const fetchTurfs = async () => {
      try {
        const ownerTurfs = await getOwnerTurfs(user.uid);
        setTurfs(ownerTurfs);
        if (ownerTurfs.length > 0) {
          const firstTurf = ownerTurfs[0];
          if (firstTurf.enableLobbyPlayerDues !== undefined) {
            setEnablePlayerDues(firstTurf.enableLobbyPlayerDues);
          } else if (profile?.paymentSettings?.enableLobbyPlayerDues !== undefined) {
            setEnablePlayerDues(profile.paymentSettings.enableLobbyPlayerDues);
          }
        }
      } catch (err) {
        console.warn('Error loading owner turfs:', err);
      }
    };
    fetchTurfs();
  }, [user, profile]);

  // Listen to owner dues in real time
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribeDues = listenOwnerDues(user.uid, (updatedDues) => {
      setDues(updatedDues);
      setLoading(false);
    });
    return () => unsubscribeDues();
  }, [user]);

  // Listen to owner bookings in real time for counter dues
  useEffect(() => {
    if (!user) return;
    const unsubscribeBookings = listenOwnerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    return () => unsubscribeBookings();
  }, [user]);

  // Toggle Player Dues setting and persist to turf policies
  const handleTogglePlayerDues = async (newVal: boolean) => {
    setEnablePlayerDues(newVal);
    if (!newVal) {
      // If toggled OFF, automatically switch view to counter dues
      setActiveTab('COUNTER_DUES');
    }
    if (turfs.length > 0) {
      setSavingPolicy(true);
      try {
        await updateTurfPartnerPolicies(turfs[0].id, {
          enableLobbyPlayerDues: newVal,
        });
        Alert.alert(
          newVal ? 'Player Dues Enabled' : 'Player Dues Disabled',
          newVal
            ? 'Per-player split dues are enabled for hosted community lobbies. Direct bookings are managed at the counter desk.'
            : 'Individual player tracking is OFF. Only pending counter dues will be shown for 1-tap desk collection.'
        );
      } catch (err) {
        console.warn('Error saving player dues policy:', err);
      } finally {
        setSavingPolicy(false);
      }
    }
  };

  // Aggregate raw dues into a consolidated Player Ledger (Lobbies)
  const playerLedgers = useMemo<PlayerLedgerGroup[]>(() => {
    const groups: Record<string, PlayerLedgerGroup> = {};

    dues.forEach((due) => {
      const key = due.playerId || due.playerPhone || due.playerName || 'unknown_player';

      if (!groups[key]) {
        groups[key] = {
          playerId: due.playerId || key,
          playerName: due.playerName || 'Athlete',
          playerEmail: due.playerEmail,
          playerPhone: due.playerPhone,
          totalOutstanding: 0,
          totalOriginalDue: 0,
          totalPaid: 0,
          duesCount: 0,
          unpaidCount: 0,
          lastActivityDate: due.date,
          dues: [],
        };
      }

      const grp = groups[key];
      grp.dues.push(due);
      grp.duesCount += 1;
      const isCancelledOrReversed = due.status === 'CANCELLED_REVERSED' || due.status === 'CANCELLED';
      const remaining = isCancelledOrReversed ? 0 : (due.remainingAmount || 0);
      const total = isCancelledOrReversed ? 0 : (due.totalAmount || 0);
      const paid = due.amountPaid || 0;

      grp.totalOutstanding += remaining;
      grp.totalOriginalDue += total;
      grp.totalPaid += paid;
      if (!isCancelledOrReversed && remaining > 0) {
        grp.unpaidCount += 1;
      }

      if (due.date && (!grp.lastActivityDate || due.date > grp.lastActivityDate)) {
        grp.lastActivityDate = due.date;
      }
    });

    return Object.values(groups).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [dues]);

  // Filter player ledgers for Lobby Dues view
  const filteredLedgers = useMemo(() => {
    return playerLedgers.filter((ledger) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ledger.playerName.toLowerCase().includes(q) ||
        (ledger.playerPhone && ledger.playerPhone.includes(q)) ||
        (ledger.playerEmail && ledger.playerEmail.toLowerCase().includes(q)) ||
        ledger.dues.some((d) => d.turfName.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterTab === 'PENDING') return ledger.totalOutstanding > 0;
      if (filterTab === 'SETTLED') return ledger.totalOutstanding === 0;
      return true;
    });
  }, [playerLedgers, searchQuery, filterTab]);

  // Pending Counter Dues Bookings (all slots with pending payment due)
  const counterDuesBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.bookingStatus === 'CANCELLED') return false;
      const due = (b.amountDue !== undefined && b.amountDue !== null)
        ? b.amountDue
        : Math.max(0, (b.totalAmount || 0) - (b.amountPaid || 0));

      if (due <= 0 && b.paymentStatus === 'PAID') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          b.playerName.toLowerCase().includes(q) ||
          (b.playerPhone && b.playerPhone.includes(q)) ||
          (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
          b.arenaName.toLowerCase().includes(q) ||
          b.turfName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [bookings, searchQuery]);

  const totalOutstandingLobbyDues = playerLedgers.reduce((sum, p) => sum + p.totalOutstanding, 0);
  const totalDebtorAthletes = playerLedgers.filter((p) => p.totalOutstanding > 0).length;

  const totalCounterDues = counterDuesBookings.reduce((sum, b) => {
    const due = (b.amountDue !== undefined && b.amountDue !== null)
      ? b.amountDue
      : Math.max(0, (b.totalAmount || 0) - (b.amountPaid || 0));
    return sum + due;
  }, 0);

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerIds((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  // Settle individual lobby due item
  const handleSettleIndividualDue = async (due: PlayerDue, method: 'CASH' | 'UPI') => {
    setSettlingDueId(due.id);
    try {
      await payPlayerDue(due.id, due.remainingAmount, method);
      Alert.alert('Payment Settled', `₹${due.remainingAmount} recorded via ${method}. Ledger and slot balance updated.`);
    } catch (err: any) {
      Alert.alert('Settlement Failed', err.message || 'Could not record settlement.');
    } finally {
      setSettlingDueId(null);
    }
  };

  // Settle entire player ledger balance
  const handleSettleAllPlayerDues = async (ledger: PlayerLedgerGroup, method: 'CASH' | 'UPI') => {
    const unpaidDues = ledger.dues.filter((d) => (d.remainingAmount || 0) > 0);
    if (unpaidDues.length === 0) return;

    Alert.alert(
      `Settle Total Balance (₹${ledger.totalOutstanding})`,
      `Collect full balance for ${ledger.playerName} via ${method === 'CASH' ? 'Cash Counter' : 'UPI'}? This will clear ${unpaidDues.length} slot entries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Settle',
          onPress: async () => {
            setSettlingPlayerId(ledger.playerId);
            try {
              for (const due of unpaidDues) {
                await payPlayerDue(due.id, due.remainingAmount, method);
              }
              Alert.alert('Ledger Cleared', `All dues for ${ledger.playerName} have been settled successfully.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to settle player ledger.');
            } finally {
              setSettlingPlayerId(null);
            }
          },
        },
      ]
    );
  };

  // Settle Pending Counter Due for a booking slot
  const handleSettleCounterDue = async (booking: Booking) => {
    const due = (booking.amountDue !== undefined && booking.amountDue !== null)
      ? booking.amountDue
      : Math.max(0, (booking.totalAmount || 0) - (booking.amountPaid || 0));

    if (due <= 0) return;

    Alert.alert(
      `Collect Balance: ₹${due}`,
      `Confirm that ₹${due} remaining balance from ${booking.playerName} has been received at the venue for ${booking.arenaName} (${booking.startTime})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Confirm Paid (₹${due})`,
          onPress: async () => {
            setSettlingBookingId(booking.id);
            try {
              await collectCounterDueForBooking(booking.id, due, 'CASH');
              Alert.alert('Payment Recorded', `₹${due} balance marked as received. Slot is now marked as PAID.`);
            } catch (err: any) {
              console.warn('Error settling counter due:', err);
              Alert.alert('Error', err?.message || 'Failed to settle counter payment.');
            } finally {
              setSettlingBookingId(null);
            }
          },
        },
      ]
    );
  };

  const isCounterMode = !enablePlayerDues || activeTab === 'COUNTER_DUES';

  if (!hasAccess) {
    return (
      <SubscriptionFeatureGate
        featureKey="duesTracker"
        featureTitle="Player Dues & Counter Register"
        featureDescription="Track unpaid balances, counter pay-at-venue settlements, athlete split-share ledgers, and cash receipt logs."
        requiredPlanName={plan?.name || 'Standard Monthly'}
        benefits={[
          'Unified player ledger grouping unpaid balances by athlete',
          'Record 1-tap Cash or UPI counter receipts directly into booking records',
          'WhatsApp reminder links with automated payment links',
          'Automatic balance clearing and invoice generation',
        ]}
        navigation={navigation}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Toggle Card: Player Dues (ON / OFF) */}
      <View style={styles.policyCard}>
        <View style={styles.policyTopRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.policyTitle}>Player Dues (Lobbies Only)</Text>
              <View
                style={[
                  styles.statusPill,
                  enablePlayerDues ? styles.statusPillOn : styles.statusPillOff,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    enablePlayerDues ? styles.statusPillTextOn : styles.statusPillTextOff,
                  ]}
                >
                  {enablePlayerDues ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
            <Text style={styles.policyDesc}>
              {enablePlayerDues
                ? 'Track per-player split balances for community hosted lobbies. Direct bookings are settled at the desk.'
                : 'Player dues disabled. Operating in Pending Counter Dues mode for fast 1-tap desk slot settlement.'}
            </Text>
          </View>
          <Switch
            value={enablePlayerDues}
            onValueChange={handleTogglePlayerDues}
            trackColor={{ false: '#334155', true: '#059669' }}
            thumbColor={enablePlayerDues ? '#34d399' : '#94a3b8'}
          />
        </View>
      </View>

      {/* KPI Overview Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLabel}>
              {isCounterMode ? 'TOTAL PENDING COUNTER DUES' : 'TOTAL OUTSTANDING LOBBY DUES'}
            </Text>
            <Text style={styles.bannerAmount}>
              ₹{isCounterMode ? totalCounterDues : totalOutstandingLobbyDues}
            </Text>
          </View>
          <View style={styles.debtorsPill}>
            <Text style={styles.debtorsPillNum}>
              {isCounterMode ? counterDuesBookings.length : totalDebtorAthletes}
            </Text>
            <Text style={styles.debtorsPillLabel}>
              {isCounterMode ? 'Unpaid Slots' : 'Athletes with Dues'}
            </Text>
          </View>
        </View>
        <Text style={styles.bannerSub}>
          {isCounterMode
            ? 'Direct venue desk register • Click any slot below to record instant cash or UPI collection'
            : 'Per-player community ledger • One consolidated account per athlete across hosted games'}
        </Text>
      </View>

      {/* Mode Sub-Tabs (Shown only when Player Dues is ON) */}
      {enablePlayerDues && (
        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            style={[styles.modeTab, activeTab === 'LOBBY_DUES' && styles.modeTabActive]}
            onPress={() => setActiveTab('LOBBY_DUES')}
          >
            <Trophy size={13} color={activeTab === 'LOBBY_DUES' ? '#c084fc' : '#64748b'} />
            <Text style={[styles.modeTabText, activeTab === 'LOBBY_DUES' && styles.modeTabTextActive]}>
              Lobby Player Dues ({totalDebtorAthletes})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, activeTab === 'COUNTER_DUES' && styles.modeTabActiveCounter]}
            onPress={() => setActiveTab('COUNTER_DUES')}
          >
            <Banknote size={13} color={activeTab === 'COUNTER_DUES' ? '#fbbf24' : '#64748b'} />
            <Text style={[styles.modeTabText, activeTab === 'COUNTER_DUES' && styles.modeTabTextActiveCounter]}>
              Counter Dues ({counterDuesBookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search & Filter Controls */}
      <View style={styles.controlsSection}>
        <View style={styles.searchBar}>
          <Search size={15} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isCounterMode
                ? 'Search slot by booker, phone, arena, or booking ID...'
                : 'Search athlete by name, phone, or turf...'
            }
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter sub-chips for Lobby Dues view */}
        {!isCounterMode && (
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'PENDING' && styles.filterTabActive]}
              onPress={() => setFilterTab('PENDING')}
            >
              <Text style={[styles.filterTabText, filterTab === 'PENDING' && styles.filterTabTextActive]}>
                Pending Dues ({totalDebtorAthletes})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'ALL' && styles.filterTabActive]}
              onPress={() => setFilterTab('ALL')}
            >
              <Text style={[styles.filterTabText, filterTab === 'ALL' && styles.filterTabTextActive]}>
                All Ledgers ({playerLedgers.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'SETTLED' && styles.filterTabActive]}
              onPress={() => setFilterTab('SETTLED')}
            >
              <Text style={[styles.filterTabText, filterTab === 'SETTLED' && styles.filterTabTextActive]}>
                Cleared ({playerLedgers.length - totalDebtorAthletes})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading accounts and dues registers...</Text>
        </View>
      ) : isCounterMode ? (
        /* ==================== VIEW 1: PENDING COUNTER DUES (SLOTS) ==================== */
        <FlatList
          data={counterDuesBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isLobby = isLobbyBooking(item);
            const dueAmt = (item.amountDue !== undefined && item.amountDue !== null)
              ? item.amountDue
              : Math.max(0, (item.totalAmount || 0) - (item.amountPaid || 0));
            const paidAmt = item.amountPaid || 0;
            const isSettling = settlingBookingId === item.id;

            return (
              <View style={styles.counterSlotCard}>
                {/* Header: Booker & Match Type Badge */}
                <View style={styles.counterSlotHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.counterBookerName}>{item.playerName}</Text>
                      {isLobby ? (
                        <View style={styles.lobbyBadgeSmall}>
                          <Trophy size={10} color="#c084fc" />
                          <Text style={styles.lobbyBadgeSmallText}>LOBBY MATCH</Text>
                        </View>
                      ) : (
                        <View style={styles.individualBadgeSmall}>
                          <User size={10} color="#38bdf8" />
                          <Text style={styles.individualBadgeSmallText}>
                            {item.bookingType === 'MANUAL' ? 'VENUE DESK / WALK-IN' : 'PERSONAL BOOKING'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.counterArenaText}>
                      {item.turfName} • {item.arenaName}
                    </Text>
                  </View>

                  {/* Due Amount Highlight Pill */}
                  <View style={styles.counterDueHighlightBox}>
                    <Text style={styles.counterDueHighlightLabel}>DUE AT DESK</Text>
                    <Text style={styles.counterDueHighlightAmount}>₹{dueAmt}</Text>
                  </View>
                </View>

                {/* Schedule & Phone Meta */}
                <View style={styles.counterMetaRow}>
                  <Calendar size={12} color="#94a3b8" />
                  <Text style={styles.counterMetaText}>
                    {item.date} ({item.startTime} - {item.endTime})
                  </Text>
                  {!!item.playerPhone && (
                    <>
                      <Phone size={11} color="#94a3b8" style={{ marginLeft: 8 }} />
                      <Text style={styles.counterMetaText}>{item.playerPhone}</Text>
                    </>
                  )}
                </View>

                {/* Financial Strip: Slot Value, Collected, Due */}
                <View style={styles.counterFinancialStrip}>
                  <View style={styles.counterFinCol}>
                    <Text style={styles.counterFinLabel}>SLOT VALUE</Text>
                    <Text style={styles.counterFinVal}>₹{item.totalAmount}</Text>
                  </View>
                  <View style={styles.counterFinDivider} />
                  <View style={styles.counterFinCol}>
                    <Text style={styles.counterFinLabel}>COLLECTED</Text>
                    <Text style={[styles.counterFinVal, { color: '#10b981' }]}>₹{paidAmt}</Text>
                  </View>
                  <View style={styles.counterFinDivider} />
                  <View style={styles.counterFinCol}>
                    <Text style={styles.counterFinLabel}>BALANCE DUE</Text>
                    <Text style={[styles.counterFinVal, { color: '#fbbf24' }]}>₹{dueAmt}</Text>
                  </View>
                </View>

                {/* Fast Desk Collection Actions */}
                <View style={styles.counterActionsRow}>
                  {!!item.playerPhone && (
                    <TouchableOpacity
                      style={styles.callSmallBtn}
                      onPress={() => Linking.openURL(`tel:${item.playerPhone}`)}
                    >
                      <Phone size={12} color="#38bdf8" />
                      <Text style={styles.callSmallText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.collectCashBtn, isSettling && styles.disabledBtn]}
                      disabled={isSettling}
                      onPress={() => handleSettleCounterDue(item)}
                    >
                      {isSettling ? (
                        <ActivityIndicator size="small" color="#064e3b" />
                      ) : (
                        <>
                          <CheckCircle size={13} color="#064e3b" />
                          <Text style={styles.collectCashBtnText}>Collect ₹{dueAmt}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <CheckCircle size={44} color="#10b981" />
              <Text style={styles.emptyTitle}>Zero Pending Counter Dues</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No matching unpaid bookings found.'
                  : 'All venue slots and counter desk balances are fully settled.'}
              </Text>
            </View>
          }
        />
      ) : (
        /* ==================== VIEW 2: LOBBY PLAYER DUES (PER-PLAYER LEDGER) ==================== */
        <FlatList
          data={filteredLedgers}
          keyExtractor={(item) => item.playerId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isExpanded = !!expandedPlayerIds[item.playerId];
            const hasDues = item.totalOutstanding > 0;
            const isPlayerSettling = settlingPlayerId === item.playerId;

            return (
              <View style={[styles.ledgerCard, hasDues && styles.ledgerCardPending]}>
                {/* Ledger Card Main Header */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleExpand(item.playerId)}
                  style={styles.ledgerHeader}
                >
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{item.playerName.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.playerName}>{item.playerName}</Text>
                    {!!item.playerPhone && (
                      <Text style={styles.playerSubText}>{item.playerPhone}</Text>
                    )}
                    <View style={styles.badgeRow}>
                      <Text style={styles.slotCountBadge}>
                        {item.duesCount} slot{item.duesCount > 1 ? 's' : ''} logged
                      </Text>
                      {item.unpaidCount > 0 && (
                        <Text style={styles.unpaidCountBadge}>
                          {item.unpaidCount} unpaid
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Total Due</Text>
                    <Text style={[styles.balanceAmount, hasDues ? styles.balanceDue : styles.balanceCleared]}>
                      ₹{item.totalOutstanding}
                    </Text>
                    <View style={styles.expandToggle}>
                      <Text style={styles.expandText}>{isExpanded ? 'Hide Ledger' : 'View Ledger'}</Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#38bdf8" />
                      ) : (
                        <ChevronDown size={14} color="#38bdf8" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Quick Player Contact & Quick Settle All Actions */}
                <View style={styles.cardActionsRow}>
                  {!!item.playerPhone && (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${item.playerPhone}`)}
                    >
                      <Phone size={13} color="#38bdf8" />
                      <Text style={styles.callText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  {hasDues && (
                    <View style={styles.settleAllGroup}>
                      <TouchableOpacity
                        style={[styles.settleAllCashBtn, isPlayerSettling && styles.disabledBtn]}
                        disabled={isPlayerSettling}
                        onPress={() => handleSettleAllPlayerDues(item, 'CASH')}
                      >
                        {isPlayerSettling ? (
                          <ActivityIndicator size="small" color="#064e3b" />
                        ) : (
                          <>
                            <Banknote size={13} color="#064e3b" />
                            <Text style={styles.settleAllCashText}>Settle All (Cash)</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.settleAllUpiBtn, isPlayerSettling && styles.disabledBtn]}
                        disabled={isPlayerSettling}
                        onPress={() => handleSettleAllPlayerDues(item, 'UPI')}
                      >
                        <CreditCard size={13} color="#10b981" />
                        <Text style={styles.settleAllUpiText}>UPI</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!hasDues && (
                    <View style={styles.settledBadgePill}>
                      <CheckCircle size={13} color="#10b981" />
                      <Text style={styles.settledBadgeText}>All Settled</Text>
                    </View>
                  )}
                </View>

                {/* Expandable Consolidated Ledger History / Items */}
                {isExpanded && (
                  <View style={styles.ledgerDetailsSection}>
                    <View style={styles.ledgerSectionHeader}>
                      <Text style={styles.ledgerSectionTitle}>Account Ledger & Slot History</Text>
                      <Text style={styles.ledgerSectionSub}>
                        Total Recorded: ₹{item.totalOriginalDue} • Paid: ₹{item.totalPaid}
                      </Text>
                    </View>

                    {item.dues.map((dueItem, idx) => {
                      const isItemCancelled = dueItem.status === 'CANCELLED_REVERSED' || dueItem.status === 'CANCELLED';
                      const isItemSettled = isItemCancelled || (dueItem.remainingAmount || 0) === 0;
                      const isItemSettling = settlingDueId === dueItem.id;

                      return (
                        <View
                          key={dueItem.id || `due_${idx}`}
                          style={[styles.ledgerEntryRow, isItemSettled && styles.ledgerEntrySettled]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.entryTopRow}>
                              <Text style={styles.entryTurfName}>{dueItem.turfName}</Text>
                              <Text
                                style={[
                                  styles.entryStatusTag,
                                  isItemCancelled
                                    ? styles.entryTagCancelled
                                    : isItemSettled
                                    ? styles.entryTagSettled
                                    : styles.entryTagDue,
                                ]}
                              >
                                {isItemCancelled ? 'CANCELLED / REVERSED' : isItemSettled ? 'SETTLED' : `₹${dueItem.remainingAmount} DUE`}
                              </Text>
                            </View>

                            <View style={styles.entryMetaRow}>
                              <Calendar size={11} color="#64748b" />
                              <Text style={styles.entryMetaText}>{dueItem.date}</Text>
                              {!!dueItem.startTime && (
                                <>
                                  <Clock size={11} color="#64748b" style={{ marginLeft: 6 }} />
                                  <Text style={styles.entryMetaText}>
                                    {dueItem.startTime} - {dueItem.endTime}
                                  </Text>
                                </>
                              )}
                            </View>

                            {!!dueItem.notes && (
                              <Text style={styles.entryNotesText}>{dueItem.notes}</Text>
                            )}
                          </View>

                          {/* Action for single due row */}
                          {!isItemSettled && (
                            <View style={styles.entryActionCol}>
                              <TouchableOpacity
                                style={[styles.entrySettleBtn, isItemSettling && styles.disabledBtn]}
                                disabled={isItemSettling}
                                onPress={() => handleSettleIndividualDue(dueItem, 'CASH')}
                              >
                                {isItemSettling ? (
                                  <ActivityIndicator size="small" color="#064e3b" />
                                ) : (
                                  <Text style={styles.entrySettleBtnText}>Cash</Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.entryUpiBtn, isItemSettling && styles.disabledBtn]}
                                disabled={isItemSettling}
                                onPress={() => handleSettleIndividualDue(dueItem, 'UPI')}
                              >
                                <Text style={styles.entryUpiBtnText}>UPI</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <CheckCircle size={44} color="#10b981" />
              <Text style={styles.emptyTitle}>No Lobby Dues Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No player accounts matching your search query.'
                  : 'All community lobby player accounts are fully settled.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  policyCard: {
    backgroundColor: '#131b2e',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  policyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  policyDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 15,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusPillOff: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextOn: {
    color: '#34d399',
  },
  statusPillTextOff: {
    color: '#94a3b8',
  },
  banner: {
    backgroundColor: '#131b2e',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f59e0b',
    marginTop: 2,
  },
  debtorsPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  debtorsPillNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f59e0b',
  },
  debtorsPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
  },
  bannerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 15,
  },
  modeTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeTabActive: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderColor: '#c084fc',
  },
  modeTabActiveCounter: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#c084fc',
    fontWeight: '800',
  },
  modeTabTextActiveCounter: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  controlsSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 9,
    paddingLeft: 8,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#38bdf8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
  },

  /* Counter Slot Card Styles */
  counterSlotCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  counterSlotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  counterBookerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  lobbyBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lobbyBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c084fc',
  },
  individualBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  individualBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  counterArenaText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  counterDueHighlightBox: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  counterDueHighlightLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fbbf24',
  },
  counterDueHighlightAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f59e0b',
  },
  counterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  counterMetaText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  counterFinancialStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  counterFinCol: {
    alignItems: 'center',
    flex: 1,
  },
  counterFinDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1e293b',
  },
  counterFinLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
  },
  counterFinVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  counterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  callSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  collectCashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  collectCashBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064e3b',
  },
  collectUpiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  collectUpiBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },

  /* Ledger Card Styles */
  ledgerCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  ledgerCardPending: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#818cf8',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  playerSubText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  slotCountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unpaidCountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f87171',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  balanceBox: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 1,
  },
  balanceDue: {
    color: '#ef4444',
  },
  balanceCleared: {
    color: '#10b981',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  expandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  settleAllGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settleAllCashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleAllCashText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064e3b',
  },
  settleAllUpiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleAllUpiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  settledBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  ledgerDetailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  ledgerSectionHeader: {
    marginBottom: 8,
  },
  ledgerSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  ledgerSectionSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  ledgerEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  ledgerEntrySettled: {
    opacity: 0.6,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryTurfName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  entryStatusTag: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entryTagDue: {
    color: '#f87171',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  entryTagSettled: {
    color: '#34d399',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  entryTagCancelled: {
    color: '#94a3b8',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  entryMetaText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  entryNotesText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  entryActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  entrySettleBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entrySettleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#064e3b',
  },
  entryUpiBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryUpiBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
