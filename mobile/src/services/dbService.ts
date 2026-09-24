import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Turf,
  Arena,
  Slot,
  Booking,
  PaymentTransaction,
  BookingPlayerShare,
  PlayerDue,
  PlayerPool,
  PoolInterestedPlayer,
  PaymentRecord,
  RefundRecord,
  FinancialLedgerEntry,
  PaymentMode,
  PaymentStatus,
  LobbyPlayer,
  MerchantWebhookEvent,
  MerchantProvider,
  TurfVerificationDetails,
  OwnerRealAnalytics,
  PricingConfig,
  OwnerSubscriptionPlan,
  OwnerSubscriptionStatus,
  SubscriptionSystemConfig,
  PlanFeatureConfig,
  DEFAULT_PLAN_FEATURES,
  PromotionalBanner,
  BannerAudience,
  CoachProfile,
  CoachBatch,
  CoachEnrollment,
  CoachVerificationStatus,
  CoachSubscription,
  CoachSubscriptionPlan,
} from '../types';

// Utility to clean undefined values before writing to Firestore
export function sanitizeData<T extends Record<string, any>>(data: T): T {
  const result: any = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const sanitizeFirestoreData = sanitizeData;

// ==================== TURFS ====================

export async function getTurfs(): Promise<Turf[]> {
  try {
    const colRef = collection(db, 'turfs');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));
    const filtered = list.filter((t) => {
      const isVerified = !t.verificationStatus || t.verificationStatus === 'verified' || t.verificationStatus === 'pending_verification' || t.verificationStatus === 'under_review';
      return isVerified && !t.isClosed;
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
  } catch (err) {
    console.warn('Error fetching turfs:', err);
    return [];
  }
}

export async function getTurfById(turfId: string): Promise<Turf | null> {
  try {
    const docRef = doc(db, 'turfs', turfId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Turf;
  } catch (err) {
    console.warn('Error fetching turf by id:', err);
    return null;
  }
}

export async function getOwnerTurfs(ownerId: string): Promise<Turf[]> {
  try {
    const colRef = collection(db, 'turfs');
    const q = query(colRef, where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));
  } catch (err) {
    console.warn('Error fetching owner turfs:', err);
    return [];
  }
}

export async function createTurf(turf: Omit<Turf, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newDocRef = doc(collection(db, 'turfs'));
  const now = new Date().toISOString();
  const payload = {
    ...turf,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeData(payload));
  return newDocRef.id;
}

export async function createTurfWithArenas(
  turf: Omit<Turf, 'id' | 'createdAt' | 'updatedAt'>,
  arenas: Omit<Arena, 'id' | 'turfId' | 'createdAt' | 'updatedAt'>[]
): Promise<string> {
  const newTurfDocRef = doc(collection(db, 'turfs'));
  const now = new Date().toISOString();
  const turfPayload = {
    ...turf,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newTurfDocRef, sanitizeData(turfPayload));

  for (const arenaData of arenas) {
    const newArenaDocRef = doc(collection(db, 'arenas'));
    const arenaPayload = {
      ...arenaData,
      turfId: newTurfDocRef.id,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(newArenaDocRef, sanitizeData(arenaPayload));
  }

  return newTurfDocRef.id;
}

// ==================== ARENAS ====================

export async function getArenasByTurf(turfId: string): Promise<Arena[]> {
  try {
    const colRef = collection(db, 'arenas');
    const q = query(colRef, where('turfId', '==', turfId), where('active', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Arena));
  } catch (err) {
    console.warn('Error fetching arenas:', err);
    return [];
  }
}

export async function getAllArenas(): Promise<Arena[]> {
  try {
    const colRef = collection(db, 'arenas');
    const snap = await getDocs(colRef);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Arena))
      .filter((a) => a.active !== false);
  } catch (err) {
    console.warn('Error fetching all arenas:', err);
    return [];
  }
}

export async function createArena(arena: Omit<Arena, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newDocRef = doc(collection(db, 'arenas'));
  const now = new Date().toISOString();
  const payload = {
    ...arena,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeData(payload));
  return newDocRef.id;
}

// ==================== SLOTS ====================

export function deduplicateSlots(slots: Slot[]): Slot[] {
  const map = new Map<string, Slot>();
  for (const s of slots) {
    if (!s.startTime) continue;
    const key = `${s.startTime}_${s.endTime || ''}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, s);
    } else {
      // Prioritize booked/locked slot over available slot
      const isExistingBooked = existing.status !== 'AVAILABLE' && existing.status !== 'FREE' && existing.status !== 'NONE';
      const isNewBooked = s.status !== 'AVAILABLE' && s.status !== 'FREE' && s.status !== 'NONE';
      if (!isExistingBooked && isNewBooked) {
        map.set(key, s);
      } else if (isExistingBooked === isNewBooked) {
        // Pick the one created/updated more recently
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const newTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
        if (newTime > existingTime) {
          map.set(key, s);
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getSlotsByArenaAndDate(arenaId: string, date: string): Promise<Slot[]> {
  try {
    const colRef = collection(db, 'slots');
    const q = query(colRef, where('arenaId', '==', arenaId), where('date', '==', date));
    const snap = await getDocs(q);
    const rawSlots = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
    return deduplicateSlots(rawSlots);
  } catch (err) {
    console.warn('Error fetching slots:', err);
    return [];
  }
}

export async function createSlot(slot: Omit<Slot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const newDocRef = doc(collection(db, 'slots'));
  const now = new Date().toISOString();
  const payload = {
    ...slot,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, sanitizeData(payload));
  return newDocRef.id;
}

export async function updateSlot(slotId: string, updates: Partial<Slot>): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function updateSlotPrice(slotId: string, newPrice: number): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await updateDoc(docRef, sanitizeData({
    price: newPrice,
    updatedAt: new Date().toISOString(),
  }));
}

export async function toggleSlotBlock(slotId: string, currentlyBlocked: boolean): Promise<void> {
  const docRef = doc(db, 'slots', slotId);
  await updateDoc(docRef, sanitizeData({
    status: currentlyBlocked ? 'AVAILABLE' : 'BLOCKED',
    updatedAt: new Date().toISOString(),
  }));
}

export async function batchGenerateSlots(
  turfId: string,
  arenaId: string,
  ownerId: string,
  date: string,
  startTime: string = '06:00',
  endTime: string = '23:00',
  slotDurationMinutes: number = 60,
  price: number = 1500
): Promise<void> {
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  const existing = await getSlotsByArenaAndDate(arenaId, date);
  const existingStartTimes = new Set(existing.map((s) => s.startTime));

  const now = new Date().toISOString();
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

  for (let h = startHour; h < endHour; h++) {
    const sTime = `${h.toString().padStart(2, '0')}:00`;
    const eTime = `${(h + 1).toString().padStart(2, '0')}:00`;

    if (!existingStartTimes.has(sTime)) {
      const newSlotRef = doc(collection(db, 'slots'));
      const slotPayload: Omit<Slot, 'id'> = {
        arenaId,
        turfId,
        ownerId,
        date,
        day: dayName,
        startTime: sTime,
        endTime: eTime,
        durationMinutes: slotDurationMinutes,
        price,
        status: 'AVAILABLE',
        bookingType: 'NONE',
        visibleToPlayers: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(newSlotRef, sanitizeData(slotPayload));
    }
  }
}

export async function batchGenerateMultiDaySlots(
  turfId: string,
  arenaId: string,
  ownerId: string,
  dates: string[],
  startTime: string = '06:00',
  endTime: string = '23:00',
  slotDurationMinutes: number = 60,
  price: number = 1500
): Promise<number> {
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  const stepHours = Math.max(1, Math.round(slotDurationMinutes / 60));
  let totalCreated = 0;
  const now = new Date().toISOString();

  for (const date of dates) {
    const existing = await getSlotsByArenaAndDate(arenaId, date);
    const existingStartTimes = new Set(existing.map((s) => s.startTime));
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    for (let h = startHour; h < endHour; h += stepHours) {
      const sTime = `${h.toString().padStart(2, '0')}:00`;
      const nextH = Math.min(24, h + stepHours);
      const eTime = `${nextH.toString().padStart(2, '0')}:00`;

      if (!existingStartTimes.has(sTime)) {
        const newSlotRef = doc(collection(db, 'slots'));
        const slotPayload: Omit<Slot, 'id'> = {
          arenaId,
          turfId,
          ownerId,
          date,
          day: dayName,
          startTime: sTime,
          endTime: eTime,
          durationMinutes: slotDurationMinutes,
          price,
          status: 'AVAILABLE',
          bookingType: 'NONE',
          visibleToPlayers: true,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(newSlotRef, sanitizeData(slotPayload));
        totalCreated++;
      }
    }
  }

  return totalCreated;
}

export async function toggleTurfClosure(
  turfId: string,
  isClosed: boolean,
  closureReason?: string,
  closureNotice?: string
): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await updateDoc(docRef, sanitizeData({
    isClosed,
    closureReason: closureReason || '',
    closureNotice: closureNotice || '',
    updatedAt: new Date().toISOString(),
  }));
}

export async function toggleArenaMaintenance(
  arenaId: string,
  isUnderMaintenance: boolean,
  maintenanceReason?: string
): Promise<void> {
  const docRef = doc(db, 'arenas', arenaId);
  await updateDoc(docRef, sanitizeData({
    isUnderMaintenance,
    maintenanceReason: maintenanceReason || '',
    updatedAt: new Date().toISOString(),
  }));
}

// ==================== RECURRING SLOTS & SQUAD PASSES ====================

export async function generateMobileRecurringSchedule(params: {
  ownerId: string;
  turfId: string;
  turfName: string;
  arenaId: string;
  arenaName: string;
  days: string[]; // e.g. ['Mon', 'Wed', 'Fri'] or ['Monday', 'Wednesday', 'Friday']
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  teamPassDiscountPercent?: number;
  allowTeamPassBooking?: boolean;
}): Promise<{ scheduleId: string; createdCount: number }> {
  const now = new Date().toISOString();
  const dayMap: Record<string, number> = {
    'Sunday': 0, 'Sun': 0,
    'Monday': 1, 'Mon': 1,
    'Tuesday': 2, 'Tue': 2,
    'Wednesday': 3, 'Wed': 3,
    'Thursday': 4, 'Thu': 4,
    'Friday': 5, 'Fri': 5,
    'Saturday': 6, 'Sat': 6,
  };

  const targetDayIndices = new Set(params.days.map((d) => dayMap[d] ?? -1).filter((idx) => idx !== -1));

  const start = new Date(params.startDate + 'T00:00:00');
  const end = new Date(params.endDate + 'T00:00:00');
  let createdCount = 0;

  // Query existing slots for arena to prevent collision
  const existingSlots = await getSlotsByArenaAndDate(params.arenaId, params.startDate);
  const qExisting = query(
    collection(db, 'slots'),
    where('arenaId', '==', params.arenaId),
    where('date', '>=', params.startDate),
    where('date', '<=', params.endDate)
  );
  const existingSnap = await getDocs(qExisting);
  const existingMap = new Map<string, Slot>();
  existingSnap.forEach((docSnap) => {
    const s = { id: docSnap.id, ...docSnap.data() } as Slot;
    existingMap.set(`${s.date}_${s.startTime}`, s);
  });

  const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (targetDayIndices.has(d.getDay())) {
      const dateStr = d.toISOString().split('T')[0];
      const slotKey = `${dateStr}_${params.startTime}`;
      const existing = existingMap.get(slotKey);

      if (existing) {
        if (existing.status === 'AVAILABLE') {
          // Update available slot price & recurring flag
          const slotRef = doc(db, 'slots', existing.id);
          await updateDoc(slotRef, sanitizeData({
            price: params.price,
            durationMinutes: params.durationMinutes,
            updatedAt: now,
          }));
          createdCount++;
        }
      } else {
        // Create new available slot
        const newSlotRef = doc(collection(db, 'slots'));
        const slotPayload: Omit<Slot, 'id'> = {
          arenaId: params.arenaId,
          turfId: params.turfId,
          ownerId: params.ownerId,
          date: dateStr,
          day: dayFullNames[d.getDay()],
          startTime: params.startTime,
          endTime: params.endTime,
          durationMinutes: params.durationMinutes,
          price: params.price,
          status: 'AVAILABLE',
          bookingType: 'NONE',
          visibleToPlayers: true,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(newSlotRef, sanitizeData(slotPayload));
        createdCount++;
      }
    }
  }

  // Create Recurring Slot Schedule Document
  const scheduleRef = doc(collection(db, 'recurringSchedules'));
  const schedulePayload = {
    id: scheduleRef.id,
    ownerId: params.ownerId,
    turfId: params.turfId,
    turfName: params.turfName,
    arenaId: params.arenaId,
    arenaName: params.arenaName,
    days: params.days,
    startDate: params.startDate,
    endDate: params.endDate,
    startTime: params.startTime,
    endTime: params.endTime,
    durationMinutes: params.durationMinutes,
    price: params.price,
    teamPassDiscountPercent: params.teamPassDiscountPercent || 15,
    allowTeamPassBooking: params.allowTeamPassBooking ?? true,
    visibleToPlayers: true,
    active: true,
    slotsGeneratedCount: createdCount,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(scheduleRef, sanitizeData(schedulePayload));

  return { scheduleId: scheduleRef.id, createdCount };
}

export async function getRecurringSchedules(turfId?: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'recurringSchedules');
    let q = query(colRef, where('active', '==', true));
    if (turfId) {
      q = query(colRef, where('turfId', '==', turfId), where('active', '==', true));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Error fetching recurring schedules:', err);
    return [];
  }
}

export async function bookSquadRecurringPassMobile(params: {
  captainId: string;
  captainName: string;
  captainPhone?: string;
  teamName: string;
  turfId: string;
  turfName: string;
  arenaId: string;
  arenaName: string;
  sport: string;
  startDate: string;
  endDate: string;
  days: string[];
  startTime: string;
  endTime: string;
  perSlotPrice: number;
  discountPercent: number;
  paymentMode: 'PAY_FULL' | 'PAY_PARTIAL' | 'PAY_LATER';
  upiTxnRef?: string;
}): Promise<{ squadPassId: string; bookedSlotsCount: number; totalAmount: number; totalPaid: number }> {
  const now = new Date().toISOString();
  const dayMap: Record<string, number> = {
    'Sunday': 0, 'Sun': 0,
    'Monday': 1, 'Mon': 1,
    'Tuesday': 2, 'Tue': 2,
    'Wednesday': 3, 'Wed': 3,
    'Thursday': 4, 'Thu': 4,
    'Friday': 5, 'Fri': 5,
    'Saturday': 6, 'Sat': 6,
  };

  const targetDayIndices = new Set(params.days.map((d) => dayMap[d] ?? -1).filter((idx) => idx !== -1));
  const start = new Date(params.startDate + 'T00:00:00');
  const end = new Date(params.endDate + 'T00:00:00');

  const matchDates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (targetDayIndices.has(d.getDay())) {
      matchDates.push(d.toISOString().split('T')[0]);
    }
  }

  if (matchDates.length === 0) {
    throw new Error('No match dates found in the selected range.');
  }

  const totalMatches = matchDates.length;
  const rawTotal = params.perSlotPrice * totalMatches;
  const discountAmount = Math.round((rawTotal * params.discountPercent) / 100);
  const totalAmount = Math.max(0, rawTotal - discountAmount);

  let amountPaid = 0;
  let amountDue = totalAmount;
  let paymentStatus: any = 'PENDING';

  if (params.paymentMode === 'PAY_FULL') {
    amountPaid = totalAmount;
    amountDue = 0;
    paymentStatus = 'PAID';
  } else if (params.paymentMode === 'PAY_PARTIAL') {
    amountPaid = Math.round(totalAmount * 0.3); // 30% advance for squad pass
    amountDue = totalAmount - amountPaid;
    paymentStatus = 'PARTIALLY_PAID';
  }

  const squadPassRef = doc(collection(db, 'squadPassBookings'));
  const bookingIds: string[] = [];
  const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Book each slot atomically or create booking records
  for (const mDate of matchDates) {
    const bookingRef = doc(collection(db, 'bookings'));
    const dObj = new Date(mDate + 'T00:00:00');
    const dayName = dayFullNames[dObj.getDay()];

    const bookingPayload: Booking = {
      id: bookingRef.id,
      bookingId: bookingRef.id,
      playerId: params.captainId,
      playerName: `${params.teamName} (Capt: ${params.captainName})`,
      playerEmail: '',
      playerPhone: params.captainPhone || '',
      ownerId: '',
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: '',
      turfArea: '',
      turfCity: '',
      arenaId: params.arenaId,
      arenaName: params.arenaName,
      sport: params.sport,
      slotId: `squad_pass_${squadPassRef.id}_${mDate}`,
      date: mDate,
      day: dayName,
      startTime: params.startTime,
      endTime: params.endTime,
      duration: 60,
      totalAmount: Math.round(totalAmount / totalMatches),
      amountPaid: Math.round(amountPaid / totalMatches),
      amountDue: Math.round(amountDue / totalMatches),
      paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: 'PLAYER',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(bookingRef, sanitizeData(bookingPayload));
    bookingIds.push(bookingRef.id);

    // Lock corresponding slot in Firestore for each match date
    try {
      const slotsCol = collection(db, 'slots');
      const qSlot = query(slotsCol, where('arenaId', '==', params.arenaId), where('date', '==', mDate), where('startTime', '==', params.startTime));
      const matchSnap = await getDocs(qSlot);
      if (!matchSnap.empty) {
        await updateDoc(doc(db, 'slots', matchSnap.docs[0].id), sanitizeData({
          status: 'BOOKED_BY_PLAYER',
          bookingType: 'PLAYER',
          bookedByPlayerId: params.captainId,
          bookedByPlayerName: params.teamName,
          activeBookingId: bookingRef.id,
          updatedAt: now,
        }));
      } else {
        const newSlotRef = doc(collection(db, 'slots'));
        await setDoc(newSlotRef, sanitizeData({
          arenaId: params.arenaId,
          turfId: params.turfId,
          ownerId: '',
          date: mDate,
          day: dayName,
          startTime: params.startTime,
          endTime: params.endTime,
          durationMinutes: 60,
          price: Math.round(totalAmount / totalMatches),
          status: 'BOOKED_BY_PLAYER',
          bookingType: 'PLAYER',
          bookedByPlayerId: params.captainId,
          bookedByPlayerName: params.teamName,
          activeBookingId: bookingRef.id,
          visibleToPlayers: true,
          createdAt: now,
          updatedAt: now,
        }));
      }
    } catch (spSlotErr) {
      console.warn('Error locking slot for squad pass match:', spSlotErr);
    }
  }

  const squadPassPayload = {
    id: squadPassRef.id,
    teamName: params.teamName,
    captainId: params.captainId,
    captainName: params.captainName,
    captainPhone: params.captainPhone,
    turfId: params.turfId,
    turfName: params.turfName,
    arenaId: params.arenaId,
    arenaName: params.arenaName,
    sport: params.sport,
    startDate: params.startDate,
    endDate: params.endDate,
    days: params.days,
    startTime: params.startTime,
    endTime: params.endTime,
    totalMatches,
    totalAmount,
    amountPaid,
    amountDue,
    discountApplied: discountAmount,
    paymentStatus,
    bookingStatus: 'CONFIRMED',
    bookingIds,
    createdAt: now,
  };

  await setDoc(squadPassRef, sanitizeData(squadPassPayload));

  return {
    squadPassId: squadPassRef.id,
    bookedSlotsCount: bookingIds.length,
    totalAmount,
    totalPaid: amountPaid,
  };
}


export async function updateTurf(turfId: string, updates: Partial<Turf>): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function checkTurfActiveBookings(turfId: string): Promise<{ activeCount: number; upcomingBookings: Booking[] }> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('turfId', '==', turfId),
      where('bookingStatus', '==', 'CONFIRMED')
    );
    const snap = await getDocs(q);
    const today = getLocalDateString(new Date());
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const upcomingBookings: Booking[] = [];
    snap.forEach((d) => {
      const b = { id: d.id, ...d.data() } as Booking;
      if (b.date > today) {
        upcomingBookings.push(b);
      } else if (b.date === today) {
        const endMinutes = parseTimeToMinutes(b.endTime || '23:59');
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
  try {
    const q = query(
      collection(db, 'bookings'),
      where('arenaId', '==', arenaId),
      where('bookingStatus', '==', 'CONFIRMED')
    );
    const snap = await getDocs(q);
    const today = getLocalDateString(new Date());
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const upcomingBookings: Booking[] = [];
    snap.forEach((d) => {
      const b = { id: d.id, ...d.data() } as Booking;
      if (b.date > today) {
        upcomingBookings.push(b);
      } else if (b.date === today) {
        const endMinutes = parseTimeToMinutes(b.endTime || '23:59');
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

export async function deleteTurf(turfId: string): Promise<void> {
  // 1. Delete associated slots
  try {
    const slotsQ = query(collection(db, 'slots'), where('turfId', '==', turfId));
    const slotsSnap = await getDocs(slotsQ);
    for (const sDoc of slotsSnap.docs) {
      await deleteDoc(doc(db, 'slots', sDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated slots:', err);
  }

  // 2. Delete associated arenas
  try {
    const arenasQ = query(collection(db, 'arenas'), where('turfId', '==', turfId));
    const arenasSnap = await getDocs(arenasQ);
    for (const aDoc of arenasSnap.docs) {
      await deleteDoc(doc(db, 'arenas', aDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated arenas:', err);
  }

  // 3. Delete turf doc
  const docRef = doc(db, 'turfs', turfId);
  await deleteDoc(docRef);
}

export async function deleteArena(arenaId: string): Promise<void> {
  // 1. Delete associated slots
  try {
    const slotsQ = query(collection(db, 'slots'), where('arenaId', '==', arenaId));
    const slotsSnap = await getDocs(slotsQ);
    for (const sDoc of slotsSnap.docs) {
      await deleteDoc(doc(db, 'slots', sDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated slots for arena:', err);
  }

  // 2. Delete arena doc
  const docRef = doc(db, 'arenas', arenaId);
  await deleteDoc(docRef);
}

export async function updateArena(arenaId: string, updates: Partial<Arena>): Promise<void> {
  const docRef = doc(db, 'arenas', arenaId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function updateTurfPaymentDetails(
  turfId: string,
  paymentData: { upiId?: string; beneficiaryName?: string; qrCodeUrl?: string }
): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await updateDoc(docRef, sanitizeData({
    ...paymentData,
    updatedAt: new Date().toISOString(),
  }));
}

export async function updateTurfPartnerPolicies(
  turfId: string,
  policies: Partial<Turf>
): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  await updateDoc(docRef, sanitizeData({
    ...policies,
    updatedAt: new Date().toISOString(),
  }));
}

// ==================== CANCELLATION & NO-SHOW POLICY ENGINE ====================

export interface CancellationBreakdown {
  hoursRemaining: number;
  isFreeCancellation: boolean;
  cutoffHours: number;
  penaltyFee: number;
  penaltyType: 'FLAT' | 'PERCENTAGE';
  penaltyRate: number;
  refundAmount: number;
  reversalAmount: number;
  originalPaid: number;
  originalDue: number;
  windowLabel: 'Free Cancellation Window' | 'Late Cancellation Window';
  policyDescription: string;
}

export function calculateCancellationBreakdown(
  booking: Booking,
  turfPolicy?: Partial<Turf>
): CancellationBreakdown {
  const cutoffHours = turfPolicy?.cancellationCutoffHours !== undefined ? turfPolicy.cancellationCutoffHours : 4;
  const penaltyType = turfPolicy?.lateCancellationPenaltyType || 'FLAT';
  const penaltyRate = turfPolicy?.lateCancellationPenaltyAmount !== undefined ? turfPolicy.lateCancellationPenaltyAmount : 150;

  // Calculate hours remaining until slot start
  let hoursRemaining = 0;
  try {
    const slotDate = booking.date || new Date().toISOString().split('T')[0];
    const slotStartTime = booking.startTime || '00:00';
    const targetIso = `${slotDate}T${slotStartTime.length === 5 ? slotStartTime : slotStartTime.padStart(5, '0')}:00`;
    const slotTimeMs = new Date(targetIso).getTime();
    const nowMs = Date.now();
    const diffMs = slotTimeMs - nowMs;
    hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));
  } catch {
    hoursRemaining = 0;
  }

  const isFreeCancellation = hoursRemaining >= cutoffHours;
  const originalPaid = booking.amountPaid || 0;
  const originalDue = booking.amountDue || 0;
  const totalAmount = booking.totalAmount || (originalPaid + originalDue) || 0;

  if (isFreeCancellation) {
    return {
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      isFreeCancellation: true,
      cutoffHours,
      penaltyFee: 0,
      penaltyType,
      penaltyRate,
      refundAmount: originalPaid,
      reversalAmount: originalDue,
      windowLabel: 'Free Cancellation Window',
      policyDescription: `Slot starts in ${Math.round(hoursRemaining)}h (≥ ${cutoffHours}h threshold). 100% full refund of ₹${originalPaid} and total due reversal of ₹${originalDue}.`,
      originalPaid,
      originalDue,
    };
  } else {
    // Late cancellation penalty calculation
    let calculatedPenalty = 0;
    if (penaltyType === 'PERCENTAGE') {
      calculatedPenalty = Math.round((totalAmount * penaltyRate) / 100);
    } else {
      calculatedPenalty = Math.min(totalAmount, penaltyRate);
    }

    let refundAmount = 0;
    if (originalPaid > 0) {
      refundAmount = Math.max(0, originalPaid - calculatedPenalty);
    }

    return {
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      isFreeCancellation: false,
      cutoffHours,
      penaltyFee: calculatedPenalty,
      penaltyType,
      penaltyRate,
      refundAmount,
      reversalAmount: Math.max(0, originalDue),
      windowLabel: 'Late Cancellation Window',
      policyDescription: `Slot starts in ${Math.round(hoursRemaining)}h (< ${cutoffHours}h cutoff). Enforced late cancellation penalty: ₹${calculatedPenalty}. Refund: ₹${refundAmount}.`,
      originalPaid,
      originalDue,
    };
  }
}

export async function cancelBookingWithSlotRelease(
  bookingId: string,
  cancelledBy: 'PLAYER' | 'OWNER' = 'PLAYER',
  cancellationReason?: string,
  slotId?: string,
  turfPolicyOverride?: Partial<Turf>
): Promise<CancellationBreakdown> {
  let computedBreakdown: CancellationBreakdown | null = null;

  await runTransaction(db, async (transaction) => {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await transaction.get(bookingDocRef);
    if (!bookingSnap.exists()) {
      throw new Error('Booking does not exist');
    }

    const bookingData = bookingSnap.data() as Booking;
    const targetSlotId = slotId || bookingData.slotId;
    const now = new Date().toISOString();

    // Check if game is already over - once game is over, cannot cancel!
    const todayStr = now.split('T')[0];
    const nowObj = new Date();
    const curHours = nowObj.getHours().toString().padStart(2, '0');
    const curMins = nowObj.getMinutes().toString().padStart(2, '0');
    const curTime = `${curHours}:${curMins}`;
    const isGameConcluded =
      bookingData.bookingStatus === 'COMPLETED' ||
      bookingData.date < todayStr ||
      (bookingData.date === todayStr && bookingData.endTime && curTime >= bookingData.endTime);

    if (isGameConcluded) {
      throw new Error('This match has already concluded. Concluded games cannot be cancelled.');
    }

    // Fetch turf policies if not passed
    let turfPolicy: Partial<Turf> = turfPolicyOverride || {};
    if (!turfPolicyOverride && bookingData.turfId) {
      const turfDocRef = doc(db, 'turfs', bookingData.turfId);
      const turfSnap = await transaction.get(turfDocRef);
      if (turfSnap.exists()) {
        turfPolicy = turfSnap.data() as Turf;
      }
    }

    // Owner cancellations always give 100% full refund with 0 penalty
    if (cancelledBy === 'OWNER') {
      const originalPaid = bookingData.amountPaid || 0;
      const originalDue = bookingData.amountDue || 0;
      computedBreakdown = {
        hoursRemaining: 0,
        isFreeCancellation: true,
        cutoffHours: 0,
        penaltyFee: 0,
        penaltyType: 'FLAT',
        penaltyRate: 0,
        refundAmount: originalPaid,
        reversalAmount: originalDue,
        windowLabel: 'Free Cancellation Window',
        policyDescription: 'Cancelled directly by Turf Partner desk - 100% full refund & due reversal.',
        originalPaid,
        originalDue,
      };
    } else {
      computedBreakdown = calculateCancellationBreakdown(bookingData, turfPolicy);
    }

    const breakdown: CancellationBreakdown = computedBreakdown || {
      hoursRemaining: 0,
      isFreeCancellation: true,
      cutoffHours: 0,
      penaltyFee: 0,
      penaltyType: 'FLAT',
      penaltyRate: 0,
      refundAmount: bookingData.amountPaid || 0,
      reversalAmount: bookingData.amountDue || 0,
      windowLabel: 'Free Cancellation Window',
      policyDescription: 'Standard cancellation',
      originalPaid: bookingData.amountPaid || 0,
      originalDue: bookingData.amountDue || 0,
    };

    const { refundAmount, penaltyFee, isFreeCancellation, hoursRemaining } = breakdown;
    const isPaid = (bookingData.amountPaid || 0) > 0;
    const finalDue = (computedBreakdown && !computedBreakdown.isFreeCancellation && !isPaid && penaltyFee > 0) ? penaltyFee : 0;
    const finalPaymentStatus = finalDue > 0 ? 'PENDING' : (isPaid ? (refundAmount > 0 ? 'REFUNDED' : 'PAID') : 'CANCELLED');

    // 1. Update booking status
    transaction.update(bookingDocRef, sanitizeData({
      bookingStatus: 'CANCELLED',
      cancelledBy,
      cancellationReason: cancellationReason || (cancelledBy === 'PLAYER' ? 'Cancelled by player' : 'Cancelled by turf partner'),
      cancelledAt: now,
      cancellationHoursBefore: hoursRemaining,
      cancellationFeeApplied: penaltyFee,
      refundAmount: refundAmount,
      refundStatus: refundAmount > 0 ? (isFreeCancellation ? 'REFUNDED' : 'PARTIAL_AFTER_PENALTY') : 'NONE',
      amountDue: finalDue,
      paymentStatus: finalPaymentStatus,
      updatedAt: now,
    }));

    // 2. If refund applicable, record in `refunds` & `financialLedgers`
    if (refundAmount > 0) {
      const refundDocRef = doc(collection(db, 'refunds'));
      const refundPayload: RefundRecord = {
        id: refundDocRef.id,
        bookingId,
        playerId: bookingData.playerId,
        playerName: bookingData.playerName,
        ownerId: bookingData.ownerId,
        turfId: bookingData.turfId,
        amount: refundAmount,
        reason: cancellationReason || (isFreeCancellation ? 'Free cancellation full refund' : `Late cancellation refund (₹${penaltyFee} penalty deducted)`),
        status: 'PROCESSED',
        createdAt: now,
      };
      transaction.set(refundDocRef, sanitizeData(refundPayload));

      const ledgerDocRef = doc(collection(db, 'financialLedgers'));
      const ledgerPayload: FinancialLedgerEntry = {
        id: ledgerDocRef.id,
        idempotencyKey: `cancel_refund_${bookingId}_${Date.now()}`,
        bookingId,
        bookingRef: bookingData.bookingId,
        slotId: bookingData.slotId,
        turfId: bookingData.turfId,
        turfName: bookingData.turfName,
        ownerId: bookingData.ownerId,
        playerId: bookingData.playerId,
        playerName: bookingData.playerName,
        type: isFreeCancellation ? 'REFUND_FULL' : 'REFUND_PARTIAL_AFTER_PENALTY',
        amount: refundAmount,
        penaltyAmount: penaltyFee,
        refundAmount: refundAmount,
        paymentMethod: 'SYSTEM_REVERSAL',
        status: 'SUCCESS',
        notes: `Cancellation processed (${breakdown.windowLabel}). Refund: ₹${refundAmount}, Penalty: ₹${penaltyFee}`,
        createdAt: now,
      };
      transaction.set(ledgerDocRef, sanitizeData(ledgerPayload));
    }

    // 3. Free up slot atomically
    if (targetSlotId) {
      const slotDocRef = doc(db, 'slots', targetSlotId);
      const slotSnap = await transaction.get(slotDocRef);
      if (slotSnap.exists()) {
        transaction.update(slotDocRef, sanitizeData({
          status: 'AVAILABLE',
          bookingType: 'NONE',
          bookedByPlayerId: null,
          bookedByPlayerName: null,
          activeBookingId: null,
          updatedAt: now,
        }));
      }
    }
  });

  // 4. Reverse or adjust dues
  try {
    const finalBreakdown = computedBreakdown as CancellationBreakdown | null;
    const duesQuery = query(collection(db, 'dues'), where('bookingId', '==', bookingId));
    const duesSnap = await getDocs(duesQuery);
    for (const dueDoc of duesSnap.docs) {
      const dueData = dueDoc.data() as PlayerDue;
      // If late cancellation with 0 paid, athlete owes penalty fee
      if (finalBreakdown && !finalBreakdown.isFreeCancellation && (dueData.amountPaid || 0) === 0 && finalBreakdown.penaltyFee > 0) {
        await updateDoc(doc(db, 'dues', dueDoc.id), sanitizeData({
          status: 'NO_SHOW_PENALTY',
          isPenaltyDue: true,
          remainingAmount: finalBreakdown.penaltyFee,
          notes: `Late cancellation penalty: ₹${finalBreakdown.penaltyFee}`,
          updatedAt: new Date().toISOString(),
        }));
      } else {
        await updateDoc(doc(db, 'dues', dueDoc.id), sanitizeData({
          status: 'CANCELLED_REVERSED',
          remainingAmount: 0,
          notes: `Booking cancelled (${finalBreakdown?.windowLabel || 'Reversed'})`,
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    // Cancel any squad split shares linked to this booking so they don't linger in pending dues
    const sharesQuery = query(collection(db, 'bookingShares'), where('bookingId', '==', bookingId));
    const sharesSnap = await getDocs(sharesQuery);
    for (const shareDoc of sharesSnap.docs) {
      await updateDoc(doc(db, 'bookingShares', shareDoc.id), sanitizeData({
        status: 'CANCELLED',
        amountDue: 0,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Error reversing dues for cancelled booking:', err);
  }

  return computedBreakdown || {
    hoursRemaining: 0,
    isFreeCancellation: true,
    cutoffHours: 0,
    penaltyFee: 0,
    penaltyType: 'FLAT',
    penaltyRate: 0,
    refundAmount: 0,
    reversalAmount: 0,
    windowLabel: 'Free Cancellation Window',
    policyDescription: 'Cancellation processed',
    originalPaid: 0,
    originalDue: 0,
  };
}

// ==================== NO-SHOW ENFORCEMENT ENGINE ====================

export async function markBookingNoShow(
  bookingId: string,
  ownerId: string,
  customPenaltyFee?: number,
  notes?: string
): Promise<number> {
  let penaltyFee = 0;
  await runTransaction(db, async (transaction) => {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await transaction.get(bookingDocRef);
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingSnap.data() as Booking;
    const now = new Date().toISOString();

    // Determine penalty fee
    if (customPenaltyFee !== undefined) {
      penaltyFee = customPenaltyFee;
    } else {
      const turfDocRef = doc(db, 'turfs', bookingData.turfId);
      const turfSnap = await transaction.get(turfDocRef);
      if (turfSnap.exists()) {
        const turfData = turfSnap.data() as Turf;
        penaltyFee = turfData.noShowPenaltyAmount || 200;
      } else {
        penaltyFee = 200;
      }
    }

    // 1. Mark booking as No-Show
    transaction.update(bookingDocRef, sanitizeData({
      isNoShow: true,
      noShowMarkedAt: now,
      noShowFee: penaltyFee,
      bookingStatus: 'CANCELLED',
      cancellationReason: 'Player marked Absent / No-Show by Turf Partner desk',
      updatedAt: now,
    }));

    // 2. Create / Update Player Due record for the penalty
    const dueDocRef = doc(collection(db, 'dues'));
    const dueRecord: PlayerDue = {
      id: dueDocRef.id,
      playerId: bookingData.playerId,
      playerName: bookingData.playerName,
      playerEmail: bookingData.playerEmail,
      playerPhone: bookingData.playerPhone,
      playerPhotoURL: bookingData.playerPhotoURL,
      ownerId: bookingData.ownerId,
      turfId: bookingData.turfId,
      turfName: bookingData.turfName,
      arenaName: bookingData.arenaName,
      sport: bookingData.sport,
      bookingId: bookingData.id,
      bookingRef: bookingData.bookingId,
      slotId: bookingData.slotId,
      date: bookingData.date,
      day: bookingData.day,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      totalAmount: penaltyFee,
      amountPaid: 0,
      remainingAmount: penaltyFee,
      status: 'NO_SHOW_PENALTY',
      isPenaltyDue: true,
      notes: notes || `No-Show penalty fee applied for missed slot at ${bookingData.turfName}`,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(dueDocRef, sanitizeData(dueRecord));

    // 3. Create immutable Financial Ledger Entry
    const ledgerDocRef = doc(collection(db, 'financialLedgers'));
    const ledgerPayload: FinancialLedgerEntry = {
      id: ledgerDocRef.id,
      idempotencyKey: `noshow_${bookingId}_${Date.now()}`,
      bookingId: bookingData.id,
      bookingRef: bookingData.bookingId,
      slotId: bookingData.slotId,
      turfId: bookingData.turfId,
      turfName: bookingData.turfName,
      ownerId: bookingData.ownerId,
      playerId: bookingData.playerId,
      playerName: bookingData.playerName,
      type: 'NO_SHOW_PENALTY',
      amount: penaltyFee,
      penaltyAmount: penaltyFee,
      dueAmount: penaltyFee,
      paymentMethod: 'SYSTEM_REVERSAL',
      status: 'SUCCESS',
      notes: notes || `No-Show penalty fee recorded for athlete ${bookingData.playerName}`,
      createdAt: now,
    };
    transaction.set(ledgerDocRef, sanitizeData(ledgerPayload));

    // 4. Free slot if still assigned
    if (bookingData.slotId) {
      const slotDocRef = doc(db, 'slots', bookingData.slotId);
      const slotSnap = await transaction.get(slotDocRef);
      if (slotSnap.exists()) {
        transaction.update(slotDocRef, sanitizeData({
          status: 'AVAILABLE',
          bookingType: 'NONE',
          bookedByPlayerId: null,
          bookedByPlayerName: null,
          activeBookingId: null,
          updatedAt: now,
        }));
      }
    }
  });

  return penaltyFee;
}

// ==================== BOOKING & CONCURRENCY TRANSACTION ====================

export interface CreateBookingParams {
  slotId: string;
  turfId: string;
  arenaId: string;
  ownerId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone?: string;
  playerPhotoURL?: string;
  turfName: string;
  turfAddress: string;
  turfArea: string;
  turfCity: string;
  turfLocationUrl?: string;
  arenaName: string;
  sport: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  bookingType: 'PLAYER' | 'OWNER';
  paymentMode?: PaymentMode;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF' | 'PAY_PARTIAL';
  customAdvanceAmount?: number;
  numberOfPlayers?: number;
  playerShareAmount?: number;
  convenienceFee?: number;
  ownerShare?: number;
  upiTxnRef?: string;
  merchantOrderRef?: string;
  bankUtr?: string;
  verificationSource?: 'MERCHANT_UPI_WEBHOOK' | 'MANUAL_SELF_REPORT' | 'CASH_VERIFIED';
  webhookVerifiedAt?: string;
}

export async function createBookingWithTransaction(params: CreateBookingParams): Promise<Booking> {
  const slotDocRef = doc(db, 'slots', params.slotId);

  const booking = await runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotDocRef);

    if (!slotSnap.exists()) {
      throw new Error('Slot does not exist');
    }

    const slotData = slotSnap.data() as Slot;

    // Check turf verification status & open state
    const turfDocRef = doc(db, 'turfs', params.turfId);
    const turfSnap = await transaction.get(turfDocRef);
    if (turfSnap.exists()) {
      const turfData = turfSnap.data() as Turf;
      if (turfData.verificationStatus === 'suspended' || turfData.verificationStatus === 'rejected') {
        throw new Error(`Venue "${turfData.name}" is currently ${String(turfData.verificationStatus).replace(/_/g, ' ')} and cannot accept player reservations.`);
      }
      if (turfData.isClosed) {
        throw new Error(`Venue "${turfData.name}" is temporarily closed: ${turfData.closureNotice || 'Maintenance in progress.'}`);
      }
    }

    // Prevent double booking
    if (slotData.status !== 'AVAILABLE') {
      throw new Error('This slot is no longer available. Please choose another slot.');
    }

    const newBookingRef = doc(collection(db, 'bookings'));
    const now = new Date().toISOString();
    const payAmount = params.playerShareAmount || params.totalAmount;

    // Determine payment mode
    const mode: PaymentMode =
      params.paymentMode ||
      (params.paymentMethod === 'PAY_NOW'
        ? 'PAY_FULL'
        : params.paymentMethod === 'PAY_PARTIAL'
        ? 'PAY_PARTIAL'
        : 'PAY_LATER');

    let amountPaid = 0;
    let amountDue = 0;
    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' = 'PENDING';

    if (mode === 'PAY_FULL') {
      amountPaid = payAmount;
      amountDue = 0;
      paymentStatus = 'PAID';
    } else if (mode === 'PAY_PARTIAL') {
      const minAdv = params.customAdvanceAmount || 100;
      amountPaid = Math.min(payAmount, Math.max(1, minAdv));
      amountDue = Math.max(0, payAmount - amountPaid);
      paymentStatus = amountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
    } else {
      // PAY_LATER
      amountPaid = 0;
      amountDue = payAmount;
      paymentStatus = 'PENDING';
    }

    const convenienceFee = params.convenienceFee || 0;
    const ownerShare = params.ownerShare !== undefined ? params.ownerShare : Math.max(0, params.totalAmount - convenienceFee);

    const bookingData: Booking = {
      id: newBookingRef.id,
      bookingId: `TRU-${Date.now().toString().slice(-6)}`,
      playerId: params.playerId,
      playerName: params.playerName,
      playerEmail: params.playerEmail,
      playerPhone: params.playerPhone,
      playerPhotoURL: params.playerPhotoURL,
      ownerId: params.ownerId,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress,
      turfArea: params.turfArea,
      turfCity: params.turfCity,
      turfLocationUrl: params.turfLocationUrl || (turfSnap.exists() ? (turfSnap.data() as Turf).locationUrl : '') || '',
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
      convenienceFee,
      ownerShare,
      numberOfPlayers: params.numberOfPlayers || 1,
      playerShareAmount: payAmount,
      amountPaid,
      amountDue,
      paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: params.bookingType,
      paymentMode: mode,
      paymentMethod: mode === 'PAY_FULL' ? 'PAY_NOW' : mode === 'PAY_PARTIAL' ? 'PAY_PARTIAL' : 'PAY_LATER_AT_TURF',
      advancePaid: amountPaid,
      dueAmount: amountDue,
      merchantOrderRef: params.merchantOrderRef,
      bankUtr: params.bankUtr || (params.verificationSource === 'MERCHANT_UPI_WEBHOOK' ? params.upiTxnRef : undefined),
      verificationSource: params.verificationSource || (params.upiTxnRef?.includes('BANK') || params.upiTxnRef?.includes('AUTO') ? 'MERCHANT_UPI_WEBHOOK' : 'MANUAL_SELF_REPORT'),
      webhookVerifiedAt: params.verificationSource === 'MERCHANT_UPI_WEBHOOK' ? now : undefined,
      whatsappNotificationSent: false,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Create booking doc
    transaction.set(newBookingRef, sanitizeData(bookingData));

    // 2. Mark slot as booked
    transaction.update(slotDocRef, sanitizeData({
      status: params.bookingType === 'PLAYER' ? 'BOOKED_BY_PLAYER' : 'BOOKED_BY_OWNER',
      bookingType: params.bookingType,
      bookedByPlayerId: params.playerId,
      bookedByPlayerName: params.playerName,
      activeBookingId: newBookingRef.id,
      updatedAt: now,
    }));

    // 3. Online Payment Record (Full or Partial Advance)
    if (amountPaid > 0) {
      const newPaymentDoc = doc(collection(db, 'payments'));
      const isWebhook = params.verificationSource === 'MERCHANT_UPI_WEBHOOK';
      const paymentRecord: PaymentRecord = {
        id: newPaymentDoc.id,
        paymentId: `PAY-${Date.now()}`,
        bookingId: newBookingRef.id,
        playerId: params.playerId,
        playerName: params.playerName,
        playerEmail: params.playerEmail,
        ownerId: params.ownerId,
        turfId: params.turfId,
        turfName: params.turfName,
        slotId: params.slotId,
        amount: amountPaid,
        currency: 'INR',
        paymentMethod: 'UPI',
        upiTxnRef: params.upiTxnRef || `UPI-${Date.now().toString().slice(-8)}`,
        gatewayTransactionId: params.bankUtr || params.upiTxnRef,
        status: 'SUCCESS',
        notes: isWebhook
          ? `Verified via Receiver Bank Webhook (OrderRef: ${params.merchantOrderRef || 'N/A'}, Bank UTR: ${params.bankUtr || params.upiTxnRef})`
          : mode === 'PAY_FULL'
          ? '100% Online UPI Payment'
          : `Online Partial Advance (₹${amountPaid})`,
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(newPaymentDoc, sanitizeData(paymentRecord));

      // Financial Ledger entry for the payment
      const ledgerDocRef = doc(collection(db, 'financialLedgers'));
      const ledgerEntry: FinancialLedgerEntry = {
        id: ledgerDocRef.id,
        idempotencyKey: `booking_${newBookingRef.id}_${mode.toLowerCase()}_${Date.now()}`,
        bookingId: newBookingRef.id,
        bookingRef: bookingData.bookingId,
        slotId: params.slotId,
        turfId: params.turfId,
        turfName: params.turfName,
        ownerId: params.ownerId,
        playerId: params.playerId,
        playerName: params.playerName,
        type: mode === 'PAY_FULL' ? 'PAY_FULL' : 'PAY_PARTIAL_ADVANCE',
        amount: amountPaid,
        advanceAmount: amountPaid,
        dueAmount: amountDue,
        convenienceFee,
        ownerShare,
        paymentMethod: 'UPI',
        upiTxnRef: paymentRecord.upiTxnRef,
        status: 'SUCCESS',
        notes: mode === 'PAY_FULL' ? 'Full online UPI settlement' : `Partial advance of ₹${amountPaid} paid online`,
        createdAt: now,
      };
      transaction.set(ledgerDocRef, sanitizeData(ledgerEntry));
    }

    // 4. If amountDue > 0 (Partial or Pay Later), create outstanding Due doc & ledger
    if (amountDue > 0) {
      const newDueDoc = doc(collection(db, 'dues'));
      const dueRecord: PlayerDue = {
        id: newDueDoc.id,
        playerId: params.playerId,
        playerName: params.playerName,
        playerEmail: params.playerEmail,
        playerPhone: params.playerPhone,
        playerPhotoURL: params.playerPhotoURL,
        ownerId: params.ownerId,
        turfId: params.turfId,
        turfName: params.turfName,
        arenaName: params.arenaName,
        sport: params.sport,
        bookingId: newBookingRef.id,
        bookingRef: bookingData.bookingId,
        slotId: params.slotId,
        date: params.date,
        day: params.day,
        startTime: params.startTime,
        endTime: params.endTime,
        totalAmount: payAmount,
        amountPaid,
        remainingAmount: amountDue,
        status: 'PENDING',
        notes: mode === 'PAY_PARTIAL' ? `Remaining balance after ₹${amountPaid} advance` : 'Pay Later at turf desk',
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(newDueDoc, sanitizeData(dueRecord));

      // Financial ledger entry for due creation
      const dueLedgerRef = doc(collection(db, 'financialLedgers'));
      const dueLedgerEntry: FinancialLedgerEntry = {
        id: dueLedgerRef.id,
        idempotencyKey: `due_creation_${newBookingRef.id}_${Date.now()}`,
        bookingId: newBookingRef.id,
        bookingRef: bookingData.bookingId,
        slotId: params.slotId,
        turfId: params.turfId,
        turfName: params.turfName,
        ownerId: params.ownerId,
        playerId: params.playerId,
        playerName: params.playerName,
        type: 'DUE_CREATED',
        amount: amountDue,
        dueAmount: amountDue,
        advanceAmount: amountPaid,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: `Balance due of ₹${amountDue} logged to player account`,
        createdAt: now,
      };
      transaction.set(dueLedgerRef, sanitizeData(dueLedgerEntry));
    }

    return bookingData;
  });

  // Dispatch In-App & Mobile Push Notification to owner & player
  try {
    const { notifyOwnerAndPlayerOnBooking } = await import('./pushNotificationService');
    notifyOwnerAndPlayerOnBooking(booking).catch((e) =>
      console.warn('Silent booking push dispatch notice:', e)
    );
  } catch (err) {
    console.warn('Could not dispatch booking notifications:', err);
  }

  return booking;
}

// ==================== DUES MANAGEMENT ====================

export function listenPlayerDues(playerId: string, callback: (dues: PlayerDue[]) => void): () => void {
  const colRef = collection(db, 'dues');
  const q = query(colRef, where('playerId', '==', playerId));
  return onSnapshot(q, (snap) => {
    const dues = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as PlayerDue))
      .filter((d) => d.status === 'PENDING' || d.status === 'PARTIAL')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(dues);
  }, (err) => {
    console.warn('Error in listenPlayerDues:', err);
    callback([]);
  });
}

export function listenOwnerDues(ownerId: string, callback: (dues: PlayerDue[]) => void): () => void {
  const colRef = collection(db, 'dues');
  const q = query(colRef, where('ownerId', '==', ownerId));
  return onSnapshot(q, (snap) => {
    const dues = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as PlayerDue))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(dues);
  }, (err) => {
    console.warn('Error in listenOwnerDues:', err);
    callback([]);
  });
}

export async function payPlayerDue(
  dueId: string,
  amountToPay: number,
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH' = 'UPI',
  upiTxnRef?: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const dueDocRef = doc(db, 'dues', dueId);
    const dueSnap = await transaction.get(dueDocRef);
    if (!dueSnap.exists()) {
      throw new Error('Due record not found');
    }

    const dueData = dueSnap.data() as PlayerDue;
    const now = new Date().toISOString();
    const newPaid = (dueData.amountPaid || 0) + amountToPay;
    const newRemaining = Math.max(0, (dueData.totalAmount || 0) - newPaid);
    const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    // 1. Update Due
    transaction.update(dueDocRef, sanitizeData({
      amountPaid: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      lastPaymentAt: now,
      updatedAt: now,
    }));

    // 2. Create Payment Record
    const paymentDocRef = doc(collection(db, 'payments'));
    const paymentRecord: PaymentRecord = {
      id: paymentDocRef.id,
      paymentId: `PAY-DUE-${Date.now()}`,
      dueId: dueData.id,
      bookingId: dueData.bookingId,
      playerId: dueData.playerId,
      playerName: dueData.playerName,
      playerEmail: dueData.playerEmail,
      ownerId: dueData.ownerId,
      turfId: dueData.turfId,
      turfName: dueData.turfName,
      slotId: dueData.slotId,
      amount: amountToPay,
      currency: 'INR',
      paymentMethod,
      upiTxnRef: upiTxnRef || `UPI-DUE-${Date.now().toString().slice(-8)}`,
      status: 'SUCCESS',
      notes: `Due settlement for booking ${dueData.bookingRef || dueData.bookingId}`,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(paymentDocRef, sanitizeData(paymentRecord));

    // 3. Create immutable Financial Ledger Entry for the settlement
    const ledgerDocRef = doc(collection(db, 'financialLedgers'));
    const ledgerEntry: FinancialLedgerEntry = {
      id: ledgerDocRef.id,
      idempotencyKey: `due_settle_${dueData.id}_${Date.now()}`,
      bookingId: dueData.bookingId || '',
      bookingRef: dueData.bookingRef,
      slotId: dueData.slotId,
      turfId: dueData.turfId,
      turfName: dueData.turfName,
      ownerId: dueData.ownerId,
      playerId: dueData.playerId,
      playerName: dueData.playerName,
      type: paymentMethod === 'CASH' ? 'DUE_SETTLED_CASH' : 'DUE_SETTLED_UPI',
      amount: amountToPay,
      dueAmount: newRemaining,
      paymentMethod: paymentMethod === 'CASH' ? 'CASH' : 'UPI',
      upiTxnRef: paymentRecord.upiTxnRef,
      status: 'SUCCESS',
      notes: `Due balance payment of ₹${amountToPay} via ${paymentMethod}`,
      createdAt: now,
    };
    transaction.set(ledgerDocRef, sanitizeData(ledgerEntry));

    // 4. If linked to booking, update booking paymentStatus
    if (dueData.bookingId) {
      const bookingDocRef = doc(db, 'bookings', dueData.bookingId);
      const bookingSnap = await transaction.get(bookingDocRef);
      if (bookingSnap.exists()) {
        const bData = bookingSnap.data() as Booking;
        const bPaid = (bData.amountPaid || 0) + amountToPay;
        const bDue = Math.max(0, (bData.totalAmount || 0) - bPaid);
        const bCounter = (bData.counterAmountPaid || 0) + (paymentMethod === 'CASH' ? amountToPay : 0);
        transaction.update(bookingDocRef, sanitizeData({
          amountPaid: bPaid,
          amountDue: bDue,
          counterAmountPaid: bCounter,
          paymentStatus: bDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
          updatedAt: now,
        }));
      }
    }
  });

  // Post-transaction fallback: sync booking if ID was human-readable, and clear slot dues
  try {
    const dueDoc = await getDoc(doc(db, 'dues', dueId));
    if (dueDoc.exists()) {
      const dData = dueDoc.data() as PlayerDue;
      let resolvedBookingDocId = dData.bookingId;
      if (dData.bookingId) {
        const bDirectSnap = await getDoc(doc(db, 'bookings', dData.bookingId));
        if (!bDirectSnap.exists()) {
          const qB = query(collection(db, 'bookings'), where('bookingId', '==', dData.bookingId), limit(1));
          const sB = await getDocs(qB);
          if (!sB.empty) {
            resolvedBookingDocId = sB.docs[0].id;
            const bD = sB.docs[0].data() as Booking;
            const bPaid = (bD.amountPaid || 0) + amountToPay;
            const bDue = Math.max(0, (bD.totalAmount || 0) - bPaid);
            await updateDoc(sB.docs[0].ref, sanitizeData({
              amountPaid: bPaid,
              amountDue: bDue,
              paymentStatus: bDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
              updatedAt: new Date().toISOString(),
            }));
          }
        }
      }

      await clearAllDuesForBookingAndSlot(
        resolvedBookingDocId,
        dData.bookingRef,
        dData.slotId,
        amountToPay,
        (dData.remainingAmount || 0) <= 0
      );
    }
  } catch (err) {
    console.warn('Error in payPlayerDue post-sync:', err);
  }
}

export async function payAllPlayerDues(
  dues: PlayerDue[],
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH' = 'UPI',
  upiTxnRef?: string
): Promise<void> {
  for (const due of dues) {
    if (due.remainingAmount > 0) {
      await payPlayerDue(due.id, due.remainingAmount, paymentMethod, upiTxnRef);
    }
  }
}

export async function settleDueByOwner(dueId: string, notes?: string): Promise<void> {
  const dueDocRef = doc(db, 'dues', dueId);
  const snap = await getDoc(dueDocRef);
  if (!snap.exists()) return;
  const dueData = snap.data() as PlayerDue;
  await payPlayerDue(dueId, dueData.remainingAmount, 'CASH', notes || 'Cash settled at turf desk');
}

// ==================== FINANCIAL LEDGER LISTENERS ====================

export function listenOwnerFinancialLedger(
  ownerId: string,
  callback: (entries: FinancialLedgerEntry[]) => void
): () => void {
  const colRef = collection(db, 'financialLedgers');
  const q = query(colRef, where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FinancialLedgerEntry))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(entries);
    },
    (err) => {
      console.warn('Error in listenOwnerFinancialLedger:', err);
      callback([]);
    }
  );
}

export function listenPlayerFinancialLedger(
  playerId: string,
  callback: (entries: FinancialLedgerEntry[]) => void
): () => void {
  const colRef = collection(db, 'financialLedgers');
  const q = query(colRef, where('playerId', '==', playerId));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FinancialLedgerEntry))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(entries);
    },
    (err) => {
      console.warn('Error in listenPlayerFinancialLedger:', err);
      callback([]);
    }
  );
}

// ==================== "I'M OUT" / LEAVE LOBBY OR BOOKING ====================

export async function leaveLobbyOrBooking(
  lobbyId: string,
  playerId: string,
  playerName?: string
): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyDocRef);
  if (!lobbySnap.exists()) return;

  const lobbyData = lobbySnap.data();

  // Prevent leaving without playing if match is already live or concluded
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const curHours = now.getHours().toString().padStart(2, '0');
  const curMins = now.getMinutes().toString().padStart(2, '0');
  const curTime = `${curHours}:${curMins}`;

  const isLiveOrOver =
    lobbyData.status === 'MATCH_STARTED' ||
    lobbyData.status === 'COMPLETED' ||
    (lobbyData.date && lobbyData.date < todayStr) ||
    (lobbyData.date === todayStr && lobbyData.startTime && curTime >= lobbyData.startTime);

  if (isLiveOrOver) {
    throw new Error('This match has already started or concluded. Athletes cannot leave the lobby without playing.');
  }

  const newCount = Math.max(1, (lobbyData.currentPlayers || 1) - 1);

  // 1. Remove player from lobby
  await updateDoc(lobbyDocRef, sanitizeData({
    currentPlayers: newCount,
    status: newCount < (lobbyData.maxPlayers || 10) ? 'OPEN' : lobbyData.status,
    updatedAt: new Date().toISOString(),
  }));

  // 2. Remove lobby player doc
  const lobbyPlayerQuery = query(
    collection(db, 'lobbyPlayers'),
    where('lobbyId', '==', lobbyId),
    where('uid', '==', playerId)
  );
  const lpSnap = await getDocs(lobbyPlayerQuery);
  for (const docItem of lpSnap.docs) {
    await deleteDoc(doc(db, 'lobbyPlayers', docItem.id));
  }

  // 3. If player had a pending due for this lobby booking, cancel / reverse it
  if (lobbyData.bookingId) {
    const duesQuery = query(
      collection(db, 'dues'),
      where('bookingId', '==', lobbyData.bookingId),
      where('playerId', '==', playerId)
    );
    const dueSnap = await getDocs(duesQuery);
    for (const d of dueSnap.docs) {
      await updateDoc(doc(db, 'dues', d.id), sanitizeData({
        status: 'CANCELLED_REVERSED',
        remainingAmount: 0,
        notes: `Player selected I'm Out`,
        updatedAt: new Date().toISOString(),
      }));
    }
  }
}

// ==================== PLAYER POOLS (INTEREST POOLS) ====================

export async function createPlayerPool(
  poolData: Omit<PlayerPool, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'interestedPlayers' | 'currentPlayersCount'>
): Promise<string> {
  const newDocRef = doc(collection(db, 'playerPools'));
  const now = new Date().toISOString();
  const creatorPlayer: PoolInterestedPlayer = {
    uid: poolData.creatorId,
    name: poolData.creatorName,
    phone: poolData.creatorPhone,
    photoURL: poolData.creatorPhotoURL,
    joinedAt: now,
  };

  const payload: PlayerPool = {
    ...poolData,
    id: newDocRef.id,
    status: 'OPEN',
    currentPlayersCount: 1,
    interestedPlayers: [creatorPlayer],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, sanitizeData(payload));
  return newDocRef.id;
}

export function listenOpenPlayerPools(callback: (pools: PlayerPool[]) => void): () => void {
  const colRef = collection(db, 'playerPools');
  const q = query(colRef, where('status', '==', 'OPEN'));
  return onSnapshot(q, (snap) => {
    const pools = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as PlayerPool))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(pools);
  }, (err) => {
    console.warn('Error in listenOpenPlayerPools:', err);
    callback([]);
  });
}

export async function joinPlayerPool(poolId: string, player: PoolInterestedPlayer): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(poolRef);
    if (!snap.exists()) throw new Error('Pool does not exist');
    const pool = snap.data() as PlayerPool;
    const existing = pool.interestedPlayers || [];
    if (existing.some((p) => p.uid === player.uid)) {
      return; // Already in pool
    }
    const updatedPlayers = [...existing, player];
    transaction.update(poolRef, sanitizeData({
      interestedPlayers: updatedPlayers,
      currentPlayersCount: updatedPlayers.length,
      updatedAt: new Date().toISOString(),
    }));
  });
}

export async function leavePlayerPool(poolId: string, uid: string): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(poolRef);
    if (!snap.exists()) return;
    const pool = snap.data() as PlayerPool;
    const updatedPlayers = (pool.interestedPlayers || []).filter((p) => p.uid !== uid);
    transaction.update(poolRef, sanitizeData({
      interestedPlayers: updatedPlayers,
      currentPlayersCount: updatedPlayers.length,
      updatedAt: new Date().toISOString(),
    }));
  });
}

export async function deletePlayerPool(poolId: string): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  await deleteDoc(poolRef);
}

// Convert Pool to Real Lobby + Booking
export async function convertPoolToLobby(
  poolId: string,
  bookingParams: CreateBookingParams
): Promise<{ booking: Booking; lobbyId: string }> {
  // 1. Create slot booking
  const booking = await createBookingWithTransaction(bookingParams);

  // 2. Create lobby
  const poolDocRef = doc(db, 'playerPools', poolId);
  const poolSnap = await getDoc(poolDocRef);
  const poolData = poolSnap.exists() ? (poolSnap.data() as PlayerPool) : null;

  const newLobbyRef = doc(collection(db, 'lobbies'));
  const now = new Date().toISOString();
  const interested = poolData?.interestedPlayers || [];

  const lobbyData = {
    id: newLobbyRef.id,
    name: `${bookingParams.sport} Match - ${bookingParams.turfName}`,
    sport: bookingParams.sport,
    turfId: bookingParams.turfId,
    turfName: bookingParams.turfName,
    turfAddress: bookingParams.turfAddress,
    turfCity: bookingParams.turfCity,
    arenaId: bookingParams.arenaId,
    arenaName: bookingParams.arenaName,
    bookingId: booking.id,
    slotId: bookingParams.slotId,
    hostId: bookingParams.playerId,
    hostName: bookingParams.playerName,
    hostPhotoURL: bookingParams.playerPhotoURL || '',
    date: bookingParams.date,
    day: bookingParams.day,
    startTime: bookingParams.startTime,
    endTime: bookingParams.endTime,
    maxPlayers: poolData?.requiredPlayers || 10,
    minPlayers: 4,
    currentPlayers: interested.length || 1,
    pricePerPlayer: Math.round(bookingParams.totalAmount / (poolData?.requiredPlayers || 10)),
    description: poolData?.description || 'Converted from Player Pool',
    isPublic: true,
    allowNewPlayers: true,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newLobbyRef, sanitizeData(lobbyData));

  // Migrate interested players to lobbyPlayers
  for (const p of interested) {
    const isHost = p.uid === bookingParams.playerId;
    const lpRef = doc(collection(db, 'lobbyPlayers'));
    await setDoc(lpRef, sanitizeData({
      id: lpRef.id,
      lobbyId: newLobbyRef.id,
      uid: p.uid,
      playerName: p.name,
      playerPhotoURL: p.photoURL || '',
      isHost,
      paymentMethod: isHost ? bookingParams.paymentMethod : 'PAY_LATER_AT_TURF',
      paymentStatus: isHost && bookingParams.paymentMethod === 'PAY_NOW' ? 'PAID' : 'DUE',
      amountDue: lobbyData.pricePerPlayer,
      amountPaid: isHost && bookingParams.paymentMethod === 'PAY_NOW' ? lobbyData.pricePerPlayer : 0,
      joinedAt: now,
    }));
  }

  // Update Pool status to CONVERTED
  await updateDoc(poolDocRef, sanitizeData({
    status: 'CONVERTED_TO_LOBBY',
    convertedLobbyId: newLobbyRef.id,
    convertedBookingId: booking.id,
    updatedAt: now,
  }));

  return { booking, lobbyId: newLobbyRef.id };
}

// ==================== REAL-TIME LISTENERS ====================

export function listenPlayerBookings(playerId: string, callback: (bookings: Booking[]) => void): () => void {
  const colRef = collection(db, 'bookings');
  const q = query(colRef, where('playerId', '==', playerId));
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Booking))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(bookings);
  }, (err) => {
    console.warn('Error in listenPlayerBookings:', err);
    callback([]);
  });
}

export function listenOwnerBookings(ownerId: string, callback: (bookings: Booking[]) => void): () => void {
  const colRef = collection(db, 'bookings');
  const q = query(colRef, where('ownerId', '==', ownerId));
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Booking))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(bookings);
  }, (err) => {
    console.warn('Error in listenOwnerBookings:', err);
    callback([]);
  });
}

export function listenArenaSlots(arenaId: string, date: string, callback: (slots: Slot[]) => void): () => void {
  const colRef = collection(db, 'slots');
  const q = query(colRef, where('arenaId', '==', arenaId), where('date', '==', date));
  return onSnapshot(q, (snap) => {
    const rawSlots = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
    callback(deduplicateSlots(rawSlots));
  }, (err) => {
    console.warn('Error in listenArenaSlots:', err);
    callback([]);
  });
}

// ==================== PLAYER BOOKINGS & PAYMENTS ====================

export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  try {
    const colRef = collection(db, 'bookings');
    const q = query(colRef, where('playerId', '==', playerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch {
    const colRef = collection(db, 'bookings');
    const q = query(colRef, where('playerId', '==', playerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  }
}

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  try {
    const colRef = collection(db, 'bookings');
    const q = query(colRef, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch {
    const colRef = collection(db, 'bookings');
    const q = query(colRef, where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(tStr?: string): number {
  if (!tStr) return 0;
  let str = tStr.trim();

  // If time range is provided (e.g. "06:00 PM - 07:00 PM"), extract the final time
  if (str.includes(' - ')) {
    const segments = str.split(' - ');
    str = segments[segments.length - 1].trim();
  }

  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);

  // Strip non-digit and non-colon characters
  const clean = str.replace(/[^\d:]/g, '');
  const colonParts = clean.split(':');
  let h = parseInt(colonParts[0], 10) || 0;
  const m = parseInt(colonParts[1] || '0', 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

export function isBookingConcluded(booking: {
  date: string;
  startTime?: string;
  endTime?: string;
  bookingStatus?: string;
}): boolean {
  if (!booking) return false;
  const statusUpper = (booking.bookingStatus || '').toUpperCase();
  if (
    statusUpper === 'COMPLETED' ||
    statusUpper === 'CLOSED' ||
    statusUpper === 'CONCLUDED' ||
    statusUpper === 'MATCH_CONCLUDED' ||
    statusUpper === 'OVER' ||
    statusUpper === 'FINISHED'
  ) {
    return true;
  }
  if (statusUpper === 'CANCELLED') return false;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (booking.date < todayStr) return true;
  if (booking.date > todayStr) return false;

  // Today: check if current time has passed the booking endTime
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const endMin = parseTimeToMinutes(booking.endTime || '23:59');
  return curMinutes >= endMin;
}

export async function updateBookingStatus(bookingId: string, updates: Partial<Booking>): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

// ==================== SQUAD SPLIT PAYMENTS & PLAYER MANAGEMENT ====================

export async function getBookingShares(bookingId: string): Promise<BookingPlayerShare[]> {
  try {
    const colRef = collection(db, 'bookingShares');
    const q = query(colRef, where('bookingId', '==', bookingId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BookingPlayerShare))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (err) {
    console.warn('Error getting booking shares:', err);
    return [];
  }
}

export function listenBookingShares(bookingId: string, callback: (shares: BookingPlayerShare[]) => void): () => void {
  const colRef = collection(db, 'bookingShares');
  const q = query(colRef, where('bookingId', '==', bookingId));
  return onSnapshot(q, (snap) => {
    const shares = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BookingPlayerShare))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(shares);
  }, (err) => {
    console.warn('Error in listenBookingShares:', err);
    callback([]);
  });
}

export async function addBookingPlayerShare(
  booking: Booking,
  player: {
    playerName: string;
    playerEmail?: string;
    playerPhone?: string;
    playerPhotoURL?: string;
    shareAmount?: number;
    status?: PaymentStatus;
  }
): Promise<BookingPlayerShare> {
  const now = new Date().toISOString();
  const shareDocRef = doc(collection(db, 'bookingShares'));
  
  const currentPlayers = (booking.numberOfPlayers || 1) + 1;
  const recalculatedShare = Math.round(booking.totalAmount / currentPlayers);
  const finalShareAmount = player.shareAmount || recalculatedShare;

  const newShare: BookingPlayerShare = {
    id: shareDocRef.id,
    bookingId: booking.id,
    turfId: booking.turfId,
    ownerId: booking.ownerId,
    playerId: `SQUAD-${Date.now().toString().slice(-6)}`,
    playerName: player.playerName.trim(),
    playerEmail: player.playerEmail || '',
    playerPhotoURL: player.playerPhotoURL || null,
    shareAmount: finalShareAmount,
    amountPaid: player.status === 'PAID' ? finalShareAmount : 0,
    amountDue: player.status === 'PAID' ? 0 : finalShareAmount,
    status: player.status || 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(shareDocRef, sanitizeData(newShare));

  // Update booking player count and share
  await updateDoc(doc(db, 'bookings', booking.id), sanitizeData({
    numberOfPlayers: currentPlayers,
    playerShareAmount: recalculatedShare,
    updatedAt: now,
  }));

  return newShare;
}

export async function updateBookingShareStatus(
  shareId: string,
  status: PaymentStatus,
  amountPaid?: number
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, 'bookingShares', shareId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const current = snap.data() as BookingPlayerShare;

  const paid = amountPaid !== undefined ? amountPaid : (status === 'PAID' ? current.shareAmount : 0);
  const due = Math.max(0, current.shareAmount - paid);

  await updateDoc(docRef, sanitizeData({
    status,
    amountPaid: paid,
    amountDue: due,
    lastPaymentAt: status === 'PAID' ? now : current.lastPaymentAt,
    updatedAt: now,
  }));
}

export async function removeBookingPlayerShare(bookingId: string, shareId: string): Promise<void> {
  const now = new Date().toISOString();
  await deleteDoc(doc(db, 'bookingShares', shareId));

  const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
  if (bookingDoc.exists()) {
    const bData = bookingDoc.data() as Booking;
    const newCount = Math.max(1, (bData.numberOfPlayers || 2) - 1);
    const newShare = Math.round(bData.totalAmount / newCount);
    await updateDoc(doc(db, 'bookings', bookingId), sanitizeData({
      numberOfPlayers: newCount,
      playerShareAmount: newShare,
      updatedAt: now,
    }));
  }
}

export async function updateBookingSplitSquad(
  bookingId: string,
  newPlayerCount: number
): Promise<{ playerShare: number }> {
  const now = new Date().toISOString();
  const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
  if (!bookingDoc.exists()) throw new Error('Booking not found');

  const bData = bookingDoc.data() as Booking;
  const count = Math.max(1, newPlayerCount);
  const newShare = Math.round(bData.totalAmount / count);

  await updateDoc(doc(db, 'bookings', bookingId), sanitizeData({
    numberOfPlayers: count,
    playerShareAmount: newShare,
    updatedAt: now,
  }));

  return { playerShare: newShare };
}

export async function createManualBooking(params: {
  turfId: string;
  arenaId: string;
  ownerId: string;
  turfName: string;
  turfAddress?: string;
  turfArea?: string;
  turfCity?: string;
  arenaName: string;
  sport: string;
  playerName: string;
  playerPhone?: string;
  playerEmail?: string;
  date: string;
  day?: string;
  startTime: string;
  endTime: string;
  duration?: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  paymentMethod?: 'CASH' | 'COUNTER_UPI' | 'PAY_LATER_AT_TURF' | string;
  slotId?: string;
  notes?: string;
}): Promise<string> {
  const newBookingRef = doc(collection(db, 'bookings'));
  const now = new Date().toISOString();
  let resolvedSlotId = params.slotId || '';

  // 1. Process & Lock Slot in Firebase Firestore
  try {
    if (resolvedSlotId) {
      const slotDocRef = doc(db, 'slots', resolvedSlotId);
      const sSnap = await getDoc(slotDocRef);
      if (sSnap.exists()) {
        await updateDoc(slotDocRef, sanitizeData({
          status: 'BOOKED_BY_OWNER',
          bookingType: 'OWNER',
          bookedByPlayerName: params.playerName?.trim() || 'Walk-in Guest',
          activeBookingId: newBookingRef.id,
          updatedAt: now,
        }));
      }
    } else {
      // Find matching slot or create a new slot in Firestore
      const slotsCol = collection(db, 'slots');
      const q = query(
        slotsCol,
        where('arenaId', '==', params.arenaId),
        where('date', '==', params.date),
        where('startTime', '==', params.startTime)
      );
      const matchSnap = await getDocs(q);

      if (!matchSnap.empty) {
        const existingSlotDoc = matchSnap.docs[0];
        resolvedSlotId = existingSlotDoc.id;
        await updateDoc(doc(db, 'slots', resolvedSlotId), sanitizeData({
          status: 'BOOKED_BY_OWNER',
          bookingType: 'OWNER',
          bookedByPlayerName: params.playerName?.trim() || 'Walk-in Guest',
          activeBookingId: newBookingRef.id,
          updatedAt: now,
        }));
        // Clean up any extra duplicate slot documents in Firestore
        for (let i = 1; i < matchSnap.docs.length; i++) {
          try {
            await deleteDoc(doc(db, 'slots', matchSnap.docs[i].id));
          } catch (delErr) {
            console.warn('Error deleting duplicate slot doc:', delErr);
          }
        }
      } else {
        // Create new slot document in Firebase so players see it as booked
        const newSlotRef = doc(collection(db, 'slots'));
        resolvedSlotId = newSlotRef.id;
        const newSlotData: Partial<Slot> = {
          id: newSlotRef.id,
          turfId: params.turfId,
          arenaId: params.arenaId,
          ownerId: params.ownerId,
          arenaName: params.arenaName,
          sport: params.sport,
          date: params.date,
          day: params.day || 'Scheduled',
          startTime: params.startTime,
          endTime: params.endTime,
          price: params.totalAmount,
          status: 'BOOKED_BY_OWNER',
          bookingType: 'OWNER',
          bookedByPlayerName: params.playerName?.trim() || 'Walk-in Guest',
          activeBookingId: newBookingRef.id,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(newSlotRef, sanitizeData(newSlotData));
      }
    }
  } catch (err) {
    console.warn('Warning updating slot in Firestore for manual booking:', err);
  }

  const payStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' =
    params.paymentStatus ||
    (params.amountDue === 0 ? 'PAID' : params.amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING');

  const bookingData: Booking = {
    id: newBookingRef.id,
    bookingId: `WALK-${Date.now().toString().slice(-6)}`,
    playerId: 'WALK_IN_GUEST',
    playerName: params.playerName?.trim() || 'Walk-in Guest',
    playerEmail: params.playerEmail || '',
    playerPhone: params.playerPhone || '',
    ownerId: params.ownerId,
    turfId: params.turfId,
    turfName: params.turfName,
    turfAddress: params.turfAddress || '',
    turfArea: params.turfArea || '',
    turfCity: params.turfCity || '',
    arenaId: params.arenaId,
    arenaName: params.arenaName,
    sport: params.sport,
    slotId: resolvedSlotId,
    date: params.date,
    day: params.day || 'Scheduled',
    startTime: params.startTime,
    endTime: params.endTime,
    duration: params.duration || 60,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid || 0,
    amountDue: params.amountDue || 0,
    paymentStatus: payStatus,
    bookingStatus: 'CONFIRMED',
    bookingType: 'OWNER',
    paymentMethod: params.paymentMethod || (payStatus === 'PAID' ? 'CASH' : 'PAY_LATER_AT_TURF'),
    paymentMode: payStatus === 'PAID' ? 'PAY_FULL' : params.amountPaid > 0 ? 'PAY_PARTIAL' : 'PAY_LATER',
    advancePaid: params.amountPaid || 0,
    dueAmount: params.amountDue || 0,
    counterAmountPaid: params.amountPaid || 0,
    counterPaymentMethod: params.paymentMethod || 'CASH',
    counterCollectedAt: params.amountPaid > 0 ? now : undefined,
    notes: params.notes || 'Walk-in desk booking registered by arena manager',
    whatsappNotificationSent: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newBookingRef, sanitizeData(bookingData));

  // 2. Record Payment Entry in Firestore if amountPaid > 0
  if ((params.amountPaid || 0) > 0) {
    try {
      const paymentRef = doc(collection(db, 'payments'));
      const pRecord: PaymentRecord = {
        id: paymentRef.id,
        paymentId: `PAY-${Date.now()}`,
        bookingId: newBookingRef.id,
        playerId: 'WALK_IN_GUEST',
        playerName: params.playerName?.trim() || 'Walk-in Guest',
        ownerId: params.ownerId,
        turfId: params.turfId,
        turfName: params.turfName,
        slotId: resolvedSlotId,
        amount: params.amountPaid,
        currency: 'INR',
        paymentMethod: params.paymentMethod === 'COUNTER_UPI' ? 'UPI' : 'CASH',
        status: 'SUCCESS',
        notes: `Walk-in Counter Payment (${params.paymentMethod === 'COUNTER_UPI' ? 'UPI' : 'Cash'})`,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(paymentRef, sanitizeData(pRecord));
    } catch (pErr) {
      console.warn('Warning logging payment record for manual booking:', pErr);
    }
  }

  return newBookingRef.id;
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

  let duplicateWarning: TurfVerificationDetails['duplicateWarning'] = { flagged: false };
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
    verificationLevel: 1,
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

  await setDoc(newDocRef, sanitizeData(payload));

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
  const newRef = doc(collection(db, 'turfs', turfId, 'verificationHistory'));
  const now = new Date().toISOString();
  const payload = {
    ...historyData,
    id: newRef.id,
    turfId,
    createdAt: now,
  };
  await setDoc(newRef, sanitizeData(payload));
  return newRef.id;
}

export async function getVerificationHistory(turfId: string): Promise<any[]> {
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
  await setDoc(newRef, sanitizeData(payload));

  const turfRef = doc(db, 'turfs', turfId);
  await updateDoc(turfRef, {
    'verification.submittedAt': now,
    updatedAt: now,
  });

  return newRef.id;
}

export async function getVerificationDocuments(turfId: string): Promise<any[]> {
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

  await updateDoc(turfRef, sanitizeData({
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

  await updateDoc(turfRef, sanitizeData({
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

export async function settleLobbyPlayerDue(
  lobbyId: string,
  playerUid: string,
  amount: number,
  method: 'CASH' | 'UPI' = 'CASH',
  bookingId?: string
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update lobbyPlayers document if exists
  const lpQuery = query(
    collection(db, 'lobbyPlayers'),
    where('lobbyId', '==', lobbyId),
    where('uid', '==', playerUid)
  );
  const lpSnap = await getDocs(lpQuery);
  let resolvedPlayerName = 'Athlete';
  if (!lpSnap.empty) {
    const lpDoc = lpSnap.docs[0];
    const lpData = lpDoc.data();
    resolvedPlayerName = lpData.playerName || 'Athlete';
    const newPaid = (lpData.amountPaid || 0) + amount;
    const newDue = Math.max(0, (lpData.amountDue || amount) - amount);
    await updateDoc(lpDoc.ref, sanitizeData({
      amountPaid: newPaid,
      amountDue: newDue,
      paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIAL',
      lastPaidAt: now,
      updatedAt: now,
    }));
  }

  // 2. Also update in lobby document's players array if present
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  let targetBookingId = bookingId;
  let turfId = '';
  let turfName = '';
  let ownerId = '';
  let slotId = '';

  if (lobbySnap.exists()) {
    const lData = lobbySnap.data() as any;
    if (!targetBookingId) targetBookingId = lData.bookingId;
    turfId = lData.turfId || '';
    turfName = lData.turfName || '';
    slotId = lData.slotId || '';
    if (Array.isArray(lData.players)) {
      const updatedPlayers = lData.players.map((p: any) => {
        if ((p.uid || p.playerId) === playerUid) {
          if (p.playerName) resolvedPlayerName = p.playerName;
          const newPaid = (p.amountPaid || 0) + amount;
          const newDue = Math.max(0, (p.amountDue || amount) - amount);
          return {
            ...p,
            amountPaid: newPaid,
            amountDue: newDue,
            paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIAL',
            lastPaidAt: now,
          };
        }
        return p;
      });
      await updateDoc(lobbyRef, sanitizeData({ players: updatedPlayers, updatedAt: now }));
    }
  }

  // 3. Atomically update linked booking slot amount and status
  if (targetBookingId) {
    const bookingRef = doc(db, 'bookings', targetBookingId);
    const bSnap = await getDoc(bookingRef);
    if (bSnap.exists()) {
      const bData = bSnap.data() as Booking;
      ownerId = bData.ownerId || ownerId;
      turfId = bData.turfId || turfId;
      turfName = bData.turfName || turfName;
      slotId = bData.slotId || slotId;
      const bPaid = (bData.amountPaid || 0) + amount;
      const bDue = Math.max(0, (bData.amountDue || 0) - amount);
      const bStatus = bDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      const bCounterPaid = (bData.counterAmountPaid || 0) + amount;
      await updateDoc(bookingRef, sanitizeData({
        amountPaid: bPaid,
        amountDue: bDue,
        counterAmountPaid: bCounterPaid,
        paymentStatus: bStatus,
        updatedAt: now,
      }));
    }
  }

  // 4. Record Payment in payments collection
  const paymentDocRef = doc(collection(db, 'payments'));
  const paymentRecord: PaymentRecord = {
    id: paymentDocRef.id,
    paymentId: `PAY-LOBBY-${Date.now()}`,
    bookingId: targetBookingId || '',
    playerId: playerUid,
    playerName: resolvedPlayerName,
    ownerId,
    turfId,
    turfName,
    slotId,
    amount,
    currency: 'INR',
    paymentMethod: method,
    upiTxnRef: method === 'UPI' ? `UPI-LOBBY-${Date.now().toString().slice(-8)}` : undefined,
    status: 'SUCCESS',
    notes: `Lobby split payment collected via ${method} for player ${resolvedPlayerName}`,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(paymentDocRef, sanitizeData(paymentRecord));

  // 5. Record Financial Ledger entry (Counter Dues collection)
  const ledgerDocRef = doc(collection(db, 'financialLedgers'));
  const ledgerEntry: FinancialLedgerEntry = {
    id: ledgerDocRef.id,
    idempotencyKey: `lobby_due_${lobbyId}_${playerUid}_${Date.now()}`,
    bookingId: targetBookingId || '',
    slotId,
    turfId,
    turfName,
    ownerId,
    playerId: playerUid,
    playerName: resolvedPlayerName,
    type: method === 'CASH' ? 'DUE_SETTLED_CASH' : 'DUE_SETTLED_UPI',
    amount,
    dueAmount: 0,
    paymentMethod: method,
    status: 'SUCCESS',
    notes: `Lobby split payment collected at counter (${method})`,
    createdAt: now,
  };
  await setDoc(ledgerDocRef, sanitizeData(ledgerEntry));

  // 6. If there is a matching due entry in 'dues', settle or decrease it
  try {
    const duesQuery = query(
      collection(db, 'dues'),
      where('playerId', '==', playerUid)
    );
    const duesSnap = await getDocs(duesQuery);
    for (const dDoc of duesSnap.docs) {
      const dData = dDoc.data() as PlayerDue;
      if (dData.bookingId === targetBookingId || dData.slotId === slotId) {
        const dPaid = (dData.amountPaid || 0) + amount;
        const dRem = Math.max(0, (dData.remainingAmount || 0) - amount);
        await updateDoc(dDoc.ref, sanitizeData({
          amountPaid: dPaid,
          remainingAmount: dRem,
          status: dRem <= 0 ? 'PAID' : 'PARTIAL',
          lastPaymentAt: now,
          updatedAt: now,
        }));
      }
    }
  } catch (err) {
    console.warn('Error syncing dues collection for lobby player:', err);
  }
}

export async function collectCounterDueForBooking(
  bookingId: string,
  amount: number,
  method: 'CASH' | 'UPI' = 'CASH',
  notes?: string,
  upiTxnRef?: string
): Promise<void> {
  const now = new Date().toISOString();
  let bookingRef = doc(db, 'bookings', bookingId);
  let bSnap = await getDoc(bookingRef);

  if (!bSnap.exists()) {
    // Try finding by human-readable bookingId field
    const q = query(collection(db, 'bookings'), where('bookingId', '==', bookingId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      bookingRef = snap.docs[0].ref;
      bSnap = snap.docs[0];
    } else {
      throw new Error('Booking not found');
    }
  }

  const bData = bSnap.data() as Booking;

  // Double payment prevention: if already paid, ensure all dues for this slot are cleared and return safely
  if ((bData.paymentStatus === 'PAID' || (bData.amountDue || 0) <= 0) && amount > 0) {
    await clearAllDuesForBookingAndSlot(bData.id, bData.bookingId, bData.slotId, 0, true, 'Slot already fully paid at counter');
    return;
  }

  const newPaid = (bData.amountPaid || 0) + amount;
  const newDue = Math.max(0, (bData.totalAmount || 0) - newPaid);
  const newStatus = newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';
  const newCounterPaid = (bData.counterAmountPaid || 0) + amount;
  const existingAdvance = bData.advancePaid !== undefined
    ? bData.advancePaid
    : (bData.paymentMode === 'PAY_FULL'
        ? (bData.amountPaid || 0)
        : (bData.paymentMode === 'PAY_PARTIAL'
            ? Math.max(0, (bData.amountPaid || 0) - (bData.counterAmountPaid || 0))
            : 0));

  // 1. Update Booking (properly segregating online advance vs direct counter collection)
  await updateDoc(bookingRef, sanitizeData({
    amountPaid: newPaid,
    amountDue: newDue,
    paymentStatus: newStatus,
    counterAmountPaid: newCounterPaid,
    advancePaid: existingAdvance,
    updatedAt: now,
  }));

  // 2. Record Payment
  const paymentDocRef = doc(collection(db, 'payments'));
  const paymentRecord: PaymentRecord = {
    id: paymentDocRef.id,
    paymentId: `PAY-COUNTER-${Date.now()}`,
    bookingId: bData.id,
    playerId: bData.playerId,
    playerName: bData.playerName,
    playerEmail: bData.playerEmail,
    playerPhone: bData.playerPhone,
    ownerId: bData.ownerId,
    turfId: bData.turfId,
    turfName: bData.turfName,
    slotId: bData.slotId,
    amount,
    currency: 'INR',
    paymentMethod: method,
    upiTxnRef: method === 'UPI' ? (upiTxnRef || `UPI-DUE-${Date.now().toString().slice(-8)}`) : undefined,
    status: 'SUCCESS',
    notes: notes || `Direct venue counter collection (in-person) for booking ${bData.bookingId || bData.id}`,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(paymentDocRef, sanitizeData(paymentRecord));

  // 3. Financial Ledger entry
  const ledgerDocRef = doc(collection(db, 'financialLedgers'));
  const ledgerEntry: FinancialLedgerEntry = {
    id: ledgerDocRef.id,
    idempotencyKey: `counter_due_${bData.id}_${Date.now()}`,
    bookingId: bData.id,
    bookingRef: bData.bookingId,
    slotId: bData.slotId,
    turfId: bData.turfId,
    turfName: bData.turfName,
    ownerId: bData.ownerId,
    playerId: bData.playerId,
    playerName: bData.playerName,
    type: method === 'CASH' ? 'DUE_SETTLED_CASH' : 'DUE_SETTLED_UPI',
    amount,
    dueAmount: newDue,
    paymentMethod: method,
    upiTxnRef: method === 'UPI' ? (upiTxnRef || paymentRecord.upiTxnRef) : undefined,
    status: 'SUCCESS',
    notes: notes || `Counter dues collected directly at venue in-person (Direct venue collection, not held in central escrow)`,
    createdAt: now,
  };
  await setDoc(ledgerDocRef, sanitizeData(ledgerEntry));

  // 4. Atomically sync and clear all linked dues for this booking and slot to guarantee zero double payments
  await clearAllDuesForBookingAndSlot(
    bData.id,
    bData.bookingId,
    bData.slotId,
    amount,
    newDue <= 0,
    notes || `Desk collection via ${method}`
  );
}

/**
 * Helper to clear or update all player dues and participant shares linked to a booking/slot atomically.
 * Resolves by booking doc ID, bookingRef (e.g. TRU-xxxxxx), and slotId to guarantee zero orphan dues.
 */
export async function clearAllDuesForBookingAndSlot(
  bookingDocId: string,
  bookingRefId?: string,
  slotId?: string,
  amountPaidNow: number = 0,
  isFullClearance: boolean = true,
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const matchedDuesMap = new Map<string, { ref: any; data: PlayerDue }>();

    // 1. Query dues by bookingDocId
    if (bookingDocId) {
      const q1 = query(collection(db, 'dues'), where('bookingId', '==', bookingDocId));
      const s1 = await getDocs(q1);
      s1.docs.forEach((d) => matchedDuesMap.set(d.id, { ref: d.ref, data: d.data() as PlayerDue }));
    }

    // 2. Query dues by human-readable bookingRef if available
    if (bookingRefId) {
      const q2 = query(collection(db, 'dues'), where('bookingId', '==', bookingRefId));
      const s2 = await getDocs(q2);
      s2.docs.forEach((d) => matchedDuesMap.set(d.id, { ref: d.ref, data: d.data() as PlayerDue }));

      const q3 = query(collection(db, 'dues'), where('bookingRef', '==', bookingRefId));
      const s3 = await getDocs(q3);
      s3.docs.forEach((d) => matchedDuesMap.set(d.id, { ref: d.ref, data: d.data() as PlayerDue }));
    }

    // 3. Query dues by slotId if available (guarantees slot-level syncing)
    if (slotId) {
      const q4 = query(collection(db, 'dues'), where('slotId', '==', slotId));
      const s4 = await getDocs(q4);
      s4.docs.forEach((d) => matchedDuesMap.set(d.id, { ref: d.ref, data: d.data() as PlayerDue }));
    }

    // Update each matched due
    for (const [dueDocId, { ref, data }] of matchedDuesMap.entries()) {
      if (isFullClearance) {
        await updateDoc(ref, sanitizeData({
          amountPaid: data.totalAmount || (data.amountPaid || 0) + amountPaidNow,
          remainingAmount: 0,
          status: 'PAID',
          lastPaymentAt: now,
          notes: notes || 'Counter due settled at venue desk - slot cleared',
          updatedAt: now,
        }));
      } else {
        const dPaid = (data.amountPaid || 0) + amountPaidNow;
        const dRem = Math.max(0, (data.totalAmount || 0) - dPaid);
        await updateDoc(ref, sanitizeData({
          amountPaid: dPaid,
          remainingAmount: dRem,
          status: dRem <= 0 ? 'PAID' : 'PARTIAL',
          lastPaymentAt: now,
          updatedAt: now,
        }));
      }
    }

    // 4. Also clear any squad split shares or lobby player dues for this booking/slot
    if (bookingDocId || bookingRefId) {
      const targetBId = bookingDocId || bookingRefId || '';
      const sharesQuery = query(collection(db, 'bookingShares'), where('bookingId', '==', targetBId));
      const sharesSnap = await getDocs(sharesQuery);
      for (const shareDoc of sharesSnap.docs) {
        await updateDoc(shareDoc.ref, sanitizeData({
          status: 'PAID',
          amountDue: 0,
          updatedAt: now,
        }));
      }
    }
  } catch (err) {
    console.warn('Error clearing all dues for booking and slot:', err);
  }
}

// ==================== MERCHANT UPI WEBHOOK SERVICES ====================

/**
 * Generates an immutable, unique Merchant Order Reference ID for direct UPI intents and dynamic QR codes.
 * This ID is attached as the `tr` parameter so incoming bank webhook callbacks can correlate the transaction.
 */
export function generateMerchantOrderRef(prefix = 'MER'): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Listens in real-time to the Merchant / Receiver Bank Webhook collection for a specific order reference.
 * When the bank confirms receipt (status: 'SUCCESS'), this callback triggers the auto-locking flow.
 */
export function listenMerchantWebhook(
  orderRef: string,
  onEvent: (event: MerchantWebhookEvent) => void
): () => void {
  if (!orderRef) return () => {};

  const webhooksQuery = query(
    collection(db, 'payment_webhooks'),
    where('orderRef', '==', orderRef)
  );

  const unsubscribe = onSnapshot(
    webhooksQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as MerchantWebhookEvent;
          if (data && data.status === 'SUCCESS') {
            onEvent({
              ...data,
              id: change.doc.id,
            });
          }
        }
      });
    },
    (err) => {
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        console.info('Merchant webhook listener notice: Real-time stream unavailable, fallback verification will be used.', err?.message || err);
      } else {
        console.warn('Merchant webhook listener notice:', err);
      }
    }
  );

  return unsubscribe;
}

/**
 * Checks receiver bank settlement status for an order reference via a direct query.
 * Useful for fallback manual polling when the player taps "Check Bank Status".
 */
export async function checkMerchantWebhookStatus(
  orderRef: string
): Promise<MerchantWebhookEvent | null> {
  if (!orderRef) return null;

  try {
    const q = query(
      collection(db, 'payment_webhooks'),
      where('orderRef', '==', orderRef),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data() as MerchantWebhookEvent;
      return {
        ...docData,
        id: snap.docs[0].id,
      };
    }
    return null;
  } catch (err) {
    console.warn('Error checking merchant webhook status:', err);
    return null;
  }
}

/**
 * Emits or simulates a verified Bank Webhook callback.
 * In a production bank environment, this is called by the Merchant Gateway (Razorpay/PhonePe/Paytm/Bank Webhook Endpoint).
 * In the mobile app, it is also used by test triggers or counter auto-locks to verify real-time bank settlement.
 */
export async function emitMerchantWebhook(
  params: Omit<MerchantWebhookEvent, 'id' | 'receivedAt'>
): Promise<MerchantWebhookEvent> {
  const webhookDocRef = doc(collection(db, 'payment_webhooks'));
  const now = new Date().toISOString();

  const event: MerchantWebhookEvent = {
    id: webhookDocRef.id,
    orderRef: params.orderRef,
    turfId: params.turfId,
    ownerId: params.ownerId,
    playerId: params.playerId,
    amount: params.amount,
    status: params.status || 'SUCCESS',
    bankUtr: params.bankUtr || `BANK-RRN-${Date.now().toString().slice(-8)}`,
    payerVpa: params.payerVpa || 'athlete@okhdfcbank',
    payeeVpa: params.payeeVpa || 'turfvenue@icici',
    merchantProvider: params.merchantProvider || 'PHONEPE_BUSINESS',
    eventType: params.eventType || 'payment.captured',
    timestamp: params.timestamp || now,
    receivedAt: now,
    verificationSource: params.verificationSource || 'BANK_WEBHOOK',
    rawPayload: params.rawPayload || {
      channel: 'UPI_INTENT_COLLECT',
      settlementMode: 'T0_REAL_TIME',
      responseCode: '00',
      bankResponse: 'TRANSACTION_SUCCESS_CREDITED',
    },
  };

  await setDoc(webhookDocRef, sanitizeData(event));
  return event;
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
  const record = {
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
  await setDoc(ref, sanitizeData(record));
  return ref.id;
}

export async function cancelOwnerPayoutRequest(requestId: string, ownerId: string): Promise<void> {
  const reqRef = doc(db, 'ownerPayoutRequests', requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) {
    throw new Error('Payout request not found');
  }
  const data = snap.data() as any;
  if (data.ownerId !== ownerId) {
    throw new Error('Unauthorized to cancel this request');
  }
  if (data.status !== 'REQUESTED') {
    throw new Error('Only pending requests awaiting review can be cancelled');
  }
  await updateDoc(reqRef, sanitizeData({
    status: 'CANCELLED',
    notes: 'Cancelled by owner',
    processedAt: new Date().toISOString(),
    processedBy: 'Owner',
  }));
}

export async function getOwnerPayoutRequests(ownerId: string): Promise<any[]> {
  if (!ownerId) return [];
  try {
    const q = query(collection(db, 'ownerPayoutRequests'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  } catch (err) {
    console.warn('Error fetching owner payout requests:', err);
    return [];
  }
}

export async function getAllPayoutRequests(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'ownerPayoutRequests'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  } catch (err) {
    console.warn('Error fetching all payout requests:', err);
    return [];
  }
}

export function listenAllPayoutRequests(callback: (requests: any[]) => void) {
  const q = query(collection(db, 'ownerPayoutRequests'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Error listening to all payout requests:', err);
    }
  );
}

export async function deleteOwnerTestData(ownerId: string): Promise<void> {
  if (!ownerId) return;
  try {
    const q = query(collection(db, 'ownerPayoutRequests'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      if (data.isTest || data.amount === 0 || data.destination?.includes('test')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error deleting owner test data:', err);
  }
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
    console.warn('Error fetching admin payment config in mobile dbService:', err);
    return null;
  }
}

export async function saveAdminPaymentConfig(config: any): Promise<void> {
  const docRef = doc(db, 'adminConfig', 'paymentSettings');
  await setDoc(docRef, sanitizeData(config), { merge: true });
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const docRef = doc(db, 'config', 'main_pricing');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PricingConfig;
    }
    return {
      convenienceFee: 20,
      convenienceFeeEnabled: true,
      cancellationCutoffHours: 4,
      refundPercentage: 80,
    };
  } catch (err) {
    return {
      convenienceFee: 20,
      convenienceFeeEnabled: true,
      cancellationCutoffHours: 4,
      refundPercentage: 80,
    };
  }
}

export interface BookingFinancialSplit {
  onlineRevenue: number; // Processed via Central Admin Gateway, held in platform escrow, withdrawable by owner
  cashRevenue: number;   // Collected directly at venue counter (cash / personal QR), in-hand at venue
  pendingDue: number;    // Unpaid balance
  totalPaid: number;     // onlineRevenue + cashRevenue
}

export function calculateBookingFinancialSplit(booking: Booking | any): BookingFinancialSplit {
  if (!booking) {
    return { onlineRevenue: 0, cashRevenue: 0, pendingDue: 0, totalPaid: 0 };
  }

  if (booking.bookingStatus === 'CANCELLED') {
    const onlineRetained = Math.max(0, (booking.advancePaid || 0) - (booking.refundAmount || 0));
    return {
      onlineRevenue: onlineRetained,
      cashRevenue: 0,
      pendingDue: 0,
      totalPaid: onlineRetained,
    };
  }

  const totalAmount = booking.totalAmount || 0;
  const amountPaid = booking.amountPaid !== undefined
    ? booking.amountPaid
    : (booking.paymentStatus === 'PAID' ? totalAmount : 0);
  const amountDue = booking.amountDue !== undefined
    ? booking.amountDue
    : Math.max(0, totalAmount - amountPaid);

  const isFullVenueCollection =
    booking.paymentMethod === 'CASH' ||
    booking.paymentMethod === 'PAY_AT_VENUE' ||
    booking.paymentMethod === 'PAY_LATER_AT_TURF' ||
    booking.paymentMode === 'PAY_LATER_AT_TURF' ||
    booking.bookingType === 'OWNER';

  if (isFullVenueCollection) {
    // 100% of collected money for this slot was received in-person at the venue
    return {
      onlineRevenue: 0,
      cashRevenue: amountPaid,
      pendingDue: amountDue,
      totalPaid: amountPaid,
    };
  }

  // If counterAmountPaid was explicitly logged (e.g. balance collected at counter):
  if (booking.counterAmountPaid !== undefined && booking.counterAmountPaid > 0) {
    const cash = Math.min(amountPaid, booking.counterAmountPaid);
    const online = Math.max(0, amountPaid - cash);
    return {
      onlineRevenue: online,
      cashRevenue: cash,
      pendingDue: amountDue,
      totalPaid: amountPaid,
    };
  }

  // If advancePaid was recorded:
  if (booking.advancePaid !== undefined) {
    const online = Math.min(amountPaid, booking.advancePaid);
    const cash = Math.max(0, amountPaid - online);
    return {
      onlineRevenue: online,
      cashRevenue: cash,
      pendingDue: amountDue,
      totalPaid: amountPaid,
    };
  }

  // If paymentMode is PAY_FULL or paymentMethod is PAY_NOW / ONLINE_RAZORPAY
  if (booking.paymentMode === 'PAY_FULL' || booking.paymentMethod === 'PAY_NOW' || booking.paymentMethod === 'ONLINE_RAZORPAY') {
    return {
      onlineRevenue: amountPaid,
      cashRevenue: 0,
      pendingDue: amountDue,
      totalPaid: amountPaid,
    };
  }

  // Default
  return {
    onlineRevenue: amountPaid,
    cashRevenue: 0,
    pendingDue: amountDue,
    totalPaid: amountPaid,
  };
}

export const splitBookingRevenueChannels = calculateBookingFinancialSplit;

export async function calculateOwnerRealAnalytics(
  ownerId: string,
  timeframe: 'ALL' | '30D' | '7D' | 'TODAY' = 'ALL',
  arenaId: string = 'ALL'
): Promise<OwnerRealAnalytics> {
  const [allRawBookings, allTurfs] = await Promise.all([
    getOwnerBookings(ownerId),
    getOwnerTurfs(ownerId),
  ]);

  const isSpecificArena = arenaId && arenaId !== 'ALL';
  const allBookings = isSpecificArena ? allRawBookings.filter((b) => b.arenaId === arenaId) : allRawBookings;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredBookings = allBookings.filter((b) => {
    if (timeframe === 'ALL') return true;
    const bDate = b.date || b.createdAt || '';
    if (timeframe === 'TODAY') {
      return bDate.startsWith(todayStr);
    }
    const bTime = new Date(bDate).getTime();
    if (isNaN(bTime)) return true;
    const diffDays = (now.getTime() - bTime) / (1000 * 60 * 60 * 24);
    if (timeframe === '7D') return diffDays <= 7;
    if (timeframe === '30D') return diffDays <= 30;
    return true;
  });

  let totalBookingValue = 0;
  let amountCollected = 0;
  let onlineRevenue = 0;
  let cashRevenue = 0;
  let amountPending = 0;
  let cancelledAmount = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;

  const arenaCounts: Record<string, { count: number; name: string; revenue: number }> = {};
  const timeSlotCounts: Record<string, number> = {};
  const dayCounts: Record<string, { count: number; revenue: number }> = {
    Mon: { count: 0, revenue: 0 },
    Tue: { count: 0, revenue: 0 },
    Wed: { count: 0, revenue: 0 },
    Thu: { count: 0, revenue: 0 },
    Fri: { count: 0, revenue: 0 },
    Sat: { count: 0, revenue: 0 },
    Sun: { count: 0, revenue: 0 },
  };
  const sportCounts: Record<string, { count: number; revenue: number }> = {};
  const playerStats: Record<string, { name: string; phone?: string; photoURL?: string; bookings: number; spent: number; lastDate: string; sports: Record<string, number> }> = {};
  const hourlySlots: Record<number, number> = {};
  for (let h = 6; h <= 23; h++) hourlySlots[h] = 0;

  const timeBlockStats: Record<string, { label: string; hours: string; bookings: number; revenue: number }> = {
    MORNING: { label: 'Morning Jumpstart', hours: '06:00 - 11:00', bookings: 0, revenue: 0 },
    AFTERNOON: { label: 'Afternoon Non-Peak', hours: '11:00 - 16:00', bookings: 0, revenue: 0 },
    EVENING_PEAK: { label: 'Prime Evening Peak', hours: '16:00 - 20:00', bookings: 0, revenue: 0 },
    NIGHT_LEAGUE: { label: 'Night Match League', hours: '20:00 - 24:00', bookings: 0, revenue: 0 },
  };

  let totalLeadHours = 0;
  let leadHourCount = 0;

  filteredBookings.forEach((b) => {
    const totalAmount = b.totalAmount || 0;
    totalBookingValue += totalAmount;

    const channels = splitBookingRevenueChannels(b);
    onlineRevenue += channels.onlineRevenue;
    cashRevenue += channels.cashRevenue;
    amountCollected += channels.totalPaid;
    amountPending += channels.pendingDue;

    if (b.bookingStatus === 'CANCELLED') {
      cancelledBookings += 1;
      cancelledAmount += totalAmount;
    } else {
      completedBookings += 1;
    }

    // Arena tally
    const arenaId = b.arenaId || 'default';
    const arenaName = b.arenaName || (allTurfs.find((t) => t.id === b.turfId)?.name) || 'Main Turf Arena';
    if (!arenaCounts[arenaId]) {
      arenaCounts[arenaId] = { count: 0, name: arenaName, revenue: 0 };
    }
    arenaCounts[arenaId].count += 1;
    arenaCounts[arenaId].revenue += channels.totalPaid;

    // Time Slot
    const slotTime = b.startTime ? `${b.startTime} - ${b.endTime || ''}` : 'Evening Slot';
    timeSlotCounts[slotTime] = (timeSlotCounts[slotTime] || 0) + 1;

    // Hourly Breakdown
    if (b.startTime) {
      const startH = parseInt(b.startTime.split(':')[0], 10);
      if (!isNaN(startH) && hourlySlots[startH] !== undefined) {
        hourlySlots[startH] += 1;
      }
      if (startH >= 6 && startH < 11) {
        timeBlockStats.MORNING.bookings += 1;
        timeBlockStats.MORNING.revenue += channels.totalPaid;
      } else if (startH >= 11 && startH < 16) {
        timeBlockStats.AFTERNOON.bookings += 1;
        timeBlockStats.AFTERNOON.revenue += channels.totalPaid;
      } else if (startH >= 16 && startH < 20) {
        timeBlockStats.EVENING_PEAK.bookings += 1;
        timeBlockStats.EVENING_PEAK.revenue += channels.totalPaid;
      } else if (startH >= 20 && startH <= 23) {
        timeBlockStats.NIGHT_LEAGUE.bookings += 1;
        timeBlockStats.NIGHT_LEAGUE.revenue += channels.totalPaid;
      }
    }

    // Day of week
    try {
      const d = new Date(b.date || b.createdAt || '');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayKey = days[d.getDay()];
      if (dayCounts[dayKey]) {
        dayCounts[dayKey].count += 1;
        dayCounts[dayKey].revenue += channels.totalPaid;
      }
    } catch {}

    // Sport tally
    const sport = (b.sport || 'Football').trim();
    if (!sportCounts[sport]) sportCounts[sport] = { count: 0, revenue: 0 };
    sportCounts[sport].count += 1;
    sportCounts[sport].revenue += channels.totalPaid;

    // Player stats
    const pId = b.playerId || b.playerPhone || b.userName || 'guest';
    const pName = b.userName || b.playerPhone || 'Athlete';
    if (!playerStats[pId]) {
      playerStats[pId] = {
        name: pName,
        phone: b.playerPhone,
        photoURL: b.userPhoto,
        bookings: 0,
        spent: 0,
        lastDate: b.date || '',
        sports: {},
      };
    }
    playerStats[pId].bookings += 1;
    playerStats[pId].spent += channels.totalPaid;
    if (b.date && b.date > playerStats[pId].lastDate) playerStats[pId].lastDate = b.date;
    playerStats[pId].sports[sport] = (playerStats[pId].sports[sport] || 0) + 1;

    // Lead time
    if (b.createdAt && b.date && b.startTime) {
      try {
        const createMs = new Date(b.createdAt).getTime();
        const startIso = `${b.date}T${b.startTime.length === 5 ? b.startTime : b.startTime.padStart(5, '0')}:00`;
        const slotMs = new Date(startIso).getTime();
        if (!isNaN(createMs) && !isNaN(slotMs) && slotMs > createMs) {
          totalLeadHours += (slotMs - createMs) / (1000 * 60 * 60);
          leadHourCount += 1;
        }
      } catch {}
    }
  });

  const totalBookings = filteredBookings.length;
  const averageBookingValue = totalBookings > 0 ? Math.round(amountCollected / totalBookings) : 0;
  const occupancyRatePercent = totalBookings > 0 ? Math.min(100, Math.round((completedBookings / totalBookings) * 100)) : 0;

  let popularArenaName = 'Main Turf Arena';
  let maxArena = 0;
  Object.values(arenaCounts).forEach((a) => {
    if (a.count > maxArena) {
      maxArena = a.count;
      popularArenaName = a.name;
    }
  });

  let popularTimeSlot = '06:00 PM - 07:00 PM';
  let maxSlot = 0;
  Object.entries(timeSlotCounts).forEach(([slot, count]) => {
    if (count > maxSlot) {
      maxSlot = count;
      popularTimeSlot = slot;
    }
  });

  let popularDay = 'Saturday';
  let maxDay = 0;
  Object.entries(dayCounts).forEach(([day, d]) => {
    if (d.count > maxDay) {
      maxDay = d.count;
      popularDay = day;
    }
  });

  let mostBookedSport = 'Football';
  let maxSport = 0;
  Object.entries(sportCounts).forEach(([sport, s]) => {
    if (s.count > maxSport) {
      maxSport = s.count;
      mostBookedSport = sport;
    }
  });

  const uniquePlayersCount = Object.keys(playerStats).length;
  let repeatPlayersCount = 0;
  Object.values(playerStats).forEach((p) => {
    if (p.bookings > 1) repeatPlayersCount += 1;
  });
  const newPlayersCount = uniquePlayersCount - repeatPlayersCount;
  const repeatRatePercent = uniquePlayersCount > 0 ? Math.round((repeatPlayersCount / uniquePlayersCount) * 100) : 0;

  const topRegularPlayers = Object.entries(playerStats)
    .map(([id, p]) => {
      let favoriteSport = 'Football';
      let favCount = 0;
      Object.entries(p.sports).forEach(([sp, cnt]) => {
        if (cnt > favCount) {
          favCount = cnt;
          favoriteSport = sp;
        }
      });
      return {
        playerId: id,
        playerName: p.name,
        playerPhone: p.phone,
        playerPhotoURL: p.photoURL,
        totalBookings: p.bookings,
        totalSpent: p.spent,
        lastBookingDate: p.lastDate,
        favoriteSport,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  const maxHourlyCount = Math.max(...Object.values(hourlySlots), 1);
  const hourlyHeatmap = Object.entries(hourlySlots).map(([hStr, count]) => {
    const h = parseInt(hStr, 10);
    const hourLabel = `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    const occupancyPercent = Math.round((count / maxHourlyCount) * 100);
    return { hour: h, hourLabel, bookingsCount: count, occupancyPercent };
  });

  const dayBreakdown = Object.entries(dayCounts).map(([dayName, data]) => {
    const occPct = totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0;
    return { dayName, bookingsCount: data.count, revenue: data.revenue, occupancyPercent: occPct };
  });

  const timeBlocks = Object.entries(timeBlockStats).map(([block, tb]) => {
    const occPct = totalBookings > 0 ? Math.round((tb.bookings / totalBookings) * 100) : 0;
    return { block: block as any, label: tb.label, hours: tb.hours, bookingsCount: tb.bookings, revenue: tb.revenue, occupancyPercent: occPct };
  });

  const sportShares = Object.entries(sportCounts).map(([sport, s]) => {
    const percentage = amountCollected > 0 ? Math.round((s.revenue / amountCollected) * 100) : 0;
    return { sport, bookingsCount: s.count, revenue: s.revenue, percentage };
  }).sort((a, b) => b.revenue - a.revenue);

  const arenaPerformances = Object.entries(arenaCounts).map(([arenaId, a]) => {
    const occ = totalBookings > 0 ? Math.round((a.count / totalBookings) * 100) : 0;
    return { arenaId, arenaName: a.name, totalBookings: a.count, totalRevenue: a.revenue, occupancyPercent: occ };
  });

  const smartRecommendations: any[] = [];
  if (timeBlockStats.AFTERNOON.bookings <= 2) {
    smartRecommendations.push({
      id: 'rec_afternoon_discount',
      title: 'Afternoon Flash Discount (12 PM - 4 PM)',
      description: 'Afternoon slots show lower occupancy. Introduce a 20-30% discounted off-peak rate to attract students and freelance athletes.',
      type: 'DISCOUNT',
      impactLevel: 'HIGH',
      actionLabel: 'Set Off-Peak Pricing',
    });
  }
  if (repeatRatePercent < 30 && uniquePlayersCount > 5) {
    smartRecommendations.push({
      id: 'rec_loyalty_boost',
      title: 'Launch Regular Captain Loyalty Pass',
      description: `Your repeat athlete rate is ${repeatRatePercent}%. Offer a 5-match package or 10% token back for 3rd bookings to turn one-off teams into weekly regulars.`,
      type: 'RETENTION',
      impactLevel: 'GROWTH',
      actionLabel: 'Create Loyalty Incentive',
    });
  }
  if (dayCounts.Sat.count + dayCounts.Sun.count > (totalBookings * 0.5) && totalBookings >= 6) {
    smartRecommendations.push({
      id: 'rec_weekend_surge',
      title: 'Weekend Premium Prime Hours',
      description: 'Weekend demand accounts for over 50% of your bookings. You can optimize revenue by applying a 15% weekend surge rate on Saturday & Sunday 5 PM - 10 PM.',
      type: 'PRICING',
      impactLevel: 'HIGH',
      actionLabel: 'Enable Weekend Surge',
    });
  }
  smartRecommendations.push({
    id: 'rec_advance_booking',
    title: 'Open 14-Day Advance Window',
    description: `Athletes currently book ${leadHourCount > 0 ? Math.round(totalLeadHours / leadHourCount) : 12}h in advance. Encouraging advance 7-14 day reservations reduces sudden empty slots.`,
    type: 'OPTIMIZATION',
    impactLevel: 'MODERATE',
    actionLabel: 'Adjust Booking Window',
  });

  // Calculate today, weekly, monthly
  const todayBookings = allBookings.filter((b) => (b.date || b.createdAt || '').startsWith(todayStr)).length;
  const weeklyBookings = allBookings.filter((b) => {
    const diff = (now.getTime() - new Date(b.date || b.createdAt || '').getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const monthlyBookings = allBookings.filter((b) => {
    const diff = (now.getTime() - new Date(b.date || b.createdAt || '').getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).length;

  return {
    totalBookingValue,
    amountCollected,
    onlineRevenue,
    cashRevenue,
    amountPending,
    cancelledAmount,
    totalBookings,
    completedBookings,
    cancelledBookings,
    occupancyRatePercent,
    averageBookingValue,
    todayBookings,
    weeklyBookings,
    monthlyBookings,
    popularArenaName,
    popularTimeSlot,
    popularDay,
    mostBookedSport,
    repeatPlayersCount,
    newPlayersCount,
    uniquePlayersCount,
    repeatRatePercent,
    leadTimeHoursAvg: leadHourCount > 0 ? Math.round(totalLeadHours / leadHourCount) : 0,
    hourlyHeatmap,
    dayBreakdown,
    timeBlocks,
    sportShares,
    arenaPerformances,
    topRegularPlayers,
    smartRecommendations,
    selectedArenaId: arenaId,
    selectedArenaName: isSpecificArena ? (allTurfs.find((t) => t.id === arenaId)?.name || 'Selected Arena') : 'All Arenas',
    availableArenas: allTurfs.map((t) => ({ id: t.id, name: t.name, sport: t.sports?.[0] || 'Turf' })),
  };
}

// ==========================================
// OWNER SUBSCRIPTIONS & FEATURE GATING
// ==========================================

export const DEFAULT_MOBILE_SUBSCRIPTION_PLANS: OwnerSubscriptionPlan[] = [
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
    },
    maxArenas: 2,
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
  return { enabled: true, updatedAt: new Date().toISOString(), updatedBy: 'Super Admin' };
}

export async function getOwnerSubscriptionPlans(includeArchived = false): Promise<OwnerSubscriptionPlan[]> {
  try {
    const colRef = collection(db, 'subscriptionPlans');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return DEFAULT_MOBILE_SUBSCRIPTION_PLANS;
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
    return DEFAULT_MOBILE_SUBSCRIPTION_PLANS;
  }
}

export async function getOwnerSubscriptionStatus(ownerId: string): Promise<OwnerSubscriptionStatus> {
  try {
    const docRef = doc(db, 'ownerSubscriptions', ownerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as OwnerSubscriptionStatus;
      // Evaluate expiry against current timestamp
      if (data.expiryDate && new Date(data.expiryDate) < new Date() && data.status !== 'EXPIRED') {
        data.status = 'EXPIRED';
        data.isTrialActive = false;
      }
      return data;
    } else {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const defaultStatus: OwnerSubscriptionStatus = {
        ownerId,
        planId: 'plan_pro_annual',
        planName: 'Pro Annual (Trial)',
        status: 'TRIAL',
        startDate: now.toISOString(),
        expiryDate: trialEnd.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        isTrialActive: true,
        updatedAt: now.toISOString(),
      };
      await setDoc(docRef, sanitizeData(defaultStatus));
      return defaultStatus;
    }
  } catch (err) {
    console.warn('Error fetching owner subscription status:', err);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      ownerId,
      planId: 'plan_pro_annual',
      planName: 'Pro Annual (Trial)',
      status: 'TRIAL',
      startDate: now.toISOString(),
      expiryDate: trialEnd.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      isTrialActive: true,
      updatedAt: now.toISOString(),
    };
  }
}

export async function getEffectiveOwnerSubscription(ownerId: string): Promise<OwnerSubscriptionStatus> {
  return getOwnerSubscriptionStatus(ownerId);
}

export function listenOwnerSubscription(
  ownerId: string,
  onUpdate: (status: OwnerSubscriptionStatus) => void
): () => void {
  const docRef = doc(db, 'ownerSubscriptions', ownerId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as OwnerSubscriptionStatus;
        if (data.expiryDate && new Date(data.expiryDate) < new Date() && data.status !== 'EXPIRED') {
          data.status = 'EXPIRED';
          data.isTrialActive = false;
        }
        onUpdate(data);
      } else {
        getOwnerSubscriptionStatus(ownerId).then(onUpdate);
      }
    },
    (err) => {
      console.warn('Error listening to owner subscription:', err);
    }
  );
}

export function listenSubscriptionSystemConfig(
  onUpdate: (config: SubscriptionSystemConfig) => void
): () => void {
  const docRef = doc(db, 'settings', 'subscriptionSystem');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as SubscriptionSystemConfig);
      } else {
        onUpdate({ enabled: true, updatedAt: new Date().toISOString(), updatedBy: 'Super Admin' });
      }
    },
    (err) => {
      console.warn('Error listening to subscription system config:', err);
    }
  );
}

export async function getEffectiveOwnerPlanFeatures(ownerId: string): Promise<{
  features: PlanFeatureConfig;
  status: OwnerSubscriptionStatus;
  plan: OwnerSubscriptionPlan | null;
  maxArenas: number;
  isEnforced: boolean;
}> {
  try {
    const sysConfig = await getSubscriptionSystemConfig();
    const subStatus = await getOwnerSubscriptionStatus(ownerId);
    const plans = await getOwnerSubscriptionPlans(true);
    const ownerPlan = plans.find((p) => p.id === subStatus.planId) || null;

    if (!sysConfig.enabled) {
      return {
        features: { ...DEFAULT_PLAN_FEATURES },
        status: subStatus,
        plan: ownerPlan,
        maxArenas: subStatus.maxArenasOverride || ownerPlan?.maxArenas || 99,
        isEnforced: false,
      };
    }

    if (subStatus.status === 'EXPIRED') {
      return {
        features: {
          analytics: false,
          offers: false,
          duesTracker: false,
          reviewsManager: false,
          allowPayAtVenue: false,
          autoSlotGenerator: false,
          customPricing: false,
        },
        status: subStatus,
        plan: ownerPlan,
        maxArenas: subStatus.maxArenasOverride || ownerPlan?.maxArenas || 1,
        isEnforced: true,
      };
    }

    const baseFeatures =
      ownerPlan && ownerPlan.featuresConfig
        ? {
            ...DEFAULT_PLAN_FEATURES,
            ...ownerPlan.featuresConfig,
          }
        : { ...DEFAULT_PLAN_FEATURES };

    // Apply any custom per-owner overrides set by Admin from the Web portal
    const effectiveFeatures: PlanFeatureConfig = subStatus.customFeatures
      ? {
          ...baseFeatures,
          ...subStatus.customFeatures,
        }
      : baseFeatures;

    return {
      features: effectiveFeatures,
      status: subStatus,
      plan: ownerPlan,
      maxArenas: subStatus.maxArenasOverride || ownerPlan?.maxArenas || 5,
      isEnforced: true,
    };
  } catch (err) {
    console.warn('Error calculating effective owner features:', err);
    return {
      features: { ...DEFAULT_PLAN_FEATURES },
      status: {
        ownerId,
        planId: 'plan_pro_annual',
        planName: 'Pro Annual (Trial)',
        status: 'TRIAL',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        isTrialActive: true,
        updatedAt: new Date().toISOString(),
      },
      plan: null,
      maxArenas: 5,
      isEnforced: true,
    };
  }
}

// ==================== PROMOTIONAL BANNERS ====================

const DEFAULT_MOBILE_BANNERS: PromotionalBanner[] = [];

export async function getPromotionalBanners(includeInactive = false): Promise<PromotionalBanner[]> {
  try {
    const colRef = collection(db, 'promotionalBanners');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }
    const banners: PromotionalBanner[] = [];
    snap.forEach((d) => {
      const data = d.data() as PromotionalBanner;
      if (includeInactive || data.isActive) {
        banners.push({ ...data, id: d.id });
      }
    });
    return banners.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    console.warn('Error fetching promotional banners:', err);
    return [];
  }
}

export async function getActivePromotionalBanners(audience: BannerAudience): Promise<PromotionalBanner[]> {
  try {
    const all = await getPromotionalBanners(false);
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = all.filter((b) => {
      if (!b.isActive) return false;
      if (b.targetAudience !== 'ALL' && b.targetAudience !== audience) return false;
      if (b.startDate && todayStr < b.startDate) return false;
      if (b.expiryDate && todayStr > b.expiryDate) return false;
      return true;
    });
    return filtered;
  } catch (err) {
    console.warn('Error filtering active promotional banners:', err);
    return [];
  }
}

export function listenActivePromotionalBanners(audience: BannerAudience, callback: (banners: PromotionalBanner[]) => void) {
  const colRef = collection(db, 'promotionalBanners');
  const todayStr = new Date().toISOString().split('T')[0];
  return onSnapshot(colRef, (snap) => {
    const banners: PromotionalBanner[] = [];
    snap.forEach((d) => {
      const b = d.data() as PromotionalBanner;
      if (!b.isActive) return;
      if (b.targetAudience !== 'ALL' && b.targetAudience !== audience) return;
      if (b.startDate && todayStr < b.startDate) return;
      if (b.expiryDate && todayStr > b.expiryDate) return;
      banners.push({ ...b, id: d.id });
    });
    callback(banners.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
  }, (err) => {
    console.warn('Error listening to active promotional banners:', err);
    callback([]);
  });
}

export async function toggleTurfFeaturedStatus(turfId: string, isFeatured: boolean): Promise<void> {
  const docRef = doc(db, 'turfs', turfId);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    isFeatured,
    sponsoredPriority: isFeatured ? 100 : 0,
    featuredUntil: isFeatured ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
    updatedAt: now,
  });
}

// ==================== COACHES & BATCHES ====================

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
      list.sort((a, b) => new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime());
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

export async function archiveCoachSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  await updateDoc(docRef, { isArchived: true, isActive: false, updatedAt: new Date().toISOString() });
}

export function listenCoachSubscriptionPlans(
  includeArchived: boolean,
  callback: (plans: CoachSubscriptionPlan[]) => void
) {
  const colRef = collection(db, 'coachSubscriptionPlans');
  return onSnapshot(
    colRef,
    (snap) => {
      if (snap.empty) {
        callback(DEFAULT_COACH_SUBSCRIPTION_PLANS);
        return;
      }
      const plans: CoachSubscriptionPlan[] = [];
      snap.forEach((d) => {
        const data = d.data() as CoachSubscriptionPlan;
        if (includeArchived || !data.isArchived) {
          plans.push(data);
        }
      });
      plans.sort((a, b) => a.price - b.price);
      callback(plans);
    },
    (err) => {
      console.warn('Error listening to coach subscription plans:', err);
      callback(DEFAULT_COACH_SUBSCRIPTION_PLANS);
    }
  );
}

export async function updateCoachSubscriptionPlanField(
  planId: string,
  updates: Partial<CoachSubscriptionPlan>
): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  await updateDoc(docRef, {
    ...sanitizeFirestoreData(updates),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCoachSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(db, 'coachSubscriptionPlans', planId);
  await deleteDoc(docRef);
}


