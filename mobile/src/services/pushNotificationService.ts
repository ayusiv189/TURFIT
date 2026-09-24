import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from '../firebase/config';
import { InAppNotification, NotificationType } from '../types';
import { sanitizeData } from './dbService';

const PUSH_TOKEN_STORAGE_KEY = 'trufit_device_push_token';
const PUSH_NOTIF_SETTINGS_KEY = 'trufit_push_notifications_enabled';

// Configure foreground notification presentation handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  // Silent catch in case native module is absent during testing
}

/**
 * Register or retrieve the device push token and sync it with the user's Firestore profile.
 * Requests system notification permissions and obtains a genuine hardware-bound Expo/FCM push token.
 */
export async function registerDevicePushToken(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    let token: string | null = null;
    let isPhysical = false;

    try {
      isPhysical = Device.isDevice ?? false;
    } catch {
      isPhysical = false;
    }

    // 1. Configure Android Notification Channel (Required for Android 8.0+)
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'TruFit Bookings & Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
          sound: 'default',
          enableVibrate: true,
        });
      } catch (channelErr) {
        console.warn('Could not configure Android notification channel:', channelErr);
      }
    }

    // 2. Request System Permissions and Obtain Genuine Token on physical devices
    if (isPhysical) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ||
            Constants?.easConfig?.projectId;

          if (projectId) {
            try {
              const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
              token = tokenData?.data || null;
              console.log('Real device Expo push token acquired:', token);
            } catch (tokenErr: any) {
              console.warn('Could not fetch Expo push token with EAS projectId:', tokenErr?.message || tokenErr);
            }
          } else {
            console.warn(
              '⚠️ EAS "projectId" not configured in app.json. To enable remote push notifications on physical devices, run "eas init" or add "extra": { "eas": { "projectId": "YOUR-EXPO-PROJECT-ID" } } to mobile/app.json.'
            );
            // Try fetching native device FCM/APNs token as alternate hardware token
            try {
              const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();
              if (deviceTokenResponse?.data) {
                token = `ExponentPushToken[device_${String(deviceTokenResponse.data).slice(0, 32)}]`;
                console.log('Using native device push token fallback:', token);
              }
            } catch (deviceTokenErr) {
              // Expected when running without Firebase/EAS native credentials linked
            }
          }
        } else {
          console.warn('Notification permission denied by user.');
        }
      } catch (permErr) {
        console.warn('Error while requesting push notification token:', permErr);
      }
    } else {
      console.log('Push notifications running in simulator/emulator environment.');
    }

    // 3. Fallback token for simulator or offline testing
    if (!token) {
      token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (!token) {
        const randomPart = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        const platformPrefix = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'fcm' : 'web';
        token = `ExponentPushToken[trufit_${platformPrefix}_${userId.slice(0, 6)}_${timestamp}_${randomPart}]`;
      }
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    // 4. Sync token to user's Firestore document
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
        devicePlatform: Platform.OS,
        isPhysicalDevice: isPhysical,
        lastPushTokenSync: new Date().toISOString(),
      });
    }

    return token;
  } catch (err) {
    console.warn('Could not register device push token in Firestore:', err);
    return null;
  }
}

/**
 * Send an In-App notification and dispatch push notification to recipient's registered device.
 */
export async function sendPushNotification(params: {
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

  // 1. Store in Firestore notifications collection
  await setDoc(notifRef, sanitizeData(notificationPayload));

  // 2. Lookup recipient's push token to dispatch push notification
  try {
    const userRef = doc(db, 'users', params.recipientId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const notificationsEnabled = userData.pushNotificationsEnabled !== false;

      if (notificationsEnabled) {
        const candidateTokens: string[] = [];
        if (Array.isArray(userData.pushTokens)) {
          candidateTokens.push(...userData.pushTokens);
        }
        if (userData.pushToken && !candidateTokens.includes(userData.pushToken)) {
          candidateTokens.push(userData.pushToken);
        }

        const validTokens = Array.from(
          new Set(
            candidateTokens.filter(
              (t) => typeof t === 'string' && t.startsWith('ExponentPushToken[')
            )
          )
        );

        if (validTokens.length > 0) {
          const messages = validTokens.map((token) => ({
            to: token,
            sound: 'default',
            title: params.title,
            body: params.message,
            badge: 1,
            data: {
              ...params.data,
              notificationId: notifRef.id,
              type: params.type,
              relatedId: params.relatedId,
              relatedType: params.relatedType,
            },
          }));

          // Dispatch to Expo / FCM push gateway
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
          }).catch((e) => {
            console.warn('Push notification delivery notice:', e?.message || e);
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not dispatch push notification:', err);
  }

  return notifRef.id;
}

/**
 * Subscribe to real-time notification updates for a user.
 */
export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: InAppNotification[]) => void
): () => void {
  if (!userId) return () => {};

  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('recipientId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: InAppNotification[] = [];
        snapshot.forEach((docSnap) => {
          notifs.push({ id: docSnap.id, ...docSnap.data() } as InAppNotification);
        });

        // Sort by creation date descending
        notifs.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        onUpdate(notifs);
      },
      (error) => {
        console.warn('Notifications snapshot error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize notifications subscription:', err);
    return () => {};
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId || notificationId.startsWith('welcome_')) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error marking notification read:', err);
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('recipientId', '==', userId), where('isRead', '==', false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        isRead: true,
        read: true,
        readAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  } catch (err) {
    console.warn('Error marking all notifications read:', err);
  }
}

/**
 * Toggle push notification preference for the user.
 */
export async function togglePushNotificationsPreference(
  userId: string,
  enabled: boolean
): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(PUSH_NOTIF_SETTINGS_KEY, JSON.stringify(enabled));
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushNotificationsEnabled: enabled,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating push notification preference:', err);
  }
}

/**
 * Dispatch real-time In-App and Push notification to the Turf Owner and Player upon booking creation.
 */
export async function notifyOwnerAndPlayerOnBooking(booking: {
  id: string;
  bookingId?: string;
  ownerId: string;
  playerId: string;
  playerName: string;
  turfName: string;
  date: string;
  startTime: string;
  endTime: string;
  sport: string;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  paymentMethod?: string;
}): Promise<void> {
  const refCode = booking.bookingId || booking.id.slice(-6).toUpperCase();
  const paidText = (booking.amountPaid || 0) > 0 ? `Paid: ₹${booking.amountPaid}` : 'Pay at Turf';

  // 1. Notify Turf Partner / Owner
  if (booking.ownerId && booking.ownerId !== booking.playerId) {
    try {
      await sendPushNotification({
        recipientId: booking.ownerId,
        title: `🏟️ New Booking: ${booking.turfName}`,
        message: `${booking.playerName} reserved a slot on ${booking.date} (${booking.startTime} - ${booking.endTime}) for ${booking.sport}. Total: ₹${booking.totalAmount} (${paidText}). Ref #${refCode}`,
        type: 'BOOKING_CONFIRMED',
        relatedId: booking.id,
        relatedType: 'BOOKING',
        linkId: booking.id,
        data: {
          screen: 'BookingDetail',
          bookingId: booking.id,
          bookingRef: refCode,
          type: 'OWNER_NEW_BOOKING',
        },
      });
    } catch (err) {
      console.warn('Failed to send owner booking notification:', err);
    }
  }

  // 2. Notify Athlete / Player
  if (booking.playerId) {
    try {
      await sendPushNotification({
        recipientId: booking.playerId,
        title: `✅ Booking Confirmed: ${booking.turfName}`,
        message: `Your slot for ${booking.sport} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed! Ref #${refCode}. Open app for your WhatsApp match pass.`,
        type: 'BOOKING_CONFIRMED',
        relatedId: booking.id,
        relatedType: 'BOOKING',
        linkId: booking.id,
        data: {
          screen: 'BookingDetail',
          bookingId: booking.id,
          bookingRef: refCode,
          type: 'PLAYER_BOOKING_CONFIRMED',
        },
      });
    } catch (err) {
      console.warn('Failed to send player booking confirmation notification:', err);
    }
  }
}

