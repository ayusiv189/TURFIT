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
import { sanitizeFirestoreData } from '../lib/utils';
import { isUserAdmin } from '../lib/authUtils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  activeRole: 'ADMIN' | 'OWNER' | 'PLAYER';
  setActiveRole: (role: 'ADMIN' | 'OWNER' | 'PLAYER') => void;
  switchRole: (newRole: UserRole) => Promise<void>;
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
  isAdmin: false,
  activeRole: 'PLAYER',
  setActiveRole: () => {},
  switchRole: async () => {},
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
  const [activeRole, setActiveRoleState] = useState<'ADMIN' | 'OWNER' | 'PLAYER'>('PLAYER');

  const fetchProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const isAdminUser = isUserAdmin(firebaseUser, null);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        // If user is whitelisted admin but role in DB wasn't updated yet, keep them ADMIN
        if (isAdminUser && data.role !== 'ADMIN') {
          data.role = 'ADMIN';
        }

        // Sync verified status if changed in Auth
        if (data.emailVerified !== firebaseUser.emailVerified) {
          try {
            await updateDoc(userDocRef, {
              emailVerified: firebaseUser.emailVerified,
              updatedAt: new Date().toISOString(),
            });
          } catch {
            // Ignore minor sync update error if offline
          }
          data.emailVerified = firebaseUser.emailVerified;
        }
        setProfile(data);

        // Set default active role
        if (isAdminUser || data.role === 'ADMIN') {
          const savedActive = localStorage.getItem('trufit_admin_active_role') as 'ADMIN' | 'OWNER' | 'PLAYER';
          setActiveRoleState(savedActive || 'ADMIN');
        } else {
          setActiveRoleState(data.role === 'OWNER' ? 'OWNER' : 'PLAYER');
        }
      } else {
        // Fallback profile if created via auth but doc creation was pending
        const initialRole: UserRole = isAdminUser
          ? 'ADMIN'
          : ((localStorage.getItem('pending_role') as UserRole) || 'PLAYER');

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (isAdminUser ? 'Super Admin' : 'User'),
          role: initialRole,
          emailVerified: firebaseUser.emailVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(userDocRef, sanitizeFirestoreData(newProfile), { merge: true });
        } catch (setErr) {
          console.warn('Could not persist new user profile to Firestore:', setErr);
        }
        setProfile(newProfile);
        setActiveRoleState(isAdminUser ? 'ADMIN' : (initialRole === 'OWNER' ? 'OWNER' : 'PLAYER'));
      }
    } catch (err: any) {
      console.warn('Could not fetch user profile from Firestore (using session profile):', err?.message || err);
      const isAdminUser = isUserAdmin(firebaseUser, null);
      const role: UserRole = isAdminUser
        ? 'ADMIN'
        : ((localStorage.getItem('pending_role') as UserRole) || 'PLAYER');
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (isAdminUser ? 'Super Admin' : 'User'),
        role: role,
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile((prev) => prev || fallbackProfile);
      setActiveRoleState(isAdminUser ? 'ADMIN' : (role === 'OWNER' ? 'OWNER' : 'PLAYER'));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setActiveRoleState('PLAYER');
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
    setActiveRoleState('PLAYER');
    localStorage.removeItem('trufit_admin_active_role');
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const payload = sanitizeFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    try {
      await updateDoc(docRef, payload);
    } catch (err) {
      console.warn('Could not update profile on server:', err);
    }
    setProfile((prev) => (prev ? { ...prev, ...payload } : null));
  };

  const isAdmin = isUserAdmin(user, profile);

  const setActiveRole = (newActiveRole: 'ADMIN' | 'OWNER' | 'PLAYER') => {
    if (!isAdmin && newActiveRole === 'ADMIN') {
      console.warn('Unauthorized role switch attempt to ADMIN blocked.');
      return;
    }
    setActiveRoleState(newActiveRole);
    if (isAdmin) {
      localStorage.setItem('trufit_admin_active_role', newActiveRole);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    if (newRole === 'ADMIN' && !isAdmin) {
      console.warn('Cannot switch profile role to ADMIN without authorization');
      return;
    }
    await updateUserProfile({ role: newRole });
    setActiveRole(newRole as 'ADMIN' | 'OWNER' | 'PLAYER');
  };

  const emailVerified = !!(user && (user.emailVerified || profile?.emailVerified));
  const role = profile?.role || (isAdmin ? 'ADMIN' : 'PLAYER');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        isAdmin,
        activeRole,
        setActiveRole,
        switchRole,
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
