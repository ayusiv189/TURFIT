import React, { useState, useEffect } from 'react';
import { Tournament, TournamentCategory } from '../../types';
import { listenTournaments, updateTournament, deleteTournament } from '../../lib/db';
import {
  Trophy,
  Search,
  MapPin,
  Calendar,
  Users,
  Award,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface AdminTournamentManagerProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminTournamentManager: React.FC<AdminTournamentManagerProps> = ({ showToast }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | TournamentCategory>('ALL');

  useEffect(() => {
    const unsub = listenTournaments(undefined, (list) => {
      setTournaments(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const citiesList = Array.from(new Set(tournaments.map((t) => t.city || 'Mumbai').filter(Boolean)));

  const filteredTournaments = tournaments.filter((t) => {
    if (selectedCityFilter !== 'ALL' && (t.city || 'Mumbai').toLowerCase() !== selectedCityFilter.toLowerCase()) {
      return false;
    }
    if (selectedCategoryFilter !== 'ALL' && t.category !== selectedCategoryFilter) {
      return false;
    }
    const matchesQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  const handleStatusChange = async (tournamentId: string, status: Tournament['status']) => {
    try {
      await updateTournament(tournamentId, { status });
      showToast(`Tournament status updated to ${status}`);
    } catch (err) {
      showToast('Failed to update tournament status', 'error');
    }
  };

  const handleDelete = async (tournamentId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${title}"?`)) return;
    try {
      await deleteTournament(tournamentId);
      showToast(`Tournament "${title}" deleted successfully`);
    } catch (err) {
      showToast('Failed to delete tournament', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading tournaments management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Central Tournament Operations & Moderation</h2>
          </div>
          <p className="text-xs text-slate-400">
            Monitor, moderate, and manage all community open and corporate tournaments hosted across all cities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300">
            Total Tournaments: <span className="text-amber-400 font-bold">{tournaments.length}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tournaments, sports, organizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedCityFilter}
            onChange={(e) => setSelectedCityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Cities ({tournaments.length})</option>
            {citiesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories</option>
            <option value="COMMUNITY_OPEN">Community Open</option>
            <option value="CORPORATE">Corporate Leagues</option>
          </select>
        </div>
      </div>

      {/* Tournaments List */}
      {filteredTournaments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-400 space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">No tournaments found matching your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTournaments.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {t.category === 'CORPORATE' ? 'Corporate League' : 'Community Open'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        {t.sport}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.status === 'UPCOMING'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : t.status === 'ONGOING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {t.status || 'UPCOMING'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{t.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      ₹{t.prizePool?.total?.toLocaleString() || '10,000'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Prize Pool</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.city || 'Mumbai'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.startDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.registeredTeamsCount || 0}/{t.maxTeams || 16} Teams</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>Fee: ₹{t.registrationFeePerTeam || 0}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Organizer: <strong className="text-slate-200">{t.organizerName}</strong> ({t.organizerPhone})
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <select
                    value={t.status || 'UPCOMING'}
                    onChange={(e) => handleStatusChange(t.id, e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <button
                  onClick={() => handleDelete(t.id, t.title)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
