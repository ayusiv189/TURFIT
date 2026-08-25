import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lobby, LobbyPlayer, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { cleanupExpiredLobbies, cancelBookingAndDissolveLobby } from '../../lib/db';
import {
  Activity,
  Calendar,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Search,
  Plus,
  Filter,
  Check,
  LogOut,
  Sparkles,
  Share2,
  Shield,
  Eye,
  Lock,
  Globe,
  Trash2,
  UserPlus,
  Loader2,
  AlertCircle,
  X,
  Play,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { CreateLobbyModal } from './CreateLobbyModal';
import { InvitePlayerModal } from './InvitePlayerModal';
import { PublicProfileModal } from './PublicProfileModal';

interface LobbiesTabProps {
  onHostMatchFromLobby?: (lobby: Lobby) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LobbiesTab: React.FC<LobbiesTabProps> = ({
  onHostMatchFromLobby,
  showToast,
}) => {
  const { user, profile } = useAuth();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'MY_LOBBIES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Lobby for Detail view
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyPlayer[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Join & Payment Modal State
  const [joinModalLobby, setJoinModalLobby] = useState<Lobby | null>(null);
  const [joinPaymentOption, setJoinPaymentOption] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [joinLoading, setJoinLoading] = useState(false);

  // My participation cache
  const [joinedLobbyIds, setJoinedLobbyIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetLobby, setInviteTargetLobby] = useState<Lobby | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<UserProfile | null>(null);

  // Run auto-cleanup for expired lobbies when component mounts
  useEffect(() => {
    cleanupExpiredLobbies().catch((err) => console.warn('Lobby cleanup error:', err));
  }, []);

  // Real-time listener for lobbies
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'lobbies'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Lobby[] = [];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const curMinutes = now.getHours() * 60 + now.getMinutes();

        snapshot.forEach((d) => {
          const lobbyData = { id: d.id, ...d.data() } as Lobby;
          // Filter out expired lobbies in real-time
          if (lobbyData.status === 'CANCELLED' || (lobbyData as any).isExpired) return;
          if (lobbyData.date < todayStr) return;
          if (lobbyData.date === todayStr && lobbyData.endTime) {
            let endH = 0;
            let endM = 0;
            const parts = lobbyData.endTime.split(' ');
            const timePart = parts[0];
            const ampm = parts[1]?.toUpperCase();
            const [hStr, mStr] = timePart.split(':');
            endH = parseInt(hStr, 10) || 0;
            endM = parseInt(mStr, 10) || 0;
            if (ampm === 'PM' && endH < 12) endH += 12;
            if (ampm === 'AM' && endH === 12) endH = 0;
            if (curMinutes > endH * 60 + endM) return;
          }
          list.push(lobbyData);
        });

        // Sort by date/createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLobbies(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to lobbies:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for user's participation in lobbies
  useEffect(() => {
    if (!user) {
      setJoinedLobbyIds(new Set());
      return;
    }
    const q = query(collection(db, 'lobbyPlayers'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const joined = new Set<string>();
      snapshot.forEach((d) => {
        const data = d.data() as LobbyPlayer;
        joined.add(data.lobbyId);
      });
      setJoinedLobbyIds(joined);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for participants of selected lobby
  useEffect(() => {
    if (!selectedLobby) {
      setLobbyParticipants([]);
      return;
    }
    setLoadingParticipants(true);
    const q = query(
      collection(db, 'lobbyPlayers'),
      where('lobbyId', '==', selectedLobby.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LobbyPlayer[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as LobbyPlayer));
      setLobbyParticipants(list);
      setLoadingParticipants(false);
    });

    return () => unsubscribe();
  }, [selectedLobby?.id]);

  // Trigger "I'M IN" -> Open Payment Choice Modal
  const handleInitiateJoin = (lobby: Lobby, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || !profile) {
      showToast('Please sign in to join a lobby.', 'error');
      return;
    }

    if (lobby.status !== 'OPEN') {
      showToast('This lobby is no longer accepting new players.', 'error');
      return;
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      showToast('Sorry, this lobby is already full!', 'error');
      return;
    }

    if (joinedLobbyIds.has(lobby.id)) {
      showToast("You are already in this lobby!", 'info');
      return;
    }

    setJoinModalLobby(lobby);
    setJoinPaymentOption('PAY_NOW');
  };

  // Confirm Join with Payment Choice
  const handleConfirmJoinWithPayment = async () => {
    if (!user || !profile || !joinModalLobby) return;
    const lobby = joinModalLobby;
    const price = lobby.pricePerPlayer || 0;

    setJoinLoading(true);

    try {
      const participantId = `${lobby.id}_${user.uid}`;
      const now = new Date().toISOString();

      // Check current doc state from Firestore for concurrency safety
      const lobbyRef = doc(db, 'lobbies', lobby.id);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) {
        showToast('Lobby no longer exists.', 'error');
        setJoinModalLobby(null);
        return;
      }
      const liveData = lobbySnap.data() as Lobby;
      if (liveData.currentPlayers >= liveData.maxPlayers) {
        showToast('Sorry, this lobby just became full!', 'error');
        setJoinModalLobby(null);
        return;
      }

      if (joinPaymentOption === 'PAY_NOW' && price > 0) {
        // Trigger Razorpay Checkout
        try {
          const razorpayRes = await openRazorpayCheckout({
            amount: price,
            name: 'TruFit Turf Match Share',
            description: `Match Fee for ${lobby.name} (${lobby.sport})`,
            prefill: {
              name: profile.displayName || user.displayName || 'Athlete',
              email: user.email || '',
              contact: profile.phoneNumber || '',
            },
            notes: {
              lobbyId: lobby.id,
              userId: user.uid,
              sport: lobby.sport,
            },
          });

          // Payment Cleared: Store participant as PAID
          const participant: LobbyPlayer = {
            id: participantId,
            lobbyId: lobby.id,
            uid: user.uid,
            playerName: profile.displayName || 'Player',
            playerPhotoURL: profile.photoURL || null,
            preferredSport: profile.preferredSport || lobby.sport,
            skillLevel: profile.experienceLevel || 'Intermediate',
            isHost: false,
            paymentMethod: 'PAY_NOW',
            paymentStatus: 'PAID',
            amountPaid: price,
            amountDue: 0,
            paymentTxId: razorpayRes.razorpay_payment_id,
            joinedAt: now,
          };
          await setDoc(doc(db, 'lobbyPlayers', participantId), participant);

          // Record payment transaction record
          await addDoc(collection(db, 'paymentTransactions'), {
            userId: user.uid,
            userName: profile.displayName || 'Athlete',
            userEmail: user.email || '',
            amount: price,
            type: 'LOBBY_JOIN',
            lobbyId: lobby.id,
            lobbyName: lobby.name,
            turfName: lobby.turfName,
            status: 'SUCCESS',
            paymentMethod: 'RAZORPAY_ONLINE',
            razorpayPaymentId: razorpayRes.razorpay_payment_id,
            createdAt: now,
          });

          // Update lobby current count
          const newCount = liveData.currentPlayers + 1;
          const isNowFull = newCount >= liveData.maxPlayers;
          await updateDoc(lobbyRef, {
            currentPlayers: newCount,
            status: isNowFull ? 'FULL' : 'OPEN',
            updatedAt: now,
          });

          // In-App notification to host
          if (lobby.hostId !== user.uid) {
            await addDoc(collection(db, 'notifications'), {
              userId: lobby.hostId,
              title: "Player Joined & Paid!",
              message: `${profile.displayName || 'A player'} joined "${lobby.name}" and paid ₹${price} online via Razorpay.`,
              type: 'LOBBY_JOINED',
              linkType: 'LOBBY',
              linkId: lobby.id,
              read: false,
              createdAt: now,
            });
          }

          showToast(`You're in! Payment of ₹${price} verified via Razorpay. See you on the pitch!`, 'success');
          setJoinModalLobby(null);
        } catch (payErr: any) {
          showToast(payErr.message || 'Payment cancelled or unsuccessful.', 'error');
        }
      } else {
        // Option 2: PAY LATER AT TURF COUNTER
        const participant: LobbyPlayer = {
          id: participantId,
          lobbyId: lobby.id,
          uid: user.uid,
          playerName: profile.displayName || 'Player',
          playerPhotoURL: profile.photoURL || null,
          preferredSport: profile.preferredSport || lobby.sport,
          skillLevel: profile.experienceLevel || 'Intermediate',
          isHost: false,
          paymentMethod: 'PAY_LATER_AT_TURF',
          paymentStatus: 'DUE',
          amountPaid: 0,
          amountDue: price,
          joinedAt: now,
        };
        await setDoc(doc(db, 'lobbyPlayers', participantId), participant);

        // Update lobby current count
        const newCount = liveData.currentPlayers + 1;
        const isNowFull = newCount >= liveData.maxPlayers;
        await updateDoc(lobbyRef, {
          currentPlayers: newCount,
          status: isNowFull ? 'FULL' : 'OPEN',
          updatedAt: now,
        });

        // In-App notification to host
        if (lobby.hostId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: lobby.hostId,
            title: "Player Joined (Pay at Turf)",
            message: `${profile.displayName || 'A player'} joined "${lobby.name}" (₹${price} to be collected at turf).`,
            type: 'LOBBY_JOINED',
            linkType: 'LOBBY',
            linkId: lobby.id,
            read: false,
            createdAt: now,
          });
        }

        showToast(`You're in! Please pay ₹${price} at the turf counter on match day.`, 'success');
        setJoinModalLobby(null);
      }
    } catch (err: any) {
      console.error('Error joining lobby:', err);
      showToast(err.message || 'Failed to join lobby.', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  // Handle "I'M OUT"
  const handleLeaveLobby = async (lobby: Lobby, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;

    if (lobby.hostId === user.uid) {
      showToast('As host, you can dissolve the lobby or cancel the booking.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to leave "${lobby.name}"?`)) return;

    setActionLoadingId(lobby.id);

    try {
      const participantId = `${lobby.id}_${user.uid}`;
      await deleteDoc(doc(db, 'lobbyPlayers', participantId));

      const lobbyRef = doc(db, 'lobbies', lobby.id);
      const lobbySnap = await getDoc(lobbyRef);
      if (lobbySnap.exists()) {
        const liveData = lobbySnap.data() as Lobby;
        const newCount = Math.max(1, liveData.currentPlayers - 1);
        await updateDoc(lobbyRef, {
          currentPlayers: newCount,
          status: liveData.status === 'FULL' ? 'OPEN' : liveData.status,
          updatedAt: new Date().toISOString(),
        });
      }

      showToast('You have stepped out of the lobby.', 'info');
    } catch (err: any) {
      console.error('Error leaving lobby:', err);
      showToast(err.message || 'Failed to leave lobby.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Host Action: Cancel Booking & Dissolve Lobby
  const handleDissolveLobby = async (lobby: Lobby) => {
    if (!user || user.uid !== lobby.hostId) {
      showToast('Only the host can dissolve this lobby.', 'error');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to cancel the booking and dissolve "${lobby.name}"? The turf slot will be released back for other players.`
      )
    ) {
      return;
    }

    setActionLoadingId(lobby.id);
    try {
      await cancelBookingAndDissolveLobby(lobby.bookingId, lobby.id, user.uid);
      showToast('Booking cancelled and matchmaking lobby dissolved successfully!', 'success');
      if (selectedLobby?.id === lobby.id) {
        setSelectedLobby(null);
      }
    } catch (err: any) {
      console.error('Error dissolving lobby:', err);
      showToast(err.message || 'Failed to dissolve lobby.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Host Action: Close / Reopen Lobby
  const handleToggleLobbyStatus = async (lobby: Lobby) => {
    if (!user || user.uid !== lobby.hostId) return;
    try {
      const nextStatus = lobby.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
      await updateDoc(doc(db, 'lobbies', lobby.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      setSelectedLobby((prev) => (prev ? { ...prev, status: nextStatus } : null));
      showToast(`Lobby is now ${nextStatus === 'OPEN' ? 'Open for players' : 'Closed'}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update lobby status.', 'error');
    }
  };

  // Host Action: Cancel Lobby
  const handleCancelLobby = async (lobby: Lobby) => {
    if (!user || user.uid !== lobby.hostId) return;
    if (!window.confirm('Are you sure you want to cancel this lobby? All participants will be notified.')) {
      return;
    }
    try {
      await updateDoc(doc(db, 'lobbies', lobby.id), {
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      });
      setSelectedLobby((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      showToast('Lobby cancelled.', 'info');
    } catch (err: any) {
      showToast('Failed to cancel lobby.', 'error');
    }
  };

  // Host Action: Remove participant
  const handleRemoveParticipant = async (participant: LobbyPlayer) => {
    if (!selectedLobby || !user || user.uid !== selectedLobby.hostId) return;
    if (participant.isHost) return;

    if (!window.confirm(`Remove ${participant.playerName} from this lobby?`)) return;

    try {
      await deleteDoc(doc(db, 'lobbyPlayers', participant.id));
      const newCount = Math.max(1, selectedLobby.currentPlayers - 1);
      await updateDoc(doc(db, 'lobbies', selectedLobby.id), {
        currentPlayers: newCount,
        status: selectedLobby.status === 'FULL' ? 'OPEN' : selectedLobby.status,
        updatedAt: new Date().toISOString(),
      });
      setSelectedLobby((prev) => (prev ? { ...prev, currentPlayers: newCount } : null));
      showToast(`Removed ${participant.playerName} from lobby.`, 'info');
    } catch (err: any) {
      showToast('Failed to remove player.', 'error');
    }
  };

  // Share lobby
  const handleShareLobby = (lobby: Lobby, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `Join my ${lobby.sport} lobby "${lobby.name}" at ${lobby.turfName} on ${lobby.date} (${lobby.startTime} - ${lobby.endTime}) on TruFit!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast('Lobby invite details copied to clipboard!', 'success');
    } else {
      showToast(shareText, 'info');
    }
  };

  // View public profile
  const handleViewPlayerProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setViewingPlayer(snap.data() as UserProfile);
      }
    } catch (err) {
      console.error('Error fetching player profile:', err);
    }
  };

  // Filtered lobbies
  const filteredLobbies = lobbies.filter((l) => {
    // Visibility: public or hosted by current user
    if (!l.isPublic && l.hostId !== user?.uid && !joinedLobbyIds.has(l.id)) {
      return false;
    }

    if (selectedSport !== 'All' && l.sport.toLowerCase() !== selectedSport.toLowerCase()) {
      return false;
    }

    if (statusFilter === 'OPEN' && l.status !== 'OPEN') {
      return false;
    }

    if (statusFilter === 'MY_LOBBIES') {
      if (l.hostId !== user?.uid && !joinedLobbyIds.has(l.id)) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchTurf = l.turfName.toLowerCase().includes(q);
      const matchCity = l.turfCity.toLowerCase().includes(q);
      const matchHost = l.hostName.toLowerCase().includes(q);
      if (!matchName && !matchTurf && !matchCity && !matchHost) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Sports Matchmaking Lobbies
              <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                Live
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Discover open turf matches, say "I'm In", or host your own community lobby.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Host a Lobby</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lobbies by title, turf venue, city, or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Lobbies
            </button>
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'OPEN'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open Spots
            </button>
            <button
              onClick={() => setStatusFilter('MY_LOBBIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'MY_LOBBIES'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Lobbies
            </button>
          </div>
        </div>

        {/* Sports filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'].map(
            (sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedSport === sport
                    ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                {sport}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lobbies Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-xs">Loading real community matchmaking lobbies...</span>
        </div>
      ) : filteredLobbies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Activity className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No public lobbies available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            {searchQuery || selectedSport !== 'All' || statusFilter !== 'ALL'
              ? 'No lobbies match your search or filter criteria. Try resetting the filters.'
              : 'Be the first athlete to host a lobby! Book a turf slot and create a community matchmaking lobby.'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Host Match Lobby
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLobbies.map((lobby) => {
            const isJoined = joinedLobbyIds.has(lobby.id);
            const isHost = lobby.hostId === user?.uid;
            const isFull = lobby.currentPlayers >= lobby.maxPlayers || lobby.status === 'FULL';
            const spotsRemaining = Math.max(0, lobby.maxPlayers - lobby.currentPlayers);
            const isActionLoading = actionLoadingId === lobby.id;

            return (
              <div
                key={lobby.id}
                onClick={() => setSelectedLobby(lobby)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                      {lobby.sport}
                    </span>

                    <div className="flex items-center gap-2">
                      {!lobby.isPublic && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                      {lobby.status === 'OPEN' && !isFull ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Open
                        </span>
                      ) : lobby.status === 'FULL' || isFull ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          Full
                        </span>
                      ) : lobby.status === 'MATCH_STARTED' ? (
                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                          Match Live
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                          {lobby.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
                    {lobby.name}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-3 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">
                      {lobby.turfName} • {lobby.turfCity}
                    </span>
                  </div>

                  {/* Schedule */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {lobby.date} ({lobby.day})
                      </span>
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {lobby.startTime} - {lobby.endTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                        ₹{lobby.pricePerPlayer} / player
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Host: <span className="text-slate-200">{lobby.hostName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Players
                      </span>
                      <span className="font-bold text-white">
                        {lobby.currentPlayers} / {lobby.maxPlayers}
                        <span className="text-[11px] font-normal text-indigo-400 ml-1.5">
                          ({spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} left)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isFull
                            ? 'bg-amber-500'
                            : isJoined
                            ? 'bg-indigo-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (lobby.currentPlayers / lobby.maxPlayers) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLobby(lobby);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Share Lobby"
                      onClick={(e) => handleShareLobby(lobby, e)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 rounded-xl transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {isJoined ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-3 py-2 bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                          <span>You're In</span>
                        </span>
                        {!isHost && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={(e) => handleLeaveLobby(lobby, e)}
                            className="px-2.5 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            title="Leave Lobby"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <LogOut className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : isFull ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                      >
                        Lobby Full
                      </button>
                    ) : lobby.status !== 'OPEN' ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                      >
                        Closed
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={(e) => handleInitiateJoin(lobby, e)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950/50 hover:shadow-indigo-500/20 disabled:opacity-50"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>I'm In</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* LOBBY DETAILS MODAL */}
      {/* ==================================================== */}
      {selectedLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {selectedLobby.sport}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {selectedLobby.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedLobby.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedLobby(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Venue & Time Overview */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Venue & Arena
                  </span>
                  <p className="text-xs font-bold text-white">{selectedLobby.turfName}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    {selectedLobby.arenaName} • {selectedLobby.turfAddress}, {selectedLobby.turfCity}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Slot Time & Price
                  </span>
                  <p className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedLobby.date} ({selectedLobby.day})
                  </p>
                  <p className="text-xs text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {selectedLobby.startTime} - {selectedLobby.endTime}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      ₹{selectedLobby.pricePerPlayer} / player
                    </span>
                  </p>
                </div>
              </div>

              {/* Description & Rules */}
              {selectedLobby.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    Match Details
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedLobby.description}
                  </p>
                </div>
              )}

              {selectedLobby.rules && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    Rules & Guidelines
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedLobby.rules}
                  </p>
                </div>
              )}

              {/* Player Roster */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Participants Roster ({lobbyParticipants.length} / {selectedLobby.maxPlayers})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {Math.max(0, selectedLobby.maxPlayers - lobbyParticipants.length)} spots remaining
                    </span>
                  </div>

                  {user?.uid === selectedLobby.hostId && (
                    <button
                      type="button"
                      onClick={() => {
                        setInviteTargetLobby(selectedLobby);
                        setShowInviteModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Players</span>
                    </button>
                  )}
                </div>

                {loadingParticipants ? (
                  <div className="py-8 flex justify-center text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                    Loading roster...
                  </div>
                ) : lobbyParticipants.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500 border border-slate-800">
                    No participants yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lobbyParticipants.map((p, idx) => {
                      const isMe = p.uid === user?.uid;
                      const isHost = p.isHost || p.uid === selectedLobby.hostId;

                      return (
                        <div
                          key={p.id}
                          className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2.5 group"
                        >
                          <div
                            onClick={() => handleViewPlayerProfile(p.uid)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                          >
                            <span className="text-[10px] font-bold text-slate-600 w-3.5 text-center">
                              {idx + 1}
                            </span>
                            {p.playerPhotoURL ? (
                              <img
                                src={p.playerPhotoURL}
                                alt={p.playerName}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {p.playerName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate max-w-[110px] group-hover:text-indigo-300">
                                  {p.playerName}
                                </span>
                                {isHost && (
                                  <span className="text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                    Host
                                  </span>
                                )}
                                {isMe && (
                                  <span className="text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.preferredSport || selectedLobby.sport} • {p.skillLevel || 'Athlete'}
                              </span>
                            </div>
                          </div>

                          {/* Host can kick non-hosts */}
                          {user?.uid === selectedLobby.hostId && !isHost && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(p)}
                              title="Remove player"
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Host Permissions Section */}
              {user?.uid === selectedLobby.hostId && (
                <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white">Host Controls</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleLobbyStatus(selectedLobby)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {selectedLobby.status === 'CLOSED' ? 'Reopen Lobby' : 'Close Lobby'}
                    </button>
                    {onHostMatchFromLobby && (
                      <button
                        type="button"
                        onClick={() => {
                          onHostMatchFromLobby(selectedLobby);
                          setSelectedLobby(null);
                        }}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-md shadow-indigo-950/50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Match</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDissolveLobby(selectedLobby)}
                      className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dissolve Lobby</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={(e) => handleShareLobby(selectedLobby, e)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <div className="flex items-center gap-2">
                {joinedLobbyIds.has(selectedLobby.id) ? (
                  <>
                    <span className="px-3 py-2 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>You are in this Lobby</span>
                    </span>
                    {user?.uid !== selectedLobby.hostId && (
                      <button
                        type="button"
                        onClick={() => handleLeaveLobby(selectedLobby)}
                        className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>I'm Out</span>
                      </button>
                    )}
                  </>
                ) : selectedLobby.currentPlayers >= selectedLobby.maxPlayers ? (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Lobby Full
                  </button>
                ) : selectedLobby.status !== 'OPEN' ? (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Lobby Closed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateJoin(selectedLobby)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>I'M IN (Join Match)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* JOIN LOBBY PAYMENT SELECTION MODAL */}
      {/* ==================================================== */}
      {joinModalLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Join Match Lobby
                </span>
              </div>
              <button
                type="button"
                onClick={() => setJoinModalLobby(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Confirm Your Spot</h3>
              <p className="text-xs text-slate-400">
                You are joining <span className="text-white font-semibold">{joinModalLobby.name}</span> at{' '}
                <span className="text-white font-semibold">{joinModalLobby.turfName}</span>.
              </p>
            </div>

            {/* Match summary box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Sport & Venue:</span>
                <span className="font-semibold text-white">
                  {joinModalLobby.sport} • {joinModalLobby.turfName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-semibold text-indigo-400">
                  {joinModalLobby.date} ({joinModalLobby.startTime} - {joinModalLobby.endTime})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-300 font-bold">Your Share / Per Player:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  ₹{joinModalLobby.pricePerPlayer}
                </span>
              </div>
            </div>

            {/* Payment Choice Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Payment Option
              </label>

              <div
                onClick={() => setJoinPaymentOption('PAY_NOW')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  joinPaymentOption === 'PAY_NOW'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    joinPaymentOption === 'PAY_NOW'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {joinPaymentOption === 'PAY_NOW' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Pay Now Online (Razorpay)</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded">
                      Fastest
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pay ₹{joinModalLobby.pricePerPlayer} now via UPI, Cards, Netbanking or Wallets for guaranteed confirmation.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setJoinPaymentOption('PAY_LATER_AT_TURF')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  joinPaymentOption === 'PAY_LATER_AT_TURF'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    joinPaymentOption === 'PAY_LATER_AT_TURF'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {joinPaymentOption === 'PAY_LATER_AT_TURF' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Pay Later at Turf Counter</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reserve your spot and settle ₹{joinModalLobby.pricePerPlayer} at the reception before kick-off.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJoinModalLobby(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={joinLoading}
                onClick={handleConfirmJoinWithPayment}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
              >
                {joinLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Say I'm In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateLobbyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLobbyCreated={(newLobby) => {
          showToast(`Lobby "${newLobby.name}" published successfully!`, 'success');
        }}
      />

      <InvitePlayerModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteTargetLobby(null);
        }}
        targetType="LOBBY"
        targetLobby={inviteTargetLobby}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      <PublicProfileModal
        player={viewingPlayer}
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
      />
    </div>
  );
};
