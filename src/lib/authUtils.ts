import { User } from 'firebase/auth';
import { UserProfile } from '../types';

/**
 * List of verified Super Admin emails with operations authority.
 */
export const ADMIN_EMAILS: string[] = [
  'ayusiv189@gmail.com',
];

/**
 * Determines whether the authenticated user or their profile holds ADMIN privileges.
 */
export function isUserAdmin(user: User | null, profile: UserProfile | null): boolean {
  if (!user && !profile) return false;

  const userEmail = (user?.email || '').toLowerCase().trim();
  const profileEmail = (profile?.email || '').toLowerCase().trim();

  // Check email whitelist
  const isWhitelistedEmail = ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === userEmail || adminEmail.toLowerCase() === profileEmail
  );

  if (isWhitelistedEmail) return true;

  // Check Firestore profile role
  if (profile?.role === 'ADMIN') return true;

  return false;
}
