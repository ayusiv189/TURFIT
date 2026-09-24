import React from 'react';
import { PlayerTournamentParticipation } from '../../lib/profileEcosystem';
import { Trophy, Calendar, MapPin, Award, Users, DollarSign, Building } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface ProfileTournamentsSectionProps {
  tournaments: PlayerTournamentParticipation[];
  isLoading: boolean;
  isSelf: boolean;
  onSelectTournament?: (tournamentId: string) => void;
}

export const ProfileTournamentsSection: React.FC<ProfileTournamentsSectionProps> = ({
  tournaments,
  isLoading,
  isSelf,
  onSelectTournament,
}) => {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading tournament campaigns...</p>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">No Tournaments Entered</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {isSelf
            ? 'Browse city-wide Open and Corporate Tournaments in TruFit to compete for trophies, cash prizes, and glory.'
            : 'This athlete has not participated in recorded tournaments yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Tournaments & Championships ({tournaments.length})</span>
        </span>
      </div>

      <div className="space-y-3">
        {tournaments.map(({ tournament: t, team }) => (
          <div
            key={t.id}
            onClick={() => onSelectTournament && onSelectTournament(t.id)}
            className="bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-md group relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {t.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.category === 'CORPORATE'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {t.category}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      {t.sport}
                    </span>
                  </div>

                  <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <span>Squad: {team.teamName}</span>
                    {team.companyName && (
                      <span className="text-slate-400 font-normal">({team.companyName})</span>
                    )}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                      t.status === 'COMPLETED'
                        ? 'bg-slate-800 text-slate-300'
                        : t.status === 'LIVE'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {t.status === 'LIVE' ? '● LIVE NOW' : t.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{t.turfName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.startDate}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">
                    Prize: {formatCurrency(t.prizePool?.firstPrize || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                <span>{team.playersCount || team.playerRoster?.length || 0} Registered Roster</span>
              </span>
              <span className="text-emerald-400 font-medium">
                Confirmed Team
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
