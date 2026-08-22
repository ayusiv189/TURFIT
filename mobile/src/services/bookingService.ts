import {
  collection,
  doc,
  runTransaction,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, PaymentMethod, Slot } from '../types';

export interface CreateBookingParams {
  turfId: string;
  turfName: string;
  turfAddress?: string;
  turfCity?: string;
  arenaId: string;
  arenaName: string;
  slotId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  ownerId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  discountAmount?: number;
}

/**
 * Executes an atomic Firestore transaction to prevent double bookings.
 */
export async function bookSlotAtomically(
  params: CreateBookingParams
): Promise<Booking> {
  const slotRef = doc(db, 'slots', params.slotId);
  const bookingRef = doc(collection(db, 'bookings'));
  const transactionRef = doc(collection(db, 'paymentTransactions'));

  const netPayable = Math.max(0, params.totalAmount - (params.discountAmount || 0));
  const isPayNow = params.paymentMethod.startsWith('PAY_NOW');
  const amountPaid = isPayNow ? netPayable : 0;
  const amountDue = isPayNow ? 0 : netPayable;
  const paymentStatus = isPayNow ? 'PAID' : 'PENDING';

  const shortBookingId = 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const newBooking: Booking = {
    id: bookingRef.id,
    bookingId: shortBookingId,
    turfId: params.turfId,
    turfName: params.turfName,
    turfAddress: params.turfAddress,
    turfCity: params.turfCity,
    arenaId: params.arenaId,
    arenaName: params.arenaName,
    slotId: params.slotId,
    playerId: params.playerId,
    playerName: params.playerName,
    playerEmail: params.playerEmail,
    playerPhone: params.playerPhone,
    ownerId: params.ownerId,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    totalAmount: params.totalAmount,
    amountPaid,
    amountDue,
    paymentMethod: params.paymentMethod,
    paymentStatus,
    bookingStatus: 'CONFIRMED',
    couponCode: params.couponCode,
    discountAmount: params.discountAmount,
    createdAt: new Date().toISOString(),
  };

  await runTransaction(db, async (txn) => {
    const slotSnap = await txn.get(slotRef);
    if (!slotSnap.exists()) {
      throw new Error('Slot does not exist.');
    }

    const slotData = slotSnap.data() as Slot;
    if (slotData.status !== 'AVAILABLE') {
      throw new Error('Sorry, this slot was just booked by another player.');
    }

    // Mark slot as booked
    txn.update(slotRef, {
      status: 'BOOKED_BY_PLAYER',
      bookedByUserId: params.playerId,
      bookedByName: params.playerName,
      bookingId: bookingRef.id,
    });

    // Save booking record
    txn.set(bookingRef, newBooking);

    // Save transaction record if paid
    if (amountPaid > 0) {
      txn.set(transactionRef, {
        id: transactionRef.id,
        bookingId: bookingRef.id,
        playerId: params.playerId,
        ownerId: params.ownerId,
        amount: amountPaid,
        method: params.paymentMethod,
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return newBooking;
}

export function subscribeToPlayerBookings(
  playerId: string,
  callback: (bookings: Booking[]) => void
): () => void {
  const q = query(
    collection(db, 'bookings'),
    where('playerId', '==', playerId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Booking);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
}

export function subscribeToOwnerBookings(
  ownerId: string,
  callback: (bookings: Booking[]) => void
): () => void {
  const q = query(
    collection(db, 'bookings'),
    where('ownerId', '==', ownerId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Booking);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
}

export async function cancelBooking(bookingId: string, slotId: string): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), {
    bookingStatus: 'CANCELLED',
  });
  await updateDoc(doc(db, 'slots', slotId), {
    status: 'AVAILABLE',
    bookedByUserId: null,
    bookedByName: null,
    bookingId: null,
  });
}
