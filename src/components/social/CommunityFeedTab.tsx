import React, { useState, useEffect } from 'react';
import {
  Flame,
  Heart,
  MessageSquare,
  Share2,
  Plus,
  ShieldCheck,
  MapPin,
  Calendar,
  Building2,
  Tag,
  Send,
  Sparkles,
  Trash2,
  CheckCircle2,
  Filter,
  User,
  ExternalLink,
} from 'lucide-react';
import { SocialPost, OwnerBrandProfile, Turf, Tournament } from '../../types';
import {
  listenSocialPosts,
  createSocialPost,
  toggleLikeSocialPost,
  addSocialComment,
  deleteSocialComment,
  deleteSocialPost,
  listenAllOwnerBrandProfiles,
  getOwnerBrandProfile,
  getFollowingList,
  getTournaments,
} from '../../lib/db';
import { shareContent } from '../../lib/share';
import { useAuth } from '../../context/AuthContext';
import { OwnerBrandProfileModal } from './OwnerBrandProfileModal';
import { SocialProfileModal } from '../profile/SocialProfileModal';

interface CommunityFeedTabProps {
  turfs?: Turf[];
  selectedCity?: string;
  showToast: (text: string, type: 'success' | 'error') => void;
  onNavigateToBooking?: (turfId: string) => void;
}

const SPORTS_LIST = ['ALL', 'Football', 'Cricket', 'Badminton', 'Pickleball', 'Basketball', 'Tennis'];

const SAMPLE_PHOTO_PRESETS = [
  { name: 'Turf Match Under Lights', url: 'https://images.unsplash.com/photo-1529900248461-90567a60518d?w=800' },
  { name: 'Box Cricket Action', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800' },
  { name: 'Squad Post-Match Selfie', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800' },
  { name: 'Badminton Smash', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800' },
  { name: 'Striker Goal Celebration', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800' },
];

export const CommunityFeedTab: React.FC<CommunityFeedTabProps> = ({
  turfs = [],
  selectedCity = 'ALL',
  showToast,
  onNavigateToBooking,
}) => {
  const { user, profile, isAdmin } = useAuth();

  // Feed State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [brandProfiles, setBrandProfiles] = useState<OwnerBrandProfile[]>([]);
  const [myOwnerProfile, setMyOwnerProfile] = useState<OwnerBrandProfile | null>(null);

  // Filters
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [feedMode, setFeedMode] = useState<'ALL' | 'FOLLOWING' | 'OWNERS' | 'PLAYERS'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>(selectedCity);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  // Selected Brand Profile for Modal View
  const [activeBrandModal, setActiveBrandModal] = useState<OwnerBrandProfile | null>(null);
  const [viewSocialProfileUserId, setViewSocialProfileUserId] = useState<string | null>(null);

  // Comments drawer / expandable state: Map of postId -> boolean
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [postCaption, setPostCaption] = useState<string>('');
  const [postMediaUrl, setPostMediaUrl] = useState<string>('');
  const [postSport, setPostSport] = useState<string>('Football');
  const [postCity, setPostCity] = useState<string>(cityFilter !== 'ALL' ? cityFilter : 'Mumbai');
  const [postAuthorType, setPostAuthorType] = useState<'PLAYER' | 'OWNER'>('PLAYER');
  const [postTaggedTurfId, setPostTaggedTurfId] = useState<string>('');
  const [postIsPromo, setPostIsPromo] = useState<boolean>(false);
  const [postPromoTag, setPostPromoTag] = useState<string>('');
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // Initial Load & Subscriptions
  useEffect(() => {
    // 1. Listen to all verified Owner Brand Profiles for stories & modals
    const unsubBrands = listenAllOwnerBrandProfiles((profiles) => {
      setBrandProfiles(profiles);
    });

    // 2. Check if the current user has an owner brand profile
    if (user?.uid) {
      getOwnerBrandProfile(user.uid).then((p) => {
        if (p) {
          setMyOwnerProfile(p);
          // Default to owner author type if they are an owner
          if (profile?.role === 'OWNER') {
            setPostAuthorType('OWNER');
          }
        }
      });

      getFollowingList(user.uid).then((follows) => {
        setFollowingUserIds(follows.map((f) => f.targetId));
      }).catch(console.error);
    }

    return () => unsubBrands();
  }, [user?.uid, profile?.role]);

  const filteredPosts = posts.filter((post) => {
    if (feedMode === 'FOLLOWING') {
      return followingUserIds.includes(post.authorId) || post.authorId === user?.uid;
    }
    return true;
  });
  useEffect(() => {
    setLoading(true);
    const unsubPosts = listenSocialPosts(
      {
        city: cityFilter,
        sport: selectedSport,
        authorType: feedMode === 'OWNERS' ? 'OWNER' : feedMode === 'PLAYERS' ? 'PLAYER' : undefined,
      },
      (list) => {
        setPosts(list);
        setLoading(false);
      }
    );

    return () => unsubPosts();
  }, [cityFilter, selectedSport, feedMode]);

  // Like / High-Five
  const handleLike = async (postId: string) => {
    if (!user) {
      showToast('Please sign in to like this post', 'error');
      return;
    }
    try {
      await toggleLikeSocialPost(postId, user.uid, profile?.displayName || user.displayName || 'An athlete');
    } catch (err) {
      console.error(err);
      showToast('Failed to like post', 'error');
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    if (!user) {
      showToast('Please sign in to comment', 'error');
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      await addSocialComment(postId, {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Player',
        userAvatar: profile?.photoURL || user.photoURL || undefined,
        text,
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error(err);
      showToast('Failed to add comment', 'error');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Delete Comment
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try {
      await deleteSocialComment(postId, commentId, user.uid);
      showToast('Comment deleted', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete comment', 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteSocialPost(postId);
      showToast('Post deleted', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete post', 'error');
    }
  };

  // Share post via native sharing or clipboard
  const handleShare = async (post: SocialPost) => {
    const text = post.caption || `Check out this play on TruFit by ${post.authorName}!`;
    const res = await shareContent({
      title: `${post.authorName}'s post on TruFit`,
      text,
      url: `${window.location.origin}${window.location.pathname}#post=${post.id}`,
    });
    if (res.success && res.method === 'clipboard') {
      showToast('Post link copied to clipboard!', 'success');
    }
  };

  // Create Post Submit
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!postCaption.trim()) {
      showToast('Please write a caption for your post', 'error');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const isOwnerPosting = postAuthorType === 'OWNER' && myOwnerProfile;

      const authorName = isOwnerPosting
        ? myOwnerProfile.brandName
        : profile?.displayName || user.displayName || 'Sports Athlete';

      const authorUsername = isOwnerPosting
        ? myOwnerProfile.handle
        : `@${(profile?.displayName || 'player').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const authorAvatar = isOwnerPosting
        ? myOwnerProfile.logoUrl
        : profile?.photoURL || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const taggedTurf = turfs.find((t) => t.id === postTaggedTurfId);

      await createSocialPost({
        authorId: user.uid,
        authorType: isOwnerPosting ? 'OWNER' : 'PLAYER',
        authorName,
        authorUsername,
        authorAvatar,
        authorRole: isOwnerPosting ? 'Venue Partner' : (profile?.preferredPosition || 'Player'),
        authorCity: postCity,
        isVerified: isOwnerPosting ? myOwnerProfile.isVerified : false,
        ownerTurfId: isOwnerPosting ? (myOwnerProfile.turfIds?.[0] || taggedTurf?.id) : taggedTurf?.id,
        ownerTurfName: isOwnerPosting ? taggedTurf?.name : taggedTurf?.name,
        caption: postCaption.trim(),
        mediaUrl: postMediaUrl.trim() || SAMPLE_PHOTO_PRESETS[0].url,
        sport: postSport,
        city: postCity,
        isPromotional: isOwnerPosting ? postIsPromo : false,
        promoTag: isOwnerPosting && postIsPromo ? postPromoTag.trim() : undefined,
        ctaText: isOwnerPosting && postIsPromo ? 'Book Slot Now' : undefined,
      });

      showToast('Post created and shared to the feed!', 'success');
      setShowCreateModal(false);
      setPostCaption('');
      setPostMediaUrl('');
    } catch (err) {
      console.error(err);
      showToast('Failed to create post. Please try again.', 'error');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Open owner profile modal
  const openOwnerModal = (ownerId: string) => {
    const brand = brandProfiles.find((b) => b.ownerId === ownerId);
    if (brand) {
      setActiveBrandModal(brand);
    } else {
      // Fetch on the fly
      getOwnerBrandProfile(ownerId).then((b) => {
        if (b) setActiveBrandModal(b);
        else showToast('Owner profile details not found', 'error');
      });
    }
  };

  return (
    <div id="tab-community-feed" className="max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-5">
      {/* Top Header & Post Button */}
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 shadow-lg shadow-orange-500/20">
            <Flame className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Community Feed
            </h1>
            <p className="text-[11px] text-slate-400">
              Player highlights, match selfies & venue deals
            </p>
          </div>
        </div>

        <button
          id="btn-open-create-post-modal"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Post</span>
        </button>
      </div>

      {/* Stories / Venue Spotlight Carousel */}
      {brandProfiles.length > 0 && (
        <div className="space-y-1.5 px-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Spotlight Venues & Turfs
          </p>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
            {/* Create Story / Post Bubble */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-emerald-500 flex items-center justify-center bg-slate-900 group-hover:bg-slate-800 transition-all">
                <Plus className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200">
                Add Post
              </span>
            </div>

            {/* Owner Brand Profiles Bubbles */}
            {brandProfiles.map((brand) => (
              <div
                key={brand.id}
                onClick={() => setActiveBrandModal(brand)}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500">
                    <div className="w-full h-full rounded-full bg-slate-950 overflow-hidden p-0.5">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.brandName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-300">
                          <Building2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                  </div>
                  {brand.isVerified && (
                    <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-amber-400 text-slate-950 rounded-full border border-slate-950">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-300 max-w-[64px] truncate text-center group-hover:text-indigo-300">
                  {brand.brandName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar (Sports & Channel) */}
      <div className="space-y-2 px-2">
        {/* Feed Type Switcher */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFeedMode('ALL')}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              feedMode === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFeedMode('FOLLOWING')}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              feedMode === 'FOLLOWING'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setFeedMode('OWNERS')}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              feedMode === 'OWNERS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Owners
          </button>
          <button
            onClick={() => setFeedMode('PLAYERS')}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              feedMode === 'PLAYERS'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Players
          </button>
        </div>

        {/* Sport Tags Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {SPORTS_LIST.map((sport) => {
            const isSelected = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {sport === 'ALL' ? '🏅 All Sports' : sport}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Stream */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading community moments...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Flame className="w-10 h-10 text-orange-400/40 mx-auto" />
          <h3 className="text-sm font-bold text-white">No posts in this category yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {feedMode === 'FOLLOWING'
              ? 'You are not following anyone yet or your followed athletes haven’t posted recently. Follow players and venue partners to build your personalized feed!'
              : 'Be the first to share your screamer goal, squad selfie, or venue announcement!'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Share First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const hasLiked = Boolean(user?.uid && post.likedBy?.includes(user.uid));
            const isAuthor = user?.uid === post.authorId;
            const isCommentsOpen = Boolean(expandedComments[post.id]);

            return (
              <div
                key={post.id}
                id={`post-card-${post.id}`}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* Post Header */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-slate-800/60">
                  <div
                    onClick={() => {
                      setViewSocialProfileUserId(post.authorId);
                    }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                        {post.authorAvatar ? (
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-xs">
                            {post.authorName.charAt(0)}
                          </div>
                        )}
                      </div>
                      {post.isVerified && (
                        <div
                          title="Verified Partner"
                          className="absolute -bottom-1 -right-1 p-0.5 bg-amber-400 text-slate-950 rounded-full border border-slate-900"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Author Details */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                          {post.authorName}
                        </h4>
                        {post.isVerified && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Verified
                          </span>
                        )}
                        {post.authorType === 'OWNER' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                            Venue
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>{post.authorUsername}</span>
                        {post.city && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-rose-400" />
                              {post.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Sport tag & Author delete option */}
                  <div className="flex items-center gap-2">
                    {post.sport && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700/60">
                        {post.sport}
                      </span>
                    )}

                    {(isAuthor || isAdmin) && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Media Image (If present) */}
                {post.mediaUrl && (
                  <div
                    onDoubleClick={() => handleLike(post.id)}
                    className="relative w-full bg-slate-950 aspect-[4/3] sm:aspect-[16/10] overflow-hidden select-none"
                  >
                    <img
                      src={post.mediaUrl}
                      alt="Post visual"
                      className="w-full h-full object-cover"
                    />

                    {/* Promotional Deal Tag */}
                    {post.promoTag && (
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xl flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 fill-slate-950" />
                        {post.promoTag}
                      </div>
                    )}
                  </div>
                )}

                {/* Interaction & Action Bar */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          hasLiked ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${hasLiked ? 'fill-rose-500' : ''}`}
                        />
                        <span>{post.likesCount || 0}</span>
                      </button>

                      {/* Comments Toggle Button */}
                      <button
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-indigo-400 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>{post.commentsCount || 0}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(post)}
                        className="text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                        title="Share Post"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Direct "Book Slot" Action Button (If linked to a turf!) */}
                    {post.ownerTurfId && onNavigateToBooking && (
                      <button
                        onClick={() => onNavigateToBooking(post.ownerTurfId!)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Ground</span>
                      </button>
                    )}
                  </div>

                  {/* Caption & Metadata */}
                  <div className="text-xs text-slate-200 leading-relaxed">
                    <span className="font-black mr-1 text-white">{post.authorName}</span>
                    <span className="whitespace-pre-line">{post.caption}</span>
                  </div>

                  {/* Tagged Turf link (If player tagged a turf) */}
                  {post.ownerTurfName && !post.ownerTurfId && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>Played at: {post.ownerTurfName}</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-[10px] text-slate-500">
                    {new Date(post.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* Expandable Comments Drawer */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      {/* Comments List */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                          {post.comments.map((comment) => {
                            const canDeleteComment = user && (user.uid === comment.userId || user.uid === post.authorId || isAdmin);
                            return (
                              <div
                                key={comment.id}
                                className="flex items-start justify-between gap-2 text-xs bg-slate-950/60 p-2 rounded-xl group/cm"
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0 overflow-hidden text-[10px] flex items-center justify-center font-bold text-slate-400">
                                    {comment.userAvatar ? (
                                      <img
                                        src={comment.userAvatar}
                                        alt={comment.userName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      comment.userName.charAt(0)
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-white mr-1.5">
                                      {comment.userName}
                                    </span>
                                    <span className="text-slate-300">{comment.text}</span>
                                  </div>
                                </div>
                                {canDeleteComment && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="opacity-0 group-hover/cm:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 text-center py-1">
                          No comments yet. Be the first to banter!
                        </p>
                      )}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={
                            !commentInputs[post.id]?.trim() || submittingComment[post.id]
                          }
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer transition-all"
                          title="Send comment"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          id="modal-community-create-post"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Create New Post</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* If user is an Owner, let them pick whether to post as Brand or Player */}
              {myOwnerProfile && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Post Identity:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPostAuthorType('OWNER')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        postAuthorType === 'OWNER'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {myOwnerProfile.brandName} (Official)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostAuthorType('PLAYER')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        postAuthorType === 'PLAYER'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {profile?.displayName || 'My Player Profile'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Caption / Match Highlight *
                </label>
                <textarea
                  required
                  rows={3}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="What's happening on the pitch? Screamer goal, diving save, weekend slot open..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {/* Media URL with quick presets */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  placeholder="Paste image URL (or pick a sample photo below)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
                {/* Sample Photo selector pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPostMediaUrl(preset.url)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                        postMediaUrl === preset.url
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sport & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Sport
                  </label>
                  <select
                    value={postSport}
                    onChange={(e) => setPostSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Pickleball">Pickleball</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Tennis">Tennis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    City
                  </label>
                  <select
                    value={postCity}
                    onChange={(e) => setPostCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                </div>
              </div>

              {/* Tag Turf Ground */}
              {turfs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tag Turf Arena (Optional)
                  </label>
                  <select
                    value={postTaggedTurfId}
                    onChange={(e) => setPostTaggedTurfId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="">None / Not Tagged</option>
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city || t.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If owner posting, allow special promo tag */}
              {postAuthorType === 'OWNER' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      Add Deal / Promotion Tag
                    </span>
                    <input
                      type="checkbox"
                      checked={postIsPromo}
                      onChange={(e) => setPostIsPromo(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>
                  {postIsPromo && (
                    <input
                      type="text"
                      value={postPromoTag}
                      onChange={(e) => setPostPromoTag(e.target.value)}
                      placeholder="e.g. ⚡ 25% OFF NIGHT SLOTS"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold uppercase placeholder-slate-500 outline-none"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingPost ? 'Posting...' : 'Share to Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner Brand Profile Modal */}
      {activeBrandModal && (
        <OwnerBrandProfileModal
          brandProfile={activeBrandModal}
          turfs={turfs}
          onClose={() => setActiveBrandModal(null)}
          onSelectTurfForBooking={onNavigateToBooking}
          showToast={showToast}
        />
      )}

      {/* Social Profile Modal for Athlete or Turf Owner */}
      <SocialProfileModal
        isOpen={!!viewSocialProfileUserId}
        onClose={() => setViewSocialProfileUserId(null)}
        userId={viewSocialProfileUserId}
        showToast={showToast}
      />
    </div>
  );
};
