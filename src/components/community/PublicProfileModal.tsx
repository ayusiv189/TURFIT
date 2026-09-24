import React, { useState, useEffect } from 'react';
import { UserProfile, PlayerSportsmanshipStats } from '../../types';
import { getPlayerSportsmanshipStats } from '../../lib/phase3';
import { getUserProfile } from '../../lib/db';
import { RatePlayerModal } from './RatePlayerModal';
import { DirectMessageModal } from '../messaging/DirectMessageModal';
import { useAuth } from '../../context/AuthContext';
import { SocialProfileView } from '../profile/SocialProfileView';
import {
  X,
  Activity,
  Shield,
  Star,
  Sparkles,
  Award,
  MessageSquare,
  User,
  Loader2,
} from 'lucide-react';

interface PublicProfileModalProps {
  player?: UserProfile | null;
  userId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteToLobby?: (player: UserProfile) => void;
  onInviteToTeam?: (player: UserProfile) => void;
}

const BADGE_ICONS: Record<string, { icon: string; color: string }> = {
  'Fair Play Champion': { icon: '🌟', color: '#38bdf8' },
  'Playmaker / MVP': { icon: '👑', color: '#f59e0b' },
  'Team Motivator': { icon: '🤝', color: '#10b981' },
  'Defensive Wall': { icon: '🛡️', color: '#818cf8' },
  'Clockwork Punctual': { icon: '⏱️', color: '#06b6d4' },
  'Clutch Performer': { icon: '🔥', color: '#ef4444' },
  'Tactical Genius': { icon: '🎯', color: '#a855f7' },
  'Sharpshooter': { icon: '⚡', color: '#ec4899' },
};

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  player,
  userId,
  isOpen,
  onClose,
  onInviteToLobby,
  onInviteToTeam,
}) => {
  const { user, profile: currentAuthProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'reputation'>('profile');
  const [sportsmanshipStats, setSportsmanshipStats] = useState<PlayerSportsmanshipStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState<boolean>(false);
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [showDirectMessageModal, setShowDirectMessageModal] = useState<boolean>(false);

  const targetUid = userId || player?.uid;

  useEffect(() => {
    if (!isOpen || !targetUid) return;

    // Fetch complete user profile document if available
    setFetchingProfile(true);
    getUserProfile(targetUid)
      .then((data) => {
        if (data) setFetchedProfile(data);
      })
      .catch((err) => console.warn('Error fetching full profile in modal:', err))
      .finally(() => setFetchingProfile(false));

    setLoadingStats(true);
    getPlayerSportsmanshipStats(targetUid, player || undefined)
      .then((stats) => setSportsmanshipStats(stats))
      .catch((err) => console.warn('Error loading player sportsmanship stats:', err))
      .finally(() => setLoadingStats(false));
  }, [targetUid, isOpen, player]);

  if (!isOpen || (!player && !userId && !fetchedProfile)) return null;

  const rawProfile = fetchedProfile || player || { uid: targetUid || '' };
  const isSelf = user?.uid === targetUid;

  const activeProfile: UserProfile = {
    uid: targetUid || '',
    email: (rawProfile as any)?.email || 'athlete@trufit.app',
    displayName:
      (isSelf && currentAuthProfile?.displayName) ||
      rawProfile?.displayName ||
      (rawProfile as any)?.playerName ||
      (rawProfile as any)?.name ||
      (rawProfile as any)?.authorName ||
      'TruFit Member',
    role: (isSelf && currentAuthProfile?.role) || rawProfile?.role || 'PLAYER',
    emailVerified: rawProfile?.emailVerified ?? false,
    photoURL:
      (isSelf && currentAuthProfile?.photoURL) ||
      rawProfile?.photoURL ||
      (rawProfile as any)?.playerPhotoURL ||
      (rawProfile as any)?.authorAvatar,
    city: (isSelf && currentAuthProfile?.city) || rawProfile?.city || (rawProfile as any)?.authorCity || 'Local',
    preferredSport: (isSelf && currentAuthProfile?.preferredSport) || rawProfile?.preferredSport || 'Football',
    createdAt: rawProfile?.createdAt || new Date().toISOString(),
    updatedAt: rawProfile?.updatedAt || new Date().toISOString(),
    isPublic: rawProfile?.isPublic ?? true,
    ...(isSelf && currentAuthProfile ? currentAuthProfile : rawProfile),
  };

  const rawBadges = (sportsmanshipStats?.badgeCounts || {}) as Record<string, number>;
  const badgesList: [string, number][] = Object.entries(rawBadges).filter(
    ([_, count]: [string, number]) => count > 0
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up max-h-[92vh] flex flex-col my-auto">
          {/* Sub Navigation Bar inside modal */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>TruFit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reputation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'reputation'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Sportsmanship</span>
                {sportsmanshipStats && (
                  <span className="text-[10px] bg-indigo-950 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                    {sportsmanshipStats.averageRating.toFixed(1)}★
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {activeTab === 'profile' ? (
              <div className="p-1">
                <SocialProfileView
                  profile={activeProfile}
                  isSelf={isSelf}
                  showToast={() => {}}
                />
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Sportsmanship Reputation Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= Math.round(sportsmanshipStats?.averageRating || 5)
                                ? 'fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        {sportsmanshipStats ? sportsmanshipStats.averageRating.toFixed(1) : '5.0'}
                        <span className="text-xs text-slate-500 font-normal"> / 5.0</span>
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {sportsmanshipStats?.totalRatings || 0} Peer Reviews
                    </span>
                  </div>

                  {/* 3-way breakdown */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                    <div>
                      <span className="text-xs font-extrabold text-amber-400 block">
                        {sportsmanshipStats ? sportsmanshipStats.sportsmanshipAvg.toFixed(1) : '5.0'}★
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Fair Play</span>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-indigo-400 block">
                        {sportsmanshipStats ? sportsmanshipStats.skillAvg.toFixed(1) : '4.8'}★
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Skill & IQ</span>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-cyan-400 block">
                        {sportsmanshipStats ? sportsmanshipStats.punctualityAvg.toFixed(1) : '5.0'}★
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Punctuality</span>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs font-bold uppercase text-slate-300 block mb-2.5 flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    Earned Peer Badges
                  </span>
                  {badgesList.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {badgesList.map(([badgeName, count]) => {
                        const meta = BADGE_ICONS[badgeName] || { icon: '🏅', color: '#38bdf8' };
                        return (
                          <div
                            key={badgeName}
                            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{meta.icon}</span>
                              <span className="text-xs font-bold text-slate-200">{badgeName}</span>
                            </div>
                            {count > 1 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                                ×{count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No sportsmanship badges awarded yet. Play matches together to rate and endorse this athlete!
                    </p>
                  )}
                </div>

                {/* Teammate Quotes */}
                {sportsmanshipStats?.recentFeedback && sportsmanshipStats.recentFeedback.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-300 block flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      Teammate Quotes & Feedback
                    </span>
                    <div className="space-y-2">
                      {sportsmanshipStats.recentFeedback.map((fb) => (
                        <div key={fb.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-300">{fb.reviewerName}</span>
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {fb.sportsmanshipRating}★
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 italic">"{fb.feedback}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions for Interacting with this Athlete */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 flex-wrap">
              {!isSelf && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDirectMessageModal(true)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRateModal(true)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-950/40"
                  >
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Rate Sportsmanship</span>
                  </button>
                </>
              )}

              {onInviteToLobby && !isSelf && (
                <button
                  type="button"
                  onClick={() => {
                    onInviteToLobby(activeProfile);
                    onClose();
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-950/40"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Invite to Lobby</span>
                </button>
              )}

              {onInviteToTeam && !isSelf && (
                <button
                  type="button"
                  onClick={() => {
                    onInviteToTeam(activeProfile);
                    onClose();
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Invite to Team</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Direct Message Modal */}
      <DirectMessageModal
        isOpen={showDirectMessageModal}
        targetPlayer={{
          uid: activeProfile.uid,
          displayName: activeProfile.displayName,
          photoURL: activeProfile.photoURL,
          role: activeProfile.role,
          username: activeProfile.username,
          privacySettings: activeProfile.privacySettings,
        }}
        onClose={() => setShowDirectMessageModal(false)}
      />

      {/* Internal Rating Modal */}
      <RatePlayerModal
        isOpen={showRateModal}
        targetPlayer={{
          uid: activeProfile.uid,
          displayName: activeProfile.displayName,
          photoURL: activeProfile.photoURL,
          sport: activeProfile.preferredSport,
        }}
        onClose={() => setShowRateModal(false)}
        onSuccess={() => {
          if (activeProfile?.uid) {
            getPlayerSportsmanshipStats(activeProfile.uid, activeProfile).then((stats) => setSportsmanshipStats(stats));
          }
        }}
      />
    </>
  );
};
