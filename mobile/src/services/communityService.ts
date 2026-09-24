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
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Lobby,
  LobbyPlayer,
  PlayerPool,
  PoolInterestedPlayer,
  MatchHoursCategory,
  Team,
  TeamMember,
  Match,
  MatchPlayer,
  TurfReview,
  PlayerRating,
  PlayerBadgeType,
  PlayerSportsmanshipStats,
  Offer,
  UserRewardWallet,
  InAppNotification,
  BookingPlayerShare,
  UserProfile,
  PaymentRecord,
  RefundRecord,
} from '../types';
import { sanitizeData, getTurfs, getArenasByTurf, getSlotsByArenaAndDate } from './dbService';
import { sendPushNotification } from './pushNotificationService';

// ==================== LOBBIES & DYNAMIC SPLIT PAYMENTS ====================

export async function getLobbies(): Promise<Lobby[]> {
  try {
    const colRef = collection(db, 'lobbies');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);

    // Calculate local date string YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    const activeList: Lobby[] = [];

    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.status === 'CANCELLED') continue;

      // Only skip if the match date is strictly in the past (e.g. yesterday or older) and explicitly marked
      if (data.date && data.date < localTodayStr && data.status === 'CLOSED') {
        continue;
      }

      const currentCount = Number(data.currentPlayers) || 1;
      const totalSlot = Number(data.totalSlotPrice) || (Number(data.pricePerPlayer || 150) * (Number(data.maxPlayers) || 10));
      const dynamicCost = Math.round(totalSlot / Math.max(1, currentCount));

      activeList.push({
        id: d.id,
        ...data,
        status: data.status || 'OPEN',
        totalSlotPrice: totalSlot,
        dynamicCostPerPlayer: dynamicCost,
        players: data.players || (data.playerUids ? data.playerUids.map((uid: string) => ({ playerId: uid, uid })) : []),
      } as unknown as Lobby);
    }

    activeList.sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return activeList;
  } catch (err) {
    console.warn('Error getting lobbies:', err);
    return [];
  }
}

export async function createLobby(lobbyData: {
  name: string;
  sport: string;
  turfId: string;
  turfName: string;
  creatorId: string;
  creatorName: string;
  maxPlayers: number;
  minPlayers?: number;
  date: string;
  startTime: string;
  endTime: string;
  pricePerPlayer: number;
  totalSlotPrice?: number;
}): Promise<string> {
  const newLobbyRef = doc(collection(db, 'lobbies'));
  const now = new Date().toISOString();
  const totalSlot = lobbyData.totalSlotPrice || (lobbyData.pricePerPlayer * lobbyData.maxPlayers);
  const minAthletes = lobbyData.minPlayers || Math.max(2, Math.floor(lobbyData.maxPlayers / 2));

  const payload = {
    id: newLobbyRef.id,
    name: lobbyData.name,
    sport: lobbyData.sport,
    turfId: lobbyData.turfId,
    turfName: lobbyData.turfName,
    turfAddress: 'Sports Arena',
    turfCity: 'Mumbai',
    arenaId: 'main-arena',
    arenaName: 'Main Pitch',
    bookingId: '',
    slotId: '',
    hostId: lobbyData.creatorId,
    hostName: lobbyData.creatorName,
    date: lobbyData.date,
    day: 'Scheduled',
    startTime: lobbyData.startTime,
    endTime: lobbyData.endTime,
    maxPlayers: lobbyData.maxPlayers,
    minPlayers: minAthletes,
    currentPlayers: 1,
    pricePerPlayer: lobbyData.pricePerPlayer,
    totalSlotPrice: totalSlot,
    dynamicCostPerPlayer: totalSlot,
    description: `Pick-up match for ${lobbyData.sport} athletes`,
    isPublic: true,
    allowNewPlayers: true,
    status: 'OPEN',
    playerUids: [lobbyData.creatorId],
    players: [
      {
        playerId: lobbyData.creatorId,
        uid: lobbyData.creatorId,
        playerName: lobbyData.creatorName,
        isHost: true,
        paymentMethod: 'PAY_LATER_AT_TURF',
        paymentStatus: 'DUE',
        amountDue: lobbyData.pricePerPlayer,
        amountPaid: 0,
        joinedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newLobbyRef, sanitizeData(payload));
  return newLobbyRef.id;
}

export async function createLobbyWithSlotTransaction(params: {
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhone?: string;
  hostPhotoURL?: string | null;
  turfId: string;
  turfName: string;
  turfAddress?: string;
  turfCity?: string;
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
  initialSquadCount?: number;
  hostAnnouncement?: string;
  costDivisionNote?: string;
  description?: string;
  rules?: string;
  isPublic?: boolean;
  allowNewPlayers?: boolean;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
  upiTxnRef?: string;
  advanceAmount?: number;
  bankUtr?: string;
  merchantOrderRef?: string;
  verificationSource?: 'MERCHANT_UPI_WEBHOOK' | 'MANUAL_SELF_REPORT';
  webhookVerifiedAt?: string;
  gatewayUsed?: string;
}): Promise<{ lobbyId: string; bookingId: string }> {
  return await runTransaction(db, async (tx) => {
    const slotDocRef = doc(db, 'slots', params.slotId);
    const slotSnap = await tx.get(slotDocRef);

    if (!slotSnap.exists()) {
      throw new Error('This slot does not exist. Please choose another slot.');
    }

    const currentSlot = slotSnap.data() as any;

    if (currentSlot.status !== 'AVAILABLE') {
      throw new Error('This slot is no longer available. Please choose another slot.');
    }

    const now = new Date().toISOString();
    const isPaid = params.paymentMethod === 'PAY_NOW';
    const effectiveAdvance = params.advanceAmount !== undefined ? params.advanceAmount : (isPaid ? params.totalAmount : 0);
    const amountPaid = isPaid ? effectiveAdvance : 0;
    const amountDue = Math.max(0, params.totalAmount - amountPaid);
    const paymentStatus = amountPaid >= params.totalAmount ? 'PAID' : (amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING');
    const isWebhook = params.verificationSource === 'MERCHANT_UPI_WEBHOOK' || !!params.bankUtr;

    const newBookingRef = doc(collection(db, 'bookings'));
    const newLobbyRef = doc(collection(db, 'lobbies'));
    const lobbyId = newLobbyRef.id;
    const bookingCode = `TF-MOB-${Math.floor(100000 + Math.random() * 900000)}`;

    const squadNum = params.initialSquadCount || 1;
    const dynamicCost = params.maxPlayers > 0 ? Math.ceil(params.totalAmount / params.maxPlayers) : params.pricePerPlayer;
    const costNote = params.costDivisionNote || `₹${params.totalAmount} slot cost / ${params.maxPlayers} players = ₹${dynamicCost} per player (${squadNum} confirmed, ${Math.max(0, params.maxPlayers - squadNum)} open spots)`;

    const bookingData = {
      id: newBookingRef.id,
      bookingId: bookingCode,
      playerId: params.hostId,
      playerName: params.hostName,
      playerEmail: params.hostEmail,
      playerPhone: params.hostPhone || '',
      playerPhotoURL: params.hostPhotoURL || null,
      ownerId: currentSlot.ownerId,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress || 'Sports Turf',
      turfArea: '',
      turfCity: params.turfCity || 'City',
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
      advancePaid: amountPaid,
      paymentStatus: paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: 'PLAYER',
      paymentMethod: params.paymentMethod || 'PAY_NOW',
      numberOfPlayers: Number(params.maxPlayers),
      playerShareAmount: Number(dynamicCost),
      lobbyCreated: true,
      lobbyId: lobbyId,
      upiTxnRef: params.bankUtr || params.upiTxnRef || null,
      merchantOrderRef: params.merchantOrderRef || null,
      bankUtr: params.bankUtr || null,
      verificationSource: params.verificationSource || (isWebhook ? 'MERCHANT_UPI_WEBHOOK' : 'MANUAL_SELF_REPORT'),
      webhookVerifiedAt: params.webhookVerifiedAt || (isWebhook ? now : undefined),
      gatewayUsed: params.gatewayUsed || (isWebhook ? 'PHONEPE_BUSINESS' : undefined),
      createdAt: now,
      updatedAt: now,
    };
    tx.set(newBookingRef, sanitizeData(bookingData));

    tx.update(slotDocRef, sanitizeData({
      status: 'BOOKED_BY_PLAYER',
      bookingType: 'PLAYER',
      bookedByPlayerId: params.hostId,
      bookedByPlayerName: params.hostName,
      activeBookingId: newBookingRef.id,
      updatedAt: now,
    }));

    const lobbyData = {
      id: lobbyId,
      name: params.lobbyName.trim(),
      sport: params.sport,
      turfId: params.turfId,
      turfName: params.turfName,
      turfAddress: params.turfAddress || 'Sports Turf',
      turfCity: params.turfCity || 'City',
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
      minPlayers: Number(params.minPlayers || Math.max(2, Math.floor(params.maxPlayers / 2))),
      currentPlayers: squadNum,
      initialSquadCount: squadNum,
      hostAnnouncement: params.hostAnnouncement || '',
      pricePerPlayer: Number(dynamicCost),
      totalSlotPrice: Number(params.totalAmount),
      dynamicCostPerPlayer: Number(dynamicCost),
      costDivisionNote: costNote,
      advancePaid: amountPaid > 0,
      advanceAmount: amountPaid,
      upiTxnRef: params.bankUtr || params.upiTxnRef || `UPI-${Date.now().toString(36).toUpperCase()}`,
      merchantOrderRef: params.merchantOrderRef || null,
      bankUtr: params.bankUtr || null,
      verificationSource: params.verificationSource || (isWebhook ? 'MERCHANT_UPI_WEBHOOK' : 'MANUAL_SELF_REPORT'),
      webhookVerifiedAt: params.webhookVerifiedAt || (isWebhook ? now : undefined),
      description: params.description?.trim() || `Squad match for ${params.sport} athletes`,
      rules: params.rules?.trim() || 'Arrive 10 mins prior with kit.',
      isPublic: params.isPublic !== false,
      allowNewPlayers: params.allowNewPlayers !== false,
      status: 'OPEN',
      playerUids: [params.hostId],
      players: [
        {
          playerId: params.hostId,
          uid: params.hostId,
          playerName: params.hostName,
          playerPhotoURL: params.hostPhotoURL || null,
          isHost: true,
          paymentMethod: params.paymentMethod || 'PAY_NOW',
          paymentStatus: amountPaid > 0 ? 'PAID' : 'DUE',
          amountPaid: amountPaid,
          amountDue: amountDue,
          upiTxnRef: params.bankUtr || params.upiTxnRef || null,
          bankUtr: params.bankUtr || null,
          joinedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    tx.set(newLobbyRef, sanitizeData(lobbyData));

    const participantId = `${lobbyId}_${params.hostId}`;
    const participantRef = doc(db, 'lobbyPlayers', participantId);
    tx.set(participantRef, sanitizeData({
      id: participantId,
      lobbyId: lobbyId,
      uid: params.hostId,
      playerName: params.hostName,
      playerPhotoURL: params.hostPhotoURL || null,
      isHost: true,
      paymentMethod: params.paymentMethod || 'PAY_LATER_AT_TURF',
      paymentStatus: amountPaid > 0 ? 'PAID' : 'DUE',
      amountPaid: amountPaid,
      amountDue: amountDue,
      remainingAmount: amountDue,
      upiTxnRef: params.bankUtr || params.upiTxnRef || null,
      bankUtr: params.bankUtr || null,
      joinedAt: now,
    }));

    // If Host paid online / UPI advance, log ledger entry
    if (isPaid && amountPaid > 0) {
      const paymentTxRef = doc(collection(db, 'paymentTransactions'));
      tx.set(paymentTxRef, sanitizeData({
        id: paymentTxRef.id,
        transactionId: params.bankUtr || `TXN-UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        bookingId: newBookingRef.id,
        lobbyId: lobbyId,
        playerId: params.hostId,
        playerName: params.hostName,
        ownerId: currentSlot.ownerId,
        amount: amountPaid,
        advanceAmount: amountPaid,
        paymentMethod: 'UPI',
        paymentType: 'LOBBY_ADVANCE',
        status: 'SUCCESS',
        upiTxnRef: params.bankUtr || params.upiTxnRef || `UPI-APP-${Date.now()}`,
        bankUtr: params.bankUtr || null,
        merchantOrderRef: params.merchantOrderRef || null,
        verificationSource: params.verificationSource || (isWebhook ? 'MERCHANT_UPI_WEBHOOK' : 'MANUAL_SELF_REPORT'),
        webhookVerifiedAt: params.webhookVerifiedAt || (isWebhook ? now : undefined),
        gatewayUsed: params.gatewayUsed || 'PHONEPE_BUSINESS',
        notes: `Lobby advance payment for "${params.lobbyName}" (${params.date} ${params.startTime})`,
        createdAt: now,
      }));
    } else if (amountDue > 0) {
      // Create due record
      const dueId = `${newBookingRef.id}_${params.hostId}`;
      const dueDocRef = doc(db, 'dues', dueId);
      tx.set(dueDocRef, sanitizeData({
        id: dueId,
        bookingId: newBookingRef.id,
        turfId: params.turfId,
        turfName: params.turfName,
        ownerId: currentSlot.ownerId,
        playerId: params.hostId,
        playerName: params.hostName,
        playerEmail: params.hostEmail,
        playerPhone: params.hostPhone || '',
        amountDue: params.pricePerPlayer,
        amountPaid: 0,
        remainingAmount: params.pricePerPlayer,
        status: 'PENDING',
        date: params.date,
        startTime: params.startTime,
        endTime: params.endTime,
        bookingRef: params.lobbyName,
        createdAt: now,
        updatedAt: now,
      }));
    }

    return { lobbyId, bookingId: newBookingRef.id };
  });
}

export async function joinLobby(
  lobbyId: string,
  player: {
    uid: string;
    playerName: string;
    playerEmail?: string;
    playerPhone?: string;
    playerPhotoURL?: string;
    isHost?: boolean;
    paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
    upiTxnRef?: string;
    upiId?: string;
  }
): Promise<{ transactionId?: string; dynamicCost: number }> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const participantId = `${lobbyId}_${player.uid}`;
  const participantRef = doc(db, 'lobbyPlayers', participantId);
  let generatedTxnId: string | undefined;
  let computedDynamicCost = 0;

  await runTransaction(db, async (tx) => {
    const lobbySnap = await tx.get(lobbyDocRef);
    if (!lobbySnap.exists()) throw new Error('Lobby does not exist');
    const lobby = lobbySnap.data() as any;

    const existingUids: string[] = lobby.playerUids || [];
    if (existingUids.includes(player.uid)) {
      return; // already joined
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      throw new Error('Lobby is already full');
    }

    const pricePerPlayer = Number(lobby.pricePerPlayer) || 0;
    const totalSlot = Number(lobby.totalSlotPrice) || (pricePerPlayer * Number(lobby.maxPlayers || 10));
    const isPayNow = player.paymentMethod === 'PAY_NOW';
    const amountPaid = isPayNow ? pricePerPlayer : 0;
    const amountDue = isPayNow ? 0 : pricePerPlayer;
    const paymentStatus = isPayNow ? 'PAID' : 'DUE';

    const newCount = (lobby.currentPlayers || 0) + 1;
    computedDynamicCost = Math.round(totalSlot / Math.max(1, newCount));
    const now = new Date().toISOString();
    const updatedUids = [...existingUids, player.uid];
    const existingPlayers = lobby.players || [];
    const upiRef = player.upiTxnRef || (isPayNow ? `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined);

    const updatedPlayers = [
      ...existingPlayers,
      {
        playerId: player.uid,
        uid: player.uid,
        playerName: player.playerName,
        playerPhotoURL: player.playerPhotoURL || null,
        isHost: !!player.isHost,
        paymentMethod: player.paymentMethod || 'PAY_LATER_AT_TURF',
        paymentStatus,
        amountPaid,
        amountDue,
        upiTxnRef: upiRef || null,
        joinedAt: now,
      },
    ];

    tx.set(
      participantRef,
      sanitizeData({
        id: participantId,
        lobbyId,
        uid: player.uid,
        playerName: player.playerName,
        playerPhotoURL: player.playerPhotoURL || null,
        isHost: !!player.isHost,
        paymentMethod: player.paymentMethod || 'PAY_LATER_AT_TURF',
        paymentStatus,
        amountPaid,
        amountDue,
        remainingAmount: amountDue,
        upiTxnRef: upiRef || null,
        joinedAt: now,
      })
    );

    const isFull = newCount >= lobby.maxPlayers;

    tx.update(
      lobbyDocRef,
      sanitizeData({
        currentPlayers: newCount,
        dynamicCostPerPlayer: computedDynamicCost,
        playerUids: updatedUids,
        players: updatedPlayers,
        status: isFull ? 'FULL' : 'OPEN',
        updatedAt: now,
      })
    );

    // Instant Transaction Ledger entry for UPI / Online share payment
    if (isPayNow && pricePerPlayer > 0) {
      const paymentTxRef = doc(collection(db, 'paymentTransactions'));
      generatedTxnId = `TXN-UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      tx.set(
        paymentTxRef,
        sanitizeData({
          id: paymentTxRef.id,
          transactionId: generatedTxnId,
          bookingId: lobby.bookingId || lobbyId,
          lobbyId: lobby.id,
          lobbyName: lobby.name,
          turfName: lobby.turfName || 'Turf Pitch',
          playerId: player.uid,
          playerName: player.playerName,
          playerEmail: player.playerEmail || '',
          ownerId: lobby.hostId || '',
          amount: pricePerPlayer,
          paymentMethod: 'UPI',
          upiId: player.upiId || 'athlete@upi',
          upiTxnRef: upiRef,
          status: 'SUCCESS',
          type: 'SQUAD_SPLIT_SHARE',
          notes: `Individual share fee for ${lobby.name}`,
          createdAt: now,
        })
      );
    } else if (!isPayNow && pricePerPlayer > 0) {
      // Option: PAY LATER AT TURF COUNTER -> Record in Dues ledger
      const dueId = `${lobby.bookingId || lobbyId}_${player.uid}`;
      const dueDocRef = doc(db, 'dues', dueId);
      tx.set(
        dueDocRef,
        sanitizeData({
          id: dueId,
          bookingId: lobby.bookingId || lobbyId,
          turfId: lobby.turfId,
          turfName: lobby.turfName || 'Sports Turf',
          ownerId: lobby.hostId || '',
          playerId: player.uid,
          playerName: player.playerName,
          playerEmail: player.playerEmail || '',
          playerPhone: player.playerPhone || '',
          amountDue: pricePerPlayer,
          amountPaid: 0,
          remainingAmount: pricePerPlayer,
          status: 'PENDING',
          date: lobby.date || now.split('T')[0],
          startTime: lobby.startTime || '',
          endTime: lobby.endTime || '',
          bookingRef: lobby.name || 'Lobby Match',
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    if (lobby.bookingId) {
      const shareRef = doc(db, 'bookingPlayers', `${lobby.bookingId}_${player.uid}`);
      tx.set(
        shareRef,
        sanitizeData({
          id: `${lobby.bookingId}_${player.uid}`,
          bookingId: lobby.bookingId,
          turfId: lobby.turfId,
          ownerId: lobby.hostId || '',
          playerId: player.uid,
          playerName: player.playerName,
          playerEmail: player.playerEmail || '',
          playerPhotoURL: player.playerPhotoURL || null,
          shareAmount: pricePerPlayer,
          amountPaid,
          amountDue,
          status: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          paymentMethod: player.paymentMethod || 'PAY_LATER_AT_TURF',
          upiTxnRef: upiRef || null,
          lastPaymentAt: isPayNow ? now : null,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    // In-App Notification to Host
    if (lobby.hostId && lobby.hostId !== player.uid) {
      const notifRef = doc(collection(db, 'notifications'));
      tx.set(
        notifRef,
        sanitizeData({
          id: notifRef.id,
          recipientId: lobby.hostId,
          title: isPayNow ? 'Player Joined & Paid (UPI)' : 'Player Joined (Pay Later)',
          message: `${player.playerName} joined "${lobby.name}" (${isPayNow ? `₹${pricePerPlayer} paid via UPI` : `₹${pricePerPlayer} due at turf`}).`,
          type: 'LOBBY_JOINED',
          relatedId: lobby.id,
          relatedType: 'LOBBY',
          isRead: false,
          createdAt: now,
        })
      );
    }
  });

  return { transactionId: generatedTxnId, dynamicCost: computedDynamicCost };
}

// ==================== STEP-OUT & INSTANT REFUND ====================

export async function processLobbyStepOutRefund(
  lobbyId: string,
  uid: string,
  reason: string = 'Athlete stepped out of lobby'
): Promise<{ refunded: boolean; refundAmount: number; refundTxnId?: string }> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const participantId = `${lobbyId}_${uid}`;
  const participantRef = doc(db, 'lobbyPlayers', participantId);

  let wasRefunded = false;
  let amountRefunded = 0;
  let refundTxnCode: string | undefined;

  await runTransaction(db, async (tx) => {
    const lobbySnap = await tx.get(lobbyDocRef);
    if (!lobbySnap.exists()) return;
    const lobby = lobbySnap.data() as any;

    const gameStatus = getLobbyGameStatus(lobby);
    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
      throw new Error('This match has already started or concluded. Athletes cannot leave the lobby without playing.');
    }

    const existingUids: string[] = lobby.playerUids || [];
    const updatedUids = existingUids.filter((id) => id !== uid);
    const existingPlayers: any[] = lobby.players || [];
    const leavingPlayer = existingPlayers.find((p) => p.playerId === uid || p.uid === uid);
    const updatedPlayers = existingPlayers.filter((p) => p.playerId !== uid && p.uid !== uid);
    const newCount = Math.max(0, (lobby.currentPlayers || 1) - 1);
    const now = new Date().toISOString();

    const totalSlot = Number(lobby.totalSlotPrice) || (Number(lobby.pricePerPlayer) * Number(lobby.maxPlayers || 10));
    const dynamicCost = Math.round(totalSlot / Math.max(1, newCount));

    // 1. Remove pending dues if player selected Pay Later
    const dueId = `${lobby.bookingId || lobbyId}_${uid}`;
    const dueDocRef = doc(db, 'dues', dueId);
    tx.delete(dueDocRef);

    // 2. Real-time Instant Refund Ledger Entry if athlete paid share online / UPI
    if (leavingPlayer && Number(leavingPlayer.amountPaid) > 0) {
      wasRefunded = true;
      amountRefunded = Number(leavingPlayer.amountPaid);
      refundTxnCode = `REF-UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const refundRef = doc(collection(db, 'refunds'));
      tx.set(refundRef, sanitizeData({
        id: refundRef.id,
        refundTxnId: refundTxnCode,
        bookingId: lobby.bookingId || lobbyId,
        lobbyId: lobby.id,
        lobbyName: lobby.name,
        turfId: lobby.turfId,
        turfName: lobby.turfName || 'Sports Turf',
        playerId: uid,
        playerName: leavingPlayer.playerName || 'Athlete',
        amount: amountRefunded,
        refundMethod: 'UPI_SOURCE_REVERSAL',
        originalUpiTxnRef: leavingPlayer.upiTxnRef || 'UPI_DIRECT',
        status: 'PROCESSED',
        reason: reason,
        createdAt: now,
        updatedAt: now,
      }));

      // Also append to payment transactions as REFUND
      const paymentTxRef = doc(collection(db, 'paymentTransactions'));
      tx.set(paymentTxRef, sanitizeData({
        id: paymentTxRef.id,
        transactionId: refundTxnCode,
        bookingId: lobby.bookingId || lobbyId,
        lobbyId: lobby.id,
        playerId: uid,
        playerName: leavingPlayer.playerName || 'Athlete',
        ownerId: lobby.hostId || '',
        amount: amountRefunded,
        paymentMethod: 'UPI_REFUND',
        status: 'SUCCESS',
        type: 'SQUAD_STEP_OUT_REFUND',
        notes: `Instant refund of ₹${amountRefunded} for stepping out of ${lobby.name}`,
        createdAt: now,
      }));
    }

    // 3. Remove participant doc
    tx.delete(participantRef);

    // 4. Update lobby with decremented count and recalculated dynamic cost division
    tx.update(lobbyDocRef, sanitizeData({
      currentPlayers: newCount,
      dynamicCostPerPlayer: dynamicCost,
      playerUids: updatedUids,
      players: updatedPlayers,
      status: 'OPEN',
      updatedAt: now,
    }));

    // 5. Notify host of departure & updated squad count
    if (lobby.hostId && lobby.hostId !== uid) {
      const notifRef = doc(collection(db, 'notifications'));
      tx.set(notifRef, sanitizeData({
        id: notifRef.id,
        recipientId: lobby.hostId,
        title: 'Player Stepped Out',
        message: `${leavingPlayer?.playerName || 'An athlete'} stepped out of "${lobby.name}". ${newCount}/${lobby.maxPlayers} spots filled.`,
        type: 'LOBBY_LEFT',
        relatedId: lobby.id,
        relatedType: 'LOBBY',
        isRead: false,
        createdAt: now,
      }));
    }
  });

  return { refunded: wasRefunded, refundAmount: amountRefunded, refundTxnId: refundTxnCode };
}

export async function leaveLobby(lobbyId: string, uid: string): Promise<void> {
  await processLobbyStepOutRefund(lobbyId, uid);
}

export async function toggleLobbyJoin(
  lobbyId: string,
  uid: string,
  playerName: string,
  photoURL?: string,
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF',
  playerEmail?: string,
  upiTxnRef?: string,
  upiId?: string
): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const snap = await getDoc(lobbyDocRef);
  if (!snap.exists()) return;
  const lobbyData = snap.data();
  const playerUids: string[] = lobbyData.playerUids || (lobbyData.players || []).map((p: any) => p.playerId || p.uid);

  const gameStatus = getLobbyGameStatus(lobbyData as any);
  if (playerUids.includes(uid)) {
    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
      throw new Error('This match has already started or concluded. Athletes cannot leave the lobby without playing.');
    }
    await leaveLobby(lobbyId, uid);
  } else {
    if (gameStatus === 'LIVE' || gameStatus === 'OVER') {
      throw new Error('This match has already started or concluded. New athletes cannot join.');
    }
    await joinLobby(lobbyId, {
      uid,
      playerName,
      playerPhotoURL: photoURL,
      playerEmail,
      isHost: false,
      paymentMethod: paymentMethod || 'PAY_LATER_AT_TURF',
      upiTxnRef,
      upiId,
    });
  }
}

// ==================== PLAYER POOLS & SQUAD MATCHMAKING ====================

export async function getPlayerPools(filters?: {
  sport?: string;
  matchHoursCategory?: MatchHoursCategory;
  city?: string;
}): Promise<PlayerPool[]> {
  try {
    const colRef = collection(db, 'playerPools');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);

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
  creatorPhotoURL?: string;
  sport: string;
  city: string;
  area?: string;
  preferredDate: string;
  preferredTime: string;
  preferredHours?: string;
  matchHoursCategory?: MatchHoursCategory;
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
    photoURL: poolData.creatorPhotoURL,
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
    creatorPhotoURL: poolData.creatorPhotoURL,
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

  await setDoc(newPoolRef, sanitizeData(payload));
  return newPoolRef.id;
}

export async function joinPlayerPool(
  poolId: string,
  player: {
    uid: string;
    name: string;
    phone?: string;
    photoURL?: string;
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

    const newPlayers = [
      ...existingPlayers,
      {
        uid: player.uid,
        name: player.name,
        phone: player.phone,
        photoURL: player.photoURL,
        skillLevel: player.skillLevel || 'Athlete',
        paymentPreference: player.paymentPreference || 'UPI',
        joinedAt: now,
      },
    ];

    const newCount = newPlayers.length;
    isBacked = newCount >= pool.requiredPlayers;
    const nextStatus = isBacked ? 'READY_TO_CONVERT' : 'OPEN';

    tx.update(poolRef, sanitizeData({
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

    tx.update(poolRef, sanitizeData({
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

export function isLobbyConcluded(lobby: {
  date: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}): boolean {
  if (!lobby) return false;
  const statusUpper = (lobby.status || '').toUpperCase();
  if (
    statusUpper === 'COMPLETED' ||
    statusUpper === 'CLOSED' ||
    statusUpper === 'CONCLUDED' ||
    statusUpper === 'MATCH_CONCLUDED' ||
    statusUpper === 'OVER' ||
    statusUpper === 'FINISHED' ||
    statusUpper === 'EXPIRED'
  ) {
    return true;
  }
  if (statusUpper === 'CANCELLED') return false;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (lobby.date < todayStr) {
    return true;
  }
  if (lobby.date > todayStr) {
    return false;
  }

  // Today: check end time in minutes
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMin = parseTimeToMinutes(lobby.endTime || '23:59');
  return currentMinutes >= endMin;
}

export function getLobbyGameStatus(lobby: {
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
}): 'UPCOMING' | 'LIVE' | 'OVER' | 'CANCELLED' {
  if (!lobby) return 'OVER';
  const statusUpper = (lobby.status || '').toUpperCase();
  if (statusUpper === 'CANCELLED') return 'CANCELLED';
  if (statusUpper === 'MATCH_STARTED') return 'LIVE';
  if (
    statusUpper === 'COMPLETED' ||
    statusUpper === 'CLOSED' ||
    statusUpper === 'CONCLUDED' ||
    statusUpper === 'MATCH_CONCLUDED' ||
    statusUpper === 'OVER' ||
    statusUpper === 'FINISHED' ||
    statusUpper === 'EXPIRED'
  ) {
    return 'OVER';
  }

  const now = new Date();
  const todayStr = getLocalDateString(now);

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

// ==================== POOL-TO-LOBBY AUTO CONVERSION ====================

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
  const allTurfs = await getTurfs();

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

  const arenas = await getArenasByTurf(assignedTurf.id);
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
  let slots = await getSlotsByArenaAndDate(assignedArena.id, targetDate);
  let assignedSlot = slots.find((s) => s.status === 'AVAILABLE');

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

  await setDoc(newBookingRef, sanitizeData(bookingData));
  await setDoc(newLobbyRef, sanitizeData(lobbyData));

  // Lock slot in Firestore
  if (slotId && !slotId.startsWith('auto-slot-')) {
    try {
      await updateDoc(doc(db, 'slots', slotId), sanitizeData({
        status: 'BOOKED_BY_PLAYER',
        bookingType: 'PLAYER',
        bookedByPlayerId: pool.creatorId,
        bookedByPlayerName: pool.creatorName,
        activeBookingId: bookingId,
        updatedAt: now,
      }));
    } catch (sErr) {
      console.warn('Error locking slot for pool conversion:', sErr);
    }
  }

  // Create lobby player records
  for (const lp of lobbyPlayersList) {
    const pId = `${lobbyId}_${lp.uid}`;
    await setDoc(
      doc(db, 'lobbyPlayers', pId),
      sanitizeData({
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
    await addDoc(collection(db, 'notifications'), {
      recipientId: lp.uid,
      title: 'Squad Pool Converted to Live Lobby!',
      message: `Your ${pool.sport} squad is fully backed! A turf slot has been confirmed at ${assignedTurf.name} on ${targetDate} (${startTime}).`,
      type: 'LOBBY',
      relatedId: lobbyId,
      relatedType: 'LOBBY',
      isRead: false,
      createdAt: now,
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

export async function deleteLobby(lobbyId: string, hostUid: string): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyDocRef);
  if (!lobbySnap.exists()) return;
  const lobbyData = lobbySnap.data() as any;

  // Authorization check
  if (lobbyData.hostId && lobbyData.hostId !== hostUid) {
    throw new Error('Only the lobby host can delete this lobby.');
  }

  const now = new Date().toISOString();

  // 1. Release slot if booked
  if (lobbyData.slotId) {
    try {
      const slotRef = doc(db, 'slots', lobbyData.slotId);
      await updateDoc(slotRef, {
        status: 'AVAILABLE',
        bookingType: null,
        bookedByPlayerId: null,
        bookedByPlayerName: null,
        activeBookingId: null,
        updatedAt: now,
      });
    } catch (slotErr) {
      console.warn('Error freeing slot:', slotErr);
    }
  }

  // 2. Mark booking as cancelled if exists
  if (lobbyData.bookingId) {
    try {
      const bookingRef = doc(db, 'bookings', lobbyData.bookingId);
      await updateDoc(bookingRef, {
        bookingStatus: 'CANCELLED',
        updatedAt: now,
      });
    } catch (bookErr) {
      console.warn('Error cancelling booking:', bookErr);
    }
  }

  // 3. Delete lobby player docs
  try {
    const q = query(collection(db, 'lobbyPlayers'), where('lobbyId', '==', lobbyId));
    const playersSnap = await getDocs(q);
    for (const playerDoc of playersSnap.docs) {
      await deleteDoc(playerDoc.ref);
    }
  } catch (pErr) {
    console.warn('Error cleaning up lobby players:', pErr);
  }

  // 4. Delete the lobby document completely or mark CANCELLED
  await deleteDoc(lobbyDocRef);
}

export async function getLobbyParticipants(lobbyId: string): Promise<LobbyPlayer[]> {
  try {
    const q = query(collection(db, 'lobbyPlayers'), where('lobbyId', '==', lobbyId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LobbyPlayer));
    }
    // Fallback to lobby doc players
    const lobbyRef = doc(db, 'lobbies', lobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    if (lobbySnap.exists()) {
      const data = lobbySnap.data() as any;
      if (data.players && Array.isArray(data.players)) {
        return data.players.map((p: any) => ({
          id: `${lobbyId}_${p.playerId || p.uid}`,
          lobbyId,
          uid: p.playerId || p.uid,
          playerName: p.playerName || 'Player',
          playerPhotoURL: p.playerPhotoURL || null,
          preferredSport: data.sport,
          skillLevel: 'Athlete',
          isHost: !!p.isHost || (p.playerId || p.uid) === data.hostId,
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

export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
  } catch (err) {
    console.warn('Error fetching user profile:', err);
    return null;
  }
}

// ==================== TEAMS ====================

export async function getTeams(): Promise<Team[]> {
  try {
    const colRef = collection(db, 'teams');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
  } catch (err) {
    console.warn('Error fetching teams:', err);
    return [];
  }
}

export async function createTeam(team: {
  name: string;
  sport: string;
  city: string;
  captainId: string;
  captainName: string;
  captainPhotoURL?: string;
}): Promise<string> {
  const newTeamRef = doc(collection(db, 'teams'));
  const now = new Date().toISOString();
  const teamPayload: Team = {
    id: newTeamRef.id,
    name: team.name,
    sport: team.sport,
    city: team.city,
    description: `${team.sport} squad based in ${team.city}`,
    captainId: team.captainId,
    captainName: team.captainName,
    captainPhotoURL: team.captainPhotoURL,
    maxMembers: 20,
    memberCount: 1,
    isPublic: true,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newTeamRef, sanitizeData(teamPayload));

  // Add captain as member
  const memberId = `${newTeamRef.id}_${team.captainId}`;
  await setDoc(doc(db, 'teamMembers', memberId), sanitizeData({
    id: memberId,
    teamId: newTeamRef.id,
    uid: team.captainId,
    name: team.captainName,
    photoURL: team.captainPhotoURL,
    role: 'CAPTAIN',
    joinedAt: now,
  }));

  return newTeamRef.id;
}

export async function joinTeam(
  teamId: string,
  uid: string,
  name: string,
  photoURL?: string
): Promise<void> {
  const memberId = `${teamId}_${uid}`;
  const memberRef = doc(db, 'teamMembers', memberId);
  const teamRef = doc(db, 'teams', teamId);
  const now = new Date().toISOString();

  await setDoc(memberRef, sanitizeData({
    id: memberId,
    teamId,
    uid,
    name,
    photoURL,
    role: 'MEMBER',
    joinedAt: now,
  }));

  const teamSnap = await getDoc(teamRef);
  if (teamSnap.exists()) {
    const current = teamSnap.data().memberCount || 1;
    await updateDoc(teamRef, {
      memberCount: current + 1,
      updatedAt: now,
    });
  }
}

// ==================== MATCHES ====================

export async function getMatches(): Promise<Match[]> {
  try {
    const colRef = collection(db, 'matches');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
  } catch (err) {
    console.warn('Error fetching matches:', err);
    return [];
  }
}

export async function createMatch(match: Omit<Match, 'id' | 'createdAt' | 'updatedAt' | 'currentPlayers'>): Promise<string> {
  const newMatchRef = doc(collection(db, 'matches'));
  const now = new Date().toISOString();
  const matchPayload: Match = {
    ...match,
    id: newMatchRef.id,
    currentPlayers: 1,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newMatchRef, sanitizeData(matchPayload));

  const partId = `${newMatchRef.id}_${match.hostId}`;
  await setDoc(doc(db, 'matchPlayers', partId), sanitizeData({
    id: partId,
    matchId: newMatchRef.id,
    uid: match.hostId,
    name: match.hostName,
    joinedAt: now,
  }));

  return newMatchRef.id;
}

export async function joinMatch(
  matchId: string,
  uid: string,
  name: string,
  photoURL?: string
): Promise<void> {
  const partId = `${matchId}_${uid}`;
  const partRef = doc(db, 'matchPlayers', partId);
  const matchRef = doc(db, 'matches', matchId);
  const now = new Date().toISOString();

  await setDoc(partRef, sanitizeData({
    id: partId,
    matchId,
    uid,
    name,
    photoURL,
    joinedAt: now,
  }));

  const matchSnap = await getDoc(matchRef);
  if (matchSnap.exists()) {
    const current = matchSnap.data().currentPlayers || 1;
    await updateDoc(matchRef, {
      currentPlayers: current + 1,
      updatedAt: now,
    });
  }
}

// ==================== REVIEWS ====================

export async function getTurfReviews(turfId: string): Promise<TurfReview[]> {
  try {
    const colRef = collection(db, 'turfReviews');
    const q = query(colRef, where('turfId', '==', turfId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TurfReview));
  } catch {
    return [];
  }
}

export async function addTurfReview(review: Omit<TurfReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, 'turfReviews'));
  const now = new Date().toISOString();
  const payload = {
    ...review,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeData(payload));
  return docRef.id;
}

// ==================== OFFERS ====================

export async function getOffers(): Promise<Offer[]> {
  try {
    const colRef = collection(db, 'offers');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
  } catch (err) {
    console.warn('Error getting offers:', err);
    return [];
  }
}

export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const colRef = collection(db, 'offers');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
  } catch {
    return [];
  }
}

export async function getActiveOffersByTurf(turfId: string): Promise<Offer[]> {
  try {
    const colRef = collection(db, 'offers');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Offer))
      .filter(
        (o) =>
          (o.turfId === 'ALL' || o.turfId === turfId) &&
          (!o.endDate || o.endDate >= today) &&
          (!o.usageLimit || (o.usedCount || 0) < o.usageLimit)
      );
  } catch (err) {
    console.warn('Error fetching active offers by turf:', err);
    return [];
  }
}

export async function getAllActiveOffers(): Promise<Offer[]> {
  try {
    const colRef = collection(db, 'offers');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Offer))
      .filter(
        (o) =>
          (!o.endDate || o.endDate >= today) &&
          (!o.usageLimit || (o.usedCount || 0) < o.usageLimit)
      );
  } catch (err) {
    console.warn('Error fetching all active offers:', err);
    return [];
  }
}

export async function createOffer(offerData: {
  title: string;
  description: string;
  code: string;
  discountPercent: number;
  usageLimit?: number;
  turfId: string;
  turfName: string;
  validUntil: string;
  active: boolean;
}): Promise<string> {
  const docRef = doc(collection(db, 'offers'));
  const now = new Date().toISOString();
  const payload: Offer = {
    id: docRef.id,
    ownerId: '',
    turfId: offerData.turfId,
    turfName: offerData.turfName,
    code: offerData.code,
    name: offerData.title,
    description: offerData.description,
    discountType: 'PERCENTAGE',
    discountValue: offerData.discountPercent,
    startDate: now.split('T')[0],
    endDate: offerData.validUntil,
    usageLimit: offerData.usageLimit || 50,
    usedCount: 0,
    active: offerData.active,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeData(payload));
  return docRef.id;
}

export async function validateAndApplyOffer(
  code: string,
  bookingAmount: number,
  turfId: string,
  arenaId?: string
): Promise<{
  valid: boolean;
  message?: string;
  offer?: Offer;
  discountAmount: number;
  finalAmount: number;
}> {
  if (!code || !code.trim()) {
    return { valid: false, message: 'Please enter a coupon code.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const cleanCode = code.trim().toUpperCase();
  const offersRef = collection(db, 'offers');
  const q = query(offersRef, where('code', '==', cleanCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    return { valid: false, message: 'Invalid promo code. Please check and try again.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const offerDoc = snap.docs[0];
  const offer = { id: offerDoc.id, ...offerDoc.data() } as Offer;

  if (!offer.active) {
    return { valid: false, message: 'This promo code has been deactivated.', discountAmount: 0, finalAmount: bookingAmount };
  }

  const today = new Date().toISOString().split('T')[0];
  if (offer.startDate && today < offer.startDate) {
    return { valid: false, message: `Promo code is not yet active. Valid from ${offer.startDate}.`, discountAmount: 0, finalAmount: bookingAmount };
  }
  if (offer.endDate && today > offer.endDate) {
    return { valid: false, message: `Promo code expired on ${offer.endDate}.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.turfId !== 'ALL' && offer.turfId !== turfId) {
    return { valid: false, message: 'This promo code is not applicable for this turf.', discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.arenaId && offer.arenaId !== 'ALL' && arenaId && offer.arenaId !== arenaId) {
    return { valid: false, message: 'This promo code is not applicable for this arena/gaming zone.', discountAmount: 0, finalAmount: bookingAmount };
  }

  if (offer.usageLimit && (offer.usedCount || 0) >= offer.usageLimit) {
    return { valid: false, message: `This promo code has reached its maximum usage limit of ${offer.usageLimit} redemptions.`, discountAmount: 0, finalAmount: bookingAmount };
  }

  let discount = 0;
  if (offer.discountType === 'PERCENTAGE') {
    discount = (bookingAmount * offer.discountValue) / 100;
  } else {
    discount = offer.discountValue;
  }

  discount = Math.min(discount, bookingAmount);
  const finalAmount = Math.max(0, bookingAmount - discount);

  return {
    valid: true,
    offer,
    discountAmount: Math.round(discount),
    finalAmount: Math.round(finalAmount),
  };
}

export async function incrementOfferUsage(offerId: string): Promise<void> {
  try {
    const offerRef = doc(db, 'offers', offerId);
    const snap = await getDoc(offerRef);
    if (snap.exists()) {
      const o = snap.data() as Offer;
      await updateDoc(offerRef, {
        usedCount: (o.usedCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to increment offer usage:', err);
  }
}

// ==================== NOTIFICATIONS ====================

export async function getUserNotifications(userId: string): Promise<InAppNotification[]> {
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('recipientId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Seed default welcome notifications
      return [
        {
          id: 'welcome_1',
          recipientId: userId,
          title: 'Welcome to TurFit Sports!',
          message: 'Explore world-class turfs, join pick-up lobbies, and book with instant confirmation.',
          type: 'GENERAL',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'welcome_2',
          recipientId: userId,
          title: 'Earn 150 Reward Points',
          message: 'Your athlete reward wallet has been credited with 150 points for your first match.',
          type: 'REWARD',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InAppNotification));
  } catch (err) {
    console.warn('Error fetching notifications:', err);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (notificationId.startsWith('welcome_')) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      read: true,
    });
  } catch (err) {
    console.warn('Error marking notification read:', err);
  }
}

export async function sendNotification(
  params: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  return sendPushNotification({
    recipientId: params.recipientId,
    title: params.title,
    message: params.message,
    type: params.type,
    relatedId: params.relatedId,
    relatedType: params.relatedType,
    linkId: params.linkId,
    senderId: params.senderId,
    senderName: params.senderName,
  });
}

export { sendPushNotification } from './pushNotificationService';

// ==================== REWARDS & WALLET ====================

export async function getUserRewardWallet(userId: string): Promise<UserRewardWallet> {
  const docRef = doc(db, 'rewardWallets', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserRewardWallet;
  }
  const initial: UserRewardWallet = {
    userId,
    pointsBalance: 150,
    lifetimeEarned: 150,
    lifetimeRedeemed: 0,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, sanitizeData(initial));
  return initial;
}

// ==================== POST-MATCH PLAYER RATINGS & STATS ====================

export {
  submitPlayerRating,
  checkHasRatedPlayer,
  getPlayerRatingsList,
  getPlayerSportsmanshipStats,
} from './playerRatingService';
export type { SubmitPlayerRatingParams } from './playerRatingService';



