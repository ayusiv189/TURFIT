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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  createdAt: any;
  type: 'text' | 'image' | 'system';
}

export async function sendMessage(
  groupId: string,
  groupType: 'team' | 'lobby' | 'tournament' | 'match',
  message: Omit<GroupMessage, 'id' | 'createdAt'>
) {
  const messageRef = doc(collection(db, `${groupType}Chats`, groupId, 'messages'));
  await setDoc(messageRef, {
    ...message,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToGroupChat(
  groupId: string,
  groupType: 'team' | 'lobby' | 'tournament' | 'match',
  onMessages: (messages: GroupMessage[]) => void
) {
  const q = query(
    collection(db, `${groupType}Chats`, groupId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupMessage[];
    onMessages(messages.reverse());
  });
}
