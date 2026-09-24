import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Offer, Turf, Arena, PlanFeatureConfig } from '../../types';
import { createOffer, getOwnerOffers } from '../../lib/phase3';
import { getOwnerTurfs, getTurfArenas } from '../../lib/db';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  X,
  ToggleLeft,
  ToggleRight,
  Lock,
} from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface OwnerOffersTabProps {
  showToast?: (text: string, type?: 'success' | 'error') => void;
  turfs?: Turf[];
  planFeatures?: PlanFeatureConfig;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const OwnerOffersTab: React.FC<OwnerOffersTabProps> = ({ showToast, turfs: propTurfs, planFeatures }) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>(propTurfs || []);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form Fields
  const [offerName, setOfferName] = useState<string>('');
  const [offerCode, setOfferCode] = useState<string>('');
  const [offerDesc, setOfferDesc] = useState<string>('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [selectedTurfId, setSelectedTurfId] = useState<string>('ALL');
  const [selectedArenaId, setSelectedArenaId] = useState<string>('ALL');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [usageLimit, setUsageLimit] = useState<number>(50);

  const loadOffers = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [ownerOffers, ownerTurfs] = await Promise.all([
        getOwnerOffers(user.uid),
        getOwnerTurfs(user.uid),
      ]);
      setOffers(ownerOffers);
      if (!propTurfs) {
        setTurfs(ownerTurfs);
      }
    } catch (err) {
      console.error('Failed to load offers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [user, propTurfs]);

  // Fetch arenas when selectedTurfId changes
  useEffect(() => {
    const loadArenasForTurf = async () => {
      if (selectedTurfId === 'ALL') {
        setArenas([]);
        setSelectedArenaId('ALL');
        return;
      }
      try {
        const turfArenas = await getTurfArenas(selectedTurfId);
        setArenas(turfArenas);
        setSelectedArenaId('ALL');
      } catch (err) {
        console.error('Failed to load arenas for selected turf:', err);
      }
    };
    loadArenasForTurf();
  }, [selectedTurfId]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!offerCode.trim() || !offerName.trim()) {
      showToast?.('Offer name and coupon code are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const selectedTurfObj = turfs.find((t) => t.id === selectedTurfId);
      const selectedArenaObj = arenas.find((a) => a.id === selectedArenaId);

      // Force arena to ALL if feature is locked/disabled
      const finalArenaId = planFeatures?.individualArenaOffers === false ? 'ALL' : selectedArenaId;
      const finalArenaObj = planFeatures?.individualArenaOffers === false ? null : selectedArenaObj;

      await createOffer({
        ownerId: user.uid,
        turfId: selectedTurfId,
        turfName: selectedTurfObj ? selectedTurfObj.name : 'All Turfs',
        arenaId: finalArenaId,
        arenaName: finalArenaObj ? finalArenaObj.name : 'All Arenas',
        code: offerCode.trim().toUpperCase(),
        name: offerName.trim(),
        description: offerDesc.trim(),
        discountType,
        discountValue,
        startDate,
        endDate,
        applicableDays: selectedDays.length > 0 ? selectedDays : undefined,
        usageLimit: usageLimit || 50,
        active: true,
      });

      showToast?.(`Coupon code ${offerCode.toUpperCase()} created successfully!`, 'success');
      setShowCreateModal(false);
      // Reset form
      setOfferCode('');
      setOfferName('');
      setOfferDesc('');
      setSelectedTurfId('ALL');
      setSelectedArenaId('ALL');
      await loadOffers();
    } catch (err: any) {
      showToast?.(err.message || 'Failed to create offer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      const docRef = doc(db, 'offers', offer.id);
      await updateDoc(docRef, { active: !offer.active, updatedAt: new Date().toISOString() });
      showToast?.(`Coupon ${offer.code} ${!offer.active ? 'activated' : 'deactivated'}`, 'success');
      loadOffers();
    } catch (err) {
      showToast?.('Failed to update status', 'error');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await deleteDoc(doc(db, 'offers', offerId));
      showToast?.('Offer deleted.', 'success');
      loadOffers();
    } catch (err) {
      showToast?.('Failed to delete offer', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
        Loading promotional discounts and active coupon campaigns...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Tag className="w-4 h-4" />
            <span>Promotions & Coupons</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Turf Offers & Discounts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Boost off-peak bookings and reward regular athletes with custom coupon codes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Offer</span>
        </button>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-3">
            <Tag className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Active Offers</h4>
            <p className="text-xs text-slate-400">
              Create your first promotional discount coupon for weekday or early bird slots.
            </p>
          </div>
        ) : (
          offers.map((offer) => (
            <div
              key={offer.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-4 relative transition-all shadow-lg ${
                offer.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {offer.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        offer.active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {offer.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-2">{offer.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{offer.description}</p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-amber-400">
                    {offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                  </span>
                </div>
              </div>

              {/* Offer Details Matrix */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Validity:</span>
                  <span className="text-white font-medium">
                    {formatDateString(offer.startDate)} to {formatDateString(offer.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Applicable Turf:</span>
                  <span className="text-white font-medium">{offer.turfName || 'All Turfs'}</span>
                </div>
                {offer.arenaId && offer.arenaId !== 'ALL' && (
                  <div className="flex justify-between">
                    <span>Applicable Arena:</span>
                    <span className="text-pink-400 font-bold">{offer.arenaName || 'Specific Arena'}</span>
                  </div>
                )}
                {offer.applicableDays && offer.applicableDays.length > 0 && (
                  <div className="flex justify-between">
                    <span>Days:</span>
                    <span className="text-indigo-400 font-medium">{offer.applicableDays.join(', ')}</span>
                  </div>
                )}
                {offer.minBookingAmount && (
                  <div className="flex justify-between">
                    <span>Min Booking:</span>
                    <span className="text-white font-medium">₹{offer.minBookingAmount}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800/80 pt-1">
                  <span>Redemptions Used:</span>
                  <span className="text-white font-bold">
                    {offer.usedCount} {offer.usageLimit ? `/ ${offer.usageLimit}` : 'times'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleToggleActive(offer)}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {offer.active ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                      <span>Activate</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Delete offer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">Create Promotional Discount Coupon</h3>

            <form onSubmit={handleCreateOffer} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={offerCode}
                    onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WEEKDAY15"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-400 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Offer Title</label>
                  <input
                    type="text"
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value)}
                    placeholder="e.g. 15% Weekday Match Special"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={offerDesc}
                  onChange={(e) => setOfferDesc(e.target.value)}
                  placeholder="e.g. Applicable on all Monday-Thursday evening slots"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Usage Limit (Max Total Redemptions)
                </label>
                <input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Applicable Turf</label>
                <select
                  value={selectedTurfId}
                  onChange={(e) => setSelectedTurfId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All My Turfs</option>
                  {turfs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTurfId !== 'ALL' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                    <span>Applicable Arena / Gaming Zone</span>
                    {planFeatures?.individualArenaOffers === false && (
                      <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Gated (Pro Plan Only)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedArenaId}
                    onChange={(e) => setSelectedArenaId(e.target.value)}
                    disabled={planFeatures?.individualArenaOffers === false}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white ${
                      planFeatures?.individualArenaOffers === false ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="ALL">All Arenas / Gaming Zones</option>
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.sport})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Applicable Days (Optional - leave empty for all days)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
