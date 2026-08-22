import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Arena, Turf } from '../../types';
import { previewRecurringSlots, generateRecurringSlots } from '../../lib/phase3';
import { formatCurrency, formatDateString } from '../../lib/utils';
import {
  Calendar,
  Clock,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface RecurringSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  turf: Turf;
  arenas: Arena[];
  onSlotsGenerated: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RecurringSlotsModal: React.FC<RecurringSlotsModalProps> = ({
  isOpen,
  onClose,
  turf,
  arenas,
  onSlotsGenerated,
  showToast,
}) => {
  const { user } = useAuth();
  const [selectedArenaId, setSelectedArenaId] = useState<string>(arenas[0]?.id || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [endTime, setEndTime] = useState<string>('19:00');
  const [weeksAhead, setWeeksAhead] = useState<number>(4);
  const [price, setPrice] = useState<number>(arenas[0]?.defaultPricePerHour || 1000);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'OWNER_ONLY'>('PUBLIC');

  // Preview state
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [previewResults, setPreviewResults] = useState<{
    validSlots: { date: string; startTime: string; endTime: string }[];
    conflictingDates: string[];
    totalDates: number;
  } | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleArenaChange = (arenaId: string) => {
    setSelectedArenaId(arenaId);
    const arena = arenas.find((a) => a.id === arenaId);
    if (arena) {
      setPrice(arena.defaultPricePerHour || 1000);
    }
  };

  const handlePreview = async () => {
    if (!selectedArenaId || !user) return;
    setPreviewing(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + weeksAhead * 7);
      const endDate = future.toISOString().split('T')[0];

      const res = await previewRecurringSlots(
        user.uid,
        turf.id,
        selectedArenaId,
        startDate,
        endDate,
        selectedDays,
        startTime,
        endTime,
        price
      );

      const validSlots = res.items
        .filter((i) => !i.hasConflict)
        .map((i) => ({ date: i.date, startTime: i.startTime, endTime: i.endTime }));
      const conflictingDates = res.items.filter((i) => i.hasConflict).map((i) => i.date);

      setPreviewResults({
        validSlots,
        conflictingDates,
        totalDates: res.totalSlots,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to preview recurring slots', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedArenaId) return;
    const selectedArena = arenas.find((a) => a.id === selectedArenaId);
    if (!selectedArena) return;

    setGenerating(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + weeksAhead * 7);
      const endDate = future.toISOString().split('T')[0];

      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      const durationMinutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]) || 60;

      const res = await generateRecurringSlots({
        ownerId: user.uid,
        turfId: turf.id,
        arenaId: selectedArenaId,
        startDate,
        endDate,
        selectedDays,
        startTime,
        endTime,
        durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
        price,
        visibleToPlayers: visibility === 'PUBLIC',
      });

      showToast(`Successfully created ${res.createdCount} recurring slots across ${weeksAhead} weeks! (Preserved ${res.preservedCount} booked slots)`, 'success');
      onSlotsGenerated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate recurring slots', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create Recurring Slots</h3>
            <p className="text-xs text-slate-400">{turf.name}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Arena Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Arena / Pitch</label>
            <select
              value={selectedArenaId}
              onChange={(e) => handleArenaChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              {arenas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.supportedSports.join(', ')})
                </option>
              ))}
            </select>
          </div>

          {/* Days Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Repeat On Days</label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Weeks & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Schedule Horizon</label>
              <select
                value={weeksAhead}
                onChange={(e) => setWeeksAhead(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={2}>Next 2 Weeks</option>
                <option value={4}>Next 4 Weeks (1 Month)</option>
                <option value={8}>Next 8 Weeks (2 Months)</option>
                <option value={12}>Next 12 Weeks (3 Months)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slot Price (₹)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Slot Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="PUBLIC">Public (Available for all players to book)</option>
              <option value="OWNER_ONLY">Owner Only (Reserved for offline academies / private)</option>
            </select>
          </div>

          {/* Preview Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {previewing ? (
                'Checking Schedule Conflicts...'
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Generated Schedule & Check Conflicts</span>
                </>
              )}
            </button>
          </div>

          {/* Preview Results Banner */}
          {previewResults && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Schedule Preview Summary</span>
                <span className="text-indigo-400 font-bold">{previewResults.validSlots.length} Valid Slots</span>
              </div>

              {previewResults.conflictingDates.length > 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {previewResults.conflictingDates.length} conflicting slot(s) detected!
                    </p>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Dates: {previewResults.conflictingDates.slice(0, 3).join(', ')}
                      {previewResults.conflictingDates.length > 3 ? '...' : ''}. Conflicting dates will be safely skipped.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No schedule collisions found. All {previewResults.validSlots.length} dates are available!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-slate-800 mt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-950/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              'Creating Schedule...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Generate Slots</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
