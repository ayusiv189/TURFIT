import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Slot, SlotStatus } from '../types';

export function subscribeToTurfSlots(
  turfId: string,
  date: string,
  callback: (slots: Slot[]) => void
): () => void {
  const q = query(
    collection(db, 'slots'),
    where('turfId', '==', turfId),
    where('date', '==', date)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => d.data() as Slot);
    // Sort chronologically by startTime
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    callback(list);
  });
}

export async function createSingleSlot(
  slotData: Omit<Slot, 'id' | 'createdAt'>
): Promise<string> {
  const slotRef = doc(collection(db, 'slots'));
  const newSlot: Slot = {
    ...slotData,
    id: slotRef.id,
    createdAt: new Date().toISOString(),
  };
  await setDoc(slotRef, newSlot);
  return slotRef.id;
}

export async function updateSlotStatus(
  slotId: string,
  status: SlotStatus,
  visibleToPlayers?: boolean
): Promise<void> {
  const updates: Partial<Slot> = { status };
  if (typeof visibleToPlayers === 'boolean') {
    updates.visibleToPlayers = visibleToPlayers;
  }
  await updateDoc(doc(db, 'slots', slotId), updates);
}

export async function deleteSlot(slotId: string): Promise<void> {
  await deleteDoc(doc(db, 'slots', slotId));
}

export async function bulkGenerateSlots(
  ownerId: string,
  turfId: string,
  arenaId: string,
  date: string,
  day: string,
  startHour: number,
  endHour: number,
  slotDurationMinutes: number,
  price: number
): Promise<number> {
  const batch = writeBatch(db);
  let count = 0;

  for (let h = startHour; h < endHour; h++) {
    const startTime = `${h.toString().padStart(2, '0')}:00`;
    const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;

    const slotRef = doc(collection(db, 'slots'));
    const slot: Slot = {
      id: slotRef.id,
      turfId,
      arenaId,
      ownerId,
      date,
      day,
      startTime,
      endTime,
      durationMinutes: slotDurationMinutes,
      price,
      status: 'AVAILABLE',
      visibleToPlayers: true,
      createdAt: new Date().toISOString(),
    };
    batch.set(slotRef, slot);
    count++;
  }

  await batch.commit();
  return count;
}
