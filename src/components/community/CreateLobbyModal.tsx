import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Booking, Lobby, LobbyPlayer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Activity, Calendar, Clock, MapPin, Users, IndianRupee, Shield, AlertCircle, Loader2, Sparkles, Check } from 'lucide-react';

interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBooking?: Booking | null;
  onLobbyCreated?: (lobby: Lobby) => void;
}

export const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({
  isOpen,
  onClose,
  initialBooking,
  onLobbyCreated,
}) => {
  const { user, profile } = useAuth();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(10);
  const [minPlayers, setMinPlayers] = useState<number>(4);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(0);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [allowNewPlayers, setAllowNewPlayers] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('Bring your own kit. Please arrive 10 minutes prior to kick-off.');

  const [loading, setLoading] = useState(false);
  const [fetchingBookings, setFetchingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (initialBooking) {
      setSelectedBooking(initialBooking);
      setSelectedBookingId(initialBooking.id);
      setLobbyName(`${initialBooking.sport} Match at ${initialBooking.turfName}`);
      const perPlayer = Math.round(initialBooking.totalAmount / 10);
      setPricePerPlayer(perPlayer);
    } else {
      fetchUserConfirmedBookings();
    }
  }, [isOpen, initialBooking]);

  const fetchUserConfirmedBookings = async () => {
    if (!user) return;
    setFetchingBookings(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('playerId', '==', user.uid),
        where('bookingStatus', '==', 'CONFIRMED')
      );
      const snapshot = await getDocs(q);
      const list: Booking[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Booking));
      setUserBookings(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedBooking(first);
        setSelectedBookingId(first.id);
        setLobbyName(`${first.sport} Match at ${first.turfName}`);
        setPricePerPlayer(Math.round(first.totalAmount / 10));
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
    } finally {
      setFetchingBookings(false);
    }
  };

  const handleBookingChange = (bId: string) => {
    setSelectedBookingId(bId);
    const found = userBookings.find((b) => b.id === bId);
    if (found) {
      setSelectedBooking(found);
      setLobbyName(`${found.sport} Match at ${found.turfName}`);
      setPricePerPlayer(Math.round(found.totalAmount / maxPlayers));
    }
  };

  const handleMaxPlayersChange = (val: number) => {
    setMaxPlayers(val);
    if (selectedBooking && val > 0) {
      setPricePerPlayer(Math.round(selectedBooking.totalAmount / val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedBooking) {
      setErrorMsg('Please select a confirmed booking to attach this lobby.');
      return;
    }
    if (!lobbyName.trim()) {
      setErrorMsg('Lobby Name is required.');
      return;
    }
    if (maxPlayers < 2) {
      setErrorMsg('Maximum players must be at least 2.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newLobby: Lobby = {
        id: lobbyId,
        name: lobbyName.trim(),
        sport: selectedBooking.sport,
        turfId: selectedBooking.turfId,
        turfName: selectedBooking.turfName,
        turfAddress: selectedBooking.turfAddress,
        turfCity: selectedBooking.turfCity,
        arenaId: selectedBooking.arenaId,
        arenaName: selectedBooking.arenaName,
        bookingId: selectedBooking.id,
        slotId: selectedBooking.slotId,
        hostId: user.uid,
        hostName: profile.displayName || 'Host',
        hostPhotoURL: profile.photoURL || null,
        date: selectedBooking.date,
        day: selectedBooking.day,
        startTime: selectedBooking.startTime,
        endTime: selectedBooking.endTime,
        maxPlayers: Number(maxPlayers),
        minPlayers: Number(minPlayers),
        currentPlayers: 1,
        pricePerPlayer: Number(pricePerPlayer),
        description: description.trim() || `Public sports lobby for ${selectedBooking.sport} at ${selectedBooking.turfName}. All skill levels welcome!`,
        rules: rules.trim(),
        isPublic: isPublic,
        allowNewPlayers: allowNewPlayers,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      };

      // 1. Create Lobby Doc
      await setDoc(doc(db, 'lobbies', lobbyId), newLobby);

      // 2. Add Host to lobbyPlayers sub-record
      const participantId = `${lobbyId}_${user.uid}`;
      const hostParticipant: LobbyPlayer = {
        id: participantId,
        lobbyId: lobbyId,
        uid: user.uid,
        playerName: profile.displayName || 'Host',
        playerPhotoURL: profile.photoURL || null,
        preferredSport: profile.preferredSport || selectedBooking.sport,
        skillLevel: profile.experienceLevel || 'Intermediate',
        isHost: true,
        joinedAt: now,
      };
      await setDoc(doc(db, 'lobbyPlayers', participantId), hostParticipant);

      // 3. Mark booking as having a lobby
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        lobbyCreated: true,
        lobbyId: lobbyId,
        updatedAt: now,
      });

      if (onLobbyCreated) {
        onLobbyCreated(newLobby);
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating lobby:', err);
      setErrorMsg(err.message || 'Failed to create lobby. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Sports Lobby</h3>
              <p className="text-xs text-slate-400">Open a community matchmaking lobby for your turf booking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Booking */}
          {!initialBooking && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Your Confirmed Turf Booking
              </label>
              {fetchingBookings ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Loading your confirmed bookings...
                </div>
              ) : userBookings.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs">
                  You don't have any active turf bookings. Please book a turf slot first in the Explore tab to host a community lobby.
                </div>
              ) : (
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                >
                  {userBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.sport} • {b.turfName} ({b.date} at {b.startTime}) - ₹{b.totalAmount}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Booking Preview Card */}
          {selectedBooking && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                  {selectedBooking.sport}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  Total Slot Cost: ₹{selectedBooking.totalAmount}
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-1">{selectedBooking.turfName}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedBooking.arenaName} • {selectedBooking.turfCity}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedBooking.date} ({selectedBooking.day})
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                </span>
              </div>
            </div>
          )}

          {/* Lobby Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Lobby Title *
            </label>
            <input
              type="text"
              required
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="e.g. Friday 7v7 Football Clash"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Max Players
              </label>
              <input
                type="number"
                min={2}
                max={40}
                value={maxPlayers}
                onChange={(e) => handleMaxPlayersChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Min Required
              </label>
              <input
                type="number"
                min={2}
                max={maxPlayers}
                value={minPlayers}
                onChange={(e) => setMinPlayers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Price / Player (₹)
              </label>
              <input
                type="number"
                min={0}
                value={pricePerPlayer}
                onChange={(e) => setPricePerPlayer(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Public / Private & Join Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setIsPublic(!isPublic)}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                isPublic
                  ? 'border-indigo-500/50 bg-indigo-950/30'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-white block">
                  {isPublic ? 'Public Lobby' : 'Private Lobby'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isPublic ? 'Visible to all community players' : 'Invite-only lobby'}
                </span>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  isPublic ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                }`}
              >
                {isPublic && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>

            <div
              onClick={() => setAllowNewPlayers(!allowNewPlayers)}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                allowNewPlayers
                  ? 'border-indigo-500/50 bg-indigo-950/30'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-white block">Allow "I'm In"</span>
                <span className="text-[11px] text-slate-400">
                  {allowNewPlayers ? 'Open for direct joins' : 'Requires host approval'}
                </span>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  allowNewPlayers ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                }`}
              >
                {allowNewPlayers && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description / Objective
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell other athletes about skill level, match pace, or special requirements..."
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Rules & Guidelines
            </label>
            <input
              type="text"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. Cleats not allowed, bring dark/light jersey"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !selectedBooking}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Matchmaking Lobby...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Publish Sports Lobby
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
