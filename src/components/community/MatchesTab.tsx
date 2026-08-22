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
import { Match, MatchPlayer, Team, Turf, Arena, UserProfile, Lobby } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Plus,
  Filter,
  Check,
  Shield,
  Eye,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  X,
  Swords,
  Play,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { PublicProfileModal } from './PublicProfileModal';

interface MatchesTabProps {
  initialLobbyToHost?: Lobby | null;
  onClearInitialLobby?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MatchesTab: React.FC<MatchesTabProps> = ({
  initialLobbyToHost,
  onClearInitialLobby,
  showToast,
}) => {
  const { user, profile } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSport, setSelectedSport] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'MY_MATCHES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // User Participation
  const [joinedMatchIds, setJoinedMatchIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected Match for detail
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchPlayersList, setMatchPlayersList] = useState<MatchPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Host Match Modal
  const [showHostModal, setShowHostModal] = useState(false);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  // Host form states
  const [matchName, setMatchName] = useState('');
  const [matchSport, setMatchSport] = useState('Football');
  const [selectedTurfId, setSelectedTurfId] = useState('');
  const [arenaNameInput, setArenaNameInput] = useState('Main Arena');
  const [matchDate, setMatchDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [isTeamVsTeam, setIsTeamVsTeam] = useState(false);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('Standard friendly match rules. Respect referees and opponents.');
  const [isPublic, setIsPublic] = useState(true);
  const [hostingMatch, setHostingMatch] = useState(false);

  // Public Profile Modal
  const [viewingPlayer, setViewingPlayer] = useState<UserProfile | null>(null);

  // Handle incoming lobby to host
  useEffect(() => {
    if (initialLobbyToHost) {
      setMatchName(`${initialLobbyToHost.name} (Friendly Match)`);
      setMatchSport(initialLobbyToHost.sport);
      setSelectedTurfId(initialLobbyToHost.turfId);
      setArenaNameInput(initialLobbyToHost.arenaName);
      setMatchDate(initialLobbyToHost.date);
      setStartTime(initialLobbyToHost.startTime);
      setEndTime(initialLobbyToHost.endTime);
      setMaxPlayers(initialLobbyToHost.maxPlayers);
      setDescription(initialLobbyToHost.description);
      setShowHostModal(true);
      if (onClearInitialLobby) onClearInitialLobby();
    }
  }, [initialLobbyToHost]);

  // Real-time listener for Matches
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'matches'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Match[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Match));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMatches(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching matches:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for user's joined matches
  useEffect(() => {
    if (!user) {
      setJoinedMatchIds(new Set());
      return;
    }
    const q = query(collection(db, 'matchPlayers'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const set = new Set<string>();
      snapshot.forEach((d) => {
        const data = d.data() as MatchPlayer;
        set.add(data.matchId);
      });
      setJoinedMatchIds(set);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for players in selected match
  useEffect(() => {
    if (!selectedMatch) {
      setMatchPlayersList([]);
      return;
    }
    setLoadingPlayers(true);
    const q = query(collection(db, 'matchPlayers'), where('matchId', '==', selectedMatch.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: MatchPlayer[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as MatchPlayer));
      setMatchPlayersList(list);
      setLoadingPlayers(false);
    });

    return () => unsubscribe();
  }, [selectedMatch?.id]);

  // Fetch turfs & teams for hosting modal
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [turfSnap, teamSnap] = await Promise.all([
          getDocs(collection(db, 'turfs')),
          getDocs(collection(db, 'teams')),
        ]);

        const tList: Turf[] = [];
        turfSnap.forEach((d) => tList.push({ id: d.id, ...d.data() } as Turf));
        setTurfs(tList);
        if (tList.length > 0 && !selectedTurfId) {
          setSelectedTurfId(tList[0].id);
        }

        const teamList: Team[] = [];
        teamSnap.forEach((d) => teamList.push({ id: d.id, ...d.data() } as Team));
        setAllTeams(teamList);

        if (user) {
          const myTeams = teamList.filter((tm) => tm.captainId === user.uid);
          setUserTeams(myTeams);
          if (myTeams.length > 0) {
            setTeamAId(myTeams[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };

    fetchMetadata();
  }, [user]);

  // Handle Join Match
  const handleJoinMatch = async (match: Match, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || !profile) {
      showToast('Please sign in to join matches.', 'error');
      return;
    }

    if (match.status !== 'OPEN') {
      showToast('This match is no longer open for registration.', 'error');
      return;
    }

    if (match.currentPlayers >= match.maxPlayers) {
      showToast('This match is currently full!', 'error');
      return;
    }

    if (joinedMatchIds.has(match.id)) {
      showToast('You are already registered for this match.', 'info');
      return;
    }

    setActionLoadingId(match.id);
    try {
      const participantId = `${match.id}_${user.uid}`;
      const now = new Date().toISOString();

      const matchRef = doc(db, 'matches', match.id);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) return;

      const liveData = matchSnap.data() as Match;
      if (liveData.currentPlayers >= liveData.maxPlayers) {
        showToast('Sorry, this match just reached maximum players!', 'error');
        return;
      }

      // Add to matchPlayers
      const participant: MatchPlayer = {
        id: participantId,
        matchId: match.id,
        uid: user.uid,
        name: profile.displayName || 'Player',
        photoURL: profile.photoURL || null,
        joinedAt: now,
      };
      await setDoc(doc(db, 'matchPlayers', participantId), participant);

      // Increment count
      const newCount = liveData.currentPlayers + 1;
      const isFull = newCount >= liveData.maxPlayers;
      await updateDoc(matchRef, {
        currentPlayers: newCount,
        status: isFull ? 'FULL' : 'OPEN',
        updatedAt: now,
      });

      // Update user matchesPlayed count
      const currentMatches = profile.matchesPlayed || 0;
      await updateDoc(doc(db, 'users', user.uid), {
        matchesPlayed: currentMatches + 1,
        updatedAt: now,
      });

      // Send notification to host
      if (match.hostId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: match.hostId,
          title: 'Player Joined Your Match!',
          message: `${profile.displayName || 'A player'} joined your match "${match.matchName}" (${newCount}/${match.maxPlayers}).`,
          type: 'MATCH_INVITE',
          linkType: 'MATCH',
          linkId: match.id,
          read: false,
          createdAt: now,
        });
      }

      showToast('Joined match! See you on the pitch.', 'success');
    } catch (err: any) {
      console.error('Error joining match:', err);
      showToast(err.message || 'Failed to join match.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Leave Match
  const handleLeaveMatch = async (match: Match, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    if (match.hostId === user.uid) {
      showToast('As match host, you can update or cancel the match.', 'info');
      return;
    }

    setActionLoadingId(match.id);
    try {
      const participantId = `${match.id}_${user.uid}`;
      await deleteDoc(doc(db, 'matchPlayers', participantId));

      const matchRef = doc(db, 'matches', match.id);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
        const liveData = matchSnap.data() as Match;
        const newCount = Math.max(1, liveData.currentPlayers - 1);
        await updateDoc(matchRef, {
          currentPlayers: newCount,
          status: liveData.status === 'FULL' ? 'OPEN' : liveData.status,
          updatedAt: new Date().toISOString(),
        });
      }

      showToast('You left the match.', 'info');
    } catch (err: any) {
      showToast('Failed to leave match.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Host Match Submit
  const handleHostMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!matchName.trim()) {
      showToast('Match name is required.', 'error');
      return;
    }

    const selectedTurf = turfs.find((t) => t.id === selectedTurfId);
    const teamAObj = allTeams.find((t) => t.id === teamAId);
    const teamBObj = allTeams.find((t) => t.id === teamBId);

    setHostingMatch(true);
    try {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newMatch: Match = {
        id: matchId,
        matchName: matchName.trim(),
        sport: matchSport,
        turfId: selectedTurf?.id || 'turf_gen',
        turfName: selectedTurf?.name || 'Local Sports Arena',
        turfAddress: selectedTurf?.address || 'City Sports Complex',
        turfCity: selectedTurf?.city || profile.city || 'Bhopal',
        arenaId: 'arena_gen',
        arenaName: arenaNameInput.trim() || 'Main Turf Arena',
        date: matchDate || new Date().toISOString().split('T')[0],
        day: new Date(matchDate || Date.now()).toLocaleDateString('en-US', { weekday: 'long' }),
        startTime: startTime,
        endTime: endTime,
        matchType: 'FRIENDLY',
        maxPlayers: Number(maxPlayers),
        currentPlayers: 1,
        hostId: user.uid,
        hostName: profile.displayName || 'Host',
        teamAId: isTeamVsTeam ? teamAId : null,
        teamAName: isTeamVsTeam ? (teamAObj?.name || null) : null,
        teamBId: isTeamVsTeam ? (teamBId || null) : null,
        teamBName: isTeamVsTeam ? (teamBObj?.name || null) : null,
        description: description.trim() || `Friendly ${matchSport} fixture organized on TruFit.`,
        rules: rules.trim(),
        isPublic: isPublic,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      };

      // 1. Write match doc
      await setDoc(doc(db, 'matches', matchId), newMatch);

      // 2. Add host as participant
      const participantId = `${matchId}_${user.uid}`;
      const hostParticipant: MatchPlayer = {
        id: participantId,
        matchId: matchId,
        uid: user.uid,
        name: profile.displayName || 'Host',
        photoURL: profile.photoURL || null,
        teamId: isTeamVsTeam ? teamAId : null,
        teamName: isTeamVsTeam ? (teamAObj?.name || null) : null,
        joinedAt: now,
      };
      await setDoc(doc(db, 'matchPlayers', participantId), hostParticipant);

      // 3. Update user matchesPlayed count
      const currentMatches = profile.matchesPlayed || 0;
      await updateDoc(doc(db, 'users', user.uid), {
        matchesPlayed: currentMatches + 1,
        updatedAt: now,
      });

      showToast(`Friendly Match "${newMatch.matchName}" hosted successfully!`, 'success');
      setShowHostModal(false);
      setSelectedMatch(newMatch);
    } catch (err: any) {
      console.error('Error hosting match:', err);
      showToast(err.message || 'Failed to host match.', 'error');
    } finally {
      setHostingMatch(false);
    }
  };

  // Host status update
  const handleUpdateMatchStatus = async (match: Match, nextStatus: Match['status']) => {
    if (!user || user.uid !== match.hostId) return;
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      setSelectedMatch((prev) => (prev ? { ...prev, status: nextStatus } : null));
      showToast(`Match status updated to ${nextStatus}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update status.', 'error');
    }
  };

  // Filtered list
  const filteredMatches = matches.filter((m) => {
    if (!m.isPublic && m.hostId !== user?.uid && !joinedMatchIds.has(m.id)) {
      return false;
    }

    if (selectedSport !== 'All' && m.sport.toLowerCase() !== selectedSport.toLowerCase()) {
      return false;
    }

    if (statusFilter === 'OPEN' && m.status !== 'OPEN') {
      return false;
    }

    if (statusFilter === 'MY_MATCHES') {
      if (m.hostId !== user?.uid && !joinedMatchIds.has(m.id)) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNameMatch = m.matchName.toLowerCase().includes(q);
      const turfMatch = m.turfName.toLowerCase().includes(q);
      const teamMatch =
        m.teamAName?.toLowerCase().includes(q) || m.teamBName?.toLowerCase().includes(q);
      if (!matchNameMatch && !turfMatch && !teamMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Friendly Fixtures & Match Hosting
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize Team vs Team or Open friendly games at your booked venues.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMatchDate(new Date().toISOString().split('T')[0]);
            setShowHostModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
        >
          <Plus className="w-4 h-4" />
          <span>Host Friendly Match</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search matches by title, venue, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'OPEN'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open To Join
            </button>
            <button
              onClick={() => setStatusFilter('MY_MATCHES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'MY_MATCHES'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Matches
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

      {/* Matches Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-xs">Loading friendly fixtures...</span>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No upcoming matches</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Host a friendly match between your squad and another team or create an open community fixture.
          </p>
          <button
            type="button"
            onClick={() => {
              setMatchDate(new Date().toISOString().split('T')[0]);
              setShowHostModal(true);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Host Friendly Match
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => {
            const isJoined = joinedMatchIds.has(match.id);
            const isHost = match.hostId === user?.uid;
            const isFull = match.currentPlayers >= match.maxPlayers || match.status === 'FULL';
            const isActionLoading = actionLoadingId === match.id;

            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                        {match.sport}
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        {match.matchType}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        match.status === 'OPEN'
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                          : match.status === 'CONFIRMED' || match.status === 'IN_PROGRESS'
                          ? 'text-indigo-300 bg-indigo-950/60 border-indigo-500/30'
                          : match.status === 'COMPLETED'
                          ? 'text-slate-400 bg-slate-800 border-slate-700'
                          : 'text-rose-400 bg-rose-950/60 border-rose-500/30'
                      }`}
                    >
                      {match.status}
                    </span>
                  </div>

                  {/* Team vs Team Header if present */}
                  {match.teamAName && match.teamBName ? (
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl mb-3 flex items-center justify-between text-center">
                      <span className="text-xs font-bold text-white truncate max-w-[90px]">
                        {match.teamAName}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 px-2 py-0.5 bg-indigo-950/80 rounded-md border border-indigo-500/30">
                        <Swords className="w-3 h-3" />
                        <span>VS</span>
                      </div>
                      <span className="text-xs font-bold text-white truncate max-w-[90px]">
                        {match.teamBName}
                      </span>
                    </div>
                  ) : null}

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
                    {match.matchName}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-3 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">
                      {match.turfName} • {match.turfCity}
                    </span>
                  </div>

                  {/* Schedule */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {match.date} ({match.day})
                      </span>
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {match.startTime} - {match.endTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {match.currentPlayers} / {match.maxPlayers} Players
                      </span>
                      <span className="text-xs text-slate-400">
                        Host: <span className="text-slate-200">{match.hostName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMatch(match);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  <div>
                    {isJoined ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-3 py-2 bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Joined</span>
                        </span>
                        {!isHost && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={(e) => handleLeaveMatch(match, e)}
                            className="px-2.5 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            title="Leave Match"
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
                        Match Full
                      </button>
                    ) : match.status !== 'OPEN' ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                      >
                        Registration Closed
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={(e) => handleJoinMatch(match, e)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-950/50"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Join Match</span>
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
      {/* MATCH DETAILS MODAL */}
      {/* ==================================================== */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {selectedMatch.sport}
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                      {selectedMatch.matchType}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {selectedMatch.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedMatch.matchName}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Team vs Team Header */}
              {selectedMatch.teamAName && selectedMatch.teamBName && (
                <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-950 to-indigo-950/80 border border-indigo-500/30 rounded-xl flex items-center justify-around text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                      Team A
                    </span>
                    <h4 className="text-base font-bold text-white">{selectedMatch.teamAName}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center text-xs font-black text-indigo-300 shadow-lg">
                    VS
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                      Team B
                    </span>
                    <h4 className="text-base font-bold text-white">{selectedMatch.teamBName}</h4>
                  </div>
                </div>
              )}

              {/* Venue & Schedule Overview */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Venue
                  </span>
                  <p className="text-xs font-bold text-white">{selectedMatch.turfName}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    {selectedMatch.arenaName} • {selectedMatch.turfAddress}, {selectedMatch.turfCity}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Match Time
                  </span>
                  <p className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedMatch.date} ({selectedMatch.day})
                  </p>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {selectedMatch.startTime} - {selectedMatch.endTime}
                  </p>
                </div>
              </div>

              {selectedMatch.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    Match Overview
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedMatch.description}
                  </p>
                </div>
              )}

              {selectedMatch.rules && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    Match Rules
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedMatch.rules}
                  </p>
                </div>
              )}

              {/* Match Players Roster */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                  Match Lineup ({matchPlayersList.length} / {selectedMatch.maxPlayers} Athletes)
                </h4>

                {loadingPlayers ? (
                  <div className="py-6 flex justify-center text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                    Loading match lineup...
                  </div>
                ) : matchPlayersList.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500 border border-slate-800">
                    No players in lineup yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {matchPlayersList.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={async () => {
                          try {
                            const snap = await getDoc(doc(db, 'users', p.uid));
                            if (snap.exists()) setViewingPlayer(snap.data() as UserProfile);
                          } catch (e) {}
                        }}
                        className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-slate-700 transition-colors"
                      >
                        <span className="text-[10px] font-bold text-slate-600 w-3.5 text-center">
                          {idx + 1}
                        </span>
                        {p.photoURL ? (
                          <img
                            src={p.photoURL}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[120px]">
                              {p.name}
                            </span>
                            {p.uid === selectedMatch.hostId && (
                              <span className="text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                Host
                              </span>
                            )}
                          </div>
                          {p.teamName && (
                            <span className="text-[10px] text-indigo-400 truncate block">
                              {p.teamName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Host Controls */}
              {user?.uid === selectedMatch.hostId && (
                <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white">Host Controls</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateMatchStatus(selectedMatch, 'CONFIRMED')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMatchStatus(selectedMatch, 'IN_PROGRESS')}
                      className="px-3 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Kick-Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMatchStatus(selectedMatch, 'COMPLETED')}
                      className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMatchStatus(selectedMatch, 'CANCELLED')}
                      className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Host: <span className="text-slate-300 font-semibold">{selectedMatch.hostName}</span>
              </span>

              <div className="flex items-center gap-2">
                {joinedMatchIds.has(selectedMatch.id) ? (
                  <>
                    <span className="px-3 py-2 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>You are registered</span>
                    </span>
                    {user?.uid !== selectedMatch.hostId && (
                      <button
                        type="button"
                        onClick={() => handleLeaveMatch(selectedMatch)}
                        className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Leave Match</span>
                      </button>
                    )}
                  </>
                ) : selectedMatch.currentPlayers >= selectedMatch.maxPlayers ? (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Match Full
                  </button>
                ) : selectedMatch.status !== 'OPEN' ? (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Registration Closed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleJoinMatch(selectedMatch)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Join Match</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* HOST MATCH MODAL */}
      {/* ==================================================== */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Host Friendly Match</h3>
                  <p className="text-xs text-slate-400">Setup an official friendly fixture</p>
                </div>
              </div>
              <button
                onClick={() => setShowHostModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHostMatchSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Match Title *
                </label>
                <input
                  type="text"
                  required
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  placeholder="e.g. Friday Night Football Friendly"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Sport
                  </label>
                  <select
                    value={matchSport}
                    onChange={(e) => setMatchSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  >
                    {['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Venue / Turf
                  </label>
                  <select
                    value={selectedTurfId}
                    onChange={(e) => setSelectedTurfId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  >
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Team vs Team Toggle */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Team vs Team Fixture</span>
                    <span className="text-[11px] text-slate-400">
                      Match two registered squads against each other
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isTeamVsTeam}
                    onChange={(e) => setIsTeamVsTeam(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {isTeamVsTeam && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Select Team A
                      </label>
                      <select
                        value={teamAId}
                        onChange={(e) => setTeamAId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                      >
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.sport})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Select Opponent (Team B)
                      </label>
                      <select
                        value={teamBId}
                        onChange={(e) => setTeamBId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Open Invitation --</option>
                        {allTeams
                          .filter((t) => t.id !== teamAId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.sport})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Max Total Players
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={40}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Arena / Pitch Name
                  </label>
                  <input
                    type="text"
                    value={arenaNameInput}
                    onChange={(e) => setArenaNameInput(e.target.value)}
                    placeholder="e.g. Arena 1 (7v7)"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Match Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional match notes or instructions..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={hostingMatch}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                >
                  {hostingMatch ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Hosting Match...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      Publish Friendly Fixture
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Profile Modal */}
      <PublicProfileModal
        player={viewingPlayer}
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
      />
    </div>
  );
};
