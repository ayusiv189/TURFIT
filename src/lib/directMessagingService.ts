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
  orderBy,
  onSnapshot,
  limit,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { DirectConversation, DirectMessage } from '../types';
import { sanitizeFirestoreData } from './utils';

export const CONVERSATION_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isConversationExpired(
  conv: DirectConversation | { updatedAt?: string; lastMessageAt?: string; createdAt?: string } | null | undefined
): boolean {
  if (!conv) return false;
  const timeStr = conv.lastMessageAt || conv.updatedAt || (conv as any).createdAt;
  if (!timeStr) return false;
  const time = new Date(timeStr).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time > CONVERSATION_EXPIRATION_MS;
}

export function isMessageExpired(msg: DirectMessage | { createdAt?: string } | null | undefined): boolean {
  if (!msg || !msg.createdAt) return false;
  const time = new Date(msg.createdAt).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time > CONVERSATION_EXPIRATION_MS;
}

export async function deleteDirectConversation(conversationId: string): Promise<void> {
  if (!conversationId) return;
  try {
    // 1. Delete all messages inside the subcollection
    const messagesCol = collection(db, 'direct_conversations', conversationId, 'messages');
    const msgSnap = await getDocs(messagesCol);
    if (!msgSnap.empty) {
      const batch = writeBatch(db);
      msgSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
    // 2. Delete the conversation document
    const convRef = doc(db, 'direct_conversations', conversationId);
    await deleteDoc(convRef);
    console.log(`[Direct Messaging] Expired 24h direct conversation ${conversationId} purged from Firebase.`);
  } catch (err) {
    console.warn(`[Direct Messaging] Failed to delete conversation ${conversationId}:`, err);
  }
}

export function getDirectConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export async function checkIsConnectionOrFollower(senderId: string, recipientId: string): Promise<boolean> {
  if (senderId === recipientId) return true;
  try {
    const f1Ref = doc(db, 'follows', `${senderId}_${recipientId}`);
    const f2Ref = doc(db, 'follows', `${recipientId}_${senderId}`);
    const [f1Snap, f2Snap] = await Promise.all([getDoc(f1Ref), getDoc(f2Ref)]);
    return f1Snap.exists() || f2Snap.exists();
  } catch (err) {
    console.warn('Error checking follow relationship:', err);
    return false;
  }
}

export async function verifyMessagingAllowance(
  senderId: string,
  recipientId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!senderId || !recipientId) return { allowed: false, reason: 'Invalid sender or recipient.' };
  if (senderId === recipientId) return { allowed: true };

  try {
    // 1. Check blocks (bidirectional check)
    const block1Ref = doc(db, 'blocks', `${senderId}_${recipientId}`);
    const block2Ref = doc(db, 'blocks', `${recipientId}_${senderId}`);
    const [b1Snap, b2Snap] = await Promise.all([getDoc(block1Ref), getDoc(block2Ref)]);
    if (b1Snap.exists() || b2Snap.exists()) {
      return { allowed: false, reason: 'This conversation is blocked.' };
    }

    // 2. Check restrictions (bidirectional check)
    const rest1Ref = doc(db, 'restrictions', `${senderId}_${recipientId}`);
    const rest2Ref = doc(db, 'restrictions', `${recipientId}_${senderId}`);
    const [r1Snap, r2Snap] = await Promise.all([getDoc(rest1Ref), getDoc(rest2Ref)]);
    if (r1Snap.exists() || r2Snap.exists()) {
      return { allowed: false, reason: 'Messaging restricted by safety settings.' };
    }

    // 3. Fetch recipient profile
    const recipientRef = doc(db, 'users', recipientId);
    const recSnap = await getDoc(recipientRef);
    if (!recSnap.exists()) {
      return { allowed: false, reason: 'Recipient profile not found.' };
    }

    const recData = recSnap.data() as any;
    if (recData.verificationStatus === 'suspended') {
      return { allowed: false, reason: 'This account has been suspended by Administration.' };
    }

    // Privacy logic
    const privacy = recData.privacySettings;
    const allowDMs = privacy?.allowDirectMessages; // EVERYONE, FOLLOWERS, NOBODY, or true/false
    const profileVisibility = privacy?.profileVisibility; // PUBLIC, FOLLOWERS_ONLY, PRIVATE

    if (allowDMs === 'NOBODY' || allowDMs === false) {
      return { allowed: false, reason: 'This user has disabled direct messages.' };
    }

    // Check follows if privacy is set to FOLLOWERS or profile is PRIVATE
    const requiresFollow = allowDMs === 'FOLLOWERS' || profileVisibility === 'PRIVATE';
    if (requiresFollow) {
      const followRef = doc(db, 'follows', `${senderId}_${recipientId}`);
      const fSnap = await getDoc(followRef);
      if (!fSnap.exists()) {
        return { allowed: false, reason: 'You must follow this user to message them.' };
      }
    }

    return { allowed: true };
  } catch (err) {
    console.warn('Error checking messaging allowance:', err);
    return { allowed: true }; // Allow fallback if network issues
  }
}

export async function getOrCreateDirectConversation(
  currentUser: { uid: string; displayName?: string; photoURL?: string; role?: string; username?: string },
  targetUser: { uid: string; displayName?: string; photoURL?: string; role?: string; username?: string }
): Promise<DirectConversation> {
  const allowance = await verifyMessagingAllowance(currentUser.uid, targetUser.uid);
  if (!allowance.allowed) {
    throw new Error(allowance.reason || 'Messaging not allowed due to privacy settings.');
  }

  const convId = getDirectConversationId(currentUser.uid, targetUser.uid);
  const convRef = doc(db, 'direct_conversations', convId);
  const snap = await getDoc(convRef);

  const now = new Date().toISOString();

  const participantProfiles = {
    [currentUser.uid]: {
      displayName: currentUser.displayName || 'Athlete',
      photoURL: currentUser.photoURL || '',
      role: currentUser.role || 'PLAYER',
      username: currentUser.username || '',
    },
    [targetUser.uid]: {
      displayName: targetUser.displayName || 'Athlete',
      photoURL: targetUser.photoURL || '',
      role: targetUser.role || 'PLAYER',
      username: targetUser.username || '',
    },
  };

  if (snap.exists()) {
    const data = snap.data() as DirectConversation;
    // Check if conversation has expired (> 24 hours)
    if (isConversationExpired(data)) {
      console.log(`[Direct Messaging] Conversation ${convId} is older than 24 hours. Purging from Firebase and recreating.`);
      await deleteDirectConversation(convId);
      // Fall through to create brand new conversation
    } else {
      try {
        await updateDoc(convRef, {
          [`participantProfiles.${currentUser.uid}`]: participantProfiles[currentUser.uid],
          [`participantProfiles.${targetUser.uid}`]: participantProfiles[targetUser.uid],
          updatedAt: now,
        });
      } catch {
        // offline fallback
      }
      return { ...data, id: convId, participantProfiles };
    }
  }

  const isConnection = await checkIsConnectionOrFollower(currentUser.uid, targetUser.uid);
  const status = isConnection ? 'accepted' : 'pending';

  const newConv: DirectConversation = {
    id: convId,
    participants: [currentUser.uid, targetUser.uid],
    participantProfiles,
    lastMessage: 'Conversation started',
    lastMessageSenderId: currentUser.uid,
    lastMessageAt: now,
    updatedAt: now,
    status,
    requestSenderId: status === 'pending' ? currentUser.uid : undefined,
    requestRecipientId: status === 'pending' ? targetUser.uid : undefined,
    unreadCount: {
      [currentUser.uid]: 0,
      [targetUser.uid]: 0,
    },
  };

  try {
    await setDoc(convRef, sanitizeFirestoreData(newConv), { merge: true });
  } catch (err) {
    console.error('Direct conversation setDoc error:', err);
    throw err;
  }

  return newConv;
}

export async function acceptMessageRequest(conversationId: string): Promise<void> {
  const convRef = doc(db, 'direct_conversations', conversationId);
  await updateDoc(convRef, {
    status: 'accepted',
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMessageRequest(conversationId: string): Promise<void> {
  const convRef = doc(db, 'direct_conversations', conversationId);
  await deleteDoc(convRef);
}

export async function blockMessageRequest(
  conversationId: string,
  blockerId: string,
  blockedId: string
): Promise<void> {
  const blockId = `${blockerId}_${blockedId}`;
  const blockRef = doc(db, 'blocks', blockId);
  await setDoc(blockRef, {
    id: blockId,
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  });
  await deleteMessageRequest(conversationId);
}

export async function sendDirectMessage(params: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  text: string;
  messageId?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
}): Promise<string> {
  const allowance = await verifyMessagingAllowance(params.senderId, params.recipientId);
  if (!allowance.allowed) {
    throw new Error(allowance.reason || 'Messaging restricted due to privacy settings.');
  }

  const cleanText = params.text.trim();
  if (!cleanText && !params.mediaUrl) {
    throw new Error('Message text or media cannot be empty');
  }

  const messagesCol = collection(db, 'direct_conversations', params.conversationId, 'messages');
  const msgRef = params.messageId ? doc(messagesCol, params.messageId) : doc(messagesCol);
  const now = new Date().toISOString();

  const msgPayload: DirectMessage = {
    id: msgRef.id,
    conversationId: params.conversationId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderPhotoURL: params.senderPhotoURL || null,
    text: cleanText,
    createdAt: now,
    read: false,
    mediaUrl: params.mediaUrl || null,
    mediaType: params.mediaType || null,
    mediaName: params.mediaName || null,
    mediaSize: params.mediaSize || null,
  };

  await setDoc(msgRef, msgPayload);

  // Update conversation record
  try {
    const convRef = doc(db, 'direct_conversations', params.conversationId);
    const convSnap = await getDoc(convRef);
    let currentUnread = 0;
    if (convSnap.exists()) {
      const data = convSnap.data() as DirectConversation;
      currentUnread = data.unreadCount?.[params.recipientId] || 0;
    }

    const displayLastMessage = cleanText || (params.mediaType?.startsWith('image/') ? '📷 Photo' : '📁 Attachment');

    await updateDoc(convRef, {
      lastMessage: displayLastMessage,
      lastMessageSenderId: params.senderId,
      lastMessageAt: now,
      updatedAt: now,
      [`unreadCount.${params.recipientId}`]: currentUnread + 1,
      [`unreadCount.${params.senderId}`]: 0,
    });
  } catch (err) {
    console.warn('Error updating conversation metadata:', err);
  }

  return msgRef.id;
}

export function subscribeDirectMessages(
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
) {
  const messagesCol = collection(db, 'direct_conversations', conversationId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => d.data() as DirectMessage);
      // Filter out messages that have expired past 24 hours
      const activeMsgs = msgs.filter((m) => !isMessageExpired(m));
      callback(activeMsgs);
    },
    (err) => {
      console.warn('Error subscribing to direct messages:', err);
      callback([]);
    }
  );
}

export function subscribeUserConversations(
  userId: string,
  callback: (conversations: DirectConversation[]) => void
) {
  const convCol = collection(db, 'direct_conversations');
  const q = query(convCol, where('participants', 'array-contains', userId), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const convs = snap.docs.map((d) => d.data() as DirectConversation);
      const activeConvs: DirectConversation[] = [];

      convs.forEach((conv) => {
        if (isConversationExpired(conv)) {
          // Asynchronously purge expired 24h conversation from Firebase
          deleteDirectConversation(conv.id).catch((err) => {
            console.warn(`Auto-purge expired conversation ${conv.id} error:`, err);
          });
        } else {
          activeConvs.push(conv);
        }
      });

      activeConvs.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      callback(activeConvs);
    },
    (err) => {
      console.warn('Error subscribing to direct conversations:', err);
      callback([]);
    }
  );
}

export async function markMessagesInConversationAsRead(conversationId: string, currentUserId: string) {
  try {
    const messagesCol = collection(db, 'direct_conversations', conversationId, 'messages');
    const q = query(
      messagesCol,
      where('senderId', '!=', currentUserId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to mark messages as read:', err);
  }
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    const convRef = doc(db, 'direct_conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${userId}`]: 0,
    });
    await markMessagesInConversationAsRead(conversationId, userId);
  } catch (err) {
    console.warn('Failed to mark conversation as read:', err);
  }
}

export async function joinActiveChat(conversationId: string, userId: string): Promise<void> {
  if (!conversationId || !userId) return;
  try {
    const convRef = doc(db, 'direct_conversations', conversationId);
    await updateDoc(convRef, {
      activeViewers: arrayUnion(userId)
    });
  } catch (err) {
    console.warn('Failed to join active chat:', err);
  }
}

export async function leaveActiveChat(conversationId: string, userId: string): Promise<void> {
  if (!conversationId || !userId) return;
  try {
    const convRef = doc(db, 'direct_conversations', conversationId);
    await updateDoc(convRef, {
      activeViewers: arrayRemove(userId)
    });
  } catch (err) {
    console.warn('Failed to leave active chat:', err);
  }
}
