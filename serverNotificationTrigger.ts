import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collectionGroup,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  collection,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export function startServerNotificationTrigger() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Server Trigger] firebase-applet-config.json not found. Trigger disabled.');
      return;
    }

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = initializeApp(firebaseConfig, 'ServerNotificationTrigger');
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const serverStartTime = new Date().toISOString();
    console.log(`[Server Trigger] Initialized Firebase and started monitoring messages from ${serverStartTime}`);

    // Standard client SDK collection group query works perfectly in Node.js
    const messagesQuery = collectionGroup(db, 'messages');

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== 'added') return;

          const msgData = change.doc.data();
          if (!msgData || !msgData.createdAt || msgData.createdAt < serverStartTime) {
            // Skip old / historical messages loaded on initial listen
            return;
          }

          console.log(`[Server Trigger] New message detected: ${change.doc.id} in conversation ${msgData.conversationId}`);

          const { conversationId, senderId, senderName, text } = msgData;
          if (!conversationId || !senderId) return;

          try {
            // 1. Fetch conversation document
            const convRef = doc(db, 'direct_conversations', conversationId);
            const convSnap = await getDoc(convRef);
            if (!convSnap.exists()) {
              console.log(`[Server Trigger] Conversation ${conversationId} does not exist.`);
              return;
            }

            const convData = convSnap.data();
            const participants: string[] = convData.participants || [];
            const recipientId = participants.find((p) => p !== senderId);

            if (!recipientId) {
              console.log(`[Server Trigger] No recipient found in conversation ${conversationId}.`);
              return;
            }

            // 2. Check Active Viewers (prevent duplicate notification if recipient is actively looking at the chat)
            const activeViewers: string[] = convData.activeViewers || [];
            if (activeViewers.includes(recipientId)) {
              console.log(`[Server Trigger] Recipient ${recipientId} is actively viewing the conversation. Skipping notification.`);
              return;
            }

            // 3. Respect Blocked Users (check if either party has blocked the other)
            const blockId1 = `${recipientId}_${senderId}`;
            const blockId2 = `${senderId}_${recipientId}`;
            const [blockSnap1, blockSnap2] = await Promise.all([
              getDoc(doc(db, 'blocks', blockId1)),
              getDoc(doc(db, 'blocks', blockId2)),
            ]);

            if (blockSnap1.exists() || blockSnap2.exists()) {
              console.log(`[Server Trigger] Message is blocked between ${senderId} and ${recipientId}. Skipping notification.`);
              return;
            }

            // 4. Respect Notification & Privacy Settings of recipient
            const recipientRef = doc(db, 'users', recipientId);
            const recipientSnap = await getDoc(recipientRef);
            if (!recipientSnap.exists()) {
              console.log(`[Server Trigger] Recipient profile ${recipientId} does not exist.`);
              return;
            }

            const recipientData = recipientSnap.data();

            // Privacy: allowDirectMessages check
            const privacy = recipientData.privacySettings;
            if (privacy && privacy.allowDirectMessages === false) {
              console.log(`[Server Trigger] Recipient ${recipientId} has allowDirectMessages set to false. Skipping notification.`);
              return;
            }

            // Notifications toggles: pushNotificationsEnabled check
            const isPushEnabled = recipientData.pushNotificationsEnabled !== false;
            if (!isPushEnabled) {
              console.log(`[Server Trigger] Recipient ${recipientId} has pushNotificationsEnabled set to false. Skipping notification.`);
              return;
            }

            // 5. Store an in-app notification in Firestore (so recipient gets alerted inside the app too)
            const notifRef = doc(collection(db, 'notifications'));
            const notifId = notifRef.id;
            const notificationPayload = {
              id: notifId,
              recipientId,
              senderId,
              senderName,
              title: `${senderName}`,
              message: text || 'Sent you a message',
              type: 'DIRECT_MESSAGE',
              relatedId: conversationId,
              isRead: false,
              read: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(notifRef, notificationPayload);
            console.log(`[Server Trigger] Created In-App Notification document ${notifId} for ${recipientId}`);

            // 6. Dispatch push notification to Expo if push token is registered
            const pushToken = recipientData.pushToken;
            if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
              console.log(`[Server Trigger] Dispatching Expo push notification to token ${pushToken}`);
              fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Accept-encoding': 'gzip, deflate',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: pushToken,
                  sound: 'default',
                  title: senderName,
                  body: text || 'Sent you a message',
                  badge: 1,
                  data: {
                    type: 'DIRECT_MESSAGE',
                    conversationId,
                    senderId,
                  },
                }),
              })
                .then((res) => {
                  if (!res.ok) {
                    console.warn(`[Server Trigger] Expo push dispatch responded with status: ${res.status}`);
                  } else {
                    console.log(`[Server Trigger] Push notification successfully dispatched to Expo for recipient ${recipientId}`);
                  }
                })
                .catch((err) => {
                  console.error(`[Server Trigger] Error calling Expo Push API:`, err);
                });
            } else {
              console.log(`[Server Trigger] Recipient ${recipientId} does not have a registered push token. In-app only.`);
            }
          } catch (err) {
            console.error(`[Server Trigger] Error processing message ${change.doc.id}:`, err);
          }
        });
      },
      (error) => {
        console.error('[Server Trigger] Firestore snapshot subscription error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('[Server Trigger] Failed to initialize server notifications trigger:', err);
  }
}
