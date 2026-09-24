import { initializeApp, getApps, getApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reuses the identical Firebase configuration as the TurFit web application
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBD6sRLGsIZN1l0MEtNtXFbOyB1PGmeM1g",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "trufit-903e2.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "trufit-903e2",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "trufit-903e2.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "225029913892",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:225029913892:web:7ab05a7abe2c95e09187b1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence for React Native
let auth: any;
try {
  const getReactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
  if (typeof getReactNativePersistence === 'function') {
    auth = firebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    auth = firebaseAuth.getAuth(app);
  }
} catch {
  // If already initialized or fallback
  auth = firebaseAuth.getAuth(app);
}

// Bind directly to the custom Firestore database ID
const databaseId = process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_DB_ID || "ai-studio-trufit-f5d35c80-343e-443c-b4d3-2f7e90646f3b";
let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    databaseId
  );
} catch {
  firestoreInstance = getFirestore(app, databaseId);
}

export const db = firestoreInstance;
export const storage = getStorage(app);
export { auth, app };
