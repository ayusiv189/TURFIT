import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Lobby, LobbyMessage, LobbyMessageType } from '../types';

/**
 * Calculates the expiration timestamp for an ephemeral lobby message.
 * Default: 2 hours after the match endTime, or 24 hours from now if no match time.
 */
export function calculateMessageExpiry(
  lobby?: Lobby | null,
  hoursAfterMatch: number = 2
): string {
  if (lobby?.date && lobby?.endTime) {
    try {
      let endHour = 22;
      let endMinute = 0;
      const rawEnd = lobby.endTime.trim();

      if (rawEnd.includes(':')) {
        const parts = rawEnd.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) || 0;

        if (rawEnd.toLowerCase().includes('pm') && h < 12) h += 12;
        if (rawEnd.toLowerCase().includes('am') && h === 12) h = 0;

        if (!isNaN(h)) endHour = h;
        if (!isNaN(m)) endMinute = m;
      }

      const matchEndDate = new Date(`${lobby.date}T00:00:00`);
      matchEndDate.setHours(endHour + hoursAfterMatch, endMinute, 0, 0);

      if (!isNaN(matchEndDate.getTime())) {
        return matchEndDate.toISOString();
      }
    } catch {
      // fallback
    }
  }

  const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return fallback.toISOString();
}

/**
 * Send an ephemeral message into the match lobby chat.
 */
export async function sendLobbyChatMessage(params: {
  lobbyId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  text: string;
  type?: LobbyMessageType;
  isHost?: boolean;
  lobby?: Lobby | null;
  hoursAfterMatch?: number;
}): Promise<string> {
  const cleanText = params.text.trim();
  if (!cleanText) {
    throw new Error('Message cannot be empty.');
  }

  const messagesCol = collection(db, 'lobbies', params.lobbyId, 'messages');
  const newMsgRef = doc(messagesCol);

  const expiresAt = calculateMessageExpiry(params.lobby, params.hoursAfterMatch || 2);
  const now = new Date().toISOString();

  const payload: LobbyMessage = {
    id: newMsgRef.id,
    lobbyId: params.lobbyId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderPhotoURL: params.senderPhotoURL || null,
    text: cleanText,
    type: params.type || 'TEXT',
    createdAt: now,
    expiresAt,
    isHost: !!params.isHost,
  };

  await setDoc(newMsgRef, payload);
  return newMsgRef.id;
}

/**
 * Real-time listener for lobby chat messages.
 * Automatically filters out any messages where expiresAt is in the past.
 */
export function subscribeLobbyMessages(
  lobbyId: string,
  onUpdate: (messages: LobbyMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'lobbies', lobbyId, 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'), limit(150));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const now = new Date().toISOString();
      const activeMessages: LobbyMessage[] = [];
      let hasExpiredMessages = false;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as LobbyMessage;
        const msg: LobbyMessage = {
          ...data,
          id: docSnap.id,
          lobbyId,
        };

        if (msg.expiresAt && msg.expiresAt < now) {
          hasExpiredMessages = true;
        } else {
          activeMessages.push(msg);
        }
      });

      onUpdate(activeMessages);

      if (hasExpiredMessages) {
        cleanupExpiredLobbyMessages(lobbyId).catch((err) =>
          console.warn('Lobby chat auto-cleanup error:', err)
        );
      }
    },
    (err) => {
      console.warn('Error subscribing to lobby messages:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Background auto-cleanup of expired messages for a lobby.
 */
export async function cleanupExpiredLobbyMessages(lobbyId: string): Promise<number> {
  try {
    const now = new Date().toISOString();
    const colRef = collection(db, 'lobbies', lobbyId, 'messages');
    const q = query(colRef, where('expiresAt', '<=', now), limit(100));
    const snap = await getDocs(q);

    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    return snap.size;
  } catch (err) {
    console.warn('Failed to cleanup expired lobby messages:', err);
    return 0;
  }
}

/**
 * Manual host / squad action to immediately purge all chat messages post-match.
 */
export async function purgeAllLobbyMessages(lobbyId: string): Promise<number> {
  try {
    const colRef = collection(db, 'lobbies', lobbyId, 'messages');
    const snap = await getDocs(colRef);

    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    return snap.size;
  } catch (err) {
    console.error('Failed to purge lobby chat:', err);
    throw err;
  }
}

/**
 * Formats countdown or status string for ephemeral chat banner.
 */
export function getLobbyChatExpiryLabel(lobby?: Lobby | null): {
  isExpired: boolean;
  timeRemainingLabel: string;
  policyNote: string;
} {
  const policyNote = 'Messages automatically expire 2 hours post-match for athlete privacy & hygiene.';

  if (!lobby) {
    return { isExpired: false, timeRemainingLabel: 'Active', policyNote };
  }

  const expiryIso = calculateMessageExpiry(lobby, 2);
  const expiryTime = new Date(expiryIso).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      timeRemainingLabel: 'Chat Expired & Cleaned Up',
      policyNote,
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeRemainingLabel = '';
  if (diffHours > 0) {
    timeRemainingLabel = `Auto-purges in ${diffHours}h ${diffMins}m`;
  } else {
    timeRemainingLabel = `Auto-purges in ${diffMins}m`;
  }

  return {
    isExpired: false,
    timeRemainingLabel,
    policyNote,
  };
}
