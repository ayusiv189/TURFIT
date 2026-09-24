import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  PlayerRating,
  PlayerBadgeType,
  PlayerSportsmanshipStats,
  UserProfile,
  UserRewardWallet,
  InAppNotification,
} from '../types';
import { sanitizeData } from './dbService';
import { sendPushNotification } from './pushNotificationService';

export interface SubmitPlayerRatingParams {
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
  sportsmanshipRating: number; // 1 to 5
  skillRating: number; // 1 to 5
  punctualityRating: number; // 1 to 5
  badges: (PlayerBadgeType | string)[];
  feedback?: string;
}

export async function submitPlayerRating(
  params: SubmitPlayerRatingParams
): Promise<{ id: string; overallRating: number }> {
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
    matchId: params.matchId || undefined,
    lobbyId: params.lobbyId || undefined,
    turfName: params.turfName || undefined,
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

  await setDoc(ratingDocRef, sanitizeData(payload));

  // Update target user profile aggregation
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

  // Award reviewer 15 TurFit points for fair feedback
  try {
    const walletRef = doc(db, 'rewardWallets', params.reviewerId);
    const wSnap = await getDoc(walletRef);
    if (wSnap.exists()) {
      const wData = wSnap.data() as UserRewardWallet;
      await updateDoc(walletRef, {
        pointsBalance: (wData.pointsBalance || 0) + 15,
        lifetimeEarned: (wData.lifetimeEarned || 0) + 15,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('Could not award rating bonus points:', err);
  }

  // Send in-app and push notification to target athlete
  try {
    const badgeText = params.badges && params.badges.length > 0 ? ` with ${params.badges[0]} badge` : '';
    const notifPayload: Omit<InAppNotification, 'id'> = {
      recipientId: params.targetId,
      senderId: params.reviewerId,
      senderName: params.reviewerName,
      title: '⭐ Post-Match Rating Received!',
      message: `${params.reviewerName} rated your sportsmanship ${sportsmanship}★${badgeText} in ${params.sport}!`,
      type: 'GENERAL',
      relatedId: params.lobbyId || params.matchId,
      relatedType: 'LOBBY',
      read: false,
      createdAt: now,
    };
    await addDoc(collection(db, 'notifications'), sanitizeData(notifPayload));

    // Optional push notification
    sendPushNotification({
      recipientId: params.targetId,
      title: '⭐ Post-Match Rating Received!',
      message: `${params.reviewerName} rated your sportsmanship ${sportsmanship}★ in ${params.sport}!`,
      type: 'GENERAL',
    }).catch(() => {});
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
  if (!reviewerId || !targetId) return false;
  try {
    if (matchOrLobbyId) {
      const customDocId = `${reviewerId}_${targetId}_${matchOrLobbyId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docSnap = await getDoc(doc(db, 'playerRatings', customDocId));
      if (docSnap.exists()) return true;
    }

    const q = query(
      collection(db, 'playerRatings'),
      where('reviewerId', '==', reviewerId),
      where('targetId', '==', targetId),
      limit(10)
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
  try {
    const q = query(
      collection(db, 'playerRatings'),
      where('targetId', '==', targetId),
      limit(50)
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
