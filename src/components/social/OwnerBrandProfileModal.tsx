import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Phone,
  MessageCircle,
  Instagram,
  CheckCircle2,
  Calendar,
  Sparkles,
  Heart,
  MessageSquare,
  Building2,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { OwnerBrandProfile, SocialPost, Turf } from '../../types';
import { toggleFollowOwnerBrand, listenSocialPosts } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { FollowersFollowingModal } from '../profile/FollowersFollowingModal';
import { SocialProfileModal } from '../profile/SocialProfileModal';
import { DirectMessageModal } from '../messaging/DirectMessageModal';

interface OwnerBrandProfileModalProps {
  brandProfile: OwnerBrandProfile;
  turfs?: Turf[];
  onClose: () => void;
  onSelectTurfForBooking?: (turfId: string) => void;
  showToast?: (text: string, type: 'success' | 'error') => void;
}

export const OwnerBrandProfileModal: React.FC<OwnerBrandProfileModalProps> = ({
  brandProfile,
  turfs = [],
  onClose,
  onSelectTurfForBooking,
  showToast,
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OwnerBrandProfile>(brandProfile);
  const [isFollowing, setIsFollowing] = useState<boolean>(
    Boolean(user?.uid && brandProfile.followers?.includes(user.uid))
  );
  const [followersCount, setFollowersCount] = useState<number>(brandProfile.followersCount || 0);
  const [activeTab, setActiveTab] = useState<'posts' | 'turfs'>('posts');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [viewingSelectedUserId, setViewingSelectedUserId] = useState<string | null>(null);
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState<boolean>(false);

  // Sync following state
  useEffect(() => {
    setProfile(brandProfile);
    setIsFollowing(Boolean(user?.uid && brandProfile.followers?.includes(user.uid)));
    setFollowersCount(brandProfile.followersCount || 0);
  }, [brandProfile, user?.uid]);

  // Load posts by this owner
  useEffect(() => {
    const unsubscribe = listenSocialPosts(
      { authorType: 'OWNER' },
      (allOwnerPosts) => {
        const ownerPosts = allOwnerPosts.filter((p) => p.authorId === profile.ownerId);
        setPosts(ownerPosts);
        setLoadingPosts(false);
      }
    );
    return () => unsubscribe();
  }, [profile.ownerId]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast?.('Please sign in to follow this venue', 'error');
      return;
    }
    try {
      const nowFollowed = await toggleFollowOwnerBrand(profile.id, user.uid);
      setIsFollowing(nowFollowed);
      setFollowersCount((prev) => (nowFollowed ? prev + 1 : Math.max(0, prev - 1)));
      showToast?.(
        nowFollowed
          ? `You are now following ${profile.brandName}!`
          : `Unfollowed ${profile.brandName}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast?.('Failed to update follow status', 'error');
    }
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin + `#owner=${profile.handle}`);
      showToast?.('Profile link copied to clipboard!', 'success');
    }
  };

  // Associated turfs
  const linkedTurfs = turfs.filter(
    (t) => profile.turfIds?.includes(t.id) || t.ownerId === profile.ownerId
  );

  return (
    <div
      id="modal-owner-brand-profile"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Cover Header Banner */}
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt={profile.brandName}
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-900/60 to-emerald-900/60">
              <Building2 className="w-16 h-16 text-indigo-400/30" />
            </div>
          )}

          {/* Top action bar on cover */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={handleShareProfile}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 backdrop-blur-sm transition-all cursor-pointer"
              title="Share Profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 backdrop-blur-sm transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile Info Header */}
        <div className="px-5 sm:px-6 pt-0 pb-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-3">
            {/* Logo */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-4 border-slate-900 overflow-hidden shadow-xl flex items-center justify-center">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt={profile.brandName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-10 h-10 text-emerald-400" />
                )}
              </div>
              {profile.isVerified && (
                <div
                  title="Verified Official Venue Partner"
                  className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full border-2 border-slate-900 shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-follow-owner-brand"
                onClick={handleToggleFollow}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Following
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Follow Venue
                  </>
                )}
              </button>

              {user?.uid && (profile.ownerUid || profile.id) && user.uid !== (profile.ownerUid || profile.id) && (
                <button
                  type="button"
                  onClick={() => setIsDirectMessageOpen(true)}
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-md"
                  title="Message Venue Owner on TruFit"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}

              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                    profile.brandName
                  )},%20I%20found%20you%20on%20TurfFit!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}

              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-all cursor-pointer"
                  title="Call Venue"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}

              {profile.instagramHandle && (
                <a
                  href={`https://instagram.com/${profile.instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 transition-all cursor-pointer"
                  title="Instagram Page"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Name & Handle */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {profile.brandName}
              </h2>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Venue
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-300 font-mono font-medium mt-0.5">
              {profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`}
            </p>
          </div>

          {/* Tagline & Bio */}
          {profile.tagline && (
            <p className="text-xs text-emerald-400 font-semibold mt-2">
              "{profile.tagline}"
            </p>
          )}
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
            {profile.bio || 'Welcome to our official sports facility on TurfFit.'}
          </p>

          {/* Details & Location */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
            {profile.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {profile.city} {profile.address ? `• ${profile.address}` : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowFollowersModal(true)}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 font-bold cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {followersCount} {followersCount === 1 ? 'Follower' : 'Followers'}
            </button>
          </div>

          {/* Amenities Pills */}
          {profile.amenities && profile.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  ✓ {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Posts vs Turfs) */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'posts'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Posts & Deals ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('turfs')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'turfs'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Turfs & Arenas ({linkedTurfs.length})
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-5 overflow-y-auto flex-1 max-h-[45vh] no-scrollbar">
          {activeTab === 'posts' ? (
            <div>
              {loadingPosts ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading posts...
                </div>
              ) : posts.length === 0 ? (
                <div className="py-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    No posts shared by this venue yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      {post.mediaUrl && (
                        <div className="h-40 bg-slate-900 overflow-hidden relative">
                          <img
                            src={post.mediaUrl}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                          {post.promoTag && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                              {post.promoTag}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {post.caption}
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 border-t border-slate-900 pt-2">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" />
                            {post.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            {post.commentsCount}
                          </span>
                          {post.ownerTurfId && onSelectTurfForBooking && (
                            <button
                              onClick={() => {
                                onSelectTurfForBooking(post.ownerTurfId!);
                                onClose();
                              }}
                              className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2 py-1 rounded-md font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              Book
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {linkedTurfs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active turfs listed currently.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedTurfs.map((turf) => (
                    <div
                      key={turf.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                          {turf.images && turf.images.length > 0 ? (
                            <img
                              src={turf.images[0]}
                              alt={turf.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Building2 className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{turf.name}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {turf.location}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {turf.sports && turf.sports.map((sp, i) => (
                              <span
                                key={i}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                              >
                                {sp}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {onSelectTurfForBooking && (
                        <button
                          onClick={() => {
                            onSelectTurfForBooking(turf.id);
                            onClose();
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Book Slots
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showFollowersModal && (
        <FollowersFollowingModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          targetId={profile.ownerUid || profile.id}
          targetName={profile.brandName}
          initialTab="followers"
          onSelectUser={(selectedUid) => {
            setShowFollowersModal(false);
            setViewingSelectedUserId(selectedUid);
          }}
          showToast={showToast}
        />
      )}

      {viewingSelectedUserId && (
        <SocialProfileModal
          isOpen={!!viewingSelectedUserId}
          userId={viewingSelectedUserId}
          onClose={() => setViewingSelectedUserId(null)}
          showToast={showToast}
        />
      )}

      {isDirectMessageOpen && (
        <DirectMessageModal
          isOpen={isDirectMessageOpen}
          targetPlayer={{
            uid: profile.ownerUid || profile.id,
            displayName: profile.brandName,
            photoURL: profile.logoUrl || null,
            role: 'OWNER',
            username: profile.instagramHandle || '',
          }}
          onClose={() => setIsDirectMessageOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
