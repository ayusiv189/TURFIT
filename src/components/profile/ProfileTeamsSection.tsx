import React, { useState } from 'react';
import { PlayerTeamMembership } from '../../lib/profileEcosystem';
import { GroupChatModal } from '../messaging/GroupChatModal';
import { Shield, Trophy, Users, MapPin, Crown, ChevronRight, Activity, MessageSquare } from 'lucide-react';

interface ProfileTeamsSectionProps {
  teams: PlayerTeamMembership[];
  isLoading: boolean;
  isSelf: boolean;
  onSelectTeam?: (teamId: string) => void;
}

export const ProfileTeamsSection: React.FC<ProfileTeamsSectionProps> = ({
  teams,
  isLoading,
  isSelf,
  onSelectTeam,
}) => {
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading sports squads...</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">No Squads Joined Yet</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {isSelf
            ? 'Join or create your own sports team in the Teams tab to participate in competitive matches.'
            : 'This athlete has not joined any public teams yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Squads ({teams.length})</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {teams.map(({ team, memberInfo, isCaptain }) => {
          return (
            <div
              key={team.id}
              className="bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-md group relative flex flex-col justify-between gap-3"
            >
              <div onClick={() => onSelectTeam && onSelectTeam(team.id)} className="cursor-pointer">
                {/* Header: Sport & Role */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-base flex-shrink-0">
                      {team.logoURL ? (
                        <img
                          src={team.logoURL}
                          alt={team.name}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {team.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-emerald-400/90">{team.sport}</span>
                        {team.city && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {team.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCaptain && (
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Captain
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChat({ id: team.id, name: team.name });
                }}
                className="bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Team Chat</span>
              </button>
            </div>
          );
        })}
      </div>
      {activeChat && (
        <GroupChatModal
          isOpen={!!activeChat}
          groupId={activeChat.id}
          groupName={activeChat.name}
          groupType="team"
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
};
