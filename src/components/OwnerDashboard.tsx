import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Turf, Arena, Slot, Booking } from '../types';
import {
  getOwnerTurfs,
  getOwnerSlots,
  getOwnerBookings,
  createTurf,
  updateTurf,
  deleteTurf,
  createArena,
  getTurfArenas,
  deleteArena,
  createSlot,
  createBulkSlots,
  updateSlot,
  deleteSlot,
  updateBookingPaymentStatus,
  bookSlotWithTransaction,
  generate7DaySlots,
  toggleArenaMaintenance,
  toggleTurfClosedStatus,
} from '../lib/db';
import {
  formatCurrency,
  formatDateString,
  getDayName,
  getTodayDateString,
  getNextDays,
  formatTime24to12,
  readFileAsDataURL,
} from '../lib/utils';
import { InteractiveTurfMap } from './InteractiveTurfMap';
import { OwnerAnalyticsDashboard } from './owner/OwnerAnalyticsDashboard';
import { OwnerPlayerDues } from './owner/OwnerPlayerDues';
import { OwnerOffersTab } from './owner/OwnerOffersTab';
import { OwnerReviewsTab } from './owner/OwnerReviewsTab';
import { RecurringSlotsModal } from './owner/RecurringSlotsModal';
import { SevenDaySlotsModal } from './owner/SevenDaySlotsModal';
import { OwnerPaymentSettingsTab } from './owner/OwnerPaymentSettingsTab';
import { OwnerVerificationCard } from './owner/OwnerVerificationCard';
import {
  Building2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  IndianRupee,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  DollarSign,
  Lock,
  Unlock,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Tag,
  Star,
  Repeat,
  Zap,
  Wrench,
  Power,
  Ban,
  QrCode,
} from 'lucide-react';

interface OwnerDashboardProps {
  currentTab:
    | 'dashboard'
    | 'analytics'
    | 'my-turf'
    | 'slots'
    | 'bookings'
    | 'dues'
    | 'offers'
    | 'reviews'
    | 'payments'
    | 'payouts'
    | 'profile';
  setCurrentTab: (tab: any) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ currentTab, setCurrentTab }) => {
  const { user, profile, updateUserProfile } = useAuth();

  // Primary Data State from Firestore
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [allArenasMap, setAllArenasMap] = useState<Record<string, Arena[]>>({});
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Forms and Modals
  const [showAddTurfModal, setShowAddTurfModal] = useState<boolean>(false);
  const [showAddArenaModal, setShowAddArenaModal] = useState<boolean>(false);
  const [showAddSlotModal, setShowAddSlotModal] = useState<boolean>(false);
  const [showBulkSlotModal, setShowBulkSlotModal] = useState<boolean>(false);
  const [showRecurringSlotsModal, setShowRecurringSlotsModal] = useState<boolean>(false);
  const [showSevenDayModal, setShowSevenDayModal] = useState<boolean>(false);
  const [slotViewMode, setSlotViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(getTodayDateString());

  // Add Turf Form Fields
  const [turfName, setTurfName] = useState<string>('');
  const [turfDesc, setTurfDesc] = useState<string>('');
  const [turfAddress, setTurfAddress] = useState<string>('');
  const [turfArea, setTurfArea] = useState<string>('');
  const [turfCity, setTurfCity] = useState<string>('Mumbai');
  const [turfPhone, setTurfPhone] = useState<string>(profile?.phoneNumber || '');
  const [turfOpenTime, setTurfOpenTime] = useState<string>('06:00');
  const [turfCloseTime, setTurfCloseTime] = useState<string>('23:00');
  const [turfBasePrice, setTurfBasePrice] = useState<number>(1200);
  const [turfSports, setTurfSports] = useState<string[]>(['Football', 'Box Cricket']);
  const [turfFacilities, setTurfFacilities] = useState<string[]>([
    'Floodlights',
    'Changing Room',
    'Parking',
    'Drinking Water',
  ]);
  const [turfLat, setTurfLat] = useState<number>(19.076);
  const [turfLng, setTurfLng] = useState<number>(72.8777);
  const [turfPhotos, setTurfPhotos] = useState<string[]>([]);

  // Add Arena Form Fields
  const [arenaName, setArenaName] = useState<string>('');
  const [arenaSport, setArenaSport] = useState<string>('Football');
  const [arenaDesc, setArenaDesc] = useState<string>('');
  const [arenaCapacity, setArenaCapacity] = useState<number>(14);
  const [arenaPrice, setArenaPrice] = useState<number>(1200);
  const [arenaPhotos, setArenaPhotos] = useState<string[]>([]);

  // Single Slot Form Fields
  const [slotDate, setSlotDate] = useState<string>(getTodayDateString());
  const [slotStartTime, setSlotStartTime] = useState<string>('18:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('19:00');
  const [slotPrice, setSlotPrice] = useState<number>(1200);
  const [slotVisible, setSlotVisible] = useState<boolean>(true);
  const [slotStatus, setSlotStatus] = useState<any>('AVAILABLE');

  // Bulk Slot Form Fields
  const [bulkDate, setBulkDate] = useState<string>(getTodayDateString());
  const [bulkStartHour, setBulkStartHour] = useState<number>(16); // 4 PM
  const [bulkEndHour, setBulkEndHour] = useState<number>(23); // 11 PM
  const [bulkDurationHours, setBulkDurationHours] = useState<number>(1);
  const [bulkSlotPrice, setBulkSlotPrice] = useState<number>(1200);

  // Profile Edit fields
  const [editName, setEditName] = useState<string>(profile?.displayName || '');
  const [editPhone, setEditPhone] = useState<string>(profile?.phoneNumber || '');
  const [editCity, setEditCity] = useState<string>(profile?.city || '');
  const [editBio, setEditBio] = useState<string>(profile?.bio || '');
  const [editBusiness, setEditBusiness] = useState<string>(profile?.businessName || '');
  const [editUpiId, setEditUpiId] = useState<string>(profile?.paymentSettings?.upiId || '');
  const [editBeneficiaryName, setEditBeneficiaryName] = useState<string>(
    profile?.paymentSettings?.beneficiaryName || profile?.businessName || ''
  );

  // New Turf Payment ID state
  const [turfUpiId, setTurfUpiId] = useState<string>('');
  const [turfBeneficiary, setTurfBeneficiary] = useState<string>('');

  // Payment Settlement Dialog State
  const [settlementBooking, setSettlementBooking] = useState<Booking | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ownerTurfs = await getOwnerTurfs(user.uid);
      setTurfs(ownerTurfs);

      const arenaMap: Record<string, Arena[]> = {};
      for (const t of ownerTurfs) {
        arenaMap[t.id] = await getTurfArenas(t.id);
      }
      setAllArenasMap(arenaMap);

      if (ownerTurfs.length > 0) {
        const activeT = selectedTurf && ownerTurfs.find((t) => t.id === selectedTurf.id)
          ? selectedTurf
          : ownerTurfs[0];
        setSelectedTurf(activeT);

        const turfArenas = arenaMap[activeT.id] || (await getTurfArenas(activeT.id));
        setArenas(turfArenas);
        if (turfArenas.length > 0) {
          setSelectedArena(turfArenas[0]);
        } else {
          setSelectedArena(null);
        }
      } else {
        setSelectedTurf(null);
        setArenas([]);
        setSelectedArena(null);
      }

      const allSlots = await getOwnerSlots(user.uid);
      setSlots(allSlots);

      const allBookings = await getOwnerBookings(user.uid);
      setBookings(allBookings);
    } catch (err: any) {
      console.error('Error loading owner data:', err);
      showToast('Error loading records from Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSelectTurf = async (turf: Turf) => {
    setSelectedTurf(turf);
    const turfArenas = await getTurfArenas(turf.id);
    setArenas(turfArenas);
    if (turfArenas.length > 0) {
      setSelectedArena(turfArenas[0]);
    } else {
      setSelectedArena(null);
    }
  };

  // ------------------ ADD TURF ------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isTurf: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await readFileAsDataURL(file);
        urls.push(dataUrl);
      }
      if (isTurf) {
        setTurfPhotos((prev) => [...prev, ...urls]);
      } else {
        setArenaPhotos((prev) => [...prev, ...urls]);
      }
      showToast(`Uploaded ${urls.length} photo(s) successfully!`);
    } catch (err) {
      showToast('Failed to process image file.', 'error');
    }
  };

  const handleCreateTurf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!turfName.trim() || !turfAddress.trim()) {
      showToast('Turf name and address are required.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const newTurfId = await createTurf({
        ownerId: user.uid,
        name: turfName.trim(),
        description: turfDesc.trim(),
        address: turfAddress.trim(),
        area: turfArea.trim() || 'Central',
        city: turfCity.trim() || 'Mumbai',
        phoneNumber: turfPhone.trim(),
        openingTime: turfOpenTime,
        closingTime: turfCloseTime,
        sports: turfSports,
        facilities: turfFacilities,
        basePrice: turfBasePrice,
        latitude: turfLat,
        longitude: turfLng,
        photos: turfPhotos,
        active: true,
        upiId: turfUpiId.trim() || profile?.paymentSettings?.upiId || undefined,
        beneficiaryName:
          turfBeneficiary.trim() ||
          profile?.paymentSettings?.beneficiaryName ||
          turfName.trim(),
      });

      // Automatically create a default arena for this turf
      await createArena({
        turfId: newTurfId,
        ownerId: user.uid,
        name: 'Main 7v7 Arena',
        sport: turfSports[0] || 'Football',
        description: 'Full sized high-grade astroturf sports arena with floodlights',
        capacity: 14,
        pricePerSlot: turfBasePrice,
        photos: turfPhotos.slice(0, 1),
        active: true,
      });

      showToast('Turf created with default Arena successfully!');
      setShowAddTurfModal(false);
      // Reset form
      setTurfName('');
      setTurfDesc('');
      setTurfAddress('');
      setTurfPhotos([]);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create turf.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ ADD ARENA ------------------
  const handleCreateArena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf) return;
    if (!arenaName.trim()) {
      showToast('Arena name is required.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await createArena({
        turfId: selectedTurf.id,
        ownerId: user.uid,
        name: arenaName.trim(),
        sport: arenaSport,
        description: arenaDesc.trim(),
        capacity: Number(arenaCapacity) || 12,
        pricePerSlot: Number(arenaPrice) || selectedTurf.basePrice,
        photos: arenaPhotos,
        active: true,
      });

      showToast('Arena added to turf successfully!');
      setShowAddArenaModal(false);
      setArenaName('');
      setArenaDesc('');
      setArenaPhotos([]);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create arena.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ ADD SINGLE SLOT ------------------
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf || !selectedArena) {
      showToast('Please select a Turf and Arena first.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const dayName = getDayName(slotDate);
      await createSlot({
        turfId: selectedTurf.id,
        arenaId: selectedArena.id,
        ownerId: user.uid,
        date: slotDate,
        day: dayName,
        startTime: formatTime24to12(slotStartTime),
        endTime: formatTime24to12(slotEndTime),
        durationMinutes: 60,
        price: Number(slotPrice) || selectedArena.pricePerSlot,
        visibleToPlayers: slotVisible,
        status: slotStatus,
        bookingType: slotStatus === 'BOOKED_BY_OWNER' ? 'OWNER' : undefined,
      });

      showToast('Slot created successfully!');
      setShowAddSlotModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create slot.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ BULK CREATE SLOTS ------------------
  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTurf || !selectedArena) {
      showToast('Please select a Turf and Arena first.', 'error');
      return;
    }

    if (bulkStartHour >= bulkEndHour) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const bulkPayload = [];
      const dayName = getDayName(bulkDate);

      for (let h = bulkStartHour; h < bulkEndHour; h += bulkDurationHours) {
        const startH24 = `${h < 10 ? '0' : ''}${h}:00`;
        const endH24 = `${h + bulkDurationHours < 10 ? '0' : ''}${h + bulkDurationHours}:00`;

        bulkPayload.push({
          turfId: selectedTurf.id,
          arenaId: selectedArena.id,
          ownerId: user.uid,
          date: bulkDate,
          day: dayName,
          startTime: formatTime24to12(startH24),
          endTime: formatTime24to12(endH24),
          durationMinutes: bulkDurationHours * 60,
          price: Number(bulkSlotPrice),
          visibleToPlayers: true,
          status: 'AVAILABLE' as const,
        });
      }

      const createdCount = await createBulkSlots(bulkPayload);
      showToast(`Generated ${createdCount} slots for ${bulkDate}!`);
      setShowBulkSlotModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create bulk slots.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ TOGGLE SLOT VISIBILITY / BLOCK ------------------
  const handleToggleSlotVisibility = async (slot: Slot) => {
    try {
      await updateSlot(slot.id, {
        visibleToPlayers: !slot.visibleToPlayers,
      });
      showToast(`Slot visibility updated to ${!slot.visibleToPlayers ? 'Visible' : 'Hidden'}.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to toggle visibility.', 'error');
    }
  };

  const handleToggleSlotBlock = async (slot: Slot) => {
    try {
      const newStatus = slot.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
      await updateSlot(slot.id, {
        status: newStatus,
      });
      showToast(`Slot is now ${newStatus}.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to change slot status.', 'error');
    }
  };

  const handleToggleTurfClosed = async (turf: Turf) => {
    const isCurrentlyClosed = !!turf.isClosed;
    const newClosedState = !isCurrentlyClosed;
    let reason = '';
    if (newClosedState) {
      reason = prompt('Optional reason for closing turf (e.g. Heavy Rain / Maintenance / Event / Facility Upgrade):') || 'Temporary closure by turf management';
    }
    try {
      await toggleTurfClosedStatus(turf.id, newClosedState, reason);
      showToast(`Turf marked as ${newClosedState ? 'CLOSED / SHUTDOWN' : 'OPEN & ACTIVE'}.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update turf status.', 'error');
    }
  };

  const handleToggleArenaMaintenance = async (arena: Arena) => {
    const isUnderMaintenance = !!arena.isUnderMaintenance;
    const newMaintenanceState = !isUnderMaintenance;
    let reason = '';
    if (newMaintenanceState) {
      reason = prompt('Reason for arena maintenance (e.g. Grass Resurfacing / Net Repairs / Lighting Upgrades):') || 'Scheduled arena maintenance';
    }
    try {
      await toggleArenaMaintenance(arena.id, newMaintenanceState, reason, true);
      showToast(`Arena "${arena.name}" is now ${newMaintenanceState ? 'UNDER MAINTENANCE (Future slots blocked)' : 'ACTIVE (Slots available)'}.`);
      await loadData();
      if (selectedTurf) {
        const updatedArenas = await getTurfArenas(selectedTurf.id);
        setArenas(updatedArenas);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update arena maintenance mode.', 'error');
    }
  };

  const handleOwnerBookSlot = async (slot: Slot) => {
    if (!user || !selectedTurf || !selectedArena) return;
    try {
      await bookSlotWithTransaction({
        playerId: user.uid,
        playerName: `${profile?.displayName || 'Owner'} (Owner Direct)`,
        playerEmail: user.email || '',
        playerPhone: profile?.phoneNumber || '',
        ownerId: user.uid,
        turfId: slot.turfId,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address,
        turfArea: selectedTurf.area,
        turfCity: selectedTurf.city,
        arenaId: slot.arenaId,
        arenaName: selectedArena.name,
        sport: selectedArena.sport,
        slotId: slot.id,
        date: slot.date,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.durationMinutes,
        totalAmount: slot.price,
        paymentMethod: 'PAY_NOW',
        isOwnerBooking: true,
      });
      showToast('Slot reserved as BOOKED BY OWNER.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to book slot for owner.', 'error');
    }
  };

  // ------------------ SETTLE DUE PAYMENT ------------------
  const handleRecordPaymentSettlement = async () => {
    if (!settlementBooking || settlementAmount <= 0) {
      showToast('Enter a valid settlement amount.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await updateBookingPaymentStatus(
        settlementBooking.id,
        settlementAmount,
        'Settlement collected at turf counter'
      );
      showToast(`Recorded payment of ${formatCurrency(settlementAmount)} successfully!`);
      setSettlementBooking(null);
      setSettlementAmount(0);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ CALCULATE REAL METRICS ------------------
  const todayStr = getTodayDateString();
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const upcomingBookings = bookings.filter((b) => b.date >= todayStr && b.bookingStatus === 'CONFIRMED');
  const availableSlotsCount = slots.filter((s) => s.status === 'AVAILABLE' && s.date >= todayStr).length;
  const pendingDuesTotal = bookings.reduce((sum, b) => sum + (b.amountDue || 0), 0);
  const totalRevenueCollected = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);

  const nextSevenDays = getNextDays(7);

  // Filter slots for current view
  const currentArenaSlots = slots.filter(
    (s) => (!selectedArena || s.arenaId === selectedArena.id) && s.date === selectedSlotDate
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 sm:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500'
              : 'bg-rose-950/90 text-rose-200 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-indigo-600/30">
              TF
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                TRUFIT <span className="text-indigo-500 font-medium text-xs sm:text-sm ml-1.5 tracking-widest uppercase">Owner</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-100">{profile?.displayName || 'Turf Owner'}</span>
              <span className="text-xs text-slate-400">{profile?.businessName || selectedTurf?.name || 'Sports Arena Hub'}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 p-0.5 bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-sm text-indigo-300 shadow-md">
              {profile?.displayName?.charAt(0) || '👤'}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                title="Refresh Firestore data"
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {turfs.length > 0 && (
                <button
                  id="header-add-turf-btn"
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* TAB: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Real Stats Metric Cards Grid - Sleek Interface */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Today's Bookings</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{todayBookings.length}</h2>
                  <span className="text-emerald-400 text-sm font-medium">Live schedule</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{formatCurrency(totalRevenueCollected)}</h2>
                  <span className="text-indigo-400 text-sm font-medium">Collected</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl border-l-4 border-l-amber-500">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Pending Dues</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{formatCurrency(pendingDuesTotal)}</h2>
                  <span className="text-amber-500 text-sm font-medium italic">Action Required</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Slots</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-100">{availableSlotsCount}</h2>
                  <span className="text-slate-500 text-sm font-medium italic">{arenas.length} Arenas</span>
                </div>
              </div>
            </section>

            {/* Secondary Stat bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Total Revenue Collected</span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatCurrency(totalRevenueCollected)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Total Turfs Managed</span>
                    <span className="text-base font-bold text-white">{turfs.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Active Arenas</span>
                    <span className="text-base font-bold text-white">{arenas.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Turf Selector */}
            {turfs.length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 rounded-3xl p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No turfs added yet</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  Start by adding your real sports turf, arena courts, and time slots to begin accepting player bookings.
                </p>
                <button
                  id="empty-add-turf-btn"
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Turf</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Active Turf Overview & Arenas */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Selected Turf Card */}
                  {selectedTurf && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white">{selectedTurf.name}</h2>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2 py-0.5 rounded font-medium">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {selectedTurf.address}, {selectedTurf.area}, {selectedTurf.city}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentTab('slots')}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Manage Slots
                          </button>
                          <button
                            onClick={() => setShowAddArenaModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Arena</span>
                          </button>
                        </div>
                      </div>

                      {/* Arenas Under this turf */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-slate-200">My Arenas ({arenas.length})</h3>
                        </div>

                        {arenas.length === 0 ? (
                          <div className="bg-slate-950 p-4 rounded-xl text-center text-xs text-slate-500">
                            No arenas created for this turf. Click "+ Add Arena" above.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {arenas.map((ar) => (
                              <div
                                key={ar.id}
                                onClick={() => setSelectedArena(ar)}
                                className={`p-4 rounded-xl bg-slate-800 border transition-all cursor-pointer ${
                                  selectedArena?.id === ar.id
                                    ? 'border-slate-700 ring-2 ring-indigo-500/20 shadow-lg'
                                    : 'border-slate-700/60 opacity-85 hover:opacity-100 hover:border-indigo-500/60'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-slate-100 text-sm">{ar.name}</h4>
                                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                    Active
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">{ar.description || `${ar.sport} court`}</p>
                                <div className="mt-3 flex items-center gap-3">
                                  <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded font-semibold">
                                    {formatCurrency(ar.pricePerSlot)}/hr
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Cap: {ar.capacity}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Today's Schedule Feed */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Today's Schedule</h3>
                        <span className="text-xs text-slate-400">{formatDateString(todayStr)}</span>
                      </div>
                      <button
                        onClick={() => setCurrentTab('bookings')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        View all bookings →
                      </button>
                    </div>

                    {todayBookings.length === 0 ? (
                      <div className="bg-slate-950/60 rounded-xl p-6 text-center text-xs text-slate-400">
                        No bookings scheduled for today yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {todayBookings.map((b) => (
                          <div
                            key={b.id}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                                {b.startTime.split(' ')[0]}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-white block">
                                  {b.playerName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {b.arenaName} • {b.startTime} - {b.endTime}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="text-right">
                                <span className="text-xs font-bold text-white block">
                                  {formatCurrency(b.totalAmount)}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold ${
                                    b.paymentStatus === 'PAID'
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {b.paymentStatus}
                                </span>
                              </div>
                              {b.amountDue > 0 && (
                                <button
                                  onClick={() => {
                                    setSettlementBooking(b);
                                    setSettlementAmount(b.amountDue);
                                  }}
                                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  Collect
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Col: Quick Turf Selector list */}
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                      My Turfs ({turfs.length})
                    </span>
                    <div className="space-y-2">
                      {turfs.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTurf(t)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            selectedTurf?.id === t.id
                              ? 'border-indigo-500 bg-indigo-950/20 font-semibold ring-1 ring-indigo-500/30'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm text-white block">{t.name}</span>
                            <span className="text-[11px] text-slate-400">{t.city} • {t.area}</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-400">
                            {formatCurrency(t.basePrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Turf Location preview */}
                  {selectedTurf && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        Turf Geolocation
                      </span>
                      <InteractiveTurfMap
                        userLocation={{ latitude: selectedTurf.latitude, longitude: selectedTurf.longitude }}
                        turfs={[selectedTurf]}
                        selectedTurfId={selectedTurf.id}
                        onSelectTurf={() => {}}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MY TURF MANAGEMENT */}
        {currentTab === 'my-turf' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Turf & Arena Management</h2>
                <p className="text-xs text-slate-400">Manage real properties, arenas, sports and photos</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="tab-add-turf-btn"
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Turf</span>
                </button>
              </div>
            </div>

            {turfs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-4">No turfs created yet.</p>
                <button
                  onClick={() => setShowAddTurfModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Add Turf Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {turfs.map((turf) => (
                  <div
                    key={turf.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-white">{turf.name}</h3>
                          <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            {turf.city}
                          </span>
                          {turf.isClosed ? (
                            <span className="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Ban className="w-3 h-3" /> Turf Closed
                            </span>
                          ) : (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Open & Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{turf.address}, {turf.area}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Hours: {turf.openingTime} - {turf.closingTime} • Phone: {turf.phoneNumber}</p>
                        {turf.isClosed && turf.closedReason && (
                          <p className="text-xs text-rose-400 font-medium mt-1">
                            Closure Note: {turf.closedReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {/* Turf Closed / Open Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleTurfClosed(turf)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            turf.isClosed
                              ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border-emerald-500/40'
                              : 'bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white border-rose-500/40'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{turf.isClosed ? 'Reopen Turf' : 'Close Turf'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTurf(turf);
                            setShowAddArenaModal(true);
                          }}
                          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
                        >
                          + Add Arena
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete turf "${turf.name}" and all associated arenas?`)) {
                              await deleteTurf(turf.id);
                              showToast('Turf deleted.');
                              await loadData();
                            }
                          }}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Turf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Turf Verification Status & Document Upload Hub */}
                    <OwnerVerificationCard
                      turf={turf}
                      ownerName={profile?.displayName || 'Owner'}
                      onRefresh={loadData}
                    />

                    {/* Arenas breakdown with Maintenance Toggles */}
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Turf Arenas / Pitches ({(allArenasMap[turf.id] || []).length})
                        </span>
                        <span className="text-[11px] text-slate-500">Arena Maintenance & Controls</span>
                      </div>

                      {(allArenasMap[turf.id] || []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">No arenas created yet. Click "+ Add Arena" above.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {(allArenasMap[turf.id] || []).map((arena) => (
                            <div
                              key={arena.id}
                              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                arena.isUnderMaintenance
                                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{arena.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {arena.sport}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {formatCurrency(arena.defaultPricePerHour || 1000)}/hr • Capacity: {arena.capacity || 10} players
                                </p>
                                {arena.isUnderMaintenance && arena.maintenanceReason && (
                                  <p className="text-[10px] text-amber-400 italic mt-0.5">
                                    Reason: {arena.maintenanceReason}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleArenaMaintenance(arena)}
                                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                                    arena.isUnderMaintenance
                                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-amber-950/50 hover:text-amber-300 border-slate-700'
                                  }`}
                                  title={
                                    arena.isUnderMaintenance
                                      ? 'Click to finish maintenance & make slots available'
                                      : 'Click to put arena under maintenance and block future slots'
                                  }
                                >
                                  <Wrench className="w-3 h-3" />
                                  <span>{arena.isUnderMaintenance ? 'In Maintenance' : 'Set Maint.'}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Photos Preview */}
                    {turf.photos && turf.photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto py-2">
                        {turf.photos.map((p, idx) => (
                          <img
                            key={idx}
                            src={p}
                            alt="Turf"
                            className="w-24 h-20 object-cover rounded-xl border border-slate-700 flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* Sports & Facilities tags */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {turf.sports?.map((s, i) => (
                        <span key={i} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                          ⚽ {s}
                        </span>
                      ))}
                      {turf.facilities?.map((f, i) => (
                        <span key={i} className="bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SLOT MANAGEMENT (MANUAL, BULK, WEEKLY, VISIBILITY) */}
        {currentTab === 'slots' && (
          <div className="space-y-6">
            {/* Header / Selectors */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Slot Management</h2>
                  <p className="text-xs text-slate-400">
                    Create, edit, block, and control player visibility for slots
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="open-7day-slot-btn"
                    onClick={() => setShowSevenDayModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>7-Day Generator</span>
                  </button>

                  <button
                    id="open-recurring-slot-btn"
                    onClick={() => setShowRecurringSlotsModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Recurring Slots</span>
                  </button>

                  <button
                    id="open-bulk-slot-btn"
                    onClick={() => setShowBulkSlotModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bulk Generate</span>
                  </button>

                  <button
                    id="open-add-slot-btn"
                    onClick={() => setShowAddSlotModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Single Slot</span>
                  </button>
                </div>
              </div>

              {/* Turf & Arena Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select Turf</label>
                  <select
                    value={selectedTurf?.id || ''}
                    onChange={(e) => {
                      const t = turfs.find((item) => item.id === e.target.value);
                      if (t) handleSelectTurf(t);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {turfs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city}) {t.isClosed ? '🔴 [CLOSED]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-400">Select Arena</label>
                    {selectedArena && (
                      <button
                        type="button"
                        onClick={() => handleToggleArenaMaintenance(selectedArena)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          selectedArena.isUnderMaintenance
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        {selectedArena.isUnderMaintenance ? 'Under Maintenance' : 'Set Maintenance'}
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedArena?.id || ''}
                    onChange={(e) => {
                      const a = arenas.find((item) => item.id === e.target.value);
                      if (a) setSelectedArena(a);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.sport}) {a.isUnderMaintenance ? '🔧 [MAINTENANCE]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Weekly Calendar Day Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Select Date ({getDayName(selectedSlotDate)})
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {nextSevenDays.map((d) => {
                  const isSelected = d.dateStr === selectedSlotDate;
                  const daySlotsCount = slots.filter(
                    (s) => (!selectedArena || s.arenaId === selectedArena.id) && s.date === d.dateStr
                  ).length;

                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => setSelectedSlotDate(d.dateStr)}
                      className={`min-w-[80px] p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[11px] font-semibold uppercase">{d.dayName}</span>
                      <span className="text-sm font-extrabold">{d.formatted.split(' ')[1]}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {daySlotsCount} slots
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots List for Date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  Slots for {formatDateString(selectedSlotDate)} ({currentArenaSlots.length})
                </span>
                <span className="text-xs text-indigo-400 font-medium">
                  {currentArenaSlots.filter((s) => s.status === 'AVAILABLE').length} Available
                </span>
              </div>

              {currentArenaSlots.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No slots created for this day. Click "Bulk Generate" or "Add Single Slot" to populate the schedule.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentArenaSlots.map((slot) => {
                    const isAvailable = slot.status === 'AVAILABLE';
                    const isBookedPlayer = slot.status === 'BOOKED_BY_PLAYER';
                    const isBookedOwner = slot.status === 'BOOKED_BY_OWNER';
                    const isBlocked = slot.status === 'BLOCKED';

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-xl border transition-all relative ${
                          isAvailable
                            ? 'bg-slate-900 border-2 border-indigo-500/50 shadow-lg shadow-indigo-950/20'
                            : isBookedPlayer
                            ? 'bg-slate-950 border border-slate-800'
                            : isBookedOwner
                            ? 'bg-slate-950 border border-slate-800'
                            : 'bg-slate-900 border border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              isAvailable
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : isBookedPlayer
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : isBookedOwner
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-500'
                            }`}
                          >
                            {isBookedOwner ? 'OWNER RESERVED' : slot.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="text-lg font-bold italic text-white">{formatCurrency(slot.price)}</span>
                          <span className="flex items-center gap-1">
                            {slot.visibleToPlayers ? (
                              <span className="text-indigo-400 text-[10px] flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> Visible
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                                <EyeOff className="w-3 h-3" /> Hidden
                              </span>
                            )}
                          </span>
                        </div>

                        {slot.bookedByPlayerName && (
                          <div className="bg-slate-950 p-2 rounded-lg text-xs text-slate-300 mb-2 border border-slate-800">
                            Booked by: <strong className="text-white">{slot.bookedByPlayerName}</strong>
                          </div>
                        )}

                        {/* Owner Controls Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                          <button
                            onClick={() => handleToggleSlotVisibility(slot)}
                            className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer text-[11px]"
                            title={slot.visibleToPlayers ? 'Hide from players' : 'Make visible to players'}
                          >
                            {slot.visibleToPlayers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{slot.visibleToPlayers ? 'Hide' : 'Show'}</span>
                          </button>

                          {isAvailable && (
                            <>
                              <button
                                onClick={() => handleToggleSlotBlock(slot)}
                                className="text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer text-[11px]"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Block</span>
                              </button>

                              <button
                                onClick={() => handleOwnerBookSlot(slot)}
                                className="text-amber-400 hover:text-amber-300 font-bold text-[11px] cursor-pointer"
                              >
                                Reserve
                              </button>
                            </>
                          )}

                          {isBlocked && (
                            <button
                              onClick={() => handleToggleSlotBlock(slot)}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unblock</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              if (confirm('Delete this slot?')) {
                                await deleteSlot(slot.id);
                                showToast('Slot deleted.');
                                await loadData();
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: BOOKINGS */}
        {currentTab === 'bookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">All Bookings & Reservations</h2>
              <p className="text-xs text-slate-400">Real-time player bookings across your turfs</p>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                No bookings recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                          {b.bookingId || 'TF-BOOKING'}
                        </span>
                        <span className="text-base font-bold text-white">{b.playerName}</span>
                        <span className="text-xs text-slate-400">({b.playerEmail})</span>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-white font-medium">{b.turfName}</span>
                        <span>•</span>
                        <span>{b.arenaName} ({b.sport})</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-bold">{formatDateString(b.date)}</span>
                        <span>•</span>
                        <span>{b.startTime} - {b.endTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-base font-bold text-white block">
                          {formatCurrency(b.totalAmount)}
                        </span>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 justify-end">
                          <span>Paid: {formatCurrency(b.amountPaid)}</span>
                          {b.amountDue > 0 && (
                            <span className="text-rose-400 font-bold">Due: {formatCurrency(b.amountDue)}</span>
                          )}
                        </div>
                      </div>

                      {b.amountDue > 0 ? (
                        <button
                          onClick={() => {
                            setSettlementBooking(b);
                            setSettlementAmount(b.amountDue);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-950/50"
                        >
                          Collect Due
                        </button>
                      ) : (
                        <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20">
                          ✓ Settled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: OWNER ANALYTICS DASHBOARD */}
        {currentTab === 'analytics' && <OwnerAnalyticsDashboard />}

        {/* TAB: PROMOTIONS & OFFERS */}
        {currentTab === 'offers' && <OwnerOffersTab turfs={turfs} showToast={showToast} />}

        {/* TAB: REVIEWS & RATINGS */}
        {currentTab === 'reviews' && <OwnerReviewsTab turfs={turfs} showToast={showToast} />}

        {/* TAB: OWNER PAYMENT ID & PAYOUTS */}
        {(currentTab === 'payments' || currentTab === 'payouts') && (
          <OwnerPaymentSettingsTab
            turfs={turfs}
            showToast={showToast}
            onTurfsUpdated={loadData}
          />
        )}

        {/* TAB: PLAYERS DUES & COUNTER SETTLEMENTS */}
        {currentTab === 'dues' && (
          <OwnerPlayerDues
            showToast={showToast}
            onSettleBooking={(b) => {
              setSettlementBooking(b);
              setSettlementAmount(b.amountDue);
            }}
          />
        )}

        {/* TAB: PROFILE & BUSINESS SETTINGS */}
        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-indigo-600/30">
                  {profile?.displayName?.charAt(0) || 'O'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{profile?.displayName}</h2>
                  <p className="text-xs text-slate-400">{profile?.email}</p>
                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase mt-1 inline-block">
                    Verified Turf Owner
                  </span>
                </div>
              </div>

              {/* Quick Payment ID Banner */}
              <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block">
                      Receiving Payment ID (UPI)
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {profile?.paymentSettings?.upiId || 'No UPI ID configured yet'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentTab('payments')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Configure Payouts →
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateUserProfile({
                      displayName: editName,
                      phoneNumber: editPhone,
                      city: editCity,
                      bio: editBio,
                      businessName: editBusiness,
                      paymentSettings: {
                        ...(profile?.paymentSettings || {}),
                        upiId: editUpiId.trim(),
                        beneficiaryName:
                          editBeneficiaryName.trim() || editBusiness.trim() || editName.trim(),
                        updatedAt: new Date().toISOString(),
                      },
                    });
                    showToast('Owner profile and payment ID updated successfully!');
                  } catch (err) {
                    showToast('Failed to update profile.', 'error');
                  }
                }}
                className="space-y-4 pt-4 border-t border-slate-800"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Business / Brand Name
                  </label>
                  <input
                    type="text"
                    value={editBusiness}
                    onChange={(e) => setEditBusiness(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Direct Payment ID Input in Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Primary UPI ID / VPA</span>
                    </label>
                    <input
                      type="text"
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value.toLowerCase().trim())}
                      placeholder="e.g. turf@okhdfcbank"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Beneficiary Account Name
                    </label>
                    <input
                      type="text"
                      value={editBeneficiaryName}
                      onChange={(e) => setEditBeneficiaryName(e.target.value)}
                      placeholder="e.g. Apex Sports Arena"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Business Bio</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Short description of your sports facility and turf venues..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-950/50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  Save Profile & Payment ID
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">Account Role</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateUserProfile({ role: 'PLAYER' });
                      showToast('Switched account mode to Player!');
                    } catch (err) {
                      showToast('Failed to switch role.', 'error');
                    }
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  Switch to Player / Discovery Portal
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: ADD TURF ================= */}
      {showAddTurfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Add Sports Turf</h2>
            <p className="text-xs text-slate-400 mb-6">Create a real turf listing with location, timing, and photos</p>

            <form onSubmit={handleCreateTurf} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turf Name *</label>
                <input
                  type="text"
                  required
                  value={turfName}
                  onChange={(e) => setTurfName(e.target.value)}
                  placeholder="e.g. TruFit Kickoff Arena"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={turfDesc}
                  onChange={(e) => setTurfDesc(e.target.value)}
                  placeholder="Premium FIFA-certified turf with night floodlights and refreshments..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={turfAddress}
                    onChange={(e) => setTurfAddress(e.target.value)}
                    placeholder="e.g. Linking Road, Bandra West"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={turfArea}
                    onChange={(e) => setTurfArea(e.target.value)}
                    placeholder="e.g. Bandra"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={turfCity}
                    onChange={(e) => setTurfCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={turfPhone}
                    onChange={(e) => setTurfPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Opens</label>
                  <input
                    type="time"
                    value={turfOpenTime}
                    onChange={(e) => setTurfOpenTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Closes</label>
                  <input
                    type="time"
                    value={turfCloseTime}
                    onChange={(e) => setTurfCloseTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Base Price per Hour (₹)
                </label>
                <input
                  type="number"
                  value={turfBasePrice}
                  onChange={(e) => setTurfBasePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Venue Payment ID / UPI configuration */}
              <div className="bg-slate-950/80 border border-indigo-500/20 rounded-xl p-3 space-y-3">
                <span className="text-xs font-bold text-indigo-400 block flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Turf Direct Payment ID (UPI)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      UPI ID / VPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={turfUpiId}
                      onChange={(e) => setTurfUpiId(e.target.value.toLowerCase().trim())}
                      placeholder={profile?.paymentSettings?.upiId || 'e.g. turf@okhdfcbank'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Account / Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={turfBeneficiary}
                      onChange={(e) => setTurfBeneficiary(e.target.value)}
                      placeholder="e.g. Apex Arena Payouts"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Leave empty to inherit the default owner UPI ID configured in Payment Settings.
                </p>
              </div>

              {/* Map Pin Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Turf Map Location (Click to set pin coordinates)
                </label>
                <InteractiveTurfMap
                  userLocation={{ latitude: turfLat, longitude: turfLng }}
                  turfs={[]}
                  onSelectTurf={() => {}}
                  interactiveSelectLocation={true}
                  onLocationChange={(lat, lng) => {
                    setTurfLat(lat);
                    setTurfLng(lng);
                  }}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Turf Photos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, true)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {turfPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {turfPhotos.map((p, idx) => (
                      <div key={idx} className="relative">
                        <img src={p} alt="Preview" className="w-16 h-14 object-cover rounded-lg border border-slate-700" />
                        <button
                          type="button"
                          onClick={() => setTurfPhotos(turfPhotos.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTurfModal(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Creating Turf...' : 'Save Turf Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD ARENA ================= */}
      {showAddArenaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Add Arena Court</h2>
            <p className="text-xs text-slate-400 mb-6">Add a court/pitch under {selectedTurf?.name}</p>

            <form onSubmit={handleCreateArena} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Arena Name *</label>
                <input
                  type="text"
                  required
                  value={arenaName}
                  onChange={(e) => setArenaName(e.target.value)}
                  placeholder="e.g. Arena 2 - Box Cricket Court"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sport Type</label>
                <select
                  value={arenaSport}
                  onChange={(e) => setArenaSport(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Football">Football / Turf Soccer</option>
                  <option value="Box Cricket">Box Cricket</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Pickleball">Pickleball / Tennis</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Player Capacity</label>
                  <input
                    type="number"
                    value={arenaCapacity}
                    onChange={(e) => setArenaCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price per Slot (₹)</label>
                  <input
                    type="number"
                    value={arenaPrice}
                    onChange={(e) => setArenaPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddArenaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Adding...' : 'Create Arena'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SINGLE SLOT ================= */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create Slot</h2>
            <p className="text-xs text-slate-400 mb-6">
              Create a slot for {selectedArena?.name} on {formatDateString(slotDate)}
            </p>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Status</label>
                  <select
                    value={slotStatus}
                    onChange={(e) => setSlotStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="BOOKED_BY_OWNER">BOOKED BY OWNER</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-visible"
                  checked={slotVisible}
                  onChange={(e) => setSlotVisible(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chk-visible" className="text-xs text-slate-300 cursor-pointer">
                  Make visible to players for booking
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK GENERATE SLOTS ================= */}
      {showBulkSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Bulk Slot Generator</h2>
            <p className="text-xs text-slate-400 mb-6">
              Generate sequential 1-hour slots automatically for {selectedArena?.name}
            </p>

            <form onSubmit={handleCreateBulkSlots} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Hour (24h)</label>
                  <select
                    value={bulkStartHour}
                    onChange={(e) => setBulkStartHour(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 ({formatTime24to12(`${h}:00`)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Hour (24h)</label>
                  <select
                    value={bulkEndHour}
                    onChange={(e) => setBulkEndHour(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 ({formatTime24to12(`${h}:00`)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Price per Slot (₹)</label>
                <input
                  type="number"
                  value={bulkSlotPrice}
                  onChange={(e) => setBulkSlotPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Preview calculation */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
                <span className="font-bold text-indigo-400 block mb-1">Preview Generation:</span>
                <span>
                  Will generate{' '}
                  <strong className="text-white">
                    {Math.max(0, Math.floor((bulkEndHour - bulkStartHour) / bulkDurationHours))} slots
                  </strong>{' '}
                  from {formatTime24to12(`${bulkStartHour}:00`)} to {formatTime24to12(`${bulkEndHour}:00`)}.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkSlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  {actionLoading ? 'Generating...' : 'Confirm & Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SETTLE DUE PAYMENT ================= */}
      {settlementBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Collect Due Settlement</h2>
            <p className="text-xs text-slate-400 mb-4">
              Recording payment for {settlementBooking.playerName} ({settlementBooking.bookingId})
            </p>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-xs mb-4 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Booking Amount:</span>
                <span className="text-white font-bold">{formatCurrency(settlementBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Already Paid:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(settlementBooking.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-rose-400">Outstanding Due:</span>
                <span className="text-rose-400">{formatCurrency(settlementBooking.amountDue)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount Receiving (₹)</label>
              <input
                type="number"
                max={settlementBooking.amountDue}
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSettlementBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPaymentSettlement}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                {actionLoading ? 'Recording...' : 'Record Payment Cleared'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= MODAL: RECURRING SLOTS GENERATOR ================= */}
      {showRecurringSlotsModal && (
        <RecurringSlotsModal
          isOpen={showRecurringSlotsModal}
          onClose={() => setShowRecurringSlotsModal(false)}
          turfs={turfs}
          onGenerated={async () => {
            showToast('Recurring slots generated successfully!');
            await loadData();
          }}
          showToast={showToast}
        />
      )}
      {/* ================= MODAL: 7-DAY SLOT GENERATOR ================= */}
      {showSevenDayModal && selectedTurf && arenas.length > 0 && (
        <SevenDaySlotsModal
          isOpen={showSevenDayModal}
          onClose={() => setShowSevenDayModal(false)}
          turf={selectedTurf}
          arenas={arenas}
          onSlotsGenerated={async () => {
            await loadData();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
