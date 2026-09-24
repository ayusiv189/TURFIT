import React, { useState, useEffect } from 'react';
import { UserProfile, SocialPost } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EditProfileModal } from './EditProfileModal';
import { FollowersFollowingModal } from './FollowersFollowingModal';
import { SocialProfileModal } from './SocialProfileModal';
import { CreatePostModal } from './CreatePostModal';
import { PostDetailModal } from './PostDetailModal';
import { DirectMessageModal } from '../messaging/DirectMessageModal';
import { ProfilePostsGrid } from './ProfilePostsGrid';
import { ProfileTeamsSection } from './ProfileTeamsSection';
import { ProfileMatchesSection } from './ProfileMatchesSection';
import { ProfileTournamentsSection } from './ProfileTournamentsSection';
import { ProfileAchievementsSection } from './ProfileAchievementsSection';
import { OwnerEcosystemSections } from './OwnerEcosystemSections';
import {
  getPlayerTeams,
  getPlayerMatches,
  getPlayerTournaments,
  getPlayerAchievements,
  getOwnerEcosystemData,
  PlayerTeamMembership,
  PlayerMatchRecord,
  PlayerTournamentParticipation,
  PlayerAchievementItem,
  OwnerEcosystemSummary,
} from '../../lib/profileEcosystem';
import {
  followUserOrTeam,
  unfollowUserOrTeam,
  listenIsFollowing,
  listenUserPosts,
} from '../../lib/db';
import {
  MapPin,
  Pencil,
  ShieldCheck,
  Award,
  Lock,
  Globe,
  Star,
  Users,
  Trophy,
  Activity,
  Check,
  Copy,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  Flame,
  UserPlus,
  UserCheck,
  MessageSquare,
  Plus,
  Image as ImageIcon,
  Info,
  Share2,
  Shield,
  Swords,
  Tag,
} from 'lucide-react';
import { shareContent } from '../../lib/share';

interface SocialProfileViewProps {
  profile: UserProfile;
  isSelf?: boolean;
  onProfileUpdated?: (updated: UserProfile) => void;
  onSelectUser?: (userId: string) => void;
  onSelectTeam?: (teamId: string) => void;
  onSelectTournament?: (tournamentId: string) => void;
  onBookTurf?: (turfId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  headerAction?: React.ReactNode;
}

const SPORT_ICONS: Record<string, string> = {
  Football: '⚽',
  'Box Cricket': '🏏',
  Cricket: '🏏',
  Badminton: '🏸',
  Basketball: '🏀',
  Pickleball: '🏓',
  Tennis: '🎾',
  Volleyball: '🏐',
  'Table Tennis': '🏓',
  Padel: '🎾',
  Squash: '🏸',
  Pool: '🎱',
};

export const SocialProfileView: React.FC<SocialProfileViewProps> = ({
  profile,
  isSelf = false,
  onProfileUpdated,
  onSelectUser,
  onSelectTeam,
  onSelectTournament,
  onBookTurf,
  showToast,
  headerAction,
}) => {
  const { user, profile: myProfile, updateUserProfile } = useAuth();
  const isOwner = profile.role === 'OWNER';
  const isPrivate = profile.isPublic === false && !isSelf;

  const safeDisplayName =
    profile?.displayName ||
    (profile as any)?.playerName ||
    (profile as any)?.name ||
    (profile as any)?.authorName ||
    'TruFit Athlete';

  const safePhotoURL =
    profile?.photoURL ||
    (profile as any)?.playerPhotoURL ||
    (profile as any)?.authorAvatar ||
    undefined;

  const safeUsername =
    profile?.username ||
    safeDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');

  const [activeTab, setActiveTab] = useState<
    'posts' | 'teams' | 'matches' | 'tournaments' | 'achievements' | 'arenas' | 'offers' | 'about'
  >('posts');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
  const [viewingSelectedUserId, setViewingSelectedUserId] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);

  // Sports Ecosystem State
  const [playerTeams, setPlayerTeams] = useState<PlayerTeamMembership[]>([]);
  const [playerMatches, setPlayerMatches] = useState<PlayerMatchRecord[]>([]);
  const [playerTournaments, setPlayerTournaments] = useState<PlayerTournamentParticipation[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievementItem[]>([]);
  const [sportsmanshipStats, setSportsmanshipStats] = useState<any>(null);
  const [ownerEcosystem, setOwnerEcosystem] = useState<OwnerEcosystemSummary>({
    turfs: [],
    arenas: [],
    tournaments: [],
    offers: [],
  });
  const [loadingEcosystem, setLoadingEcosystem] = useState<boolean>(true);

  // Track live followers count locally to feel instant
  const [liveFollowersCount, setLiveFollowersCount] = useState<number>(profile.followersCount || 0);
  const [liveFollowingCount, setLiveFollowingCount] = useState<number>(profile.followingCount || 0);

  useEffect(() => {
    setLiveFollowersCount(profile.followersCount || 0);
    setLiveFollowingCount(profile.followingCount || 0);
  }, [profile.followersCount, profile.followingCount]);

  useEffect(() => {
    if (!user?.uid || !profile.uid || isSelf) {
      setIsFollowing(false);
      return;
    }
    const unsub = listenIsFollowing(user.uid, profile.uid, (following) => {
      setIsFollowing(following);
    });
    return () => unsub();
  }, [user?.uid, profile.uid, isSelf]);

  // Real-time listener for profile posts
  useEffect(() => {
    if (!profile.uid) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }
    setLoadingPosts(true);
    const unsub = listenUserPosts(profile.uid, (userPosts) => {
      setPosts(userPosts);
      setLoadingPosts(false);
    });
    return () => unsub();
  }, [profile.uid]);

  // Load sports ecosystem data
  useEffect(() => {
    if (!profile.uid) {
      setLoadingEcosystem(false);
      return;
    }

    let isMounted = true;
    setLoadingEcosystem(true);

    const loadData = async () => {
      try {
        if (isOwner) {
          const data = await getOwnerEcosystemData(profile.uid);
          if (isMounted) {
            setOwnerEcosystem(data);
          }
        } else {
          const [teams, matches, tournaments] = await Promise.all([
            getPlayerTeams(profile.uid),
            getPlayerMatches(profile.uid),
            getPlayerTournaments(profile.uid, profile.displayName),
          ]);

          const achData = await getPlayerAchievements(
            profile,
            teams.length,
            matches.length,
            tournaments.length
          );

          if (isMounted) {
            setPlayerTeams(teams);
            setPlayerMatches(matches);
            setPlayerTournaments(tournaments);
            setPlayerAchievements(achData.achievements);
            setSportsmanshipStats(achData.sportsmanshipStats);
          }
        }
      } catch (err) {
        console.warn('Error loading ecosystem data:', err);
      } finally {
        if (isMounted) {
          setLoadingEcosystem(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [profile.uid, isOwner, profile.displayName, profile.matchesPlayed, profile.sportsmanshipRating]);

  const handleCopyHandle = () => {
    const handle = profile.username ? `@${profile.username}` : `@${profile.displayName.toLowerCase().replace(/\s+/g, '_')}`;
    navigator.clipboard.writeText(handle);
    setCopiedHandle(true);
    if (showToast) showToast(`Copied ${handle} to clipboard!`);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleShareProfile = async () => {
    const handle = profile.username ? `@${profile.username}` : `@${profile.displayName.toLowerCase().replace(/\s+/g, '_')}`;
    const roleLabel = isOwner ? 'Turf Venue' : 'Athlete';
    const res = await shareContent({
      title: `${profile.displayName} on TruFit (${handle})`,
      text: `Check out ${profile.displayName} (${roleLabel}) on TruFit Sports!`,
      url: `${window.location.origin}${window.location.pathname}#profile=${profile.uid}`,
    });
    if (res.success && res.method === 'clipboard') {
      showToast?.('Profile link copied to clipboard!', 'info');
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !myProfile) {
      showToast?.('Please sign in to follow athletes and venues', 'error');
      return;
    }
    if (user.uid === profile.uid) {
      showToast?.('You cannot follow your own profile.', 'error');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUserOrTeam(user.uid, profile.uid, isOwner ? 'OWNER' : 'PLAYER');
        setLiveFollowersCount((prev) => Math.max(0, prev - 1));
        showToast?.(`Unfollowed ${safeDisplayName}`, 'success');
      } else {
        await followUserOrTeam({
          follower: myProfile,
          targetId: profile.uid,
          targetType: isOwner ? 'OWNER' : 'PLAYER',
          targetName: safeDisplayName,
          targetUsername: safeUsername,
          targetAvatar: safePhotoURL,
          targetCity: profile.city,
          targetSport: profile.preferredSport,
        });
        setLiveFollowersCount((prev) => prev + 1);
        showToast?.(`Now following ${safeDisplayName}!`, 'success');
      }
    } catch (err: any) {
      console.error('Follow action failed:', err);
      showToast?.(err.message || 'Action failed. Please try again.', 'error');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleOpenFollowersList = (tab: 'followers' | 'following') => {
    setFollowersModalTab(tab);
    setFollowersModalOpen(true);
  };

  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    if (isSelf) {
      await updateUserProfile(updates);
      if (onProfileUpdated) {
        onProfileUpdated({
          ...profile,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const sportsList = profile.preferredSports && profile.preferredSports.length > 0
    ? profile.preferredSports
    : profile.preferredSport
    ? [profile.preferredSport]
    : ['Football'];

  const positionsList = profile.preferredPositions && profile.preferredPositions.length > 0
    ? profile.preferredPositions
    : profile.preferredPosition
    ? [profile.preferredPosition]
    : ['Flex Athlete'];

  const facilitiesList = profile.facilities && profile.facilities.length > 0
    ? profile.facilities
    : ['Floodlights', 'Changing Rooms', 'Parking', 'Drinking Water'];

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative text-left">
      {/* Banner / Cover */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-b border-slate-800 flex items-start justify-between p-4 overflow-hidden">
        {/* Subtle Pitch Lines Graphic */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-emerald-400" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-emerald-400" />
          <div className="absolute right-0 top-6 bottom-6 w-20 border-l border-emerald-400" />
        </div>

        {/* Top Badges / Header Action */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isOwner ? 'TruFit Verified Venue' : 'TruFit Athlete'}
          </span>
          {profile.isPublic !== false ? (
            <span className="bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/60 text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              Public
            </span>
          ) : (
            <span className="bg-slate-900/80 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              Private
            </span>
          )}
        </div>

        {/* Optional Close or Custom Header action */}
        {headerAction && <div className="relative z-10">{headerAction}</div>}
      </div>

      {/* Profile Header Card */}
      <div className="px-5 sm:px-7 pb-6 pt-0 relative">
        {/* Avatar & Action Button Row */}
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-4 gap-3">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-slate-900 bg-slate-950 shadow-2xl flex items-center justify-center flex-shrink-0">
              {safePhotoURL ? (
                <img
                  src={safePhotoURL}
                  alt={safeDisplayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold uppercase">
                  {safeDisplayName.charAt(0)}
                </div>
              )}
            </div>

            {/* Role Icon Tag */}
            <div
              className={`absolute -bottom-1 -right-1 p-1.5 rounded-xl border-2 border-slate-900 shadow-md ${
                isOwner ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
              }`}
              title={isOwner ? 'Turf Owner' : 'Athlete'}
            >
              {isOwner ? <Building2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>

          {/* Action Buttons: Create Post, Edit Profile, or Follow + Share Profile */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-share-profile"
              onClick={handleShareProfile}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white p-2.5 rounded-2xl shadow-lg border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center shadow-slate-950/60"
              title="Share Profile"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
            </button>

            {isSelf ? (
              <>
                <button
                  type="button"
                  id="btn-profile-create-post"
                  onClick={() => setIsCreatePostOpen(true)}
                  className="text-xs font-black px-3.5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Post</span>
                </button>
                <button
                  type="button"
                  id="btn-edit-social-profile"
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-slate-950/60"
                >
                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit Profile</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-social-message-player"
                  onClick={() => setIsDirectMessageOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-emerald-950/40"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>

                <button
                  type="button"
                  id="btn-social-follow-toggle"
                  disabled={isFollowLoading}
                  onClick={handleToggleFollow}
                  className={`text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFollowing
                      ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 shadow-slate-950/60'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/60 font-black'
                  }`}
                >
                  {isFollowLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
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
              </div>
            )}
          </div>
        </div>

        {/* Identity & Usernames */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {safeDisplayName}
            </h1>
            <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 p-0.5 rounded-full" title="Verified Member">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            {isOwner && profile.businessName && (
              <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg font-bold">
                {profile.businessName}
              </span>
            )}
          </div>

          {/* Username handle with copy */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleCopyHandle}
              className="text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer group bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-lg"
              title="Copy handle"
            >
              <span>@{safeUsername}</span>
              {copiedHandle ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              )}
            </button>

            {profile.city && (
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {profile.city}
              </span>
            )}
          </div>
        </div>

        {/* Social Stats Counters Bar */}
        <div className="grid grid-cols-4 gap-2 mb-6 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center">
          {/* Posts Count */}
          <button
            type="button"
            id="btn-view-posts-count"
            onClick={() => setActiveTab('posts')}
            className={`space-y-0.5 p-1 rounded-xl transition-colors cursor-pointer group ${
              activeTab === 'posts' ? 'bg-slate-900' : 'hover:bg-slate-900/60'
            }`}
          >
            <span className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors block">
              {posts.length}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400/90 flex items-center justify-center gap-1">
              <ImageIcon className="w-3 h-3 text-emerald-400" />
              Posts
            </span>
          </button>

          {/* Followers */}
          <button
            type="button"
            id="btn-view-followers-count"
            onClick={() => handleOpenFollowersList('followers')}
            className="space-y-0.5 p-1 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer group border-l border-slate-800/80"
          >
            <span className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors block">
              {liveFollowersCount}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400/90 flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
              Followers
            </span>
          </button>

          {/* Following */}
          <button
            type="button"
            id="btn-view-following-count"
            onClick={() => handleOpenFollowersList('following')}
            className="space-y-0.5 p-1 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer group border-l border-slate-800/80"
          >
            <span className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors block">
              {liveFollowingCount}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400/90 flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
              Following
            </span>
          </button>

          {/* Matches Played / Rating */}
          <button
            type="button"
            onClick={() => (!isOwner ? setActiveTab('matches') : setActiveTab('about'))}
            className="space-y-0.5 p-1 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer group border-l border-slate-800/80"
          >
            <span className="text-sm sm:text-base font-black text-emerald-400 block">
              {isOwner
                ? `${(profile.rating || profile.sportsmanshipRating || 4.9).toFixed(1)} ★`
                : Math.max(profile.matchesPlayed || 0, playerMatches.length)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400/90 flex items-center justify-center gap-1">
              {isOwner ? <Star className="w-3 h-3 text-amber-400" /> : <Trophy className="w-3 h-3 text-emerald-400" />}
              {isOwner ? 'Rating' : 'Matches'}
            </span>
          </button>
        </div>

        {/* Dynamic Tab Navigation based on Role */}
        <div className="flex border-b border-slate-800 mb-5 overflow-x-auto no-scrollbar gap-1">
          {/* Posts Tab */}
          <button
            type="button"
            id="tab-profile-posts"
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
              activeTab === 'posts'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Highlights</span>
          </button>

          {/* Player-specific Tabs: Teams, Matches, Tournaments, Achievements */}
          {!isOwner && (
            <>
              <button
                type="button"
                id="tab-profile-teams"
                onClick={() => setActiveTab('teams')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'teams'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Teams</span>
                {playerTeams.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                    {playerTeams.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-profile-matches"
                onClick={() => setActiveTab('matches')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'matches'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Matches</span>
                {playerMatches.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                    {playerMatches.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-profile-tournaments"
                onClick={() => setActiveTab('tournaments')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'tournaments'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Tournaments</span>
              </button>

              <button
                type="button"
                id="tab-profile-achievements"
                onClick={() => setActiveTab('achievements')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'achievements'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Awards</span>
              </button>
            </>
          )}

          {/* Owner-specific Tabs: Arenas, Tournaments, Offers */}
          {isOwner && (
            <>
              <button
                type="button"
                id="tab-profile-arenas"
                onClick={() => setActiveTab('arenas')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'arenas'
                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Arenas</span>
                {ownerEcosystem.turfs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                    {ownerEcosystem.turfs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-profile-owner-tournaments"
                onClick={() => setActiveTab('tournaments')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'tournaments'
                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Championships</span>
              </button>

              <button
                type="button"
                id="tab-profile-offers"
                onClick={() => setActiveTab('offers')}
                className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
                  activeTab === 'offers'
                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Offers</span>
              </button>
            </>
          )}

          {/* Bio / Info Tab */}
          <button
            type="button"
            id="tab-profile-about"
            onClick={() => setActiveTab('about')}
            className={`py-3 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex-1 ${
              activeTab === 'about'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Bio</span>
          </button>
        </div>

        {/* Tab Content: Posts */}
        {activeTab === 'posts' && (
          <div className="animate-fade-in">
            <ProfilePostsGrid
              posts={posts}
              isLoading={loadingPosts}
              isSelf={isSelf}
              isPrivate={isPrivate}
              onPostClick={(post) => setSelectedPost(post)}
              onCreatePostClick={() => setIsCreatePostOpen(true)}
            />
          </div>
        )}

        {/* Privacy Shield: If private and not self, hide detailed ecosystem tabs */}
        {isPrivate && activeTab !== 'posts' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-8 text-center my-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">This Profile is Private</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              This athlete or venue has enabled privacy protection. Detailed performance statistics, team rosters, match logs, and bio details are hidden from public view.
            </p>
          </div>
        )}

        {/* Non-private Tab Content */}
        {!isPrivate && (
          <>
            {/* Player: Teams */}
            {!isOwner && activeTab === 'teams' && (
              <ProfileTeamsSection
                teams={playerTeams}
                isLoading={loadingEcosystem}
                isSelf={isSelf}
                onSelectTeam={onSelectTeam}
              />
            )}

            {/* Player: Matches */}
            {!isOwner && activeTab === 'matches' && (
              <ProfileMatchesSection
                matches={playerMatches}
                isLoading={loadingEcosystem}
                isSelf={isSelf}
              />
            )}

            {/* Player: Tournaments */}
            {!isOwner && activeTab === 'tournaments' && (
              <ProfileTournamentsSection
                tournaments={playerTournaments}
                isLoading={loadingEcosystem}
                isSelf={isSelf}
                onSelectTournament={onSelectTournament}
              />
            )}

            {/* Player: Achievements */}
            {!isOwner && activeTab === 'achievements' && (
              <ProfileAchievementsSection
                achievements={playerAchievements}
                sportsmanshipStats={sportsmanshipStats}
                profile={profile}
                isLoading={loadingEcosystem}
              />
            )}

            {/* Owner: Arenas */}
            {isOwner && activeTab === 'arenas' && (
              <OwnerEcosystemSections
                data={ownerEcosystem}
                profile={profile}
                isLoading={loadingEcosystem}
                activeSubSection="arenas"
                onBookTurf={onBookTurf}
              />
            )}

            {/* Owner: Tournaments */}
            {isOwner && activeTab === 'tournaments' && (
              <OwnerEcosystemSections
                data={ownerEcosystem}
                profile={profile}
                isLoading={loadingEcosystem}
                activeSubSection="tournaments"
              />
            )}

            {/* Owner: Offers */}
            {isOwner && activeTab === 'offers' && (
              <OwnerEcosystemSections
                data={ownerEcosystem}
                profile={profile}
                isLoading={loadingEcosystem}
                activeSubSection="offers"
              />
            )}

            {/* Bio & Stats */}
            {activeTab === 'about' && (
              <div className="animate-fade-in space-y-5">
                {/* Bio Card */}
                {profile.bio ? (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed italic">
                    "{profile.bio}"
                  </div>
                ) : isSelf ? (
                  <div
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-4 text-xs text-slate-500 cursor-pointer hover:border-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>Add an athlete bio or playstyle quote to stand out...</span>
                    <span className="text-emerald-400 font-bold">+ Add Bio</span>
                  </div>
                ) : null}

                {/* Sports Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isOwner ? 'Sports Hosted at Arena' : 'Sports Played'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{sportsList.length} Disciplines</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sportsList.map((sport) => {
                      const icon = SPORT_ICONS[sport] || '🏅';
                      return (
                        <div
                          key={sport}
                          className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <span className="text-sm">{icon}</span>
                          <span>{sport}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Player Positions OR Owner Facilities */}
                {!isOwner ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preferred Positions & Roles</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{positionsList.length} Roles</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {positionsList.map((pos) => (
                        <span
                          key={pos}
                          className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-xl"
                        >
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <OwnerEcosystemSections
                    data={ownerEcosystem}
                    profile={profile}
                    isLoading={loadingEcosystem}
                    activeSubSection="info"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Post Modal */}
      {isSelf && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          profile={profile}
          showToast={showToast}
          onPostCreated={() => {
            setActiveTab('posts');
          }}
        />
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        currentUser={myProfile || (user ? ({ uid: user.uid } as any) : null)}
        onPostDeleted={(deletedPostId) => {
          setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
          setSelectedPost(null);
        }}
        onSelectUser={(authorUid) => {
          setSelectedPost(null);
          if (onSelectUser) {
            onSelectUser(authorUid);
          } else {
            setViewingSelectedUserId(authorUid);
          }
        }}
        showToast={showToast}
      />

      {/* Edit Profile Modal */}
      {isSelf && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onSave={handleSaveProfile}
          showToast={showToast || (() => {})}
        />
      )}

      {/* Followers / Following List Modal */}
      <FollowersFollowingModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        targetId={profile.uid}
        targetName={safeDisplayName}
        targetUsername={safeUsername}
        initialTab={followersModalTab}
        onSelectUser={(selectedUid, item) => {
          setFollowersModalOpen(false);
          const isTeam = followersModalTab === 'following' && item?.targetType === 'TEAM';
          if (isTeam && onSelectTeam) {
            onSelectTeam(selectedUid);
            return;
          }
          if (onSelectUser) {
            onSelectUser(selectedUid);
          } else {
            setViewingSelectedUserId(selectedUid);
          }
        }}
        showToast={showToast}
      />

      {/* Selected Profile View Modal */}
      {viewingSelectedUserId && (
        <SocialProfileModal
          isOpen={!!viewingSelectedUserId}
          userId={viewingSelectedUserId}
          onClose={() => setViewingSelectedUserId(null)}
          showToast={showToast}
        />
      )}

      {/* Direct Message Chat Modal */}
      <DirectMessageModal
        isOpen={isDirectMessageOpen}
        targetPlayer={{
          uid: profile.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          role: profile.role,
          username: profile.username,
          privacySettings: profile.privacySettings,
        }}
        onClose={() => setIsDirectMessageOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};

