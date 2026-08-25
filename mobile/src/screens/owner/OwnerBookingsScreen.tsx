import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenOwnerBookings,
  getOwnerTurfs,
  getArenasByTurf,
  updateBookingStatus,
  createManualBooking,
  cancelBookingWithSlotRelease,
} from '../../services/dbService';
import { Booking, Turf, Arena } from '../../types';
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
} from 'lucide-react-native';

export const OwnerBookingsScreen: React.FC<{ route?: any }> = ({ route }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'UNPAID' | 'CANCELLED'>('ALL');
  const [showManualModal, setShowManualModal] = useState(route?.params?.openManualModal || false);

  // Manual booking form
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

  // Owner Cancellation State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // Live real-time listener
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
        if (aList.length > 0) setSelectedArena(aList[0]);
      });
    }
  }, [selectedTurf]);

  const handleUpdatePayment = async (bookingId: string, status: 'PAID' | 'PENDING', paidAmount: number) => {
    try {
      await updateBookingStatus(bookingId, {
        paymentStatus: status,
        amountPaid: paidAmount,
        amountDue: 0,
      });
    } catch (err) {
      console.warn('Error updating payment:', err);
    }
  };

  const handleCreateWalkIn = async () => {
    if (!playerName.trim() || !selectedTurf || !selectedArena || !user) return;
    setCreating(true);
    try {
      const tot = parseInt(amount) || 1500;
      const pd = parseInt(amountPaid) || 0;
      const due = Math.max(0, tot - pd);

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
        playerName: playerName.trim(),
        playerPhone: playerPhone.trim(),
        date,
        day: 'Scheduled',
        startTime,
        endTime,
        duration: 60,
        totalAmount: tot,
        amountPaid: pd,
        amountDue: due,
        paymentStatus: due === 0 ? 'PAID' : 'PENDING',
        bookingType: 'MANUAL',
      });
      setShowManualModal(false);
      setPlayerName('');
      setPlayerPhone('');
    } catch (err) {
      console.warn('Error creating manual booking:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleOwnerConfirmCancel = async () => {
    if (!bookingToCancel || !user) return;
    setCancelling(true);
    try {
      const reason = cancelReason.trim() || 'Cancelled by Turf Owner';
      await cancelBookingWithSlotRelease(bookingToCancel.id, 'OWNER', reason, user.uid);
      setCancelSuccessMsg('Booking cancelled and slot released back to available.');
      setTimeout(() => {
        setBookingToCancel(null);
        setCancelSuccessMsg('');
        setCancelReason('');
      }, 1500);
    } catch (err) {
      console.warn('Error cancelling booking:', err);
    } finally {
      setCancelling(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.playerName.toLowerCase().includes(search.toLowerCase()) ||
      b.playerPhone?.includes(search) ||
      b.bookingId?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'TODAY') return b.date === todayStr && b.bookingStatus !== 'CANCELLED';
    if (filter === 'UNPAID') return (b.amountDue || 0) > 0 && b.bookingStatus !== 'CANCELLED';
    if (filter === 'CANCELLED') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.headerArea}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search athlete name, phone, ref..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filtersRow}>
          {(['ALL', 'TODAY', 'UNPAID', 'CANCELLED'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCancelled = item.bookingStatus === 'CANCELLED';
          return (
            <View style={[styles.card, isCancelled && styles.cardCancelled]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{item.playerName}</Text>
                  <Text style={styles.arenaName}>{item.turfName} • {item.arenaName}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  isCancelled
                    ? styles.statusCancelled
                    : item.paymentStatus === 'PAID'
                    ? styles.statusPaid
                    : styles.statusPending,
                ]}>
                  <Text style={[
                    styles.statusText,
                    isCancelled
                      ? styles.statusTextCancelled
                      : item.paymentStatus === 'PAID'
                      ? styles.statusTextPaid
                      : styles.statusTextPending,
                  ]}>
                    {isCancelled ? 'CANCELLED' : item.paymentStatus}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Calendar size={12} color="#94a3b8" />
                <Text style={styles.metaText}>{item.date} ({item.startTime} - {item.endTime})</Text>
              </View>

              <View style={styles.metaRow}>
                <CreditCard size={12} color="#94a3b8" />
                <Text style={styles.metaText}>
                  Total: ₹{item.totalAmount} (Paid: ₹{item.amountPaid || 0} • Due: ₹{item.amountDue || 0})
                </Text>
              </View>

              <View style={styles.actionsRow}>
                {!!item.playerPhone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${item.playerPhone}`)}
                  >
                    <Phone size={13} color="#38bdf8" />
                    <Text style={styles.callText}>Call Player</Text>
                  </TouchableOpacity>
                )}

                {!isCancelled && item.amountDue > 0 && (
                  <TouchableOpacity
                    style={styles.markPaidBtn}
                    onPress={() => handleUpdatePayment(item.id, 'PAID', item.totalAmount)}
                  >
                    <CheckCircle size={13} color="#064e3b" />
                    <Text style={styles.markPaidText}>Collect Due (₹{item.amountDue})</Text>
                  </TouchableOpacity>
                )}

                {!isCancelled && (
                  <TouchableOpacity
                    style={styles.cancelSlotBtn}
                    onPress={() => setBookingToCancel(item)}
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
            <Calendar size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptyDesc}>Bookings matching the selected filter will appear here.</Text>
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
                  <Text style={styles.cancelTurfName}>{bookingToCancel?.playerName} • {bookingToCancel?.turfName}</Text>
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
                    <Text style={styles.confirmCancelBtnText}>Release Slot & Cancel</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keepSlotBtn}
                  onPress={() => setBookingToCancel(null)}
                >
                  <Text style={styles.keepSlotBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Booking Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Walk-in Desk Booking</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Player / Team Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Verma"
              placeholderTextColor="#64748b"
              value={playerName}
              onChangeText={setPlayerName}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#64748b"
              value={playerPhone}
              onChangeText={setPlayerPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <Text style={styles.label}>Total Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Amount Collected (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.disabledBtn]}
              onPress={handleCreateWalkIn}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.createBtnText}>Confirm Desk Reservation</Text>
              )}
            </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#064e3b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardCancelled: {
    opacity: 0.6,
    borderColor: '#334155',
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
    color: '#ffffff',
  },
  arenaName: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPaid: {
    color: '#10b981',
  },
  statusTextPending: {
    color: '#f59e0b',
  },
  statusTextCancelled: {
    color: '#ef4444',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
    marginTop: 6,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  markPaidText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064e3b',
  },
  cancelSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelSlotBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },
  fabText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },
  cancelModalNotice: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginVertical: 12,
  },
  cancelTurfSummary: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cancelTurfName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  cancelTurfMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cancelReasonInput: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    fontWeight: '800',
  },
  keepSlotBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  keepSlotBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  cancelSuccessSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  createBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  createBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
