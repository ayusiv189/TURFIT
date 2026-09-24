import React, { useState, useEffect } from 'react';
import { SocialPost, UserProfile, SocialComment } from '../../types';
import {
  deleteSocialPost,
  toggleLikeSocialPost,
  addSocialComment,
  deleteSocialComment,
} from '../../lib/db';
import { deletePostMedia } from '../../lib/mediaUpload';
import { shareContent } from '../../lib/share';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  X,
  Trash2,
  Heart,
  MessageCircle,
  MapPin,
  Loader2,
  AlertTriangle,
  Film,
  Sparkles,
  Share2,
  Check,
  Send,
  User,
  CornerDownRight,
} from 'lucide-react';

interface PostDetailModalProps {
  post: SocialPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onPostDeleted?: (postId: string) => void;
  onSelectUser?: (userId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post: initialPost,
  isOpen,
  onClose,
  currentUser,
  onPostDeleted,
  onSelectUser,
  showToast,
}) => {
  const [currentPost, setCurrentPost] = useState<SocialPost | null>(initialPost);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [shareFeedback, setShareFeedback] = useState(false);

  // Comment input state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Real-time listener for the active post to receive live likes and comments
  useEffect(() => {
    if (!initialPost?.id || !isOpen) {
      setCurrentPost(initialPost);
      return;
    }

    setCurrentPost(initialPost);
    const postRef = doc(db, 'socialPosts', initialPost.id);
    const unsub = onSnapshot(
      postRef,
      (snap) => {
        if (snap.exists()) {
          const liveData = { id: snap.id, ...snap.data() } as SocialPost;
          setCurrentPost(liveData);
          if (currentUser) {
            setIsLiked(liveData.likedBy?.includes(currentUser.uid) || false);
            setLikesCount(liveData.likesCount || 0);
          }
        }
      },
      (err) => {
        console.warn('Realtime post snapshot notice:', err);
      }
    );

    return () => unsub();
  }, [initialPost?.id, isOpen, currentUser?.uid]);

  useEffect(() => {
    if (currentPost && currentUser) {
      setIsLiked(currentPost.likedBy?.includes(currentUser.uid) || false);
      setLikesCount(currentPost.likesCount || 0);
    }
    setShowConfirmDelete(false);
    setIsDeleting(false);
    setCommentText('');
  }, [initialPost, currentUser]);

  if (!isOpen || !currentPost) return null;

  const isAuthor = currentUser?.uid === currentPost.authorId;

  const handleToggleLike = async () => {
    if (!currentUser) {
      showToast?.('Please sign in to like posts', 'info');
      return;
    }
    try {
      const nowLiked = !isLiked;
      setIsLiked(nowLiked);
      setLikesCount((prev) => (nowLiked ? prev + 1 : Math.max(0, prev - 1)));
      await toggleLikeSocialPost(currentPost.id, currentUser.uid, currentUser.displayName);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update
      setIsLiked(!isLiked);
      setLikesCount((prev) => (!isLiked ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleDelete = async () => {
    if (!isAuthor) return;
    setIsDeleting(true);
    try {
      if (currentPost.mediaUrl) {
        await deletePostMedia(currentPost.mediaUrl);
      }
      await deleteSocialPost(currentPost.id, currentPost.authorId);
      showToast?.('Post deleted successfully', 'success');
      onPostDeleted?.(currentPost.id);
      onClose();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      showToast?.(err.message || 'Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleShare = async () => {
    const title = `${currentPost.authorName}'s post on TruFit`;
    const text = currentPost.caption || `Check out this play on TruFit by ${currentPost.authorName}!`;
    const shareUrl = `${window.location.origin}${window.location.pathname}#post=${currentPost.id}`;

    const res = await shareContent({
      title,
      text,
      url: shareUrl,
    });

    if (res.success) {
      setShareFeedback(true);
      if (res.method === 'clipboard') {
        showToast?.('Post link copied to clipboard!', 'info');
      }
      setTimeout(() => setShareFeedback(false), 2000);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast?.('Please sign in to comment', 'info');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    try {
      await addSocialComment(currentPost.id, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'TruFit Athlete',
        userAvatar: currentUser.photoURL || undefined,
        text: trimmed,
      });
      setCommentText('');
      showToast?.('Comment posted!', 'success');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      showToast?.(err.message || 'Failed to post comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;
    setDeletingCommentId(commentId);
    try {
      await deleteSocialComment(currentPost.id, commentId, currentUser.uid);
      showToast?.('Comment removed', 'success');
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      showToast?.(err.message || 'Failed to delete comment', 'error');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatCommentDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const isVideo =
    currentPost.mediaType === 'VIDEO' ||
    (currentPost.mediaUrl &&
      (currentPost.mediaUrl.endsWith('.mp4') ||
        currentPost.mediaUrl.endsWith('.webm') ||
        currentPost.mediaUrl.includes('video')));

  const commentsList = currentPost.comments || [];

  return (
    <div
      id="post-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        id="post-detail-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
          <div
            onClick={() => {
              if (onSelectUser && currentPost.authorId) {
                onSelectUser(currentPost.authorId);
              }
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold overflow-hidden flex-shrink-0 group-hover:border-emerald-400 transition-colors">
              {currentPost.authorAvatar ? (
                <img
                  src={currentPost.authorAvatar}
                  alt={currentPost.authorName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentPost.authorName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{currentPost.authorName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                  {currentPost.authorType === 'OWNER' ? 'VENUE' : 'ATHLETE'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {currentPost.authorUsername && <span>@{currentPost.authorUsername}</span>}
                <span>•</span>
                <span>{new Date(currentPost.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                {currentPost.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {currentPost.city}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthor && !showConfirmDelete && (
              <button
                type="button"
                id="btn-delete-post"
                onClick={() => setShowConfirmDelete(true)}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showConfirmDelete && (
          <div className="bg-rose-950/80 border-b border-rose-500/40 p-3.5 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-200 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Are you sure you want to permanently delete this post?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-3 py-1 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Media & Content Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
          {/* Media Player or Image */}
          {currentPost.mediaUrl && (
            <div className="bg-black/95 flex items-center justify-center max-h-[460px] overflow-hidden">
              {isVideo ? (
                <video
                  src={currentPost.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[460px] object-contain"
                />
              ) : (
                <img
                  src={currentPost.mediaUrl}
                  alt="Post visual"
                  className="w-full max-h-[460px] object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}

          {/* Post Details & Caption */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Sport & Tags */}
            {currentPost.sport && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {currentPost.sport}
                </span>
                {isVideo && (
                  <span className="text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Film className="w-3 h-3 text-indigo-400" />
                    Video Clip
                  </span>
                )}
              </div>
            )}

            {/* Caption */}
            {currentPost.caption && (
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium">
                {currentPost.caption}
              </p>
            )}

            {/* Actions Bar (Like, Comments Count, Share) */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  type="button"
                  id="btn-like-post"
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 font-bold transition-all transform active:scale-95 cursor-pointer ${
                    isLiked ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                    }`}
                  />
                  <span>{likesCount} Likes</span>
                </button>

                {/* Comment Counter Indicator */}
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <MessageCircle className="w-4 h-4 text-slate-500" />
                  <span>{commentsList.length} Comments</span>
                </div>
              </div>

              {/* Native / Cross-Platform Share */}
              <button
                type="button"
                id="btn-share-post"
                onClick={handleShare}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Share post"
              >
                {shareFeedback ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span className="font-semibold">{shareFeedback ? 'Shared!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Comments Feed Section */}
          <div className="p-4 sm:p-5 space-y-4 bg-slate-950/40">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Comments ({commentsList.length})</span>
            </h4>

            {commentsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 border border-dashed border-slate-800/80 rounded-2xl">
                No comments yet. Be the first to spark the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {commentsList.map((comm) => {
                  const canDelete =
                    currentUser &&
                    (currentUser.uid === comm.userId || currentUser.uid === currentPost.authorId);
                  const isCommentDeleting = deletingCommentId === comm.id;

                  return (
                    <div
                      key={comm.id}
                      className="flex items-start justify-between gap-3 bg-slate-900/80 border border-slate-800/60 p-3 rounded-2xl transition-colors hover:border-slate-700/60"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-xs font-bold overflow-hidden flex-shrink-0 mt-0.5">
                          {comm.userAvatar ? (
                            <img
                              src={comm.userAvatar}
                              alt={comm.userName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            comm.userName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {comm.userName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatCommentDate(comm.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words whitespace-pre-line font-normal">
                            {comm.text}
                          </p>
                        </div>
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          disabled={isCommentDeleting}
                          onClick={() => handleDeleteComment(comm.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors flex-shrink-0 cursor-pointer"
                          title="Delete Comment"
                        >
                          {isCommentDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment Input Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-xs font-bold overflow-hidden flex-shrink-0">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                maxLength={400}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={currentUser ? 'Write a comment on this play...' : 'Sign in to add a comment...'}
                disabled={!currentUser || isSubmittingComment}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors pr-10 disabled:opacity-50"
              />
              {commentText.length > 0 && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-500">
                  {400 - commentText.length}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!currentUser || !commentText.trim() || isSubmittingComment}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-emerald-500/10"
            >
              {isSubmittingComment ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Post</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
