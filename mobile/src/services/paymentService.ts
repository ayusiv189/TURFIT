import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, PaymentTransaction } from '../types';

export async function collectCounterPayment(
  bookingId: string,
  amount: number,
  note = 'Counter cash/UPI settlement'
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const txnRef = doc(collection(db, 'paymentTransactions'));

  await runTransaction(db, async (txn) => {
    const bookingSnap = await txn.get(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    const b = bookingSnap.data() as Booking;

    const newAmountPaid = (b.amountPaid || 0) + amount;
    const newAmountDue = Math.max(0, (b.totalAmount || 0) - (b.discountAmount || 0) - newAmountPaid);
    const newStatus = newAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    txn.update(bookingRef, {
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      paymentStatus: newStatus,
    });

    txn.set(txnRef, {
      id: txnRef.id,
      bookingId,
      playerId: b.playerId,
      ownerId: b.ownerId,
      amount,
      method: 'PAY_NOW_UPI',
      status: 'SUCCESS',
      note,
      createdAt: new Date().toISOString(),
    });
  });
}

export function subscribeToTransactions(
  userId: string,
  role: 'PLAYER' | 'OWNER',
  callback: (txns: PaymentTransaction[]) => void
): () => void {
  const field = role === 'PLAYER' ? 'playerId' : 'ownerId';
  const q = query(collection(db, 'paymentTransactions'), where(field, '==', userId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as PaymentTransaction);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
}
