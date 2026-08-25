import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { sanitizeData } from '../services/dbService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  emailVerified: boolean;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  emailVerified: false,
  logout: async () => {},
  updateUserProfile: async () => {},
  updateProfileData: async () => {},
  switchRole: async () => {},
  reloadUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (fbUser: User) => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (data.emailVerified !== fbUser.emailVerified) {
          try {
            await updateDoc(userDocRef, {
              emailVerified: fbUser.emailVerified,
              updatedAt: new Date().toISOString(),
            });
          } catch {}
          data.emailVerified = fbUser.emailVerified;
        }
        setProfile(data);
      } else {
        const newProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Athlete',
          role: 'PLAYER',
          emailVerified: fbUser.emailVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, sanitizeData(newProfile), { merge: true });
        setProfile(newProfile);
      }
    } catch (err: any) {
      console.warn('Could not fetch Firestore profile, creating local session:', err?.message || err);
      const fallback: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Athlete',
        role: 'PLAYER',
        emailVerified: fbUser.emailVerified,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(fallback);
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

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      await fetchProfile(auth.currentUser);
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
    const payload = sanitizeData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    try {
      await updateDoc(docRef, payload);
    } catch (err) {
      console.warn('Could not update profile remotely:', err);
    }
    setProfile((prev) => (prev ? { ...prev, ...payload } : null));
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    await updateUserProfile({ role: newRole });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role: profile?.role || 'PLAYER',
        emailVerified: true,
        logout,
        updateUserProfile,
        updateProfileData: updateUserProfile,
        switchRole,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
