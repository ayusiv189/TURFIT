import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PlayerPool, PoolInterestedPlayer, MatchHoursCategory, Turf } from '../../types';
import {
  getPlayerPools,
  createPlayerPool,
  joinPlayerPool,
  leavePlayerPool,
  deletePlayerPool,
  convertPoolToLobby,
} from '../../lib/phase3';
import { getAllActiveTurfs } from '../../lib/db';

interface PoolsTabProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PoolsTab: React.FC<PoolsTabProps> = ({ showToast }) => {
  const { user, profile } = useAuth();
  const [pools, setPools] = useState<PlayerPool[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [selectedHours, setSelectedHours] = useState<string>('ALL');
  const [searchCity, setSearchCity] = useState<string>(profile?.city || 'Mumbai');

  // Create Pool Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSport, setNewSport] = useState('Football');
  const [newRequiredPlayers, setNewRequiredPlayers] = useState<number>(10);
  const [newMaxPrice, setNewMaxPrice] = useState<number>(150);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('06:00 PM');
  const [newHoursCategory, setNewHoursCategory] = useState<'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT'>('EVENING');
  const [preferredTurfId, setPreferredTurfId] = useState<string>('');
  const [newDesc, setNewDesc] = useState('');

  // Conversion / Action loadings
  const [backingPoolId, setBackingPoolId] = useState<string | null>(null);

  // Load pools and turfs on mount
  useEffect(() => {
    loadData();
  }, [selectedSport, selectedHours, searchCity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const activePools = await getPlayerPools({
        sport: selectedSport,
        matchHoursCategory: selectedHours as any,
        city: searchCity || undefined,
      });
      setPools(activePools);

      const activeTurfs = await getAllActiveTurfs();
      setTurfs(activeTurfs);
    } catch (err) {
      console.warn('Failed to load matchmaking pools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newDate) {
      showToast('Please select a target date for the squad.', 'error');
      return;
    }

    setCreating(true);
    try {
      const selectedTurfObj = turfs.find((t) => t.id === preferredTurfId);
      await createPlayerPool({
        creatorId: user.uid,
        creatorName: profile?.displayName || user.displayName || 'Athlete',
        creatorPhone: profile?.phoneNumber || '',
        creatorPhotoURL: profile?.photoURL || user.photoURL || null,
        sport: newSport,
        city: searchCity || profile?.city || 'Mumbai',
        area: selectedTurfObj?.area || '',
        preferredDate: newDate,
        preferredTime: newTime,
        matchHoursCategory: newHoursCategory,
        requiredPlayers: newRequiredPlayers,
        maxPricePerPlayer: newMaxPrice,
        preferredTurfId: preferredTurfId || undefined,
        preferredTurfName: selectedTurfObj?.name || undefined,
        description: newDesc,
      });

      showToast('Squad Matchmaking Pool created successfully!', 'success');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create matchmaking pool.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleBackPool = async (pool: PlayerPool) => {
    if (!user) {
      showToast('Please sign in to back this squad.', 'error');
      return;
    }

    setBackingPoolId(pool.id);
    try {
      const res = await joinPlayerPool(pool.id, {
        uid: user.uid,
        name: profile?.displayName || user.displayName || 'Athlete',
        phone: profile?.phoneNumber || '',
        photoURL: profile?.photoURL || user.photoURL || null,
        skillLevel: profile?.experienceLevel || 'Athlete',
        paymentPreference: 'UPI',
      });

      if (res.isFullyBacked) {
        showToast('Squad is fully backed! Triggering automatic slot reservation & live lobby...', 'success');
        // Trigger auto convert to lobby
        const convResult = await convertPoolToLobby(pool.id);
        showToast(`Instant match created! Joined "${convResult.turfName}" lobby.`, 'success');
      } else {
        showToast('Successfully joined squad pool! Waiting for other athletes to back.', 'success');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to join pool.', 'error');
    } finally {
      setBackingPoolId(null);
    }
  };

  const handleLeavePool = async (poolId: string) => {
    if (!user) return;
    setBackingPoolId(poolId);
    try {
      await leavePlayerPool(poolId, user.uid);
      showToast('Withdrew from matchmaking pool.', 'info');
      loadData();
    } catch (err: any) {
      showToast('Failed to leave matchmaking pool.', 'error');
    } finally {
      setBackingPoolId(null);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to cancel and dissolve this matchmaking squad?')) return;
    try {
      await deletePlayerPool(poolId, user?.uid);
      showToast('Matchmaking squad dissolved.', 'info');
      loadData();
    } catch (err: any) {
      showToast('Failed to delete squad pool.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Matchmaking Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2 max-w-xl z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Automated Squad Matchmaking</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Can't find a complete squad? Back an Interest Pool!
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create or back an interest pool with your target budget and timing. As soon as enough athletes join, the system automatically books the turf slot and deploys a live match lobby!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 self-start md:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Matchmaking Pool</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Sports Filter */}
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['All', 'Football', 'Box Cricket', 'Badminton', 'Pickleball'].map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  selectedSport === sport
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>

          {/* Timing Filter */}
          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">🕒 All Hours</option>
            <option value="MORNING">☀️ Morning</option>
            <option value="MIDDAY">🌤️ Midday</option>
            <option value="EVENING">🌆 Evening</option>
            <option value="NIGHT">🌙 Night</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <MapPin className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search City (e.g. Mumbai)"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Pools Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Scanning community interest channels...</p>
        </div>
      ) : pools.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">No active pools in {searchCity}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Be the first to rally the local athletes! Create an interest pool for your favorite sport and we'll broadcast it to players near you.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Create {selectedSport !== 'All' ? selectedSport : 'Sport'} Pool
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pools.map((pool) => {
            const isCreator = pool.creatorId === user?.uid;
            const isBacked = pool.interestedPlayers?.some((p) => p.uid === user?.uid);
            const backPercent = Math.min(100, Math.round((pool.currentPlayersCount / pool.requiredPlayers) * 100));

            return (
              <div
                key={pool.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-xl"
              >
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                      {pool.sport}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {pool.area || pool.city}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white truncate">
                    {pool.sport} Backers Squad
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px]">
                    {pool.description}
                  </p>
                </div>

                {/* Matchmaking Info Rows */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Target Date:
                    </span>
                    <strong className="text-slate-200">{pool.preferredDate}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Target Timing:
                    </span>
                    <strong className="text-slate-200">{pool.preferredHours || pool.preferredTime}</strong>
                  </div>
                  {pool.preferredTurfName && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        Target Turf:
                      </span>
                      <strong className="text-slate-200 truncate max-w-[120px]" title={pool.preferredTurfName}>
                        {pool.preferredTurfName}
                      </strong>
                    </div>
                  )}
                </div>

                {/* backing meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-indigo-400">
                      {pool.currentPlayersCount} of {pool.requiredPlayers} Backed
                    </span>
                    <span className={backPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                      {backPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${backPercent}%` }}
                      className={`h-full transition-all duration-500 ${
                        backPercent >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Backers Icons List */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex -space-x-2 overflow-hidden">
                    {(pool.interestedPlayers || []).slice(0, 5).map((player, idx) => (
                      <div
                        key={`${pool.id}_backer_${player.uid}_${idx}`}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300 border border-slate-700"
                        title={player.name}
                      >
                        {player.photoURL ? (
                          <img
                            src={player.photoURL}
                            alt={player.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          player.name.charAt(0)
                        )}
                      </div>
                    ))}
                    {(pool.interestedPlayers || []).length > 5 && (
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-950 text-[9px] font-extrabold flex items-center justify-center text-indigo-400 border border-indigo-950">
                        +{(pool.interestedPlayers || []).length - 5}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400">
                    Est: ₹{pool.maxPricePerPlayer}/athlete
                  </span>
                </div>

                {/* Action Button */}
                <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => handleDeletePool(pool.id)}
                      className="p-2.5 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors cursor-pointer"
                      title="Delete pool"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {isBacked ? (
                    <button
                      type="button"
                      onClick={() => handleLeavePool(pool.id)}
                      disabled={backingPoolId === pool.id}
                      className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer border border-slate-700"
                    >
                      {backingPoolId === pool.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Withdraw Backing'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBackPool(pool)}
                      disabled={backingPoolId === pool.id}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/20"
                    >
                      {backingPoolId === pool.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Back Squad Match</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POOL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create Squad Matchmaking Pool</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Sport
                  </label>
                  <select
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Football">⚽ Football</option>
                    <option value="Box Cricket">🏏 Box Cricket</option>
                    <option value="Badminton">🏸 Badminton</option>
                    <option value="Pickleball">🏓 Pickleball</option>
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Tennis">🎾 Tennis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Backers Required
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={22}
                    value={newRequiredPlayers}
                    onChange={(e) => setNewRequiredPlayers(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Timing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 PM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Preferred Timing Slot
                  </label>
                  <select
                    value={newHoursCategory}
                    onChange={(e) => setNewHoursCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MORNING">☀️ Morning</option>
                    <option value="MIDDAY">🌤️ Midday</option>
                    <option value="EVENING">🌆 Evening</option>
                    <option value="NIGHT">🌙 Night</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Max Cost Per Player (₹)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1500}
                    step={10}
                    value={newMaxPrice}
                    onChange={(e) => setNewMaxPrice(parseInt(e.target.value, 10) || 150)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preferred Venue (Optional)
                </label>
                <select
                  value={preferredTurfId}
                  onChange={(e) => setPreferredTurfId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Any Premium Venue Near Me</option>
                  {turfs.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Short Bio or Squad Details
                </label>
                <textarea
                  placeholder="Need 10 active athletes to book 5v5 futsal. Box booked instantly once backed!"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-[11px] text-indigo-400 leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Cost-Splitting Mechanics:</strong> Upon backing, each user commits to a dynamic cost split. If the pool resolves, the reservation triggers instantly via UPI Token deposits.
                </span>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{creating ? 'Broadcasting Squad Pool...' : 'Launch Matchmaking Pool'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
