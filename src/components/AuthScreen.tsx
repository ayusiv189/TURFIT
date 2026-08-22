import React, { useState } from 'react';
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
} from 'lucide-react';

interface AuthModalProps {
  initialRole?: UserRole;
}

export const AuthScreen: React.FC<AuthModalProps> = ({ initialRole = 'PLAYER' }) => {
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
            Please verify your email before continuing to TruFit. We sent a verification link to:
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

      // Safely ensure user doc exists in Firestore with chosen role
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          const profilePayload: Record<string, any> = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: role,
            emailVerified: true,
            photoURL: fbUser.photoURL || '',
            city: city.trim() || 'Mumbai',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          if (role === 'PLAYER' && preferredSport) {
            profilePayload.preferredSport = preferredSport;
          }
          if (role === 'OWNER') {
            profilePayload.businessName = businessName.trim() || `${fbUser.displayName || 'Owner'}'s Turf`;
          }
          await setDoc(userDocRef, sanitizeFirestoreData(profilePayload), { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Firestore profile sync note (session active):', firestoreErr);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed or dismissed the popup voluntarily
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
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Sign Up
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (!displayName.trim()) {
          throw new Error('Full Name is required.');
        }

        // Save role intent in local storage in case profile doc write lags
        localStorage.setItem('pending_role', role);

        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = credential.user;

        // Update display name
        try {
          await updateProfile(fbUser, {
            displayName: displayName.trim(),
          });
        } catch (profileErr) {
          console.warn('Could not update display name in auth:', profileErr);
        }

        // Send verification email immediately
        try {
          await sendEmailVerification(fbUser);
        } catch (emailErr) {
          console.warn('Could not send email verification link:', emailErr);
        }

        // Create Firestore profile with sanitized data
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const newProfile: Record<string, any> = {
            uid: fbUser.uid,
            email: fbUser.email || email.trim(),
            displayName: displayName.trim(),
            role: role,
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (phoneNumber.trim()) {
            newProfile.phoneNumber = phoneNumber.trim();
          }
          if (city.trim()) {
            newProfile.city = city.trim();
          }
          if (role === 'PLAYER' && preferredSport) {
            newProfile.preferredSport = preferredSport;
          }
          if (role === 'OWNER') {
            newProfile.businessName = businessName.trim() || displayName.trim();
          }

          await setDoc(userDocRef, sanitizeFirestoreData(newProfile), { merge: true });
        } catch (firestoreErr) {
          console.warn('Firestore profile save note:', firestoreErr);
        }
        setInfoMsg('Account created successfully! Verification email has been sent.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Email & Password authentication is disabled in this Firebase project. Please click "Continue with Google" above for instant 1-click access.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please verify and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please log in or use Google Sign-In instead.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please provide a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
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
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 text-white font-black text-2xl italic shadow-lg shadow-indigo-600/30 mb-3">
            T
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center">
            TRUFIT <span className="text-indigo-500 font-medium text-sm ml-2 tracking-widest uppercase">Portal</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real Sports Turf Discovery & Slot Booking</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Role selector for session setup */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Account Type:
            </label>
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
                <span className="text-xs font-bold">Turf Owner</span>
              </button>
            </div>
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

          {/* Toggle Login vs Register */}
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isLogin
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
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

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {role === 'OWNER' ? 'Owner Full Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="input-fullname"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {role === 'OWNER' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Business / Turf Brand Name
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="input-business-name"
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. TruFit Arena Mumbai"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="input-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="input-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {role === 'PLAYER' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Preferred Sport
                    </label>
                    <select
                      id="input-sport"
                      value={preferredSport}
                      onChange={(e) => setPreferredSport(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    >
                      <option value="Football">Football / Turf Soccer</option>
                      <option value="Box Cricket">Box Cricket</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Tennis">Tennis / Pickleball</option>
                    </select>
                  </div>
                )}
              </>
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
                    id="input-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50 mt-6 text-sm"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In with Email' : 'Create & Verify Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Note info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Real Firebase Authentication & Cloud Firestore Persistence.
        </p>
      </div>
    </div>
  );
};

