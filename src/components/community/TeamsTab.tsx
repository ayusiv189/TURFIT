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
import { Team, TeamMember, TeamMemberRole, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Users,
  Plus,
  Search,
  Trophy,
  MapPin,
  X,
  Crown,
  UserPlus,
  Trash2,
  ChevronRight,
  LogOut,
  Check,
  Loader2,
  Lock,
  Globe,
  Award,
  AlertCircle,
  Edit2,
  UserCheck,
} from 'lucide-react';
import { InvitePlayerModal } from './InvitePlayerModal';
import { PublicProfileModal } from './PublicProfileModal';

interface TeamsTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ showToast }) => {
  const { user, profile } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [activeSubTab, setActiveSubTab] = useState<'MY_TEAMS' | 'ALL_TEAMS'>('MY_TEAMS');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // My Memberships cache
  const [myTeamMemberships, setMyTeamMemberships] = useState<Map<string, TeamMember>>(new Map());

  // Selected Team Details
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Create Team Modal
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSport, setNewTeamSport] = useState('Football');
  const [newTeamCity, setNewTeamCity] = useState(profile?.city || '');
  const [newTeamMaxMembers, setNewTeamMaxMembers] = useState(15);
  const [newTeamIsPublic, setNewTeamIsPublic] = useState(true);
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetTeam, setInviteTargetTeam] = useState<Team | null>(null);

  // Public Profile Modal
  const [viewingPlayer, setViewingPlayer] = useState<UserProfile | null>(null);

  // Real-time listener for Teams
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'teams'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Team[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Team));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTeams(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching teams:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for current user's team memberships
  useEffect(() => {
    if (!user) {
      setMyTeamMemberships(new Map());
      return;
    }
    const q = query(collection(db, 'teamMembers'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = new Map<string, TeamMember>();
      snapshot.forEach((d) => {
        const mem = d.data() as TeamMember;
        map.set(mem.teamId, mem);
      });
      setMyTeamMemberships(map);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for members of selected team
  useEffect(() => {
    if (!selectedTeam) {
      setTeamMembers([]);
      return;
    }
    setLoadingMembers(true);
    const q = query(collection(db, 'teamMembers'), where('teamId', '==', selectedTeam.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TeamMember[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as TeamMember));
      // Sort: Captain first, then Co-Captain, then Members
      list.sort((a, b) => {
        const roleScore = (r: TeamMemberRole) => (r === 'CAPTAIN' ? 3 : r === 'CO-CAPTAIN' ? 2 : 1);
        return roleScore(b.role) - roleScore(a.role);
      });
      setTeamMembers(list);
      setLoadingMembers(false);
    });

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  // Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newTeamName.trim()) {
      showToast('Team name is required.', 'error');
      return;
    }

    setCreatingTeam(true);
    try {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newTeam: Team = {
        id: teamId,
        name: newTeamName.trim(),
        sport: newTeamSport,
        city: newTeamCity.trim() || 'National',
        description: newTeamDescription.trim() || `Official ${newTeamSport} squad.`,
        maxMembers: Number(newTeamMaxMembers),
        memberCount: 1,
        isPublic: newTeamIsPublic,
        captainId: user.uid,
        captainName: profile.displayName || 'Captain',
        captainPhotoURL: profile.photoURL || null,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Create Team doc
      await setDoc(doc(db, 'teams', teamId), newTeam);

      // 2. Add creator as Captain in teamMembers
      const memberId = `${teamId}_${user.uid}`;
      const captainMember: TeamMember = {
        id: memberId,
        teamId: teamId,
        uid: user.uid,
        name: profile.displayName || 'Captain',
        photoURL: profile.photoURL || null,
        preferredSport: newTeamSport,
        position: profile.preferredPosition || 'Captain / All-Rounder',
        role: 'CAPTAIN',
        joinedAt: now,
      };
      await setDoc(doc(db, 'teamMembers', memberId), captainMember);

      // 3. Update user profile teamsCount
      const currentTeamsCount = profile.teamsCount || 0;
      await updateDoc(doc(db, 'users', user.uid), {
        teamsCount: currentTeamsCount + 1,
        updatedAt: now,
      });

      showToast(`Team "${newTeam.name}" created successfully!`, 'success');
      setShowCreateTeamModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setSelectedTeam(newTeam);
    } catch (err: any) {
      console.error('Error creating team:', err);
      showToast(err.message || 'Failed to create team.', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Join Public Team
  const handleJoinTeam = async (team: Team) => {
    if (!user || !profile) {
      showToast('Please sign in to join a team.', 'error');
      return;
    }
    if (myTeamMemberships.has(team.id)) {
      showToast('You are already a member of this squad.', 'info');
      return;
    }
    if (team.memberCount >= team.maxMembers) {
      showToast('This squad is currently at maximum capacity.', 'error');
      return;
    }

    try {
      const memberId = `${team.id}_${user.uid}`;
      const now = new Date().toISOString();

      const member: TeamMember = {
        id: memberId,
        teamId: team.id,
        uid: user.uid,
        name: profile.displayName || 'Player',
        photoURL: profile.photoURL || null,
        preferredSport: profile.preferredSport || team.sport,
        position: profile.preferredPosition || 'Player',
        role: 'MEMBER',
        joinedAt: now,
      };

      await setDoc(doc(db, 'teamMembers', memberId), member);

      // Increment team count
      const newCount = team.memberCount + 1;
      await updateDoc(doc(db, 'teams', team.id), {
        memberCount: newCount,
        updatedAt: now,
      });

      // Send notification to Captain
      await addDoc(collection(db, 'notifications'), {
        userId: team.captainId,
        title: 'New Team Member!',
        message: `${profile.displayName || 'A player'} joined your squad "${team.name}"!`,
        type: 'GENERAL',
        linkType: 'TEAM',
        linkId: team.id,
        read: false,
        createdAt: now,
      });

      showToast(`Joined ${team.name}! Welcome to the squad.`, 'success');
    } catch (err: any) {
      console.error('Error joining team:', err);
      showToast(err.message || 'Failed to join team.', 'error');
    }
  };

  // Leave Team
  const handleLeaveTeam = async (team: Team) => {
    if (!user) return;
    const myRole = myTeamMemberships.get(team.id)?.role;
    if (myRole === 'CAPTAIN') {
      showToast('Captains cannot leave without transferring captaincy or disbanding the team.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to leave ${team.name}?`)) return;

    try {
      const memberId = `${team.id}_${user.uid}`;
      await deleteDoc(doc(db, 'teamMembers', memberId));

      const newCount = Math.max(1, team.memberCount - 1);
      await updateDoc(doc(db, 'teams', team.id), {
        memberCount: newCount,
        updatedAt: new Date().toISOString(),
      });

      if (selectedTeam?.id === team.id) {
        setSelectedTeam(null);
      }
      showToast(`You left ${team.name}.`, 'info');
    } catch (err: any) {
      showToast('Failed to leave team.', 'error');
    }
  };

  // Role management (Promote / Demote)
  const handleChangeMemberRole = async (member: TeamMember, newRole: TeamMemberRole) => {
    if (!selectedTeam || !user || selectedTeam.captainId !== user.uid) return;
    if (member.uid === user.uid) return;

    try {
      await updateDoc(doc(db, 'teamMembers', member.id), {
        role: newRole,
      });
      showToast(`Updated ${member.name}'s role to ${newRole}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update role.', 'error');
    }
  };

  // Remove Member
  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeam || !user) return;
    const isCaptain = selectedTeam.captainId === user.uid;
    const isCoCaptain = myTeamMemberships.get(selectedTeam.id)?.role === 'CO-CAPTAIN';

    if (!isCaptain && !isCoCaptain) return;
    if (member.role === 'CAPTAIN') return;

    if (!window.confirm(`Remove ${member.name} from ${selectedTeam.name}?`)) return;

    try {
      await deleteDoc(doc(db, 'teamMembers', member.id));
      const newCount = Math.max(1, selectedTeam.memberCount - 1);
      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        memberCount: newCount,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Removed ${member.name} from the squad.`, 'info');
    } catch (err: any) {
      showToast('Failed to remove member.', 'error');
    }
  };

  // Filtered list
  const filteredTeams = teams.filter((t) => {
    if (activeSubTab === 'MY_TEAMS') {
      if (!myTeamMemberships.has(t.id) && t.captainId !== user?.uid) {
        return false;
      }
    } else {
      // ALL_TEAMS -> only public teams or teams I'm part of
      if (!t.isPublic && !myTeamMemberships.has(t.id) && t.captainId !== user?.uid) {
        return false;
      }
    }

    if (selectedSport !== 'All' && t.sport.toLowerCase() !== selectedSport.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchCity = t.city.toLowerCase().includes(q);
      const matchCaptain = t.captainName.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchCaptain) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Sports Squads & Teams
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Build your squad, recruit registered athletes, and compete in friendly matches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateTeamModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
        >
          <Plus className="w-4 h-4" />
          <span>Create Squad</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('MY_TEAMS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === 'MY_TEAMS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Squads ({myTeamMemberships.size})
            </button>
            <button
              onClick={() => setActiveSubTab('ALL_TEAMS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === 'ALL_TEAMS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Discover Squads
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team name, city, captain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sports filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'].map(
            (sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
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

      {/* Teams Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-xs">Loading squads...</span>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            {activeSubTab === 'MY_TEAMS'
              ? "You haven't joined a squad yet"
              : 'No squads found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            {activeSubTab === 'MY_TEAMS'
              ? 'Create your own sports team or discover open squads in your city to join.'
              : 'Try searching for another team or create the first squad for your sport!'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateTeamModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Squad Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const isMember = myTeamMemberships.has(team.id);
            const myRole = myTeamMemberships.get(team.id)?.role;
            const isCaptain = team.captainId === user?.uid;

            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                      {team.sport}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!team.isPublic && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                      {isMember && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          {myRole === 'CAPTAIN' ? 'Captain' : myRole === 'CO-CAPTAIN' ? 'Co-Captain' : 'Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-lg flex-shrink-0">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        {team.city}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    {team.description}
                  </p>

                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Squad</span>
                      <span className="text-xs font-bold text-white">
                        {team.memberCount} / {team.maxMembers}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Matches</span>
                      <span className="text-xs font-bold text-slate-300">{team.matchesPlayed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">W / D / L</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {team.wins} / {team.draws} / {team.losses}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Captain: <span className="text-slate-200 font-semibold">{team.captainName}</span>
                  </span>

                  {isMember ? (
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>View Squad</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  ) : team.isPublic ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinTeam(team);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Join Squad
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">Invite Only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* TEAM DETAILS MODAL */}
      {/* ==================================================== */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xl">
                  {selectedTeam.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {selectedTeam.sport}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {selectedTeam.city}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">{selectedTeam.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Record Cards */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Members</span>
                  <span className="text-sm font-bold text-white">
                    {selectedTeam.memberCount} / {selectedTeam.maxMembers}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Matches</span>
                  <span className="text-sm font-bold text-indigo-300">{selectedTeam.matchesPlayed}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Wins</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedTeam.wins}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Draw / Loss</span>
                  <span className="text-sm font-bold text-slate-400">
                    {selectedTeam.draws} / {selectedTeam.losses}
                  </span>
                </div>
              </div>

              {selectedTeam.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                    Squad Bio
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    {selectedTeam.description}
                  </p>
                </div>
              )}

              {/* Roster Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Squad Roster ({teamMembers.length} Athletes)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Official team lineup and roles
                    </span>
                  </div>

                  {(selectedTeam.captainId === user?.uid ||
                    myTeamMemberships.get(selectedTeam.id)?.role === 'CO-CAPTAIN') && (
                    <button
                      type="button"
                      onClick={() => {
                        setInviteTargetTeam(selectedTeam);
                        setShowInviteModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Athlete</span>
                    </button>
                  )}
                </div>

                {loadingMembers ? (
                  <div className="py-8 flex justify-center text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
                    Loading squad members...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {teamMembers.map((member) => {
                      const isMe = member.uid === user?.uid;
                      const isCaptain = member.role === 'CAPTAIN';
                      const isCoCaptain = member.role === 'CO-CAPTAIN';
                      const canManage =
                        selectedTeam.captainId === user?.uid && member.uid !== user?.uid;

                      return (
                        <div
                          key={member.id}
                          className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2.5"
                        >
                          <div
                            onClick={async () => {
                              try {
                                const snap = await getDoc(doc(db, 'users', member.uid));
                                if (snap.exists()) {
                                  setViewingPlayer(snap.data() as UserProfile);
                                }
                              } catch (e) {}
                            }}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                          >
                            {member.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={member.name}
                                className="w-9 h-9 rounded-xl object-cover bg-slate-800 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate max-w-[110px] group-hover:text-indigo-300">
                                  {member.name}
                                </span>
                                {isCaptain && (
                                  <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span
                                  className={`font-bold ${
                                    isCaptain
                                      ? 'text-amber-400'
                                      : isCoCaptain
                                      ? 'text-indigo-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {member.role}
                                </span>
                                {member.position && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{member.position}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Captain Controls for member */}
                          {canManage && (
                            <div className="flex items-center gap-1">
                              {isCoCaptain ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangeMemberRole(member, 'MEMBER')}
                                  title="Demote to Member"
                                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer"
                                >
                                  Demote
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleChangeMemberRole(member, 'CO-CAPTAIN')}
                                  title="Promote to Co-Captain"
                                  className="text-xs text-indigo-300 hover:text-indigo-200 px-2 py-1 bg-indigo-950/60 rounded-lg border border-indigo-500/30 cursor-pointer"
                                >
                                  Promote
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                title="Remove athlete"
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Created on {new Date(selectedTeam.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                {myTeamMemberships.has(selectedTeam.id) ? (
                  <>
                    <span className="px-3 py-2 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>You are in this Squad</span>
                    </span>
                    {selectedTeam.captainId !== user?.uid && (
                      <button
                        type="button"
                        onClick={() => handleLeaveTeam(selectedTeam)}
                        className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Leave Squad</span>
                      </button>
                    )}
                  </>
                ) : selectedTeam.isPublic ? (
                  <button
                    type="button"
                    onClick={() => handleJoinTeam(selectedTeam)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Join Squad</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Private Squad</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CREATE TEAM MODAL */}
      {/* ==================================================== */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Squad</h3>
                  <p className="text-xs text-slate-400">You will be designated as Team Captain</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Squad Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Thunderbolts FC"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Sport
                  </label>
                  <select
                    value={newTeamSport}
                    onChange={(e) => setNewTeamSport(e.target.value)}
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
                    City / Home Region
                  </label>
                  <input
                    type="text"
                    value={newTeamCity}
                    onChange={(e) => setNewTeamCity(e.target.value)}
                    placeholder="e.g. Bhopal"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Max Squad Size
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={40}
                    value={newTeamMaxMembers}
                    onChange={(e) => setNewTeamMaxMembers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Privacy
                  </label>
                  <select
                    value={newTeamIsPublic ? 'PUBLIC' : 'PRIVATE'}
                    onChange={(e) => setNewTeamIsPublic(e.target.value === 'PUBLIC')}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PUBLIC">Public (Visible in discovery)</option>
                    <option value="PRIVATE">Private (Invite only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Squad Description
                </label>
                <textarea
                  rows={3}
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Tell athletes about your team culture, competitive goals, or preferred schedule..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                >
                  {creatingTeam ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering Squad...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Create Squad & Become Captain
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <InvitePlayerModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteTargetTeam(null);
        }}
        targetType="TEAM"
        targetTeam={inviteTargetTeam}
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
