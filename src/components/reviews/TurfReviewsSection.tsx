import React, { useState, useEffect } from 'react';
import { TurfReview, TurfRatingStats } from '../../types';
import { getTurfReviews, calculateTurfRatingStats, reportTurfReview } from '../../lib/phase3';
import { formatDateString } from '../../lib/utils';
import { Star, MessageSquare, Flag, CheckCircle2, User, ShieldAlert } from 'lucide-react';

interface TurfReviewsSectionProps {
  turfId: string;
  turfName: string;
  showToast?: (text: string, type?: 'success' | 'error') => void;
}

export const TurfReviewsSection: React.FC<TurfReviewsSectionProps> = ({
  turfId,
  turfName,
  showToast,
}) => {
  const [reviews, setReviews] = useState<TurfReview[]>([]);
  const [stats, setStats] = useState<TurfRatingStats>({
    averageRating: 0,
    totalReviews: 0,
    starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    starPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');

  const loadReviews = async () => {
    try {
      setLoading(true);
      const list = await getTurfReviews(turfId);
      setReviews(list);
      setStats(calculateTurfRatingStats(list));
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (turfId) {
      loadReviews();
    }
  }, [turfId]);

  const handleReport = async (reviewId: string) => {
    if (!reportReason.trim()) return;
    try {
      await reportTurfReview(reviewId, reportReason.trim());
      showToast?.('Review reported for moderation.', 'success');
      setReportingId(null);
      setReportReason('');
      loadReviews();
    } catch (err) {
      showToast?.('Failed to report review', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center text-xs text-slate-500">
        <span className="inline-block w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mr-2" />
        Loading verified player reviews...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Ratings Summary Card */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* Big Rating Number */}
          <div className="text-center sm:text-left sm:border-r border-slate-800 sm:pr-6">
            <div className="text-4xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <span>{stats.totalReviews > 0 ? stats.averageRating : '—'}</span>
              <Star className="w-8 h-8 text-amber-400 fill-amber-400 inline" />
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {stats.totalReviews > 0
                ? `Based on ${stats.totalReviews} verified booking ${stats.totalReviews === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet for this turf'}
            </p>
          </div>

          {/* Star Distribution Bars */}
          <div className="sm:col-span-2 space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-bold text-slate-400 flex items-center gap-1 justify-end">
                  {star} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </span>
                <div className="flex-1 bg-slate-800/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.starPercentages[star]}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[11px] font-semibold text-slate-400">
                  {stats.starPercentages[star]}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Player Feedback ({reviews.length})</span>
        </h4>

        {reviews.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-slate-800/50">
            <p className="text-xs text-slate-400">No reviews yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Players who complete bookings here will share their experience!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs overflow-hidden">
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
                        <span className="text-xs font-bold text-white">{r.playerName}</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Verified Booking</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">{formatDateString(r.createdAt.split('T')[0])}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-white">{r.rating}.0</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{r.comment}</p>

                {/* Owner Response if available */}
                {r.ownerResponse && (
                  <div className="bg-indigo-950/30 border-l-2 border-indigo-500 rounded-r-xl p-3 text-xs">
                    <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-1">
                      <span>Owner Response</span>
                      {r.ownerResponseAt && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          {formatDateString(r.ownerResponseAt.split('T')[0])}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-xs">{r.ownerResponse}</p>
                  </div>
                )}

                {/* Actions (Report) */}
                <div className="flex items-center justify-end pt-1">
                  {reportingId === r.id ? (
                    <div className="flex items-center gap-2 w-full mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Reason (e.g. spam, offensive language)..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <button
                        onClick={() => handleReport(r.id)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => setReportingId(null)}
                        className="text-slate-400 text-xs hover:text-white px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReportingId(r.id)}
                      className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      title="Report inappropriate content"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
