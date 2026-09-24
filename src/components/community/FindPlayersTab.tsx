import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Lobby, Team } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Users,
  MapPin,
  Trophy,
  Shield,
  Activity,
  Filter,
  Eye,
  UserPlus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { PublicProfileModal } from './PublicProfileModal';
import { InvitePlayerModal } from './InvitePlayerModal';

interface FindPlayersTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  selectedCity?: string;
}

export const FindPlayersTab: React.FC<FindPlayersTabProps> = ({ showToast, selectedCity: propsSelectedCity }) => {
  const { user, profile } = useAuth();

  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedCity, setSelectedCity] = useState(() => (propsSelectedCity && propsSelectedCity !== 'ALL' ? propsSelectedCity : 'All'));

  useEffect(() => {
    if (propsSelectedCity && propsSelectedCity !== 'ALL') {
      setSelectedCity(propsSelectedCity);
    }
  }, [propsSelectedCity]);

  // Modals
  const [viewingPlayer, setViewingPlayer] = useState<UserProfile | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetType, setInviteTargetType] = useState<'LOBBY' | 'TEAM'>('LOBBY');
  const [selectedPlayerForInvite, setSelectedPlayerForInvite] = useState<UserProfile | null>(null);

  // Real-time listener for players in users collection
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), where('role', '==', 'PLAYER'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          if (d.id !== user?.uid) {
            list.push({ uid: d.id, ...d.data() } as UserProfile);
          }
        });
        setPlayers(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching players:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Unique cities list
  const cities = ['All', ...Array.from(new Set(players.map((p) => p.city).filter(Boolean)))];

  // Filtered players
  const filteredPlayers = players.filter((p) => {
    if (selectedSport !== 'All') {
      const matchPref = p.preferredSport?.toLowerCase() === selectedSport.toLowerCase();
      const matchSportsList = p.preferredSports?.some(
        (s) => s.toLowerCase() === selectedSport.toLowerCase()
      );
      if (!matchPref && !matchSportsList) return false;
    }

    if (selectedLevel !== 'All') {
      if (p.experienceLevel?.toLowerCase() !== selectedLevel.toLowerCase()) return false;
    }

    if (selectedCity !== 'All') {
      if (p.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.displayName?.toLowerCase().includes(q);
      const userMatch = p.username?.toLowerCase().includes(q);
      const bioMatch = p.bio?.toLowerCase().includes(q);
      const cityMatch = p.city?.toLowerCase().includes(q);
      if (!nameMatch && !userMatch && !bioMatch && !cityMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Sports Community & Athletes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Discover verified players in your area, view athletic stats, and invite teammates.
            </p>
          </div>
        </div>

        <div className="text-xs text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-center">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{players.length} Registered Community Athletes</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by player name, @username, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Level Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Skill Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PRO">Pro / Semi-Pro</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Playing Regions</option>
              {cities
                .filter((c) => c !== 'All')
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
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

      {/* Players Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-xs">Finding community athletes...</span>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No players found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3 leading-relaxed">
            {searchQuery || selectedSport !== 'All' || selectedLevel !== 'All'
              ? 'Try modifying your search keywords or filter criteria.'
              : 'You are among the first athletes registered in this region! Invite friends to join TurFit.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <div
              key={player.uid}
              onClick={() => setViewingPlayer(player)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-base flex items-center justify-center flex-shrink-0">
                        {(player.displayName || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {player.displayName}
                      </h3>
                      {player.username && (
                        <p className="text-xs text-indigo-400 font-medium">@{player.username}</p>
                      )}
                      {player.city && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          {player.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {player.experienceLevel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 flex-shrink-0">
                      {player.experienceLevel}
                    </span>
                  )}
                </div>

                {player.bio && (
                  <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    "{player.bio}"
                  </p>
                )}

                {/* Sports & Stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Sport</span>
                    <span className="text-xs font-bold text-indigo-300 truncate block mt-0.5">
                      {player.preferredSport || 'Athlete'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Position</span>
                    <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
                      {player.preferredPosition || 'Flex'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Matches</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                      {player.matchesPlayed || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPlayer(player);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPlayer(player);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-950/50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <PublicProfileModal
        player={viewingPlayer}
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
      />
    </div>
  );
};
