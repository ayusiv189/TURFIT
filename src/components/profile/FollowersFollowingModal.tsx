import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserCheck,
  UserPlus,
  Search,
  MapPin,
  ShieldCheck,
  Building2,
  Trophy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { UserFollow, UserProfile } from '../../types';
import {
  listenFollowersList,
  listenFollowingList,
  followUserOrTeam,
  unfollowUserOrTeam,
  listenIsFollowing,
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';

interface FollowersFollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  targetUsername?: string;
  initialTab?: 'followers' | 'following';
  onSelectUser?: (userId: string, item?: UserFollow) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetUsername,
  initialTab = 'followers',
  onSelectUser,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<UserFollow[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Keep track of which IDs current user is following
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !targetId) return;
    setLoading(true);

    const unsubFollowers = listenFollowersList(targetId, (list) => {
      setFollowers(list);
      setLoading(false);
    });

    const unsubFollowing = listenFollowingList(targetId, (list) => {
      setFollowing(list);
      setLoading(false);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [isOpen, targetId]);

  // Track who the current logged in user follows
  useEffect(() => {
    if (!user?.uid) {
      setMyFollowingIds(new Set());
      return;
    }

    const unsubMyFollowing = listenFollowingList(user.uid, (list) => {
      setMyFollowingIds(new Set(list.map((item) => item.targetId)));
    });

    return () => {
      unsubMyFollowing();
    };
  }, [user?.uid]);

  if (!isOpen) return null;

  const currentList = activeTab === 'followers' ? followers : following;

  const filteredList = currentList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const name = (activeTab === 'followers' ? item.followerName : item.targetName).toLowerCase();
    const handle = (activeTab === 'followers' ? item.followerUsername : item.targetUsername)?.toLowerCase() || '';
    const city = item.targetCity?.toLowerCase() || '';
    const sport = item.targetSport?.toLowerCase() || '';

    return name.includes(q) || handle.includes(q) || city.includes(q) || sport.includes(q);
  });

  const handleToggleFollow = async (item: UserFollow, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user || !profile) {
      showToast?.('Please log in to follow athletes and venues', 'error');
      return;
    }

    const targetUserId = activeTab === 'followers' ? item.followerId : item.targetId;
    const targetEntityName = activeTab === 'followers' ? item.followerName : item.targetName;
    const targetEntityUsername = activeTab === 'followers' ? item.followerUsername : item.targetUsername;
    const targetEntityAvatar = activeTab === 'followers' ? item.followerAvatar : item.targetAvatar;
    const targetRole = activeTab === 'followers' ? item.followerRole : item.targetType;

    if (user.uid === targetUserId) {
      showToast?.('You cannot follow your own profile.', 'error');
      return;
    }

    const isCurrentlyFollowing = myFollowingIds.has(targetUserId);
    setActionPendingId(targetUserId);

    try {
      if (isCurrentlyFollowing) {
        await unfollowUserOrTeam(user.uid, targetUserId, (targetRole as any) === 'TEAM' ? 'TEAM' : 'PLAYER');
        showToast?.(`Unfollowed ${targetEntityName}`, 'success');
      } else {
        await followUserOrTeam({
          follower: profile,
          targetId: targetUserId,
          targetType: (targetRole as any) === 'TEAM' ? 'TEAM' : (targetRole === 'OWNER' ? 'OWNER' : 'PLAYER'),
          targetName: targetEntityName,
          targetUsername: targetEntityUsername,
          targetAvatar: targetEntityAvatar,
          targetCity: item.targetCity,
          targetSport: item.targetSport,
        });
        showToast?.(`Now following ${targetEntityName}!`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to toggle follow:', err);
      showToast?.(err.message || 'Action failed. Please try again.', 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div
      id="modal-followers-following-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="modal-followers-following-container"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>{targetName}</span>
            </h2>
            {targetUsername && (
              <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
                @{targetUsername.replace(/^@/, '')}
              </p>
            )}
          </div>
          <button
            type="button"
            id="btn-close-followers-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            id="tab-followers-list"
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'followers'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Followers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'followers'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {followers.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-following-list"
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'following'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Following</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'following'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {following.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-followers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeTab === 'followers' ? 'followers' : 'following'}...`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading community members...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">
                {searchQuery
                  ? 'No members match your search'
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'Try searching with a different name, handle, or sport.'
                  : activeTab === 'followers'
                  ? 'When other players or turf venues follow this profile, they will show up here.'
                  : 'Explore players, venues, and squads to connect and build your sports network.'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const personId = activeTab === 'followers' ? item.followerId : item.targetId;
              const personName = activeTab === 'followers' ? item.followerName : item.targetName;
              const personUsername = activeTab === 'followers' ? item.followerUsername : item.targetUsername;
              const personAvatar = activeTab === 'followers' ? item.followerAvatar : item.targetAvatar;
              const isTeam = (activeTab === 'following' && item.targetType === 'TEAM');
              const isOwner = (activeTab === 'followers' ? item.followerRole === 'OWNER' : item.targetType === 'OWNER');
              const isSelf = user?.uid === personId;
              const isCurrentlyFollowing = myFollowingIds.has(personId);
              const isPending = actionPendingId === personId;

              return (
                <div
                  key={item.id}
                  id={`follow-item-${item.id}`}
                  onClick={() => {
                    if (onSelectUser && personId) {
                      onSelectUser(personId, item);
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer gap-3"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                        {personAvatar ? (
                          <img
                            src={personAvatar}
                            alt={personName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : isTeam ? (
                          <Trophy className="w-5 h-5 text-amber-400" />
                        ) : isOwner ? (
                          <Building2 className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <span className="text-sm font-bold text-slate-300">
                            {personName?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                          {personName}
                        </span>
                        {isOwner && (
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0">
                            Venue Owner
                          </span>
                        )}
                        {isTeam && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0">
                            Team
                          </span>
                        )}
                      </div>

                      {personUsername ? (
                        <p className="text-[11px] text-emerald-400/90 font-mono font-semibold truncate">
                          @{personUsername.replace(/^@/, '')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.targetCity || 'TruFit Member'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isSelf && (
                      <button
                        type="button"
                        id={`btn-follow-toggle-${personId}`}
                        disabled={isPending}
                        onClick={(e) => handleToggleFollow(item, e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isCurrentlyFollowing
                            ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        {isPending ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isCurrentlyFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            TruFit Social Graph • Tap any athlete or venue to view their profile
          </p>
        </div>
      </div>
    </div>
  );
};
