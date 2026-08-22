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
} from 'firebase/firestore';
import { db } from './firebase';
import {
  TurfReview,
  TurfRatingStats,
  Offer,
  UserRewardWallet,
  RewardHistoryItem,
  RewardVoucher,
  RecurringSlotSchedule,
  BookingPlayerShare,
  PlayerDueSummary,
  PlayerRealStats,
  OwnerRealAnalytics,
  InAppNotification,
  NotificationType,
  Booking,
  Slot,
  Turf,
  Arena,
  PaymentTransaction,
  LobbyPlayer,
  TeamMember,
  MatchPlayer,
} from '../types';
import { getDayName } from './utils';

// ==========================================
// 1. NOTIFICATIONS ENGINE
// ==========================================

export async function sendNotification(
  params: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  const notifRef = doc(collection(db, 'notifications'));
  const payload: InAppNotification = {
    ...params,
    id: notifRef.id,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(notifRef, payload);
  return notifRef.id;
}

export async function getUserNotifications(userId: string): Promise<InAppNotification[]> {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as InAppNotification);
  // Sort descending by createdAt
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notifId);
  await updateDoc(docRef, { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true });
  });
  await batch.commit();
}

export async function deleteNotification(notifId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notifId));
}

// ==========================================
// 2. RATINGS & REVIEWS ENGINE
// ==========================================

export async function createTurfReview(params: {
  turfId: string;
  turfName: string;
  bookingId: string;
  playerId: string;
  playerName: string;
  playerPhotoURL?: string | null;
  rating: number;
  comment: string;
  photos?: string[];
}): Promise<string> {
  // Validate that booking exists and is completed/confirmed by this player
  const bookingRef = doc(db, 'bookings', params.bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) {
    throw new Error('Valid booking record required to submit a review.');
  }
  const booking = bookingSnap.data() as Booking;
  if (booking.playerId !== params.playerId) {
    throw new Error('You can only review bookings made from your own account.');
  }

  // Check for duplicate review on same booking
  const existingQ = query(
    collection(db, 'reviews'),
    where('bookingId', '==', params.bookingId),
    where('playerId', '==', params.playerId)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    throw new Error('You have already submitted a review for this booking.');
  }

  const reviewRef = doc(collection(db, 'reviews'));
  const now = new Date().toISOString();
  const reviewData: TurfReview = {
    id: reviewRef.id,
    turfId: params.turfId,
    turfName: params.turfName,
    bookingId: params.bookingId,
    playerId: params.playerId,
    playerName: params.playerName,
    playerPhotoURL: params.playerPhotoURL || null,
    rating: Math.min(5, Math.max(1, params.rating)),
    comment: params.comment.trim(),
    photos: params.photos || [],
    ownerResponse: null,
    ownerResponseAt: null,
    reported: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(reviewRef, reviewData);

  // Notify owner of new review
  if (booking.ownerId) {
    await sendNotification({
      recipientId: booking.ownerId,
      senderId: params.playerId,
      senderName: params.playerName,
      title: 'New Turf Review',
      message: `${params.playerName} gave ${params.rating}★ for ${params.turfName}: "${params.comment.slice(0, 60)}..."`,
      type: 'REVIEW_REQUEST',
      relatedId: reviewRef.id,
      relatedType: 'TURF',
    });
  }

  return reviewRef.id;
}

export async function getTurfReviews(turfId: string): Promise<TurfReview[]> {
  const q = query(collection(db, 'reviews'), where('turfId', '==', turfId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as TurfReview);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPlayerReviews(playerId: string): Promise<TurfReview[]> {
  const q = query(collection(db, 'reviews'), where('playerId', '==', playerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as TurfReview);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function calculateTurfRatingStats(reviews: TurfReview[]): TurfRatingStats {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      starPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star] = (breakdown[star] || 0) + 1;
    sum += r.rating;
  }

  const total = reviews.length;
  const percentages = {
    5: Math.round((breakdown[5] / total) * 100),
    4: Math.round((breakdown[4] / total) * 100),
    3: Math.round((breakdown[3] / total) * 100),
    2: Math.round((breakdown[2] / total) * 100),
    1: Math.round((breakdown[1] / total) * 100),
  };

  return {
    averageRating: Number((sum / total).toFixed(1)),
    totalReviews: total,
    starBreakdown: breakdown,
    starPercentages: percentages,
  };
}

export async function respondToTurfReview(reviewId: string, responseText: string): Promise<void> {
  const docRef = doc(db, 'reviews', reviewId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Review not found');

  const review = snap.data() as TurfReview;
  await updateDoc(docRef, {
    ownerResponse: responseText.trim(),
    ownerResponseAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Notify player of owner's response
  await sendNotification({
    recipientId: review.playerId,
    title: 'Turf Owner Responded',
    message: `The owner of ${review.turfName} replied to your review: "${responseText.slice(0, 60)}..."`,
    type: 'GENERAL',
    relatedId: reviewId,
    relatedType: 'TURF',
  });
}

export async function reportTurfReview(reviewId: string, reason: string): Promise<void> {
  const docRef = doc(db, 'reviews', reviewId);
  await updateDoc(docRef, {
    reported: true,
    reportReason: reason,
    updatedAt: new Date().toISOString(),
  });
}

// ==========================================
// 3. OFFERS & PROMOTIONS ENGINE
// ==========================================

export async function createOffer(
  params: Omit<Offer, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const offerRef = doc(collection(db, 'offers'));
  const now = new Date().toISOString();
  const payload: Offer = {
    ...params,
    id: offerRef.id,
    code: params.code.trim().toUpperCase(),
    usedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(offerRef, payload);
  return offerRef.id;
}

export async function getOwnerOffers(ownerId: string): Promise<Offer[]> {
  const q = query(collection(db, 'offers'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Offer);
}

export async function getActiveOffersForTurf(turfId: string): Promise<Offer[]> {
  const snap = await getDocs(collection(db, 'offers'));
  const today = new Date().toISOString().split('T')[0];
  return snap.docs
    .map((d) => d.data() as Offer)
    .filter(
      (o) =>
        o.active &&
        (o.turfId === 'ALL' || o.turfId === turfId) &&
        o.startDate <= today &&
        o.endDate >= today
    );
}

export interface DiscountCalculationResult {
  valid: boolean;
  message?: string;
  offer?: Offer;
  discountAmount: number;
  finalAmount: number;
}

export async function validateAndApplyOffer(
  code: string,
  turfId: string,
  arenaId: string,
  bookingDate: string,
  bookingDay: string,
  bookingAmount: number
): Promise<DiscountCalculationResult> {
  if (!code || !code.trim()) {
    return { valid: false, message: 'Please enter a coupon code.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const cleanCode = code.trim().toUpperCase();
  const q = query(collection(db, 'offers'), where('code', '==', cleanCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    return { valid: false, message: 'Coupon code is invalid or does not exist.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const offer = snap.docs[0].data() as Offer;

  if (!offer.active) {
    return { valid: false, message: 'This coupon code has been deactivated.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const today = new Date().toISOString().split('T')[0];
  if (bookingDate < offer.startDate || bookingDate > offer.endDate) {
    return { valid: false, message: `Coupon is valid only from ${offer.startDate} to ${offer.endDate}.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.turfId !== 'ALL' && offer.turfId !== turfId) {
    return { valid: false, message: 'This coupon is not applicable to this turf.', discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.arenaId && offer.arenaId !== 'ALL' && offer.arenaId !== arenaId) {
    return { valid: false, message: 'This coupon is not applicable to this arena.', discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.applicableDays && offer.applicableDays.length > 0 && !offer.applicableDays.includes(bookingDay)) {
    return { valid: false, message: `This coupon is only valid on: ${offer.applicableDays.join(', ')}.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.minBookingAmount && bookingAmount < offer.minBookingAmount) {
    return { valid: false, message: `Minimum booking amount to apply this coupon is ₹${offer.minBookingAmount}.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
    return { valid: false, message: 'This coupon has reached its maximum usage limit.', discountAmount: 0, finalAmount: bookingAmount };
  }

  let discount = 0;
  if (offer.discountType === 'PERCENTAGE') {
    discount = (bookingAmount * offer.discountValue) / 100;
    if (offer.maxDiscount && discount > offer.maxDiscount) {
      discount = offer.maxDiscount;
    }
  } else {
    discount = offer.discountValue;
  }

  // Ensure discount does not exceed total amount
  discount = Math.min(discount, bookingAmount);
  const finalAmount = Math.max(0, bookingAmount - discount);

  return {
    valid: true,
    offer,
    discountAmount: Math.round(discount),
    finalAmount: Math.round(finalAmount),
  };
}

export const applyCouponOffer = validateAndApplyOffer;

export async function incrementOfferUsage(offerId: string): Promise<void> {
  const offerRef = doc(db, 'offers', offerId);
  const snap = await getDoc(offerRef);
  if (snap.exists()) {
    const o = snap.data() as Offer;
    await updateDoc(offerRef, {
      usedCount: (o.usedCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ==========================================
// 4. LOYALTY & REWARDS PROGRAM
// ==========================================

export async function getUserRewardWallet(userId: string): Promise<UserRewardWallet> {
  const walletRef = doc(db, 'rewardWallets', userId);
  const snap = await getDoc(walletRef);
  if (!snap.exists()) {
    const initial: UserRewardWallet = {
      userId,
      pointsBalance: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(walletRef, initial);
    return initial;
  }
  return snap.data() as UserRewardWallet;
}

export async function awardLoyaltyPoints(
  userId: string,
  points: number,
  reason: string,
  bookingId?: string
): Promise<void> {
  if (points <= 0) return;
  const walletRef = doc(db, 'rewardWallets', userId);
  const now = new Date().toISOString();

  await runTransaction(db, async (txn) => {
    const walletSnap = await txn.get(walletRef);
    let currentBalance = 0;
    let lifetime = 0;
    let redeemed = 0;

    if (walletSnap.exists()) {
      const data = walletSnap.data() as UserRewardWallet;
      currentBalance = data.pointsBalance || 0;
      lifetime = data.lifetimeEarned || 0;
      redeemed = data.lifetimeRedeemed || 0;
    }

    txn.set(walletRef, {
      userId,
      pointsBalance: currentBalance + points,
      lifetimeEarned: lifetime + points,
      lifetimeRedeemed: redeemed,
      updatedAt: now,
    });

    const historyRef = doc(collection(db, 'rewardHistory'));
    txn.set(historyRef, {
      id: historyRef.id,
      userId,
      points,
      type: 'EARNED',
      reason,
      bookingId: bookingId || null,
      createdAt: now,
    });
  });

  // Notify player
  await sendNotification({
    recipientId: userId,
    title: 'TruFit Reward Points Earned! 🏆',
    message: `You earned +${points} points for ${reason}. Current balance: check your Rewards wallet!`,
    type: 'LOYALTY_REWARD',
    relatedType: 'REWARD',
  });
}

export async function redeemRewardVoucher(
  userId: string,
  pointsCost: number,
  discountAmount: number
): Promise<RewardVoucher> {
  const walletRef = doc(db, 'rewardWallets', userId);
  const now = new Date().toISOString();

  return await runTransaction(db, async (txn) => {
    const walletSnap = await txn.get(walletRef);
    if (!walletSnap.exists()) {
      throw new Error('Reward wallet not found.');
    }
    const wallet = walletSnap.data() as UserRewardWallet;
    if ((wallet.pointsBalance || 0) < pointsCost) {
      throw new Error(`Insufficient points. You need ${pointsCost} points but have ${wallet.pointsBalance || 0}.`);
    }

    const newBalance = wallet.pointsBalance - pointsCost;
    const newRedeemed = (wallet.lifetimeRedeemed || 0) + pointsCost;

    txn.update(walletRef, {
      pointsBalance: newBalance,
      lifetimeRedeemed: newRedeemed,
      updatedAt: now,
    });

    const voucherRef = doc(collection(db, 'rewardVouchers'));
    const voucherCode = `TF-REWARD-${Math.floor(1000 + Math.random() * 9000)}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 60); // 60 days validity

    const voucher: RewardVoucher = {
      id: voucherRef.id,
      userId,
      code: voucherCode,
      discountAmount,
      pointsCost,
      isUsed: false,
      expiresAt: expires.toISOString().split('T')[0],
      createdAt: now,
    };

    txn.set(voucherRef, voucher);

    const historyRef = doc(collection(db, 'rewardHistory'));
    txn.set(historyRef, {
      id: historyRef.id,
      userId,
      points: pointsCost,
      type: 'REDEEMED',
      reason: `Redeemed ₹${discountAmount} discount voucher`,
      createdAt: now,
    });

    return voucher;
  });
}

export async function getUserRewardVouchers(userId: string): Promise<RewardVoucher[]> {
  const q = query(collection(db, 'rewardVouchers'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RewardVoucher);
}

export async function getUserRewardHistory(userId: string): Promise<RewardHistoryItem[]> {
  const q = query(collection(db, 'rewardHistory'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as RewardHistoryItem);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==========================================
// 5. RECURRING SLOTS SCHEDULES & CONFLICT SAFETY
// ==========================================

export interface RecurringSlotPreviewItem {
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  price: number;
  hasConflict: boolean;
  conflictReason?: string;
}

export function calculateRecurringDates(
  startDate: string,
  endDate: string,
  selectedDays: string[]
): { date: string; day: string }[] {
  const results: { date: string; day: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayName = getDayName(dateStr);
    if (selectedDays.includes(dayName)) {
      results.push({ date: dateStr, day: dayName });
    }
  }
  return results;
}

export async function previewRecurringSlots(
  ownerId: string,
  turfId: string,
  arenaId: string,
  startDate: string,
  endDate: string,
  selectedDays: string[],
  startTime: string,
  endTime: string,
  price: number
): Promise<{ items: RecurringSlotPreviewItem[]; totalSlots: number; conflictCount: number }> {
  const dates = calculateRecurringDates(startDate, endDate, selectedDays);
  const items: RecurringSlotPreviewItem[] = [];

  // Fetch existing slots for this arena in the given date range to check conflicts
  const q = query(collection(db, 'slots'), where('arenaId', '==', arenaId));
  const snap = await getDocs(q);
  const existingSlots = snap.docs.map((d) => d.data() as Slot);

  let conflictCount = 0;

  for (const item of dates) {
    // Check if slot with same date and time already exists and is booked
    const match = existingSlots.find(
      (s) => s.date === item.date && s.startTime === startTime
    );

    if (match) {
      if (match.status !== 'AVAILABLE') {
        items.push({
          date: item.date,
          day: item.day,
          startTime,
          endTime,
          price,
          hasConflict: true,
          conflictReason: `Already booked (${match.status}) - existing booking preserved`,
        });
        conflictCount++;
      } else {
        items.push({
          date: item.date,
          day: item.day,
          startTime,
          endTime,
          price,
          hasConflict: false,
          conflictReason: 'Will update existing available slot',
        });
      }
    } else {
      items.push({
        date: item.date,
        day: item.day,
        startTime,
        endTime,
        price,
        hasConflict: false,
      });
    }
  }

  return {
    items,
    totalSlots: items.length,
    conflictCount,
  };
}

export async function generateRecurringSlots(params: {
  ownerId: string;
  turfId: string;
  arenaId: string;
  startDate: string;
  endDate: string;
  selectedDays: string[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  visibleToPlayers: boolean;
}): Promise<{ createdCount: number; preservedCount: number }> {
  const preview = await previewRecurringSlots(
    params.ownerId,
    params.turfId,
    params.arenaId,
    params.startDate,
    params.endDate,
    params.selectedDays,
    params.startTime,
    params.endTime,
    params.price
  );

  const now = new Date().toISOString();
  let createdCount = 0;
  let preservedCount = 0;

  // Query existing slots for this arena
  const q = query(collection(db, 'slots'), where('arenaId', '==', params.arenaId));
  const snap = await getDocs(q);
  const existingSlots = snap.docs.map((d) => d.data() as Slot);

  for (const item of preview.items) {
    if (item.hasConflict) {
      // PRESERVE BOOKED SLOTS SAFELY!
      preservedCount++;
      continue;
    }

    const match = existingSlots.find(
      (s) => s.date === item.date && s.startTime === params.startTime
    );

    if (match) {
      // Update available slot
      const docRef = doc(db, 'slots', match.id);
      await updateDoc(docRef, {
        price: params.price,
        durationMinutes: params.durationMinutes,
        endTime: params.endTime,
        visibleToPlayers: params.visibleToPlayers,
        updatedAt: now,
      });
      createdCount++;
    } else {
      // Create new slot
      const slotRef = doc(collection(db, 'slots'));
      const slotPayload: Slot = {
        id: slotRef.id,
        turfId: params.turfId,
        arenaId: params.arenaId,
        ownerId: params.ownerId,
        date: item.date,
        day: item.day,
        startTime: params.startTime,
        endTime: params.endTime,
        durationMinutes: params.durationMinutes,
        price: params.price,
        visibleToPlayers: params.visibleToPlayers,
        status: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(slotRef, slotPayload);
      createdCount++;
    }
  }

  // Record recurring schedule definition
  const scheduleRef = doc(collection(db, 'recurringSchedules'));
  const schedulePayload: RecurringSlotSchedule = {
    id: scheduleRef.id,
    ownerId: params.ownerId,
    turfId: params.turfId,
    arenaId: params.arenaId,
    days: params.selectedDays,
    startDate: params.startDate,
    endDate: params.endDate,
    startTime: params.startTime,
    endTime: params.endTime,
    durationMinutes: params.durationMinutes,
    price: params.price,
    visibleToPlayers: params.visibleToPlayers,
    active: true,
    slotsGeneratedCount: createdCount,
    createdAt: now,
  };
  await setDoc(scheduleRef, schedulePayload);

  return { createdCount, preservedCount };
}

// ==========================================
// 6. PAYMENT SPLITTING & PLAYER DUES ENGINE
// ==========================================

export async function getBookingPlayerShares(bookingId: string): Promise<BookingPlayerShare[]> {
  const q = query(collection(db, 'bookingShares'), where('bookingId', '==', bookingId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BookingPlayerShare);
}

export async function initializePaymentSplit(
  booking: Booking,
  players: { uid: string; name: string; email: string; photoURL?: string | null }[]
): Promise<BookingPlayerShare[]> {
  if (!players || players.length === 0) return [];

  const sharePerPlayer = Math.round(booking.totalAmount / players.length);
  const now = new Date().toISOString();
  const shares: BookingPlayerShare[] = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    // If booker already paid the full amount online
    const isBooker = p.uid === booking.playerId;
    let amountPaid = 0;
    if (isBooker && booking.paymentStatus === 'PAID') {
      amountPaid = sharePerPlayer;
    }

    const shareId = `${booking.id}_${p.uid}`;
    const shareDoc = doc(db, 'bookingShares', shareId);
    const amountDue = Math.max(0, sharePerPlayer - amountPaid);
    const status = amountDue === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    const shareData: BookingPlayerShare = {
      id: shareId,
      bookingId: booking.id,
      turfId: booking.turfId,
      ownerId: booking.ownerId,
      playerId: p.uid,
      playerName: p.name,
      playerEmail: p.email,
      playerPhotoURL: p.photoURL || null,
      shareAmount: sharePerPlayer,
      amountPaid,
      amountDue,
      status,
      lastPaymentAt: amountPaid > 0 ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(shareDoc, shareData);
    shares.push(shareData);

    // Notify player of payment share due
    if (!isBooker) {
      await sendNotification({
        recipientId: p.uid,
        senderId: booking.playerId,
        senderName: booking.playerName,
        title: 'Payment Share Allocated',
        message: `Your share for ${booking.turfName} (${booking.date} at ${booking.startTime}) is ₹${sharePerPlayer}.`,
        type: 'PAYMENT_DUE',
        relatedId: booking.id,
        relatedType: 'BOOKING',
      });
    }
  }

  return shares;
}

export async function recordPlayerSharePayment(params: {
  bookingId: string;
  playerId: string;
  amount: number;
  paymentMethod: 'ONLINE_UPI' | 'ONLINE_CARD' | 'CASH_AT_TURF';
  notes?: string;
}): Promise<void> {
  const shareId = `${params.bookingId}_${params.playerId}`;
  const shareRef = doc(db, 'bookingShares', shareId);
  const bookingRef = doc(db, 'bookings', params.bookingId);
  const now = new Date().toISOString();

  await runTransaction(db, async (txn) => {
    const shareSnap = await txn.get(shareRef);
    const bookingSnap = await txn.get(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error('Booking record not found.');
    }
    const booking = bookingSnap.data() as Booking;

    let currentSharePaid = 0;
    let shareAmount = booking.totalAmount;
    let playerName = booking.playerName;
    let playerEmail = booking.playerEmail;

    if (shareSnap.exists()) {
      const shareData = shareSnap.data() as BookingPlayerShare;
      currentSharePaid = shareData.amountPaid || 0;
      shareAmount = shareData.shareAmount || booking.totalAmount;
      playerName = shareData.playerName;
      playerEmail = shareData.playerEmail;
    }

    const newSharePaid = currentSharePaid + params.amount;
    const newShareDue = Math.max(0, shareAmount - newSharePaid);
    const newShareStatus = newShareDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

    // 1. Update or create share
    const sharePayload: BookingPlayerShare = {
      id: shareId,
      bookingId: params.bookingId,
      turfId: booking.turfId,
      ownerId: booking.ownerId,
      playerId: params.playerId,
      playerName,
      playerEmail,
      playerPhotoURL: null,
      shareAmount,
      amountPaid: newSharePaid,
      amountDue: newShareDue,
      status: newShareStatus,
      lastPaymentAt: now,
      createdAt: shareSnap.exists() ? (shareSnap.data() as BookingPlayerShare).createdAt : now,
      updatedAt: now,
    };
    txn.set(shareRef, sharePayload);

    // 2. Update overall booking amounts
    const overallPaid = (booking.amountPaid || 0) + params.amount;
    const overallDue = Math.max(0, booking.totalAmount - overallPaid);
    const overallStatus = overallDue === 0 ? 'PAID' : overallPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    txn.update(bookingRef, {
      amountPaid: overallPaid,
      amountDue: overallDue,
      paymentStatus: overallStatus,
      updatedAt: now,
    });

    // 3. Record immutable PaymentTransaction
    const txRef = doc(collection(db, 'paymentTransactions'));
    const txData: PaymentTransaction = {
      id: txRef.id,
      transactionId: `TXN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: params.bookingId,
      playerId: params.playerId,
      ownerId: booking.ownerId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      status: 'SUCCESS',
      notes: params.notes || `Player payment installment of ₹${params.amount}`,
      createdAt: now,
    };
    txn.set(txRef, txData);
  });

  // Award loyalty points for successful payment (1 point per ₹10 spent)
  const earnedPoints = Math.floor(params.amount / 10);
  if (earnedPoints > 0) {
    await awardLoyaltyPoints(params.playerId, earnedPoints, `Slot payment at turf`, params.bookingId);
  }
}

export async function getOwnerPlayerDues(ownerId: string): Promise<PlayerDueSummary[]> {
  const bookingsQ = query(collection(db, 'bookings'), where('ownerId', '==', ownerId));
  const snap = await getDocs(bookingsQ);
  const allBookings = snap.docs.map((d) => d.data() as Booking);

  const playerMap = new Map<string, PlayerDueSummary>();

  for (const b of allBookings) {
    if (!playerMap.has(b.playerId)) {
      playerMap.set(b.playerId, {
        playerId: b.playerId,
        playerName: b.playerName,
        playerEmail: b.playerEmail,
        playerPhone: b.playerPhone,
        playerPhotoURL: b.playerPhotoURL || null,
        totalBookings: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        lastPaymentDate: undefined,
        bookings: [],
      });
    }

    const summary = playerMap.get(b.playerId)!;
    summary.totalBookings += 1;
    summary.totalAmount += b.totalAmount || 0;
    summary.totalPaid += b.amountPaid || 0;
    summary.totalPending += b.amountDue || 0;
    summary.bookings.push(b);

    if (b.updatedAt && (!summary.lastPaymentDate || b.updatedAt > summary.lastPaymentDate)) {
      summary.lastPaymentDate = b.updatedAt;
    }
  }

  return Array.from(playerMap.values());
}

// ==========================================
// 7. REAL-DATA PLAYER & OWNER ANALYTICS
// ==========================================

export async function calculatePlayerRealStats(playerId: string): Promise<PlayerRealStats> {
  // 1. Player Bookings
  const bookingsQ = query(collection(db, 'bookings'), where('playerId', '==', playerId));
  const bookingsSnap = await getDocs(bookingsQ);
  const bookings = bookingsSnap.docs.map((d) => d.data() as Booking);

  const completedBookings = bookings.filter((b) => b.bookingStatus === 'COMPLETED' || b.paymentStatus === 'PAID');
  const totalAmountSpent = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);

  let totalDurationMinutes = 0;
  const turfCountMap = new Map<string, number>();
  const sportsSet = new Set<string>();
  const sportCountMap = new Map<string, number>();

  for (const b of completedBookings) {
    totalDurationMinutes += b.duration || 60;
    if (b.turfName) {
      turfCountMap.set(b.turfName, (turfCountMap.get(b.turfName) || 0) + 1);
    }
    if (b.sport) {
      sportsSet.add(b.sport);
      sportCountMap.set(b.sport, (sportCountMap.get(b.sport) || 0) + 1);
    }
  }

  let favoriteTurf = 'None yet';
  let maxTurfCount = 0;
  for (const [turf, count] of turfCountMap.entries()) {
    if (count > maxTurfCount) {
      maxTurfCount = count;
      favoriteTurf = turf;
    }
  }

  let favoriteSport = 'None yet';
  let maxSportCount = 0;
  for (const [sport, count] of sportCountMap.entries()) {
    if (count > maxSportCount) {
      maxSportCount = count;
      favoriteSport = sport;
    }
  }

  // 2. Lobbies joined
  const lobbyPlayersQ = query(collection(db, 'lobbyPlayers'), where('uid', '==', playerId));
  const lpSnap = await getDocs(lobbyPlayersQ);
  const lobbiesJoined = lpSnap.size;

  // 3. Teams joined
  const teamMembersQ = query(collection(db, 'teamMembers'), where('uid', '==', playerId));
  const tmSnap = await getDocs(teamMembersQ);
  const teamsJoined = tmSnap.size;

  // 4. Matches played / hosted
  const matchPlayersQ = query(collection(db, 'matchPlayers'), where('uid', '==', playerId));
  const mpSnap = await getDocs(matchPlayersQ);
  const matchesPlayed = mpSnap.size;

  const matchesHostedQ = query(collection(db, 'matches'), where('hostId', '==', playerId));
  const mhSnap = await getDocs(matchesHostedQ);
  const matchesHosted = mhSnap.size;

  return {
    matchesPlayed,
    matchesHosted,
    lobbiesJoined,
    teamsJoined,
    bookingsCompleted: completedBookings.length,
    hoursPlayed: Number((totalDurationMinutes / 60).toFixed(1)),
    sportsPlayed: Array.from(sportsSet),
    favoriteSport,
    favoriteTurf,
    totalAmountSpent,
  };
}

export async function calculateOwnerRealAnalytics(ownerId: string): Promise<OwnerRealAnalytics> {
  const bookingsQ = query(collection(db, 'bookings'), where('ownerId', '==', ownerId));
  const snap = await getDocs(bookingsQ);
  const bookings = snap.docs.map((d) => d.data() as Booking);

  if (bookings.length === 0) {
    return {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      todayBookings: 0,
      weeklyBookings: 0,
      monthlyBookings: 0,
      totalBookingValue: 0,
      amountCollected: 0,
      amountPending: 0,
      refundedAmount: 0,
      cancelledAmount: 0,
      discountAmount: 0,
      netRevenue: 0,
      popularArenaName: 'No data',
      popularTimeSlot: 'No data',
      popularDay: 'No data',
      mostBookedSport: 'No data',
      repeatPlayersCount: 0,
      averageBookingValue: 0,
      occupancyRatePercent: 0,
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let completedBookings = 0;
  let cancelledBookings = 0;
  let todayBookings = 0;
  let weeklyBookings = 0;
  let monthlyBookings = 0;
  let totalBookingValue = 0;
  let amountCollected = 0;
  let amountPending = 0;
  let cancelledAmount = 0;

  const arenaCountMap = new Map<string, number>();
  const timeSlotCountMap = new Map<string, number>();
  const dayCountMap = new Map<string, number>();
  const sportCountMap = new Map<string, number>();
  const playerBookingsMap = new Map<string, number>();

  for (const b of bookings) {
    totalBookingValue += b.totalAmount || 0;
    amountCollected += b.amountPaid || 0;
    amountPending += b.amountDue || 0;

    if (b.bookingStatus === 'COMPLETED') completedBookings++;
    if (b.bookingStatus === 'CANCELLED') {
      cancelledBookings++;
      cancelledAmount += b.totalAmount || 0;
    }

    if (b.date === todayStr) todayBookings++;
    if (b.date >= oneWeekAgo) weeklyBookings++;
    if (b.date >= oneMonthAgo) monthlyBookings++;

    if (b.arenaName) arenaCountMap.set(b.arenaName, (arenaCountMap.get(b.arenaName) || 0) + 1);
    if (b.startTime) timeSlotCountMap.set(b.startTime, (timeSlotCountMap.get(b.startTime) || 0) + 1);
    if (b.day) dayCountMap.set(b.day, (dayCountMap.get(b.day) || 0) + 1);
    if (b.sport) sportCountMap.set(b.sport, (sportCountMap.get(b.sport) || 0) + 1);
    if (b.playerId) playerBookingsMap.set(b.playerId, (playerBookingsMap.get(b.playerId) || 0) + 1);
  }

  // Find max helpers
  const getMaxKey = (map: Map<string, number>) => {
    let maxK = 'No data';
    let maxV = 0;
    for (const [k, v] of map.entries()) {
      if (v > maxV) {
        maxV = v;
        maxK = k;
      }
    }
    return maxK;
  };

  let repeatPlayersCount = 0;
  for (const count of playerBookingsMap.values()) {
    if (count > 1) repeatPlayersCount++;
  }

  // Fetch slots to compute occupancy rate
  const slotsQ = query(collection(db, 'slots'), where('ownerId', '==', ownerId));
  const slotsSnap = await getDocs(slotsQ);
  const totalSlotsCount = slotsSnap.size;
  const bookedSlotsCount = slotsSnap.docs.filter((d) => (d.data() as Slot).status !== 'AVAILABLE').length;
  const occupancyRate = totalSlotsCount > 0 ? Math.round((bookedSlotsCount / totalSlotsCount) * 100) : 0;

  return {
    totalBookings: bookings.length,
    completedBookings,
    cancelledBookings,
    todayBookings,
    weeklyBookings,
    monthlyBookings,
    totalBookingValue,
    amountCollected,
    amountPending,
    refundedAmount: 0,
    cancelledAmount,
    discountAmount: 0,
    netRevenue: amountCollected,
    popularArenaName: getMaxKey(arenaCountMap),
    popularTimeSlot: getMaxKey(timeSlotCountMap),
    popularDay: getMaxKey(dayCountMap),
    mostBookedSport: getMaxKey(sportCountMap),
    repeatPlayersCount,
    averageBookingValue: Math.round(totalBookingValue / (bookings.length || 1)),
    occupancyRatePercent: occupancyRate,
  };
}
