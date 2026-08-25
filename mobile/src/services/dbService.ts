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

// ==================== TURFS ====================

export async function getTurfs(): Promise<Turf[]> {
  try {
    const colRef = collection(db, 'turfs');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turf));
    return list.filter((t) => {
      const isVerified = !t.verificationStatus || t.verificationStatus === 'verified';
      return isVerified && !t.isClosed;
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

export async function getSlotsByArenaAndDate(arenaId: string, date: string): Promise<Slot[]> {
  try {
    const colRef = collection(db, 'slots');
    const q = query(colRef, where('arenaId', '==', arenaId), where('date', '==', date));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Slot))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
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

export async function cancelBookingWithSlotRelease(
  bookingId: string,
  cancelledBy: 'PLAYER' | 'OWNER' = 'PLAYER',
  cancellationReason?: string,
  slotId?: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await transaction.get(bookingDocRef);
    if (!bookingSnap.exists()) {
      throw new Error('Booking does not exist');
    }

    const bookingData = bookingSnap.data() as Booking;
    const targetSlotId = slotId || bookingData.slotId;
    const now = new Date().toISOString();
    const isPaid = bookingData.paymentStatus === 'PAID' && (bookingData.amountPaid || 0) > 0;

    // 1. Update booking status
    transaction.update(bookingDocRef, sanitizeData({
      bookingStatus: 'CANCELLED',
      cancelledBy,
      cancellationReason: cancellationReason || (cancelledBy === 'PLAYER' ? 'Cancelled by player' : 'Cancelled by turf owner'),
      cancelledAt: now,
      refundAmount: isPaid ? bookingData.amountPaid : 0,
      refundStatus: isPaid ? 'REFUNDED' : 'NONE',
      updatedAt: now,
    }));

    // 2. If it was paid online, record refund transaction
    if (isPaid && bookingData.amountPaid) {
      const refundDocRef = doc(collection(db, 'refunds'));
      const refundPayload: RefundRecord = {
        id: refundDocRef.id,
        bookingId,
        playerId: bookingData.playerId,
        playerName: bookingData.playerName,
        ownerId: bookingData.ownerId,
        turfId: bookingData.turfId,
        amount: bookingData.amountPaid,
        reason: cancellationReason || 'Booking cancelled',
        status: 'PROCESSED',
        createdAt: now,
      };
      transaction.set(refundDocRef, sanitizeData(refundPayload));
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

  // 4. Also reverse any pending dues for this booking
  try {
    const duesQuery = query(collection(db, 'dues'), where('bookingId', '==', bookingId));
    const duesSnap = await getDocs(duesQuery);
    for (const dueDoc of duesSnap.docs) {
      await updateDoc(doc(db, 'dues', dueDoc.id), sanitizeData({
        status: 'CANCELLED_REVERSED',
        remainingAmount: 0,
        notes: `Booking cancelled by ${cancelledBy}`,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Error reversing dues for cancelled booking:', err);
  }
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
  arenaName: string;
  sport: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  bookingType: 'PLAYER' | 'OWNER';
  paymentMethod: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  numberOfPlayers?: number;
  playerShareAmount?: number;
  upiTxnRef?: string;
}

export async function createBookingWithTransaction(params: CreateBookingParams): Promise<Booking> {
  const slotDocRef = doc(db, 'slots', params.slotId);

  return await runTransaction(db, async (transaction) => {
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
      if (turfData.verificationStatus && turfData.verificationStatus !== 'verified') {
        throw new Error(`Venue "${turfData.name}" is currently ${turfData.verificationStatus.replace('_', ' ')} and cannot accept player reservations.`);
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
    const isPaid = params.paymentMethod === 'PAY_NOW';
    const payAmount = params.playerShareAmount || params.totalAmount;

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
      numberOfPlayers: params.numberOfPlayers || 1,
      playerShareAmount: payAmount,
      amountPaid: isPaid ? payAmount : 0,
      amountDue: isPaid ? 0 : payAmount,
      paymentStatus: isPaid ? 'PAID' : 'PENDING',
      bookingStatus: 'CONFIRMED',
      bookingType: params.bookingType,
      paymentMethod: params.paymentMethod,
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

    // 3. If PAY NOW, record in `payments` collection
    if (isPaid) {
      const newPaymentDoc = doc(collection(db, 'payments'));
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
        amount: payAmount,
        currency: 'INR',
        paymentMethod: 'UPI',
        upiTxnRef: params.upiTxnRef || `UPI-${Date.now().toString().slice(-8)}`,
        status: 'SUCCESS',
        notes: 'Online UPI Advance Payment',
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(newPaymentDoc, sanitizeData(paymentRecord));
    } else {
      // 4. If PAY LATER, create outstanding Due doc in `dues` collection
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
        amountPaid: 0,
        remainingAmount: payAmount,
        status: 'PENDING',
        notes: 'Pay Later at turf desk',
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(newDueDoc, sanitizeData(dueRecord));
    }

    return bookingData;
  });
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

    // 3. If linked to booking, update booking paymentStatus
    if (dueData.bookingId) {
      const bookingDocRef = doc(db, 'bookings', dueData.bookingId);
      const bookingSnap = await transaction.get(bookingDocRef);
      if (bookingSnap.exists()) {
        const bData = bookingSnap.data() as Booking;
        const bPaid = (bData.amountPaid || 0) + amountToPay;
        const bDue = Math.max(0, (bData.totalAmount || 0) - bPaid);
        transaction.update(bookingDocRef, sanitizeData({
          amountPaid: bPaid,
          amountDue: bDue,
          paymentStatus: bDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
          updatedAt: now,
        }));
      }
    }
  });
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
    const slots = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Slot))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    callback(slots);
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

export async function updateBookingStatus(bookingId: string, updates: Partial<Booking>): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function createManualBooking(params: any): Promise<string> {
  const newBookingRef = doc(collection(db, 'bookings'));
  const now = new Date().toISOString();
  const bookingData: Booking = {
    id: newBookingRef.id,
    bookingId: `WALK-${Date.now().toString().slice(-6)}`,
    playerId: 'WALK_IN_GUEST',
    playerName: params.playerName,
    playerEmail: params.playerEmail || '',
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
    slotId: params.slotId || '',
    date: params.date,
    day: params.day || 'Scheduled',
    startTime: params.startTime,
    endTime: params.endTime,
    duration: params.duration || 60,
    totalAmount: params.totalAmount,
    amountPaid: params.amountPaid || 0,
    amountDue: params.amountDue || 0,
    paymentStatus: params.paymentStatus || 'PENDING',
    bookingStatus: 'CONFIRMED',
    bookingType: 'MANUAL',
    paymentMethod: 'PAY_LATER_AT_TURF',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newBookingRef, sanitizeData(bookingData));
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

  let duplicateWarning = { flagged: false };
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


