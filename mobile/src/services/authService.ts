import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

export async function registerUser(
  email: string,
  pass: string,
  displayName: string,
  phoneNumber: string,
  role: UserRole,
  city = ''
): Promise<{ user: User; profile: UserProfile }> {
  const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = userCred.user;

  // Send real verification email
  await sendEmailVerification(user);

  await updateProfile(user, { displayName: displayName.trim() });

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email?.toLowerCase() || '',
    displayName: displayName.trim(),
    phoneNumber: phoneNumber.trim(),
    role,
    city: city.trim(),
    preferredSports: [],
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), profile);

  return { user, profile };
}

export async function loginUser(email: string, pass: string): Promise<User> {
  const userCred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return userCred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  }
  return null;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}
