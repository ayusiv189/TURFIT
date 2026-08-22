import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Booking } from '../../types';
import { createTurfReview } from '../../lib/phase3';
import { Star, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onReviewSubmitted: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  booking,
  onReviewSubmitted,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) {
      setError('Please provide a brief comment describing your experience.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createTurfReview({
        turfId: booking.turfId,
        turfName: booking.turfName,
        bookingId: booking.id,
        playerId: user.uid,
        playerName: profile?.displayName || 'Verified Player',
        playerPhotoURL: profile?.photoURL || null,
        rating,
        comment: comment.trim(),
      });

      showToast('Thank you! Your verified review has been published.', 'success');
      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Rate & Review Turf</h3>
            <p className="text-xs text-slate-400">{booking.turfName} • {booking.arenaName}</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-5 text-xs text-slate-300">
          <span className="text-indigo-400 font-bold">Booking #{booking.bookingId || booking.id.slice(0, 8)}</span>
          <p className="text-slate-400 mt-0.5">{booking.date} at {booking.startTime} ({booking.sport})</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Overall Rating (1 to 5 Stars)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        active ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-sm font-bold text-white">
                {rating === 5 && 'Outstanding! 🌟'}
                {rating === 4 && 'Very Good 👍'}
                {rating === 3 && 'Average ⚡'}
                {rating === 2 && 'Below Average ⚠️'}
                {rating === 1 && 'Poor Experience 👎'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Your Review & Feedback
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other players about the turf quality, lighting, maintenance, changing rooms, and staff..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-950/50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
