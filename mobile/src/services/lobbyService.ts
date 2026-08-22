import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Lobby, LobbyParticipant } from '../types';

export function subscribeToLobbies(callback: (lobbies: Lobby[]) => void): () => void {
  const q = collection(db, 'lobbies');
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Lobby);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
}

export async function createLobby(
  data: Omit<Lobby, 'id' | 'currentPlayers' | 'participants' | 'status' | 'createdAt'>,
  host: { userId: string; userName: string; userPhone?: string }
): Promise<string> {
  const lobbyRef = doc(collection(db, 'lobbies'));
  const hostParticipant: LobbyParticipant = {
    userId: host.userId,
    userName: host.userName,
    userPhone: host.userPhone,
    joinedAt: new Date().toISOString(),
    role: 'HOST',
  };

  const newLobby: Lobby = {
    ...data,
    id: lobbyRef.id,
    currentPlayers: 1,
    participants: [hostParticipant],
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  await setDoc(lobbyRef, newLobby);
  return lobbyRef.id;
}

export async function joinLobby(
  lobbyId: string,
  user: { userId: string; userName: string; userPhone?: string }
): Promise<void> {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error('Lobby not found');

  const lobby = snap.data() as Lobby;
  const isAlreadyIn = lobby.participants.some((p) => p.userId === user.userId);
  if (isAlreadyIn) return;

  if (lobby.participants.length >= lobby.requiredPlayers) {
    throw new Error('Lobby is already full');
  }

  const newParticipant: LobbyParticipant = {
    userId: user.userId,
    userName: user.userName,
    userPhone: user.userPhone,
    joinedAt: new Date().toISOString(),
    role: 'MEMBER',
  };

  const updatedParticipants = [...lobby.participants, newParticipant];
  const newStatus = updatedParticipants.length >= lobby.requiredPlayers ? 'FULL' : 'OPEN';

  await updateDoc(lobbyRef, {
    participants: updatedParticipants,
    currentPlayers: updatedParticipants.length,
    status: newStatus,
  });
}

export async function leaveLobby(lobbyId: string, userId: string): Promise<void> {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const updated = lobby.participants.filter((p) => p.userId !== userId);

  await updateDoc(lobbyRef, {
    participants: updated,
    currentPlayers: updated.length,
    status: 'OPEN',
  });
}
