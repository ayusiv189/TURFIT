import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import {
  getTurfById,
  getArenasByTurf,
  listenArenaSlots,
  createBookingWithTransaction,
  batchGenerateSlots,
  createArena,
  getAdminPaymentConfig,
  getPricingConfig,
} from '../../services/dbService';
import {
  getActiveOffersByTurf,
  validateAndApplyOffer,
  incrementOfferUsage,
} from '../../services/communityService';
import { Turf, Arena, Slot, Booking, PaymentMode, PricingConfig, Offer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SlotChip } from '../../components/SlotChip';
import { DirectUpiModal } from '../../components/DirectUpiModal';
import { PhoneVerificationModal } from '../../components/PhoneVerificationModal';
import { GoogleAdMobBanner } from '../../components/GoogleAdMobBanner';
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
  DollarSign,
  Receipt,
  Sparkles,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Camera,
  Tag,
  Percent,
  MessageSquare,
  Share2,
  Check,
} from 'lucide-react-native';
import {
  openWhatsAppNotification,
  shareWhatsAppTicket,
} from '../../services/whatsappService';

interface BookingFlowScreenProps {
  route: { params: { turfId: string; arenaId?: string; selectedSport?: string } };
  navigation: any;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({ route, navigation }) => {
  const { turfId, arenaId, selectedSport: initialSportParam } = route.params;
  const { profile, user } = useAuth();
  const [turf, setTurf] = useState<Turf | null>(null);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [activeBookingSport, setActiveBookingSport] = useState<string>(initialSportParam || '');
  const [dates, setDates] = useState<{ label: string; day: string; date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [hideBookedSlots, setHideBookedSlots] = useState<boolean>(false);

  // Payment Mode selection: PAY_FULL or PAY_LATER (partial payment removed for players)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('PAY_FULL');

  // Turf Offers & Promo Code State
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [applyingPromo, setApplyingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const handleSendWhatsAppPass = async (targetBooking: Booking) => {
    const phone = targetBooking.playerPhone || user?.phoneNumber || (profile as any)?.phoneNumber || '';
    const ok = await openWhatsAppNotification(targetBooking, phone, 'PLAYER');
    if (ok) {
      setWhatsappSent(true);
    }
  };

  const handleShareWhatsAppPass = async (targetBooking: Booking) => {
    await shareWhatsAppTicket(targetBooking, 'PLAYER');
  };

  // Online UPI Payment Modal State
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [upiRefId, setUpiRefId] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [upiProcessing, setUpiProcessing] = useState(false);

  const getSportEmoji = (sport?: string) => {
    const s = (sport || '').toLowerCase();
    if (s.includes('cricket')) return '🏏';
    if (s.includes('football') || s.includes('soccer')) return '⚽';
    if (s.includes('badminton')) return '🏸';
    if (s.includes('pickleball')) return '🏓';
    if (s.includes('tennis')) return '🎾';
    if (s.includes('basketball')) return '🏀';
    if (s.includes('volleyball')) return '🏐';
    return '🏆';
  };

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
        const [turfData, arenaData, adminCfg, pricingCfg, turfOffers] = await Promise.all([
          getTurfById(turfId),
          getArenasByTurf(turfId),
          getAdminPaymentConfig(),
          getPricingConfig(),
          getActiveOffersByTurf(turfId),
        ]);
        setTurf(turfData);
        setAdminPaymentConfig(adminCfg);
        setPricingConfig(pricingCfg);
        setActiveOffers(turfOffers || []);
        setArenas(arenaData);
        if (arenaData.length > 0) {
          const matched = arenaId ? arenaData.find((a) => a.id === arenaId) : null;
          setSelectedArena(matched || arenaData[0]);
        } else if (turfData) {
          try {
            const defaultArenaId = await createArena({
              turfId: turfData.id,
              ownerId: turfData.ownerId,
              name: `${turfData.name} Pitch A`,
              sport: turfData.sports?.[0] || 'Football',
              format: '5v5',
              surface: 'Artificial Turf',
              capacity: 14,
              pricePerSlot: turfData.basePrice || 1500,
              isUnderMaintenance: false,
            });
            const fallbackArena: Arena = {
              id: defaultArenaId,
              turfId: turfData.id,
              ownerId: turfData.ownerId,
              name: `${turfData.name} Pitch A`,
              sport: turfData.sports?.[0] || 'Football',
              format: '5v5',
              surface: 'Artificial Turf',
              capacity: 14,
              pricePerSlot: turfData.basePrice || 1500,
              isUnderMaintenance: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setArenas([fallbackArena]);
            setSelectedArena(fallbackArena);
          } catch (err) {
            console.warn('Could not auto-provision arena:', err);
          }
        }
      } catch (err) {
        console.warn('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [turfId]);

  // Determine all playable sports on the currently selected pitch
  const pitchSports = useMemo(() => {
    const list: string[] = [];
    if (selectedArena?.sports && selectedArena.sports.length > 0) {
      selectedArena.sports.forEach((s) => {
        if (!list.includes(s)) list.push(s);
      });
    } else if (selectedArena?.sport) {
      list.push(selectedArena.sport);
    }

    // Check if parent venue offers both Football and Cricket on its grounds
    const turfSports = turf?.sports || [];
    const turfHasFoot = turfSports.some((s) => s.toLowerCase().includes('football'));
    const turfHasCric = turfSports.some((s) => s.toLowerCase().includes('cricket'));
    const arenaHasFootOrCric = list.some((s) => s.toLowerCase().includes('football') || s.toLowerCase().includes('cricket'));

    if (turfHasFoot && turfHasCric && arenaHasFootOrCric) {
      if (!list.some((s) => s.toLowerCase().includes('football'))) list.push('Football');
      if (!list.some((s) => s.toLowerCase().includes('cricket'))) list.push('Cricket');
    }

    if (list.length === 0) {
      return turf?.sports && turf.sports.length > 0 ? turf.sports : ['Football'];
    }
    return list;
  }, [selectedArena, turf]);

  // Synchronize activeBookingSport with current pitch
  useEffect(() => {
    if (pitchSports.length > 0) {
      const paramMatch = initialSportParam
        ? pitchSports.find((s) => s.toLowerCase() === initialSportParam.toLowerCase())
        : null;

      if (!activeBookingSport || !pitchSports.some((s) => s.toLowerCase() === activeBookingSport.toLowerCase())) {
        setActiveBookingSport(paramMatch || pitchSports[0]);
      }
    }
  }, [pitchSports, initialSportParam]);

  // Real-time slot listener with auto-generation for empty dates
  useEffect(() => {
    if (selectedArena && selectedDate) {
      let autoGenerating = false;
      const unsubscribe = listenArenaSlots(selectedArena.id, selectedDate, async (updatedSlots) => {
        setSlots(updatedSlots);
        if (updatedSlots.length < 5 && !autoGenerating && turf && selectedArena) {
          autoGenerating = true;
          try {
            await batchGenerateSlots(
              turf.id,
              selectedArena.id,
              turf.ownerId,
              selectedDate,
              turf.openingTime || '06:00',
              turf.closingTime || '23:00',
              60,
              selectedArena.pricePerSlot || turf.basePrice || 1500
            );
          } catch (err) {
            console.warn('Error auto-generating slots:', err);
          }
        }
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
  }, [selectedArena, selectedDate, turf?.id]);

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim() || !turf) return;
    setApplyingPromo(true);
    setPromoMessage('');
    try {
      const res = await validateAndApplyOffer(promoCodeInput, selectedSlot?.price || turf.basePrice || 1000, turf.id, selectedArena?.id);
      if (res.valid && res.offer) {
        setAppliedOffer(res.offer);
        setDiscountAmount(res.discountAmount);
        setPromoMessage(`✓ Coupon "${res.offer.code}" applied! Saved ₹${res.discountAmount}`);
      } else {
        setAppliedOffer(null);
        setDiscountAmount(0);
        setPromoMessage(res.message || 'Invalid promo code');
      }
    } catch (err: any) {
      setPromoMessage('Error validating code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleSelectTurfOffer = async (offer: Offer) => {
    if (!turf) return;
    setPromoCodeInput(offer.code);
    setApplyingPromo(true);
    setPromoMessage('');
    try {
      const res = await validateAndApplyOffer(offer.code, selectedSlot?.price || turf.basePrice || 1000, turf.id, selectedArena?.id);
      if (res.valid && res.offer) {
        setAppliedOffer(res.offer);
        setDiscountAmount(res.discountAmount);
        setPromoMessage(`✓ Deal "${res.offer.code}" applied! Saved ₹${res.discountAmount}`);
      } else {
        setPromoMessage(res.message || 'Could not apply offer');
      }
    } catch (e) {
      setPromoMessage('Error applying offer');
    } finally {
      setApplyingPromo(false);
    }
  };

  const totalSlotPrice = selectedSlot?.price || 0;
  const discountedSlotPrice = Math.max(0, totalSlotPrice - discountAmount);

  // Platform convenience fee:
  // Dynamically uses configured platform fee % from admin settings, or custom fixed fee, or 0%
  const feePercent = adminPaymentConfig?.platformFeePercent !== undefined
    ? Number(adminPaymentConfig.platformFeePercent)
    : (pricingConfig && pricingConfig.convenienceFeeEnabled ? undefined : 0);

  const calculatedFee = feePercent !== undefined
    ? Math.round((discountedSlotPrice * feePercent) / 100)
    : (pricingConfig && pricingConfig.convenienceFeeEnabled ? (pricingConfig.convenienceFee ?? 0) : 0);

  const convenienceFee = paymentMode === 'PAY_LATER' ? 0 : calculatedFee;

  // Payable online amount vs balance due
  let onlinePayableAmount = 0;
  let balanceDueAmount = 0;

  if (paymentMode === 'PAY_FULL') {
    onlinePayableAmount = discountedSlotPrice + convenienceFee;
    balanceDueAmount = 0;
  } else {
    // PAY_LATER
    onlinePayableAmount = 0;
    balanceDueAmount = discountedSlotPrice;
  }

  const activeUpiId = adminPaymentConfig?.upiId || 'turfit.sports@okaxis';
  const beneficiary = adminPaymentConfig?.beneficiaryName || 'TruFit Sports Admin';

  // Cancellation policy parameters
  const cutoffHours = turf?.cancellationCutoffHours !== undefined ? turf?.cancellationCutoffHours : 4;
  const penaltyAmount = turf?.lateCancellationPenaltyAmount !== undefined ? turf?.lateCancellationPenaltyAmount : 150;

  const handleStartBooking = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in to your player account to reserve a court slot.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!selectedSlot) {
      Alert.alert(
        'Slot Selection Required',
        'Please tap an available time slot above before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }
    setBookingError('');
    if (!profile?.isPhoneVerified) {
      setShowPhoneModal(true);
      return;
    }
    if (onlinePayableAmount > 0) {
      setShowUpiModal(true);
    } else {
      executeBookingTransaction('PAY_LATER');
    }
  };

  const executeBookingTransaction = async (
    mode: PaymentMode,
    upiRef?: string,
    gatewayUsed?: string
  ) => {
    if (!turf || !selectedArena || !selectedSlot || !user) {
      if (!user) {
        Alert.alert('Sign-In Required', 'Please log in to complete your reservation.');
      } else if (!selectedSlot) {
        Alert.alert('No Slot Selected', 'Please tap an available slot first.');
      }
      return;
    }

    setBookingError('');
    setBookingInProgress(true);

    try {
      const athleteName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete';
      const athleteEmail = user.email || profile?.email || '';
      const athletePhone = profile?.phoneNumber || '';
      const athletePhoto = profile?.photoURL || user.photoURL || undefined;

      const isWebhook =
        gatewayUsed?.includes('MERCHANT') ||
        gatewayUsed?.includes('AUTO') ||
        upiRef?.startsWith('BANK-') ||
        false;
      const slotOrderRef = `SLOT-${selectedSlot.id.slice(-6)}-${Date.now().toString().slice(-4)}`;

        const finalTotalAmount = discountedSlotPrice + convenienceFee;
        const result = await createBookingWithTransaction({
        slotId: selectedSlot.id,
        turfId: turf.id,
        arenaId: selectedArena.id,
        ownerId: turf.ownerId,
        playerId: user.uid,
        playerName: athleteName,
        playerEmail: athleteEmail,
        playerPhone: athletePhone,
        playerPhotoURL: athletePhoto,
        turfName: turf.name,
        turfAddress: turf.address,
        turfArea: turf.area,
        turfCity: turf.city,
        arenaName: selectedArena.name,
        sport: activeBookingSport || selectedArena.sport || turf.sports?.[0] || 'Football',
        date: selectedDate,
        day: selectedDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes || 60,
        totalAmount: finalTotalAmount,
        convenienceFee: convenienceFee,
        ownerShare: discountedSlotPrice,
        numberOfPlayers: 1,
        playerShareAmount: finalTotalAmount,
        bookingType: 'PLAYER',
        paymentMode: mode,
        upiTxnRef: upiRef,
        merchantOrderRef: slotOrderRef,
        bankUtr: isWebhook ? upiRef : undefined,
        verificationSource: isWebhook ? 'MERCHANT_UPI_WEBHOOK' : 'MANUAL_SELF_REPORT',
        webhookVerifiedAt: isWebhook ? new Date().toISOString() : undefined,
      });

      if (appliedOffer) {
        try {
          await incrementOfferUsage(appliedOffer.id);
        } catch (e) {
          console.warn('Error incrementing offer usage:', e);
        }
      }

      setShowUpiModal(false);
      setConfirmedBooking(result);
    } catch (err: any) {
      console.error('Booking failed:', err);
      const errMsg = err.message || 'Booking failed. Slot might have been booked just now.';
      setBookingError(errMsg);
      Alert.alert('Booking Notice', errMsg);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    setUpiProcessing(true);
    const generatedRef = upiRefId.trim() || `UPI-TXN-${Date.now().toString().slice(-8)}`;
    await executeBookingTransaction(paymentMode, generatedRef);
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
        {selectedSlot ? (
          <View style={{
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            borderRadius: 16,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '900' }}>
                {turf.name}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2, fontWeight: '500' }}>
                📍 {turf.area}, {turf.city} • {selectedArena?.name ? `🏟️ ${selectedArena.name}` : ''}
              </Text>
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                📅 {selectedDate} ({selectedDay.slice(0, 3)}) • ⏰ {selectedSlot.startTime} - {selectedSlot.endTime}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}
              onPress={() => setSelectedSlot(null)}
            >
              <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>Change Slot</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Turf Header */}
            <View style={styles.turfHeader}>
              <Text style={styles.turfName}>{turf.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color="#94a3b8" />
                <Text style={styles.turfLocation}>{turf.area}, {turf.city}</Text>
              </View>
            </View>

            {/* Step 1: Select Pitch / Arena */}
            {arenas.length > 1 ? (
              <View style={styles.courtSelectionSection}>
                <View style={styles.stepTitleRow}>
                  <View>
                    <Text style={styles.stepTitle}>1. Select Pitch / Ground</Text>
                    <Text style={styles.stepSubHint}>Timings & pricing update per court</Text>
                  </View>
                  <View style={styles.courtCountBadge}>
                    <Text style={styles.courtCountBadgeText}>{arenas.length} Pitches</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courtCarouselList}>
                  {arenas.map((a) => {
                    const isSelected = selectedArena?.id === a.id;
                    const isMaintenance = !!a.isUnderMaintenance;
                    const courtPhoto = a.photos?.[0] || turf.photos?.[0];
                    const sportEmoji = getSportEmoji(a.sport);

                    return (
                      <TouchableOpacity
                        key={a.id}
                        disabled={isMaintenance}
                        style={[
                          styles.courtCard,
                          isSelected && styles.courtCardActive,
                          isMaintenance && styles.courtCardMaintenance,
                        ]}
                        onPress={() => {
                          if (isMaintenance) return;
                          setSelectedArena(a);
                          setSelectedSlot(null);
                        }}
                        activeOpacity={0.85}
                      >
                        {/* Court Card Visual Banner */}
                        <View style={styles.courtCardBanner}>
                          {courtPhoto ? (
                            <>
                              <Image source={{ uri: courtPhoto }} style={styles.courtCardImage} resizeMode="cover" />
                              <View style={styles.courtCardBannerOverlay} />
                              <View style={styles.courtRealPhotoTag}>
                                <Camera size={9} color="#38bdf8" />
                                <Text style={styles.courtRealPhotoText}>Real Photo</Text>
                              </View>
                            </>
                          ) : (
                            <View style={styles.courtCardPlaceholder}>
                              <Text style={{ fontSize: 18 }}>{sportEmoji}</Text>
                              <Text style={styles.courtPlaceholderPendingText}>Photo not uploaded yet</Text>
                              <View style={styles.courtPlaceholderVerifiedPill}>
                                <ShieldCheck size={9} color="#10b981" />
                                <Text style={styles.courtPlaceholderVerifiedText}>Verified Pitch</Text>
                              </View>
                            </View>
                          )}

                          {/* Top Badges */}
                          <View style={styles.courtTopBadgesRow}>
                            <View style={styles.courtSportPill}>
                              <Text style={styles.courtSportPillText}>{sportEmoji} {a.sport}</Text>
                            </View>

                            {isSelected ? (
                              <View style={styles.courtSelectedBadge}>
                                <CheckCircle size={10} color="#064e3b" />
                                <Text style={styles.courtSelectedBadgeText}>ACTIVE</Text>
                              </View>
                            ) : isMaintenance ? (
                              <View style={styles.courtRepairBadge}>
                                <Text style={styles.courtRepairBadgeText}>REPAIR</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Court Info */}
                        <View style={styles.courtCardContent}>
                          <Text style={[styles.courtCardTitle, isSelected && styles.courtCardTitleActive]} numberOfLines={1}>
                            {a.name}
                          </Text>

                          <View style={styles.courtSpecsLine}>
                            <Text style={styles.courtSpecTag}>👥 Up to {a.capacity || 14} players</Text>
                            <Text style={styles.courtSpecDivider}>•</Text>
                            <Text style={styles.courtSpecTag}>🌱 {a.surface || 'Turf'}</Text>
                          </View>

                          <View style={styles.courtPriceRow}>
                            <Text style={[styles.courtPriceVal, isSelected && styles.courtPriceValActive]}>
                              Pitch Price: ₹{a.pricePerSlot || turf.basePrice}
                            </Text>
                            <View style={[styles.courtSelectIndicator, isSelected && styles.courtSelectIndicatorActive]}>
                              <Text style={[styles.courtSelectIndicatorText, isSelected && styles.courtSelectIndicatorTextActive]}>
                                {isSelected ? 'Selected' : 'Select'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Active Selected Court Notification Bar */}
                {selectedArena && (
                  <View style={styles.activeCourtStatusBar}>
                    <View style={styles.activeCourtDot} />
                    <Text style={styles.activeCourtStatusText}>
                      Selected Pitch: <Text style={{ color: '#ffffff', fontWeight: '800' }}>{selectedArena.name}</Text> • {selectedArena.sport} • Up to {selectedArena.capacity || 14} players • Pitch Price: ₹{selectedArena.pricePerSlot || turf.basePrice}
                    </Text>
                  </View>
                )}
              </View>
            ) : selectedArena ? (
              <View style={styles.singleArenaBanner}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>{getSportEmoji(activeBookingSport || selectedArena.sport)}</Text>
                    <Text style={styles.singleArenaTitle}>{selectedArena.name}</Text>
                  </View>
                  <Text style={styles.singleArenaSub}>
                    {pitchSports.length > 1 ? `⚡ Multi-Sport (${pitchSports.join(' • ')})` : selectedArena.sport} • Up to {selectedArena.capacity || 14} players • 🌱 {selectedArena.surface || 'FIFA Astroturf'} • Pitch Price: ₹{selectedArena.pricePerSlot || turf.basePrice}
                  </Text>
                </View>
                <View style={styles.singleArenaBadge}>
                  <CheckCircle size={12} color="#10b981" />
                  <Text style={styles.singleArenaBadgeText}>Confirmed Pitch</Text>
                </View>
              </View>
            ) : null}

            {/* Multi-Sport Pitch: Game Choice (Cricket vs Football on the same ground) */}
            {pitchSports.length > 1 && (
              <View style={styles.multiSportSelectorBox}>
                <View style={styles.multiSportSelectorHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.multiSportSelectorTitle}>⚡ Shared Multi-Sport Pitch</Text>
                  </View>
                  <Text style={styles.multiSportSelectorSubtitle}>
                    This physical pitch supports both sports. Which game are you playing?
                  </Text>
                </View>

                <View style={styles.multiSportOptionsRow}>
                  {pitchSports.map((sp) => {
                    const isSelected = activeBookingSport.toLowerCase() === sp.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sp}
                        style={[styles.multiSportOptionCard, isSelected && styles.multiSportOptionCardActive]}
                        onPress={() => setActiveBookingSport(sp)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 20 }}>{getSportEmoji(sp)}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.multiSportOptionText, isSelected && styles.multiSportOptionTextActive]}>
                            {sp}
                          </Text>
                          <Text style={styles.multiSportOptionSub}>
                            {sp.toLowerCase().includes('cricket') ? 'Crease & boundary nets' : 'Goalposts & turf surface'}
                          </Text>
                        </View>
                        {isSelected && <CheckCircle size={16} color="#10b981" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.multiSportNoticeBar}>
                  <Text style={styles.multiSportNoticeBarText}>
                    🛡️ <Text style={{ fontWeight: '700', color: '#f8fafc' }}>Zero Double-Booking Guarantee:</Text> Reserving this slot for {activeBookingSport} locks the entire physical pitch so neither Football nor Cricket can be double-booked during your hour.
                  </Text>
                </View>
              </View>
            )}

            {/* Indoor Gaming Station Perks & Gear Banner */}
            {selectedArena?.facilityType === 'INDOOR_GAME' && (
              <View style={styles.gamingStationPerksBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 16 }}>🎮</Text>
                  <Text style={styles.gamingStationPerksTitle}>
                    Indoor Station: {selectedArena.name}
                  </Text>
                </View>
                <Text style={styles.gamingStationPerksSub}>
                  {selectedArena.indoorGameType || selectedArena.sport} • Max {selectedArena.capacity || 4} Players
                  {selectedArena.hasAirConditioning ? ' • ❄️ 100% AC' : ''}
                  {selectedArena.hasLoungeAccess ? ' • 🛋️ Lounge Access' : ''}
                </Text>

                {selectedArena.equipmentIncluded && selectedArena.equipmentIncluded.length > 0 && (
                  <View style={styles.gamingEquipRow}>
                    <Text style={styles.gamingEquipLabel}>Included Gear:</Text>
                    {selectedArena.equipmentIncluded.map((eq, i) => (
                      <View key={i} style={styles.gamingEquipTag}>
                        <Text style={styles.gamingEquipTagText}>✓ {eq}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.gamingStationNotice}>
                  <Text style={styles.gamingStationNoticeText}>
                    🎱 <Text style={{ fontWeight: '700', color: '#f8fafc' }}>Station Ready:</Text> All cues, paddles, balls, and equipment are sanitized and ready for your group upon arrival.
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2: Select Date */}
            <Text style={styles.stepTitle}>{arenas.length > 1 ? '2.' : '1.'} Select Match Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
              {dates.map((d) => (
                <TouchableOpacity
                  key={d.date}
                  style={[styles.dateChip, selectedDate === d.date && styles.dateChipActive]}
                  onPress={() => {
                    setSelectedDate(d.date);
                    setSelectedDay(d.day);
                    setSelectedSlot(null);
                  }}
                >
                  <Text style={[styles.dateDayText, selectedDate === d.date && styles.dateDayTextActive]}>
                    {d.day.slice(0, 3)}
                  </Text>
                  <Text style={[styles.dateLabelText, selectedDate === d.date && styles.dateLabelTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Step 3: Select Slot */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
          <Text style={[styles.stepTitle, { marginVertical: 0 }]}>
            {arenas.length > 1 ? '3.' : '2.'} Select Available Slot
          </Text>
          {slots.length > 0 && !selectedSlot && (
            <TouchableOpacity
              style={{
                backgroundColor: hideBookedSlots ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                borderColor: hideBookedSlots ? '#10b981' : '#334155',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
              onPress={() => setHideBookedSlots(!hideBookedSlots)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: hideBookedSlots ? '#10b981' : '#94a3b8' }}>
                {hideBookedSlots ? '✓ Showing Available Only' : 'Hide Booked Slots'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {slots.length === 0 ? (
          <View style={styles.emptySlotsBox}>
            <Clock size={32} color="#64748b" />
            <Text style={styles.emptySlotsText}>No slots created for this date yet.</Text>
            {turf && selectedArena && (
              <TouchableOpacity
                style={styles.generateSlotsBtn}
                onPress={async () => {
                  try {
                    await batchGenerateSlots(
                      turf.id,
                      selectedArena.id,
                      turf.ownerId,
                      selectedDate,
                      turf.openingTime || '06:00',
                      turf.closingTime || '23:00',
                      60,
                      selectedArena.pricePerSlot || turf.basePrice || 1500
                    );
                    Alert.alert('Slots Created', 'Available slots have been generated for this date.');
                  } catch (e: any) {
                    Alert.alert('Notice', 'Could not generate slots: ' + (e.message || 'Unknown error'));
                  }
                }}
              >
                <Text style={styles.generateSlotsBtnText}>Generate Available Slots</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : selectedSlot ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginVertical: 4
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#10b981" />
              <View>
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </Text>
                <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>
                  SELECTED COURT SLOT
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderColor: '#475569',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}
              onPress={() => setSelectedSlot(null)}
            >
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>Change Slot</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots
              .filter((slot) => !hideBookedSlots || slot.status === 'AVAILABLE')
              .map((slot) => (
                <SlotChip
                  key={slot.id}
                  slot={slot}
                  selected={selectedSlot?.id === slot.id}
                  isSelected={selectedSlot?.id === slot.id}
                  onPress={() => setSelectedSlot(slot)}
                  onSelect={(s) => setSelectedSlot(s)}
                />
              ))}
          </View>
        )}

        {/* Step 3.5: Active Turf Offers & Promo Codes */}
        {selectedSlot && (
          <View style={styles.offersContainer}>
            <View style={styles.offersHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Tag size={16} color="#f59e0b" />
                <Text style={styles.offersHeaderTitle}>Offers & Promo Codes</Text>
              </View>
              {appliedOffer && (
                <View style={styles.offerAppliedPill}>
                  <Text style={styles.offerAppliedPillText}>✓ -₹{discountAmount} SAVED</Text>
                </View>
              )}
            </View>

            {/* Promo Code Input Box */}
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter Coupon Code (e.g. SUMMER10)"
                placeholderTextColor="#64748b"
                value={promoCodeInput}
                onChangeText={(txt) => setPromoCodeInput(txt.toUpperCase())}
                autoCapitalize="characters"
              />
              {appliedOffer ? (
                <TouchableOpacity
                  style={styles.promoRemoveBtn}
                  onPress={() => {
                    setAppliedOffer(null);
                    setDiscountAmount(0);
                    setPromoCodeInput('');
                    setPromoMessage('');
                  }}
                >
                  <Text style={styles.promoRemoveBtnText}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.promoApplyBtn}
                  onPress={handleApplyPromoCode}
                  disabled={applyingPromo}
                >
                  {applyingPromo ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.promoApplyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {promoMessage ? (
              <Text style={{ color: appliedOffer ? '#34d399' : '#f87171', fontSize: 11, marginTop: 5, fontWeight: '700' }}>
                {promoMessage}
              </Text>
            ) : null}

            {/* List of active owner offers for this turf */}
            {(() => {
              const applicableOffers = activeOffers.filter(
                (off) => !off.arenaId || off.arenaId === 'ALL' || off.arenaId === selectedArena?.id
              );
              if (applicableOffers.length === 0) return null;
              return (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                    VENUE DEALS ({applicableOffers.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {applicableOffers.map((off) => {
                      const isThisApplied = appliedOffer?.id === off.id;
                      return (
                        <TouchableOpacity
                          key={off.id}
                          style={[
                            styles.offerChipCard,
                            isThisApplied && styles.offerChipCardActive,
                          ]}
                          onPress={() => handleSelectTurfOffer(off)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <Text style={styles.offerChipCode}>{off.code}</Text>
                            <View style={styles.offerChipDiscountBadge}>
                              <Text style={styles.offerChipDiscountText}>
                                {off.discountType === 'PERCENTAGE' ? `${off.discountValue}% OFF` : `₹${off.discountValue} OFF`}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.offerChipTitle} numberOfLines={1}>{off.name || off.title || 'Turf Discount'}</Text>
                          <Text style={styles.offerChipSub} numberOfLines={1}>{off.description}</Text>
                          <Text style={{ color: isThisApplied ? '#10b981' : '#38bdf8', fontSize: 10, fontWeight: '800', marginTop: 4 }}>
                            {isThisApplied ? '✓ APPLIED' : 'TAP TO APPLY'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })()}
          </View>
        )}

        {/* Step 4: Compact Payment Option Bar */}
        {selectedSlot && (
          <View style={styles.paymentSectionCompact}>
            <View style={styles.paymentCompactHeader}>
              <Text style={styles.stepTitle}>{arenas.length > 1 ? '4.' : '3.'} Payment Option</Text>
              <TouchableOpacity
                style={styles.changePaymentOptionLink}
                onPress={() => setShowPaymentOptionsModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.changePaymentOptionText}>Change Option</Text>
                <ChevronRight size={14} color="#38bdf8" />
              </TouchableOpacity>
            </View>

            {/* Quick interactive mode pills */}
            <View style={styles.paymentModePillsRow}>
              {turf.allowFullPayment !== false && (
                <TouchableOpacity
                  style={[
                    styles.paymentModePill,
                    paymentMode === 'PAY_FULL' && styles.paymentModePillActive,
                  ]}
                  onPress={() => setPaymentMode('PAY_FULL')}
                >
                  <CreditCard size={13} color={paymentMode === 'PAY_FULL' ? '#10b981' : '#94a3b8'} />
                  <Text style={[styles.paymentModePillText, paymentMode === 'PAY_FULL' && styles.paymentModePillTextActive]}>
                    Pay Full (₹{discountedSlotPrice + convenienceFee})
                  </Text>
                </TouchableOpacity>
              )}

              {turf.allowPayLater !== false && (
                <TouchableOpacity
                  style={[
                    styles.paymentModePill,
                    paymentMode === 'PAY_LATER' && styles.paymentModePillActive,
                  ]}
                  onPress={() => setPaymentMode('PAY_LATER')}
                >
                  <Building size={13} color={paymentMode === 'PAY_LATER' ? '#f59e0b' : '#94a3b8'} />
                  <Text style={[styles.paymentModePillText, paymentMode === 'PAY_LATER' && styles.paymentModePillTextActive]}>
                    Pay at Desk
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.paymentActiveBanner}
              onPress={() => setShowPaymentOptionsModal(true)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentActiveBannerTitle}>
                  {paymentMode === 'PAY_FULL'
                    ? `⚡ 100% Online UPI (₹${discountedSlotPrice + convenienceFee})`
                    : `🏢 Pay at Venue Desk (₹${discountedSlotPrice} Counter Due)`}
                </Text>
                <Text style={styles.paymentActiveBannerSub}>
                  {paymentMode === 'PAY_FULL'
                    ? `Slot fee: ₹${discountedSlotPrice}${discountAmount > 0 ? ` (₹${discountAmount} discount applied)` : ''} + Platform fee: ₹${convenienceFee} • Zero balance at turf.`
                    : 'Immediate slot lock with zero advance online • Platform fee waived.'}
                </Text>
              </View>
              <View style={styles.paymentActiveBannerBtn}>
                <Text style={styles.paymentActiveBannerBtnText}>Change ▾</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Compact Cancellation & No-Show Policy Badge */}
        {selectedSlot && (
          <TouchableOpacity
            style={styles.policyBadge}
            onPress={() => setShowPolicyModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.policyBadgeLeft}>
              <ShieldCheck size={16} color="#10b981" />
              <Text style={styles.policyBadgeText}>
                Flexible Policy: Free cancel up to {cutoffHours}h before slot
              </Text>
            </View>
            <View style={styles.policyBadgeRight}>
              <Text style={styles.policyBadgeLink}>Details</Text>
              <ChevronRight size={14} color="#38bdf8" />
            </View>
          </TouchableOpacity>
        )}

        {/* Booking Summary Box */}
        {selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Booking Summary & Invoice</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Pitch / Court</Text>
                <Text style={[styles.summaryItemValue, { color: '#38bdf8', fontWeight: 'bold' }]}>
                  {selectedArena?.name || 'Main Pitch'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Sport</Text>
                <Text style={styles.summaryItemValue}>{activeBookingSport || selectedArena?.sport || turf.sports?.[0] || 'Sport'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Date & Day</Text>
                <Text style={styles.summaryItemValue}>{selectedDate} ({selectedDay.slice(0, 3)})</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Time Slot</Text>
                <Text style={styles.summaryItemValue}>{selectedSlot.startTime} - {selectedSlot.endTime}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Court Slot Rate</Text>
                <Text style={[styles.summaryItemValue, { color: '#f1f5f9', fontWeight: 'bold' }]}>
                  ₹{totalSlotPrice}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>
                  Platform Convenience Fee {feePercent !== undefined ? `(${feePercent}%)` : ''}
                </Text>
                <Text style={[styles.summaryItemValue, { color: convenienceFee > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }]}>
                  {convenienceFee > 0 ? `+₹${convenienceFee}` : 'Waived (₹0)'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Online Prepayment</Text>
                <Text style={[styles.summaryItemValue, { color: '#10b981', fontWeight: 'bold' }]}>
                  ₹{onlinePayableAmount}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Balance Due at Turf</Text>
                <Text style={[styles.summaryItemValue, { color: balanceDueAmount > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 'bold' }]}>
                  ₹{balanceDueAmount}
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

      {/* Sticky Bottom Bar with Payment Mode Selector Alongside Proceed to Pay */}
      <View style={styles.bottomBar}>
        {selectedSlot ? (
          <TouchableOpacity
            style={styles.bottomPaymentOptionSelector}
            onPress={() => setShowPaymentOptionsModal(true)}
            activeOpacity={0.75}
          >
            <View style={styles.bottomPaymentSelectorHeader}>
              <Text style={styles.bottomPaymentMethodLabel}>PAYMENT OPTION</Text>
              <ChevronUp size={13} color="#38bdf8" />
            </View>
            <View style={styles.bottomPaymentPill}>
              {paymentMode === 'PAY_FULL' && <CreditCard size={12} color="#10b981" />}
              {paymentMode === 'PAY_PARTIAL' && <DollarSign size={12} color="#38bdf8" />}
              {paymentMode === 'PAY_LATER' && <Building size={12} color="#f59e0b" />}
              <Text style={styles.bottomPaymentPillText} numberOfLines={1}>
                {paymentMode === 'PAY_FULL'
                  ? 'Pay Full (100%)'
                  : paymentMode === 'PAY_PARTIAL'
                  ? `Adv (₹${onlinePayableAmount})`
                  : 'Pay at Desk'}
              </Text>
            </View>
            <Text style={styles.bottomPaymentAmountSub} numberOfLines={1}>
              {onlinePayableAmount > 0 ? `₹${onlinePayableAmount} online` : `₹${balanceDueAmount} at venue`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.bottomTotalLabel}>Court Reservation</Text>
            <Text style={styles.bottomTotalValue}>Select Slot</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, (!selectedSlot || bookingInProgress) && styles.disabledButton]}
          disabled={!selectedSlot || bookingInProgress}
          onPress={handleStartBooking}
          activeOpacity={0.85}
        >
          {bookingInProgress ? (
            <ActivityIndicator color="#064e3b" />
          ) : (
            <View style={styles.confirmButtonContent}>
              <Text style={styles.confirmButtonText}>
                {onlinePayableAmount > 0 ? `Proceed to Pay (₹${onlinePayableAmount})` : 'Confirm Booking'}
              </Text>
              <ArrowRight size={15} color="#064e3b" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Direct UPI Intent & Dynamic QR Modal with Merchant Webhook Auto-Lock */}
      <DirectUpiModal
        visible={showUpiModal}
        onClose={() => setShowUpiModal(false)}
        amount={onlinePayableAmount}
        baseSlotPrice={paymentMode === 'PAY_FULL' ? totalSlotPrice : 0}
        convenienceFee={convenienceFee}
        upiId={activeUpiId}
        payeeName={beneficiary}
        transactionNote={`Booking at ${turf.name} - ${selectedSlot?.startTime}`}
        bookingRef={`SLOT-${selectedSlot?.id?.slice(-6) || Date.now().toString().slice(-6)}`}
        subTitle="0% Gateway Commission • Direct to Turf Owner's Bank"
        balanceDue={balanceDueAmount}
        turfId={turf.id}
        ownerId={turf.ownerId}
        playerId={user?.uid}
        isMerchantUpi={true}
        merchantProvider={turf.merchantUpiConfig?.provider || 'PHONEPE_BUSINESS'}
        onConfirmPayment={async (utrRef, gatewayUsed) => {
          await executeBookingTransaction(paymentMode, utrRef, gatewayUsed);
        }}
      />

      {/* Just-In-Time One-Time Mobile Phone Verification Modal */}
      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title="Verify Phone to Complete Booking"
        subtitle={`Staff at ${turf?.name || 'the venue'} require a verified mobile number to send your WhatsApp pass and coordinate ground access.`}
        actionLabel={onlinePayableAmount > 0 ? 'Verify & Proceed to Pay' : 'Verify & Reserve Court'}
        onSuccess={async () => {
          setShowPhoneModal(false);
          if (onlinePayableAmount > 0) {
            setShowUpiModal(true);
          } else {
            await executeBookingTransaction('PAY_LATER');
          }
        }}
      />

      {/* Booking Receipt Modal */}
      <Modal visible={!!confirmedBooking} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptIcon}>
              <CheckCircle size={48} color="#10b981" />
            </View>

            <Text style={styles.receiptTitle}>Reservation Confirmed!</Text>
            <Text style={styles.receiptId}>Ref: {confirmedBooking?.bookingId}</Text>

            {/* Bank Webhook Verification Badge */}
            {confirmedBooking?.verificationSource === 'MERCHANT_UPI_WEBHOOK' && (
              <View style={styles.verifiedWebhookBadge}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={styles.verifiedWebhookBadgeText}>
                  Bank Webhook Auto-Verified • UTR: {confirmedBooking.bankUtr || confirmedBooking.bookingId}
                </Text>
              </View>
            )}

            <View style={styles.receiptDetails}>
              <Text style={styles.receiptTurf}>{confirmedBooking?.turfName}</Text>
              <Text style={styles.receiptSub}>{confirmedBooking?.arenaName} • {confirmedBooking?.sport}</Text>
              <Text style={styles.receiptDate}>
                {confirmedBooking?.date} ({confirmedBooking?.startTime} - {confirmedBooking?.endTime})
              </Text>
              
              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Court Slot Fee:</Text>
                <Text style={styles.receiptValue}>
                  ₹{confirmedBooking?.ownerShare !== undefined ? confirmedBooking.ownerShare : ((confirmedBooking?.totalAmount || 0) - (confirmedBooking?.convenienceFee || 0))}
                </Text>
              </View>
              {confirmedBooking?.convenienceFee !== undefined && confirmedBooking.convenienceFee > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: '#38bdf8' }]}>Platform Convenience Fee:</Text>
                  <Text style={[styles.receiptValue, { color: '#38bdf8' }]}>+₹{confirmedBooking.convenienceFee}</Text>
                </View>
              )}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Total Invoice Amount:</Text>
                <Text style={[styles.receiptValue, { fontWeight: 'bold' }]}>₹{confirmedBooking?.playerShareAmount || confirmedBooking?.totalAmount}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Advance Paid Online:</Text>
                <Text style={[styles.receiptValue, { color: '#10b981', fontWeight: 'bold' }]}>₹{confirmedBooking?.amountPaid}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Balance Due at Venue:</Text>
                <Text style={[styles.receiptValue, { color: (confirmedBooking?.amountDue || 0) > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 'bold' }]}>
                  ₹{confirmedBooking?.amountDue}
                </Text>
              </View>
            </View>

            {/* WhatsApp Booking Confirmation Pass Card */}
            <View style={styles.whatsappReceiptBox}>
              <View style={styles.whatsappReceiptHeader}>
                <View style={styles.whatsappIconCircle}>
                  <MessageSquare size={16} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whatsappReceiptTitle}>Instant WhatsApp Match Pass</Text>
                  <Text style={styles.whatsappReceiptSub}>
                    Official match pass with venue map, slot time and receipt code
                  </Text>
                </View>
              </View>

              <View style={styles.whatsappBtnRow}>
                <TouchableOpacity
                  style={styles.whatsappSendBtn}
                  onPress={() => confirmedBooking && handleSendWhatsAppPass(confirmedBooking)}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={16} color="#052e16" />
                  <Text style={styles.whatsappSendBtnText}>
                    {whatsappSent ? 'Re-send via WhatsApp' : 'Send WhatsApp Pass'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappShareBtn}
                  onPress={() => confirmedBooking && handleShareWhatsAppPass(confirmedBooking)}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color="#e2e8f0" />
                </TouchableOpacity>
              </View>

              {whatsappSent && (
                <View style={styles.whatsappSentIndicator}>
                  <Check size={12} color="#25D366" />
                  <Text style={styles.whatsappSentText}>WhatsApp match pass opened</Text>
                </View>
              )}
            </View>

            {/* Google AdMob / AdSense Post-Booking Sponsor Offer */}
            <GoogleAdMobBanner
              format="POST_BOOKING_SPONSOR"
              placement="PostBookingReceiptModal"
              adUnitId="ca-app-pub-3940256099942544/6300978111"
            />

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

      {/* Payment Options Bottom Sheet Modal */}
      <Modal
        visible={showPaymentOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalCard}>
            <View style={styles.paymentModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentModalTitle}>Select Payment Option</Text>
                <Text style={styles.paymentModalSubtitle}>
                  {selectedSlot ? `Court Fee: ₹${totalSlotPrice} • ${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Choose payment mode'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentOptionsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.paymentModalScroll}>
              {/* Option 1: Pay Full */}
              {turf.allowFullPayment !== false && (
                <TouchableOpacity
                  style={[
                    styles.modalPaymentCard,
                    paymentMode === 'PAY_FULL' && styles.modalPaymentCardActive,
                  ]}
                  onPress={() => setPaymentMode('PAY_FULL')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modalPaymentCardHeader}>
                    <View style={styles.modalPaymentCardIconBox}>
                      <CreditCard size={18} color="#10b981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.modalPaymentTitleRow}>
                        <Text style={styles.modalPaymentCardTitle}>Pay Full Online (100% UPI)</Text>
                        <Text style={styles.modalPaymentCardPrice}>₹{discountedSlotPrice + platformFee}</Text>
                      </View>
                      <Text style={styles.modalPaymentCardDesc}>
                        Court fee: ₹{discountedSlotPrice}${discountAmount > 0 ? ` (-₹${discountAmount} offer)` : ''} + Platform fee: ₹{platformFee} • Instant booking confirmation. Zero balance at venue.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalPaymentBadgeRow}>
                    <View style={styles.greenPillBadge}>
                      <Text style={styles.greenPillBadgeText}>RECOMMENDED • 0 DUES</Text>
                    </View>
                    {paymentMode === 'PAY_FULL' && (
                      <View style={styles.selectedCheckPill}>
                        <CheckCircle size={14} color="#10b981" />
                        <Text style={styles.selectedCheckText}>Selected</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 3: Pay Later */}
              {turf.allowPayLater !== false && (
                <TouchableOpacity
                  style={[
                    styles.modalPaymentCard,
                    paymentMode === 'PAY_LATER' && styles.modalPaymentCardActive,
                  ]}
                  onPress={() => setPaymentMode('PAY_LATER')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modalPaymentCardHeader}>
                    <View style={[styles.modalPaymentCardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Building size={18} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.modalPaymentTitleRow}>
                        <Text style={styles.modalPaymentCardTitle}>Pay Later at Turf Desk</Text>
                        <Text style={[styles.modalPaymentCardPrice, { color: '#f59e0b' }]}>₹0 Online</Text>
                      </View>
                      <Text style={styles.modalPaymentCardDesc}>
                        Reserve slot immediately. Full ₹{totalSlotPrice} settled directly in cash or UPI at the venue counter before play (Convenience fee waived).
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalPaymentBadgeRow}>
                    <View style={[styles.greenPillBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Text style={[styles.greenPillBadgeText, { color: '#f59e0b' }]}>NO ONLINE PAYMENT</Text>
                    </View>
                    {paymentMode === 'PAY_LATER' && (
                      <View style={styles.selectedCheckPill}>
                        <CheckCircle size={14} color="#f59e0b" />
                        <Text style={[styles.selectedCheckText, { color: '#f59e0b' }]}>Selected</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setShowPaymentOptionsModal(false)}
            >
              <Text style={styles.modalConfirmBtnText}>
                {onlinePayableAmount > 0
                  ? `Apply & Proceed (₹${onlinePayableAmount})`
                  : 'Apply (Pay at Counter)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Policy Details Bottom Sheet Modal */}
      <Modal
        visible={showPolicyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalCard}>
            <View style={styles.policyModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#10b981" />
                <Text style={styles.policyModalTitle}>Cancellation & No-Show Policy</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPolicyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.policyItemRow}>
              <View style={[styles.policyDot, { backgroundColor: '#10b981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyItemTitle}>Free Cancellation (≥{cutoffHours}h before slot)</Text>
                <Text style={styles.policyItemDesc}>
                  100% full refund of any online advance paid and immediate cancellation.
                </Text>
              </View>
            </View>

            <View style={styles.policyItemRow}>
              <View style={[styles.policyDot, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyItemTitle}>Late Cancellation (&lt;{cutoffHours}h before slot)</Text>
                <Text style={styles.policyItemDesc}>
                  ₹{penaltyAmount} late fee deducted from advance deposit; remaining amount refunded.
                </Text>
              </View>
            </View>

            <View style={styles.policyItemRow}>
              <View style={[styles.policyDot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyItemTitle}>No-Show Policy</Text>
                <Text style={styles.policyItemDesc}>
                  Advance payment is retained by the turf to cover the reserved court slot.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.policyCloseBtn}
              onPress={() => setShowPolicyModal(false)}
            >
              <Text style={styles.policyCloseBtnText}>I Understand</Text>
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
  turfHeader: {
    marginBottom: 16,
  },
  turfName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  turfLocation: {
    fontSize: 13,
    color: '#94a3b8',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 10,
  },
  horizontalList: {
    marginBottom: 6,
  },
  arenaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#131b2e',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  arenaChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  arenaChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  arenaChipTextActive: {
    color: '#10b981',
  },
  courtSelectionSection: {
    marginTop: 14,
    marginBottom: 8,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  stepSubHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  courtCountBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  courtCountBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  courtCarouselList: {
    paddingRight: 16,
    gap: 12,
    paddingBottom: 4,
  },
  courtCard: {
    width: 220,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginRight: 12,
  },
  courtCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#0c1d24',
  },
  courtCardMaintenance: {
    opacity: 0.7,
    borderColor: '#f59e0b',
  },
  courtCardBanner: {
    width: '100%',
    height: 75,
    backgroundColor: '#0b1120',
    position: 'relative',
  },
  courtCardImage: {
    width: '100%',
    height: '100%',
  },
  courtCardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  courtPlaceholderPendingText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  courtPlaceholderVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  courtPlaceholderVerifiedText: {
    color: '#6ee7b7',
    fontSize: 8,
    fontWeight: '800',
  },
  courtRealPhotoTag: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  courtRealPhotoText: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: '700',
  },
  courtCardBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  courtTopBadgesRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courtSportPill: {
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtSportPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  courtSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtSelectedBadgeText: {
    color: '#064e3b',
    fontSize: 9,
    fontWeight: '800',
  },
  courtRepairBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtRepairBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  courtCardContent: {
    padding: 10,
  },
  courtCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  courtCardTitleActive: {
    color: '#34d399',
  },
  courtSpecsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  courtSpecTag: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  courtSpecDivider: {
    fontSize: 10,
    color: '#475569',
  },
  courtPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  courtPriceVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  courtPriceValActive: {
    color: '#10b981',
  },
  courtPriceUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  courtSelectIndicator: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courtSelectIndicatorActive: {
    backgroundColor: '#10b981',
  },
  courtSelectIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  courtSelectIndicatorTextActive: {
    color: '#064e3b',
  },
  activeCourtStatusBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  activeCourtDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activeCourtStatusText: {
    fontSize: 11,
    color: '#6ee7b7',
    flex: 1,
  },
  arenaSelectCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#131b2e',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    minWidth: 130,
  },
  arenaSelectCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  arenaSelectCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  arenaSelectCardTitleActive: {
    color: '#10b981',
  },
  arenaSelectCardSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 4,
  },
  arenaSelectCardPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  arenaSelectCardPriceActive: {
    color: '#10b981',
  },
  singleArenaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 10,
    marginBottom: 6,
  },
  singleArenaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  singleArenaSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  singleArenaBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  singleArenaBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#131b2e',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    minWidth: 70,
  },
  dateChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dateDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  dateDayTextActive: {
    color: '#064e3b',
  },
  dateLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 2,
  },
  dateLabelTextActive: {
    color: '#064e3b',
  },
  emptySlotsBox: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 6,
  },
  emptySlotsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 10,
  },
  generateSlotsBtn: {
    marginTop: 14,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  generateSlotsBtnText: {
    color: '#064e3b',
    fontWeight: '700',
    fontSize: 13,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  splitSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  playerCountScroll: {
    marginBottom: 12,
  },
  playerCountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0a0f1d',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 6,
  },
  playerCountChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  playerCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  playerCountTextActive: {
    color: '#10b981',
  },
  splitBreakdown: {
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    padding: 10,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  splitLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  splitVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  splitShareVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  paymentOption: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  paymentOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  paymentOptionTitleActive: {
    color: '#10b981',
  },
  paymentOptionSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
  partialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  partialInputLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  partialInput: {
    backgroundColor: '#131b2e',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#10b981',
    fontWeight: '800',
    fontSize: 14,
    width: 90,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#334155',
  },
  policyNoticeCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginVertical: 12,
  },
  policyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  policyNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  policyNoticeItem: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
    marginTop: 3,
  },
  summaryCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 6,
  },
  summaryHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    width: '47%',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  summaryItemValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#ef4444',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  confirmButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  upiSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  upiAmountBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  upiAmountLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  upiAmountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10b981',
    marginVertical: 2,
  },
  upiBeneficiary: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  upiDueNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  upiDueNoticeText: {
    fontSize: 11,
    color: '#f59e0b',
    textAlign: 'center',
  },
  upiIdBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  upiIdLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  upiIdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  utrLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  utrInput: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#94a3b8',
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
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  upiCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  upiCancelText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  receiptCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
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
    color: '#f8fafc',
  },
  receiptId: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  verifiedWebhookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 12,
  },
  verifiedWebhookBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  receiptDetails: {
    backgroundColor: '#0a0f1d',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  receiptTurf: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  receiptSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  receiptDate: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  whatsappReceiptBox: {
    backgroundColor: 'rgba(5, 46, 22, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.35)',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    gap: 10,
  },
  whatsappReceiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whatsappIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappReceiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  whatsappReceiptSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  whatsappBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappSendBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappSendBtnText: {
    color: '#052e16',
    fontSize: 12,
    fontWeight: '800',
  },
  whatsappShareBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappSentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: -2,
  },
  whatsappSentText: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1a29',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  policyBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  policyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bae6fd',
    flexShrink: 1,
  },
  policyBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  policyBadgeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  policyModalCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  policyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  policyModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  policyItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  policyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  policyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  policyItemDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  policyCloseBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  policyCloseBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPaymentOptionSelector: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bottomPaymentSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bottomPaymentMethodLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  bottomPaymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bottomPaymentPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    flexShrink: 1,
  },
  bottomPaymentAmountSub: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '600',
    marginTop: 1,
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentSectionCompact: {
    marginTop: 14,
    marginBottom: 10,
  },
  paymentCompactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changePaymentOptionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  changePaymentOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  paymentModePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  paymentModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#131b2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  paymentModePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  paymentModePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  paymentModePillTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  paymentActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19, 27, 46, 0.9)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
  },
  paymentActiveBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  paymentActiveBannerSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  paymentActiveBannerBtn: {
    marginLeft: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  paymentActiveBannerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  paymentModalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  paymentModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  paymentModalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  paymentModalScroll: {
    marginBottom: 14,
  },
  modalPaymentCard: {
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  modalPaymentCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  modalPaymentCardHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPaymentCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPaymentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalPaymentCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 6,
  },
  modalPaymentCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  modalPaymentCardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
    lineHeight: 15,
  },
  modalPaymentBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  greenPillBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  greenPillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  selectedCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  advancePresetsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  advancePresetLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 5,
  },
  advancePresetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  advancePresetChip: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  advancePresetChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  advancePresetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  advancePresetChipTextActive: {
    color: '#ffffff',
  },
  modalConfirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  // Multi-Sport Pitch Game Choice Styles
  multiSportSelectorBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 14,
    marginBottom: 20,
  },
  multiSportSelectorHeader: {
    marginBottom: 12,
  },
  multiSportSelectorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
  },
  multiSportSelectorSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  multiSportOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  multiSportOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  multiSportOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  multiSportOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  multiSportOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  multiSportOptionSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  multiSportNoticeBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  multiSportNoticeBarText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  gamingStationPerksBox: {
    backgroundColor: '#0d1527',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 16,
  },
  gamingStationPerksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f59e0b',
  },
  gamingStationPerksSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  gamingEquipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  gamingEquipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginRight: 2,
  },
  gamingEquipTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  gamingEquipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
  },
  gamingStationNotice: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gamingStationNoticeText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  // Turf Offers & Promo Section Styles
  offersContainer: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  offersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offersHeaderTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  offerAppliedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  offerAppliedPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  promoApplyBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  promoRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  promoRemoveBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '800',
  },
  offerChipCard: {
    width: 170,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  offerChipCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  offerChipCode: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '900',
  },
  offerChipDiscountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offerChipDiscountText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
  },
  offerChipTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  offerChipSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
});
