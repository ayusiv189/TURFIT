import React from 'react';
import { PlayerAchievementItem } from '../../lib/profileEcosystem';
import { UserProfile } from '../../types';
import { Award, Star, ShieldCheck, Heart, Sparkles, CheckCircle2, Lock, Flame } from 'lucide-react';

interface ProfileAchievementsSectionProps {
  achievements: PlayerAchievementItem[];
  sportsmanshipStats: any;
  profile: UserProfile;
  isLoading: boolean;
}

export const ProfileAchievementsSection: React.FC<ProfileAchievementsSectionProps> = ({
  achievements,
  sportsmanshipStats,
  profile,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Verifying sports achievements & badges...</p>
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sportsmanship Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                Verified Sportsmanship Rating
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {(profile.sportsmanshipRating || sportsmanshipStats?.averageRating || 5.0).toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">/ 5.0 Stars</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-300 font-semibold block">
              {profile.totalRatingsReceived || sportsmanshipStats?.totalRatings || 0} Ratings
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">100% Verified Community</span>
          </div>
        </div>

        {/* Rating Category Breakdown */}
        {sportsmanshipStats && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
              <span className="text-xs font-black text-emerald-400 block">
                {(sportsmanshipStats.sportsmanship || 5.0).toFixed(1)} ★
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Fair Play</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
              <span className="text-xs font-black text-indigo-400 block">
                {(sportsmanshipStats.skill || 4.8).toFixed(1)} ★
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Playstyle</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
              <span className="text-xs font-black text-amber-400 block">
                {(sportsmanshipStats.punctuality || 5.0).toFixed(1)} ★
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Punctuality</span>
            </div>
          </div>
        )}
      </div>

      {/* Badges Earned Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Milestones & Badges ({unlockedCount}/{achievements.length})</span>
        </span>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 relative overflow-hidden ${
              ach.unlocked
                ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                : 'bg-slate-950/40 border-slate-900 opacity-60'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${
                ach.unlocked
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-900 border-slate-800 grayscale'
              }`}
            >
              {ach.icon}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold text-white truncate">{ach.title}</h4>
                {ach.unlocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {ach.description}
              </p>

              {ach.progress && !ach.unlocked && (
                <div className="pt-1">
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                    <span>Progress</span>
                    <span>{ach.progress.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (ach.progress.current / ach.progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
