import React, { useState } from 'react';
import { UserProfile, PlayerBadgeType } from '../../types';
import { submitPlayerRating } from '../../lib/phase3';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Star,
  Award,
  Sparkles,
  CheckCircle2,
  Heart,
  Shield,
  Clock,
  Flame,
  Check,
} from 'lucide-react';

interface RatePlayerModalProps {
  isOpen: boolean;
  targetPlayer: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
    sport?: string;
  } | null;
  matchContext?: {
    matchId?: string;
    lobbyId?: string;
    turfName?: string;
    sport?: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

const BADGE_OPTIONS: { id: PlayerBadgeType; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'Fair Play Champion', label: 'Fair Play Champion', icon: '🌟', desc: 'Played with high respect & honesty', color: '#38bdf8' },
  { id: 'Playmaker / MVP', label: 'Playmaker / MVP', icon: '👑', desc: 'Game-defining passes & clutch plays', color: '#f59e0b' },
  { id: 'Team Motivator', label: 'Team Motivator', icon: '🤝', desc: 'Kept squad morale high throughout', color: '#10b981' },
  { id: 'Defensive Wall', label: 'Defensive Wall', icon: '🛡️', desc: 'Rock solid defense & coverage', color: '#818cf8' },
  { id: 'Clockwork Punctual', label: 'Clockwork Punctual', icon: '⏱️', desc: 'Arrived warm & pitch-ready on time', color: '#06b6d4' },
  { id: 'Clutch Performer', label: 'Clutch Performer', icon: '🔥', desc: 'Stepped up under high match pressure', color: '#ef4444' },
  { id: 'Tactical Genius', label: 'Tactical Genius', icon: '🎯', desc: 'Masterful game positioning & IQ', color: '#a855f7' },
  { id: 'Sharpshooter', label: 'Sharpshooter', icon: '⚡', desc: 'Deadly accuracy & finishing instincts', color: '#ec4899' },
];

export const RatePlayerModal: React.FC<RatePlayerModalProps> = ({
  isOpen,
  targetPlayer,
  matchContext,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [sportsmanshipRating, setSportsmanshipRating] = useState<number>(5);
  const [skillRating, setSkillRating] = useState<number>(5);
  const [punctualityRating, setPunctualityRating] = useState<number>(5);
  const [selectedBadges, setSelectedBadges] = useState<PlayerBadgeType[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetPlayer) return null;

  const toggleBadge = (badge: PlayerBadgeType) => {
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter((b) => b !== badge));
    } else {
      if (selectedBadges.length >= 3) return; // Limit to 3 badges
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Please sign in to rate athletes.');
      return;
    }

    if (user.uid === targetPlayer.uid) {
      setError('You cannot rate yourself.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reviewerName = profile?.displayName || user.displayName || 'Anonymous Teammate';
      await submitPlayerRating({
        targetId: targetPlayer.uid,
        targetName: targetPlayer.displayName,
        targetPhotoURL: targetPlayer.photoURL || null,
        reviewerId: user.uid,
        reviewerName,
        reviewerPhotoURL: profile?.photoURL || user.photoURL || null,
        sportsmanshipRating,
        skillRating,
        punctualityRating,
        badges: selectedBadges,
        feedback: feedback.trim(),
        matchId: matchContext?.matchId,
        lobbyId: matchContext?.lobbyId,
        turfName: matchContext?.turfName,
        sport: matchContext?.sport || targetPlayer.sport || 'Sports',
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Error submitting player rating:', err);
      setError(err?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Rate Athlete Sportsmanship</h3>
              <p className="text-xs text-slate-400">Verify teammate fair play & award badges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">Rating Submitted!</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Thank you for fostering fair play. +15 TurFit Reward Points have been credited to your account!
              </p>
            </div>
          ) : (
            <>
              {/* Target Athlete Banner */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {targetPlayer.photoURL ? (
                    <img
                      src={targetPlayer.photoURL}
                      alt={targetPlayer.displayName}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                      {targetPlayer.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">{targetPlayer.displayName}</h4>
                    <p className="text-xs text-slate-400">
                      {matchContext?.turfName ? `${matchContext.turfName} • ` : ''}
                      {matchContext?.sport || targetPlayer.sport || 'Sports Match'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  +15 Pts Reward
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Sportsmanship Star Rating */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    Sportsmanship & Fair Play
                  </label>
                  <span className="text-xs font-extrabold text-amber-400">{sportsmanshipRating}.0 ★</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSportsmanshipRating(star)}
                      className={`flex-1 py-2 rounded-lg border flex justify-center items-center transition-all ${
                        star <= sportsmanshipRating
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 hover:border-slate-700'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${star <= sportsmanshipRating ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill & Game IQ Rating */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Gameplay, Teamplay & IQ
                  </label>
                  <span className="text-xs font-extrabold text-indigo-400">{skillRating}.0 ★</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSkillRating(star)}
                      className={`flex-1 py-2 rounded-lg border flex justify-center items-center transition-all ${
                        star <= skillRating
                          ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-400 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 hover:border-slate-700'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${star <= skillRating ? 'fill-indigo-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Punctuality Rating */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Punctuality & Readiness
                  </label>
                  <span className="text-xs font-extrabold text-cyan-400">{punctualityRating}.0 ★</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPunctualityRating(star)}
                      className={`flex-1 py-2 rounded-lg border flex justify-center items-center transition-all ${
                        star <= punctualityRating
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 hover:border-slate-700'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${star <= punctualityRating ? 'fill-cyan-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges selection */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Award Badges (Select up to 3)
                  </label>
                  <span className="text-[11px] text-slate-400">{selectedBadges.length}/3 selected</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BADGE_OPTIONS.map((badge) => {
                    const isSelected = selectedBadges.includes(badge.id);
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => toggleBadge(badge.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 relative ${
                          isSelected
                            ? 'bg-slate-800/90 border-indigo-500 ring-1 ring-indigo-500/40'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl leading-none mt-0.5">{badge.icon}</span>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-bold text-white truncate">{badge.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{badge.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center absolute top-2 right-2">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Encouraging Feedback / Teammate Note (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Incredible attitude on the pitch! Great passes and team spirit."
                  rows={2}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/90">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-950/40"
            >
              {submitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  Submit Rating (+15 Pts)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
