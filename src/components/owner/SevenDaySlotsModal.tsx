import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Arena, Turf } from '../../types';
import { generate7DaySlots } from '../../lib/db';
import { formatCurrency, getTodayDateString } from '../../lib/utils';
import {
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  X,
  IndianRupee,
  Loader2,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface SevenDaySlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  turf: Turf;
  arenas?: Arena[];
  onSlotsGenerated: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SevenDaySlotsModal: React.FC<SevenDaySlotsModalProps> = ({
  isOpen,
  onClose,
  turf,
  arenas = [],
  onSlotsGenerated,
  showToast,
}) => {
  const { user } = useAuth();
  const safeArenas = arenas || [];
  const [selectedArenaId, setSelectedArenaId] = useState<string>(safeArenas[0]?.id || '');
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [startHour, setStartHour] = useState<number>(6); // 6 AM
  const [endHour, setEndHour] = useState<number>(23); // 11 PM
  const [durationHours, setDurationHours] = useState<number>(1);
  const [price, setPrice] = useState<number>(
    safeArenas[0]?.defaultPricePerHour || (safeArenas[0] as any)?.pricePerSlot || turf?.basePrice || 1000
  );

  React.useEffect(() => {
    if (!selectedArenaId && safeArenas.length > 0) {
      setSelectedArenaId(safeArenas[0].id);
      setPrice(safeArenas[0].defaultPricePerHour || (safeArenas[0] as any).pricePerSlot || turf?.basePrice || 1000);
    }
  }, [safeArenas, selectedArenaId, turf]);
  const [selectedDays, setSelectedDays] = useState<string[]>([...ALL_DAYS]);
  const [loading, setLoading] = useState<boolean>(false);
  const [createdSummary, setCreatedSummary] = useState<{
    totalSlotsCreated: number;
    datesCovered: string[];
  } | null>(null);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const selectAllDays = () => setSelectedDays([...ALL_DAYS]);
  const selectWeekdaysOnly = () =>
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const selectWeekendsOnly = () => setSelectedDays(['Saturday', 'Sunday']);

  const hoursDiff = Math.max(1, endHour - startHour);
  const slotsPerDay = Math.floor(hoursDiff / durationHours);
  const totalEstimatedSlots = slotsPerDay * selectedDays.length;

  const handleGenerate = async () => {
    if (!user || !turf || !selectedArenaId) {
      showToast('Please select a valid arena', 'error');
      return;
    }

    if (startHour >= endHour) {
      showToast('Start hour must be earlier than End hour', 'error');
      return;
    }

    setLoading(true);
    setCreatedSummary(null);
    try {
      const res = await generate7DaySlots({
        turfId: turf.id,
        arenaId: selectedArenaId,
        ownerId: user.uid,
        startHour: Number(startHour),
        endHour: Number(endHour),
        durationHours: Number(durationHours),
        price: Number(price),
        selectedDays: selectedDays,
        startDate: startDate,
      });

      setCreatedSummary(res);
      showToast(
        `Successfully generated ${res.totalSlotsCreated} slots across 7 days!`,
        'success'
      );
      onSlotsGenerated();
    } catch (err: any) {
      console.error('7-day slot generation error:', err);
      showToast(err.message || 'Failed to generate 7-day slots.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">7-Day Slot Auto-Generator</h3>
              <p className="text-xs text-slate-400">
                Bulk create a full week schedule for {turf.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Arena */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Target Arena / Pitch
            </label>
            <select
              value={selectedArenaId}
              onChange={(e) => {
                setSelectedArenaId(e.target.value);
                const a = arenas.find((item) => item.id === e.target.value);
                if (a && a.defaultPricePerHour) setPrice(a.defaultPricePerHour);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {arenas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.sport}) — {formatCurrency(a.defaultPricePerHour)}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Week Starting Date
              </label>
              <input
                type="date"
                value={startDate}
                min={getTodayDateString()}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Slot Price per Hour (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Time Span & Duration */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              Daily Operating Schedule
            </h4>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Opening Hour
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Closing Hour
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Slot Length
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value={1}>1 Hour / slot</option>
                  <option value={2}>2 Hours / slot</option>
                </select>
              </div>
            </div>
          </div>

          {/* Days selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Apply to Days ({selectedDays.length} of 7 selected)
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/20"
                >
                  All 7 Days
                </button>
                <button
                  type="button"
                  onClick={selectWeekdaysOnly}
                  className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={selectWeekendsOnly}
                  className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                >
                  Weekends
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Slots per Day:</span>
              <span className="font-bold text-white">{slotsPerDay} slots</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Selected Days:</span>
              <span className="font-bold text-indigo-300">{selectedDays.length} days</span>
            </div>
            <div className="flex justify-between border-t border-indigo-500/20 pt-1.5 font-bold">
              <span className="text-white">Estimated New Slots:</span>
              <span className="text-emerald-400 text-sm">{totalEstimatedSlots} slots</span>
            </div>
          </div>

          {/* Success banner if generated */}
          {createdSummary && (
            <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{createdSummary.totalSlotsCreated} slots created successfully!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Covering dates: {createdSummary.datesCovered.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {createdSummary ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={loading || selectedDays.length === 0}
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Slots...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate 7-Day Slots</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
