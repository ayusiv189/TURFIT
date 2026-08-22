import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { InAppNotification, Lobby, Team, LobbyPlayer, TeamMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Activity,
  Shield,
  Trophy,
  Info,
  Calendar,
  Loader2,
  Trash2,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);

    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: InAppNotification[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as InAppNotification));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, user]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadList = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadList.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
      );
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleAcceptInvite = async (notif: InAppNotification) => {
    if (!user || !profile) return;
    setActionLoadingId(notif.id);

    try {
      if (notif.linkType === 'LOBBY' && notif.linkId) {
        const lobbyRef = doc(db, 'lobbies', notif.linkId);
        const lobbySnap = await getDoc(lobbyRef);

        if (!lobbySnap.exists()) {
          showToast('Sorry, this lobby no longer exists.', 'error');
          await updateDoc(doc(db, 'notifications', notif.id), { read: true });
          return;
        }

        const lobbyData = lobbySnap.data() as Lobby;
        if (lobbyData.currentPlayers >= lobbyData.maxPlayers) {
          showToast('Sorry, this lobby is now full.', 'error');
          await updateDoc(doc(db, 'notifications', notif.id), { read: true });
          return;
        }

        const participantId = `${lobbyData.id}_${user.uid}`;
        const now = new Date().toISOString();

        const participant: LobbyPlayer = {
          id: participantId,
          lobbyId: lobbyData.id,
          uid: user.uid,
          playerName: profile.displayName || 'Player',
          playerPhotoURL: profile.photoURL || null,
          preferredSport: profile.preferredSport || lobbyData.sport,
          skillLevel: profile.experienceLevel || 'Intermediate',
          isHost: false,
          joinedAt: now,
        };
        await setDoc(doc(db, 'lobbyPlayers', participantId), participant);

        const newCount = lobbyData.currentPlayers + 1;
        await updateDoc(lobbyRef, {
          currentPlayers: newCount,
          status: newCount >= lobbyData.maxPlayers ? 'FULL' : 'OPEN',
          updatedAt: now,
        });

        // Update invitation record
        const invQ = query(
          collection(db, 'lobbyInvitations'),
          where('lobbyId', '==', notif.linkId),
          where('receiverId', '==', user.uid)
        );
        const invSnap = await getDocs(invQ);
        invSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'lobbyInvitations', d.id), { status: 'ACCEPTED' });
        });

        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        showToast(`Joined lobby "${lobbyData.name}"!`, 'success');
      } else if (notif.linkType === 'TEAM' && notif.linkId) {
        const teamRef = doc(db, 'teams', notif.linkId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          showToast('Sorry, this team no longer exists.', 'error');
          await updateDoc(doc(db, 'notifications', notif.id), { read: true });
          return;
        }

        const teamData = teamSnap.data() as Team;
        const memberId = `${teamData.id}_${user.uid}`;
        const now = new Date().toISOString();

        const member: TeamMember = {
          id: memberId,
          teamId: teamData.id,
          uid: user.uid,
          name: profile.displayName || 'Player',
          photoURL: profile.photoURL || null,
          preferredSport: profile.preferredSport || teamData.sport,
          position: profile.preferredPosition || 'Player',
          role: 'MEMBER',
          joinedAt: now,
        };
        await setDoc(doc(db, 'teamMembers', memberId), member);

        await updateDoc(teamRef, {
          memberCount: teamData.memberCount + 1,
          updatedAt: now,
        });

        // Update invitation record
        const invQ = query(
          collection(db, 'teamInvitations'),
          where('teamId', '==', notif.linkId),
          where('receiverId', '==', user.uid)
        );
        const invSnap = await getDocs(invQ);
        invSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'teamInvitations', d.id), { status: 'ACCEPTED' });
        });

        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        showToast(`Joined team "${teamData.name}"!`, 'success');
      }
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      showToast(err.message || 'Failed to accept invitation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvite = async (notif: InAppNotification) => {
    if (!user) return;
    setActionLoadingId(notif.id);
    try {
      if (notif.linkType === 'LOBBY' && notif.linkId) {
        const invQ = query(
          collection(db, 'lobbyInvitations'),
          where('lobbyId', '==', notif.linkId),
          where('receiverId', '==', user.uid)
        );
        const invSnap = await getDocs(invQ);
        invSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'lobbyInvitations', d.id), { status: 'DECLINED' });
        });
      } else if (notif.linkType === 'TEAM' && notif.linkId) {
        const invQ = query(
          collection(db, 'teamInvitations'),
          where('teamId', '==', notif.linkId),
          where('receiverId', '==', user.uid)
        );
        const invSnap = await getDocs(invQ);
        invSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'teamInvitations', d.id), { status: 'DECLINED' });
        });
      }

      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      showToast('Invitation declined.', 'info');
    } catch (err) {
      showToast('Failed to decline invitation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Activity & Invitations</h3>
              <p className="text-xs text-slate-400">Real-time match alerts and invitations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 bg-indigo-950/50 rounded-lg border border-indigo-500/30 cursor-pointer"
              >
                Mark Read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No pending notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">
                You're all caught up! Game invites and match updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isInvite =
                notif.type === 'LOBBY_INVITE' || notif.type === 'TEAM_INVITE';
              const isLoading = actionLoadingId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all ${
                    notif.read
                      ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                      : 'bg-slate-950/90 border-indigo-500/40 text-slate-200 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          notif.type === 'LOBBY_INVITE' || notif.type === 'LOBBY_JOINED'
                            ? 'bg-indigo-600/30 text-indigo-300'
                            : notif.type === 'TEAM_INVITE'
                            ? 'bg-emerald-600/30 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {notif.type === 'LOBBY_INVITE' ? (
                          <Activity className="w-3.5 h-3.5" />
                        ) : notif.type === 'TEAM_INVITE' ? (
                          <Shield className="w-3.5 h-3.5" />
                        ) : (
                          <Info className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">{notif.message}</p>

                  {/* Interactive Accept / Decline for Invitations */}
                  {isInvite && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAcceptInvite(notif)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-950/50 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDeclineInvite(notif)}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
