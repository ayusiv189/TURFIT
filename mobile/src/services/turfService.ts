import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Turf, Arena } from '../types';

export async function createTurf(
  ownerId: string,
  data: Omit<Turf, 'id' | 'ownerId' | 'createdAt'>
): Promise<string> {
  const turfRef = doc(collection(db, 'turfs'));
  const newTurf: Turf = {
    ...data,
    id: turfRef.id,
    ownerId,
    rating: 5.0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(turfRef, newTurf);
  return turfRef.id;
}

export async function updateTurf(
  turfId: string,
  updates: Partial<Turf>
): Promise<void> {
  await updateDoc(doc(db, 'turfs', turfId), updates);
}

export async function getOwnerTurf(ownerId: string): Promise<Turf | null> {
  const q = query(collection(db, 'turfs'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as Turf;
  }
  return null;
}

export function subscribeToTurfs(callback: (turfs: Turf[]) => void): () => void {
  const q = collection(db, 'turfs');
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((doc) => doc.data() as Turf);
    callback(list);
  });
}

export async function getTurfById(turfId: string): Promise<Turf | null> {
  const docSnap = await getDoc(doc(db, 'turfs', turfId));
  if (docSnap.exists()) {
    return docSnap.data() as Turf;
  }
  return null;
}

// Arena Operations
export async function createArena(
  turfId: string,
  ownerId: string,
  data: Omit<Arena, 'id' | 'turfId' | 'ownerId' | 'createdAt'>
): Promise<string> {
  const arenaRef = doc(collection(db, 'arenas'));
  const newArena: Arena = {
    ...data,
    id: arenaRef.id,
    turfId,
    ownerId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(arenaRef, newArena);
  return arenaRef.id;
}

export function subscribeToTurfArenas(
  turfId: string,
  callback: (arenas: Arena[]) => void
): () => void {
  const q = query(collection(db, 'arenas'), where('turfId', '==', turfId));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((doc) => doc.data() as Arena);
    callback(list);
  });
}
