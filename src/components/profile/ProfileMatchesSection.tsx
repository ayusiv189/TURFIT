import React, { useState } from 'react';
import { PlayerMatchRecord } from '../../lib/profileEcosystem';
import { Calendar, Clock, MapPin, Trophy, Swords, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileMatchesSectionProps {
  matches: PlayerMatchRecord[];
  isLoading: boolean;
  isSelf: boolean;
}

export const ProfileMatchesSection: React.FC<ProfileMatchesSectionProps> = ({
  matches,
  isLoading,
  isSelf,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'UPCOMING'>('ALL');

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading match history & fixtures...</p>
      </div>
    );
  }

  const completedMatches = matches.filter((m) => m.isCompleted);
  const upcomingMatches = matches.filter((m) => !m.isCompleted);

  const filteredMatches =
    filter === 'COMPLETED'
      ? completedMatches
      : filter === 'UPCOMING'
      ? upcomingMatches
      : matches;

  if (matches.length === 0) {
    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Swords className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">No Matches Recorded</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {isSelf
            ? 'Host or join community matches and tournaments in TruFit to build your verified match history.'
            : 'This athlete has not participated in recorded matches yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Match Log ({matches.length})</span>
        </span>

        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({matches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UPCOMING')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'UPCOMING'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('COMPLETED')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
              filter === 'COMPLETED'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History ({completedMatches.length})
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-2.5">
        {filteredMatches.map((m) => (
          <div
            key={m.id}
            className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white line-clamp-1">{m.matchName}</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {m.sport}
                </span>
                {m.isHost && (
                  <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    Host
                  </span>
                )}
                {m.teamAName && m.teamBName && (
                  <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                    {m.teamAName} vs {m.teamBName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>
                    {m.turfName}
                    {m.turfCity ? `, ${m.turfCity}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{m.date}</span>
                </span>
                {m.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {m.startTime} - {m.endTime}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              {m.isCompleted ? (
                <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Completed
                </span>
              ) : (
                <span className="bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {m.status === 'IN_PROGRESS' ? 'Live Now' : 'Scheduled'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
