import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Booking, Lobby, LobbyPlayer, Turf, Arena, Slot } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createLobbyWithSlotTransaction } from '../../lib/db';
import { openRazorpayCheckout } from '../../lib/razorpay';
import {
  X,
  Activity,
  Calendar,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Shield,
  AlertCircle,
  Loader2,
  Sparkles,
  Check,
  PlusCircle,
  Bookmark,
} from 'lucide-react';

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

  // Mode: 'EXISTING_BOOKING' or 'DIRECT_SLOT'
  const [creationMode, setCreationMode] = useState<'EXISTING_BOOKING' | 'DIRECT_SLOT'>(
    initialBooking ? 'EXISTING_BOOKING' : 'DIRECT_SLOT'
  );

  // Existing booking flow
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Direct Turf & Slot selection flow
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState<string>('');
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_LATER_AT_TURF');

  // Lobby Details
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(10);
  const [minPlayers, setMinPlayers] = useState<number>(4);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(0);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [allowNewPlayers, setAllowNewPlayers] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('Bring your own kit. Please arrive 10 minutes prior to kick-off.');

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (initialBooking) {
      setCreationMode('EXISTING_BOOKING');
      setSelectedBooking(initialBooking);
      setSelectedBookingId(initialBooking.id);
      setLobbyName(`${initialBooking.sport} Match at ${initialBooking.turfName}`);
      const perPlayer = Math.round(initialBooking.totalAmount / 10);
      setPricePerPlayer(perPlayer);
    } else {
      fetchTurfsAndBookings();
    }
  }, [isOpen, initialBooking]);

  const fetchTurfsAndBookings = async () => {
    if (!user) return;
    setFetchingData(true);
    try {
      // 1. Fetch user bookings
      const qBookings = query(
        collection(db, 'bookings'),
        where('playerId', '==', user.uid),
        where('bookingStatus', '==', 'CONFIRMED')
      );
      const snapBookings = await getDocs(qBookings);
      const bList: Booking[] = [];
      snapBookings.forEach((d) => bList.push({ id: d.id, ...d.data() } as Booking));
      setUserBookings(bList);

      if (bList.length > 0) {
        setSelectedBooking(bList[0]);
        setSelectedBookingId(bList[0].id);
      }

      // 2. Fetch turfs for direct slot lobby
      const qTurfs = query(collection(db, 'turfs'), where('active', '==', true));
      const snapTurfs = await getDocs(qTurfs);
      const tList: Turf[] = [];
      snapTurfs.forEach((d) => tList.push({ id: d.id, ...d.data() } as Turf));
      setTurfs(tList);

      if (tList.length > 0) {
        setSelectedTurfId(tList[0].id);
        await fetchArenasForTurf(tList[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching turfs and bookings:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchArenasForTurf = async (turfId: string) => {
    try {
      const qArenas = query(collection(db, 'arenas'), where('turfId', '==', turfId));
      const snapArenas = await getDocs(qArenas);
      const aList: Arena[] = [];
      snapArenas.forEach((d) => aList.push({ id: d.id, ...d.data() } as Arena));
      setArenas(aList);

      if (aList.length > 0) {
        setSelectedArenaId(aList[0].id);
        await fetchSlotsForArena(aList[0].id, selectedDate);
      } else {
        setSelectedArenaId('');
        setAvailableSlots([]);
        setSelectedSlotId('');
        setSelectedSlot(null);
      }
    } catch (err) {
      console.error('Error fetching arenas:', err);
    }
  };

  const fetchSlotsForArena = async (arenaId: string, date: string) => {
    if (!arenaId || !date) return;
    setFetchingSlots(true);
    try {
      const qSlots = query(
        collection(db, 'slots'),
        where('arenaId', '==', arenaId),
        where('date', '==', date),
        where('status', '==', 'AVAILABLE'),
        where('visibleToPlayers', '==', true)
      );
      const snapSlots = await getDocs(qSlots);
      const sList: Slot[] = [];
      snapSlots.forEach((d) => sList.push({ id: d.id, ...d.data() } as Slot));
      setAvailableSlots(sList);

      if (sList.length > 0) {
        setSelectedSlotId(sList[0].id);
        setSelectedSlot(sList[0]);
        const turfObj = turfs.find((t) => t.id === selectedTurfId);
        const arenaObj = arenas.find((a) => a.id === arenaId);
        setLobbyName(`${arenaObj?.sport || 'Sports'} Match at ${turfObj?.name || 'Turf'}`);
        setPricePerPlayer(Math.round(sList[0].price / maxPlayers));
      } else {
        setSelectedSlotId('');
        setSelectedSlot(null);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleTurfChange = async (turfId: string) => {
    setSelectedTurfId(turfId);
    await fetchArenasForTurf(turfId);
  };

  const handleArenaChange = async (arenaId: string) => {
    setSelectedArenaId(arenaId);
    await fetchSlotsForArena(arenaId, selectedDate);
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (selectedArenaId) {
      await fetchSlotsForArena(selectedArenaId, date);
    }
  };

  const handleSlotChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    const found = availableSlots.find((s) => s.id === slotId);
    if (found) {
      setSelectedSlot(found);
      setPricePerPlayer(Math.round(found.price / maxPlayers));
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
    if (val > 0) {
      if (creationMode === 'EXISTING_BOOKING' && selectedBooking) {
        setPricePerPlayer(Math.round(selectedBooking.totalAmount / val));
      } else if (creationMode === 'DIRECT_SLOT' && selectedSlot) {
        setPricePerPlayer(Math.round(selectedSlot.price / val));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      setErrorMsg('You must be signed in to create a lobby.');
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
      if (creationMode === 'DIRECT_SLOT') {
        // Requirement: Check slot availability with atomic Firestore transaction
        if (!selectedSlot || !selectedTurfId || !selectedArenaId) {
          setErrorMsg('Please select a valid available slot for your lobby.');
          setLoading(false);
          return;
        }

        const selectedTurfObj = turfs.find((t) => t.id === selectedTurfId);
        const selectedArenaObj = arenas.find((a) => a.id === selectedArenaId);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[new Date(selectedDate).getDay()];

        if (paymentMethod === 'PAY_NOW' && selectedSlot.price > 0) {
          try {
            await openRazorpayCheckout({
              amount: selectedSlot.price,
              name: 'TruFit Turf Booking',
              description: `Slot Booking & Host Match for ${lobbyName.trim()}`,
              prefill: {
                name: profile.displayName || user.displayName || 'Athlete',
                email: user.email || '',
                contact: profile.phoneNumber || '',
              },
              notes: {
                slotId: selectedSlot.id,
                turfId: selectedTurfId,
                arenaId: selectedArenaId,
              },
            });
          } catch (payErr: any) {
            setErrorMsg(payErr.message || 'Payment was cancelled or unsuccessful.');
            setLoading(false);
            return;
          }
        }

        const result = await createLobbyWithSlotTransaction({
          hostId: user.uid,
          hostName: profile.displayName || 'Player',
          hostEmail: user.email || '',
          hostPhone: profile.phoneNumber || '',
          hostPhotoURL: profile.photoURL || null,
          preferredSport: selectedArenaObj?.sport || 'Football',
          skillLevel: profile.experienceLevel || 'Intermediate',
          turfId: selectedTurfId,
          turfName: selectedTurfObj?.name || 'Turf',
          turfAddress: selectedTurfObj?.address || '',
          turfArea: selectedTurfObj?.area || '',
          turfCity: selectedTurfObj?.city || 'City',
          arenaId: selectedArenaId,
          arenaName: selectedArenaObj?.name || 'Court',
          sport: selectedArenaObj?.sport || 'Football',
          slotId: selectedSlot.id,
          date: selectedDate,
          day: dayName,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration: selectedSlot.durationMinutes || 60,
          totalAmount: selectedSlot.price,
          lobbyName: lobbyName.trim(),
          maxPlayers: Number(maxPlayers),
          minPlayers: Number(minPlayers),
          pricePerPlayer: Number(pricePerPlayer),
          description: description.trim() || `Community sports lobby for ${selectedArenaObj?.sport} at ${selectedTurfObj?.name}.`,
          rules: rules.trim(),
          isPublic: isPublic,
          allowNewPlayers: allowNewPlayers,
          paymentMethod: paymentMethod,
        });

        if (onLobbyCreated) {
          onLobbyCreated(result.lobby as Lobby);
        }
        onClose();
      } else {
        // Existing Booking Flow
        if (!selectedBooking) {
          setErrorMsg('Please select a confirmed booking.');
          setLoading(false);
          return;
        }

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
          description: description.trim() || `Public sports lobby for ${selectedBooking.sport} at ${selectedBooking.turfName}.`,
          rules: rules.trim(),
          isPublic: isPublic,
          allowNewPlayers: allowNewPlayers,
          status: 'OPEN',
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'lobbies', lobbyId), newLobby);

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

        await updateDoc(doc(db, 'bookings', selectedBooking.id), {
          lobbyCreated: true,
          lobbyId: lobbyId,
          updatedAt: now,
        });

        if (onLobbyCreated) {
          onLobbyCreated(newLobby);
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating lobby:', err);
      // Requirement: Show exact message if slot unavailable
      if (err.message && err.message.includes('slot is no longer available')) {
        setErrorMsg('This slot is no longer available. Please choose another slot.');
      } else {
        setErrorMsg(err.message || 'Failed to create lobby. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Sports Lobby</h3>
              <p className="text-xs text-slate-400">Host a pick-up match and split turf slot costs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only if not opened from a specific booking) */}
        {!initialBooking && (
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setCreationMode('DIRECT_SLOT')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                creationMode === 'DIRECT_SLOT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Pick Turf & Available Slot
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('EXISTING_BOOKING')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                creationMode === 'EXISTING_BOOKING'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              From Confirmed Booking ({userBookings.length})
            </button>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl flex items-center gap-2.5 shadow-lg shadow-rose-950/30">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Direct Slot Selection Form */}
          {creationMode === 'DIRECT_SLOT' && (
            <div className="space-y-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Select Turf & Real-Time Slot
                </span>
                <span className="text-[11px] text-slate-500">Atomic Availability Guaranteed</span>
              </div>

              {/* Turf dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Turf Venue *</label>
                <select
                  value={selectedTurfId}
                  onChange={(e) => handleTurfChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                >
                  {turfs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city || t.area})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arena & Sport dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Court / Arena *</label>
                  <select
                    value={selectedArenaId}
                    onChange={(e) => handleArenaChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.sport})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Match Date *</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Available Slots Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Available Slot Time *
                </label>
                {fetchingSlots ? (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Checking slot availability...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    No open available slots on this date. Please pick another date or arena.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {availableSlots.map((s) => {
                      const isSelected = selectedSlotId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSlotChange(s.id)}
                          className={`p-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <span>{s.startTime} - {s.endTime}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-emerald-400 font-bold'}`}>
                            ₹{s.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Method for Direct Slot */}
              {selectedSlot && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium">Payment Option:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAY_LATER_AT_TURF')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === 'PAY_LATER_AT_TURF'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Pay Later at Turf
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAY_NOW')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === 'PAY_NOW'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Pay Online Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Booking Flow */}
          {creationMode === 'EXISTING_BOOKING' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Your Confirmed Turf Booking
              </label>
              {fetchingData ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Loading your confirmed bookings...
                </div>
              ) : userBookings.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs">
                  You don't have any confirmed bookings yet. Switch to "Pick Turf & Available Slot" above to book directly!
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

              {selectedBooking && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 mt-3">
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
            </div>
          )}

          {/* Lobby Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Lobby Title *
            </label>
            <input
              type="text"
              required
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="e.g. Friday 7v7 Box Cricket Clash"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Capacity and Split Cost */}
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
              disabled={
                loading ||
                (creationMode === 'EXISTING_BOOKING' && !selectedBooking) ||
                (creationMode === 'DIRECT_SLOT' && !selectedSlot)
              }
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking Slot & Creating Lobby...
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
