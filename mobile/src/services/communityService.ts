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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Lobby,
  LobbyPlayer,
  Team,
  TeamMember,
  Match,
  MatchPlayer,
  TurfReview,
  Offer,
  UserRewardWallet,
  InAppNotification,
  BookingPlayerShare,
  UserProfile,
} from '../types';
import { sanitizeData } from './dbService';

// ==================== LOBBIES ====================

export async function getLobbies(): Promise<Lobby[]> {
  try {
    const colRef = collection(db, 'lobbies');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const curTimeVal = now.getHours() * 60 + now.getMinutes();

    const activeList: Lobby[] = [];

    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.status === 'CANCELLED' || data.isExpired) continue;

      let isExpired = false;
      if (data.date < todayStr) {
        isExpired = true;
      } else if (data.date === todayStr && data.endTime) {
        let endH = 0;
        let endM = 0;
        const parts = data.endTime.split(' ');
        const timePart = parts[0];
        const ampm = parts[1]?.toUpperCase();
        const [hStr, mStr] = timePart.split(':');
        endH = parseInt(hStr, 10) || 0;
        endM = parseInt(mStr, 10) || 0;
        if (ampm === 'PM' && endH < 12) endH += 12;
        if (ampm === 'AM' && endH === 12) endH = 0;
        const endTimeVal = endH * 60 + endM;
        if (curTimeVal > endTimeVal) {
          isExpired = true;
        }
      }

      if (isExpired) {
        // Auto-delete / expire lobby when game time is over
        updateDoc(d.ref, {
          status: 'CLOSED',
          isExpired: true,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
        continue;
      }

      activeList.push({
        id: d.id,
        ...data,
        players: data.players || (data.playerUids ? data.playerUids.map((uid: string) => ({ playerId: uid, uid })) : []),
      } as unknown as Lobby);
    }

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
  date: string;
  startTime: string;
  endTime: string;
  pricePerPlayer: number;
}): Promise<string> {
  const newLobbyRef = doc(collection(db, 'lobbies'));
  const now = new Date().toISOString();
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
    minPlayers: 2,
    currentPlayers: 1,
    pricePerPlayer: lobbyData.pricePerPlayer,
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
  description?: string;
  rules?: string;
  isPublic?: boolean;
  allowNewPlayers?: boolean;
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF';
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
    const amountPaid = isPaid ? params.totalAmount : 0;
    const amountDue = params.totalAmount - amountPaid;
    const paymentStatus = isPaid ? 'PAID' : 'PENDING';

    const newBookingRef = doc(collection(db, 'bookings'));
    const newLobbyRef = doc(collection(db, 'lobbies'));
    const lobbyId = newLobbyRef.id;

    const bookingData = {
      id: newBookingRef.id,
      bookingId: `TF-MOB-${Math.floor(100000 + Math.random() * 900000)}`,
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
      paymentStatus: paymentStatus,
      bookingStatus: 'CONFIRMED',
      bookingType: 'PLAYER',
      paymentMethod: params.paymentMethod || 'PAY_LATER_AT_TURF',
      lobbyCreated: true,
      lobbyId: lobbyId,
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
      minPlayers: Number(params.minPlayers || 2),
      currentPlayers: 1,
      pricePerPlayer: Number(params.pricePerPlayer),
      description: params.description?.trim() || `Pick-up match for ${params.sport}`,
      rules: params.rules?.trim() || 'Arrive 10 mins prior.',
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
      joinedAt: now,
    }));

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
  }
): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const participantId = `${lobbyId}_${player.uid}`;
  const participantRef = doc(db, 'lobbyPlayers', participantId);

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
    const isPayNow = player.paymentMethod === 'PAY_NOW';
    const amountPaid = isPayNow ? pricePerPlayer : 0;
    const amountDue = isPayNow ? 0 : pricePerPlayer;
    const paymentStatus = isPayNow ? 'PAID' : 'DUE';

    const newCount = (lobby.currentPlayers || 0) + 1;
    const now = new Date().toISOString();
    const updatedUids = [...existingUids, player.uid];
    const existingPlayers = lobby.players || [];
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
        joinedAt: now,
      })
    );

    tx.update(
      lobbyDocRef,
      sanitizeData({
        currentPlayers: newCount,
        playerUids: updatedUids,
        players: updatedPlayers,
        status: newCount >= lobby.maxPlayers ? 'FULL' : 'OPEN',
        updatedAt: now,
      })
    );

    // If there is an active booking, create or update the bookingPlayers share record and dues
    const dueId = `${lobby.bookingId || lobbyId}_${player.uid}`;
    const dueDocRef = doc(db, 'dues', dueId);

    if (!isPayNow && pricePerPlayer > 0) {
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
          lastPaymentAt: isPayNow ? now : null,
          createdAt: now,
          updatedAt: now,
        })
      );

      if (isPayNow && pricePerPlayer > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        tx.set(
          paymentRef,
          sanitizeData({
            id: paymentRef.id,
            bookingId: lobby.bookingId,
            turfId: lobby.turfId,
            ownerId: lobby.hostId || '',
            playerId: player.uid,
            playerName: player.playerName,
            amount: pricePerPlayer,
            paymentMethod: 'ONLINE',
            status: 'PAID',
            type: 'PLAYER_SHARE',
            note: `Lobby share payment for ${lobby.name}`,
            createdAt: now,
          })
        );
      }
    }
  });
}

export async function leaveLobby(lobbyId: string, uid: string): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const participantId = `${lobbyId}_${uid}`;
  const participantRef = doc(db, 'lobbyPlayers', participantId);

  await runTransaction(db, async (tx) => {
    const lobbySnap = await tx.get(lobbyDocRef);
    if (!lobbySnap.exists()) return;
    const lobby = lobbySnap.data() as any;

    const existingUids: string[] = lobby.playerUids || [];
    const updatedUids = existingUids.filter((id) => id !== uid);
    const existingPlayers: any[] = lobby.players || [];
    const leavingPlayer = existingPlayers.find((p) => p.playerId === uid || p.uid === uid);
    const updatedPlayers = existingPlayers.filter((p) => p.playerId !== uid && p.uid !== uid);
    const newCount = Math.max(0, (lobby.currentPlayers || 1) - 1);
    const now = new Date().toISOString();

    // 1. If player had dues for this lobby, cancel/delete them
    const dueId = `${lobby.bookingId || lobbyId}_${uid}`;
    const dueDocRef = doc(db, 'dues', dueId);
    tx.delete(dueDocRef);

    // 2. If player had paid online, create refund record
    if (leavingPlayer && leavingPlayer.amountPaid > 0) {
      const refundRef = doc(collection(db, 'refunds'));
      tx.set(refundRef, sanitizeData({
        id: refundRef.id,
        bookingId: lobby.bookingId || lobbyId,
        turfId: lobby.turfId,
        playerId: uid,
        playerName: leavingPlayer.playerName || 'Player',
        amount: leavingPlayer.amountPaid,
        status: 'REFUNDED_TO_SOURCE',
        reason: 'Player stepped out of lobby',
        createdAt: now,
        updatedAt: now,
      }));
    }

    tx.delete(participantRef);
    tx.update(lobbyDocRef, sanitizeData({
      currentPlayers: newCount,
      playerUids: updatedUids,
      players: updatedPlayers,
      status: 'OPEN',
      updatedAt: now,
    }));
  });
}

export async function toggleLobbyJoin(
  lobbyId: string,
  uid: string,
  playerName: string,
  photoURL?: string,
  paymentMethod?: 'PAY_NOW' | 'PAY_LATER_AT_TURF',
  playerEmail?: string
): Promise<void> {
  const lobbyDocRef = doc(db, 'lobbies', lobbyId);
  const snap = await getDoc(lobbyDocRef);
  if (!snap.exists()) return;
  const lobbyData = snap.data();
  const playerUids: string[] = lobbyData.playerUids || (lobbyData.players || []).map((p: any) => p.playerId || p.uid);

  if (playerUids.includes(uid)) {
    await leaveLobby(lobbyId, uid);
  } else {
    await joinLobby(lobbyId, {
      uid,
      playerName,
      playerPhotoURL: photoURL,
      playerEmail,
      isHost: false,
      paymentMethod: paymentMethod || 'PAY_LATER_AT_TURF',
    });
  }
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

export async function createOffer(offerData: {
  title: string;
  description: string;
  code: string;
  discountPercent: number;
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
    usedCount: 0,
    active: offerData.active,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, sanitizeData(payload));
  return docRef.id;
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
          title: 'Welcome to TruFit Sports!',
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

