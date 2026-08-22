import React from 'react';
import { UserProfile } from '../../types';
import { X, Trophy, MapPin, Activity, Shield, User as UserIcon } from 'lucide-react';

interface PublicProfileModalProps {
  player: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteToLobby?: (player: UserProfile) => void;
  onInviteToTeam?: (player: UserProfile) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  onInviteToLobby,
  onInviteToTeam,
}) => {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
        {/* Header banner */}
        <div className="relative h-24 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 border-b border-slate-800 flex items-end px-6 pb-3">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950/60 p-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="relative">
              {player.photoURL ? (
                <img
                  src={player.photoURL}
                  alt={player.displayName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 shadow-xl bg-slate-800"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-slate-900 shadow-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Active" />
            </div>

            {player.experienceLevel && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                {player.experienceLevel}
              </span>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {player.displayName}
            </h3>
            {player.username && (
              <p className="text-xs text-indigo-400 font-medium">@{player.username}</p>
            )}
            {player.city && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {player.city}
              </p>
            )}
          </div>

          {player.bio && (
            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 leading-relaxed">
              "{player.bio}"
            </p>
          )}

          {/* Stats & Sports */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sport</span>
              <span className="text-xs font-bold text-indigo-300 truncate block mt-0.5">
                {player.preferredSport || 'All Sports'}
              </span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Position</span>
              <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
                {player.preferredPosition || 'Flex'}
              </span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Matches</span>
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                {player.matchesPlayed || 0}
              </span>
            </div>
          </div>

          {/* Preferred sports tags */}
          {player.preferredSports && player.preferredSports.length > 0 && (
            <div className="mb-5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Sports Played</span>
              <div className="flex flex-wrap gap-1.5">
                {player.preferredSports.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
            {onInviteToLobby && (
              <button
                type="button"
                onClick={() => {
                  onInviteToLobby(player);
                  onClose();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-950/50"
              >
                <Activity className="w-3.5 h-3.5" />
                Invite to Lobby
              </button>
            )}
            {onInviteToTeam && (
              <button
                type="button"
                onClick={() => {
                  onInviteToTeam(player);
                  onClose();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Invite to Team
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
