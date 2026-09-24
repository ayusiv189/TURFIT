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
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenPlayerBookings,
  cancelBookingWithSlotRelease,
  calculateCancellationBreakdown,
  CancellationBreakdown,
  listenBookingShares,
  addBookingPlayerShare,
  updateBookingShareStatus,
  removeBookingPlayerShare,
  updateBookingSplitSquad,
  getTurfById,
  collectCounterDueForBooking,
  isBookingConcluded,
  getLocalDateString,
  parseTimeToMinutes,
  getAdminPaymentConfig,
} from '../../services/dbService';
import { addTurfReview } from '../../services/communityService';
import { Booking, BookingPlayerShare } from '../../types';
import { DirectUpiModal } from '../../components/DirectUpiModal';
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
  ShieldAlert,
  Info,
  DollarSign,
  UserX,
  Users,
  UserPlus,
  Trash2,
  Share2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react-native';
import { openWhatsAppNotification } from '../../services/whatsappService';

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

  // Split & Add Players Modal State
  const [splitBooking, setSplitBooking] = useState<Booking | null>(null);
  const [bookingShares, setBookingShares] = useState<BookingPlayerShare[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [customSquadCount, setCustomSquadCount] = useState(1);
  const [copiedShareText, setCopiedShareText] = useState(false);

  // Cancellation Modal State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationBreakdown, setCancellationBreakdown] = useState<CancellationBreakdown | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // Direct UPI Due Payment State
  const [payDueBooking, setPayDueBooking] = useState<Booking | null>(null);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);
  const [dueTurfUpiId, setDueTurfUpiId] = useState('turfit.sports@okaxis');
  const [dueTurfBeneficiary, setDueTurfBeneficiary] = useState('TruFit Sports Admin');

  useEffect(() => {
    getAdminPaymentConfig().then((cfg) => {
      if (cfg) {
        setAdminPaymentConfig(cfg);
        if (cfg.upiId) setDueTurfUpiId(cfg.upiId);
        if (cfg.beneficiaryName) setDueTurfBeneficiary(cfg.beneficiaryName);
      }
    }).catch((err) => console.warn('Error loading admin payment config:', err));
  }, []);

  const handleOpenPayBookingDue = async (booking: Booking) => {
    setPayDueBooking(booking);
    if (adminPaymentConfig?.upiId) {
      setDueTurfUpiId(adminPaymentConfig.upiId);
      setDueTurfBeneficiary(adminPaymentConfig.beneficiaryName || 'TruFit Sports Admin');
    }
  };

  // Live real-time listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenPlayerBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    return () => unsubscribe();
  }, [user]);

  // Live shares listener for active split modal
  useEffect(() => {
    if (!splitBooking) {
      setBookingShares([]);
      return;
    }
    const unsubscribe = listenBookingShares(splitBooking.id, (shares) => {
      setBookingShares(shares);
    });
    return () => unsubscribe();
  }, [splitBooking]);

  const handleOpenSplitModal = (booking: Booking) => {
    setSplitBooking(booking);
    setCustomSquadCount(booking.numberOfPlayers || 1);
    setNewPlayerName('');
    setNewPlayerPhone('');
    setCopiedShareText(false);
  };

  const handleUpdateSquadCount = async (count: number) => {
    if (!splitBooking) return;
    setCustomSquadCount(count);
    try {
      await updateBookingSplitSquad(splitBooking.id, count);
    } catch (err) {
      console.warn('Error updating squad count:', err);
    }
  };

  const handleAddTeammate = async () => {
    if (!splitBooking || !newPlayerName.trim()) return;
    setAddingPlayer(true);
    try {
      await addBookingPlayerShare(splitBooking, {
        playerName: newPlayerName.trim(),
        playerPhone: newPlayerPhone.trim(),
        status: 'PENDING',
      });
      setNewPlayerName('');
      setNewPlayerPhone('');
      setCustomSquadCount((prev) => prev + 1);
    } catch (err) {
      console.warn('Error adding teammate share:', err);
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleToggleSharePayment = async (share: BookingPlayerShare) => {
    try {
      const nextStatus = share.status === 'PAID' ? 'PENDING' : 'PAID';
      await updateBookingShareStatus(share.id, nextStatus);
    } catch (err) {
      console.warn('Error toggling payment status:', err);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!splitBooking) return;
    try {
      await removeBookingPlayerShare(splitBooking.id, shareId);
      setCustomSquadCount((prev) => Math.max(1, prev - 1));
    } catch (err) {
      console.warn('Error removing share:', err);
    }
  };

  const handleCopySplitNote = () => {
    if (!splitBooking) return;
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  // Helper to determine game live / over / upcoming status
  const getBookingLiveStatus = (b: Booking) => {
    if (b.bookingStatus === 'CANCELLED') return 'CANCELLED';
    if (b.isNoShow) return 'NOSHOW';

    const isPendingPayment = (b.amountDue || 0) > 0 || b.paymentStatus !== 'PAID';

    if (b.bookingStatus === 'COMPLETED' || isBookingConcluded(b)) {
      return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
    }

    const todayStr = getLocalDateString();
    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    if (b.date < todayStr) {
      return isPendingPayment ? 'OVER_UNPAID' : 'GAME_OVER';
    } else if (b.date > todayStr) {
      return isPendingPayment ? 'UPCOMING_UNPAID' : 'UPCOMING';
    } else {
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

  const isMatchConcluded = (b: Booking): boolean => {
    return isBookingConcluded(b);
  };

  const filteredBookings = bookings.filter((b) => {
    const isConcluded = isMatchConcluded(b);
    // USER DIRECTIVE: When match concluded, show that ONLY on past bookings, NOT on upcoming
    if (activeTab === 'UPCOMING') return b.bookingStatus === 'CONFIRMED' && !isConcluded;
    if (activeTab === 'COMPLETED') return b.bookingStatus === 'COMPLETED' || (b.bookingStatus !== 'CANCELLED' && isConcluded);
    if (activeTab === 'CANCELLED') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  const upcomingCount = bookings.filter((b) => b.bookingStatus === 'CONFIRMED' && !isMatchConcluded(b)).length;
  const pastCount = bookings.filter((b) => b.bookingStatus === 'COMPLETED' || (b.bookingStatus !== 'CANCELLED' && isMatchConcluded(b))).length;
  const cancelledCount = bookings.filter((b) => b.bookingStatus === 'CANCELLED').length;

  const handleOpenCancelModal = (booking: Booking) => {
    const liveStatus = getBookingLiveStatus(booking);
    if (liveStatus === 'GAME_OVER' || liveStatus === 'OVER_UNPAID') {
      Alert.alert('Match Concluded', 'This match has already ended and cannot be cancelled.');
      return;
    }
    const breakdown = calculateCancellationBreakdown(booking);
    setCancellationBreakdown(breakdown);
    setBookingToCancel(booking);
    setCancelReason('');
    setCancelSuccessMsg('');
  };

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
      const breakdown = await cancelBookingWithSlotRelease(bookingToCancel.id, 'PLAYER', reason, bookingToCancel.slotId);
      setCancelSuccessMsg(
        breakdown.isFreeCancellation
          ? `Full refund of ₹${breakdown.refundAmount} issued. Due reversed.`
          : `Late cancellation processed. Refund: ₹${breakdown.refundAmount} (Penalty: ₹${breakdown.penaltyFee}).`
      );
      setTimeout(() => {
        setBookingToCancel(null);
        setCancelSuccessMsg('');
        setCancelReason('');
        setCancellationBreakdown(null);
      }, 2000);
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
            Upcoming ({upcomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'COMPLETED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'COMPLETED' && styles.tabButtonTextActive]}>
            Past ({pastCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CANCELLED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CANCELLED')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'CANCELLED' && styles.tabButtonTextActive]}>
            Cancelled ({cancelledCount})
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
          const isNoShow = item.isNoShow;
          const advancePaid = item.amountPaid || 0;
          const dueAmount = item.amountDue || 0;
          const timingStatus = getBookingLiveStatus(item);

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.turfName}>{item.turfName}</Text>
                    {isLive && (
                      <View style={styles.livePulseBadge}>
                        <Text style={styles.livePulseText}>● LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.arenaName}>{item.arenaName} • {item.sport}</Text>
                </View>

                {/* Status Indicator Box */}
                {isCancelled ? (
                  /* Replaced 'canceled' text with a clear visual cross icon */
                  <View style={styles.crossBox} accessibilityLabel="Booking Cancelled">
                    <X size={18} color="#ef4444" strokeWidth={3} />
                  </View>
                ) : isNoShow ? (
                  <View style={styles.statusNoShowBadge}>
                    <UserX size={12} color="#f87171" />
                    <Text style={styles.statusNoShowText}>NO SHOW</Text>
                  </View>
                ) : isLive ? (
                  /* Green for active/live games */
                  <View style={styles.statusLiveBadge}>
                    <Text style={styles.statusLiveText}>● LIVE GAME</Text>
                  </View>
                ) : isGameOverUnpaid ? (
                  /* Yellow for payment-pending / over-games */
                  <View style={styles.statusGameOverUnpaidBadge}>
                    <AlertTriangle size={12} color="#eab308" />
                    <Text style={styles.statusGameOverUnpaidText}>GAME OVER • DUE ₹{dueAmount}</Text>
                  </View>
                ) : isGameOver ? (
                  /* Red for over/completed games */
                  <View style={styles.statusGameOverBadge}>
                    <Text style={styles.statusGameOverText}>GAME OVER</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.statusBadge,
                      item.paymentStatus === 'PAID'
                        ? styles.statusPaid
                        : item.paymentStatus === 'PARTIALLY_PAID'
                        ? styles.statusPartial
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.paymentStatus === 'PAID'
                          ? styles.statusTextPaid
                          : item.paymentStatus === 'PARTIALLY_PAID'
                          ? styles.statusTextPartial
                          : styles.statusTextPending,
                      ]}
                    >
                      {item.paymentStatus === 'PAID' ? 'CONFIRMED' : `DUE ₹${dueAmount}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoRow}>
                <Calendar size={13} color="#94a3b8" />
                <Text style={styles.infoText}>{item.date} ({item.day})</Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={13} color="#94a3b8" />
                <Text style={styles.infoText}>{item.startTime} - {item.endTime}</Text>
              </View>

              {/* Payment Financial Breakdown */}
              <View style={styles.paymentChipsRow}>
                <View style={styles.paymentChipPaid}>
                  <Text style={styles.paymentChipPaidText}>Paid: ₹{advancePaid}</Text>
                </View>
                {item.convenienceFee !== undefined && item.convenienceFee > 0 && (
                  <View style={[styles.paymentChipPaid, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                    <Text style={[styles.paymentChipPaidText, { color: '#38bdf8' }]}>Fee: ₹{item.convenienceFee}</Text>
                  </View>
                )}
                {dueAmount > 0 && !isCancelled && (
                  <View style={styles.paymentChipDue}>
                    <Text style={styles.paymentChipDueText}>Due at Turf: ₹{dueAmount}</Text>
                  </View>
                )}
                {isCancelled && item.refundAmount !== undefined && item.refundAmount > 0 && (
                  <View style={styles.paymentChipRefund}>
                    <Text style={styles.paymentChipRefundText}>Refunded: ₹{item.refundAmount}</Text>
                  </View>
                )}
              </View>

              {!isCancelled && (
                <View style={styles.cardFooterContainer}>
                  {/* Primary Operational Actions */}
                  <View style={styles.primaryActionRow}>
                    {dueAmount > 0 && !isGameOver && !isGameOverUnpaid ? (
                      <>
                        <TouchableOpacity
                          style={styles.primaryPayBtn}
                          onPress={() => handleOpenPayBookingDue(item)}
                          activeOpacity={0.8}
                        >
                          <CreditCard size={15} color="#10b981" />
                          <Text style={styles.primaryPayBtnText} numberOfLines={1}>
                            Pay Due ₹{dueAmount}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryPassBtn}
                          onPress={() => setShowQrModal(item)}
                          activeOpacity={0.8}
                        >
                          <QrCode size={15} color="#38bdf8" />
                          <Text style={styles.primaryPassBtnText} numberOfLines={1}>
                            Entry Pass
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : isGameOver || isGameOverUnpaid ? (
                      <>
                        {isGameOverUnpaid && dueAmount > 0 && (
                          <TouchableOpacity
                            style={styles.primaryPayBtnOver}
                            onPress={() => handleOpenPayBookingDue(item)}
                            activeOpacity={0.8}
                          >
                            <CreditCard size={15} color="#ef4444" />
                            <Text style={styles.primaryPayBtnOverText} numberOfLines={1}>
                              Settle Due ₹{dueAmount}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.primaryRateBtn,
                            !(isGameOverUnpaid && dueAmount > 0) && { flex: 1 },
                          ]}
                          onPress={() => setReviewBooking(item)}
                          activeOpacity={0.8}
                        >
                          <Star size={15} color="#f59e0b" fill="#f59e0b" />
                          <Text style={styles.primaryRateBtnText} numberOfLines={1}>
                            Rate Experience
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      /* Fully Paid Active Booking */
                      <TouchableOpacity
                        style={styles.primaryFullPassBtn}
                        onPress={() => setShowQrModal(item)}
                        activeOpacity={0.8}
                      >
                        <QrCode size={16} color="#10b981" />
                        <Text style={styles.primaryFullPassBtnText} numberOfLines={1}>
                          View Entry Pass (QR Code)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Secondary Management Row */}
                  <View style={styles.secondaryActionRow}>
                    <TouchableOpacity
                      style={styles.secondarySquadBtn}
                      onPress={() => handleOpenSplitModal(item)}
                      activeOpacity={0.7}
                    >
                      <Users size={14} color="#38bdf8" />
                      <Text style={styles.secondarySquadBtnText} numberOfLines={1}>
                        Squad Split ({item.numberOfPlayers || 1}P)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryWhatsAppBtn}
                      onPress={() => openWhatsAppNotification(item, item.playerPhone, 'PLAYER')}
                      activeOpacity={0.7}
                    >
                      <MessageSquare size={13} color="#25D366" />
                      <Text style={styles.secondaryWhatsAppBtnText} numberOfLines={1}>
                        WhatsApp
                      </Text>
                    </TouchableOpacity>

                    {!isGameOver && !isGameOverUnpaid ? (
                      <TouchableOpacity
                        style={styles.secondaryCancelBtn}
                        onPress={() => handleOpenCancelModal(item)}
                        activeOpacity={0.7}
                      >
                        <Ban size={14} color="#ef4444" />
                        <Text style={styles.secondaryCancelBtnText} numberOfLines={1}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.secondaryReceiptBtn}
                        onPress={() => setShowQrModal(item)}
                        activeOpacity={0.7}
                      >
                        <QrCode size={14} color="#94a3b8" />
                        <Text style={styles.secondaryReceiptBtnText} numberOfLines={1}>
                          Match Pass
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
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

      {/* Dynamic Real-Time Cancellation & Policy Breakdown Modal */}
      <Modal visible={!!bookingToCancel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalCard}>
            {cancelSuccessMsg ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <CheckCircle size={48} color="#10b981" />
                <Text style={styles.cancelSuccessTitle}>Cancellation Complete</Text>
                <Text style={styles.cancelSuccessSub}>{cancelSuccessMsg}</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.cancelModalTitle}>Cancel Match Reservation?</Text>
                  </View>
                  <TouchableOpacity onPress={() => setBookingToCancel(null)}>
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Real-Time Policy Window Banner */}
                {cancellationBreakdown && (
                  <View style={[
                    styles.windowBreakdownBox,
                    cancellationBreakdown.isFreeCancellation ? styles.windowFreeBox : styles.windowLateBox
                  ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Clock size={15} color={cancellationBreakdown.isFreeCancellation ? '#10b981' : '#f59e0b'} />
                      <Text style={[
                        styles.windowTitle,
                        { color: cancellationBreakdown.isFreeCancellation ? '#10b981' : '#f59e0b' }
                      ]}>
                        {cancellationBreakdown.windowLabel} ({cancellationBreakdown.hoursRemaining}h remaining)
                      </Text>
                    </View>
                    <Text style={styles.windowDesc}>
                      {cancellationBreakdown.policyDescription}
                    </Text>

                    <View style={styles.breakdownDetails}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Advance Paid:</Text>
                        <Text style={styles.breakdownVal}>₹{cancellationBreakdown.originalPaid}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Late Cancellation Fee:</Text>
                        <Text style={[styles.breakdownVal, { color: cancellationBreakdown.penaltyFee > 0 ? '#ef4444' : '#10b981' }]}>
                          ₹{cancellationBreakdown.penaltyFee}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Calculated Refund:</Text>
                        <Text style={[styles.breakdownVal, { color: '#10b981', fontWeight: '800' }]}>
                          ₹{cancellationBreakdown.refundAmount}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

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
                    <Text style={styles.confirmCancelBtnText}>
                      Confirm Cancellation & Release Slot
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.keepSlotBtn}
                  onPress={() => setBookingToCancel(null)}
                >
                  <Text style={styles.keepSlotBtnText}>Keep My Reservation</Text>
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

            {/* Invoice Breakdown */}
            <View style={styles.passInvoiceBox}>
              <View style={styles.passInvoiceRow}>
                <Text style={styles.passInvoiceLabel}>Court Reservation:</Text>
                <Text style={styles.passInvoiceVal}>
                  ₹{showQrModal?.ownerShare !== undefined ? showQrModal.ownerShare : ((showQrModal?.totalAmount || 0) - (showQrModal?.convenienceFee || 0))}
                </Text>
              </View>
              {showQrModal?.convenienceFee !== undefined && showQrModal.convenienceFee > 0 && (
                <View style={styles.passInvoiceRow}>
                  <Text style={[styles.passInvoiceLabel, { color: '#38bdf8' }]}>Convenience Fee:</Text>
                  <Text style={[styles.passInvoiceVal, { color: '#38bdf8' }]}>+₹{showQrModal.convenienceFee}</Text>
                </View>
              )}
              <View style={[styles.passInvoiceRow, { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.passInvoiceLabel, { color: '#f8fafc', fontWeight: '700' }]}>Total Fee:</Text>
                <Text style={[styles.passInvoiceVal, { color: '#f8fafc', fontWeight: '700' }]}>
                  ₹{showQrModal?.playerShareAmount || showQrModal?.totalAmount}
                </Text>
              </View>
              <View style={styles.passInvoiceRow}>
                <Text style={styles.passInvoiceLabel}>Paid Online:</Text>
                <Text style={[styles.passInvoiceVal, { color: '#10b981', fontWeight: '700' }]}>₹{showQrModal?.amountPaid}</Text>
              </View>
              {(showQrModal?.amountDue || 0) > 0 && (
                <View style={styles.passInvoiceRow}>
                  <Text style={styles.passInvoiceLabel}>Due at Turf:</Text>
                  <Text style={[styles.passInvoiceVal, { color: '#f59e0b', fontWeight: '700' }]}>₹{showQrModal?.amountDue}</Text>
                </View>
              )}
            </View>
 
            <TouchableOpacity
              style={styles.whatsappQrBtn}
              onPress={() => showQrModal && openWhatsAppNotification(showQrModal, showQrModal.playerPhone, 'PLAYER')}
              activeOpacity={0.8}
            >
              <MessageSquare size={16} color="#052e16" />
              <Text style={styles.whatsappQrBtnText}>Send Pass to WhatsApp</Text>
            </TouchableOpacity>

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

      {/* Split & Add Players Modal */}
      <Modal visible={!!splitBooking} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.splitModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={20} color="#38bdf8" />
                <Text style={styles.splitModalTitle}>Squad Cost Split</Text>
              </View>
              <TouchableOpacity onPress={() => setSplitBooking(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {splitBooking && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {/* Match Summary Banner */}
                <View style={styles.splitTurfBanner}>
                  <Text style={styles.splitTurfName}>{splitBooking.turfName}</Text>
                  <Text style={styles.splitTurfMeta}>
                    {splitBooking.sport} • {splitBooking.date} • {splitBooking.startTime} - {splitBooking.endTime}
                  </Text>
                </View>

                {/* Squad Count Selector */}
                <Text style={styles.splitSectionLabel}>Total Playing Squad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.splitChipsScroll}>
                  {[1, 2, 4, 6, 8, 10, 12, 14, 16].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.splitCountChip,
                        customSquadCount === num && styles.splitCountChipActive,
                      ]}
                      onPress={() => handleUpdateSquadCount(num)}
                    >
                      <Text
                        style={[
                          styles.splitCountText,
                          customSquadCount === num && styles.splitCountTextActive,
                        ]}
                      >
                        {num} {num === 1 ? 'Solo' : 'Athletes'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Real-Time Split Cost Calculation Box */}
                <View style={styles.splitMathBox}>
                  <View style={styles.splitMathRow}>
                    <Text style={styles.splitMathLabel}>Total Slot Price:</Text>
                    <Text style={styles.splitMathVal}>₹{splitBooking.totalAmount}</Text>
                  </View>
                  <View style={styles.splitMathRow}>
                    <Text style={styles.splitMathLabel}>Divided across {customSquadCount} athletes:</Text>
                    <Text style={styles.splitMathShareVal}>
                      ₹{Math.round(splitBooking.totalAmount / Math.max(1, customSquadCount))} / player
                    </Text>
                  </View>
                </View>

                {/* Add Teammate Input */}
                <Text style={styles.splitSectionLabel}>Add Teammate (Before or After Match)</Text>
                <View style={styles.addPlayerRow}>
                  <TextInput
                    style={styles.addPlayerInput}
                    placeholder="Teammate Name (e.g. Rahul S)"
                    placeholderTextColor="#64748b"
                    value={newPlayerName}
                    onChangeText={setNewPlayerName}
                  />
                  <TextInput
                    style={[styles.addPlayerInput, { flex: 0.8 }]}
                    placeholder="Phone / UPI ID (opt)"
                    placeholderTextColor="#64748b"
                    value={newPlayerPhone}
                    onChangeText={setNewPlayerPhone}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.addPlayerBtn, (!newPlayerName.trim() || addingPlayer) && styles.disabledBtn]}
                  disabled={!newPlayerName.trim() || addingPlayer}
                  onPress={handleAddTeammate}
                >
                  {addingPlayer ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <UserPlus size={16} color="#0f172a" />
                      <Text style={styles.addPlayerBtnText}>Add to Match Split</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Squad Members List */}
                <Text style={styles.splitSectionLabel}>
                  Squad Payment Status ({bookingShares.length + 1} Logged)
                </Text>

                {/* Host Record */}
                <View style={styles.shareItemCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.shareItemName}>{splitBooking.playerName} (Host)</Text>
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>HOST</Text>
                      </View>
                    </View>
                    <Text style={styles.shareItemMeta}>
                      Share: ₹{Math.round(splitBooking.totalAmount / Math.max(1, customSquadCount))} • Paid: ₹{splitBooking.amountPaid || 0}
                    </Text>
                  </View>
                  <View style={[styles.shareStatusPill, styles.shareStatusPaid]}>
                    <Text style={styles.shareStatusPaidText}>
                      {splitBooking.amountPaid >= splitBooking.totalAmount ? 'PAID FULL' : 'PAID ADVANCE'}
                    </Text>
                  </View>
                </View>

                {/* Teammates Records */}
                {bookingShares.map((share) => (
                  <View key={share.id} style={styles.shareItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareItemName}>{share.playerName}</Text>
                      <Text style={styles.shareItemMeta}>
                        Share: ₹{share.shareAmount} {share.playerEmail ? `• ${share.playerEmail}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.shareStatusPill,
                        share.status === 'PAID' ? styles.shareStatusPaid : styles.shareStatusDue,
                      ]}
                      onPress={() => handleToggleSharePayment(share)}
                    >
                      <Text
                        style={[
                          styles.shareStatusText,
                          share.status === 'PAID' ? styles.shareStatusPaidText : styles.shareStatusDueText,
                        ]}
                      >
                        {share.status === 'PAID' ? '✓ PAID' : 'PENDING'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteShareBtn}
                      onPress={() => handleRemoveShare(share.id)}
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Quick Share / Copy Payment Request */}
                <TouchableOpacity
                  style={styles.copySplitBtn}
                  onPress={handleCopySplitNote}
                >
                  {copiedShareText ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={16} color="#10b981" />
                      <Text style={[styles.copySplitBtnText, { color: '#10b981' }]}>
                        Split Request Copied to Clipboard!
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Copy size={16} color="#38bdf8" />
                      <Text style={styles.copySplitBtnText}>
                        Copy Payment Request Link / Text for WhatsApp
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Direct UPI Modal for Booking Dues */}
      {payDueBooking && (
        <DirectUpiModal
          visible={!!payDueBooking}
          onClose={() => setPayDueBooking(null)}
          amount={payDueBooking.amountDue || 0}
          upiId={dueTurfUpiId}
          payeeName={dueTurfBeneficiary}
          transactionNote={`Due for ${payDueBooking.turfName} (${payDueBooking.date})`}
          bookingRef={payDueBooking.bookingId || payDueBooking.id?.slice(-8)}
          subTitle={`0% Fee Direct Settlement to ${dueTurfBeneficiary}`}
          onConfirmPayment={async (utrRef) => {
            await collectCounterDueForBooking(
              payDueBooking.id,
              payDueBooking.amountDue || 0,
              'UPI',
              'Player app direct UPI due settlement',
              utrRef
            );
            setPayDueBooking(null);
          }}
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
  splitModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  splitModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  splitTurfBanner: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  splitTurfName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  splitTurfMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  splitSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  splitChipsScroll: {
    marginBottom: 10,
  },
  splitCountChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  splitCountChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  splitCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  splitCountTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  splitMathBox: {
    backgroundColor: '#0c1a2e',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0369a1',
    marginVertical: 6,
  },
  splitMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  splitMathLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  splitMathVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  splitMathShareVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addPlayerInput: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addPlayerBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPlayerBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  shareItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  shareItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  shareItemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  hostBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f59e0b',
  },
  shareStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  shareStatusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  shareStatusDue: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  shareStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  shareStatusPaidText: {
    color: '#10b981',
  },
  shareStatusDueText: {
    color: '#f59e0b',
  },
  deleteShareBtn: {
    padding: 6,
  },
  copySplitBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  copySplitBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabButtonTextActive: {
    color: '#10b981',
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  cardLive: {
    borderColor: '#10b981',
    backgroundColor: '#0c1a1f',
    borderWidth: 1.5,
  },
  cardGameOver: {
    borderColor: '#ef4444',
    backgroundColor: '#180f14',
    borderWidth: 1.5,
  },
  cardGameOverUnpaid: {
    borderColor: '#eab308',
    backgroundColor: '#1c170a',
    borderWidth: 1.5,
  },
  cardCancelled: {
    opacity: 0.7,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderWidth: 1,
  },
  cardNoShow: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
  },
  crossBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLiveBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusLiveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  statusGameOverBadge: {
    backgroundColor: '#450a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusGameOverText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  statusGameOverUnpaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#422006',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eab308',
  },
  statusGameOverUnpaidText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
  },
  statusNoShowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#450a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  statusNoShowText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  livePulseBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  livePulseText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  turfName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
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
  statusPartial: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusNoShow: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPaid: {
    color: '#10b981',
  },
  statusTextPartial: {
    color: '#38bdf8',
  },
  statusTextPending: {
    color: '#f59e0b',
  },
  statusTextCancelled: {
    color: '#ef4444',
  },
  statusTextNoShow: {
    color: '#f87171',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  paymentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  paymentChipPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentChipPaidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  paymentChipDue: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentChipDueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  paymentChipRefund: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentChipRefundText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  cardFooterContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryPayBtn: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  primaryPayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  primaryPassBtn: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  primaryPassBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  primaryFullPassBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  primaryFullPassBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  primaryRateBtn: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  primaryRateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  primaryPayBtnOver: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  primaryPayBtnOverText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  secondarySquadBtn: {
    flex: 1.2,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#131f37',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  secondarySquadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93c5fd',
  },
  secondaryCancelBtn: {
    flex: 0.8,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  secondaryCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f87171',
  },
  secondaryReceiptBtn: {
    flex: 0.8,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#131f37',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  secondaryReceiptBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    borderColor: '#ef4444',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  windowBreakdownBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  windowFreeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  windowLateBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  windowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  windowDesc: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },
  breakdownDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cancelTurfSummary: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cancelTurfName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cancelTurfMeta: {
    fontSize: 12,
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
    paddingVertical: 10,
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
    lineHeight: 18,
  },
  qrModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  qrBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginVertical: 16,
  },
  qrPassId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  qrTurfName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  qrTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 12,
  },
  passInvoiceBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  passInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  passInvoiceLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  passInvoiceVal: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
  },
  whatsappQrBtn: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 11,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  whatsappQrBtnText: {
    color: '#052e16',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryWhatsAppBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  secondaryWhatsAppBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#25D366',
  },
  closeModalButton: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeModalText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
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
    marginVertical: 14,
  },
  reviewInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    height: 90,
    textAlignVertical: 'top',
  },
  submitReviewBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitReviewText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
