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

export async function getAllActiveTurfs(includeAllForAdmin = false): Promise<Turf[]> {
  const snap = await getDocs(collection(db, 'turfs'));
  return snap.docs
    .map((d) => d.data() as Turf)
    .filter((t) => {
      if (includeAllForAdmin) return true;
      // Public player search only allows verified & active & open turfs
      const isVerified = !t.verificationStatus || t.verificationStatus === 'verified';
      return t.active !== false && isVerified && !t.isClosed;
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

    // Check slot availability
    if (currentSlot.status !== 'AVAILABLE') {
      throw new Error('This slot is no longer available. Please choose another slot.');
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
      currentPlayers: 1,
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
  const baseDate = params.startDate ? new Date(params.startDate) : new Date();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const allSlotsToCreate: Array<Omit<Slot, 'id' | 'createdAt' | 'updatedAt'>> = [];

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    const dayName = daysOfWeek[d.getDay()];

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

// ==================== AUTO-EXPIRE / DELETE PAST LOBBIES ====================

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
    'verification.adminNotes': notes || 'Approved by TruFit Operations',
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
    closureNotice: 'Venue suspended by TruFit Administration. Future bookings temporarily disabled.',
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
  const randomCode = `TRUFIT-${Math.floor(1000 + Math.random() * 9000)}`;

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


