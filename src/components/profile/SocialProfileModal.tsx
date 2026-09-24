import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { getUserProfile } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { SocialProfileView } from './SocialProfileView';
import { X, Loader2 } from 'lucide-react';

interface SocialProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  initialProfile?: UserProfile | null;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const SocialProfileModal: React.FC<SocialProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialProfile,
  showToast,
}) => {
  const { user, profile: currentAuthProfile } = useAuth();
  const [activeUserId, setActiveUserId] = useState<string | null>(userId || initialProfile?.uid || null);
  const [profileData, setProfileData] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (userId) {
      setActiveUserId(userId);
    } else if (initialProfile?.uid) {
      setActiveUserId(initialProfile.uid);
    }
  }, [userId, initialProfile?.uid]);

  const isSelf = !!(user && activeUserId === user.uid);

  useEffect(() => {
    if (!isOpen || !activeUserId) return;

    if (isSelf && currentAuthProfile) {
      setProfileData(currentAuthProfile);
      setLoading(false);
      return;
    }

    if (initialProfile && initialProfile.uid === activeUserId) {
      setProfileData(initialProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserProfile(activeUserId)
      .then((data) => {
        if (data) {
          setProfileData(data);
        } else {
          // Fallback lightweight profile if not yet in database
          setProfileData({
            uid: activeUserId,
            email: 'athlete@trufit.app',
            displayName: 'TruFit Member',
            role: 'PLAYER',
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPublic: true,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch profile in modal:', err);
        if (showToast) showToast('Could not load user profile', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, activeUserId, isSelf, currentAuthProfile, initialProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto animate-in zoom-in-95">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-2xl flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-slate-300">Loading Athlete Profile...</p>
          </div>
        ) : profileData ? (
          <SocialProfileView
            profile={isSelf && currentAuthProfile ? currentAuthProfile : profileData}
            isSelf={isSelf}
            onProfileUpdated={(updated) => setProfileData(updated)}
            onSelectUser={(selectedUid) => {
              setActiveUserId(selectedUid);
            }}
            showToast={showToast}
            headerAction={
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700/60 shadow-md"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
            <p className="text-slate-400 text-sm">Profile not found.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
