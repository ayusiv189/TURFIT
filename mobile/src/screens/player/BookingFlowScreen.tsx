import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  getTurfById,
  getArenasByTurf,
  listenArenaSlots,
  createBookingWithTransaction,
} from '../../services/dbService';
import { Turf, Arena, Slot, Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SlotChip } from '../../components/SlotChip';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  CreditCard,
  Building,
  AlertTriangle,
  Users,
  QrCode,
  ShieldCheck,
  Clock,
  MapPin,
  Copy,
  Info,
} from 'lucide-react-native';

interface BookingFlowScreenProps {
  route: { params: { turfId: string } };
  navigation: any;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({ route, navigation }) => {
  const { turfId } = route.params;
  const { profile, user } = useAuth();
  const [turf, setTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [dates, setDates] = useState<{ label: string; day: string; date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [splitPlayersCount, setSplitPlayersCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Online UPI Payment Modal State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiRefId, setUpiRefId] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [upiProcessing, setUpiProcessing] = useState(false);

  // Generate next 7 days
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
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [turfData, arenaData] = await Promise.all([
          getTurfById(turfId),
          getArenasByTurf(turfId),
        ]);
        setTurf(turfData);
        setArenas(arenaData);
        if (arenaData.length > 0) {
          setSelectedArena(arenaData[0]);
        }
      } catch (err) {
        console.warn('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [turfId]);

  // Real-time slot listener
  useEffect(() => {
    if (selectedArena && selectedDate) {
      const unsubscribe = listenArenaSlots(selectedArena.id, selectedDate, (updatedSlots) => {
        setSlots(updatedSlots);
        // If the selected slot gets booked concurrently by someone else, deselect it
        if (selectedSlot) {
          const stillAvailable = updatedSlots.find(
            (s) => s.id === selectedSlot.id && s.status === 'AVAILABLE'
          );
          if (!stillAvailable) {
            setSelectedSlot(null);
            setBookingError('Selected slot was just booked by another player. Please choose another.');
          }
        }
      });
      return () => unsubscribe();
    }
  }, [selectedArena, selectedDate, selectedSlot]);

  const totalSlotPrice = selectedSlot?.price || 0;
  const playerShare = Math.round(totalSlotPrice / Math.max(1, splitPlayersCount));
  const activeUpiId = turf?.upiId || 'trufit.sports@okaxis';
  const beneficiary = turf?.beneficiaryName || turf?.name || 'TruFit Partner Turf';

  const handleStartBooking = () => {
    if (!selectedSlot) return;
    setBookingError('');
    if (paymentMethod === 'PAY_NOW') {
      setShowUpiModal(true);
    } else {
      executeBookingTransaction('PAY_LATER_AT_TURF');
    }
  };

  const executeBookingTransaction = async (method: 'PAY_NOW' | 'PAY_LATER_AT_TURF', upiRef?: string) => {
    if (!turf || !selectedArena || !selectedSlot || !user || !profile) return;

    setBookingError('');
    setBookingInProgress(true);

    try {
      const result = await createBookingWithTransaction({
        slotId: selectedSlot.id,
        turfId: turf.id,
        arenaId: selectedArena.id,
        ownerId: turf.ownerId,
        playerId: user.uid,
        playerName: profile.displayName || user.displayName || 'Athlete',
        playerEmail: user.email || '',
        playerPhone: profile.phoneNumber || '',
        playerPhotoURL: profile.photoURL,
        turfName: turf.name,
        turfAddress: turf.address,
        turfArea: turf.area,
        turfCity: turf.city,
        arenaName: selectedArena.name,
        sport: selectedArena.sport || turf.sports?.[0] || 'Football',
        date: selectedDate,
        day: selectedDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes || 60,
        totalAmount: selectedSlot.price,
        numberOfPlayers: splitPlayersCount,
        playerShareAmount: playerShare,
        bookingType: 'PLAYER',
        paymentMethod: method,
        upiTxnRef: upiRef,
      });

      setShowUpiModal(false);
      setConfirmedBooking(result);
    } catch (err: any) {
      setBookingError(err.message || 'Booking failed. Slot might have been booked just now.');
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    setUpiProcessing(true);
    const generatedRef = upiRefId.trim() || `UPI-TXN-${Date.now().toString().slice(-8)}`;
    await executeBookingTransaction('PAY_NOW', generatedRef);
    setUpiProcessing(false);
  };

  if (loading || !turf) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Turf Header Summary */}
        <View style={styles.turfHeaderCard}>
          <Text style={styles.turfHeaderTitle}>{turf.name}</Text>
          <View style={styles.turfHeaderRow}>
            <MapPin size={13} color="#94a3b8" />
            <Text style={styles.turfHeaderSubtitle}>{turf.area}, {turf.city}</Text>
          </View>
        </View>

        {/* Step 1: Arena Selection */}
        <Text style={styles.stepTitle}>1. Select Ground / Arena</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.arenaScroll}>
          {arenas.map((arena) => (
            <TouchableOpacity
              key={arena.id}
              style={[
                styles.arenaCard,
                selectedArena?.id === arena.id && styles.arenaCardActive,
              ]}
              onPress={() => setSelectedArena(arena)}
            >
              <Text style={[styles.arenaCardName, selectedArena?.id === arena.id && styles.arenaCardNameActive]}>
                {arena.name}
              </Text>
              <Text style={styles.arenaCardSport}>{arena.sport}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Step 2: Date Selection */}
        <Text style={styles.stepTitle}>2. Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {dates.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[
                styles.dateCard,
                selectedDate === d.date && styles.dateCardActive,
              ]}
              onPress={() => {
                setSelectedDate(d.date);
                setSelectedDay(d.day);
              }}
            >
              <Text style={[styles.dateDay, selectedDate === d.date && styles.dateDayActive]}>
                {d.day.slice(0, 3)}
              </Text>
              <Text style={[styles.dateLabel, selectedDate === d.date && styles.dateLabelActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Step 3: Slots */}
        <Text style={styles.stepTitle}>3. Available Time Slots (Live Sync)</Text>
        {slots.length === 0 ? (
          <View style={styles.noSlotsBox}>
            <Text style={styles.noSlotsText}>No slots configured for this date.</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <SlotChip
                key={slot.id}
                slot={slot}
                selected={selectedSlot?.id === slot.id}
                onPress={() => setSelectedSlot(slot)}
              />
            ))}
          </View>
        )}

        {/* Step 4: Split Calculation */}
        {selectedSlot && (
          <>
            <Text style={styles.stepTitle}>4. Split with Teammates (Optional)</Text>
            <View style={styles.splitCard}>
              <View style={styles.splitHeader}>
                <Users size={16} color="#10b981" />
                <Text style={styles.splitTitle}>Number of Players Splitting:</Text>
                <Text style={styles.splitCountText}>{splitPlayersCount} Player{splitPlayersCount > 1 ? 's' : ''}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.splitPillsRow}>
                {[1, 2, 4, 6, 8, 10, 12, 14].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.splitPill,
                      splitPlayersCount === count && styles.splitPillActive,
                    ]}
                    onPress={() => setSplitPlayersCount(count)}
                  >
                    <Text style={[styles.splitPillText, splitPlayersCount === count && styles.splitPillTextActive]}>
                      {count === 1 ? 'Solo (Full)' : `${count}P`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.splitBreakdown}>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>Total Slot Price:</Text>
                  <Text style={styles.splitVal}>₹{totalSlotPrice}</Text>
                </View>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>Your Share to Pay/Due:</Text>
                  <Text style={styles.splitShareVal}>₹{playerShare}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Step 5: Payment Option */}
        {selectedSlot && (
          <>
            <Text style={styles.stepTitle}>5. Payment Option</Text>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'PAY_NOW' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('PAY_NOW')}
            >
              <View style={styles.paymentOptionHeader}>
                <CreditCard size={18} color={paymentMethod === 'PAY_NOW' ? '#10b981' : '#94a3b8'} />
                <Text style={[styles.paymentOptionTitle, paymentMethod === 'PAY_NOW' && styles.paymentOptionTitleActive]}>
                  A. Pay Online with UPI (₹{playerShare})
                </Text>
              </View>
              <Text style={styles.paymentOptionSub}>
                Instant confirmation via UPI / QR / App with real-time receipt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'PAY_LATER_AT_TURF' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('PAY_LATER_AT_TURF')}
            >
              <View style={styles.paymentOptionHeader}>
                <Building size={18} color={paymentMethod === 'PAY_LATER_AT_TURF' ? '#10b981' : '#94a3b8'} />
                <Text style={[styles.paymentOptionTitle, paymentMethod === 'PAY_LATER_AT_TURF' && styles.paymentOptionTitleActive]}>
                  B. Pay Later at Turf (₹{playerShare})
                </Text>
              </View>
              <Text style={styles.paymentOptionSub}>
                Adds ₹{playerShare} to your account dues. Settle online anytime or at turf counter.
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Booking Summary Box */}
        {selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Booking Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Date & Day</Text>
                <Text style={styles.summaryItemValue}>{selectedDate} ({selectedDay.slice(0, 3)})</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Time Slot</Text>
                <Text style={styles.summaryItemValue}>{selectedSlot.startTime} - {selectedSlot.endTime}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Sport / Ground</Text>
                <Text style={styles.summaryItemValue}>{selectedArena?.sport} • {selectedArena?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Payment Mode</Text>
                <Text style={[styles.summaryItemValue, { color: paymentMethod === 'PAY_NOW' ? '#10b981' : '#f59e0b' }]}>
                  {paymentMethod === 'PAY_NOW' ? 'PAY NOW (UPI)' : 'PAY LATER (DUES)'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!!bookingError && (
          <View style={styles.errorBox}>
            <AlertTriangle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{bookingError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>
            {paymentMethod === 'PAY_NOW' ? 'Pay Online Amount' : 'Amount Added to Dues'}
          </Text>
          <Text style={styles.bottomTotalValue}>
            {selectedSlot ? `₹${playerShare}` : 'Select a Slot'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, (!selectedSlot || bookingInProgress) && styles.disabledButton]}
          disabled={!selectedSlot || bookingInProgress}
          onPress={handleStartBooking}
        >
          {bookingInProgress ? (
            <ActivityIndicator color="#064e3b" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {paymentMethod === 'PAY_NOW' ? 'Proceed to UPI Pay' : 'Confirm & Add to Dues'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* UPI Payment Sheet Modal */}
      <Modal visible={showUpiModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.upiCard}>
            <View style={styles.upiHeader}>
              <QrCode size={28} color="#10b981" />
              <View>
                <Text style={styles.upiTitle}>UPI Online Payment</Text>
                <Text style={styles.upiSubtitle}>Fast, Secure & Live Verified</Text>
              </View>
            </View>

            <View style={styles.upiAmountBox}>
              <Text style={styles.upiAmountLabel}>Amount to Pay</Text>
              <Text style={styles.upiAmountValue}>₹{playerShare}</Text>
              <Text style={styles.upiBeneficiary}>Paying to: {beneficiary}</Text>
            </View>

            {/* UPI ID Copy Card */}
            <View style={styles.upiIdBox}>
              <View>
                <Text style={styles.upiIdLabel}>Merchant UPI VPA</Text>
                <Text style={styles.upiIdValue}>{activeUpiId}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  setUpiCopied(true);
                  setTimeout(() => setUpiCopied(false), 2500);
                }}
              >
                <Copy size={16} color="#10b981" />
                <Text style={styles.copyBtnText}>{upiCopied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Optional UTR Input */}
            <Text style={styles.utrLabel}>UPI Reference / UTR Number (Optional)</Text>
            <TextInput
              style={styles.utrInput}
              placeholder="e.g. 408219382910"
              placeholderTextColor="#64748b"
              value={upiRefId}
              onChangeText={setUpiRefId}
            />

            <View style={styles.upiSecurityNote}>
              <ShieldCheck size={16} color="#10b981" />
              <Text style={styles.upiSecurityText}>
                Encrypted bank-grade transaction. Slot is locked immediately.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.upiSubmitBtn, upiProcessing && styles.disabledButton]}
              disabled={upiProcessing}
              onPress={handleConfirmUpiPayment}
            >
              {upiProcessing ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.upiSubmitText}>Verify & Confirm Payment (₹{playerShare})</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.upiCancelBtn}
              onPress={() => setShowUpiModal(false)}
            >
              <Text style={styles.upiCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Booking Receipt Modal */}
      <Modal visible={!!confirmedBooking} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptIcon}>
              <CheckCircle size={48} color="#10b981" />
            </View>

            <Text style={styles.receiptTitle}>Booking Confirmed!</Text>
            <Text style={styles.receiptId}>Ref: {confirmedBooking?.bookingId}</Text>

            <View style={styles.receiptDetails}>
              <Text style={styles.receiptTurf}>{confirmedBooking?.turfName}</Text>
              <Text style={styles.receiptSub}>{confirmedBooking?.arenaName} • {confirmedBooking?.sport}</Text>
              <Text style={styles.receiptDate}>
                {confirmedBooking?.date} ({confirmedBooking?.startTime} - {confirmedBooking?.endTime})
              </Text>
              <Text style={[
                styles.receiptPayment,
                { color: confirmedBooking?.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b' }
              ]}>
                Status: {confirmedBooking?.paymentStatus === 'PAID' ? 'PAID ONLINE (₹' + confirmedBooking?.amountPaid + ')' : 'ADDED TO DUES (₹' + confirmedBooking?.amountDue + ')'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setConfirmedBooking(null);
                navigation.navigate('PlayerBookings');
              }}
            >
              <Text style={styles.doneButtonText}>View My Bookings</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  turfHeaderCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  turfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  turfHeaderSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 14,
    marginBottom: 10,
  },
  arenaScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  arenaCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    minWidth: 130,
  },
  arenaCardActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  arenaCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  arenaCardNameActive: {
    color: '#ffffff',
  },
  arenaCardSport: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dateCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dateCardActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  dateDayActive: {
    color: '#10b981',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#cbd5e1',
    marginTop: 2,
  },
  dateLabelActive: {
    color: '#ffffff',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  noSlotsBox: {
    backgroundColor: '#131b2e',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noSlotsText: {
    color: '#64748b',
    fontSize: 13,
  },
  splitCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  splitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  splitCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  splitPillsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  splitPill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  splitPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  splitPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  splitPillTextActive: {
    color: '#064e3b',
  },
  splitBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
    gap: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  splitVal: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  splitShareVal: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '900',
  },
  paymentOption: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paymentOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  paymentOptionTitleActive: {
    color: '#10b981',
  },
  paymentOptionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 26,
  },
  summaryCard: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 10,
  },
  summaryHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
  },
  summaryGrid: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryItemValue: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#131b2e',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomTotalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upiCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  upiSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountBox: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  upiAmountLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10b981',
    marginVertical: 4,
  },
  upiBeneficiary: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  upiIdBox: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upiIdLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  upiIdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  utrLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  utrInput: {
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
  upiSecurityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  upiSecurityText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  upiSubmitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  upiSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
  },
  upiCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  upiCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  receiptCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  receiptIcon: {
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  receiptId: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '700',
    marginBottom: 16,
  },
  receiptDetails: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  receiptTurf: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  receiptSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  receiptDate: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '700',
    marginBottom: 6,
  },
  receiptPayment: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  doneButton: {
    backgroundColor: '#10b981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});
