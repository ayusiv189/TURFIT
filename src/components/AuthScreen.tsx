import React, { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile } from '../types';
import { sanitizeFirestoreData } from '../lib/utils';
import { ADMIN_EMAILS, isUserAdmin } from '../lib/authUtils';
import { getAppConfig, updateAppConfig } from '../lib/db';
import {
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  RefreshCw,
  LogOut,
  AlertCircle,
  Building,
  CheckCircle2,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface AuthModalProps {
  initialRole?: UserRole;
  onBackToLanding?: () => void;
}

export const AuthScreen: React.FC<AuthModalProps> = ({ initialRole = 'PLAYER', onBackToLanding }) => {
  const { user, profile, emailVerified, refreshUser, resendVerification, logout } = useAuth();

  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [city, setCity] = useState<string>('Mumbai');
  const [preferredSport, setPreferredSport] = useState<string>('Football');
  const [businessName, setBusinessName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resetSent, setResetSent] = useState<boolean>(false);

  // Admin-controlled player login visibility on website
  const [allowPlayerLoginOnWebsite, setAllowPlayerLoginOnWebsite] = useState<boolean>(false);
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const [togglingLogin, setTogglingLogin] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getAppConfig()
      .then((cfg) => {
        if (isMounted) {
          const allowed = !!cfg.allowPlayerLoginOnWebsite;
          setAllowPlayerLoginOnWebsite(allowed);
          if (!allowed && role === 'PLAYER') {
            setRole('OWNER');
          }
          setConfigLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('Config fetch note on AuthScreen:', err);
        if (isMounted) setConfigLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAdminTogglePlayerLogin = async () => {
    setTogglingLogin(true);
    const nextVal = !allowPlayerLoginOnWebsite;
    try {
      await updateAppConfig({ allowPlayerLoginOnWebsite: nextVal });
      setAllowPlayerLoginOnWebsite(nextVal);
      if (!nextVal && role === 'PLAYER') {
        setRole('OWNER');
      }
      setInfoMsg(
        nextVal
          ? 'Player Login is now enabled on the website.'
          : 'Player Login is now hidden on the website (Mobile App only).'
      );
    } catch (err: any) {
      console.error('Failed to toggle player login:', err);
      setErrorMsg('Failed to toggle player login setting.');
    } finally {
      setTogglingLogin(false);
    }
  };

  // If user is logged in but unverified, render the mandatory verification screen
  if (user && !emailVerified) {
    return (
      <div id="email-verification-screen" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Mail className="w-8 h-8 animate-bounce" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
          <p className="text-slate-300 text-sm text-center mb-6">
            Please verify your email before continuing to TurFit. We sent a verification link to:
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center mb-6">
            <span className="font-mono text-indigo-400 font-semibold text-sm break-all">
              {user.email}
            </span>
          </div>

          {infoMsg && (
            <div className="bg-indigo-950/60 border border-indigo-500/50 text-indigo-200 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              id="refresh-verification-btn"
              onClick={async () => {
                setRefreshing(true);
                setErrorMsg(null);
                try {
                  await refreshUser();
                  setInfoMsg('Refreshed auth state. If verified, access will be granted.');
                } catch (err: any) {
                  setErrorMsg(err.message || 'Failed to refresh status.');
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-indigo-950/50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking status...' : 'Refresh Verification Status'}</span>
            </button>

            <button
              id="resend-verification-btn"
              onClick={async () => {
                setResending(true);
                setErrorMsg(null);
                try {
                  await resendVerification();
                  setInfoMsg('New verification email sent! Please check your inbox & spam folder.');
                } catch (err: any) {
                  setErrorMsg(err.message || 'Failed to resend verification.');
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm border border-slate-700"
            >
              <Mail className="w-4 h-4" />
              <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>

            <button
              id="verification-logout-btn"
              onClick={logout}
              className="w-full text-slate-400 hover:text-slate-200 text-xs py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out or Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setGoogleLoading(true);

    try {
      localStorage.setItem('pending_role', role);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const userIsAdmin = isUserAdmin(fbUser, null);

      // Safely ensure user doc exists in Firestore with chosen role
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          const finalRole: UserRole = userIsAdmin ? 'ADMIN' : role;
          const profilePayload: Record<string, any> = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || (userIsAdmin ? 'Super Admin' : 'User'),
            role: finalRole,
            emailVerified: true,
            photoURL: fbUser.photoURL || '',
            city: city.trim() || 'Mumbai',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          if (finalRole === 'PLAYER' && preferredSport) {
            profilePayload.preferredSport = preferredSport;
            profilePayload.isOwnerRegistered = false;
          }
          if (finalRole === 'OWNER' || userIsAdmin) {
            profilePayload.isOwnerRegistered = true;
            if (finalRole === 'OWNER') {
              profilePayload.businessName = businessName.trim() || `${fbUser.displayName || 'Owner'}'s Turf`;
            }
          }
          await setDoc(userDocRef, sanitizeFirestoreData(profilePayload), { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Firestore profile sync note (session active):', firestoreErr);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in popup closed. Please try again.');
      } else {
        console.error('Google Auth error:', err);
        setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCred.user;
        const userIsAdmin = isUserAdmin(fbUser, null);
        const finalRole: UserRole = userIsAdmin ? 'ADMIN' : role;

        try {
          await sendEmailVerification(fbUser);
        } catch (vErr) {
          console.warn('Verification email note:', vErr);
        }

        const userDocRef = doc(db, 'users', fbUser.uid);
        const profilePayload: Record<string, any> = {
          uid: fbUser.uid,
          email: cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0] || 'Athlete',
          role: finalRole,
          photoURL: '',
          city: city.trim() || 'Mumbai',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (finalRole === 'PLAYER') {
          profilePayload.preferredSport = preferredSport || 'Football';
          profilePayload.isOwnerRegistered = false;
        }
        if (finalRole === 'OWNER' || userIsAdmin) {
          profilePayload.isOwnerRegistered = true;
          if (finalRole === 'OWNER') {
            profilePayload.businessName = businessName.trim() || `${displayName.trim() || 'Owner'}'s Turf`;
          }
        }

        await setDoc(userDocRef, sanitizeFirestoreData(profilePayload), { merge: true });
        setInfoMsg('Account created! Verification link sent to your email.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Email & Password authentication is disabled in Firebase. Please click "Continue with Google" above.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = isLogin
          ? 'Invalid email or password. If you don\'t have an account yet, click "Create Account" below or use "Continue with Google".'
          : 'Invalid authentication credentials. Please try again or use Google sign-in.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Switch to "Sign In" or reset your password.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please provide a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address to reset password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setInfoMsg('Password reset link sent to your email.');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Email auth is disabled in this project. Please use "Continue with Google".');
      } else {
        setErrorMsg(err.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background subtle glow */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {onBackToLanding && (
          <div className="mb-4">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Back to TruFit Website</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 shadow-indigo-600/30 text-white font-black text-2xl italic shadow-lg mb-3">
            TF
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center">
            TURFIT{' '}
            <span className="text-indigo-500 font-medium text-sm ml-2 tracking-widest uppercase">
              Portal
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real Sports Turf Discovery & Slot Booking
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Standard Role selector for session setup with Admin Show/Hide Toggle */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Account Type:
              </label>

              {/* Admin Hide/Show Toggle Button */}
              <button
                type="button"
                id="admin-toggle-player-web-btn"
                onClick={handleAdminTogglePlayerLogin}
                disabled={togglingLogin}
                title="Admin control to toggle player login availability on the website"
                className="text-[10px] font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 transition-colors cursor-pointer"
              >
                {togglingLogin ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                ) : allowPlayerLoginOnWebsite ? (
                  <>
                    <EyeOff className="w-3 h-3 text-amber-400" />
                    <span>Admin: Hide Player Login</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>Admin: Show Player Login</span>
                  </>
                )}
              </button>
            </div>

            {allowPlayerLoginOnWebsite ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="role-player-select"
                  onClick={() => setRole('PLAYER')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    role === 'PLAYER'
                      ? 'border-indigo-500 bg-indigo-950/50 text-indigo-400 font-bold ring-1 ring-indigo-500/50 shadow-md shadow-indigo-950/30'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-xs font-bold">Player / Athlete</span>
                </button>

                <button
                  type="button"
                  id="role-owner-select"
                  onClick={() => setRole('OWNER')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    role === 'OWNER'
                      ? 'border-indigo-500 bg-indigo-950/50 text-indigo-400 font-bold ring-1 ring-indigo-500/50 shadow-md shadow-indigo-950/30'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Building className="w-5 h-5" />
                  <span className="text-xs font-bold">Turf Owner / Admin</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  id="role-owner-select"
                  onClick={() => setRole('OWNER')}
                  className="w-full p-3 rounded-xl border border-indigo-500 bg-indigo-950/50 text-indigo-400 font-bold ring-1 ring-indigo-500/50 shadow-md shadow-indigo-950/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Building className="w-5 h-5" />
                  <span className="text-xs font-bold">Turf Owner & Admin Portal</span>
                </button>

                {/* Notice directing players to mobile APK */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex items-start gap-2.5 text-slate-400">
                  <Smartphone className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="text-slate-200 font-semibold">Players & Athletes: </span>
                    Player login is optimized for the <span className="text-emerald-400 font-bold">TruFit Mobile App</span>. Use the mobile app to book slots and play matches.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Recommended: Google Sign-In */}
          <div className="mb-6">
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg shadow-slate-950/50 hover:shadow-indigo-500/10 disabled:opacity-50"
            >
              {googleLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-indigo-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instant 1-Click login • Verified Firebase Session</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Or with email
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {errorMsg && (
            <div className="bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl mb-4 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="bg-indigo-950/70 border border-indigo-500/50 text-indigo-200 text-xs p-3 rounded-xl mb-4 flex items-start gap-2.5 leading-relaxed">
              <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Sign In / Create Account Mode Toggle */}
          <div className="flex border-b border-slate-800 mb-5">
            <button
              type="button"
              id="mode-signin-btn"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                isLogin
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="mode-signup-btn"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                !isLogin
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {role === 'OWNER' ? 'Business / Venue Owner Name' : 'Full Name / Display Name'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-displayname"
                    type="text"
                    required={!isLogin}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={role === 'OWNER' ? 'e.g. Rahul Sharma (Venue Admin)' : 'e.g. Alex Morgan'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {!isLogin && role === 'OWNER' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turf / Business Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-businessname"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. KickOff Arena Bandra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-confirmpassword"
                    type="password"
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 mt-6 text-sm"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In with Email' : 'Create New Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Helper */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {isLogin ? (
                <span>Need a new account? <strong className="text-indigo-400">Create Account</strong></span>
              ) : (
                <span>Already have an account? <strong className="text-indigo-400">Sign In</strong></span>
              )}
            </button>
          </div>
        </div>

        {/* Note info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Real Firebase Authentication & Cloud Firestore Persistence.
        </p>
      </div>
    </div>
  );
};


