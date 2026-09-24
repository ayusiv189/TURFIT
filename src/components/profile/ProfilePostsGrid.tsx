import React, { useState } from 'react';
import { SocialPost } from '../../types';
import {
  Grid,
  List,
  Film,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  Camera,
  Lock,
} from 'lucide-react';

interface ProfilePostsGridProps {
  posts: SocialPost[];
  isLoading?: boolean;
  isSelf?: boolean;
  isPrivate?: boolean;
  onPostClick: (post: SocialPost) => void;
  onCreatePostClick?: () => void;
}

export const ProfilePostsGrid: React.FC<ProfilePostsGridProps> = ({
  posts,
  isLoading = false,
  isSelf = false,
  isPrivate = false,
  onPostClick,
  onCreatePostClick,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (isPrivate) {
    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center my-4 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white">Posts are Private</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Follow this athlete or venue to request access to their shared match highlights and sports posts.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3 py-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-slate-900 border border-slate-800/80 rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center my-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">
            {isSelf ? 'Share Your First Sports Moment' : 'No Posts Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {isSelf
              ? 'Post match highlights, skills drills, turf photos, or announcements for the TruFit community to see.'
              : 'This profile has not published any photos or game highlights yet.'}
          </p>
        </div>
        {isSelf && onCreatePostClick && (
          <button
            type="button"
            id="btn-empty-create-post"
            onClick={onCreatePostClick}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Post</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar: Post Count & Layout Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">
            {posts.length} {posts.length === 1 ? 'Sports Post' : 'Sports Posts'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View (Modern 3-Column Sports Visual Grid) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {posts.map((post) => {
            const isVideo =
              post.mediaType === 'VIDEO' ||
              (post.mediaUrl &&
                (post.mediaUrl.endsWith('.mp4') ||
                  post.mediaUrl.endsWith('.webm') ||
                  post.mediaUrl.includes('video')));

            return (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                className="group relative aspect-square bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer shadow-md transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
              >
                {post.mediaUrl ? (
                  isVideo ? (
                    <video
                      src={post.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption || 'Sports post'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )
                ) : (
                  // Text-only post visual background
                  <div className="w-full h-full p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {post.sport || 'TruFit'}
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-3 font-medium leading-relaxed">
                      {post.caption}
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Video Indicator Badge */}
                {isVideo && (
                  <div className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 backdrop-blur-sm text-white">
                    <Film className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Hover Overlay with Likes/Comments preview */}
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-center gap-2">
                  <div className="flex items-center gap-3 text-white text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      {post.likesCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      {post.commentsCount || 0}
                    </span>
                  </div>
                  {post.sport && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      {post.sport}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {posts.map((post) => {
            const isVideo =
              post.mediaType === 'VIDEO' ||
              (post.mediaUrl &&
                (post.mediaUrl.endsWith('.mp4') ||
                  post.mediaUrl.endsWith('.webm') ||
                  post.mediaUrl.includes('video')));

            return (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer hover:bg-slate-950/90 shadow-md group"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {post.sport || 'Sports'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1 group-hover:text-rose-400 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                      {post.likesCount || 0}
                    </span>
                    <span className="flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.commentsCount || 0}
                    </span>
                  </div>
                </div>

                {post.caption && (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-3 mb-3">
                    {post.caption}
                  </p>
                )}

                {post.mediaUrl && (
                  <div className="relative rounded-xl overflow-hidden bg-black/60 max-h-56 border border-slate-800/80">
                    {isVideo ? (
                      <video
                        src={post.mediaUrl}
                        className="w-full max-h-56 object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={post.mediaUrl}
                        alt="Media attachment"
                        className="w-full max-h-56 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {isVideo && (
                      <div className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 text-white">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
