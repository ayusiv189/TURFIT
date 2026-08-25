import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenPlayerBookings,
  cancelBookingWithSlotRelease,
} from '../../services/dbService';
import { addTurfReview } from '../../services/communityService';
import { Booking } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  CheckCircle,
  QrCode,
  X,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  Ban,
} from 'lucide-react-native';

export const PlayerBookingsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('UPCOMING');
  const [refreshing, setRefreshing] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Booking | null>(null);

  // Cancellation Modal State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // Live real-time listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenPlayerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredBookings = bookings.filter((b) => {
    const today = new Date().toISOString().split('T')[0];
    if (activeTab === 'UPCOMING') return b.bookingStatus === 'CONFIRMED' && b.date >= today;
    if (activeTab === 'COMPLETED') return b.bookingStatus === 'COMPLETED' || (b.bookingStatus === 'CONFIRMED' && b.date < today);
    if (activeTab === 'CANCELLED') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  const handleReviewSubmit = async () => {
    if (!reviewBooking || !user || !profile) return;
    setSubmittingReview(true);
    try {
      await addTurfReview({
        turfId: reviewBooking.turfId,
        turfName: reviewBooking.turfName,
        bookingId: reviewBooking.id,
        playerId: user.uid,
        playerName: profile.displayName || 'Athlete',
        playerPhotoURL: profile.photoURL || null,
        rating,
        comment: comment.trim(),
      });
      setReviewBooking(null);
      setComment('');
    } catch (err) {
      console.warn('Error submitting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConfirmCancelSlot = async () => {
    if (!bookingToCancel || !user) return;
    setCancelling(true);
    try {
      const reason = cancelReason.trim() || 'Cancelled by player';
      await cancelBookingWithSlotRelease(bookingToCancel.id, 'PLAYER', reason, user.uid);
      setCancelSuccessMsg('Slot successfully cancelled and released back to available.');
      setTimeout(() => {
        setBookingToCancel(null);
        setCancelSuccessMsg('');
        setCancelReason('');
      }, 1600);
    } catch (err) {
      console.warn('Error cancelling slot:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'UPCOMING' && styles.tabButtonActive]}
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'UPCOMING' && styles.tabButtonTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'COMPLETED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'COMPLETED' && styles.tabButtonTextActive]}>
            Past
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CANCELLED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CANCELLED')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'CANCELLED' && styles.tabButtonTextActive]}>
            Cancelled
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'ALL' && styles.tabButtonTextActive]}>
            All ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

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
                  <Text style={styles.turfName}>{item.turfName}</Text>
                  <Text style={styles.arenaName}>{item.arenaName} • {item.sport}</Text>
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

              <View style={styles.infoRow}>
                <Calendar size={13} color="#94a3b8" />
                <Text style={styles.infoText}>{item.date} ({item.day})</Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={13} color="#94a3b8" />
                <Text style={styles.infoText}>{item.startTime} - {item.endTime}</Text>
              </View>

              <View style={styles.infoRow}>
                <CreditCard size={13} color="#94a3b8" />
                <Text style={styles.infoText}>
                  Total: ₹{item.totalAmount} (Paid: ₹{item.amountPaid || 0} • Due: ₹{item.amountDue || 0})
                </Text>
              </View>

              {!isCancelled && (
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.qrButton}
                    onPress={() => setShowQrModal(item)}
                  >
                    <QrCode size={14} color="#10b981" />
                    <Text style={styles.qrButtonText}>Entry Pass</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelSlotBtn}
                    onPress={() => setBookingToCancel(item)}
                  >
                    <Ban size={14} color="#ef4444" />
                    <Text style={styles.cancelSlotBtnText}>Cancel Slot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => setReviewBooking(item)}
                  >
                    <Star size={14} color="#f59e0b" />
                    <Text style={styles.rateButtonText}>Rate Turf</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Calendar size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptyDesc}>Your reserved matches and passes will appear here.</Text>
          </View>
        }
      />

      {/* Cancel Slot Modal */}
      <Modal visible={!!bookingToCancel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalCard}>
            {cancelSuccessMsg ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <CheckCircle size={48} color="#10b981" />
                <Text style={styles.cancelSuccessTitle}>Slot Cancelled</Text>
                <Text style={styles.cancelSuccessSub}>{cancelSuccessMsg}</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.cancelModalTitle}>Cancel This Slot?</Text>
                  </View>
                  <TouchableOpacity onPress={() => setBookingToCancel(null)}>
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cancelModalNotice}>
                  Cancelling will immediately release the slot back to the public pool.
                  {bookingToCancel?.amountPaid ? ` A full refund of ₹${bookingToCancel.amountPaid} will be credited to your account.` : ' Any pending dues associated with this slot will be removed.'}
                </Text>

                <View style={styles.cancelTurfSummary}>
                  <Text style={styles.cancelTurfName}>{bookingToCancel?.turfName}</Text>
                  <Text style={styles.cancelTurfMeta}>
                    {bookingToCancel?.date} • {bookingToCancel?.startTime} - {bookingToCancel?.endTime}
                  </Text>
                </View>

                <TextInput
                  style={styles.cancelReasonInput}
                  placeholder="Reason for cancellation (optional)"
                  placeholderTextColor="#64748b"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />

                <TouchableOpacity
                  style={[styles.confirmCancelBtn, cancelling && styles.disabledBtn]}
                  disabled={cancelling}
                  onPress={handleConfirmCancelSlot}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>Yes, Cancel & Release Slot</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keepSlotBtn}
                  onPress={() => setBookingToCancel(null)}
                >
                  <Text style={styles.keepSlotBtnText}>Keep My Booking</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QR Entry Pass Modal */}
      <Modal visible={!!showQrModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ground Entry Pass</Text>
              <TouchableOpacity onPress={() => setShowQrModal(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrBox}>
              <QrCode size={140} color="#064e3b" />
            </View>

            <Text style={styles.qrPassId}>Booking Ref: {showQrModal?.bookingId}</Text>
            <Text style={styles.qrTurfName}>{showQrModal?.turfName}</Text>
            <Text style={styles.qrTime}>{showQrModal?.date} • {showQrModal?.startTime}</Text>

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowQrModal(null)}>
              <Text style={styles.closeModalText}>Close Pass</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={!!reviewBooking} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate {reviewBooking?.turfName}</Text>
              <TouchableOpacity onPress={() => setReviewBooking(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Star
                    size={28}
                    color="#f59e0b"
                    fill={star <= rating ? '#f59e0b' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="How was the turf pitch, lighting, and ground amenities?"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <TouchableOpacity
              style={[styles.submitReviewBtn, submittingReview && styles.disabledBtn]}
              onPress={handleReviewSubmit}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.submitReviewText}>Submit Review</Text>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#10b981',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#064e3b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardCancelled: {
    opacity: 0.65,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  turfName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  arenaName: {
    fontSize: 12,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qrButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
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
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  rateButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
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
  qrModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  qrBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginVertical: 12,
  },
  qrPassId: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '700',
    marginBottom: 4,
  },
  qrTurfName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  qrTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: '#1e293b',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  reviewInput: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitReviewBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitReviewText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
