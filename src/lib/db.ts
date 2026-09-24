import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  writeBatch,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Turf,
  Arena,
  Slot,
  Booking,
  PaymentTransaction,
  LobbyPlayer,
  Lobby,
  TabVisibilityConfig,
  OwnerSubscriptionPlan,
  OwnerSubscriptionState,
  SubscriptionSystemConfig,
  OwnerSubscriptionStatus,
  OwnerSubscriptionTransaction,
  PlayerSubscriptionPlan,
  PlayerSubscriptionStatus,
  PlayerSubscriptionTransaction,
  PlayerPlanEntitlements,
  DEFAULT_PLAYER_ENTITLEMENTS,
  VerificationBadgeConfig,
  PlayerVerificationBadge,
  SubscriptionAuditLog,
  VerificationAuditLog,
  UserControl,
  GlobalFeatureControls,
  PromotionalBanner,
  BannerAudience,
  FeatureFlag,
  AppConfig,
  PricingConfig,
  OwnerPayoutRecord,
  OwnerPayoutRequest,
  PlanFeatureConfig,
  DEFAULT_PLAN_FEATURES,
  CoachProfile,
  CoachBatch,
  CoachEnrollment,
  CoachVerificationStatus,
  CoachSubscription,
  CoachSubscriptionPlan,
  CoachSubscriptionTransaction,
  Tournament,
  TournamentTeam,
  TournamentFixture,
  TournamentCategory,
  SocialPost,
  SocialComment,
  OwnerBrandProfile,
  UserProfile,
  UserBlock,
  UserFollow,
  FollowTargetType,
  Team,
} from '../types';
export type { OwnerPayoutRequest };
import { sanitizeFirestoreData, sortSlotsChronologically, parseLocalDate, formatLocalDate, getDayName } from './utils';

// ==================== TURFS ====================

export async function createTurf(turfData: Omit<Turf, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newDocRef = doc(collection(db, 'turfs'));
  const now = new Date().toISOString();
  const payload: Turf = {
    ...turfData,
    id: newDocRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeFirestoreData(payload));
  return newDocRef.id;
}

export async function updateTurf(turfId: string, updates: Partial<Turf>): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await updateDoc(docRef, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteTurf(turfId: string): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await deleteDoc(docRef);
}

export async function checkTurfActiveBookings(turfId: string): Promise<{ activeCount: number; upcomingBookings: Booking[] }> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return { activeCount: 0, upcomingBookings: [] };
  try {
    const q = query(
      collection(db, 'bookings'),
      where('turfId', '==', turfId),
      where('bookingStatus', '==', 'CONFIRMED')
    );
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const upcomingBookings: Booking[] = [];
    snap.forEach((d) => {
      const b = { id: d.id, ...d.data() } as Booking;
      if (b.date > today) {
        upcomingBookings.push(b);
      } else if (b.date === today) {
        let endMinutes = 23 * 60 + 59;
        if (b.endTime && b.endTime.includes(':')) {
          const parts = b.endTime.split(':');
          endMinutes = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        if (endMinutes >= nowMinutes) {
          upcomingBookings.push(b);
        }
      }
    });

    return {
      activeCount: upcomingBookings.length,
      upcomingBookings,
    };
  } catch (err) {
    console.warn('Error checking turf active bookings:', err);
    return { activeCount: 0, upcomingBookings: [] };
  }
}

export async function checkArenaActiveBookings(arenaId: string): Promise<{ activeCount: number; upcomingBookings: Booking[] }> {
  if (!arenaId || typeof arenaId !== 'string' || !arenaId.trim()) return { activeCount: 0, upcomingBookings: [] };
  try {
    const q = query(
      collection(db, 'bookings'),
      where('arenaId', '==', arenaId),
      where('bookingStatus', '==', 'CONFIRMED')
    );
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const upcomingBookings: Booking[] = [];
    snap.forEach((d) => {
      const b = { id: d.id, ...d.data() } as Booking;
      if (b.date > today) {
        upcomingBookings.push(b);
      } else if (b.date === today) {
        let endMinutes = 23 * 60 + 59;
        if (b.endTime && b.endTime.includes(':')) {
          const parts = b.endTime.split(':');
          endMinutes = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        if (endMinutes >= nowMinutes) {
          upcomingBookings.push(b);
        }
      }
    });

    return {
      activeCount: upcomingBookings.length,
      upcomingBookings,
    };
  } catch (err) {
    console.warn('Error checking arena active bookings:', err);
    return { activeCount: 0, upcomingBookings: [] };
  }
}

export async function getOwnerTurfs(ownerId: string): Promise<Turf[]> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) return [];
  const q = query(collection(db, 'turfs'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));
}

export async function getAllActiveTurfs(includeAllForAdmin = false): Promise<Turf[]> {
  const snap = await getDocs(collection(db, 'turfs'));
  const filtered = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Turf))
    .filter((t) => {
      if (includeAllForAdmin) return true;
      // Public player search only allows verified/active & open turfs (not suspended or rejected)
      const isVerified = !t.verificationStatus || t.verificationStatus === 'verified' || t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review';
      return t.active !== false && isVerified && !t.isClosed;
    });

  // Sponsored / Featured Turf Ranking System:
  // Sort featured turfs first, ordered by sponsoredPriority descending
  return filtered.sort((a, b) => {
    const aFeatured = a.isFeatured ? 1 : 0;
    const bFeatured = b.isFeatured ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    const aPriority = a.sponsoredPriority || 0;
    const bPriority = b.sponsoredPriority || 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return 0;
  });
}

// ==================== ARENAS ====================

export async function createArena(arenaData: Omit<Arena, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newDocRef = doc(collection(db, 'arenas'));
  const now = new Date().toISOString();
  const payload: Arena = {
    ...arenaData,
    id: newDocRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeFirestoreData(payload));
  return newDocRef.id;
}

export async function getTurfArenas(turfId: string): Promise<Arena[]> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return [];
  try {
    const q = query(collection(db, 'arenas'), where('turfId', '==', turfId));
    const snap = await getDocs(q);
    const arenas = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Arena));
    if (arenas.length > 0) {
      return arenas;
    }

    // Auto-heal: If a turf exists in Firestore but has 0 arenas created, auto-provision a default arena
    const turfRef = doc(db, 'turfs', turfId);
    const turfSnap = await getDoc(turfRef);
    if (turfSnap.exists()) {
      const tData = turfSnap.data() as Turf;
      const defaultArenaId = await createArena({
        turfId: turfId,
        ownerId: tData.ownerId || 'system',
        name: `${tData.name || 'Main'} Court 1`,
        sport: (tData.sports && tData.sports[0]) || 'Football',
        description: 'Standard size astroturf sports arena with floodlights',
        capacity: 14,
        pricePerSlot: tData.basePrice || 1200,
        photos: tData.photos || [],
        active: true,
      });
      const newArenaDoc = await getDoc(doc(db, 'arenas', defaultArenaId));
      if (newArenaDoc.exists()) {
        return [newArenaDoc.data() as Arena];
      }
    }
  } catch (err) {
    console.error('Error fetching or auto-creating turf arenas:', err);
  }
  return [];
}

export async function updateArena(arenaId: string, updates: Partial<Arena>): Promise<void> {
  const docRef = doc(db, 'arenas', arenaId);
  await updateDoc(docRef, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteArena(arenaId: string): Promise<void> {
  const docRef = doc(db, 'arenas', arenaId);
  await deleteDoc(docRef);
}

// ==================== SLOTS ====================

export async function createSlot(slotData: Omit<Slot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (slotData.arenaId && slotData.date && slotData.startTime) {
    const existingSlots = await getArenaSlotsByDate(slotData.arenaId, slotData.date);
    const targetMin = parseTimeToMinutes(slotData.startTime);
    const isDuplicate = existingSlots.some((s) => parseTimeToMinutes(s.startTime) === targetMin);
    if (isDuplicate) {
      throw new Error(`Dual slot prevented: A slot starting at ${slotData.startTime} on ${slotData.date} already exists for this arena.`);
    }
  }

  const newDocRef = doc(collection(db, 'slots'));
  const now = new Date().toISOString();
  const payload: Slot = {
    ...slotData,
    id: newDocRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeFirestoreData(payload));
  return newDocRef.id;
}

export async function createBulkSlots(slotsData: Array<Omit<Slot, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;
  const slotsByArenaAndDate = new Map<string, Slot[]>();

  for (const s of slotsData) {
    if (!s.arenaId || !s.date || !s.startTime) continue;
    const groupKey = `${s.arenaId}_${s.date}`;
    if (!slotsByArenaAndDate.has(groupKey)) {
      const existing = await getArenaSlotsByDate(s.arenaId, s.date);
      slotsByArenaAndDate.set(groupKey, existing);
    }
    const existingList = slotsByArenaAndDate.get(groupKey) || [];
    const targetMin = parseTimeToMinutes(s.startTime);
    const exists = existingList.some((ex) => parseTimeToMinutes(ex.startTime) === targetMin);

    if (!exists) {
      const newDocRef = doc(collection(db, 'slots'));
      const payload: Slot = {
        ...s,
        id: newDocRef.id,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(newDocRef, sanitizeFirestoreData(payload));
      existingList.push(payload as Slot);
      count++;
    }
  }
  return count;
}

export async function updateSlot(slotId: string, updates: Partial<Slot>): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await updateDoc(docRef, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteSlot(slotId: string): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await deleteDoc(docRef);
}

export async function getArenaSlotsByDate(arenaId: string, date: string): Promise<Slot[]> {
  if (!arenaId || !date || typeof arenaId !== 'string' || typeof date !== 'string' || !arenaId.trim() || !date.trim()) return [];
  
  let arenaBasePrice = 800;
  try {
    const arenaDoc = await getDoc(doc(db, 'arenas', arenaId));
    if (arenaDoc.exists()) {
      const arenaData = arenaDoc.data() as Arena;
      arenaBasePrice = arenaData.pricePerSlot || 800;
    }
  } catch (err) {
    console.warn('Error fetching arena base price for slots:', err);
  }

  const q = query(
    collection(db, 'slots'),
    where('arenaId', '==', arenaId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  const rawSlots = snap.docs.map((d) => {
    const data = d.data() as Slot;
    const resolvedPrice = (!data.price || data.price <= 0) ? arenaBasePrice : data.price;
    return { id: d.id, ...data, price: resolvedPrice } as Slot;
  });
  return sortSlotsChronologically(rawSlots);
}

export async function getOwnerSlots(ownerId: string): Promise<Slot[]> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) return [];
  
  const arenaPriceMap = new Map<string, number>();
  try {
    const arenasQ = query(collection(db, 'arenas'), where('ownerId', '==', ownerId));
    const arenasSnap = await getDocs(arenasQ);
    arenasSnap.forEach((d) => {
      const a = d.data() as Arena;
      arenaPriceMap.set(d.id, a.pricePerSlot || 800);
    });
  } catch (err) {
    console.warn('Error mapping owner arena prices:', err);
  }

  const q = query(collection(db, 'slots'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  const rawSlots = snap.docs.map((d) => {
    const data = d.data() as Slot;
    const arenaPrice = data.arenaId ? arenaPriceMap.get(data.arenaId) : undefined;
    const resolvedPrice = (!data.price || data.price <= 0) ? (arenaPrice || 800) : data.price;
    return { id: d.id, ...data, price: resolvedPrice } as Slot;
  });
  return sortSlotsChronologically(rawSlots);
}

// ==================== BOOKINGS & DOUBLE BOOKING PREVENTION ====================

export interface CreateBookingParams {
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  ownerId: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  turfArea: string;
  turfCity: string;
  arenaId: string;
  arenaName: string;
  sport: string;
  slotId: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  convenienceFee?: number;
  ownerShare?: number;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  verifiedAutomatically?: boolean;
  upiTxnRef?: string;
  paymentMethod: 'PAY_NOW' | 'PAY_LATER_AT_TURF' | 'PARTIAL_ADVANCE' | 'UPI_QR' | 'RAZORPAY';
  isOwnerBooking?: boolean;
}

/**
 * Executes an atomic transaction to guarantee no double booking of a slot.
 */
export async function bookSlotWithTransaction(params: CreateBookingParams): Promise<Booking> {
  const booking = await runTransaction(db, async (transaction) => {
    const slotDocRef = doc(db, 'slots', params.slotId);
    const slotSnap = await transaction.get(slotDocRef);

    if (!slotSnap.exists()) {
      throw new Error('This slot does not exist.');
    }

    const currentSlot = slotSnap.data() as Slot;

    // Check turf verification status & open state
    const turfDocRef = doc(db, 'turfs', params.turfId);
    const turfSnap = await transaction.get(turfDocRef);
    if (turfSnap.exists()) {
      const turfData = turfSnap.data() as Turf;
      if (turfData.verificationStatus === 'suspended' || turfData.verificationStatus === 'rejected') {
        throw new Error(`Venue "${turfData.name}" is currently ${turfData.verificationStatus.replace('_', ' ')} and cannot accept player reservations.`);
      }
      if (turfData.isClosed) {
        throw new Error(`Venue "${turfData.name}" is temporarily closed: ${turfData.closureNotice || 'Maintenance in progress.'}`);
      }
    }

    // Check slot availability
    if (currentSlot.status !== 'AVAILABLE') {
      throw new Error('This slot is no longer available. Please choose another slot.');
    }

    if (!params.isOwnerBooking && currentSlot.visibleToPlayers === false) {
      throw new Error('This slot is currently hidden by the turf owner.');
    }

    const newBookingRef = doc(collection(db, 'bookings'));
    const now = new Date().toISOString();

    let amountPaid = 0;
    if (params.amountPaid !== undefined) {
      amountPaid = Math.max(0, Math.min(params.totalAmount, params.amountPaid));
    } else if (params.paymentMethod === 'PAY_NOW' || params.paymentMethod === 'UPI_QR' || params.paymentMethod === 'RAZORPAY') {
      amountPaid = params.totalAmount;
    }

    const amountDue = params.amountDue !== undefined ? params.amountDue : Math.max(0, params.totalAmount - amountPaid);
    let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
    if (amountPaid >= params.totalAmount) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    const bookingType = params.isOwnerBooking ? 'OWNER' : 'PLAYER';
    const slotStatus = params.isOwnerBooking ? 'BOOKED_BY_OWNER' : 'BOOKED_BY_PLAYER';

    const convenienceFee = params.convenienceFee || 0;
    const ownerShare = params.ownerShare !== undefined ? params.ownerShare : Math.max(0, params.totalAmount - convenienceFee);
    const isAutoVerified = params.verifiedAutomatically || (params.paymentMethod === 'PAY_NOW' || params.paymentMethod === 'RAZORPAY');

    const bookingData: Booking = {
      id: newBookingRef.id,
      bookingId: `TF-${Math.floor(100000 + Math.random() * 900000)}`,
      playerId: params.playerId,
      playerName: params.playerName,
      playerEmail: params.playerEmail,
      playerPhone: params.playerPhone || '',
      ownerId: params.ownerId,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress,
      turfArea: params.turfArea,
      turfCity: params.turfCity,
      arenaId: params.arenaId,
      arenaName: params.arenaName,
      sport: params.sport,
      slotId: params.slotId,
      date: params.date,
      day: params.day,
      startTime: params.startTime,
      endTime: params.endTime,
      duration: params.duration,
      totalAmount: params.totalAmount,
      amountPaid: amountPaid,
      amountDue: amountDue,
      paymentStatus: paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: bookingType,
      paymentMethod: params.paymentMethod,
      convenienceFee: convenienceFee,
      ownerShare: ownerShare,
      verifiedAutomatically: isAutoVerified,
      settlementStatus: paymentStatus === 'PAID' ? 'PENDING' : undefined,
      upiTxnRef: params.upiTxnRef || undefined,
      whatsappNotificationSent: false,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Create the booking document
    transaction.set(newBookingRef, sanitizeFirestoreData(bookingData));

    // 2. Mark the slot as booked
    transaction.update(slotDocRef, sanitizeFirestoreData({
      status: slotStatus,
      bookingType: bookingType,
      bookedByPlayerId: params.playerId,
      bookedByPlayerName: params.playerName,
      activeBookingId: newBookingRef.id,
      updatedAt: now,
    }));

    // 3. Create payment transaction record
    const newTxRef = doc(collection(db, 'paymentTransactions'));
    const txData: PaymentTransaction = {
      id: newTxRef.id,
      transactionId: params.upiTxnRef || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: newBookingRef.id,
      playerId: params.playerId,
      ownerId: params.ownerId,
      amount: amountPaid,
      convenienceFee: convenienceFee,
      ownerShare: ownerShare,
      paymentMethod: params.paymentMethod === 'PAY_LATER_AT_TURF' ? 'PAY_LATER_AT_TURF' : 'ONLINE_GATEWAY',
      status: paymentStatus === 'PAID' || paymentStatus === 'PARTIAL' ? 'SUCCESS' : 'PENDING',
      gatewayPaymentId: params.gatewayPaymentId || params.upiTxnRef,
      gatewayOrderId: params.gatewayOrderId,
      verifiedAutomatically: isAutoVerified,
      notes: paymentStatus === 'PAID'
        ? (isAutoVerified
            ? `Online payment verified via Central Gateway (Turf: ₹${ownerShare}, TruFit Fee: ₹${convenienceFee})`
            : 'Full online payment confirmed')
        : paymentStatus === 'PARTIAL'
        ? `Advance token deposit paid (₹${amountPaid}). Balance ₹${amountDue} due at turf.`
        : 'Pay at turf desk upon arrival',
      createdAt: now,
    };
    transaction.set(newTxRef, sanitizeFirestoreData(txData));

    return bookingData;
  });

  // Dispatch In-App & Push Notification to Owner and Player
  try {
    const { sendNotification } = await import('./phase3');
    const refCode = booking.bookingId || booking.id.slice(-6).toUpperCase();
    const paidText = (booking.amountPaid || 0) > 0 ? `Paid: ₹${booking.amountPaid}` : 'Pay at Turf';

    if (booking.ownerId && booking.ownerId !== booking.playerId) {
      sendNotification({
        recipientId: booking.ownerId,
        title: `🏟️ New Booking: ${booking.turfName}`,
        message: `${booking.playerName} reserved a slot on ${booking.date} (${booking.startTime} - ${booking.endTime}) for ${booking.sport}. Total: ₹${booking.totalAmount} (${paidText}). Ref #${refCode}`,
        type: 'BOOKING_CONFIRMED',
        relatedId: booking.id,
        relatedType: 'BOOKING',
        linkId: booking.id,
      }).catch((e) => console.warn('Silent owner notif catch:', e));
    }

    if (booking.playerId) {
      sendNotification({
        recipientId: booking.playerId,
        title: `✅ Booking Confirmed: ${booking.turfName}`,
        message: `Your slot for ${booking.sport} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed! Ref #${refCode}. Tap to open your WhatsApp pass & entry ticket.`,
        type: 'BOOKING_CONFIRMED',
        relatedId: booking.id,
        relatedType: 'BOOKING',
        linkId: booking.id,
      }).catch((e) => console.warn('Silent player notif catch:', e));
    }
  } catch (notifErr) {
    console.warn('Could not dispatch booking notifications in web engine:', notifErr);
  }

  return booking;
}

// ==================== OWNER BOOKINGS / DUES / PLAYERS ====================

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) return [];
  const q = query(collection(db, 'bookings'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  if (!playerId || typeof playerId !== 'string' || !playerId.trim()) return [];
  const q = query(collection(db, 'bookings'), where('playerId', '==', playerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function updateBookingPaymentStatus(
  bookingId: string,
  amountPaidNow: number,
  notes?: string
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');

  const b = snap.data() as Booking;
  const newAmountPaid = (b.amountPaid || 0) + amountPaidNow;
  const newAmountDue = Math.max(0, b.totalAmount - newAmountPaid);
  const newStatus = newAmountDue === 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

  await updateDoc(bookingRef, {
    amountPaid: newAmountPaid,
    amountDue: newAmountDue,
    paymentStatus: newStatus,
    updatedAt: new Date().toISOString(),
  });

  // Record transaction
  const newTxRef = doc(collection(db, 'paymentTransactions'));
  const txData: PaymentTransaction = {
    id: newTxRef.id,
    transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingId: bookingId,
    playerId: b.playerId,
    ownerId: b.ownerId,
    amount: amountPaidNow,
    paymentMethod: 'CASH_OR_COUNTER_UPI',
    status: 'SUCCESS',
    notes: notes || 'Counter settlement recorded by turf owner',
    createdAt: new Date().toISOString(),
  };
  await setDoc(newTxRef, txData);
}

export async function getPaymentTransactionsForUser(userId: string, isOwner: boolean): Promise<PaymentTransaction[]> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return [];
  const field = isOwner ? 'ownerId' : 'playerId';
  const q = query(collection(db, 'paymentTransactions'), where(field, '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentTransaction));
}

// ==================== LOBBY CREATION WITH ATOMIC SLOT AVAILABILITY ====================

export interface CreateLobbyWithSlotParams {
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhone?: string;
  hostPhotoURL?: string | null;
  preferredSport?: string;
  skillLevel?: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  turfArea: string;
  turfCity: string;
  arenaId: string;
  arenaName: string;
  sport: string;
  slotId: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  lobbyName: string;
  maxPlayers: number;
  minPlayers: number;
  pricePerPlayer: number;
  description: string;
  rules?: string;
  isPublic: boolean;
  allowNewPlayers: boolean;
  paymentMethod: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  initialSquadCount?: number;
  hostAnnouncement?: string;
  totalSlotPrice?: number;
  dynamicCostPerPlayer?: number;
  costDivisionNote?: string;
  upiTxnRef?: string;
  convenienceFee?: number;
  ownerShare?: number;
}

/**
 * Creates a lobby and confirms a booking only if the slot is AVAILABLE.
 * Uses an atomic Firestore transaction to prevent double bookings.
 */
export async function createLobbyWithSlotTransaction(
  params: CreateLobbyWithSlotParams
): Promise<{ lobby: any; booking: Booking }> {
  return await runTransaction(db, async (transaction) => {
    const slotDocRef = doc(db, 'slots', params.slotId);
    const slotSnap = await transaction.get(slotDocRef);

    if (!slotSnap.exists()) {
      throw new Error('This slot does not exist. Please choose another slot.');
    }

    const currentSlot = slotSnap.data() as Slot;

    // Requirement: A lobby must never be created for an unavailable/already-booked slot.
    if (currentSlot.status !== 'AVAILABLE') {
      throw new Error('This slot is no longer available. Please choose another slot.');
    }

    const now = new Date().toISOString();
    const isPaid = params.paymentMethod === 'PAY_NOW';
    const amountPaid = isPaid ? params.totalAmount : 0;
    const amountDue = params.totalAmount - amountPaid;
    const paymentStatus = isPaid ? 'PAID' : 'PENDING';

    const newBookingRef = doc(collection(db, 'bookings'));
    const newLobbyRef = doc(collection(db, 'lobbies'));
    const lobbyId = newLobbyRef.id;

    // 1. Create Booking Doc
    const bookingData: Booking = {
      id: newBookingRef.id,
      bookingId: `TF-LOBBY-${Math.floor(100000 + Math.random() * 900000)}`,
      playerId: params.hostId,
      playerName: params.hostName,
      playerEmail: params.hostEmail,
      playerPhone: params.hostPhone || '',
      playerPhotoURL: params.hostPhotoURL || undefined,
      ownerId: currentSlot.ownerId,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress,
      turfArea: params.turfArea,
      turfCity: params.turfCity,
      arenaId: params.arenaId,
      arenaName: params.arenaName,
      sport: params.sport,
      slotId: params.slotId,
      date: params.date,
      day: params.day,
      startTime: params.startTime,
      endTime: params.endTime,
      duration: params.duration,
      totalAmount: params.totalAmount,
      amountPaid: amountPaid,
      amountDue: amountDue,
      paymentStatus: paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: 'PLAYER',
      paymentMethod: params.paymentMethod,
      convenienceFee: params.convenienceFee || 0,
      ownerShare: params.ownerShare !== undefined ? params.ownerShare : Math.max(0, params.totalAmount - (params.convenienceFee || 0)),
      verifiedAutomatically: isPaid,
      settlementStatus: isPaid ? 'PENDING' : undefined,
      lobbyCreated: true,
      lobbyId: lobbyId,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(newBookingRef, sanitizeFirestoreData(bookingData));

    // 2. Mark Slot as BOOKED_BY_PLAYER
    transaction.update(slotDocRef, sanitizeFirestoreData({
      status: 'BOOKED_BY_PLAYER',
      bookingType: 'PLAYER',
      bookedByPlayerId: params.hostId,
      bookedByPlayerName: params.hostName,
      activeBookingId: newBookingRef.id,
      updatedAt: now,
    }));

    // 3. Create Lobby Doc
    const initialSquad = params.initialSquadCount || 1;
    const lobbyData = {
      id: lobbyId,
      name: params.lobbyName.trim(),
      sport: params.sport,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress,
      turfCity: params.turfCity,
      arenaId: params.arenaId,
      arenaName: params.arenaName,
      bookingId: newBookingRef.id,
      slotId: params.slotId,
      hostId: params.hostId,
      hostName: params.hostName,
      hostPhotoURL: params.hostPhotoURL || null,
      date: params.date,
      day: params.day,
      startTime: params.startTime,
      endTime: params.endTime,
      maxPlayers: Number(params.maxPlayers),
      minPlayers: Number(params.minPlayers),
      currentPlayers: initialSquad,
      initialSquadCount: initialSquad,
      totalSlotPrice: params.totalAmount,
      dynamicCostPerPlayer: Number(params.pricePerPlayer),
      hostAnnouncement: params.hostAnnouncement?.trim() || '',
      costDivisionNote: params.costDivisionNote || `₹${params.totalAmount} total slot / ${params.maxPlayers} players = ₹${params.pricePerPlayer} per person`,
      upiTxnRef: params.upiTxnRef || (isPaid ? `UPI-TXN-${Date.now().toString(36).toUpperCase()}` : undefined),
      pricePerPlayer: Number(params.pricePerPlayer),
      description: params.description.trim() || `Sports lobby for ${params.sport} at ${params.turfName}.`,
      rules: params.rules?.trim() || 'Bring your own gear. Arrive 10 mins prior.',
      isPublic: params.isPublic,
      allowNewPlayers: params.allowNewPlayers,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(newLobbyRef, sanitizeFirestoreData(lobbyData));

    // 4. Create host LobbyPlayer record
    const participantId = `${lobbyId}_${params.hostId}`;
    const participantRef = doc(db, 'lobbyPlayers', participantId);
    const hostParticipant = {
      id: participantId,
      lobbyId: lobbyId,
      uid: params.hostId,
      playerName: params.hostName,
      playerPhotoURL: params.hostPhotoURL || null,
      preferredSport: params.preferredSport || params.sport,
      skillLevel: params.skillLevel || 'Intermediate',
      isHost: true,
      joinedAt: now,
    };
    transaction.set(participantRef, sanitizeFirestoreData(hostParticipant));

    // 5. Create PaymentTransaction record
    const newTxRef = doc(collection(db, 'paymentTransactions'));
    const txData: PaymentTransaction = {
      id: newTxRef.id,
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: newBookingRef.id,
      playerId: params.hostId,
      ownerId: currentSlot.ownerId,
      amount: amountPaid,
      paymentMethod: params.paymentMethod === 'PAY_NOW' ? 'ONLINE_GATEWAY' : 'PAY_LATER_AT_TURF',
      status: isPaid ? 'SUCCESS' : 'PENDING',
      notes: isPaid ? 'Online payment for match lobby booking' : 'Lobby host will pay at turf counter',
      createdAt: now,
    };
    transaction.set(newTxRef, sanitizeFirestoreData(txData));

    // 6. Create initial BookingPlayerShare for host
    const shareId = `${newBookingRef.id}_${params.hostId}`;
    const shareDocRef = doc(db, 'bookingShares', shareId);
    const hostShare = {
      id: shareId,
      bookingId: newBookingRef.id,
      turfId: params.turfId,
      ownerId: currentSlot.ownerId,
      playerId: params.hostId,
      playerName: params.hostName,
      playerEmail: params.hostEmail,
      playerPhotoURL: params.hostPhotoURL || null,
      shareAmount: params.pricePerPlayer || Math.round(params.totalAmount / params.maxPlayers),
      amountPaid: isPaid ? (params.pricePerPlayer || Math.round(params.totalAmount / params.maxPlayers)) : 0,
      amountDue: isPaid ? 0 : (params.pricePerPlayer || Math.round(params.totalAmount / params.maxPlayers)),
      status: isPaid ? 'PAID' : 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(shareDocRef, sanitizeFirestoreData(hostShare));

    return { lobby: lobbyData, booking: bookingData };
  });
}

// ==================== 7-DAY SLOT GENERATION ====================

export interface Generate7DaySlotsParams {
  turfId: string;
  arenaId: string;
  ownerId: string;
  startHour: number; // e.g. 6 (6 AM)
  endHour: number; // e.g. 23 (11 PM)
  durationHours: number; // 1 or 2
  price: number;
  selectedDays?: string[]; // ["Monday", "Tuesday", ...] or undefined for all 7 days
  startDate?: string; // YYYY-MM-DD, defaults to today
}

export async function generate7DaySlots(params: Generate7DaySlotsParams): Promise<{ totalSlotsCreated: number; datesCovered: string[] }> {
  const dates: string[] = [];
  const baseDate = params.startDate ? parseLocalDate(params.startDate) : new Date();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    const dateStr = formatLocalDate(d);
    dates.push(dateStr);
  }

  const allSlotsToCreate: Array<Omit<Slot, 'id' | 'createdAt' | 'updatedAt'>> = [];

  for (const dateStr of dates) {
    const dayName = getDayName(dateStr);

    if (params.selectedDays && params.selectedDays.length > 0 && !params.selectedDays.includes(dayName)) {
      continue;
    }

    for (let h = params.startHour; h < params.endHour; h += params.durationHours) {
      const startH24 = `${h < 10 ? '0' : ''}${h}:00`;
      const endH24 = `${h + params.durationHours < 10 ? '0' : ''}${h + params.durationHours}:00`;

      // Helper to format 24h to 12h
      const to12h = (t: string) => {
        const [hourStr, minStr] = t.split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${hour < 10 ? '0' : ''}${hour}:${minStr} ${ampm}`;
      };

      allSlotsToCreate.push({
        turfId: params.turfId,
        arenaId: params.arenaId,
        ownerId: params.ownerId,
        date: dateStr,
        day: dayName,
        startTime: to12h(startH24),
        endTime: to12h(endH24),
        durationMinutes: params.durationHours * 60,
        price: Number(params.price),
        visibleToPlayers: true,
        status: 'AVAILABLE',
      });
    }
  }

  const totalSlotsCreated = await createBulkSlots(allSlotsToCreate);
  return { totalSlotsCreated, datesCovered: dates };
}

// ==================== TURF CLOSURE & ARENA MAINTENANCE ====================

export async function toggleTurfClosure(
  turfId: string,
  isClosed: boolean,
  closureReason?: string,
  closureNotice?: string
): Promise<void> {
  const turfRef = doc(db, 'turfs', turfId);
  await updateDoc(turfRef, sanitizeFirestoreData({
    isClosed: isClosed,
    closureReason: closureReason || '',
    closureNotice: closureNotice || '',
    updatedAt: new Date().toISOString(),
  }));
}

export async function toggleArenaMaintenance(
  arenaId: string,
  isUnderMaintenance: boolean,
  maintenanceReason?: string,
  autoBlockSlots: boolean = true
): Promise<void> {
  const arenaRef = doc(db, 'arenas', arenaId);
  await updateDoc(arenaRef, sanitizeFirestoreData({
    isUnderMaintenance: isUnderMaintenance,
    maintenanceReason: maintenanceReason || '',
    updatedAt: new Date().toISOString(),
  }));

  if (autoBlockSlots) {
    // Update all future available slots for this arena
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'slots'),
      where('arenaId', '==', arenaId),
      where('date', '>=', todayStr)
    );
    const snap = await getDocs(q);

    for (const slotDoc of snap.docs) {
      const slot = slotDoc.data() as Slot;
      if (isUnderMaintenance && slot.status === 'AVAILABLE') {
        await updateDoc(slotDoc.ref, {
          status: 'BLOCKED',
          updatedAt: new Date().toISOString(),
        });
      } else if (!isUnderMaintenance && slot.status === 'BLOCKED') {
        await updateDoc(slotDoc.ref, {
          status: 'AVAILABLE',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

export async function updateSlotPrice(slotId: string, newPrice: number): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await updateDoc(docRef, sanitizeFirestoreData({
    price: newPrice,
    updatedAt: new Date().toISOString(),
  }));
}

// ==================== CANCEL BOOKING & DISSOLVE LOBBY ====================

export async function cancelBookingAndDissolveLobby(
  bookingId: string,
  lobbyId?: string,
  requesterId?: string
): Promise<void> {
  return await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error('Booking not found.');
    }

    const booking = bookingSnap.data() as Booking;

    // 1. Release the associated Slot
    if (booking.slotId) {
      const slotRef = doc(db, 'slots', booking.slotId);
      const slotSnap = await transaction.get(slotRef);
      if (slotSnap.exists()) {
        transaction.update(slotRef, sanitizeFirestoreData({
          status: 'AVAILABLE',
          bookingType: null,
          bookedByPlayerId: null,
          bookedByPlayerName: null,
          activeBookingId: null,
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    // 2. Mark Booking as CANCELLED
    transaction.update(bookingRef, sanitizeFirestoreData({
      bookingStatus: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    }));

    // 3. Mark or Dissolve Lobby if associated
    const targetLobbyId = lobbyId || booking.lobbyId;
    if (targetLobbyId) {
      const lobbyRef = doc(db, 'lobbies', targetLobbyId);
      const lobbySnap = await transaction.get(lobbyRef);
      if (lobbySnap.exists()) {
        transaction.update(lobbyRef, sanitizeFirestoreData({
          status: 'CANCELLED',
          allowNewPlayers: false,
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  });
}

export async function toggleTurfClosedStatus(
  turfId: string,
  isClosed: boolean,
  reason?: string
): Promise<void> {
  return toggleTurfClosure(turfId, isClosed, reason);
}

// ==================== AUTO-EXPIRE / DELETE PAST LOBBIES & GAME STATUS ====================

export function parseTimeToMinutes(tStr?: string): number {
  if (!tStr) return 0;
  const parts = tStr.trim().split(' ');
  const timePart = parts[0];
  const ampm = parts[1]?.toUpperCase();
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function isLobbyConcluded(lobby: {
  date: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}): boolean {
  if (!lobby) return false;
  if (lobby.status === 'COMPLETED' || lobby.status === 'CLOSED') return true;
  if (lobby.status === 'CANCELLED') return false;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (lobby.date < todayStr) return true;
  if (lobby.date > todayStr) return false;

  // Today: check end time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMin = parseTimeToMinutes(lobby.endTime || '23:59');
  return currentMinutes >= endMin;
}

export function isBookingConcluded(booking: {
  date: string;
  startTime?: string;
  endTime?: string;
  bookingStatus?: string;
}): boolean {
  if (!booking) return false;
  if (booking.bookingStatus === 'COMPLETED') return true;
  if (booking.bookingStatus === 'CANCELLED') return false;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (booking.date < todayStr) return true;
  if (booking.date > todayStr) return false;

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const endMin = parseTimeToMinutes(booking.endTime || '23:59');
  return curMinutes >= endMin;
}

export function getLobbyGameStatus(lobby: {
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
}): 'UPCOMING' | 'LIVE' | 'OVER' | 'CANCELLED' {
  if (!lobby) return 'OVER';
  if (lobby.status === 'CANCELLED') return 'CANCELLED';
  if (lobby.status === 'MATCH_STARTED') return 'LIVE';
  if (lobby.status === 'COMPLETED' || lobby.status === 'CLOSED') return 'OVER';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (lobby.date < todayStr) {
    return 'OVER';
  }
  if (lobby.date > todayStr) {
    return 'UPCOMING';
  }

  // Today: check start and end time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(lobby.startTime || '00:00');
  const endMin = parseTimeToMinutes(lobby.endTime || '23:59');

  if (currentMinutes >= endMin) {
    return 'OVER';
  }
  if (currentMinutes >= startMin && currentMinutes < endMin) {
    return 'LIVE';
  }
  return 'UPCOMING';
}

// ==================== PLAYER POOLS ====================

export async function deletePlayerPool(poolId: string): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  await deleteDoc(poolRef);
}

/**
 * Checks for past/expired lobbies where game time is over and cleans them up.
 */
export async function cleanupExpiredLobbies(): Promise<number> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeVal = currentHours * 60 + currentMinutes;

    const snap = await getDocs(collection(db, 'lobbies'));
    let cleanedCount = 0;

    for (const d of snap.docs) {
      const lobby = d.data() as any;
      if (lobby.status === 'CANCELLED' || lobby.isExpired) continue;

      let isExpired = false;
      if (lobby.date < todayStr) {
        isExpired = true;
      } else if (lobby.date === todayStr && lobby.endTime) {
        // Parse endTime e.g. "07:00 PM" or "19:00"
        let endH = 0;
        let endM = 0;
        const parts = lobby.endTime.split(' ');
        const timePart = parts[0];
        const ampm = parts[1]?.toUpperCase();

        const [hStr, mStr] = timePart.split(':');
        endH = parseInt(hStr, 10) || 0;
        endM = parseInt(mStr, 10) || 0;

        if (ampm === 'PM' && endH < 12) endH += 12;
        if (ampm === 'AM' && endH === 12) endH = 0;

        const lobbyEndTimeVal = endH * 60 + endM;
        if (currentTimeVal > lobbyEndTimeVal) {
          isExpired = true;
        }
      }

      if (isExpired) {
        await updateDoc(d.ref, {
          status: 'CLOSED',
          isExpired: true,
          updatedAt: new Date().toISOString(),
        });
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (err) {
    console.warn('Error cleaning up expired lobbies:', err);
    return 0;
  }
}

// ==================== OWNER PAYMENT ID & PAYOUT SETTINGS ====================

export async function updateOwnerPaymentSettings(
  ownerId: string,
  settings: any
): Promise<void> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) {
    console.warn('updateOwnerPaymentSettings: ownerId is invalid or missing');
    return;
  }
  const userRef = doc(db, 'users', ownerId);
  const now = new Date().toISOString();
  await updateDoc(userRef, sanitizeFirestoreData({
    paymentSettings: {
      ...settings,
      updatedAt: now,
    },
    updatedAt: now,
  }));
}

export async function saveTurfPaymentSettings(
  turfId: string,
  paymentDetails: {
    upiId?: string;
    beneficiaryName?: string;
    paymentSettings?: any;
  }
): Promise<void> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim() || turfId === 'ALL') {
    console.warn('saveTurfPaymentSettings: turfId is invalid or missing');
    return;
  }
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  await updateDoc(turfRef, sanitizeFirestoreData({
    ...paymentDetails,
    updatedAt: now,
  }));
}

// ==================== TURF VERIFICATION & DUPLICATE CHECKS ====================

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function checkNearbyTurfDuplicates(
  lat: number,
  lon: number,
  excludeTurfId?: string,
  thresholdMeters: number = 150
): Promise<{
  hasDuplicate: boolean;
  duplicateTurfId?: string;
  duplicateTurfName?: string;
  distanceMeters?: number;
}> {
  try {
    const snap = await getDocs(collection(db, 'turfs'));
    const allTurfs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));

    for (const t of allTurfs) {
      if (excludeTurfId && t.id === excludeTurfId) continue;
      if (t.latitude && t.longitude) {
        const dist = calculateDistanceMeters(lat, lon, t.latitude, t.longitude);
        if (dist <= thresholdMeters) {
          return {
            hasDuplicate: true,
            duplicateTurfId: t.id,
            duplicateTurfName: t.name,
            distanceMeters: dist,
          };
        }
      }
    }
    return { hasDuplicate: false };
  } catch (err) {
    console.warn('Error checking duplicates:', err);
    return { hasDuplicate: false };
  }
}

export async function createTurfWithVerification(
  turfData: Omit<Turf, 'id' | 'createdAt' | 'updatedAt'>,
  ownerName?: string
): Promise<string> {
  const newDocRef = doc(collection(db, 'turfs'));
  const now = new Date().toISOString();

  // Check for duplicate proximity
  let duplicateWarning: {
    flagged: boolean;
    existingTurfId?: string;
    existingTurfName?: string;
    distanceMeters?: number;
    adminReviewed?: boolean;
  } = { flagged: false };
  if (turfData.latitude && turfData.longitude) {
    const dupCheck = await checkNearbyTurfDuplicates(turfData.latitude, turfData.longitude, newDocRef.id);
    if (dupCheck.hasDuplicate) {
      duplicateWarning = {
        flagged: true,
        existingTurfId: dupCheck.duplicateTurfId,
        existingTurfName: dupCheck.duplicateTurfName,
        distanceMeters: dupCheck.distanceMeters,
        adminReviewed: false,
      };
    }
  }

  const payload: Turf = {
    ...turfData,
    id: newDocRef.id,
    active: true,
    verificationStatus: 'pending_verification',
    verificationLevel: 1, // Contact info verified / Basic registration
    phoneVerified: true,
    emailVerified: true,
    verification: {
      submittedAt: now,
      physicalVerificationStatus: 'pending',
      duplicateWarning,
      photoVerification: {
        entrancePhoto: turfData.photos?.[0] || '',
        signboardPhoto: turfData.photos?.[1] || '',
        playingAreaPhotos: turfData.photos?.slice(2) || [],
        facilitiesPhotos: [],
        verified: false,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, sanitizeFirestoreData(payload));

  // Log initial verification history
  await addVerificationHistory(newDocRef.id, {
    action: 'submitted',
    previousStatus: 'draft',
    newStatus: 'pending_verification',
    performedBy: turfData.ownerId,
    performedByName: ownerName || 'Owner',
    notes: 'Initial venue registration submitted with contact and photo verification.',
  });

  return newDocRef.id;
}

export async function addVerificationHistory(
  turfId: string,
  historyData: Omit<any, 'id' | 'createdAt' | 'turfId'>
): Promise<string> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return '';
  const newRef = doc(collection(db, 'turfs', turfId, 'verificationHistory'));
  const now = new Date().toISOString();
  const payload = {
    ...historyData,
    id: newRef.id,
    turfId,
    createdAt: now,
  };
  await setDoc(newRef, sanitizeFirestoreData(payload));
  return newRef.id;
}

export async function getVerificationHistory(turfId: string): Promise<any[]> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return [];
  try {
    const q = query(collection(db, 'turfs', turfId, 'verificationHistory'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Error fetching verification history:', err);
    return [];
  }
}

export async function uploadVerificationDocument(
  turfId: string,
  ownerId: string,
  docData: {
    documentType: string;
    documentName: string;
    fileUrl: string;
  }
): Promise<string> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return '';
  const newRef = doc(collection(db, 'turfs', turfId, 'verificationDocuments'));
  const now = new Date().toISOString();
  const payload = {
    id: newRef.id,
    turfId,
    ownerId,
    documentType: docData.documentType,
    documentName: docData.documentName,
    fileUrl: docData.fileUrl,
    status: 'uploaded',
    uploadedAt: now,
  };
  await setDoc(newRef, sanitizeFirestoreData(payload));

  // Update turf verification status to under_review if was rejected
  const turfRef = doc(db, 'turfs', turfId);
  await updateDoc(turfRef, {
    'verification.submittedAt': now,
    updatedAt: now,
  });

  return newRef.id;
}

export async function getVerificationDocuments(turfId: string): Promise<any[]> {
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return [];
  try {
    const snap = await getDocs(collection(db, 'turfs', turfId, 'verificationDocuments'));
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn('Error fetching verification docs:', err);
    return [];
  }
}

export async function deleteVerificationDocument(turfId: string, docId: string): Promise<void> {
  const docRef = doc(db, 'turfs', turfId, 'verificationDocuments', docId);
  await deleteDoc(docRef);
}

export async function submitTurfForReview(
  turfId: string,
  ownerId: string,
  ownerName: string,
  notes?: string
): Promise<void> {
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const snap = await getDoc(turfRef);
  const prevStatus = (snap.data() as Turf)?.verificationStatus || 'pending_verification';

  await updateDoc(turfRef, sanitizeFirestoreData({
    verificationStatus: 'under_review',
    'verification.submittedAt': now,
    'verification.rejectionReason': null,
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: prevStatus === 'rejected' ? 'resubmitted' : 'submitted',
    previousStatus: prevStatus,
    newStatus: 'under_review',
    performedBy: ownerId,
    performedByName: ownerName,
    notes: notes || 'Owner submitted documentation for verification review.',
  });
}

export async function submitPhysicalVerification(
  turfId: string,
  videoUrl: string,
  code: string,
  ownerId: string,
  ownerName: string
): Promise<void> {
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();

  await updateDoc(turfRef, sanitizeFirestoreData({
    'verification.physicalVerificationStatus': 'submitted',
    'verification.physicalVerificationVideoUrl': videoUrl,
    'verification.physicalVerificationCode': code,
    'verification.physicalVerificationSubmittedAt': now,
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: 'submitted',
    previousStatus: 'under_review',
    newStatus: 'under_review',
    performedBy: ownerId,
    performedByName: ownerName,
    notes: `Physical verification live video submitted with unique code ${code}.`,
  });
}

export async function adminApproveTurf(
  turfId: string,
  adminUid: string,
  adminName: string,
  level: 2 | 3 = 2,
  notes?: string
): Promise<void> {
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const snap = await getDoc(turfRef);
  const turf = snap.data() as Turf;
  const prevStatus = turf?.verificationStatus || 'pending_verification';

  await updateDoc(turfRef, sanitizeFirestoreData({
    verificationStatus: 'verified',
    verificationLevel: level,
    active: true,
    'verification.reviewedAt': now,
    'verification.reviewedBy': adminUid,
    'verification.reviewedByName': adminName,
    'verification.adminNotes': notes || 'Approved by TurFit Operations',
    'verification.rejectionReason': null,
    'verification.physicalVerificationStatus': level === 3 ? 'verified' : turf?.verification?.physicalVerificationStatus || 'pending',
    'verification.photoVerification.verified': true,
    'verification.duplicateWarning.adminReviewed': true,
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: level === 3 ? 'physical_approved' : 'approved',
    previousStatus: prevStatus,
    newStatus: 'verified',
    performedBy: adminUid,
    performedByName: adminName,
    notes: notes || `Turf verified at Level ${level} (${level === 3 ? 'Physically Verified' : 'Turf Verified'}). Public booking enabled.`,
  });
}

export async function adminRejectTurf(
  turfId: string,
  adminUid: string,
  adminName: string,
  reason: string
): Promise<void> {
  if (!reason.trim()) throw new Error('A valid rejection reason is required.');
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const snap = await getDoc(turfRef);
  const prevStatus = (snap.data() as Turf)?.verificationStatus || 'pending_verification';

  await updateDoc(turfRef, sanitizeFirestoreData({
    verificationStatus: 'rejected',
    'verification.reviewedAt': now,
    'verification.reviewedBy': adminUid,
    'verification.reviewedByName': adminName,
    'verification.rejectionReason': reason.trim(),
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: 'rejected',
    previousStatus: prevStatus,
    newStatus: 'rejected',
    performedBy: adminUid,
    performedByName: adminName,
    reason: reason.trim(),
    notes: `Verification rejected: ${reason.trim()}`,
  });
}

export async function adminRequestMoreInfo(
  turfId: string,
  adminUid: string,
  adminName: string,
  notes: string
): Promise<void> {
  if (!notes.trim()) throw new Error('Please specify the requested information.');
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const snap = await getDoc(turfRef);
  const prevStatus = (snap.data() as Turf)?.verificationStatus || 'pending_verification';

  await updateDoc(turfRef, sanitizeFirestoreData({
    verificationStatus: 'under_review',
    'verification.reviewedAt': now,
    'verification.reviewedBy': adminUid,
    'verification.reviewedByName': adminName,
    'verification.moreInfoRequestedNotes': notes.trim(),
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: 'more_info_requested',
    previousStatus: prevStatus,
    newStatus: 'under_review',
    performedBy: adminUid,
    performedByName: adminName,
    notes: `More information requested: ${notes.trim()}`,
  });
}

export async function adminSuspendTurf(
  turfId: string,
  adminUid: string,
  adminName: string,
  reason: string
): Promise<void> {
  if (!reason.trim()) throw new Error('A suspension reason is required.');
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const snap = await getDoc(turfRef);
  const prevStatus = (snap.data() as Turf)?.verificationStatus || 'verified';

  await updateDoc(turfRef, sanitizeFirestoreData({
    verificationStatus: 'suspended',
    isClosed: true,
    closureReason: `Account Suspended: ${reason.trim()}`,
    closureNotice: 'Venue suspended by TurFit Administration. Future bookings temporarily disabled.',
    'verification.reviewedAt': now,
    'verification.reviewedBy': adminUid,
    'verification.reviewedByName': adminName,
    'verification.adminNotes': `Suspended: ${reason.trim()}`,
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: 'suspended',
    previousStatus: prevStatus,
    newStatus: 'suspended',
    performedBy: adminUid,
    performedByName: adminName,
    reason: reason.trim(),
    notes: `Turf suspended: ${reason.trim()}`,
  });
}

export async function adminRequestPhysicalVerification(
  turfId: string,
  adminUid: string,
  adminName: string
): Promise<string> {
  const turfRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  const randomCode = `TURFIT-${Math.floor(1000 + Math.random() * 9000)}`;

  await updateDoc(turfRef, sanitizeFirestoreData({
    'verification.physicalVerificationStatus': 'requested',
    'verification.physicalVerificationCode': randomCode,
    updatedAt: now,
  }));

  await addVerificationHistory(turfId, {
    action: 'physical_requested',
    previousStatus: 'verified',
    newStatus: 'verified',
    performedBy: adminUid,
    performedByName: adminName,
    notes: `Physical live video walk-through requested with verification code ${randomCode}.`,
  });

  return randomCode;
}

export async function adminReviewDocument(
  turfId: string,
  docId: string,
  adminUid: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const docRef = doc(db, 'turfs', turfId, 'verificationDocuments', docId);
  const now = new Date().toISOString();
  await updateDoc(docRef, sanitizeFirestoreData({
    status,
    reviewedAt: now,
    reviewedBy: adminUid,
    rejectionReason: status === 'rejected' ? rejectionReason : null,
  }));
}

export async function getAllTurfsForAdmin(): Promise<Turf[]> {
  const snap = await getDocs(collection(db, 'turfs'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));
}

// ==================== LOBBY ROSTER & BOOKING CLASSIFICATION ====================

export function isLobbyBooking(booking: Partial<Booking>): boolean {
  return Boolean(
    booking.lobbyCreated ||
    booking.lobbyId ||
    booking.bookedVia === 'LOBBY' ||
    (booking.bookingId && booking.bookingId.startsWith('TF-LOBBY-'))
  );
}

export async function getLobbyParticipants(lobbyId: string): Promise<LobbyPlayer[]> {
  if (!lobbyId) return [];
  try {
    const q = query(collection(db, 'lobbyPlayers'), where('lobbyId', '==', lobbyId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LobbyPlayer));
    }
    // Fallback: check lobby document's players array
    const lobbyRef = doc(db, 'lobbies', lobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    if (lobbySnap.exists()) {
      const data = lobbySnap.data() as any;
      if (data?.players && Array.isArray(data.players)) {
        return data.players.map((p: any) => ({
          id: `${lobbyId}_${p.uid || p.playerId}`,
          lobbyId,
          uid: p.uid || p.playerId,
          playerName: p.playerName || p.name || 'Athlete',
          playerPhotoURL: p.playerPhotoURL || p.photoURL || null,
          playerPhone: p.playerPhone || p.phone || '',
          preferredSport: data.sport,
          skillLevel: p.skillLevel || 'Intermediate',
          isHost: Boolean(p.isHost || (p.uid || p.playerId) === data.hostId),
          paymentStatus: p.paymentStatus || 'PAID',
          amountPaid: p.amountPaid || 0,
          amountDue: p.amountDue || 0,
          joinedAt: p.joinedAt || data.createdAt,
        } as LobbyPlayer));
      }
    }
    return [];
  } catch (err) {
    console.warn('Error fetching lobby participants:', err);
    return [];
  }
}

export const DEFAULT_TAB_VISIBILITY_CONFIG: TabVisibilityConfig = {
  playerTabs: {
    home: true,
    explore: true,
    gaming: true,
    lobbies: true,
    teams: true,
    matches: true,
    rewards: true,
    stats: true,
    bookings: true,
    payments: true,
  },
  ownerTabs: {
    dashboard: true,
    analytics: true,
    'my-turf': true,
    slots: true,
    bookings: true,
    dues: true,
    payments: true,
    offers: true,
    reviews: true,
    profile: true,
  },
};

export async function getTabVisibilityConfig(): Promise<TabVisibilityConfig> {
  try {
    const docRef = doc(db, 'settings', 'tabVisibility');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TabVisibilityConfig;
      return {
        playerTabs: { ...DEFAULT_TAB_VISIBILITY_CONFIG.playerTabs, ...(data.playerTabs || {}) },
        ownerTabs: { ...DEFAULT_TAB_VISIBILITY_CONFIG.ownerTabs, ...(data.ownerTabs || {}) },
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
  } catch (err) {
    console.warn('Error fetching tab visibility config:', err);
  }
  return DEFAULT_TAB_VISIBILITY_CONFIG;
}

export async function updateTabVisibilityConfig(
  config: TabVisibilityConfig,
  updatedBy: string = 'Super Admin'
): Promise<void> {
  const docRef = doc(db, 'settings', 'tabVisibility');
  const payload: TabVisibilityConfig = {
    playerTabs: config.playerTabs,
    ownerTabs: config.ownerTabs,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload));
}

// ==========================================
// OWNER SUBSCRIPTION MANAGEMENT
// ==========================================

export const DEFAULT_SUBSCRIPTION_PLANS: OwnerSubscriptionPlan[] = [
  {
    id: 'plan_standard_monthly',
    name: 'Standard Monthly',
    price: 999,
    durationDays: 30,
    features: ['Unlimited Booking Calendar', 'Automated UPI Gateway', '7-Day Basic Analytics', 'Standard Support'],
    featuresConfig: {
      analytics: true,
      analytics7Days: true,
      analytics30Days: false,
      analyticsAllTime: false,
      individualArenaAnalytics: false,
      downloadReports: false,
      whatsappNotifications: false,
      offers: false,
      duesTracker: true,
      reviewsManager: true,
      allowPayAtVenue: false,
      autoSlotGenerator: false,
      customPricing: false,
      slotPriceEditing: false,
      multiCourtSetup: false,
      featuredTurf: false,
      whatsappAlerts: false,
      monthlyEmailReport: false,
      individualArenaOffers: false,
    },
    maxArenas: 1,
    maxBookingsPerMonth: 500,
    trialDays: 14,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_pro_annual',
    name: 'Pro Annual (Best Value)',
    price: 9999,
    durationDays: 365,
    features: [
      'Unlimited Arenas & Grounds',
      'WhatsApp Booking Passes & Instant Player Receipts',
      '7-Day, 30-Day & All-Time Individual Arena Analytics',
      'Downloadable Business Reports (Today, Weekly, Monthly, All-Time)',
      'Zero Commission UPI Payouts',
      'Advanced Peak Hour Heatmaps',
      'Priority 24/7 Support',
      'Player Dues Ledger',
      'Pay at Venue Option',
      'Automated 7-Day Slot Generator',
    ],
    featuresConfig: {
      analytics: true,
      analytics7Days: true,
      analytics30Days: true,
      analyticsAllTime: true,
      individualArenaAnalytics: true,
      downloadReports: true,
      whatsappNotifications: true,
      offers: true,
      duesTracker: true,
      reviewsManager: true,
      allowPayAtVenue: true,
      autoSlotGenerator: true,
      customPricing: true,
      slotPriceEditing: true,
      multiCourtSetup: true,
      featuredTurf: true,
      whatsappAlerts: true,
      monthlyEmailReport: true,
      individualArenaOffers: true,
    },
    maxArenas: 10,
    maxBookingsPerMonth: 5000,
    trialDays: 14,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_PLAYER_SUBSCRIPTION_PLANS: PlayerSubscriptionPlan[] = [
  {
    id: 'player_plan_starter',
    name: 'TruFit Player Plus',
    price: 199,
    originalPrice: 399,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      '10% Flat Discount on all Turf Slot Bookings',
      'Priority Squad & Lobby Matchmaking',
      'Advanced Match Stats & Performance Radar',
      'Zero Cancellation Fee Guarantee on Early Cancels',
      'Standard Player Athlete Tag',
    ],
    entitlements: {
      bookingDiscountPercent: 10,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 0,
      advancedMatchStats: true,
      customSquadBadges: false,
      verifiedBadgeIncluded: false,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: false,
    popular: false,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_plan_pro_annual',
    name: 'TruFit Athlete Pro (Annual)',
    price: 1499,
    originalPrice: 2999,
    billingPeriod: 'ANNUAL',
    durationDays: 365,
    features: [
      '15% Flat Discount on all Turf Slot Bookings',
      'FREE Verified Player Gold Badge Included (₹499 value)',
      '1 Free Community Tournament Entry every Month',
      'Pro Squad Badge & Custom Animated Emblem',
      'Advanced Heatmaps & Radar Performance Metrics',
      'Zero Cancellation Fee Guarantee',
      'Unlimited Direct Messaging & Priority Support',
    ],
    entitlements: {
      bookingDiscountPercent: 15,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 1,
      advancedMatchStats: true,
      customSquadBadges: true,
      verifiedBadgeIncluded: true,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: true,
    popular: true,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'player_plan_elite',
    name: 'TruFit Champion Elite',
    price: 499,
    originalPrice: 999,
    billingPeriod: 'MONTHLY',
    durationDays: 30,
    features: [
      '20% Max Discount on Turf Slot Bookings',
      'Verified Player Gold Tick Included',
      '2 Free Tournament Entries every Month',
      'VIP Match Host Crown in Lobbies',
      'VIP Match Highlights Storage & Export',
      'Unlimited Direct Messaging to all Coaches & Athletes',
    ],
    entitlements: {
      bookingDiscountPercent: 20,
      priorityLobbyAccess: true,
      freeTournamentEntryMonthly: 2,
      advancedMatchStats: true,
      customSquadBadges: true,
      verifiedBadgeIncluded: true,
      zeroCancellationFee: true,
      unlimitedDMs: true,
    },
    badgeIncluded: true,
    popular: false,
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_VERIFICATION_BADGE_CONFIG: VerificationBadgeConfig = {
  id: 'verification_badge_config',
  enabled: true,
  playerBadgeEnabled: true,
  ownerBadgeEnabled: true,
  playerBadgePrice: 299,
  playerBadgeDurationDays: 365,
  ownerBadgePrice: 1999,
  ownerBadgeDurationDays: 365,
  ownerSaaSInclusion: {
    plan_pro_annual: true,
    plan_business_growth: true,
  },
  requirements: {
    minMatchesPlayed: 1,
    minSportsmanshipRating: 3.5,
    emailVerifiedRequired: true,
    phoneVerifiedRequired: false,
  },
  perks: {
    player: [
      'Verified Athlete Gold Tick next to your name across all leaderboards & matches',
      'Enhanced trust when joining competitive squads & high-stakes tournaments',
      'Early access to exclusive TruFit invite-only tournaments & open cups',
      'Featured in Player Spotlight & Top Athletes Directory',
      '365 Days of Verified Status with instant renewal',
    ],
    owner: [
      'Verified Venue Badge on Explore map, Turf listings, & Search results',
      'Higher ranking & visibility in nearby turf searches',
      'Official TruFit Verified Signboard seal for your physical arena',
      'Included FREE in Pro Annual and Growth SaaS Plans',
      'Increased booking conversion from discerning athletes',
    ],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Admin',
};

export async function getSubscriptionSystemConfig(): Promise<SubscriptionSystemConfig> {
  try {
    const docRef = doc(db, 'settings', 'subscriptionSystem');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SubscriptionSystemConfig;
    }
  } catch (err) {
    console.warn('Error fetching subscription system config:', err);
  }
  return {
    enabled: true,
    trialDurationDays: 30,
    playerSubscriptionsEnabled: true,
    ownerSubscriptionsEnabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Super Admin',
  };
}

export async function updateSubscriptionSystemConfig(
  payload: Partial<SubscriptionSystemConfig> | boolean,
  updatedBy: string = 'Super Admin'
): Promise<void> {
  const docRef = doc(db, 'settings', 'subscriptionSystem');
  const normalizedPayload: Partial<SubscriptionSystemConfig> = typeof payload === 'boolean' ? { enabled: payload } : payload;
  const current = await getSubscriptionSystemConfig();
  const fullPayload: SubscriptionSystemConfig = {
    ...current,
    ...normalizedPayload,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(docRef, sanitizeFirestoreData(fullPayload), { merge: true });
}

// ==========================================
// AUDIT LOGGING
// ==========================================

export async function logSubscriptionAudit(log: Omit<SubscriptionAuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const colRef = collection(db, 'subscriptionAuditLogs');
    const logDoc = doc(colRef);
    await setDoc(logDoc, sanitizeFirestoreData({
      ...log,
      id: logDoc.id,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Audit log notice (subscription):', err);
  }
}

export async function logVerificationAudit(log: Omit<VerificationAuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const colRef = collection(db, 'verificationAuditLogs');
    const logDoc = doc(colRef);
    await setDoc(logDoc, sanitizeFirestoreData({
      ...log,
      id: logDoc.id,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Audit log notice (verification):', err);
  }
}

export async function getSubscriptionAuditLogs(limitCount = 100): Promise<SubscriptionAuditLog[]> {
  try {
    const colRef = collection(db, 'subscriptionAuditLogs');
    const snap = await getDocs(colRef);
    return snap.docs
      .map((d) => d.data() as SubscriptionAuditLog)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  } catch (err) {
    console.warn('Error fetching subscription audit logs:', err);
    return [];
  }
}

export async function getVerificationAuditLogs(limitCount = 100): Promise<VerificationAuditLog[]> {
  try {
    const colRef = collection(db, 'verificationAuditLogs');
    const snap = await getDocs(colRef);
    return snap.docs
      .map((d) => d.data() as VerificationAuditLog)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  } catch (err) {
    console.warn('Error fetching verification audit logs:', err);
    return [];
  }
}

// ==========================================
// VERIFICATION BADGE CONFIG & GRANTS
// ==========================================

export async function getVerificationBadgeConfig(): Promise<VerificationBadgeConfig> {
  try {
    const docRef = doc(db, 'settings', 'verificationBadgeConfig');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as VerificationBadgeConfig;
    }
    // Bootstrap default
    await setDoc(docRef, sanitizeFirestoreData(DEFAULT_VERIFICATION_BADGE_CONFIG));
    return DEFAULT_VERIFICATION_BADGE_CONFIG;
  } catch (err) {
    console.warn('Error reading verification badge config:', err);
    return DEFAULT_VERIFICATION_BADGE_CONFIG;
  }
}

export async function saveVerificationBadgeConfig(
  config: Partial<VerificationBadgeConfig>,
  updatedBy: string = 'Super Admin'
): Promise<void> {
  const docRef = doc(db, 'settings', 'verificationBadgeConfig');
  const now = new Date().toISOString();
  const current = await getVerificationBadgeConfig();
  const payload: VerificationBadgeConfig = {
    ...current,
    ...config,
    id: 'verification_badge_config',
    updatedAt: now,
    updatedBy,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
}

export async function getPlayerVerificationBadge(userId: string): Promise<PlayerVerificationBadge | null> {
  try {
    const docRef = doc(db, 'playerVerificationBadges', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PlayerVerificationBadge;
      if (data.expiresAt && new Date(data.expiresAt) < new Date() && data.status === 'ACTIVE') {
        data.status = 'EXPIRED';
        data.isVerified = false;
      }
      return data;
    }
    return null;
  } catch (err) {
    console.warn('Error reading player verification badge:', err);
    return null;
  }
}

export async function activatePlayerVerificationBadge(params: {
  userId: string;
  userName: string;
  userEmail: string;
  durationDays?: number;
  badgeType?: 'GOLD' | 'BLUE' | 'PRO';
  amountPaid: number;
  paymentTxnId?: string;
  source: 'DIRECT_PURCHASE' | 'SAAS_PLAN_INCLUDED' | 'ADMIN_GRANT';
  grantedBy?: string;
}): Promise<PlayerVerificationBadge> {
  const docRef = doc(db, 'playerVerificationBadges', params.userId);
  const now = new Date();
  const duration = params.durationDays || 365;
  const expiry = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  const payload: PlayerVerificationBadge = {
    id: params.userId,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    isVerified: true,
    status: 'ACTIVE',
    badgeType: params.badgeType || 'GOLD',
    purchasedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
    amountPaid: params.amountPaid,
    paymentTxnId: params.paymentTxnId || `BADGE_TXN_${Date.now()}`,
    source: params.source,
    updatedAt: now.toISOString(),
  };

  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });

  // Also update User profile isVerified field
  try {
    const userDocRef = doc(db, 'users', params.userId);
    await updateDoc(userDocRef, {
      isVerified: true,
      verifiedBadgeExpiry: expiry.toISOString(),
      verifiedBadgeType: payload.badgeType,
      updatedAt: now.toISOString(),
    });
  } catch (e) {
    console.warn('User profile verified sync notice:', e);
  }

  // Log Audit
  await logVerificationAudit({
    type: 'PLAYER_VERIFICATION',
    targetId: params.userId,
    targetName: params.userName,
    action: params.source === 'ADMIN_GRANT' ? 'ADMIN_GRANTED' : 'ACTIVATED',
    amount: params.amountPaid,
    paymentTxnId: payload.paymentTxnId,
    performedBy: params.grantedBy || params.userName,
    notes: `Activated ${payload.badgeType} badge via ${params.source} for ${duration} days`,
  });

  return payload;
}

export async function revokePlayerVerificationBadge(
  userId: string,
  adminName: string = 'Super Admin',
  reason?: string
): Promise<void> {
  const docRef = doc(db, 'playerVerificationBadges', userId);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    isVerified: false,
    status: 'REVOKED',
    updatedAt: now,
  });

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isVerified: false,
      updatedAt: now,
    });
  } catch (e) {
    console.warn('User profile revoked sync notice:', e);
  }

  await logVerificationAudit({
    type: 'PLAYER_VERIFICATION',
    targetId: userId,
    targetName: userId,
    action: 'REVOKED',
    performedBy: adminName,
    notes: reason || 'Revoked by administrator',
  });
}

export async function getAllPlayerVerificationBadges(): Promise<PlayerVerificationBadge[]> {
  try {
    const snap = await getDocs(collection(db, 'playerVerificationBadges'));
    return snap.docs.map((d) => d.data() as PlayerVerificationBadge);
  } catch (err) {
    console.warn('Error reading all player verification badges:', err);
    return [];
  }
}

// ==========================================
// PLAYER SAAS SUBSCRIPTION PLANS & USER SUBSCRIPTIONS
// ==========================================

export async function getPlayerSubscriptionPlans(includeArchived = false): Promise<PlayerSubscriptionPlan[]> {
  try {
    const colRef = collection(db, 'playerSubscriptionPlans');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const p of DEFAULT_PLAYER_SUBSCRIPTION_PLANS) {
        await setDoc(doc(db, 'playerSubscriptionPlans', p.id), sanitizeFirestoreData(p));
      }
      return DEFAULT_PLAYER_SUBSCRIPTION_PLANS;
    }
    const plans: PlayerSubscriptionPlan[] = [];
    snap.forEach((d) => {
      const data = d.data() as PlayerSubscriptionPlan;
      if (includeArchived || !data.isArchived) {
        plans.push(data);
      }
    });
    return plans.sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn('Error reading player subscription plans:', err);
    return DEFAULT_PLAYER_SUBSCRIPTION_PLANS;
  }
}

export async function savePlayerSubscriptionPlan(plan: PlayerSubscriptionPlan): Promise<void> {
  const docRef = doc(db, 'playerSubscriptionPlans', plan.id);
  const now = new Date().toISOString();
  const payload = {
    ...plan,
    updatedAt: now,
    createdAt: plan.createdAt || now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
}

export async function archivePlayerSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'playerSubscriptionPlans', planId);
  await updateDoc(docRef, { isArchived: true, isActive: false, updatedAt: new Date().toISOString() });
}

export async function deletePlayerSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'playerSubscriptionPlans', planId);
  await deleteDoc(docRef);
}

export async function getPlayerSubscriptionStatus(userId: string): Promise<PlayerSubscriptionStatus | null> {
  try {
    const docRef = doc(db, 'playerSubscriptions', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PlayerSubscriptionStatus;
      if (data.expiryDate && new Date(data.expiryDate) < new Date() && data.status === 'ACTIVE') {
        data.status = 'EXPIRED';
      }
      return data;
    }
    return null;
  } catch (err) {
    console.warn('Error reading player subscription status:', err);
    return null;
  }
}

export async function activatePlayerSubscription(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  durationDays: number;
  amountPaid: number;
  entitlements: PlayerPlanEntitlements;
  badgeIncluded?: boolean;
  paymentTxnId?: string;
  activatedBy?: string;
}): Promise<PlayerSubscriptionStatus> {
  const statusRef = doc(db, 'playerSubscriptions', params.userId);
  const now = new Date();
  const expiry = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);

  const statusPayload: PlayerSubscriptionStatus = {
    userId: params.userId,
    userEmail: params.userEmail || '',
    userName: params.userName || 'TruFit Athlete',
    planId: params.planId,
    planName: params.planName,
    status: 'ACTIVE',
    startDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    amountPaid: params.amountPaid,
    paymentTxnId: params.paymentTxnId || `PL_SUB_${Date.now()}`,
    entitlements: params.entitlements,
    updatedAt: now.toISOString(),
  };

  await setDoc(statusRef, sanitizeFirestoreData(statusPayload), { merge: true });

  // If badge is included in this plan, activate player verification badge automatically
  if (params.badgeIncluded || params.entitlements.verifiedBadgeIncluded) {
    await activatePlayerVerificationBadge({
      userId: params.userId,
      userName: params.userName || 'TruFit Athlete',
      userEmail: params.userEmail || '',
      durationDays: params.durationDays,
      badgeType: 'GOLD',
      amountPaid: 0,
      paymentTxnId: statusPayload.paymentTxnId,
      source: 'SAAS_PLAN_INCLUDED',
      grantedBy: 'Player SaaS Plan',
    });
  }

  // Record Transaction
  try {
    const txnRef = doc(collection(db, 'playerSubscriptionTransactions'));
    await setDoc(txnRef, sanitizeFirestoreData({
      id: txnRef.id,
      userId: params.userId,
      userEmail: params.userEmail || '',
      userName: params.userName || '',
      planId: params.planId,
      planName: params.planName,
      amountPaid: params.amountPaid,
      paymentTxnId: statusPayload.paymentTxnId,
      createdAt: now.toISOString(),
    }));
  } catch (e) {
    console.warn('Player sub transaction log notice:', e);
  }

  // Audit log
  await logSubscriptionAudit({
    type: 'PLAYER_SUBSCRIPTION',
    targetId: params.userId,
    targetName: params.userName || 'Athlete',
    targetEmail: params.userEmail,
    action: 'ACTIVATED',
    planId: params.planId,
    planName: params.planName,
    amount: params.amountPaid,
    paymentTxnId: statusPayload.paymentTxnId,
    performedBy: params.activatedBy || params.userName || 'User Checkout',
  });

  return statusPayload;
}

export async function getAllPlayerSubscriptions(): Promise<PlayerSubscriptionStatus[]> {
  try {
    const snap = await getDocs(collection(db, 'playerSubscriptions'));
    return snap.docs.map((d) => d.data() as PlayerSubscriptionStatus);
  } catch (err) {
    console.warn('Failed to fetch player subscriptions:', err);
    return [];
  }
}

export async function getAllPlayerSubscriptionTransactions(): Promise<PlayerSubscriptionTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'playerSubscriptionTransactions'));
    return snap.docs.map((d) => d.data() as PlayerSubscriptionTransaction);
  } catch (err) {
    console.warn('Failed to fetch player subscription transactions:', err);
    return [];
  }
}

// ==========================================
// ENHANCED OWNER SUBSCRIPTION & 30-DAY TRIAL LOGIC
// ==========================================

export async function getOwnerSubscriptionStatus(ownerId: string): Promise<OwnerSubscriptionStatus> {
  try {
    const docRef = doc(db, 'ownerSubscriptions', ownerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as OwnerSubscriptionStatus;
      const now = new Date();
      
      // Handle TRIAL and TRIAL_ACTIVE
      if (data.status === 'TRIAL' || data.status === 'TRIAL_ACTIVE') {
        const trialEndDate = new Date(data.trialEndsAt || data.expiryDate);
        if (trialEndDate < now) {
          data.status = 'TRIAL_EXPIRED';
          data.isTrialActive = false;
          data.writeAccessBlocked = true;
        } else {
          data.status = 'TRIAL_ACTIVE';
          data.isTrialActive = true;
          data.writeAccessBlocked = false;
        }
      } else if (data.status === 'ACTIVE') {
        const expiry = new Date(data.expiryDate);
        if (expiry < now) {
          data.status = 'EXPIRED';
          data.writeAccessBlocked = true;
        } else {
          data.writeAccessBlocked = false;
        }
      } else if (data.status === 'EXPIRED' || data.status === 'TRIAL_EXPIRED' || data.status === 'CANCELLED') {
        data.writeAccessBlocked = true;
      }
      
      return data;
    } else {
      // 30-Day Free Trial default for every new owner
      const now = new Date();
      const trialDurationDays = 30;
      const trialEnd = new Date(now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);
      const defaultStatus: OwnerSubscriptionStatus = {
        ownerId,
        planId: 'plan_pro_annual',
        planName: 'Pro Annual (30-Day Free Trial)',
        status: 'TRIAL_ACTIVE',
        startDate: now.toISOString(),
        expiryDate: trialEnd.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        isTrialActive: true,
        trialDurationDays,
        writeAccessBlocked: false,
        updatedAt: now.toISOString(),
      };
      await setDoc(docRef, sanitizeFirestoreData(defaultStatus));

      await logSubscriptionAudit({
        type: 'OWNER_SUBSCRIPTION',
        targetId: ownerId,
        targetName: 'New Turf Venue',
        action: 'TRIAL_STARTED',
        planId: 'plan_pro_annual',
        planName: 'Pro Annual (30-Day Free Trial)',
        performedBy: 'System Bootstrap',
        details: { trialDurationDays: 30, trialEndsAt: trialEnd.toISOString() },
      });

      return defaultStatus;
    }
  } catch (err) {
    console.warn('Error fetching owner subscription status:', err);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      ownerId,
      planId: 'plan_pro_annual',
      planName: 'Pro Annual (30-Day Free Trial)',
      status: 'TRIAL_ACTIVE',
      startDate: now.toISOString(),
      expiryDate: trialEnd.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      isTrialActive: true,
      trialDurationDays: 30,
      writeAccessBlocked: false,
      updatedAt: now.toISOString(),
    };
  }
}

export async function checkOwnerWriteAccess(ownerId: string): Promise<{
  canWrite: boolean;
  status: OwnerSubscriptionState;
  trialDaysRemaining: number;
  reason?: string;
}> {
  try {
    const sysConfig = await getSubscriptionSystemConfig();
    if (!sysConfig.enabled) {
      return { canWrite: true, status: 'ACTIVE', trialDaysRemaining: 999 };
    }

    const sub = await getOwnerSubscriptionStatus(ownerId);
    const now = new Date();
    const expiry = new Date(sub.expiryDate || sub.trialEndsAt);
    const msRemaining = expiry.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    if (sub.status === 'TRIAL_ACTIVE' || sub.status === 'ACTIVE') {
      return {
        canWrite: true,
        status: sub.status,
        trialDaysRemaining: sub.status === 'TRIAL_ACTIVE' ? daysRemaining : 0,
      };
    }

    return {
      canWrite: false,
      status: sub.status,
      trialDaysRemaining: 0,
      reason:
        sub.status === 'TRIAL_EXPIRED'
          ? 'Your 30-Day Free Trial has expired. Upgrade your SaaS subscription to resume creating or modifying venues, arenas, and slots.'
          : 'Your TruFit Owner SaaS subscription has expired. Please renew to regain write permissions.',
    };
  } catch (err) {
    console.warn('Error checking owner write access:', err);
    return { canWrite: true, status: 'TRIAL_ACTIVE', trialDaysRemaining: 30 };
  }
}

export async function getOwnerSubscriptionPlans(includeArchived = false): Promise<OwnerSubscriptionPlan[]> {
  try {
    const colRef = collection(db, 'subscriptionPlans');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const p of DEFAULT_SUBSCRIPTION_PLANS) {
        await setDoc(doc(db, 'subscriptionPlans', p.id), sanitizeFirestoreData(p));
      }
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
    const plans: OwnerSubscriptionPlan[] = [];
    snap.forEach((d) => {
      const data = d.data() as OwnerSubscriptionPlan;
      // Strictly exclude any coach or academy plans from turf owner subscriptions
      const isCoachOrAcademy =
        (data as any).role === 'COACH' ||
        (data as any).role === 'ACADEMY' ||
        data.id?.toLowerCase().includes('coach') ||
        data.id?.toLowerCase().includes('academy') ||
        data.name?.toLowerCase().includes('coach') ||
        data.name?.toLowerCase().includes('academy');

      if (!isCoachOrAcademy && (includeArchived || !data.isArchived)) {
        plans.push(data);
      }
    });
    return plans.sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn('Error getting subscription plans:', err);
    return DEFAULT_SUBSCRIPTION_PLANS;
  }
}

export async function saveOwnerSubscriptionPlan(plan: OwnerSubscriptionPlan): Promise<void> {
  const docRef = doc(db, 'subscriptionPlans', plan.id);
  const now = new Date().toISOString();
  const payload = {
    ...plan,
    updatedAt: now,
    createdAt: plan.createdAt || now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
}

export async function archiveOwnerSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'subscriptionPlans', planId);
  await updateDoc(docRef, { isArchived: true, isActive: false, updatedAt: new Date().toISOString() });
}

export async function getEffectiveOwnerSubscription(ownerId: string): Promise<OwnerSubscriptionStatus> {
  return getOwnerSubscriptionStatus(ownerId);
}

export async function subscribeOwnerToPlan(params: {
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  planId: string;
  planName: string;
  durationDays: number;
  amountPaid: number;
  paymentTxnId?: string;
}): Promise<void> {
  return activateOwnerSubscription(params);
}

export async function updateOwnerSubscription(
  ownerId: string,
  planId: string,
  planName: string,
  durationDays: number
): Promise<OwnerSubscriptionStatus> {
  const docRef = doc(db, 'ownerSubscriptions', ownerId);
  const now = new Date();
  const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const statusPayload: OwnerSubscriptionStatus = {
    ownerId,
    planId,
    planName,
    status: 'ACTIVE',
    startDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    trialEndsAt: now.toISOString(),
    isTrialActive: false,
    updatedAt: now.toISOString(),
  };
  await setDoc(docRef, sanitizeFirestoreData(statusPayload), { merge: true });
  return statusPayload;
}

export async function activateOwnerSubscription(params: {
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  planId: string;
  planName: string;
  durationDays: number;
  amountPaid: number;
  paymentTxnId?: string;
}): Promise<void> {
  const statusRef = doc(db, 'ownerSubscriptions', params.ownerId);
  const now = new Date();
  const expiry = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);

  const statusPayload: OwnerSubscriptionStatus = {
    ownerId: params.ownerId,
    planId: params.planId,
    planName: params.planName,
    status: 'ACTIVE',
    startDate: now.toISOString(),
    expiryDate: expiry.toISOString(),
    trialEndsAt: now.toISOString(),
    isTrialActive: false,
    updatedAt: now.toISOString(),
  };

  await setDoc(statusRef, sanitizeFirestoreData(statusPayload), { merge: true });

  // Log subscription transaction in Firestore with non-blocking error boundary
  try {
    const txnRef = doc(collection(db, 'subscriptionTransactions'));
    await setDoc(txnRef, sanitizeFirestoreData({
      id: txnRef.id,
      ownerId: params.ownerId,
      ownerEmail: params.ownerEmail || '',
      ownerName: params.ownerName || '',
      planId: params.planId,
      planName: params.planName,
      amountPaid: params.amountPaid,
      paymentTxnId: params.paymentTxnId || `SUB_TXN_${Date.now()}`,
      createdAt: now.toISOString(),
    }));
  } catch (err) {
    console.warn('Subscription status updated, but transaction log notice:', err);
  }
}

export async function getAllOwnerSubscriptions(): Promise<OwnerSubscriptionStatus[]> {
  try {
    const snap = await getDocs(collection(db, 'ownerSubscriptions'));
    return snap.docs.map(d => d.data() as OwnerSubscriptionStatus);
  } catch (err) {
    console.warn('Failed to fetch owner subscriptions:', err);
    return [];
  }
}

export async function getAllSubscriptionTransactions(): Promise<OwnerSubscriptionTransaction[]> {
  try {
    const [snap, allSubs, allPlans] = await Promise.all([
      getDocs(collection(db, 'subscriptionTransactions')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'ownerSubscriptions')).catch(() => ({ docs: [] } as any)),
      getOwnerSubscriptionPlans(true).catch(() => DEFAULT_SUBSCRIPTION_PLANS),
    ]);

    const txns = snap.docs.map((d: any) => d.data() as any);
    const existingTxns: OwnerSubscriptionTransaction[] = txns
      .filter((t: any) => {
        const isCoachOrAcademy =
          t.planId?.toLowerCase().includes('coach') ||
          t.planId?.toLowerCase().includes('academy') ||
          t.planName?.toLowerCase().includes('coach') ||
          t.planName?.toLowerCase().includes('academy') ||
          t.type === 'COACH_SUBSCRIPTION' ||
          t.type === 'PLAYER_SUBSCRIPTION' ||
          t.planId?.toLowerCase().includes('player');
        return !isCoachOrAcademy;
      })
      .map((t: any) => ({
        id: t.id || t.paymentTxnId || `txn_${Date.now()}`,
        ownerId: t.ownerId || '',
        ownerEmail: t.ownerEmail || '',
        ownerName: t.ownerName || '',
        planId: t.planId || 'starter_arena',
        planName: t.planName || 'Turf Owner SaaS',
        amountPaid: Number(t.amountPaid || 0),
        paymentTxnId: t.paymentTxnId || t.id,
        createdAt: t.createdAt || new Date().toISOString(),
      }));

    // If an owner in ownerSubscriptions has status 'ACTIVE' (paid) but no transaction doc, synthesize transaction
    const seenOwnerIds = new Set(existingTxns.map((t) => t.ownerId).filter(Boolean));
    const plansMap = new Map<string, OwnerSubscriptionPlan>();
    allPlans.forEach((p) => plansMap.set(p.id, p));

    allSubs.docs.forEach((d: any) => {
      const sub = d.data() as OwnerSubscriptionStatus;
      if (sub && sub.status === 'ACTIVE' && sub.ownerId && !seenOwnerIds.has(sub.ownerId)) {
        const plan = plansMap.get(sub.planId) || DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
        const amt = Number((sub as any).amountPaid || plan?.price || 1999);
        existingTxns.push({
          id: `TXN_OWNER_${sub.ownerId}`,
          ownerId: sub.ownerId,
          ownerEmail: (sub as any).ownerEmail || '',
          ownerName: (sub as any).ownerName || (sub as any).businessName || 'Turf Owner',
          planId: sub.planId || 'pro_arena',
          planName: sub.planName || plan?.name || 'Pro Arena SaaS',
          amountPaid: amt > 0 ? amt : 1999,
          paymentTxnId: `OWNER_SUB_${sub.ownerId}`,
          createdAt: sub.startDate || sub.updatedAt || new Date().toISOString(),
        });
        seenOwnerIds.add(sub.ownerId);
      }
    });

    return existingTxns.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('Failed to fetch subscription transactions:', err);
    return [];
  }
}

export async function getEffectiveOwnerPlanFeatures(ownerId: string): Promise<PlanFeatureConfig> {
  try {
    const sysConfig = await getSubscriptionSystemConfig();
    // If subscription system is disabled globally by Super Admin, all features are fully unlocked!
    if (!sysConfig.enabled) {
      return { ...DEFAULT_PLAN_FEATURES };
    }

    const subStatus = await getOwnerSubscriptionStatus(ownerId);
    if (subStatus.status === 'EXPIRED') {
      return {
        analytics: true,
        analytics7Days: false,
        analytics30Days: false,
        analyticsAllTime: false,
        individualArenaAnalytics: false,
        downloadReports: false,
        whatsappNotifications: false,
        offers: false,
        duesTracker: false,
        reviewsManager: false,
        allowPayAtVenue: false,
        autoSlotGenerator: false,
        customPricing: false,
        slotPriceEditing: false,
        multiCourtSetup: false,
        featuredTurf: false,
        whatsappAlerts: false,
        monthlyEmailReport: false,
      };
    }

    const plans = await getOwnerSubscriptionPlans(true);
    const ownerPlan = plans.find((p) => p.id === subStatus.planId);

    const baseFeatures =
      ownerPlan && ownerPlan.featuresConfig
        ? {
            ...DEFAULT_PLAN_FEATURES,
            ...ownerPlan.featuresConfig,
          }
        : { ...DEFAULT_PLAN_FEATURES };

    // Apply any custom per-owner overrides set by Admin from the Web portal
    if (subStatus.customFeatures) {
      return {
        ...baseFeatures,
        ...subStatus.customFeatures,
      };
    }

    return baseFeatures;
  } catch (err) {
    console.warn('Error evaluating effective owner plan features:', err);
  }
  return { ...DEFAULT_PLAN_FEATURES };
}

export async function setOwnerSubscriptionOverride(params: {
  ownerId: string;
  planId: string;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  expiryDate: string;
  customFeatures?: Partial<PlanFeatureConfig>;
  maxArenasOverride?: number;
  notes?: string;
}): Promise<OwnerSubscriptionStatus> {
  const docRef = doc(db, 'ownerSubscriptions', params.ownerId);
  const now = new Date().toISOString();
  const current = await getOwnerSubscriptionStatus(params.ownerId);
  const updatedStatus: OwnerSubscriptionStatus = {
    ...current,
    ownerId: params.ownerId,
    planId: params.planId,
    planName: params.planName,
    status: params.status,
    expiryDate: params.expiryDate,
    trialEndsAt: params.status === 'TRIAL' ? params.expiryDate : current.trialEndsAt,
    isTrialActive: params.status === 'TRIAL',
    customFeatures: params.customFeatures,
    maxArenasOverride: params.maxArenasOverride,
    notes: params.notes,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(updatedStatus), { merge: true });
  return updatedStatus;
}

export async function getAllOwnerProfilesWithSubscriptions(): Promise<
  Array<{
    ownerId: string;
    displayName: string;
    businessName: string;
    email: string;
    phone: string;
    subscription: OwnerSubscriptionStatus;
  }>
> {
  try {
    const [allSubs, allTurfs, allTxns] = await Promise.all([
      getAllOwnerSubscriptions().catch(() => []),
      getAllTurfsForAdmin().catch(() => []),
      getAllSubscriptionTransactions().catch(() => []),
    ]);

    const subMap = new Map<string, OwnerSubscriptionStatus>();
    allSubs.forEach((s) => {
      if (s.ownerId) subMap.set(s.ownerId, s);
    });

    // Map of turfs by ownerId
    const turfOwnerMap = new Map<string, Turf[]>();
    allTurfs.forEach((t) => {
      if (t.ownerId) {
        const list = turfOwnerMap.get(t.ownerId) || [];
        list.push(t);
        turfOwnerMap.set(t.ownerId, list);
      }
    });

    // Map of txns by ownerId
    const txnOwnerMap = new Map<string, OwnerSubscriptionTransaction[]>();
    allTxns.forEach((tx) => {
      if (tx.ownerId) {
        const list = txnOwnerMap.get(tx.ownerId) || [];
        list.push(tx);
        txnOwnerMap.set(tx.ownerId, list);
      }
    });

    // Fetch users collection safely
    const userMap = new Map<string, any>();
    try {
      const usersCol = collection(db, 'users');
      const userSnap = await getDocs(usersCol);
      userSnap.docs.forEach((d) => {
        userMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch (e) {
      console.warn('Admin Analytics: Notice reading all users:', e);
    }

    // Collect all unique ownerIds
    const ownerIdSet = new Set<string>();

    // 1. From all subscriptions in ownerSubscriptions
    allSubs.forEach((s) => {
      if (s.ownerId) ownerIdSet.add(s.ownerId);
    });

    // 2. From all registered turfs
    allTurfs.forEach((t) => {
      if (t.ownerId) ownerIdSet.add(t.ownerId);
    });

    // 3. From all subscription transactions
    allTxns.forEach((tx) => {
      if (tx.ownerId) ownerIdSet.add(tx.ownerId);
    });

    // 4. From users with role OWNER / TURF_OWNER or having businessName
    userMap.forEach((u, uid) => {
      const r = (u.role || '').toUpperCase();
      if (r === 'OWNER' || r === 'TURF_OWNER' || u.businessName) {
        ownerIdSet.add(uid);
      }
    });

    const results = [];
    for (const ownerId of ownerIdSet) {
      let u = userMap.get(ownerId);
      if (!u) {
        // Fallback: try fetching the specific user doc
        try {
          const singleSnap = await getDoc(doc(db, 'users', ownerId));
          if (singleSnap.exists()) {
            u = { id: singleSnap.id, ...singleSnap.data() };
            userMap.set(ownerId, u);
          }
        } catch {
          // ignore
        }
      }

      const turfs = turfOwnerMap.get(ownerId) || [];
      const txns = txnOwnerMap.get(ownerId) || [];

      let sub = subMap.get(ownerId);
      if (!sub) {
        if (txns.length > 0) {
          const latestTx = txns[txns.length - 1];
          sub = {
            ownerId,
            planId: latestTx.planId || 'plan_pro_annual',
            planName: latestTx.planName || 'Pro Annual',
            status: 'ACTIVE',
            startDate: latestTx.createdAt || new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            trialEndsAt: '',
            isTrialActive: false,
            updatedAt: latestTx.createdAt || new Date().toISOString(),
          };
        } else {
          sub = await getOwnerSubscriptionStatus(ownerId);
        }
      }

      const primaryTurf = turfs[0];
      const primaryTx = txns[0];
      const displayName =
        u?.displayName ||
        primaryTx?.ownerName ||
        (primaryTurf ? `${primaryTurf.name} Owner` : 'Turf Owner');
      const businessName =
        u?.businessName ||
        (primaryTurf ? primaryTurf.name : primaryTx?.ownerName ? `${primaryTx.ownerName}'s Arena` : 'Arena Complex');
      const email = u?.email || primaryTx?.ownerEmail || '';
      const phone = u?.phoneNumber || u?.phone || (primaryTurf ? primaryTurf.phoneNumber : '');

      results.push({
        ownerId,
        displayName,
        businessName,
        email,
        phone,
        subscription: sub,
      });
    }

    console.log('Admin Analytics: Total consolidated owner profiles found:', results.length);
    return results;
  } catch (err) {
    console.warn('Error getting owner profiles with subscriptions:', err);
    return [];
  }
}

// ==================== PROMOTIONAL BANNERS ====================

export const DEFAULT_PROMOTIONAL_BANNERS: PromotionalBanner[] = [];

export async function getPromotionalBanners(includeInactive = false): Promise<PromotionalBanner[]> {
  try {
    const colRef = collection(db, 'promotionalBanners');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const b of DEFAULT_PROMOTIONAL_BANNERS) {
        await setDoc(doc(db, 'promotionalBanners', b.id), sanitizeFirestoreData(b));
      }
      return DEFAULT_PROMOTIONAL_BANNERS;
    }
    const banners: PromotionalBanner[] = [];
    snap.forEach((d) => {
      const data = d.data() as PromotionalBanner;
      if (includeInactive || data.isActive) {
        banners.push(data);
      }
    });
    return banners.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch (err) {
    console.warn('Error fetching promotional banners:', err);
    return DEFAULT_PROMOTIONAL_BANNERS;
  }
}

export async function savePromotionalBanner(banner: PromotionalBanner): Promise<void> {
  const docRef = doc(db, 'promotionalBanners', banner.id);
  const now = new Date().toISOString();
  const payload = {
    ...banner,
    updatedAt: now,
    createdAt: banner.createdAt || now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
}

export async function deletePromotionalBanner(bannerId: string): Promise<void> {
  const docRef = doc(db, 'promotionalBanners', bannerId);
  await deleteDoc(docRef);
}

export function listenPromotionalBanners(includeInactive = false, callback: (banners: PromotionalBanner[]) => void) {
  const colRef = collection(db, 'promotionalBanners');
  return onSnapshot(colRef, (snap) => {
    const banners: PromotionalBanner[] = [];
    snap.forEach((d) => {
      const data = d.data() as PromotionalBanner;
      if (includeInactive || data.isActive) {
        banners.push(data);
      }
    });
    callback(banners.sort((a, b) => a.displayOrder - b.displayOrder));
  }, (err) => {
    console.warn('Error listening to promotional banners:', err);
    callback([]);
  });
}

export async function getActivePromotionalBanners(audience: BannerAudience): Promise<PromotionalBanner[]> {
  try {
    const all = await getPromotionalBanners(false);
    const todayStr = new Date().toISOString().split('T')[0];
    return all.filter((b) => {
      if (!b.isActive) return false;
      if (b.targetAudience !== 'ALL' && b.targetAudience !== audience) return false;
      if (b.startDate && todayStr < b.startDate) return false;
      if (b.expiryDate && todayStr > b.expiryDate) return false;
      return true;
    });
  } catch (err) {
    console.warn('Error filtering active banners:', err);
    return [];
  }
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const docRef = doc(db, 'config', 'main_pricing');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const defaultPricing: PricingConfig = {
      id: 'main_pricing',
      cancellationFeeFixed: 50,
      cancellationFeeEnabled: true,
      convenienceFee: 20,
      convenienceFeeEnabled: true,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, defaultPricing);
    return defaultPricing;
  }
  return snap.data() as PricingConfig;
}

export async function updatePricingConfig(pricing: Partial<PricingConfig>): Promise<void> {
  const docRef = doc(db, 'config', 'main_pricing');
  await updateDoc(docRef, { ...pricing, updatedAt: new Date().toISOString() });
}

// ==================== APP CONFIG & FEATURE FLAGS ====================

export async function getAppConfig(): Promise<AppConfig> {
  const docRef = doc(db, 'config', 'main_config');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const defaultCfg: AppConfig = {
      id: 'main_config',
      customerSupportEmail: 'support@trufit.app',
      customerSupportPhone: '+919999999999',
      bookingCancellationWindowMinutes: 60,
      maintenanceMode: false,
      maintenanceMessage: 'We are currently under maintenance.',
      allowPlayerLoginOnWebsite: false,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, defaultCfg);
    return defaultCfg;
  }
  const data = snap.data() as AppConfig;
  if (data.allowPlayerLoginOnWebsite === undefined) {
    data.allowPlayerLoginOnWebsite = false;
  }
  return data;
}

export async function updateAppConfig(config: Partial<AppConfig>): Promise<void> {
  const docRef = doc(db, 'config', 'main_config');
  await updateDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const colRef = collection(db, 'featureFlags');
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => d.data() as FeatureFlag);
}

export async function updateFeatureFlag(id: string, enabled: boolean): Promise<void> {
  const docRef = doc(db, 'featureFlags', id);
  await updateDoc(docRef, { enabled, updatedAt: new Date().toISOString() });
}

// ==================== OWNER SETTLEMENTS & PAYOUTS (MODEL 1) ====================

export interface OwnerSettlementOverview {
  ownerId: string;
  ownerName: string;
  businessName?: string;
  turfNames: string[];
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  subscribedPlanName?: string;
  subscriptionStatus?: string;
  totalPaidBookings: number;
  grossAmountCollected: number;
  onlineAmountCollected: number;
  cashAmountCollected: number;
  platformConvenienceFees: number;
  netOwnerShareTotal: number;
  totalSettledAmount: number;
  pendingPayoutAmount: number;
  unsettledBookingsCount: number;
  pendingWithdrawalRequests?: OwnerPayoutRequest[];
  requestedWithdrawalTotal?: number;
  allWithdrawalRequests?: OwnerPayoutRequest[];
}

export async function getOwnerSettlementOverviews(): Promise<OwnerSettlementOverview[]> {
  const bookingsSnap = await getDocs(collection(db, 'bookings'));
  const allBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  
  const turfsSnap = await getDocs(collection(db, 'turfs'));
  const allTurfs = turfsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));

  // Fetch all payout requests
  let allPayoutRequests: OwnerPayoutRequest[] = [];
  try {
    const payoutReqsSnap = await getDocs(collection(db, 'ownerPayoutRequests'));
    allPayoutRequests = payoutReqsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRequest));
  } catch (err) {
    console.warn('Error fetching owner payout requests for overview:', err);
  }

  // Group by owner
  const ownerMap: Record<string, OwnerSettlementOverview> = {};

  // First seed all owners who have turfs
  for (const t of allTurfs) {
    if (!t.ownerId) continue;
    if (!ownerMap[t.ownerId]) {
      const ownerTurfs = allTurfs.filter((turf) => turf.ownerId === t.ownerId);
      ownerMap[t.ownerId] = {
        ownerId: t.ownerId,
        ownerName: t.name || 'Turf Owner',
        businessName: ownerTurfs[0]?.name || t.name,
        turfNames: Array.from(new Set(ownerTurfs.map((turf) => turf.name))),
        totalPaidBookings: 0,
        grossAmountCollected: 0,
        onlineAmountCollected: 0,
        cashAmountCollected: 0,
        platformConvenienceFees: 0,
        netOwnerShareTotal: 0,
        totalSettledAmount: 0,
        pendingPayoutAmount: 0,
        unsettledBookingsCount: 0,
        pendingWithdrawalRequests: [],
        requestedWithdrawalTotal: 0,
        allWithdrawalRequests: [],
      };
    }
  }

  for (const b of allBookings) {
    if (b.paymentStatus !== 'PAID' && b.paymentStatus !== 'PARTIAL') continue;
    const ownerId = b.ownerId;
    if (!ownerId) continue;

    if (!ownerMap[ownerId]) {
      const ownerTurfs = allTurfs.filter((t) => t.ownerId === ownerId);
      ownerMap[ownerId] = {
        ownerId,
        ownerName: b.turfName || 'Turf Owner',
        businessName: ownerTurfs[0]?.name || b.turfName,
        turfNames: Array.from(new Set(ownerTurfs.map((t) => t.name))),
        totalPaidBookings: 0,
        grossAmountCollected: 0,
        onlineAmountCollected: 0,
        cashAmountCollected: 0,
        platformConvenienceFees: 0,
        netOwnerShareTotal: 0,
        totalSettledAmount: 0,
        pendingPayoutAmount: 0,
        unsettledBookingsCount: 0,
        pendingWithdrawalRequests: [],
        requestedWithdrawalTotal: 0,
        allWithdrawalRequests: [],
      };
    }

    const paid = b.amountPaid || b.totalAmount || 0;
    const cFee = b.convenienceFee || 0;
    const oShare = b.ownerShare !== undefined ? b.ownerShare : Math.max(0, paid - cFee);

    const methodStr = (b.paymentMethod as string) || '';
    const isCash =
      methodStr === 'CASH' ||
      methodStr === 'PAY_AT_VENUE' ||
      methodStr === 'PAY_LATER_AT_TURF' ||
      methodStr === 'CASH_OR_COUNTER_UPI';

    ownerMap[ownerId].totalPaidBookings += 1;
    ownerMap[ownerId].grossAmountCollected += paid;
    if (isCash) {
      ownerMap[ownerId].cashAmountCollected += paid;
    } else {
      ownerMap[ownerId].onlineAmountCollected += paid;
    }
    ownerMap[ownerId].platformConvenienceFees += cFee;
    ownerMap[ownerId].netOwnerShareTotal += oShare;

    if (b.settlementStatus === 'SETTLED') {
      ownerMap[ownerId].totalSettledAmount += oShare;
    } else {
      if (!isCash) {
        ownerMap[ownerId].pendingPayoutAmount += oShare;
      }
      ownerMap[ownerId].unsettledBookingsCount += 1;
    }
  }

  // Ensure pendingPayoutAmount does not exceed available online balance (onlineAmountCollected - totalSettledAmount)
  for (const item of Object.values(ownerMap)) {
    const maxPossiblePending = Math.max(0, item.onlineAmountCollected - item.totalSettledAmount);
    if (item.pendingPayoutAmount > maxPossiblePending) {
      item.pendingPayoutAmount = maxPossiblePending;
    }
  }

  // Also ensure owners who only have payout requests exist in ownerMap
  for (const req of allPayoutRequests) {
    if (req.ownerId && !ownerMap[req.ownerId]) {
      const ownerTurfs = allTurfs.filter((t) => t.ownerId === req.ownerId);
      ownerMap[req.ownerId] = {
        ownerId: req.ownerId,
        ownerName: req.ownerName || req.turfName || 'Turf Owner',
        businessName: ownerTurfs[0]?.name || req.turfName || 'Turf Arena',
        turfNames: Array.from(new Set(ownerTurfs.map((t) => t.name))),
        totalPaidBookings: 0,
        grossAmountCollected: 0,
        onlineAmountCollected: 0,
        cashAmountCollected: 0,
        platformConvenienceFees: 0,
        netOwnerShareTotal: 0,
        totalSettledAmount: 0,
        pendingPayoutAmount: 0,
        unsettledBookingsCount: 0,
        pendingWithdrawalRequests: [],
        requestedWithdrawalTotal: 0,
        allWithdrawalRequests: [],
      };
    }
  }

  // Attach withdrawal requests to each owner
  for (const [ownerId, overview] of Object.entries(ownerMap)) {
    const ownerReqs = allPayoutRequests.filter((r) => r.ownerId === ownerId);
    overview.allWithdrawalRequests = ownerReqs.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
    overview.pendingWithdrawalRequests = ownerReqs.filter((r) => r.status === 'REQUESTED');
    overview.requestedWithdrawalTotal = overview.pendingWithdrawalRequests.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );
  }

  // Enrich with owner profiles for bank and UPI details & active subscription plan
  const overviewList = Object.values(ownerMap);
  for (const item of overviewList) {
    try {
      const userSnap = await getDoc(doc(db, 'users', item.ownerId));
      if (userSnap.exists()) {
        const u = userSnap.data() as any;
        item.ownerName = u.displayName || u.businessName || item.ownerName;
        item.businessName = u.businessName || item.businessName;
        if (u.paymentSettings) {
          item.bankName = u.paymentSettings.bankName;
          item.accountNumber = u.paymentSettings.accountNumber;
          item.ifscCode = u.paymentSettings.ifscCode;
          item.upiId = u.paymentSettings.upiId;
        }
      }

      const subSnap = await getDoc(doc(db, 'ownerSubscriptions', item.ownerId));
      if (subSnap.exists()) {
        const subData = subSnap.data() as any;
        item.subscribedPlanName = subData.planName || 'Pro Plan';
        item.subscriptionStatus = subData.status || 'ACTIVE';
      }
    } catch (e) {
      // continue
    }
  }

  return overviewList;
}

export async function getAdminPaymentConfig(): Promise<any> {
  try {
    const docRef = doc(db, 'adminConfig', 'paymentSettings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Error fetching admin payment config:', err);
    return null;
  }
}

export async function saveAdminPaymentConfig(config: any): Promise<void> {
  const docRef = doc(db, 'adminConfig', 'paymentSettings');
  await setDoc(docRef, sanitizeFirestoreData(config), { merge: true });
}

export async function markOwnerPayoutSettled(params: {
  ownerId: string;
  amount: number;
  payoutTxnRef: string;
  requestId?: string;
  notes?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const payoutRef = doc(collection(db, 'ownerPayouts'));
  
  // 1. Create payout record
  const record: OwnerPayoutRecord = {
    id: payoutRef.id,
    ownerId: params.ownerId,
    ownerName: '',
    totalBookingsCount: 0,
    grossAmount: params.amount,
    platformFeeTotal: 0,
    netPayoutAmount: params.amount,
    status: 'PAID',
    payoutTxnRef: params.payoutTxnRef,
    paidAt: now,
    createdAt: now,
    notes: params.notes,
  };
  await setDoc(payoutRef, sanitizeFirestoreData(record));

  // 2. If specific requestId is provided, update that request
  if (params.requestId) {
    const reqRef = doc(db, 'ownerPayoutRequests', params.requestId);
    await updateDoc(reqRef, sanitizeFirestoreData({
      status: 'COMPLETED',
      utr: params.payoutTxnRef,
      processedAt: now,
      processedBy: 'Admin',
      notes: params.notes || 'Settled by admin',
    })).catch((e) => console.warn('Error updating specific payout request:', e));
  } else {
    // Check if there are any pending REQUESTED withdrawal requests for this owner and mark them fulfilled
    try {
      const qReqs = query(
        collection(db, 'ownerPayoutRequests'),
        where('ownerId', '==', params.ownerId),
        where('status', '==', 'REQUESTED')
      );
      const reqsSnap = await getDocs(qReqs);
      for (const d of reqsSnap.docs) {
        await updateDoc(d.ref, {
          status: 'COMPLETED',
          utr: params.payoutTxnRef,
          processedAt: now,
          processedBy: 'Admin',
          notes: params.notes || 'Settled by admin batch payout',
        });
      }
    } catch (e) {
      console.warn('Error updating pending owner payout requests:', e);
    }
  }

  // 3. Mark pending bookings for this owner as SETTLED
  const q = query(
    collection(db, 'bookings'),
    where('ownerId', '==', params.ownerId),
    where('paymentStatus', '==', 'PAID')
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const b = d.data() as Booking;
    if (b.settlementStatus !== 'SETTLED') {
      batch.update(d.ref, {
        settlementStatus: 'SETTLED',
        settlementPayoutId: payoutRef.id,
        settlementDate: now,
        updatedAt: now,
      });
    }
  });
  await batch.commit();
}

export async function rejectOwnerPayoutRequest(params: {
  requestId: string;
  reason: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const reqRef = doc(db, 'ownerPayoutRequests', params.requestId);
  await updateDoc(reqRef, sanitizeFirestoreData({
    status: 'REJECTED',
    rejectionReason: params.reason,
    processedAt: now,
    processedBy: 'Admin',
  }));
}

export async function requestOwnerWithdrawal(params: {
  ownerId: string;
  ownerName?: string;
  turfId?: string;
  turfName?: string;
  amount: number;
  destination: string;
  payoutMode?: 'UPI' | 'BANK';
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  beneficiaryName?: string;
  availableBalanceBefore?: number;
  notes?: string;
}): Promise<string> {
  const ref = doc(collection(db, 'ownerPayoutRequests'));
  const now = new Date().toISOString();
  const record: OwnerPayoutRequest = {
    id: ref.id,
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    turfId: params.turfId,
    turfName: params.turfName,
    amount: params.amount,
    destination: params.destination,
    payoutMode: params.payoutMode,
    upiId: params.upiId,
    bankName: params.bankName,
    accountNumber: params.accountNumber,
    ifscCode: params.ifscCode,
    beneficiaryName: params.beneficiaryName,
    availableBalanceBefore: params.availableBalanceBefore,
    status: 'REQUESTED',
    date: now,
    utr: 'Pending Admin Settlement',
    notes: params.notes,
  };
  await setDoc(ref, sanitizeFirestoreData(record));
  return ref.id;
}

export async function cancelOwnerPayoutRequest(requestId: string, ownerId: string): Promise<void> {
  const reqRef = doc(db, 'ownerPayoutRequests', requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) {
    throw new Error('Payout request not found');
  }
  const data = snap.data() as OwnerPayoutRequest;
  if (data.ownerId !== ownerId) {
    throw new Error('Unauthorized to cancel this request');
  }
  if (data.status !== 'REQUESTED') {
    throw new Error('Only pending requests awaiting review can be cancelled');
  }
  await updateDoc(reqRef, sanitizeFirestoreData({
    status: 'CANCELLED',
    notes: 'Cancelled by owner',
    processedAt: new Date().toISOString(),
    processedBy: 'Owner',
  }));
}

export async function getOwnerPayoutRequests(ownerId: string): Promise<OwnerPayoutRequest[]> {
  if (!ownerId) return [];
  try {
    const q = query(collection(db, 'ownerPayoutRequests'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRequest))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  } catch (err) {
    console.warn('Error fetching owner payout requests:', err);
    return [];
  }
}

export async function getAllBookingsAdmin(): Promise<Booking[]> {
  try {
    const snap = await getDocs(collection(db, 'bookings'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch (err) {
    console.warn('Error fetching all bookings for admin:', err);
    return [];
  }
}

export async function getAllPayoutRecordsAdmin(): Promise<OwnerPayoutRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'ownerPayouts'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRecord));
  } catch (err) {
    console.warn('Error fetching all payout records for admin:', err);
    return [];
  }
}

export async function getAllPayoutRequests(): Promise<OwnerPayoutRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'ownerPayoutRequests'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRequest))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  } catch (err) {
    console.warn('Error fetching all payout requests:', err);
    return [];
  }
}

export function listenAllPayoutRequests(callback: (requests: OwnerPayoutRequest[]) => void) {
  const q = query(collection(db, 'ownerPayoutRequests'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRequest));
      list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to all payout requests:', err);
    }
  );
}

export function listenOwnerPayoutRequests(ownerId: string, callback: (requests: OwnerPayoutRequest[]) => void) {
  if (!ownerId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'ownerPayoutRequests'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnerPayoutRequest));
      list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to owner payout requests:', err);
    }
  );
}

export async function deleteOwnerTestData(ownerId: string): Promise<void> {
  if (!ownerId) return;
  try {
    const q = query(collection(db, 'ownerPayoutRequests'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.isTest || data.amount === 0 || data.destination?.includes('test')) {
        batch.delete(d.ref);
      }
    });

    const bQuery = query(collection(db, 'bookings'), where('ownerId', '==', ownerId), where('isTest', '==', true));
    const bSnap = await getDocs(bQuery);
    bSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (err) {
    console.warn('Error deleting owner test data:', err);
  }
}

// ==========================================
// 1. COACH & ACADEMY HUB SERVICES
// ==========================================

export async function getCoaches(): Promise<CoachProfile[]> {
  try {
    const q = query(collection(db, 'coaches'));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachProfile));
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } catch (err) {
    console.warn('Error fetching coaches:', err);
    return [];
  }
}

export function listenCoaches(callback: (coaches: CoachProfile[]) => void) {
  const q = query(collection(db, 'coaches'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachProfile));
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      callback(list);
    },
    (err) => {
      console.warn('Error listening to coaches:', err);
      callback([]);
    }
  );
}

export async function getCoachProfileByUserId(userId: string): Promise<CoachProfile | null> {
  if (!userId) return null;
  try {
    const q = query(collection(db, 'coaches'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as CoachProfile;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching coach by userId:', err);
    return null;
  }
}

export async function createOrUpdateCoachProfile(profile: Omit<CoachProfile, 'createdAt'> & { createdAt?: string }): Promise<string> {
  const now = new Date().toISOString();
  let coachId = profile.id;
  if (!coachId) {
    const docRef = doc(collection(db, 'coaches'));
    coachId = docRef.id;
  }
  const docRef = doc(db, 'coaches', coachId);
  const payload: CoachProfile = {
    ...profile,
    id: coachId,
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });

  // If subscription was paid during registration, log to subscriptionTransactions
  if (profile.subscription?.amountPaid && profile.subscription.amountPaid > 0) {
    try {
      const txnRef = doc(collection(db, 'subscriptionTransactions'));
      await setDoc(txnRef, sanitizeFirestoreData({
        id: txnRef.id,
        ownerId: coachId,
        ownerEmail: profile.email || '',
        ownerName: profile.name || profile.academyName || 'Coach / Academy',
        planId: profile.subscription.planId,
        planName: profile.subscription.planName,
        amountPaid: profile.subscription.amountPaid,
        paymentTxnId: profile.subscription.paymentId || `COACH_REG_TXN_${Date.now()}`,
        createdAt: now,
      }));
    } catch (err) {
      console.warn('Subscription transaction log notice:', err);
    }
  }

  return coachId;
}

export async function getCoachBatches(coachId?: string): Promise<CoachBatch[]> {
  try {
    let q = query(collection(db, 'coachBatches'));
    if (coachId) {
      q = query(collection(db, 'coachBatches'), where('coachId', '==', coachId));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachBatch));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.warn('Error fetching coach batches:', err);
    return [];
  }
}

export function listenCoachBatches(coachId: string | undefined, callback: (batches: CoachBatch[]) => void) {
  let q = query(collection(db, 'coachBatches'));
  if (coachId) {
    q = query(collection(db, 'coachBatches'), where('coachId', '==', coachId));
  }
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachBatch));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to coach batches:', err);
      callback([]);
    }
  );
}

export async function createCoachBatch(batchData: Omit<CoachBatch, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'coachBatches'));
  const now = new Date().toISOString();
  const payload: CoachBatch = {
    ...batchData,
    id: docRef.id,
    createdAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload));
  return docRef.id;
}

export async function updateCoachBatch(batchId: string, updates: Partial<CoachBatch>): Promise<void> {
  const docRef = doc(db, 'coachBatches', batchId);
  await updateDoc(docRef, sanitizeFirestoreData(updates));
}

export async function deleteCoachBatch(batchId: string): Promise<void> {
  const docRef = doc(db, 'coachBatches', batchId);
  await deleteDoc(docRef);
}

export async function enrollInCoachBatch(enrollment: Omit<CoachEnrollment, 'id' | 'enrolledAt'>): Promise<string> {
  const docRef = doc(collection(db, 'coachEnrollments'));
  const now = new Date().toISOString();
  const payload: CoachEnrollment = {
    ...enrollment,
    id: docRef.id,
    enrolledAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload));

  // Increment enrolledCount in batch
  const batchRef = doc(db, 'coachBatches', enrollment.batchId);
  try {
    const snap = await getDoc(batchRef);
    if (snap.exists()) {
      const current = snap.data().enrolledCount || 0;
      await updateDoc(batchRef, { enrolledCount: current + 1 });
    }
  } catch (err) {
    console.warn('Error updating batch enrolled count:', err);
  }

  return docRef.id;
}

export async function getPlayerCoachEnrollments(playerId: string): Promise<CoachEnrollment[]> {
  if (!playerId) return [];
  try {
    const q = query(collection(db, 'coachEnrollments'), where('playerId', '==', playerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachEnrollment));
  } catch (err) {
    console.warn('Error fetching player enrollments:', err);
    return [];
  }
}

export async function getAllCoachEnrollments(coachId?: string): Promise<CoachEnrollment[]> {
  try {
    let q = query(collection(db, 'coachEnrollments'));
    if (coachId) {
      q = query(collection(db, 'coachEnrollments'), where('coachId', '==', coachId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachEnrollment));
  } catch (err) {
    console.warn('Error fetching all coach enrollments:', err);
    return [];
  }
}

export function listenAllCoachEnrollments(coachId: string | undefined, callback: (enrollments: CoachEnrollment[]) => void) {
  let q = query(collection(db, 'coachEnrollments'));
  if (coachId) {
    q = query(collection(db, 'coachEnrollments'), where('coachId', '==', coachId));
  }
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachEnrollment));
      callback(list);
    },
    (err) => {
      console.warn('Error listening to all coach enrollments:', err);
      callback([]);
    }
  );
}

export async function verifyCoachProfile(
  coachId: string,
  isVerified: boolean,
  verificationStatus: CoachVerificationStatus,
  adminNotes?: string,
  adminEmail?: string
): Promise<void> {
  const docRef = doc(db, 'coaches', coachId);
  const now = new Date().toISOString();
  await updateDoc(
    docRef,
    sanitizeFirestoreData({
      isVerified,
      verificationStatus,
      status: isVerified ? 'ACTIVE' : verificationStatus === 'REJECTED' ? 'SUSPENDED' : 'PENDING',
      verificationNotes: adminNotes || '',
      verifiedAt: isVerified ? now : undefined,
      verifiedBy: isVerified ? (adminEmail || 'admin') : undefined,
      updatedAt: now,
    })
  );
}

export async function recordCoachYearlySubscription(
  coachId: string,
  subscription: CoachSubscription,
  coachName?: string,
  coachEmail?: string
): Promise<void> {
  const docRef = doc(db, 'coaches', coachId);
  const now = new Date().toISOString();
  await updateDoc(
    docRef,
    sanitizeFirestoreData({
      subscription,
      platformFeePaid: subscription.amountPaid,
      updatedAt: now,
    })
  );

  // Automatically log transaction in subscriptionTransactions collection
  if (subscription.amountPaid && subscription.amountPaid > 0) {
    try {
      const txnRef = doc(collection(db, 'subscriptionTransactions'));
      await setDoc(txnRef, sanitizeFirestoreData({
        id: txnRef.id,
        ownerId: coachId,
        ownerEmail: coachEmail || '',
        ownerName: coachName || 'Coach / Academy',
        planId: subscription.planId,
        planName: subscription.planName,
        amountPaid: subscription.amountPaid,
        paymentTxnId: subscription.paymentId || `COACH_TXN_${Date.now()}`,
        createdAt: now,
      }));
    } catch (err) {
      console.warn('Subscription transaction log notice:', err);
    }
  }
}

export const DEFAULT_COACH_SUBSCRIPTION_PLANS: CoachSubscriptionPlan[] = [
  {
    id: 'YEARLY_COACH_PRO',
    name: 'Coach Pro Annual Pass',
    price: 2999,
    originalPrice: 4999,
    durationDays: 365,
    duration: '1 Year (365 Days)',
    role: 'COACH',
    popular: true,
    maxBatches: 20,
    features: [
      'Official TurFit Verified Coach Badge',
      'Create Unlimited Batches & Practice Sessions',
      'Direct Athlete Search & Discovery',
      'Student Enrollment & Attendance Tracker',
      'Direct Venue Booking Partnerships',
      '0% Commission on Student Fees',
    ],
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'YEARLY_ACADEMY_ELITE',
    name: 'Academy Elite Annual Pass',
    price: 4999,
    originalPrice: 7999,
    durationDays: 365,
    duration: '1 Year (365 Days)',
    role: 'ACADEMY',
    popular: false,
    maxBatches: 50,
    features: [
      'Everything in Coach Pro',
      'Multi-Coach / Multi-Sport Academy Roster',
      'Featured Top Ranking in Discovery',
      'Custom Academy Branding & Logo Display',
      'Bulk Student Invoicing & GST Receipt Support',
      'Priority Customer Support & Dedicated Account Rep',
    ],
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getCoachSubscriptionPlans(includeArchived = false): Promise<CoachSubscriptionPlan[]> {
  try {
    const colRef = collection(db, 'coachSubscriptionPlans');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const p of DEFAULT_COACH_SUBSCRIPTION_PLANS) {
        await setDoc(doc(db, 'coachSubscriptionPlans', p.id), sanitizeFirestoreData(p));
      }
      return DEFAULT_COACH_SUBSCRIPTION_PLANS;
    }
    const plans: CoachSubscriptionPlan[] = [];
    snap.forEach((d) => {
      const data = d.data() as CoachSubscriptionPlan;
      if (includeArchived || !data.isArchived) {
        plans.push(data);
      }
    });
    return plans.sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn('Error getting coach subscription plans:', err);
    return DEFAULT_COACH_SUBSCRIPTION_PLANS;
  }
}

export async function saveCoachSubscriptionPlan(plan: CoachSubscriptionPlan): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', plan.id);
  const now = new Date().toISOString();
  const payload = {
    ...plan,
    updatedAt: now,
    createdAt: plan.createdAt || now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
}

export async function updateCoachSubscriptionPlanField(
  planId: string,
  updates: Partial<CoachSubscriptionPlan>
): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  const now = new Date().toISOString();
  await updateDoc(docRef, sanitizeFirestoreData({ ...updates, updatedAt: now }));
}

export async function getAllCoachSubscriptions(): Promise<Array<{
  coachId: string;
  name: string;
  academyName?: string;
  email: string;
  phone: string;
  sports: string[];
  city?: string;
  isVerified: boolean;
  subscription?: CoachSubscription;
  status: string;
  createdAt: string;
  totalBatches?: number;
  totalEnrolledStudents?: number;
}>> {
  try {
    const coaches = await getCoaches();
    return coaches.map((c) => ({
      coachId: c.id,
      name: c.name,
      academyName: c.academyName,
      email: c.email,
      phone: c.phone,
      sports: c.sports || [],
      city: c.city,
      isVerified: c.isVerified,
      subscription: c.subscription,
      status: c.status || 'ACTIVE',
      createdAt: c.createdAt,
      totalBatches: 0,
      totalEnrolledStudents: c.totalEnrolledStudents || 0,
    }));
  } catch (err) {
    console.warn('Error fetching all coach subscriptions:', err);
    return [];
  }
}

export async function getAllCoachSubscriptionTransactions(): Promise<CoachSubscriptionTransaction[]> {
  try {
    const [snap, coaches] = await Promise.all([
      getDocs(collection(db, 'subscriptionTransactions')).catch(() => ({ docs: [] } as any)),
      getCoaches().catch(() => [] as CoachProfile[]),
    ]);

    const rawTxns = snap.docs.map((d: any) => d.data() as any);
    const existingTxns: CoachSubscriptionTransaction[] = rawTxns
      .filter(
        (t: any) =>
          t.planId?.toLowerCase().includes('coach') ||
          t.planId?.toLowerCase().includes('academy') ||
          t.planName?.toLowerCase().includes('coach') ||
          t.planName?.toLowerCase().includes('academy') ||
          t.type === 'COACH_SUBSCRIPTION' ||
          t.coachId
      )
      .map((t: any) => ({
        id: t.id || t.paymentTxnId || `txn_${Date.now()}`,
        coachId: t.ownerId || t.coachId || '',
        coachName: t.ownerName || t.coachName || '',
        coachEmail: t.ownerEmail || t.coachEmail || '',
        coachPhone: t.coachPhone || '',
        academyName: t.academyName || '',
        planId: t.planId || 'YEARLY_COACH_PRO',
        planName: t.planName || 'Coach Annual Pass',
        amountPaid: Number(t.amountPaid || t.amount || 0),
        paymentTxnId: t.paymentTxnId || t.id,
        paymentMethod: t.paymentMethod || 'ONLINE_UPI',
        durationDays: Number(t.durationDays) || 365,
        createdAt: t.createdAt || new Date().toISOString(),
      }));

    // If a coach has an active or paid profile in Firestore but no transaction log, synthesize transaction
    const seenCoachIds = new Set(existingTxns.map((t) => t.coachId).filter(Boolean));
    coaches.forEach((c) => {
      const hasPaid =
        c.subscription?.isActive ||
        c.subscription?.paymentStatus === 'PAID' ||
        (c.platformFeePaid && c.platformFeePaid > 0) ||
        c.isVerified;

      if (hasPaid && (!c.id || !seenCoachIds.has(c.id))) {
        const amt = Number(
          c.subscription?.amountPaid ||
          c.platformFeePaid ||
          (c.academyName ? 4999 : 2999)
        );
        const subId = c.subscription?.paymentId || `TXN_COACH_PASS_${c.id}`;
        existingTxns.push({
          id: subId,
          coachId: c.id,
          coachName: c.name || c.academyName || 'Certified Coach',
          coachEmail: c.email || '',
          coachPhone: c.phone || '',
          academyName: c.academyName || '',
          planId: c.subscription?.planId || (c.academyName ? 'YEARLY_ACADEMY_ELITE' : 'YEARLY_COACH_PRO'),
          planName: c.subscription?.planName || (c.academyName ? 'Academy Elite Annual Pass' : 'Coach Pro Annual Pass'),
          amountPaid: amt > 0 ? amt : (c.academyName ? 4999 : 2999),
          paymentTxnId: subId,
          paymentMethod: c.subscription?.paymentMethod || 'ONLINE_UPI',
          durationDays: 365,
          createdAt: c.subscription?.subscribedAt || c.createdAt || new Date().toISOString(),
        });
        if (c.id) seenCoachIds.add(c.id);
      }
    });

    return existingTxns.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('Error fetching coach subscription transactions:', err);
    return [];
  }
}

export async function activateCoachSubscription(params: {
  coachId: string;
  coachEmail?: string;
  coachName?: string;
  coachPhone?: string;
  academyName?: string;
  planId: string;
  planName: string;
  durationDays: number;
  amountPaid: number;
  paymentTxnId?: string;
  paymentMethod?: string;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const subPayload: CoachSubscription = {
    planId: params.planId,
    planName: params.planName,
    amountPaid: params.amountPaid,
    paymentStatus: 'PAID',
    paymentId: params.paymentTxnId || `COACH_ADMIN_GRANT_${Date.now()}`,
    paymentMethod: params.paymentMethod || 'SUPER_ADMIN_OVERRIDE',
    subscribedAt: now.toISOString(),
    expiresAt,
    isActive: true,
  };

  const coachRef = doc(db, 'coaches', params.coachId);
  await updateDoc(coachRef, sanitizeFirestoreData({
    subscription: subPayload,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    updatedAt: now.toISOString(),
  }));

  // Log in subscriptionTransactions
  try {
    const txnRef = doc(collection(db, 'subscriptionTransactions'));
    await setDoc(txnRef, sanitizeFirestoreData({
      id: txnRef.id,
      ownerId: params.coachId,
      ownerEmail: params.coachEmail || '',
      ownerName: params.coachName || params.academyName || 'Coach / Academy',
      planId: params.planId,
      planName: params.planName,
      amountPaid: params.amountPaid,
      paymentTxnId: params.paymentTxnId || `COACH_TXN_${Date.now()}`,
      createdAt: now.toISOString(),
    }));
  } catch (e) {
    console.warn('Notice writing coach txn log:', e);
  }

  await logSubscriptionAudit({
    type: 'COACH_SUBSCRIPTION',
    targetId: params.coachId,
    targetName: params.coachName || params.academyName || 'Coach / Academy',
    action: 'ACTIVATED',
    planId: params.planId,
    planName: params.planName,
    amount: params.amountPaid,
    performedBy: 'Super Admin',
    details: { durationDays: params.durationDays, expiresAt },
  });
}

export async function archiveCoachSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  await updateDoc(docRef, { isArchived: true, isActive: false, updatedAt: new Date().toISOString() });
}

export async function deleteCoachSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  await deleteDoc(docRef);
}

export function listenCoachSubscriptionPlans(
  includeArchived = false,
  callback: (plans: CoachSubscriptionPlan[]) => void
) {
  const colRef = collection(db, 'coachSubscriptionPlans');
  return onSnapshot(
    colRef,
    (snap) => {
      const plans: CoachSubscriptionPlan[] = [];
      snap.forEach((d) => {
        const data = d.data() as CoachSubscriptionPlan;
        if (includeArchived || !data.isArchived) {
          plans.push(data);
        }
      });
      callback(plans.sort((a, b) => a.price - b.price));
    },
    (err) => {
      console.warn('Error listening to coach subscription plans:', err);
      callback(DEFAULT_COACH_SUBSCRIPTION_PLANS);
    }
  );
}

// ==========================================
// 2. OPEN COMMUNITY & 3. CORPORATE TOURNAMENT SERVICES
// ==========================================

export async function getTournaments(category?: TournamentCategory): Promise<Tournament[]> {
  try {
    let q = query(collection(db, 'tournaments'));
    if (category) {
      q = query(collection(db, 'tournaments'), where('category', '==', category));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.warn('Error fetching tournaments:', err);
    return [];
  }
}

export function listenTournaments(category: TournamentCategory | undefined, callback: (tournaments: Tournament[]) => void) {
  let q = query(collection(db, 'tournaments'));
  if (category) {
    q = query(collection(db, 'tournaments'), where('category', '==', category));
  }
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to tournaments:', err);
      callback([]);
    }
  );
}

export async function getTournamentById(tournamentId: string): Promise<Tournament | null> {
  if (!tournamentId) return null;
  try {
    const docRef = doc(db, 'tournaments', tournamentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Tournament;
    }
    return null;
  } catch (err) {
    console.warn('Error getting tournament by id:', err);
    return null;
  }
}

export async function createTournament(tournamentData: Omit<Tournament, 'id' | 'createdAt'>): Promise<string> {
  const docRef = doc(collection(db, 'tournaments'));
  const now = new Date().toISOString();
  const payload: Tournament = {
    ...tournamentData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload));
  return docRef.id;
}

export async function updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<void> {
  const docRef = doc(db, 'tournaments', tournamentId);
  await updateDoc(docRef, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function registerTournamentTeam(teamData: Omit<TournamentTeam, 'id' | 'registeredAt'>): Promise<string> {
  const docRef = doc(collection(db, 'tournamentTeams'));
  const now = new Date().toISOString();
  const payload: TournamentTeam = {
    ...teamData,
    id: docRef.id,
    registeredAt: now,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload));

  // Increment registeredTeamsCount on tournament
  const tRef = doc(db, 'tournaments', teamData.tournamentId);
  try {
    const snap = await getDoc(tRef);
    if (snap.exists()) {
      const current = snap.data().registeredTeamsCount || 0;
      await updateDoc(tRef, { registeredTeamsCount: current + 1 });
    }
  } catch (err) {
    console.warn('Error updating registered teams count:', err);
  }

  return docRef.id;
}

export async function getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
  if (!tournamentId) return [];
  try {
    const q = query(collection(db, 'tournamentTeams'), where('tournamentId', '==', tournamentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentTeam));
  } catch (err) {
    console.warn('Error fetching tournament teams:', err);
    return [];
  }
}

export function listenTournamentTeams(tournamentId: string, callback: (teams: TournamentTeam[]) => void) {
  if (!tournamentId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'tournamentTeams'), where('tournamentId', '==', tournamentId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentTeam));
      callback(list);
    },
    (err) => {
      console.warn('Error listening to tournament teams:', err);
      callback([]);
    }
  );
}

export async function getTournamentFixtures(tournamentId: string): Promise<TournamentFixture[]> {
  if (!tournamentId) return [];
  try {
    const q = query(collection(db, 'tournamentFixtures'), where('tournamentId', '==', tournamentId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentFixture));
    return list.sort((a, b) => a.matchNumber - b.matchNumber);
  } catch (err) {
    console.warn('Error fetching tournament fixtures:', err);
    return [];
  }
}

export function listenTournamentFixtures(tournamentId: string, callback: (fixtures: TournamentFixture[]) => void) {
  if (!tournamentId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'tournamentFixtures'), where('tournamentId', '==', tournamentId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentFixture));
      list.sort((a, b) => a.matchNumber - b.matchNumber);
      callback(list);
    },
    (err) => {
      console.warn('Error listening to tournament fixtures:', err);
      callback([]);
    }
  );
}

export async function saveTournamentFixture(fixture: Omit<TournamentFixture, 'id'> & { id?: string }): Promise<string> {
  let fixtureId = fixture.id;
  if (!fixtureId) {
    const docRef = doc(collection(db, 'tournamentFixtures'));
    fixtureId = docRef.id;
  }
  const docRef = doc(db, 'tournamentFixtures', fixtureId);
  const payload: TournamentFixture = {
    ...fixture,
    id: fixtureId,
  };
  await setDoc(docRef, sanitizeFirestoreData(payload), { merge: true });
  return fixtureId;
}

export async function updateFixtureScore(
  fixtureId: string,
  teamAScore: string,
  teamBScore: string,
  winnerId?: string,
  winnerName?: string,
  isFinished = false
): Promise<void> {
  const docRef = doc(db, 'tournamentFixtures', fixtureId);
  const updates: Partial<TournamentFixture> = {
    'teamA.score': teamAScore,
    'teamB.score': teamBScore,
    status: isFinished ? 'COMPLETED' : 'LIVE',
  } as any;
  if (winnerId) updates.winnerId = winnerId;
  if (winnerName) updates.winnerName = winnerName;
  await updateDoc(docRef, sanitizeFirestoreData(updates));
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  const docRef = doc(db, 'tournaments', tournamentId);
  await deleteDoc(docRef);
}

// ==================== SOCIAL MEDIA (PLAYERS & OWNERS) ====================

export function listenSocialPosts(
  filters?: { city?: string; sport?: string; authorType?: 'PLAYER' | 'OWNER'; onlyPromotional?: boolean },
  callback?: (posts: SocialPost[]) => void
) {
  const postsRef = collection(db, 'socialPosts');
  return onSnapshot(
    postsRef,
    (snap) => {
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialPost));
      
      // Client-side filtering to avoid complex composite Firestore indexes
      if (filters?.city && filters.city !== 'ALL') {
        const cityLower = filters.city.toLowerCase();
        list = list.filter((p) => !p.city || p.city.toLowerCase() === cityLower);
      }
      if (filters?.sport && filters.sport !== 'ALL') {
        list = list.filter((p) => !p.sport || p.sport.toLowerCase() === filters.sport?.toLowerCase());
      }
      if (filters?.authorType) {
        list = list.filter((p) => p.authorType === filters.authorType);
      }
      if (filters?.onlyPromotional) {
        list = list.filter((p) => p.isPromotional === true);
      }

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback?.(list);
    },
    (err) => {
      console.warn('Error listening to social posts:', err);
      callback?.([]);
    }
  );
}

export function listenUserPosts(
  userId: string,
  callback: (posts: SocialPost[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, 'socialPosts'),
    where('authorId', '==', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialPost));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to user posts:', err);
      callback([]);
    }
  );
}

export async function getUserPosts(userId: string): Promise<SocialPost[]> {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'socialPosts'),
      where('authorId', '==', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialPost));
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.error('Error getting user posts:', err);
    return [];
  }
}

export async function createSocialPost(
  postData: Omit<SocialPost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>
): Promise<string> {
  const docRef = doc(collection(db, 'socialPosts'));
  const now = new Date().toISOString();
  const payload: SocialPost = {
    ...postData,
    id: docRef.id,
    likesCount: 0,
    likedBy: [],
    commentsCount: 0,
    comments: [],
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(docRef, sanitizeFirestoreData(payload));

  if (postData.authorId) {
    const userRef = doc(db, 'users', postData.authorId);
    batch.update(userRef, {
      postsCount: increment(1),
      updatedAt: now,
    });
  }

  await batch.commit();
  return docRef.id;
}

export async function deleteSocialPost(
  postId: string,
  authorId?: string
): Promise<void> {
  const docRef = doc(db, 'socialPosts', postId);
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.delete(docRef);

  if (authorId) {
    const userRef = doc(db, 'users', authorId);
    batch.update(userRef, {
      postsCount: increment(-1),
      updatedAt: now,
    });
  }

  await batch.commit();
}

export async function toggleLikeSocialPost(
  postId: string,
  userId: string,
  userName?: string
): Promise<boolean> {
  const docRef = doc(db, 'socialPosts', postId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return false;

  const post = snap.data() as SocialPost;
  const likedBy = post.likedBy || [];
  const alreadyLiked = likedBy.includes(userId);

  const updatedLikedBy = alreadyLiked
    ? likedBy.filter((id) => id !== userId)
    : [...likedBy, userId];

  await updateDoc(docRef, sanitizeFirestoreData({
    likedBy: updatedLikedBy,
    likesCount: Math.max(0, updatedLikedBy.length),
    updatedAt: new Date().toISOString(),
  }));

  // If now liked and user is not author, notify author
  if (!alreadyLiked && post.authorId && post.authorId !== userId) {
    try {
      const { sendNotification } = await import('./phase3');
      const snippet = post.caption ? (post.caption.length > 50 ? `${post.caption.slice(0, 50)}...` : post.caption) : 'your post';
      sendNotification({
        recipientId: post.authorId,
        senderId: userId,
        senderName: userName || 'An athlete',
        title: '❤️ New Like',
        message: `${userName || 'An athlete'} liked your post: "${snippet}"`,
        type: 'POST_LIKE',
        relatedId: postId,
        relatedType: 'POST',
        linkId: postId,
      }).catch((err) => console.warn('Silent social like notif catch:', err));
    } catch (e) {
      console.warn('Could not trigger like notification:', e);
    }
  }

  return !alreadyLiked;
}

export async function addSocialComment(
  postId: string,
  comment: Omit<SocialComment, 'id' | 'postId' | 'createdAt'>
): Promise<string> {
  const docRef = doc(db, 'socialPosts', postId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Post not found');

  const post = snap.data() as SocialPost;
  const commentId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newComment: SocialComment = {
    ...comment,
    id: commentId,
    postId,
    createdAt: now,
  };

  const updatedComments = [...(post.comments || []), newComment];

  await updateDoc(docRef, sanitizeFirestoreData({
    comments: updatedComments,
    commentsCount: updatedComments.length,
    updatedAt: now,
  }));

  // Notify post author if commenter is not author
  if (post.authorId && post.authorId !== comment.userId) {
    try {
      const { sendNotification } = await import('./phase3');
      const textPreview = comment.text.length > 60 ? `${comment.text.slice(0, 60)}...` : comment.text;
      sendNotification({
        recipientId: post.authorId,
        senderId: comment.userId,
        senderName: comment.userName || 'An athlete',
        title: '💬 New Comment',
        message: `${comment.userName || 'An athlete'} commented on your post: "${textPreview}"`,
        type: 'POST_COMMENT',
        relatedId: postId,
        relatedType: 'POST',
        linkId: postId,
      }).catch((err) => console.warn('Silent social comment notif catch:', err));
    } catch (e) {
      console.warn('Could not trigger comment notification:', e);
    }
  }

  return commentId;
}

export async function deleteSocialComment(
  postId: string,
  commentId: string,
  requestingUserId: string
): Promise<void> {
  if (!postId || !commentId || !requestingUserId) {
    throw new Error('Post ID, Comment ID, and User ID are required.');
  }

  const docRef = doc(db, 'socialPosts', postId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Post not found');

  const post = snap.data() as SocialPost;
  const existingComments = post.comments || [];
  const targetComment = existingComments.find((c) => c.id === commentId);

  if (!targetComment) {
    throw new Error('Comment not found or already deleted.');
  }

  // Permission check: User can delete if they are the comment author or post author
  const isCommentAuthor = targetComment.userId === requestingUserId;
  const isPostAuthor = post.authorId === requestingUserId;

  if (!isCommentAuthor && !isPostAuthor) {
    throw new Error('You do not have permission to delete this comment.');
  }

  const updatedComments = existingComments.filter((c) => c.id !== commentId);

  await updateDoc(docRef, sanitizeFirestoreData({
    comments: updatedComments,
    commentsCount: updatedComments.length,
    updatedAt: new Date().toISOString(),
  }));
}

// ==================== OWNER BRAND PROFILES ====================

export async function getOwnerBrandProfile(ownerId: string): Promise<OwnerBrandProfile | null> {
  if (!ownerId) return null;
  try {
    const docRef = doc(db, 'ownerBrandProfiles', ownerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as OwnerBrandProfile;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching owner brand profile:', err);
    return null;
  }
}

export function listenOwnerBrandProfile(ownerId: string, callback: (profile: OwnerBrandProfile | null) => void) {
  if (!ownerId) {
    callback(null);
    return () => {};
  }
  const docRef = doc(db, 'ownerBrandProfiles', ownerId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as OwnerBrandProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Error listening to owner brand profile:', err);
      callback(null);
    }
  );
}

export function listenAllOwnerBrandProfiles(callback: (profiles: OwnerBrandProfile[]) => void) {
  const colRef = collection(db, 'ownerBrandProfiles');
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnerBrandProfile));
      callback(list);
    },
    (err) => {
      console.warn('Error listening to all owner brand profiles:', err);
      callback([]);
    }
  );
}

export async function saveOwnerBrandProfile(
  profileData: Omit<OwnerBrandProfile, 'createdAt' | 'updatedAt' | 'followersCount' | 'followers'> & {
    followersCount?: number;
    followers?: string[];
  }
): Promise<void> {
  const docRef = doc(db, 'ownerBrandProfiles', profileData.ownerId);
  const snap = await getDoc(docRef);
  const now = new Date().toISOString();

  if (snap.exists()) {
    await updateDoc(docRef, sanitizeFirestoreData({
      ...profileData,
      updatedAt: now,
    }));
  } else {
    const newProfile: OwnerBrandProfile = {
      ...profileData,
      id: profileData.ownerId,
      followersCount: profileData.followersCount || 0,
      followers: profileData.followers || [],
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, sanitizeFirestoreData(newProfile));
  }
}

export async function toggleFollowOwnerBrand(ownerProfileId: string, userId: string): Promise<boolean> {
  const docRef = doc(db, 'ownerBrandProfiles', ownerProfileId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return false;

  const prof = snap.data() as OwnerBrandProfile;
  const followers = prof.followers || [];
  const alreadyFollowed = followers.includes(userId);

  const updatedFollowers = alreadyFollowed
    ? followers.filter((id) => id !== userId)
    : [...followers, userId];

  await updateDoc(docRef, sanitizeFirestoreData({
    followers: updatedFollowers,
    followersCount: Math.max(0, updatedFollowers.length),
    updatedAt: new Date().toISOString(),
  }));

  return !alreadyFollowed;
}

// ==================== TRUFIT SOCIAL PROFILES ====================

/**
 * Validates format and checks if a username is globally unique among TruFit users.
 * Allowed: 3-20 lowercase alphanumeric characters and underscores.
 */
export async function checkUsernameAvailability(
  username: string,
  currentUid?: string
): Promise<{ available: boolean; message?: string }> {
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  if (!clean) {
    return { available: false, message: 'Username cannot be blank.' };
  }
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    return {
      available: false,
      message: 'Username must be 3-20 characters using only lowercase letters, numbers, and underscores.',
    };
  }
  // Reserved usernames
  const reserved = ['admin', 'trufit', 'turfit', 'support', 'help', 'official', 'verified', 'moderator', 'system'];
  if (reserved.includes(clean)) {
    return { available: false, message: 'This handle is reserved by TruFit.' };
  }

  try {
    const q = query(collection(db, 'users'), where('username', '==', clean));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { available: true };
    }
    // Check if the match is the current user's existing doc
    const matchesOther = snapshot.docs.some((docSnap) => docSnap.id !== currentUid);
    if (matchesOther) {
      return { available: false, message: `@${clean} is already claimed by another user.` };
    }
    return { available: true };
  } catch (err: any) {
    console.warn('Error checking username availability:', err);
    return { available: true };
  }
}

/**
 * Retrieves a user's full profile document by Firebase UID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return { uid: snap.id, ...snap.data() } as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

/**
 * Retrieves a user's profile by their unique @username.
 */
export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return null;
  try {
    const q = query(collection(db, 'users'), where('username', '==', clean));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user by username:', err);
    return null;
  }
}

/**
 * Updates a user profile in Firestore.
 */
export async function updateUserProfileData(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  if (!userId) throw new Error('User ID is required');
  const userRef = doc(db, 'users', userId);
  await updateDoc(
    userRef,
    sanitizeFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  );
}

// ==================== PHASE 2: FOLLOW / FOLLOWING SYSTEM ====================

export interface FollowParams {
  follower: UserProfile;
  targetId: string;
  targetType: FollowTargetType;
  targetName: string;
  targetUsername?: string;
  targetAvatar?: string;
  targetCity?: string;
  targetSport?: string;
}

/**
 * Follows a Player, Owner, or Team with atomic duplicate prevention and count updates.
 */
export async function followUserOrTeam(params: FollowParams): Promise<void> {
  const { follower, targetId, targetType, targetName, targetUsername, targetAvatar, targetCity, targetSport } = params;

  if (!follower || !follower.uid) {
    throw new Error('You must be signed in to follow.');
  }
  if (follower.uid === targetId) {
    throw new Error('You cannot follow your own profile.');
  }

  const followId = `${follower.uid}_${targetId}`;
  const followRef = doc(db, 'follows', followId);
  const followerUserRef = doc(db, 'users', follower.uid);

  const now = new Date().toISOString();
  const followRecord: UserFollow = {
    id: followId,
    followerId: follower.uid,
    followerName: follower.displayName || 'Athlete',
    followerUsername: follower.username || '',
    followerAvatar: follower.photoURL || '',
    followerRole: follower.role || 'PLAYER',
    targetId,
    targetType,
    targetName: targetName || 'TruFit Member',
    targetUsername: targetUsername || '',
    targetAvatar: targetAvatar || '',
    targetCity: targetCity || '',
    targetSport: targetSport || '',
    createdAt: now,
  };

  const batch = writeBatch(db);

  // 1. Create unique follow relationship record
  batch.set(followRef, sanitizeFirestoreData(followRecord));

  // 2. Increment follower's following count
  batch.update(followerUserRef, {
    followingCount: increment(1),
    updatedAt: now,
  });

  // 3. Increment target's follower count based on targetType
  if (targetType === 'TEAM') {
    const teamRef = doc(db, 'teams', targetId);
    batch.update(teamRef, {
      followersCount: increment(1),
      updatedAt: now,
    });
  } else {
    const targetUserRef = doc(db, 'users', targetId);
    batch.update(targetUserRef, {
      followersCount: increment(1),
      updatedAt: now,
    });
  }

  await batch.commit();

  // Dispatch follow notification if target is an athlete or owner
  if (targetType !== 'TEAM' && targetId) {
    try {
      const { sendNotification } = await import('./phase3');
      sendNotification({
        recipientId: targetId,
        senderId: follower.uid,
        senderName: follower.displayName || 'An athlete',
        title: '👋 New Follower',
        message: `${follower.displayName || 'An athlete'} started following your TruFit profile!`,
        type: 'USER_FOLLOW',
        relatedId: follower.uid,
        relatedType: 'PROFILE',
        linkId: follower.uid,
      }).catch((err) => console.warn('Silent follow notification catch:', err));
    } catch (e) {
      console.warn('Could not dispatch follow notification:', e);
    }
  }
}

/**
 * Unfollows a Player, Owner, or Team.
 */
export async function unfollowUserOrTeam(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType = 'PLAYER'
): Promise<void> {
  if (!followerId) throw new Error('Follower ID is required.');
  if (!targetId) throw new Error('Target ID is required.');

  const followId = `${followerId}_${targetId}`;
  const followRef = doc(db, 'follows', followId);
  const followerUserRef = doc(db, 'users', followerId);
  const now = new Date().toISOString();

  const batch = writeBatch(db);

  // 1. Delete follow document
  batch.delete(followRef);

  // 2. Decrement follower's following count
  batch.update(followerUserRef, {
    followingCount: increment(-1),
    updatedAt: now,
  });

  // 3. Decrement target's followers count
  if (targetType === 'TEAM') {
    const teamRef = doc(db, 'teams', targetId);
    batch.update(teamRef, {
      followersCount: increment(-1),
      updatedAt: now,
    });
  } else {
    const targetUserRef = doc(db, 'users', targetId);
    batch.update(targetUserRef, {
      followersCount: increment(-1),
      updatedAt: now,
    });
  }

  await batch.commit();
}

/**
 * Checks whether followerId is currently following targetId.
 */
export async function checkIsFollowing(followerId: string, targetId: string): Promise<boolean> {
  if (!followerId || !targetId) return false;
  try {
    const followId = `${followerId}_${targetId}`;
    const snap = await getDoc(doc(db, 'follows', followId));
    return snap.exists();
  } catch (err) {
    console.error('Error checking follow status:', err);
    return false;
  }
}

/**
 * Real-time listener for follow state between two users/entities.
 */
export function listenIsFollowing(
  followerId: string | undefined | null,
  targetId: string | undefined | null,
  callback: (isFollowing: boolean) => void
): () => void {
  if (!followerId || !targetId) {
    callback(false);
    return () => {};
  }
  const followId = `${followerId}_${targetId}`;
  return onSnapshot(
    doc(db, 'follows', followId),
    (snap) => {
      callback(snap.exists());
    },
    (err) => {
      console.warn('Error listening to follow relationship:', err);
      callback(false);
    }
  );
}

/**
 * Fetches all followers for a target entity.
 */
export async function getFollowersList(targetId: string): Promise<UserFollow[]> {
  if (!targetId) return [];
  try {
    const q = query(collection(db, 'follows'), where('targetId', '==', targetId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserFollow);
  } catch (err) {
    console.error('Error getting followers list:', err);
    return [];
  }
}

/**
 * Fetches all entities followed by a user.
 */
export async function getFollowingList(followerId: string): Promise<UserFollow[]> {
  if (!followerId) return [];
  try {
    const q = query(collection(db, 'follows'), where('followerId', '==', followerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserFollow);
  } catch (err) {
    console.error('Error getting following list:', err);
    return [];
  }
}

/**
 * Real-time listener for followers list.
 */
export function listenFollowersList(
  targetId: string,
  callback: (follows: UserFollow[]) => void
): () => void {
  if (!targetId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'follows'), where('targetId', '==', targetId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as UserFollow);
      callback(list);
    },
    (err) => {
      console.error('Error listening to followers list:', err);
      callback([]);
    }
  );
}

/**
 * Real-time listener for following list.
 */
export function listenFollowingList(
  followerId: string,
  callback: (follows: UserFollow[]) => void
): () => void {
  if (!followerId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'follows'), where('followerId', '==', followerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as UserFollow);
      callback(list);
    },
    (err) => {
      console.error('Error listening to following list:', err);
      callback([]);
    }
  );
}

/**
 * ==================== PROFILE PRIVACY & SAFETY (BLOCK, REPORT, RESTRICT) ====================
 */

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) return;
  const blockId = `${blockerId}_${blockedId}`;
  const blockRef = doc(db, 'blocks', blockId);
  await setDoc(blockRef, sanitizeFirestoreData({
    id: blockId,
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  }));
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId) return;
  const blockId = `${blockerId}_${blockedId}`;
  const blockRef = doc(db, 'blocks', blockId);
  await deleteDoc(blockRef);
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'blocks'), where('blockerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => (d.data() as UserBlock).blockedId);
  } catch (err) {
    console.error('Error getting blocked users:', err);
    return [];
  }
}

export async function reportUserOrContent(report: {
  reporterId: string;
  targetId: string;
  targetType: 'user' | 'post' | 'turf';
  reason: string;
  details?: string;
}): Promise<void> {
  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const reportRef = doc(db, 'reports', reportId);
  await setDoc(reportRef, sanitizeFirestoreData({
    id: reportId,
    ...report,
    createdAt: new Date().toISOString(),
  }));
}

export async function restrictUser(userId: string, restrictedId: string): Promise<void> {
  if (!userId || !restrictedId || userId === restrictedId) return;
  const restrictionId = `${userId}_${restrictedId}`;
  const restRef = doc(db, 'restrictions', restrictionId);
  await setDoc(restRef, sanitizeFirestoreData({
    id: restrictionId,
    userId,
    restrictedId,
    createdAt: new Date().toISOString(),
  }));
}

export async function unrestrictUser(userId: string, restrictedId: string): Promise<void> {
  if (!userId || !restrictedId) return;
  const restrictionId = `${userId}_${restrictedId}`;
  const restRef = doc(db, 'restrictions', restrictionId);
  await deleteDoc(restRef);
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    console.warn('Error fetching all users:', err);
    return [];
  }
}

export async function getUserControl(uid: string): Promise<UserControl> {
  try {
    const ref = doc(db, 'userControls', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserControl;
    }
  } catch (err) {
    console.warn('Error fetching user control:', err);
  }
  return {
    uid,
    userEmail: '',
    userName: '',
    role: 'PLAYER',
    playerProfileEnabled: true,
    ownerProfileEnabled: true,
    publicProfileVisible: true,
    venueProfileVisible: true,
    socialPostsEnabled: true,
    commentsEnabled: true,
    messagingEnabled: true,
    followersFollowingEnabled: true,
    communityParticipationEnabled: true,
    tournamentParticipationEnabled: true,
    bookingAllowed: true,
    tournamentOrganizerAccess: true,
    membershipAccess: true,
    offersAccess: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System',
  };
}

export async function saveUserControl(control: UserControl): Promise<void> {
  const ref = doc(db, 'userControls', control.uid);
  const payload = {
    ...control,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, sanitizeFirestoreData(payload), { merge: true });
}

export async function getAllUserControls(): Promise<UserControl[]> {
  try {
    const snap = await getDocs(collection(db, 'userControls'));
    return snap.docs.map((d) => d.data() as UserControl);
  } catch (err) {
    console.warn('Error fetching all user controls:', err);
    return [];
  }
}

export async function getGlobalFeatureControls(): Promise<GlobalFeatureControls> {
  try {
    const ref = doc(db, 'settings', 'globalFeatureControls');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as GlobalFeatureControls;
    }
  } catch (err) {
    console.warn('Error fetching global feature controls:', err);
  }
  return {
    id: 'global',
    playerProfilesEnabled: true,
    ownerProfilesEnabled: true,
    socialPostsEnabled: true,
    messagingEnabled: true,
    tournamentsEnabled: true,
    bookingsEnabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Super Admin',
  };
}

export async function saveGlobalFeatureControls(controls: GlobalFeatureControls): Promise<void> {
  const ref = doc(db, 'settings', 'globalFeatureControls');
  const payload = {
    ...controls,
    id: 'global',
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, sanitizeFirestoreData(payload), { merge: true });
}








