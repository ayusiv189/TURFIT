import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { InAppNotification, NotificationType } from '../types';

const PUSH_TOKEN_STORAGE_KEY = 'trufit_web_push_token';
const PUSH_PERM_STORAGE_KEY = 'trufit_web_push_permission';

/**
 * Clean data to remove undefined values before Firestore writes
 */
function sanitizeData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
}

/**
 * Register web notification client token and request browser notification permissions
 */
export async function registerWebPushToken(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    let token = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!token) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timestamp = Date.now().toString(36);
      token = `WebPushToken[trufit_web_${userId.slice(0, 6)}_${timestamp}_${randomPart}]`;
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    }

    // Request native browser notification permission if supported
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          localStorage.setItem(PUSH_PERM_STORAGE_KEY, perm);
        } catch {
          // Silent catch
        }
      }
    }

    // Sync token to user's Firestore document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const existingTokens: string[] = Array.isArray(data.pushTokens) ? data.pushTokens : [];
      const updatedTokens = Array.from(new Set([...existingTokens, token]));

      await updateDoc(userRef, {
        pushToken: token,
        pushTokens: updatedTokens,
        pushNotificationsEnabled: true,
        devicePlatform: 'web',
        lastPushTokenSync: new Date().toISOString(),
      });
    }

    return token;
  } catch (err) {
    console.warn('Could not register web push token in Firestore:', err);
    return null;
  }
}

/**
 * Send an In-App notification and trigger browser notification if allowed
 */
export async function sendInAppNotification(params: {
  recipientId: string;
  title: string;
  message: string;
  type?: NotificationType;
  relatedId?: string;
  relatedType?: 'LOBBY' | 'TEAM' | 'MATCH' | 'BOOKING' | 'OFFER' | 'REWARD' | 'TURF';
  linkId?: string;
  senderId?: string;
  senderName?: string;
  data?: Record<string, any>;
}): Promise<string> {
  const notifRef = doc(collection(db, 'notifications'));
  const now = new Date().toISOString();

  const notificationPayload: InAppNotification = {
    id: notifRef.id,
    recipientId: params.recipientId,
    title: params.title,
    message: params.message,
    type: params.type || 'GENERAL',
    relatedId: params.relatedId,
    relatedType: params.relatedType,
    linkId: params.linkId,
    senderId: params.senderId,
    senderName: params.senderName,
    isRead: false,
    read: false,
    createdAt: now,
  };

  // 1. Store in Firestore
  await setDoc(notifRef, sanitizeData(notificationPayload));

  // 2. Trigger native browser notification if in foreground and permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(params.title, {
        body: params.message,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
      });
    } catch {
      // Silent catch
    }
  }

  return notifRef.id;
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: InAppNotification[]) => void
): () => void {
  if (!userId) return () => {};

  const notifsQuery = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    notifsQuery,
    (snapshot) => {
      const notifs: InAppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notifs.push({
          id: docSnap.id,
          recipientId: data.recipientId,
          title: data.title || 'Notification',
          message: data.message || '',
          type: data.type || 'GENERAL',
          relatedId: data.relatedId,
          relatedType: data.relatedType,
          linkId: data.linkId,
          senderId: data.senderId,
          senderName: data.senderName,
          isRead: data.isRead ?? data.read ?? false,
          read: data.read ?? data.isRead ?? false,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(notifs);
    },
    (err) => {
      console.warn('Real-time notifications snapshot listener error:', err);
    }
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      isRead: true,
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error marking notification as read:', err);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        isRead: true,
        read: true,
        readAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  } catch (err) {
    console.warn('Error marking all notifications as read:', err);
  }
}
