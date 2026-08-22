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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Turf, Arena, Slot, Booking, PaymentTransaction } from '../types';
import { sanitizeFirestoreData } from './utils';

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

export async function getOwnerTurfs(ownerId: string): Promise<Turf[]> {
  const q = query(collection(db, 'turfs'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Turf);
}

export async function getAllActiveTurfs(): Promise<Turf[]> {
  const snap = await getDocs(collection(db, 'turfs'));
  return snap.docs
    .map((d) => d.data() as Turf)
    .filter((t) => t.active !== false);
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
  const q = query(collection(db, 'arenas'), where('turfId', '==', turfId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Arena);
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
  for (const s of slotsData) {
    const newDocRef = doc(collection(db, 'slots'));
    const payload: Slot = {
      ...s,
      id: newDocRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(newDocRef, sanitizeFirestoreData(payload));
    count++;
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
  const q = query(
    collection(db, 'slots'),
    where('arenaId', '==', arenaId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Slot);
}

export async function getOwnerSlots(ownerId: string): Promise<Slot[]> {
  const q = query(collection(db, 'slots'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Slot);
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
  paymentMethod: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  isOwnerBooking?: boolean;
}

/**
 * Executes an atomic transaction to guarantee no double booking of a slot.
 */
export async function bookSlotWithTransaction(params: CreateBookingParams): Promise<Booking> {
  return await runTransaction(db, async (transaction) => {
    const slotDocRef = doc(db, 'slots', params.slotId);
    const slotSnap = await transaction.get(slotDocRef);

    if (!slotSnap.exists()) {
      throw new Error('This slot does not exist.');
    }

    const currentSlot = slotSnap.data() as Slot;

    // Check slot availability
    if (currentSlot.status !== 'AVAILABLE') {
      throw new Error('Sorry, this slot was just booked or blocked by another user.');
    }

    if (!params.isOwnerBooking && currentSlot.visibleToPlayers === false) {
      throw new Error('This slot is currently hidden by the turf owner.');
    }

    const newBookingRef = doc(collection(db, 'bookings'));
    const now = new Date().toISOString();

    const isPaid = params.paymentMethod === 'PAY_NOW';
    const amountPaid = isPaid ? params.totalAmount : 0;
    const amountDue = params.totalAmount - amountPaid;
    const paymentStatus = isPaid ? 'PAID' : 'PENDING';
    const bookingType = params.isOwnerBooking ? 'OWNER' : 'PLAYER';
    const slotStatus = params.isOwnerBooking ? 'BOOKED_BY_OWNER' : 'BOOKED_BY_PLAYER';

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
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: newBookingRef.id,
      playerId: params.playerId,
      ownerId: params.ownerId,
      amount: amountPaid,
      paymentMethod: params.paymentMethod === 'PAY_NOW' ? 'ONLINE_GATEWAY' : 'PAY_LATER_AT_TURF',
      status: isPaid ? 'SUCCESS' : 'PENDING',
      notes: isPaid ? 'Full online advance payment' : 'Pay at turf desk upon arrival',
      createdAt: now,
    };
    transaction.set(newTxRef, sanitizeFirestoreData(txData));

    return bookingData;
  });
}

// ==================== OWNER BOOKINGS / DUES / PLAYERS ====================

export async function getOwnerBookings(ownerId: string): Promise<Booking[]> {
  const q = query(collection(db, 'bookings'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Booking);
}

export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  const q = query(collection(db, 'bookings'), where('playerId', '==', playerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Booking);
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
  const field = isOwner ? 'ownerId' : 'playerId';
  const q = query(collection(db, 'paymentTransactions'), where(field, '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PaymentTransaction);
}
