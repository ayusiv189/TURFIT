import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut as fbSignOut,
  sendEmailVerification as fbSendEmailVerification,
  reload,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  emailVerified: boolean;
  refreshUser: () => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  emailVerified: false,
  refreshUser: async () => {},
  resendVerification: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // Sync verified status if changed in Auth
        if (data.emailVerified !== firebaseUser.emailVerified) {
          await updateDoc(userDocRef, {
            emailVerified: firebaseUser.emailVerified,
            updatedAt: new Date().toISOString(),
          });
          data.emailVerified = firebaseUser.emailVerified;
        }
        setProfile(data);
      } else {
        // Fallback profile if created via auth but doc creation was pending
        const role = (localStorage.getItem('pending_role') as UserRole) || 'PLAYER';
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: role,
          emailVerified: firebaseUser.emailVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile from Firestore:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
      await reload(auth.currentUser);
      const updated = auth.currentUser;
      setUser(updated);
      if (updated) {
        await fetchProfile(updated);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await fbSendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, payload);
    setProfile((prev) => (prev ? { ...prev, ...payload } : null));
  };

  const emailVerified = !!(user && (user.emailVerified || profile?.emailVerified));
  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        emailVerified,
        refreshUser,
        resendVerification,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
