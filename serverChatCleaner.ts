import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const CONVERSATION_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function cleanupExpiredConversations(): Promise<{
  deletedConversationsCount: number;
  deletedMessagesCount: number;
}> {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Chat Cleaner] firebase-applet-config.json not found. Cleaner skipped.');
      return { deletedConversationsCount: 0, deletedMessagesCount: 0 };
    }

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length > 0 
      ? getApp('ServerNotificationTrigger') || getApp() 
      : initializeApp(firebaseConfig, 'ServerChatCleaner');
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const now = Date.now();
    const convsCol = collection(db, 'direct_conversations');
    const convsSnap = await getDocs(convsCol);

    let deletedConversationsCount = 0;
    let deletedMessagesCount = 0;

    for (const convDoc of convsSnap.docs) {
      const data = convDoc.data();
      const timeStr = data.lastMessageAt || data.updatedAt || data.createdAt;
      const convTime = timeStr ? new Date(timeStr).getTime() : 0;
      const isExpired = convTime > 0 && (now - convTime > CONVERSATION_EXPIRATION_MS);

      if (isExpired) {
        console.log(`[Chat Cleaner] Purging expired 24h conversation: ${convDoc.id}`);
        // 1. Delete all subcollection messages
        const msgsCol = collection(db, 'direct_conversations', convDoc.id, 'messages');
        const msgsSnap = await getDocs(msgsCol);
        if (!msgsSnap.empty) {
          const batch = writeBatch(db);
          msgsSnap.docs.forEach((mDoc) => {
            batch.delete(mDoc.ref);
            deletedMessagesCount++;
          });
          await batch.commit();
        }
        // 2. Delete conversation document
        await deleteDoc(convDoc.ref);
        deletedConversationsCount++;
      } else {
        // Conversation is still active, but clean up any individual messages older than 24h
        const msgsCol = collection(db, 'direct_conversations', convDoc.id, 'messages');
        const msgsSnap = await getDocs(msgsCol);
        if (!msgsSnap.empty) {
          const expiredMsgs = msgsSnap.docs.filter((mDoc) => {
            const mData = mDoc.data();
            const mTime = mData.createdAt ? new Date(mData.createdAt).getTime() : 0;
            return mTime > 0 && (now - mTime > CONVERSATION_EXPIRATION_MS);
          });
          if (expiredMsgs.length > 0) {
            const batch = writeBatch(db);
            expiredMsgs.forEach((mDoc) => {
              batch.delete(mDoc.ref);
              deletedMessagesCount++;
            });
            await batch.commit();
            console.log(`[Chat Cleaner] Purged ${expiredMsgs.length} expired messages from conversation ${convDoc.id}`);
          }
        }
      }
    }

    if (deletedConversationsCount > 0 || deletedMessagesCount > 0) {
      console.log(
        `[Chat Cleaner] Sweep complete: deleted ${deletedConversationsCount} expired conversations and ${deletedMessagesCount} expired messages.`
      );
    }

    return { deletedConversationsCount, deletedMessagesCount };
  } catch (err) {
    console.error('[Chat Cleaner] Error during expired conversation cleanup:', err);
    return { deletedConversationsCount: 0, deletedMessagesCount: 0 };
  }
}

export function startServerChatCleanupCron(intervalMs = 5 * 60 * 1000) {
  // Run immediately on boot
  cleanupExpiredConversations().catch((err) => {
    console.error('[Chat Cleaner] Initial cleanup error:', err);
  });

  // Run periodically (every 5 minutes)
  const timer = setInterval(() => {
    cleanupExpiredConversations().catch((err) => {
      console.error('[Chat Cleaner] Periodic cleanup error:', err);
    });
  }, intervalMs);

  return () => clearInterval(timer);
}
