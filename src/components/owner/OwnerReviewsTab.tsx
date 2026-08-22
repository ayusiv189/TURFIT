import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TurfReview, Turf } from '../../types';
import { getOwnerTurfs } from '../../lib/db';
import { getTurfReviews, respondToTurfReview } from '../../lib/phase3';
import { formatDateString } from '../../lib/utils';
import {
  Star,
  MessageSquare,
  CornerDownRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Filter,
} from 'lucide-react';

interface OwnerReviewsTabProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const OwnerReviewsTab: React.FC<OwnerReviewsTabProps> = ({ showToast }) => {
  const { user } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState<string>('ALL');
  const [reviews, setReviews] = useState<TurfReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Response state
  const [respondingReviewId, setRespondingReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadTurfsAndReviews = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const ownerTurfs = await getOwnerTurfs(user.uid);
      setTurfs(ownerTurfs);

      const allReviewLists = await Promise.all(
        ownerTurfs.map((t) => getTurfReviews(t.id))
      );
      const combined = allReviewLists.flat();
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(combined);
    } catch (err) {
      console.error('Failed to load owner reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurfsAndReviews();
  }, [user]);

  const filteredReviews = reviews.filter((r) =>
    selectedTurfId === 'ALL' ? true : r.turfId === selectedTurfId
  );

  const handleSendResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      await respondToTurfReview(reviewId, responseText.trim());
      showToast?.('Response posted to review!', 'success');
      setRespondingReviewId(null);
      setResponseText('');
      await loadTurfsAndReviews();
    } catch (err) {
      showToast?.('Failed to send response', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Loading athlete feedback and turf ratings...
      </div>
    );
  }

  const averageRating =
    filteredReviews.length > 0
      ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Player Ratings & Reviews</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Turf Reputation & Feedback</h2>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Average Score</span>
              <div className="flex items-center gap-1.5 text-xl font-black text-white">
                <span>{averageRating}</span>
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Verified Reviews</span>
              <span className="text-xl font-black text-indigo-400">{filteredReviews.length}</span>
            </div>
          </div>
        </div>

        {/* Turf Filter */}
        {turfs.length > 1 && (
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter by Turf:</span>
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Turfs ({reviews.length} reviews)</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 text-xs text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No reviews received yet for this selection.
          </div>
        ) : (
          filteredReviews.map((r) => (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs overflow-hidden">
                    {r.playerPhotoURL ? (
                      <img
                        src={r.playerPhotoURL}
                        alt={r.playerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      r.playerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-xs">{r.playerName}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">• {r.turfName}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{formatDateString(r.createdAt.split('T')[0])}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-white">{r.rating}.0</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                "{r.comment}"
              </p>

              {/* Existing Owner Response */}
              {r.ownerResponse && (
                <div className="bg-indigo-950/30 border-l-2 border-indigo-500 rounded-r-xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Your Public Response</span>
                    </span>
                    {r.ownerResponseAt && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        {formatDateString(r.ownerResponseAt.split('T')[0])}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-xs">{r.ownerResponse}</p>
                </div>
              )}

              {/* Respond form */}
              {!r.ownerResponse && (
                <div>
                  {respondingReviewId === r.id ? (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 mt-2">
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write a professional response to thank the player or address feedback..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setRespondingReviewId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendResponse(r.id)}
                          disabled={submitting || !responseText.trim()}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-950/50 disabled:opacity-50"
                        >
                          {submitting ? 'Posting...' : 'Post Response'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRespondingReviewId(r.id);
                        setResponseText('');
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Reply to this review</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
