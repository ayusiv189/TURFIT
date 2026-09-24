import React, { useState, useEffect, useMemo } from 'react';
import { Turf, Arena, Slot, GamingStation } from '../../types';
import { getAllActiveTurfs, getTurfArenas, getArenaSlotsByDate, bookSlotWithTransaction, getAdminPaymentConfig } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { sendInAppNotification } from '../../lib/pushNotificationService';
import { formatCurrency, getTodayDateString, getNextDays, isTimeSlotPast, formatTime24to12 } from '../../lib/utils';
import { generateUpiQrCodeUrl, generateUpiUri } from '../../lib/razorpay';
import {
  Gamepad2,
  Search,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  Users,
  ChevronRight,
  CheckCircle2,
  Tv,
  Wind,
  Coffee,
  Armchair,
  ShieldCheck,
  X,
  RotateCcw,
  ArrowLeft,
  Building,
  Calendar,
  CreditCard,
  Check,
  AlertCircle,
  ExternalLink,
  Navigation,
  Smartphone,
  Copy,
  QrCode,
} from 'lucide-react';

interface GamingZoneTabProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
  onNavigateToBooking?: (bookingId: string) => void;
  selectedCity?: string;
}

export const GamingZoneTab: React.FC<GamingZoneTabProps> = ({ showToast, selectedCity }) => {
  const { user, profile } = useAuth();
  const { userLocation, calculateDistanceKm } = useLocation();

  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<GamingStation | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Booking Flow for Selected Station
  const [bookingDate, setBookingDate] = useState<string>(getTodayDateString());
  const [stationSlots, setStationSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [showQrCodeInPayment, setShowQrCodeInPayment] = useState<boolean>(false);
  const [vpaCopied, setVpaCopied] = useState<boolean>(false);
  const [upiTxnRefInput, setUpiTxnRefInput] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<any | null>(null);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTurfs, adminPay] = await Promise.all([
        getAllActiveTurfs(),
        getAdminPaymentConfig(),
      ]);
      setTurfs(allTurfs);
      setAdminPaymentConfig(adminPay);

      // Fetch all arenas from all turfs
      const arenaPromises = allTurfs.map((t) => getTurfArenas(t.id));
      const arenaResults = await Promise.all(arenaPromises);
      const flattenedArenas = arenaResults.flat();
      setArenas(flattenedArenas);
    } catch (err) {
      console.warn('Error loading gaming zone data:', err);
      showToast('Could not load gaming stations from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compile full gaming station list ONLY from registered real DB indoor arenas
  const gamingStations = useMemo<GamingStation[]>(() => {
    const list: GamingStation[] = [];

    arenas.forEach((arena) => {
      const parentTurf = turfs.find((t) => t.id === arena.turfId);
      const isIndoor =
        arena.facilityType === 'INDOOR_GAME' ||
        ['pool', 'snooker', 'table tennis', 'carrom', 'foosball', 'ps5', 'console', 'billiards', 'arcade', 'board', 'air hockey', 'vr', 'darts'].some(
          (k) =>
            arena.indoorGameType?.toLowerCase().includes(k) ||
            arena.sport?.toLowerCase().includes(k) ||
            arena.name?.toLowerCase().includes(k)
        );

      if (isIndoor && parentTurf) {
        if (selectedCity && selectedCity !== 'ALL') {
          const turfCity = (parentTurf.city || '').toLowerCase().trim();
          if (turfCity && turfCity !== selectedCity.toLowerCase().trim()) return;
        }

        let category = 'Pool';
        const sportLower = (arena.indoorGameType || arena.sport || arena.name).toLowerCase();
        if (sportLower.includes('snooker') || sportLower.includes('billiards')) category = 'Snooker';
        else if (sportLower.includes('pool')) category = 'Pool';
        else if (sportLower.includes('ps5') || sportLower.includes('console') || sportLower.includes('playstation') || sportLower.includes('xbox')) category = 'Console';
        else if (sportLower.includes('table tennis') || sportLower.includes('tt') || sportLower.includes('ping pong')) category = 'Table Tennis';
        else if (sportLower.includes('carrom') || sportLower.includes('chess') || sportLower.includes('board')) category = 'Board Games';
        else if (sportLower.includes('vr') || sportLower.includes('virtual')) category = 'VR Gaming';
        else if (sportLower.includes('air hockey') || sportLower.includes('foosball') || sportLower.includes('arcade')) category = 'Arcade';

        // Calculate distance if coordinates exist
        let distanceKm: number | undefined = undefined;
        if (
          userLocation &&
          parentTurf.latitude &&
          parentTurf.longitude &&
          parentTurf.latitude !== 0 &&
          parentTurf.longitude !== 0
        ) {
          distanceKm = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            parentTurf.latitude,
            parentTurf.longitude
          );
        }

        // Equipment checklist fallback
        const equipmentChecklist =
          arena.equipmentProvided && arena.equipmentProvided.length > 0
            ? arena.equipmentProvided
            : category === 'Snooker'
            ? ['Tournament Snooker Cues (x4)', 'Chalk & Rest', 'Aramith Ball Set', 'Scoreboard']
            : category === 'Pool'
            ? ['8-Ball Cues (x4)', 'Cue Chalk', 'Standard 2¼" Pool Balls', 'Triangle Rack']
            : category === 'Console'
            ? ['DualSense Wireless Controllers (x2)', '55" 4K OLED TV (120Hz)', 'FC25 / FIFA installed', 'Noise-canceling Headsets']
            : category === 'Table Tennis'
            ? ['Stiga/Butterfly Paddles (x4)', '3-Star ITTF TT Balls', 'Regulation Net', 'Rubber Floor Matting']
            : ['Standard Board Equipment', 'Seating for 4', 'Digital Timer'];

        const fallbackPhotos =
          arena.photos && arena.photos.length > 0
            ? arena.photos
            : arena.photoUrl
            ? [arena.photoUrl]
            : category === 'Snooker'
            ? ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80']
            : category === 'Pool'
            ? ['https://images.unsplash.com/photo-1544698310-74ea9d1c8258?auto=format&fit=crop&w=800&q=80']
            : category === 'Console'
            ? ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80']
            : category === 'Table Tennis'
            ? ['https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80']
            : ['https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80'];

        list.push({
          id: arena.id,
          turfId: parentTurf.id,
          turfName: parentTurf.name,
          area: parentTurf.area || 'Sports Complex',
          city: parentTurf.city || 'City',
          rating: parentTurf.rating || 4.8,
          gameType: arena.indoorGameType || arena.sport || 'Indoor Game',
          category,
          title: arena.name,
          specification: arena.surfaceType || arena.size || 'Premium Indoor Lounge',
          photoUrl: fallbackPhotos[0],
          photos: fallbackPhotos,
          hourlyPrice: arena.pricePerHour || 300,
          minDuration: arena.minDurationMinutes || 60,
          equipmentChecklist,
          amenities: parentTurf.amenities || ['Air Conditioned', 'Free WiFi', 'Lounge Seating', 'Beverages & Snacks'],
          distanceKm,
          availableSlotsCount: 8,
        });
      }
    });

    return list;
  }, [arenas, turfs, userLocation, calculateDistanceKm]);

  // Distinct category list
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    gamingStations.forEach((s) => cats.add(s.category));
    const list = Array.from(cats);
    return [
      { id: 'ALL', label: 'All Lounges', icon: '🎮' },
      ...list.map((c) => {
        let icon = '🎯';
        if (c === 'Snooker') icon = '🎱';
        if (c === 'Pool') icon = '🎱';
        if (c === 'Console') icon = '🕹️';
        if (c === 'Table Tennis') icon = '🏓';
        if (c === 'Board Games') icon = '♟️';
        if (c === 'VR Gaming') icon = '🥽';
        if (c === 'Arcade') icon = '👾';
        return { id: c, label: c, icon };
      }),
    ];
  }, [gamingStations]);

  // Filtered station list
  const filteredStations = useMemo(() => {
    return gamingStations.filter((st) => {
      const matchCategory =
        selectedCategory === 'ALL' || st.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.gameType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.turfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [gamingStations, selectedCategory, searchQuery]);

  // Load real available slots when station and date are selected
  const loadSlotsForStation = async (station: GamingStation, date: string) => {
    setLoadingSlots(true);
    try {
      const slots = await getArenaSlotsByDate(station.id, date);
      setStationSlots(slots);
      setSelectedSlot(null);
    } catch (err) {
      console.warn('Error loading station slots:', err);
      showToast('Could not load slots for this station.', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectStation = (station: GamingStation) => {
    setSelectedStation(station);
    setActivePhotoIdx(0);
    loadSlotsForStation(station, bookingDate);
  };

  useEffect(() => {
    if (selectedStation) {
      loadSlotsForStation(selectedStation, bookingDate);
    }
  }, [bookingDate]);

  // Handle atomic transaction booking
  const handleConfirmBooking = async () => {
    if (!user) {
      showToast('Please sign in to book your gaming station.', 'error');
      return;
    }
    if (!selectedStation || !selectedSlot) {
      showToast('Please select a time slot to continue.', 'error');
      return;
    }

    setBookingInProgress(true);
    try {
      const parentTurf = turfs.find((t) => t.id === selectedStation.turfId);
      const isPaidNow = paymentOption === 'PAY_NOW';
      const totalAmount = selectedSlot.price || selectedStation.hourlyPrice;

      const booking = await bookSlotWithTransaction({
        playerId: user.uid,
        playerName: profile?.displayName || user.email?.split('@')[0] || 'Player',
        playerEmail: user.email || '',
        playerPhone: profile?.phoneNumber || '',
        ownerId: parentTurf?.ownerId || '',
        turfId: selectedStation.turfId,
        turfName: selectedStation.turfName,
        turfAddress: parentTurf?.address || '',
        turfArea: selectedStation.area,
        turfCity: selectedStation.city,
        arenaId: selectedStation.id,
        arenaName: selectedStation.title,
        sport: selectedStation.gameType,
        slotId: selectedSlot.id,
        date: bookingDate,
        day: new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' }),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedStation.minDuration || 60,
        totalAmount,
        paymentMethod: isPaidNow ? 'PAY_NOW' : 'PAY_LATER_AT_TURF',
      });

      // Trigger In-App & Browser Push Alert
      await sendInAppNotification({
        recipientId: user.uid,
        title: `Gaming Lounge Confirmed! 🎮`,
        message: `Your ${selectedStation.title} station is booked for ${bookingDate} (${selectedSlot.startTime} - ${selectedSlot.endTime}) at ${selectedStation.turfName}.`,
        type: 'BOOKING_CONFIRMED',
        relatedId: booking.id,
        relatedType: 'BOOKING',
      });

      setBookingSuccessModal(booking);
      showToast('Gaming Lounge Slot booked successfully! 🎉', 'success');
      setSelectedStation(null);
    } catch (err: any) {
      console.error('Error booking station:', err);
      showToast(err?.message || 'Failed to complete booking. Please retry.', 'error');
    } finally {
      setBookingInProgress(false);
    }
  };

  const nextDays = getNextDays(7);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-3 py-1 text-purple-300 text-xs font-bold mb-3 shadow-inner">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span>Indoor Gaming Lounges & Esports Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Snooker, PS5, Pool & Table Tennis Lounges
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Discover dedicated indoor gaming tables, air-conditioned console booths, and board game stations with real-time slot availability.
          </p>
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {dynamicCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-purple-950/60 border border-purple-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by game, lounge name, turf, or district..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-44 bg-slate-800 rounded-2xl" />
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Indoor Gaming Lounges Found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'No gaming stations match your current search criteria. Try clearing filters.'
              : 'Arena hosts have not yet added indoor snooker or gaming setups in this area.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Gaming Stations Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((station) => (
            <div
              key={station.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-purple-500/50 hover:shadow-purple-950/20 transition-all flex flex-col group cursor-pointer"
              onClick={() => handleSelectStation(station)}
            >
              {/* Photo & Category Tag */}
              <div className="relative h-48 bg-slate-950 overflow-hidden">
                <img
                  src={station.photoUrl}
                  alt={station.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Badge Category */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-purple-500/30 text-purple-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {station.category}
                </div>

                {/* Price Pill */}
                <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-xs font-black px-3 py-1 rounded-full shadow-md">
                  {formatCurrency(station.hourlyPrice)}
                  <span className="text-[10px] font-normal text-slate-400">/hr</span>
                </div>

                {/* Distance Badge */}
                {station.distanceKm !== undefined && (
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>{station.distanceKm} km away</span>
                  </div>
                )}
              </div>

              {/* Station Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                      {station.title}
                    </h3>
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs font-bold text-amber-300">{station.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{station.turfName} • {station.area}</span>
                  </p>

                  <p className="text-xs text-purple-300/80 mt-2 font-medium">
                    {station.specification}
                  </p>
                </div>

                {/* Equipment Highlights */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Gear & Facilities Included:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {station.equipmentChecklist.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="truncate max-w-[120px]">{item}</span>
                      </span>
                    ))}
                    {station.equipmentChecklist.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{station.equipmentChecklist.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectStation(station);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Check Slots & Book</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Station Drawer/Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedStation.title}</span>
                    <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                      {selectedStation.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedStation.turfName} • {selectedStation.area}, {selectedStation.city}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStation(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Photo Showcase */}
              <div className="relative h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={selectedStation.photos[activePhotoIdx] || selectedStation.photoUrl}
                  alt={selectedStation.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold text-white border border-slate-700">
                  {formatCurrency(selectedStation.hourlyPrice)} / session
                </div>
              </div>

              {/* Station Specs Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Game Category</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{selectedStation.gameType}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Atmosphere</span>
                  <span className="text-xs font-bold text-purple-300 mt-0.5 block">Air Conditioned</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Session Base</span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                    {formatCurrency(selectedStation.hourlyPrice)} ({selectedStation.minDuration}m)
                  </span>
                </div>
              </div>

              {/* Equipment Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Equipment & Gear Included</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedStation.equipmentChecklist.map((eq, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{eq}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Select Session Date */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>1. Select Date</span>
                </h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {nextDays.map((d) => {
                    const isSelected = bookingDate === d.dateStr;
                    const [year, month, day] = d.dateStr.split('-');
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => setBookingDate(d.dateStr)}
                        className={`p-2.5 rounded-xl border text-center transition-all shrink-0 cursor-pointer min-w-[70px] ${
                          isSelected
                            ? 'border-purple-500 bg-purple-950/60 text-purple-300 font-bold ring-1 ring-purple-500/50'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="block text-[10px] uppercase">{d.dayName}</span>
                        <span className="block text-sm font-black">{day}</span>
                        <span className="block text-[9px] text-slate-500">{d.formatted}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Time Slot */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>2. Select Time Slot</span>
                </h4>

                {loadingSlots ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading available stations...</div>
                ) : stationSlots.length === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                    No predefined slots configured for this station on this date. Contact the venue host or choose another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {stationSlots.map((s) => {
                      const isPast = isTimeSlotPast(s.date, s.startTime);
                      const isBooked = s.status !== 'AVAILABLE' || isPast;
                      const isSelected = selectedSlot?.id === s.id;

                      return (
                        <button
                          key={s.id}
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(s)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-purple-500 bg-purple-950/60 text-purple-200 font-bold ring-1 ring-purple-500/50'
                              : isBooked
                              ? 'border-slate-800/50 bg-slate-950/30 text-slate-600 cursor-not-allowed line-through'
                              : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-purple-500/40'
                          }`}
                        >
                          <span className="block text-xs font-bold">{formatTime24to12(s.startTime)} - {formatTime24to12(s.endTime)}</span>
                          <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">
                            {formatCurrency(s.price || selectedStation.hourlyPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Payment Method Option */}
              {selectedSlot && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <span>3. Payment Settlement</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentOption('PAY_LATER_AT_TURF')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        paymentOption === 'PAY_LATER_AT_TURF'
                          ? 'border-purple-500 bg-purple-950/40 text-purple-200 font-bold ring-1 ring-purple-500/50'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-white">Pay at Gaming Venue</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">Pay via Cash/UPI upon arrival</span>
                      </div>
                      {paymentOption === 'PAY_LATER_AT_TURF' && <Check className="w-4 h-4 text-purple-400" />}
                    </button>

                    <button
                      onClick={() => setPaymentOption('PAY_NOW')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        paymentOption === 'PAY_NOW'
                          ? 'border-purple-500 bg-purple-950/40 text-purple-200 font-bold ring-1 ring-purple-500/50'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-white">Instant Online UPI</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">Direct UPI App Deep-Link</span>
                      </div>
                      {paymentOption === 'PAY_NOW' && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  </div>

                  {/* Spacious UPI App Launcher for Gaming Zone */}
                  {paymentOption === 'PAY_NOW' && selectedStation && (() => {
                    const payableAmt = selectedSlot.price || selectedStation.hourlyPrice;
                    const upiVpa = adminPaymentConfig?.upiId || 'trufit.admin@okaxis';
                    const upiBeneficiary = adminPaymentConfig?.beneficiaryName || 'TruFit Sports Master Treasury';
                    const upiUri = generateUpiUri({
                      upiId: upiVpa,
                      beneficiaryName: upiBeneficiary,
                      amount: payableAmt,
                      transactionNote: `Gaming Station Slot ${selectedSlot.startTime}`,
                    });
                    const qrUrl = generateUpiQrCodeUrl({
                      upiId: upiVpa,
                      beneficiaryName: upiBeneficiary,
                      amount: payableAmt,
                    });

                    return (
                      <div className="bg-slate-950 border border-purple-500/30 rounded-2xl p-4 mt-3 space-y-3.5 animate-in fade-in-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              Pay ₹{payableAmt} via UPI App
                            </span>
                          </div>
                          <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                            Instant Confirmation
                          </span>
                        </div>

                        {/* Direct Launch UPI Button */}
                        <a
                          href={upiUri}
                          className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <span>🚀 Open UPI App (GPay / PhonePe / Paytm / BHIM)</span>
                        </a>

                        {/* Supported Apps */}
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Supported:</span>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">GPay</span>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">PhonePe</span>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">Paytm</span>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">BHIM</span>
                        </div>

                        {/* Copy UPI ID Bar */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
                          <div className="truncate">
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">Gaming Lounge VPA</span>
                            <span className="font-mono text-slate-200">{upiVpa}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(upiVpa);
                              setVpaCopied(true);
                              setTimeout(() => setVpaCopied(false), 3000);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {vpaCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy VPA</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* QR Code Toggle */}
                        <div className="text-center pt-0.5">
                          <button
                            type="button"
                            onClick={() => setShowQrCodeInPayment(!showQrCodeInPayment)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{showQrCodeInPayment ? 'Hide QR Code' : 'Need QR Code to scan from another phone?'}</span>
                          </button>
                          {showQrCodeInPayment && (
                            <div className="mt-2.5 p-3 bg-white rounded-2xl max-w-[160px] mx-auto text-center shadow-lg">
                              <img src={qrUrl} alt="UPI QR" className="w-32 h-32 mx-auto object-contain" referrerPolicy="no-referrer" />
                              <span className="text-[9px] font-black text-slate-900 block mt-1">Scan to Pay ₹{payableAmt}</span>
                            </div>
                          )}
                        </div>

                        {/* UTR Ref */}
                        <div className="pt-2 border-t border-slate-800/80">
                          <label className="block text-[10px] text-slate-400 font-medium mb-1">
                            Optional UTR / Ref Number:
                          </label>
                          <input
                            type="text"
                            value={upiTxnRefInput}
                            onChange={(e) => setUpiTxnRefInput(e.target.value)}
                            placeholder="e.g. 425109823401"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total Due</span>
                <span className="text-lg font-black text-white">
                  {selectedSlot
                    ? formatCurrency(selectedSlot.price || selectedStation.hourlyPrice)
                    : formatCurrency(selectedStation.hourlyPrice)}
                </span>
              </div>

              <button
                disabled={!selectedSlot || bookingInProgress}
                onClick={handleConfirmBooking}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-950/60 cursor-pointer"
              >
                {bookingInProgress ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {bookingInProgress
                    ? 'Locking Slot...'
                    : paymentOption === 'PAY_NOW'
                    ? 'Pay & Confirm Station'
                    : 'Confirm Station Slot'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Success Confirmation Modal */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Gaming Session Confirmed! 🎮</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your station has been reserved at {bookingSuccessModal.turfName}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Station</span>
                <span className="font-bold text-white">{bookingSuccessModal.arenaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="font-bold text-white">{bookingSuccessModal.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time</span>
                <span className="font-bold text-white">{formatTime24to12(bookingSuccessModal.startTime)} - {formatTime24to12(bookingSuccessModal.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="font-bold text-emerald-400">{formatCurrency(bookingSuccessModal.totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => setBookingSuccessModal(null)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
