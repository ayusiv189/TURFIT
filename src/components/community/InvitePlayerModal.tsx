import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Lobby, Team } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Search, X, UserPlus, Check, AlertCircle, Loader2, Shield, Activity, User as UserIcon } from 'lucide-react';

interface InvitePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'LOBBY' | 'TEAM';
  targetLobby?: Lobby | null;
  targetTeam?: Team | null;
  onSuccess?: (msg: string) => void;
}

export const InvitePlayerModal: React.FC<InvitePlayerModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetLobby,
  targetTeam,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setPlayers([]);
      setInvitedUids(new Set());
      setErrorMsg(null);
      return;
    }
    fetchPlayers();
  }, [isOpen, targetType, targetLobby?.id, targetTeam?.id]);

  const fetchPlayers = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Query players from users collection
      const q = query(collection(db, 'users'), where('role', '==', 'PLAYER'));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        if (d.id !== user.uid) {
          list.push(d.data() as UserProfile);
        }
      });
      setPlayers(list);
    } catch (err: any) {
      console.error('Error fetching players to invite:', err);
      setErrorMsg('Failed to load registered players.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (targetPlayer: UserProfile) => {
    if (!user || !profile) return;
    setInvitingId(targetPlayer.uid);
    setErrorMsg(null);

    try {
      if (targetType === 'LOBBY' && targetLobby) {
        // Create Lobby Invitation
        await addDoc(collection(db, 'lobbyInvitations'), {
          lobbyId: targetLobby.id,
          lobbyName: targetLobby.name,
          sport: targetLobby.sport,
          turfName: targetLobby.turfName,
          date: targetLobby.date,
          startTime: targetLobby.startTime,
          senderId: user.uid,
          senderName: profile.displayName || 'Player',
          receiverId: targetPlayer.uid,
          receiverName: targetPlayer.displayName,
          receiverPhotoURL: targetPlayer.photoURL || null,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });

        // Send In-App Notification
        await addDoc(collection(db, 'notifications'), {
          userId: targetPlayer.uid,
          title: 'Lobby Invitation',
          message: `${profile.displayName || 'A player'} invited you to join "${targetLobby.name}" (${targetLobby.sport}) at ${targetLobby.turfName}.`,
          type: 'LOBBY_INVITE',
          linkType: 'LOBBY',
          linkId: targetLobby.id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        setInvitedUids((prev) => new Set(prev).add(targetPlayer.uid));
        if (onSuccess) onSuccess(`Invitation sent to ${targetPlayer.displayName}!`);
      } else if (targetType === 'TEAM' && targetTeam) {
        // Create Team Invitation
        await addDoc(collection(db, 'teamInvitations'), {
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          sport: targetTeam.sport,
          senderId: user.uid,
          senderName: profile.displayName || 'Captain',
          receiverId: targetPlayer.uid,
          receiverName: targetPlayer.displayName,
          receiverPhotoURL: targetPlayer.photoURL || null,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });

        // Send In-App Notification
        await addDoc(collection(db, 'notifications'), {
          userId: targetPlayer.uid,
          title: 'Team Invitation',
          message: `${profile.displayName || 'Team Captain'} invited you to join team "${targetTeam.name}" (${targetTeam.sport}).`,
          type: 'TEAM_INVITE',
          linkType: 'TEAM',
          linkId: targetTeam.id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        setInvitedUids((prev) => new Set(prev).add(targetPlayer.uid));
        if (onSuccess) onSuccess(`Team invitation sent to ${targetPlayer.displayName}!`);
      }
    } catch (err: any) {
      console.error('Error sending invite:', err);
      setErrorMsg(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInvitingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredPlayers = players.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = p.displayName?.toLowerCase().includes(term);
    const userMatch = p.username?.toLowerCase().includes(term);
    const sportMatch = p.preferredSport?.toLowerCase().includes(term);
    const cityMatch = p.city?.toLowerCase().includes(term);
    return nameMatch || userMatch || sportMatch || cityMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {targetType === 'LOBBY' ? <Activity className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {targetType === 'LOBBY'
                  ? `Invite to ${targetLobby?.name || 'Lobby'}`
                  : `Invite to ${targetTeam?.name || 'Team'}`}
              </h3>
              <p className="text-xs text-slate-400">Search real community players to send direct invites</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search players by name, @username, sport, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-3 bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Loading registered athletes...</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <UserIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No players found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchTerm ? 'Try a different search keyword' : 'No other athletes registered yet'}
              </p>
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isInvited = invitedUids.has(player.uid);
              const isInviting = invitingId === player.uid;

              return (
                <div
                  key={player.uid}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                          {player.displayName}
                        </span>
                        {player.username && (
                          <span className="text-[10px] text-indigo-400 font-medium">
                            @{player.username}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                        <span>{player.preferredSport || 'All Sports'}</span>
                        {player.experienceLevel && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{player.experienceLevel}</span>
                          </>
                        )}
                        {player.city && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{player.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendInvite(player)}
                    disabled={isInvited || isInviting}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isInvited
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/50 disabled:opacity-50'
                    }`}
                  >
                    {isInviting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Invited</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
