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
import { calculateStandardBookingFinancials } from './utils';
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
  HourlyOccupancySlot,
  DayOccupancyItem,
  TimeBlockOccupancy,
  SportRevenueShare,
  ArenaPerformance,
  TopRegularPlayer,
  AnalyticsSmartRecommendation,
  PlayerRating,
  PlayerBadgeType,
  PlayerSportsmanshipStats,
  UserProfile,
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
  PlayerPool,
  PoolInterestedPlayer,
  MatchHoursCategory,
} from '../types';
import { getDayName, sanitizeFirestoreData, parseLocalDate, formatLocalDate } from './utils';
import { getAllActiveTurfs, getTurfArenas, getArenaSlotsByDate } from './db';

// ==========================================
// 1. NOTIFICATIONS ENGINE
// ==========================================

export async function sendNotification(
  params: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  // Check recipient's notification settings if user document exists
  let pushToken: string | undefined;
  let isPushEnabled = true;

  try {
    const userRef = doc(db, 'users', params.recipientId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data() as any;
      const settings = uData?.notificationSettings;
      // Check specific preference flags
      if (params.type === 'POST_LIKE' && settings?.socialLikes === false) {
        return '';
      }
      if (params.type === 'POST_COMMENT' && settings?.socialComments === false) {
        return '';
      }
      if (params.type === 'USER_FOLLOW' && settings?.socialFollows === false) {
        return '';
      }
      if (params.type === 'BOOKING_CONFIRMED' && settings?.bookingAlerts === false) {
        return '';
      }
      if (params.type === 'MATCH_INVITE' && settings?.matchAlerts === false) {
        return '';
      }

      pushToken = uData?.pushToken;
      isPushEnabled = uData?.pushNotificationsEnabled !== false;
    }
  } catch (err) {
    console.warn('Silent user settings check warning:', err);
  }

  const notifRef = doc(collection(db, 'notifications'));
  const payload: InAppNotification = {
    ...params,
    id: notifRef.id,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(notifRef, sanitizeFirestoreData(payload));

  // Dispatch mobile push notification if recipient has registered device token
  try {
    if (pushToken && isPushEnabled && pushToken.startsWith('ExponentPushToken[')) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          sound: 'default',
          title: params.title,
          body: params.message,
          badge: 1,
          data: {
            notificationId: notifRef.id,
            type: params.type,
            relatedId: params.relatedId,
          },
        }),
      }).catch((err) => {
        console.warn('Silent push dispatch notice:', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('Could not dispatch push notification from web engine:', err);
  }

  return notifRef.id;
}

export async function getUserNotifications(userId: string): Promise<InAppNotification[]> {
  if (!userId) return [];
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InAppNotification));
  // Sort descending by createdAt
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  if (!notifId) return;
  const docRef = doc(db, 'notifications', notifId);
  await updateDoc(docRef, { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
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

  await setDoc(reviewRef, sanitizeFirestoreData(reviewData));

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
  if (!turfId || typeof turfId !== 'string' || !turfId.trim()) return [];
  const q = query(collection(db, 'reviews'), where('turfId', '==', turfId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TurfReview));
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPlayerReviews(playerId: string): Promise<TurfReview[]> {
  if (!playerId || typeof playerId !== 'string' || !playerId.trim()) return [];
  const q = query(collection(db, 'reviews'), where('playerId', '==', playerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TurfReview));
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
  await setDoc(offerRef, sanitizeFirestoreData(payload));
  return offerRef.id;
}

export async function getOwnerOffers(ownerId: string): Promise<Offer[]> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) return [];
  const q = query(collection(db, 'offers'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
}

export async function getActiveOffersForTurf(turfId: string): Promise<Offer[]> {
  const snap = await getDocs(collection(db, 'offers'));
  const today = new Date().toISOString().split('T')[0];
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Offer))
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

  if (offer.usageLimit && (offer.usedCount || 0) >= offer.usageLimit) {
    return { valid: false, message: `This coupon has reached its maximum usage limit of ${offer.usageLimit} redemptions.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  let discount = 0;
  if (offer.discountType === 'PERCENTAGE') {
    discount = (bookingAmount * offer.discountValue) / 100;
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
    await setDoc(walletRef, sanitizeFirestoreData(initial));
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
    title: 'TurFit Reward Points Earned! 🏆',
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
  if (!userId || typeof userId !== 'string' || !userId.trim()) return [];
  const q = query(collection(db, 'rewardVouchers'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RewardVoucher));
}

export async function getUserRewardHistory(userId: string): Promise<RewardHistoryItem[]> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return [];
  const q = query(collection(db, 'rewardHistory'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RewardHistoryItem));
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
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatLocalDate(d);
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

  if (!arenaId) {
    return { items: [], totalSlots: 0, conflictCount: 0 };
  }

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
  if (!params.arenaId) {
    return { createdCount: 0, preservedCount: 0 };
  }
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
      await setDoc(slotRef, sanitizeFirestoreData(slotPayload));
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
  await setDoc(scheduleRef, sanitizeFirestoreData(schedulePayload));

  return { createdCount, preservedCount };
}

// ==========================================
// 6. PAYMENT SPLITTING & PLAYER DUES ENGINE
// ==========================================

export async function getBookingPlayerShares(bookingId: string): Promise<BookingPlayerShare[]> {
  if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) return [];
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

    await setDoc(shareDoc, sanitizeFirestoreData(shareData));
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
  paymentMethod: 'ONLINE_UPI' | 'ONLINE_CARD' | 'CASH_AT_TURF' | 'DIRECT_OWNER_UPI';
  notes?: string;
  isOwnerVerified?: boolean;
  upiTxnRef?: string;
}): Promise<void> {
  const shareId = `${params.bookingId}_${params.playerId}`;
  const shareRef = doc(db, 'bookingShares', shareId);
  const bookingRef = doc(db, 'bookings', params.bookingId);
  const now = new Date().toISOString();

  // If verified by owner or paid via online gateway, it settles amounts immediately
  const isVerified = Boolean(
    params.isOwnerVerified ||
    params.paymentMethod === 'ONLINE_UPI' ||
    params.paymentMethod === 'ONLINE_CARD'
  );
  let ownerIdToNotify = '';

  await runTransaction(db, async (txn) => {
    const bookingSnap = await txn.get(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error('Booking record not found.');
    }
    const booking = bookingSnap.data() as Booking;
    ownerIdToNotify = booking.ownerId;

    if (isVerified) {
      // ONLINE UPI / CARD or OWNER-VERIFIED: Update share and booking amounts immediately
      const shareSnap = await txn.get(shareRef);
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

      const overallPaid = (booking.amountPaid || 0) + params.amount;
      const overallDue = Math.max(0, booking.totalAmount - overallPaid);
      const overallStatus = overallDue === 0 ? 'PAID' : overallPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

      const bookingUpdatePayload: any = {
        amountPaid: overallPaid,
        amountDue: overallDue,
        paymentStatus: overallStatus,
        updatedAt: now,
      };
      if (params.upiTxnRef) {
        bookingUpdatePayload.upiTxnRef = params.upiTxnRef;
      }
      txn.update(bookingRef, bookingUpdatePayload);
    } else {
      // Unverified payment reported by player (Direct UPI or Cash) - save UTR reference if provided
      if (params.upiTxnRef) {
        txn.update(bookingRef, {
          upiTxnRef: params.upiTxnRef,
          updatedAt: now,
        });
      }
    }

    // Record immutable PaymentTransaction
    const txRef = doc(collection(db, 'paymentTransactions'));
    const txData: PaymentTransaction = {
      id: txRef.id,
      transactionId: `TXN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: params.bookingId,
      playerId: params.playerId,
      ownerId: booking.ownerId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      status: isVerified ? 'SUCCESS' : 'PENDING',
      notes: params.notes || (isVerified 
        ? `Verified settlement of ₹${params.amount} via ${params.paymentMethod}`
        : params.paymentMethod === 'DIRECT_OWNER_UPI'
          ? `Direct UPI payment reported - Ref: ${params.upiTxnRef || 'N/A'} (₹${params.amount})`
          : `Cash payment submitted - Awaiting owner collection confirmation (₹${params.amount})`),
      createdAt: now,
    };
    txn.set(txRef, txData);
  });

  // If unverified, send alert notification to turf owner for verification
  if (!isVerified && ownerIdToNotify) {
    const isDirectUpi = params.paymentMethod === 'DIRECT_OWNER_UPI';
    await sendNotification({
      recipientId: ownerIdToNotify,
      senderId: params.playerId,
      title: isDirectUpi ? '📲 Direct UPI Payment Reported' : '💵 Cash Payment Submitted',
      message: isDirectUpi
        ? `A player reported a direct UPI payment of ₹${params.amount} (Ref: ${params.upiTxnRef || 'N/A'}) for booking ${params.bookingId}. Please verify in your dues manager.`
        : `A player submitted a cash payment of ₹${params.amount} for booking ${params.bookingId}. Please confirm collection in your dues manager.`,
      type: 'PAYMENT_DUE',
      relatedId: params.bookingId,
    });
  }

  // Award loyalty points for verified payments
  if (isVerified) {
    const earnedPoints = Math.floor(params.amount / 10);
    if (earnedPoints > 0) {
      await awardLoyaltyPoints(params.playerId, earnedPoints, `Slot payment at turf`, params.bookingId);
    }
  }
}

export async function getOwnerPlayerDues(ownerId: string): Promise<PlayerDueSummary[]> {
  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) return [];
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
  if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
    return {
      matchesPlayed: 0,
      matchesHosted: 0,
      lobbiesJoined: 0,
      teamsJoined: 0,
      bookingsCompleted: 0,
      hoursPlayed: 0,
      sportsPlayed: [],
      favoriteSport: 'None yet',
      favoriteTurf: 'None yet',
      totalAmountSpent: 0,
    };
  }
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

export async function calculateOwnerRealAnalytics(
  ownerId: string,
  timeframe: 'ALL' | '30D' | '7D' | 'TODAY' = 'ALL',
  arenaId: string = 'ALL'
): Promise<OwnerRealAnalytics> {
  const emptyAnalytics: OwnerRealAnalytics = {
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
    onlineRevenue: 0,
    cashRevenue: 0,
    popularArenaName: 'No data',
    popularTimeSlot: 'No data',
    popularDay: 'No data',
    mostBookedSport: 'No data',
    repeatPlayersCount: 0,
    newPlayersCount: 0,
    repeatRatePercent: 0,
    averageBookingValue: 0,
    occupancyRatePercent: 0,
    leadTimeHoursAvg: 0,
    hourlyHeatmap: [],
    dayBreakdown: [],
    timeBlocks: [],
    sportShares: [],
    arenaPerformances: [],
    topRegularPlayers: [],
    smartRecommendations: [],
    selectedArenaId: arenaId,
    selectedArenaName: arenaId !== 'ALL' ? 'Selected Arena' : 'All Arenas',
    availableArenas: [],
  };

  if (!ownerId || typeof ownerId !== 'string' || !ownerId.trim()) {
    return emptyAnalytics;
  }

  const [bookingsSnap, slotsSnap, arenasSnap] = await Promise.all([
    getDocs(query(collection(db, 'bookings'), where('ownerId', '==', ownerId))),
    getDocs(query(collection(db, 'slots'), where('ownerId', '==', ownerId))),
    getDocs(query(collection(db, 'arenas'), where('ownerId', '==', ownerId))),
  ]);

  const rawBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  const rawSlots = slotsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Slot));
  const allArenas = arenasSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Arena));

  const isSpecificArena = arenaId && arenaId !== 'ALL';
  const selectedArenaObj = isSpecificArena ? allArenas.find((a) => a.id === arenaId) : null;
  const allBookings = isSpecificArena ? rawBookings.filter((b) => b.arenaId === arenaId) : rawBookings;
  const allSlots = isSpecificArena ? rawSlots.filter((s) => s.arenaId === arenaId) : rawSlots;

  if (allBookings.length === 0 && allSlots.length === 0) {
    return {
      ...emptyAnalytics,
      selectedArenaId: arenaId,
      selectedArenaName: selectedArenaObj ? selectedArenaObj.name : 'All Arenas & Grounds',
      availableArenas: allArenas.map((a) => ({ id: a.id, name: a.name, sport: a.sport || 'Sports' })),
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filter bookings based on selected timeframe
  let bookings = allBookings;
  if (timeframe === 'TODAY') {
    bookings = allBookings.filter((b) => b.date === todayStr);
  } else if (timeframe === '7D') {
    bookings = allBookings.filter((b) => b.date >= sevenDaysAgo);
  } else if (timeframe === '30D') {
    bookings = allBookings.filter((b) => b.date >= thirtyDaysAgo);
  }

  let completedBookings = 0;
  let cancelledBookings = 0;
  let todayBookings = 0;
  let weeklyBookings = 0;
  let monthlyBookings = 0;
  let totalBookingValue = 0;
  let amountCollected = 0;
  let amountPending = 0;
  let cancelledAmount = 0;
  let onlineRevenue = 0;
  let cashRevenue = 0;
  let totalLeadTimeHours = 0;
  let validLeadTimeCount = 0;

  const arenaCountMap = new Map<string, { count: number; revenue: number; sport: string; id: string }>();
  const timeSlotCountMap = new Map<string, number>();
  const dayCountMap = new Map<string, { count: number; revenue: number }>();
  const sportCountMap = new Map<string, { count: number; revenue: number }>();
  const playerStatsMap = new Map<string, {
    playerId: string;
    name: string;
    phone?: string;
    photoURL?: string | null;
    count: number;
    spent: number;
    sports: Map<string, number>;
    lastDate?: string;
  }>();

  // Hourly counts across 06:00 to 23:00 (18 hours)
  const hourlyCountMap = new Map<number, number>();
  for (let h = 6; h <= 23; h++) {
    hourlyCountMap.set(h, 0);
  }

  // Days initialization
  const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  fullDays.forEach((d) => dayCountMap.set(d, { count: 0, revenue: 0 }));

  // Time blocks initialization
  const timeBlockMap = {
    MORNING: { count: 0, revenue: 0 },
    AFTERNOON: { count: 0, revenue: 0 },
    EVENING: { count: 0, revenue: 0 },
    NIGHT: { count: 0, revenue: 0 },
  };

  for (const b of allBookings) {
    if (b.date === todayStr) todayBookings++;
    if (b.date >= sevenDaysAgo) weeklyBookings++;
    if (b.date >= thirtyDaysAgo) monthlyBookings++;
  }

  for (const b of bookings) {
    const isCancelled = b.bookingStatus === 'CANCELLED';
    const isCompleted = b.bookingStatus === 'COMPLETED';
    const grossVal = b.totalAmount || 0;

    totalBookingValue += grossVal;
    if (isCompleted) completedBookings++;

    const split = calculateStandardBookingFinancials(b);
    const paidVal = split.onlineRevenue + split.cashRevenue;

    if (isCancelled) {
      cancelledBookings++;
      cancelledAmount += grossVal;
      onlineRevenue += split.onlineRevenue;
      cashRevenue += split.cashRevenue;
      amountCollected += (split.onlineRevenue + split.cashRevenue);
    } else {
      amountCollected += (split.onlineRevenue + split.cashRevenue);
      amountPending += split.pendingDue;
      onlineRevenue += split.onlineRevenue;
      cashRevenue += split.cashRevenue;
    }

    // Lead time calculation
    if (b.createdAt && b.date) {
      try {
        const createdMs = new Date(b.createdAt).getTime();
        const startHour = b.startTime ? parseInt(b.startTime.split(':')[0], 10) || 12 : 12;
        const targetMs = new Date(`${b.date}T${String(startHour).padStart(2, '0')}:00:00`).getTime();
        const diffHours = (targetMs - createdMs) / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours < 720) {
          totalLeadTimeHours += diffHours;
          validLeadTimeCount++;
        }
      } catch {}
    }

    // Arena Aggregations
    const arenaKey = b.arenaName || 'Main Arena';
    const curArena = arenaCountMap.get(arenaKey) || { count: 0, revenue: 0, sport: b.sport || 'Sports', id: b.arenaId || '' };
    curArena.count += 1;
    if (!isCancelled) curArena.revenue += paidVal;
    arenaCountMap.set(arenaKey, curArena);

    // Time Slot Aggregations
    if (b.startTime) {
      timeSlotCountMap.set(b.startTime, (timeSlotCountMap.get(b.startTime) || 0) + 1);

      let hourNum = 18;
      const lowerTime = b.startTime.toLowerCase();
      const match = lowerTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (match) {
        let rawH = parseInt(match[1], 10);
        const meridiem = match[3];
        if (meridiem === 'pm' && rawH < 12) rawH += 12;
        if (meridiem === 'am' && rawH === 12) rawH = 0;
        hourNum = rawH;
      }

      if (hourNum >= 6 && hourNum <= 23) {
        hourlyCountMap.set(hourNum, (hourlyCountMap.get(hourNum) || 0) + 1);
      }

      if (hourNum >= 6 && hourNum < 11) {
        timeBlockMap.MORNING.count += 1;
        if (!isCancelled) timeBlockMap.MORNING.revenue += paidVal;
      } else if (hourNum >= 11 && hourNum < 16) {
        timeBlockMap.AFTERNOON.count += 1;
        if (!isCancelled) timeBlockMap.AFTERNOON.revenue += paidVal;
      } else if (hourNum >= 16 && hourNum < 20) {
        timeBlockMap.EVENING.count += 1;
        if (!isCancelled) timeBlockMap.EVENING.revenue += paidVal;
      } else {
        timeBlockMap.NIGHT.count += 1;
        if (!isCancelled) timeBlockMap.NIGHT.revenue += paidVal;
      }
    }

    // Day Aggregations
    let dayKey = b.day;
    if (!dayKey && b.date) {
      try {
        const d = new Date(b.date);
        dayKey = fullDays[d.getDay() === 0 ? 6 : d.getDay() - 1];
      } catch {}
    }
    if (dayKey) {
      const curDay = dayCountMap.get(dayKey) || { count: 0, revenue: 0 };
      curDay.count += 1;
      if (!isCancelled) curDay.revenue += paidVal;
      dayCountMap.set(dayKey, curDay);
    }

    // Sport Aggregations
    const sportKey = b.sport || 'Football';
    const curSport = sportCountMap.get(sportKey) || { count: 0, revenue: 0 };
    curSport.count += 1;
    if (!isCancelled) curSport.revenue += paidVal;
    sportCountMap.set(sportKey, curSport);

    // Player Aggregations
    const pId = b.playerId || b.playerPhone || b.playerName || 'Anonymous Athlete';
    const curP = playerStatsMap.get(pId) || {
      playerId: pId,
      name: b.playerName || 'Regular Athlete',
      phone: b.playerPhone,
      photoURL: b.playerPhotoURL,
      count: 0,
      spent: 0,
      sports: new Map<string, number>(),
      lastDate: b.date,
    };
    curP.count += 1;
    if (!isCancelled) curP.spent += paidVal;
    if (b.sport) curP.sports.set(b.sport, (curP.sports.get(b.sport) || 0) + 1);
    if (!curP.lastDate || (b.date && b.date > curP.lastDate)) curP.lastDate = b.date;
    playerStatsMap.set(pId, curP);
  }

  // Find max keys
  const getMaxKey = (map: Map<string, any>) => {
    let maxK = 'No data';
    let maxV = -1;
    for (const [k, v] of map.entries()) {
      const val = typeof v === 'number' ? v : v.count || 0;
      if (val > maxV) {
        maxV = val;
        maxK = k;
      }
    }
    return maxK;
  };

  // Repeat vs New Athletes
  let repeatPlayersCount = 0;
  let newPlayersCount = 0;
  for (const p of playerStatsMap.values()) {
    if (p.count > 1) {
      repeatPlayersCount++;
    } else {
      newPlayersCount++;
    }
  }
  const totalUniqueAthletes = playerStatsMap.size || 1;
  const repeatRatePercent = Math.round((repeatPlayersCount / totalUniqueAthletes) * 100);

  // Overall Occupancy Calculation
  const totalSlotsCount = allSlots.length;
  const bookedSlotsCount = allSlots.filter((d) => d.status !== 'AVAILABLE').length;
  const occupancyRate = totalSlotsCount > 0 ? Math.round((bookedSlotsCount / totalSlotsCount) * 100) : (bookings.length > 0 ? 55 : 0);

  // Hourly Heatmap Generation
  const maxHourlyCount = Math.max(...Array.from(hourlyCountMap.values()), 1);
  const hourlyHeatmap: HourlyOccupancySlot[] = [];
  for (let h = 6; h <= 23; h++) {
    const count = hourlyCountMap.get(h) || 0;
    const hourLabel = h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
    const occupancyPercent = Math.min(100, Math.round((count / maxHourlyCount) * 100));
    hourlyHeatmap.push({
      hourLabel,
      bookingsCount: count,
      occupancyPercent,
    });
  }

  // Day Breakdown
  const maxDayCount = Math.max(...Array.from(dayCountMap.values()).map((d) => d.count), 1);
  const dayBreakdown: DayOccupancyItem[] = fullDays.map((fullDay) => {
    const item = dayCountMap.get(fullDay) || { count: 0, revenue: 0 };
    return {
      dayName: fullDay.slice(0, 3),
      bookingsCount: item.count,
      occupancyPercent: Math.min(100, Math.round((item.count / maxDayCount) * 100)),
      revenue: item.revenue,
    };
  });

  // Time Blocks
  const maxBlockCount = Math.max(
    timeBlockMap.MORNING.count,
    timeBlockMap.AFTERNOON.count,
    timeBlockMap.EVENING.count,
    timeBlockMap.NIGHT.count,
    1
  );
  const timeBlocks: TimeBlockOccupancy[] = [
    {
      block: 'MORNING',
      label: 'Morning (6 AM - 11 AM)',
      hours: '06:00 - 11:00',
      bookingsCount: timeBlockMap.MORNING.count,
      occupancyPercent: Math.round((timeBlockMap.MORNING.count / maxBlockCount) * 100),
      revenue: timeBlockMap.MORNING.revenue,
    },
    {
      block: 'AFTERNOON',
      label: 'Afternoon (11 AM - 4 PM)',
      hours: '11:00 - 16:00',
      bookingsCount: timeBlockMap.AFTERNOON.count,
      occupancyPercent: Math.round((timeBlockMap.AFTERNOON.count / maxBlockCount) * 100),
      revenue: timeBlockMap.AFTERNOON.revenue,
    },
    {
      block: 'EVENING',
      label: 'Evening Peak (4 PM - 8 PM)',
      hours: '16:00 - 20:00',
      bookingsCount: timeBlockMap.EVENING.count,
      occupancyPercent: Math.round((timeBlockMap.EVENING.count / maxBlockCount) * 100),
      revenue: timeBlockMap.EVENING.revenue,
    },
    {
      block: 'NIGHT',
      label: 'Night Matches (8 PM - 12 AM)',
      hours: '20:00 - 24:00',
      bookingsCount: timeBlockMap.NIGHT.count,
      occupancyPercent: Math.round((timeBlockMap.NIGHT.count / maxBlockCount) * 100),
      revenue: timeBlockMap.NIGHT.revenue,
    },
  ];

  // Sport Revenue Shares
  const totalCollectedOrGross = amountCollected || totalBookingValue || 1;
  const sportShares: SportRevenueShare[] = Array.from(sportCountMap.entries()).map(([sport, val]) => ({
    sport,
    revenue: val.revenue,
    bookingsCount: val.count,
    percentage: Math.min(100, Math.round((val.revenue / totalCollectedOrGross) * 100)),
  })).sort((a, b) => b.revenue - a.revenue);

  // Arena Performances
  const arenaPerformances: ArenaPerformance[] = Array.from(arenaCountMap.entries()).map(([arenaName, val]) => ({
    arenaId: val.id,
    arenaName,
    sport: val.sport,
    revenue: val.revenue,
    bookingsCount: val.count,
    occupancyPercent: Math.min(100, Math.round((val.count / (bookings.length || 1)) * 100)),
  })).sort((a, b) => b.revenue - a.revenue);

  // Top Regular Players
  const topRegularPlayers: TopRegularPlayer[] = Array.from(playerStatsMap.values())
    .map((p) => {
      let favSport = 'Football';
      let maxSportCount = 0;
      for (const [sp, cnt] of p.sports.entries()) {
        if (cnt > maxSportCount) {
          maxSportCount = cnt;
          favSport = sp;
        }
      }
      return {
        playerId: p.playerId,
        playerName: p.name,
        playerPhone: p.phone,
        playerPhotoURL: p.photoURL,
        totalBookings: p.count,
        totalSpent: p.spent,
        favoriteSport: favSport,
        lastBookingDate: p.lastDate,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.totalBookings - a.totalBookings)
    .slice(0, 10);

  // Smart Dynamic Pricing & Utilization Recommendations
  const smartRecommendations: AnalyticsSmartRecommendation[] = [];

  const afternoonOcc = timeBlocks.find((tb) => tb.block === 'AFTERNOON')?.occupancyPercent || 0;
  if (afternoonOcc < 40) {
    smartRecommendations.push({
      id: 'rec_afternoon_discount',
      title: 'Boost Low Afternoons with Flash Offers',
      description: `Weekday afternoon (11 AM - 4 PM) occupancy is currently at ${afternoonOcc}%. Create a 15-20% off-peak promo code or student clinic to convert idle hours into guaranteed revenue.`,
      type: 'PRICING',
      impactLevel: 'HIGH',
      actionLabel: 'Create Off-Peak Coupon',
    });
  }

  const eveningOcc = timeBlocks.find((tb) => tb.block === 'EVENING')?.occupancyPercent || 0;
  const nightOcc = timeBlocks.find((tb) => tb.block === 'NIGHT')?.occupancyPercent || 0;
  if (eveningOcc > 75 || nightOcc > 75) {
    smartRecommendations.push({
      id: 'rec_peak_yield',
      title: 'Optimize Prime-Time Yield',
      description: `Evening & night slots are booking at high capacity (${Math.max(eveningOcc, nightOcc)}%). Consider enabling standard peak pricing or recurring slot reservations for guaranteed revenue lock-in.`,
      type: 'PRICING',
      impactLevel: 'GROWTH',
      actionLabel: 'Configure Dynamic Rates',
    });
  }

  if (repeatRatePercent < 30 && allBookings.length > 5) {
    smartRecommendations.push({
      id: 'rec_player_retention',
      title: 'Re-Engage First-Time Athletes',
      description: `Your repeat athlete rate is ${repeatRatePercent}%. Setting up automated loyalty bonus points or recurring team packages can increase lifetime booking frequency by 2.4x.`,
      type: 'RETENTION',
      impactLevel: 'HIGH',
      actionLabel: 'View Loyalty Rewards',
    });
  }

  if (arenaPerformances.length > 1) {
    const topArena = arenaPerformances[0];
    const bottomArena = arenaPerformances[arenaPerformances.length - 1];
    if (topArena && bottomArena && topArena.bookingsCount > bottomArena.bookingsCount * 2) {
      smartRecommendations.push({
        id: 'rec_arena_balance',
        title: `Court Utilization Variance: ${topArena.arenaName}`,
        description: `${topArena.arenaName} accounts for ${topArena.occupancyPercent}% of arena traffic while ${bottomArena.arenaName} is under-utilized. Try cross-listing ${bottomArena.sport} community matchmaking lobbies.`,
        type: 'ARENA',
        impactLevel: 'MEDIUM',
        actionLabel: 'Review Arenas',
      });
    }
  }

  const leadTimeAvg = validLeadTimeCount > 0 ? Math.round(totalLeadTimeHours / validLeadTimeCount) : 18;

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
    onlineRevenue,
    cashRevenue,
    popularArenaName: getMaxKey(arenaCountMap),
    popularTimeSlot: getMaxKey(timeSlotCountMap),
    popularDay: getMaxKey(dayCountMap),
    mostBookedSport: getMaxKey(sportCountMap),
    repeatPlayersCount,
    newPlayersCount,
    repeatRatePercent,
    averageBookingValue: Math.round(totalBookingValue / (bookings.length || 1)),
    occupancyRatePercent: occupancyRate,
    leadTimeHoursAvg: leadTimeAvg,
    hourlyHeatmap,
    dayBreakdown,
    timeBlocks,
    sportShares,
    arenaPerformances,
    topRegularPlayers,
    smartRecommendations,
    selectedArenaId: arenaId,
    selectedArenaName: selectedArenaObj ? selectedArenaObj.name : 'All Arenas & Courts',
    availableArenas: allArenas.map((a) => ({ id: a.id, name: a.name, sport: a.sport || 'Sports' })),
  };
}

// ==========================================
// 8. POST-MATCH PLAYER RATINGS & BADGES
// ==========================================

export async function submitPlayerRating(params: {
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoURL?: string | null;
  targetId: string;
  targetName: string;
  targetPhotoURL?: string | null;
  matchId?: string;
  lobbyId?: string;
  turfName?: string;
  sport: string;
  sportsmanshipRating: number;
  skillRating: number;
  punctualityRating: number;
  badges: (PlayerBadgeType | string)[];
  feedback?: string;
}): Promise<{ id: string; overallRating: number }> {
  const matchOrLobby = params.matchId || params.lobbyId || 'match';
  const customDocId = `${params.reviewerId}_${params.targetId}_${matchOrLobby}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ratingDocRef = doc(db, 'playerRatings', customDocId);

  const sportsmanship = Math.min(5, Math.max(1, Math.round(params.sportsmanshipRating || 5)));
  const skill = Math.min(5, Math.max(1, Math.round(params.skillRating || 5)));
  const punctuality = Math.min(5, Math.max(1, Math.round(params.punctualityRating || 5)));
  const overall = Number(((sportsmanship + skill + punctuality) / 3).toFixed(1));
  const now = new Date().toISOString();

  const payload: PlayerRating = {
    id: customDocId,
    reviewerId: params.reviewerId,
    reviewerName: params.reviewerName || 'Teammate',
    reviewerPhotoURL: params.reviewerPhotoURL || null,
    targetId: params.targetId,
    targetName: params.targetName || 'Athlete',
    targetPhotoURL: params.targetPhotoURL || null,
    matchId: params.matchId,
    lobbyId: params.lobbyId,
    turfName: params.turfName,
    sport: params.sport || 'Sports',
    sportsmanshipRating: sportsmanship,
    skillRating: skill,
    punctualityRating: punctuality,
    overallRating: overall,
    badges: params.badges || [],
    feedback: params.feedback?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ratingDocRef, sanitizeFirestoreData(payload));

  // Update target user profile aggregate stats
  try {
    const userRef = doc(db, 'users', params.targetId);
    const uSnap = await getDoc(userRef);
    if (uSnap.exists()) {
      const uData = uSnap.data() as UserProfile;
      const currentCount = uData.totalRatingsReceived || 0;
      const currentRating = uData.sportsmanshipRating || 5.0;
      const newCount = currentCount + 1;
      const newRating = Number(((currentRating * currentCount + sportsmanship) / newCount).toFixed(1));

      const existingBadges: string[] = uData.badges || [];
      const updatedBadges = Array.from(new Set([...existingBadges, ...(params.badges || [])]));

      await updateDoc(userRef, {
        sportsmanshipRating: newRating,
        totalRatingsReceived: newCount,
        badges: updatedBadges,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('Could not update player aggregate stats:', err);
  }

  // Award reviewer 15 points
  try {
    await awardLoyaltyPoints(params.reviewerId, 15, 'Awarded teammate post-match rating', params.lobbyId || params.matchId);
  } catch (err) {
    console.warn('Could not award rating bonus points:', err);
  }

  // Send notification to target athlete
  try {
    const badgeText = params.badges && params.badges.length > 0 ? ` with the ${params.badges[0]} badge` : '';
    await sendNotification({
      recipientId: params.targetId,
      senderId: params.reviewerId,
      senderName: params.reviewerName,
      title: '⭐ Post-Match Rating Received!',
      message: `${params.reviewerName} rated your sportsmanship ${sportsmanship}★${badgeText} in ${params.sport}!`,
      type: 'GENERAL',
      relatedId: params.lobbyId || params.matchId,
      relatedType: 'LOBBY',
    });
  } catch (notifErr) {
    console.warn('Notification error on rating:', notifErr);
  }

  return { id: customDocId, overallRating: overall };
}

export async function checkHasRatedPlayer(
  reviewerId: string,
  targetId: string,
  matchOrLobbyId?: string
): Promise<boolean> {
  if (!reviewerId || !targetId || typeof reviewerId !== 'string' || typeof targetId !== 'string' || !reviewerId.trim() || !targetId.trim()) return false;
  try {
    if (matchOrLobbyId) {
      const customDocId = `${reviewerId}_${targetId}_${matchOrLobbyId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docSnap = await getDoc(doc(db, 'playerRatings', customDocId));
      if (docSnap.exists()) return true;
    }

    const q = query(
      collection(db, 'playerRatings'),
      where('reviewerId', '==', reviewerId),
      where('targetId', '==', targetId)
    );
    const snap = await getDocs(q);
    if (matchOrLobbyId) {
      return snap.docs.some((d) => {
        const data = d.data();
        return data.matchId === matchOrLobbyId || data.lobbyId === matchOrLobbyId;
      });
    }
    return !snap.empty;
  } catch (err) {
    console.warn('Error checking rated player:', err);
    return false;
  }
}

export async function getPlayerRatingsList(targetId: string): Promise<PlayerRating[]> {
  if (!targetId || typeof targetId !== 'string' || !targetId.trim()) return [];
  try {
    const q = query(
      collection(db, 'playerRatings'),
      where('targetId', '==', targetId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerRating));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (err) {
    console.warn('Error fetching player ratings list:', err);
    return [];
  }
}

export async function getPlayerSportsmanshipStats(
  targetId: string,
  fallbackProfile?: UserProfile | null
): Promise<PlayerSportsmanshipStats> {
  try {
    const ratings = await getPlayerRatingsList(targetId);

    if (ratings.length === 0) {
      const profileRating = fallbackProfile?.sportsmanshipRating || 5.0;
      const profileBadges = fallbackProfile?.badges || ['Fair Play Champion'];
      const defaultBadgeCounts: Record<string, number> = {};
      profileBadges.forEach((b) => {
        defaultBadgeCounts[b] = 1;
      });

      return {
        averageRating: Number(profileRating.toFixed(1)),
        totalRatings: fallbackProfile?.totalRatingsReceived || 0,
        sportsmanshipAvg: Number(profileRating.toFixed(1)),
        skillAvg: 4.8,
        punctualityAvg: 5.0,
        badgeCounts: defaultBadgeCounts,
        tier: profileRating >= 4.8 ? 'ELITE' : profileRating >= 4.2 ? 'PRO' : 'VETERAN',
        recentFeedback: [],
      };
    }

    let sumSportsmanship = 0;
    let sumSkill = 0;
    let sumPunctuality = 0;
    let sumOverall = 0;
    const badgeCounts: Record<string, number> = {};

    for (const r of ratings) {
      sumSportsmanship += r.sportsmanshipRating || 5;
      sumSkill += r.skillRating || 5;
      sumPunctuality += r.punctualityRating || 5;
      sumOverall += r.overallRating || 5;

      if (r.badges && Array.isArray(r.badges)) {
        for (const b of r.badges) {
          badgeCounts[b] = (badgeCounts[b] || 0) + 1;
        }
      }
    }

    const count = ratings.length;
    const sportsmanshipAvg = Number((sumSportsmanship / count).toFixed(1));
    const skillAvg = Number((sumSkill / count).toFixed(1));
    const punctualityAvg = Number((sumPunctuality / count).toFixed(1));
    const averageRating = Number((sumOverall / count).toFixed(1));

    let tier: 'ELITE' | 'PRO' | 'VETERAN' | 'RISING' = 'RISING';
    if (averageRating >= 4.8 && count >= 3) {
      tier = 'ELITE';
    } else if (averageRating >= 4.3) {
      tier = 'PRO';
    } else if (count >= 1) {
      tier = 'VETERAN';
    }

    const recentFeedback = ratings
      .filter((r) => r.feedback && r.feedback.trim().length > 0)
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName || 'Teammate',
        reviewerPhotoURL: r.reviewerPhotoURL || null,
        sportsmanshipRating: r.sportsmanshipRating,
        overallRating: r.overallRating,
        badges: r.badges || [],
        feedback: r.feedback,
        sport: r.sport,
        turfName: r.turfName,
        createdAt: r.createdAt,
      }));

    return {
      averageRating,
      totalRatings: count,
      sportsmanshipAvg,
      skillAvg,
      punctualityAvg,
      badgeCounts,
      tier,
      recentFeedback,
    };
  } catch (err) {
    console.warn('Error calculating player sportsmanship stats:', err);
    return {
      averageRating: 5.0,
      totalRatings: 0,
      sportsmanshipAvg: 5.0,
      skillAvg: 5.0,
      punctualityAvg: 5.0,
      badgeCounts: {},
      tier: 'RISING',
      recentFeedback: [],
    };
  }
}

// ==========================================
// 9. PLAYER POOLS & COMMUNITY MATCHMAKING
// ==========================================

export async function getPlayerPools(filters?: {
  sport?: string;
  matchHoursCategory?: MatchHoursCategory;
  city?: string;
}): Promise<PlayerPool[]> {
  try {
    const colRef = collection(db, 'playerPools');
    const snap = await getDocs(colRef);

    const list: PlayerPool[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const d of snap.docs) {
      const data = { id: d.id, ...d.data() } as PlayerPool;
      if (data.status === 'CANCELLED' || data.status === 'EXPIRED') continue;
      if (data.preferredDate && data.preferredDate < todayStr) continue;

      if (filters?.sport && filters.sport !== 'All' && data.sport.toLowerCase() !== filters.sport.toLowerCase()) {
        continue;
      }

      if (
        filters?.matchHoursCategory &&
        filters.matchHoursCategory !== 'ALL' &&
        data.matchHoursCategory !== filters.matchHoursCategory
      ) {
        continue;
      }

      if (filters?.city && filters.city !== 'All' && data.city.toLowerCase() !== filters.city.toLowerCase()) {
        continue;
      }

      list.push(data);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('Error getting player pools:', err);
    return [];
  }
}

export async function createPlayerPool(poolData: {
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  creatorPhotoURL?: string | null;
  sport: string;
  city: string;
  area?: string;
  preferredDate: string;
  preferredTime: string;
  preferredHours?: string;
  matchHoursCategory?: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT';
  requiredPlayers: number;
  maxPricePerPlayer: number;
  preferredTurfId?: string;
  preferredTurfName?: string;
  description?: string;
}): Promise<string> {
  const newPoolRef = doc(collection(db, 'playerPools'));
  const now = new Date().toISOString();

  const initialInterestedPlayer: PoolInterestedPlayer = {
    uid: poolData.creatorId,
    name: poolData.creatorName,
    phone: poolData.creatorPhone,
    photoURL: poolData.creatorPhotoURL || null,
    skillLevel: 'Athlete',
    paymentPreference: 'UPI',
    joinedAt: now,
  };

  const estimatedTotal = poolData.requiredPlayers * poolData.maxPricePerPlayer;

  const payload: PlayerPool = {
    id: newPoolRef.id,
    creatorId: poolData.creatorId,
    creatorName: poolData.creatorName,
    creatorPhone: poolData.creatorPhone,
    creatorPhotoURL: poolData.creatorPhotoURL || null,
    sport: poolData.sport,
    city: poolData.city,
    area: poolData.area || '',
    preferredDate: poolData.preferredDate,
    preferredTime: poolData.preferredTime,
    preferredHours: poolData.preferredHours || '6:00 PM - 8:00 PM',
    matchHoursCategory: poolData.matchHoursCategory || 'EVENING',
    requiredPlayers: poolData.requiredPlayers,
    currentPlayersCount: 1,
    maxPricePerPlayer: poolData.maxPricePerPlayer,
    estimatedTotalBudget: estimatedTotal,
    preferredTurfId: poolData.preferredTurfId,
    preferredTurfName: poolData.preferredTurfName,
    description: poolData.description || `Squad interest group for ${poolData.sport} athletes in ${poolData.city}`,
    status: 'OPEN',
    interestedPlayers: [initialInterestedPlayer],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newPoolRef, sanitizeFirestoreData(payload));
  return newPoolRef.id;
}

export async function joinPlayerPool(
  poolId: string,
  player: {
    uid: string;
    name: string;
    phone?: string;
    photoURL?: string | null;
    skillLevel?: string;
    paymentPreference?: 'UPI' | 'PAY_LATER';
  }
): Promise<{ isFullyBacked: boolean; pool: PlayerPool }> {
  const poolRef = doc(db, 'playerPools', poolId);
  const now = new Date().toISOString();

  let isBacked = false;
  let updatedPoolData: PlayerPool | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(poolRef);
    if (!snap.exists()) throw new Error('Player pool does not exist');
    const pool = snap.data() as PlayerPool;

    if (pool.status === 'CONVERTED_TO_LOBBY') {
      throw new Error('This pool has already been converted into an active match lobby.');
    }

    const existingPlayers = pool.interestedPlayers || [];
    if (existingPlayers.some((p) => p.uid === player.uid)) {
      updatedPoolData = pool;
      return; // Already in pool
    }

    const newPlayers: PoolInterestedPlayer[] = [
      ...existingPlayers,
      {
        uid: player.uid,
        name: player.name,
        phone: player.phone,
        photoURL: player.photoURL || null,
        skillLevel: player.skillLevel || 'Athlete',
        paymentPreference: player.paymentPreference || 'UPI',
        joinedAt: now,
      },
    ];

    const newCount = newPlayers.length;
    isBacked = newCount >= pool.requiredPlayers;
    const nextStatus = isBacked ? 'READY_TO_CONVERT' : 'OPEN';

    tx.update(poolRef, sanitizeFirestoreData({
      currentPlayersCount: newCount,
      interestedPlayers: newPlayers,
      status: nextStatus,
      updatedAt: now,
    }));

    updatedPoolData = {
      ...pool,
      currentPlayersCount: newCount,
      interestedPlayers: newPlayers,
      status: nextStatus,
      updatedAt: now,
    };
  });

  return { isFullyBacked: isBacked, pool: updatedPoolData! };
}

export async function leavePlayerPool(poolId: string, uid: string): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  const now = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(poolRef);
    if (!snap.exists()) return;
    const pool = snap.data() as PlayerPool;

    const updatedPlayers = (pool.interestedPlayers || []).filter((p) => p.uid !== uid);
    const newCount = updatedPlayers.length;
    const isBacked = newCount >= pool.requiredPlayers;

    tx.update(poolRef, sanitizeFirestoreData({
      currentPlayersCount: newCount,
      interestedPlayers: updatedPlayers,
      status: isBacked ? 'READY_TO_CONVERT' : 'OPEN',
      updatedAt: now,
    }));
  });
}

export async function deletePlayerPool(poolId: string, uid?: string): Promise<void> {
  const poolRef = doc(db, 'playerPools', poolId);
  const snap = await getDoc(poolRef);
  if (snap.exists()) {
    const data = snap.data() as PlayerPool;
    if (uid && data.creatorId && data.creatorId !== uid) {
      throw new Error('Only the creator of this squad pool can delete it.');
    }
  }
  await deleteDoc(poolRef);
}

export async function convertPoolToLobby(
  poolId: string
): Promise<{ lobbyId: string; bookingId: string; turfName: string }> {
  const poolRef = doc(db, 'playerPools', poolId);
  const poolSnap = await getDoc(poolRef);

  if (!poolSnap.exists()) {
    throw new Error('Player Pool does not exist.');
  }

  const pool = poolSnap.data() as PlayerPool;
  if (pool.status === 'CONVERTED_TO_LOBBY' && pool.convertedLobbyId) {
    return {
      lobbyId: pool.convertedLobbyId,
      bookingId: pool.convertedBookingId || '',
      turfName: pool.convertedTurfName || 'Sports Arena',
    };
  }

  const now = new Date().toISOString();
  const allTurfs = await getAllActiveTurfs();

  // Find candidate turf matching preferred city or preferredTurfId
  let assignedTurf = allTurfs.find((t) => t.id === pool.preferredTurfId);
  if (!assignedTurf) {
    assignedTurf = allTurfs.find(
      (t) =>
        t.city?.toLowerCase() === pool.city?.toLowerCase() &&
        t.sports?.some((s) => s.toLowerCase() === pool.sport.toLowerCase())
    );
  }
  if (!assignedTurf && allTurfs.length > 0) {
    assignedTurf = allTurfs[0];
  }
  if (!assignedTurf) {
    throw new Error('No available turf venues found in this region to assign to the lobby.');
  }

  const arenas = await getTurfArenas(assignedTurf.id);
  const assignedArena =
    arenas.find((a) => a.sport.toLowerCase() === pool.sport.toLowerCase()) ||
    arenas[0] || {
      id: 'arena-main',
      turfId: assignedTurf.id,
      ownerId: assignedTurf.ownerId,
      name: `${pool.sport} Arena`,
      sport: pool.sport,
      description: 'Main Turf Arena',
      capacity: pool.requiredPlayers + 4,
      pricePerSlot: pool.requiredPlayers * pool.maxPricePerPlayer,
      photos: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

  // Find an available slot or create one
  const targetDate = pool.preferredDate || now.split('T')[0];
  const slots = await getArenaSlotsByDate(assignedArena.id, targetDate);
  const assignedSlot = slots.find((s) => s.status === 'AVAILABLE');

  const slotPrice = assignedSlot?.price || pool.requiredPlayers * pool.maxPricePerPlayer;
  const startTime = assignedSlot?.startTime || pool.preferredTime || '07:00 PM';
  const endTime = assignedSlot?.endTime || '08:00 PM';
  const slotId = assignedSlot?.id || `auto-slot-${Date.now()}`;

  // Execute lobby & booking creation
  const newBookingRef = doc(collection(db, 'bookings'));
  const newLobbyRef = doc(collection(db, 'lobbies'));
  const lobbyId = newLobbyRef.id;
  const bookingId = newBookingRef.id;
  const bookingCode = `TF-POOL-${Math.floor(100000 + Math.random() * 900000)}`;

  const poolPlayers = pool.interestedPlayers || [];
  const maxPlayersQuota = pool.requiredPlayers + 4;
  const minPlayersQuota = pool.requiredPlayers;
  const currentCount = poolPlayers.length;
  const dynamicCost = Math.round(slotPrice / Math.max(1, currentCount));

  // Prepare participants roster
  const lobbyPlayersList = poolPlayers.map((p, idx) => ({
    playerId: p.uid,
    uid: p.uid,
    playerName: p.name,
    playerPhotoURL: p.photoURL || null,
    isHost: p.uid === pool.creatorId || idx === 0,
    paymentMethod: p.paymentPreference === 'PAY_LATER' ? ('PAY_LATER_AT_TURF' as const) : ('PAY_NOW' as const),
    paymentStatus: p.paymentPreference === 'PAY_LATER' ? ('DUE' as const) : ('PAID' as const),
    amountPaid: p.paymentPreference === 'PAY_LATER' ? 0 : pool.maxPricePerPlayer,
    amountDue: p.paymentPreference === 'PAY_LATER' ? pool.maxPricePerPlayer : 0,
    upiTxnRef: p.paymentPreference === 'PAY_LATER' ? undefined : `UPI-POOL-${Date.now()}-${idx}`,
    joinedAt: now,
  }));

  const playerUids = poolPlayers.map((p) => p.uid);

  // Booking payload
  const bookingData = {
    id: bookingId,
    bookingId: bookingCode,
    playerId: pool.creatorId,
    playerName: pool.creatorName,
    playerEmail: '',
    playerPhone: pool.creatorPhone || '',
    playerPhotoURL: pool.creatorPhotoURL || null,
    ownerId: assignedTurf.ownerId,
    turfId: assignedTurf.id,
    turfName: assignedTurf.name,
    turfAddress: assignedTurf.address || 'Sports Arena',
    turfArea: assignedTurf.area || '',
    turfCity: assignedTurf.city || pool.city,
    arenaId: assignedArena.id,
    arenaName: assignedArena.name,
    sport: pool.sport,
    slotId: slotId,
    date: targetDate,
    day: 'Match Day',
    startTime: startTime,
    endTime: endTime,
    duration: 60,
    totalAmount: slotPrice,
    amountPaid: pool.maxPricePerPlayer * poolPlayers.filter((p) => p.paymentPreference !== 'PAY_LATER').length,
    amountDue: pool.maxPricePerPlayer * poolPlayers.filter((p) => p.paymentPreference === 'PAY_LATER').length,
    paymentStatus: 'PARTIALLY_PAID',
    bookingStatus: 'CONFIRMED',
    bookingType: 'PLAYER',
    paymentMethod: 'PAY_NOW',
    numberOfPlayers: maxPlayersQuota,
    playerShareAmount: pool.maxPricePerPlayer,
    lobbyCreated: true,
    lobbyId: lobbyId,
    createdAt: now,
    updatedAt: now,
  };

  // Lobby payload
  const lobbyData = {
    id: lobbyId,
    name: `${pool.sport} Squad Match at ${assignedTurf.name}`,
    sport: pool.sport,
    turfId: assignedTurf.id,
    turfName: assignedTurf.name,
    turfAddress: assignedTurf.address || 'Sports Turf',
    turfCity: assignedTurf.city || pool.city,
    arenaId: assignedArena.id,
    arenaName: assignedArena.name,
    bookingId: bookingId,
    slotId: slotId,
    hostId: pool.creatorId,
    hostName: pool.creatorName,
    hostPhotoURL: pool.creatorPhotoURL || null,
    date: targetDate,
    day: 'Match Day',
    startTime: startTime,
    endTime: endTime,
    maxPlayers: maxPlayersQuota,
    minPlayers: minPlayersQuota,
    currentPlayers: currentCount,
    pricePerPlayer: pool.maxPricePerPlayer,
    totalSlotPrice: slotPrice,
    dynamicCostPerPlayer: dynamicCost,
    description: `Auto-converted from community athlete pool. Fully-backed squad ready for kickoff!`,
    rules: 'Arrive 10 mins before start. Turf shoes mandatory.',
    isPublic: true,
    allowNewPlayers: true,
    status: currentCount >= maxPlayersQuota ? 'FULL' : 'OPEN',
    playerUids: playerUids,
    players: lobbyPlayersList,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newBookingRef, sanitizeFirestoreData(bookingData));
  await setDoc(newLobbyRef, sanitizeFirestoreData(lobbyData));

  // Create lobby player records
  for (const lp of lobbyPlayersList) {
    const pId = `${lobbyId}_${lp.uid}`;
    await setDoc(
      doc(db, 'lobbyPlayers', pId),
      sanitizeFirestoreData({
        id: pId,
        lobbyId: lobbyId,
        uid: lp.uid,
        playerName: lp.playerName,
        playerPhotoURL: lp.playerPhotoURL,
        isHost: lp.isHost,
        paymentMethod: lp.paymentMethod,
        paymentStatus: lp.paymentStatus,
        amountPaid: lp.amountPaid,
        amountDue: lp.amountDue,
        remainingAmount: lp.amountDue,
        upiTxnRef: lp.upiTxnRef,
        joinedAt: now,
      })
    );

    // Send in-app notification to all squad athletes
    await sendNotification({
      recipientId: lp.uid,
      title: 'Squad Pool Converted to Live Lobby!',
      message: `Your ${pool.sport} squad is fully backed! A turf slot has been confirmed at ${assignedTurf.name} on ${targetDate} (${startTime}).`,
      type: 'LOBBY_JOINED',
      relatedId: lobbyId,
      relatedType: 'LOBBY',
    });
  }

  // Update Player Pool doc status
  await updateDoc(poolRef, {
    status: 'CONVERTED_TO_LOBBY',
    convertedLobbyId: lobbyId,
    convertedBookingId: bookingId,
    convertedTurfName: assignedTurf.name,
    updatedAt: now,
  });

  return {
    lobbyId,
    bookingId,
    turfName: assignedTurf.name,
  };
}


