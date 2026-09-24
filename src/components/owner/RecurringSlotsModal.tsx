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
  ShieldCheck,
  Users,
  Tag,
  Zap,
} from 'lucide-react';

interface RecurringSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  turf?: Turf;
  turfs?: Turf[];
  arenas?: Arena[];
  onSlotsGenerated?: () => void;
  onGenerated?: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PRESETS = [
  { label: 'Mon, Wed, Fri (3x/wk)', days: ['Monday', 'Wednesday', 'Friday'] },
  { label: 'Tue, Thu, Sat (3x/wk)', days: ['Tuesday', 'Thursday', 'Saturday'] },
  { label: 'Weekends (Sat & Sun)', days: ['Saturday', 'Sunday'] },
  { label: 'All Weekdays (Mon-Fri)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
];

export const RecurringSlotsModal: React.FC<RecurringSlotsModalProps> = ({
  isOpen,
  onClose,
  turf,
  turfs,
  arenas = [],
  onSlotsGenerated,
  onGenerated,
  showToast,
}) => {
  const { user } = useAuth();
  const activeTurf = turf || (turfs && turfs.length > 0 ? turfs[0] : null);
  const safeArenas = arenas || [];
  
  const [selectedArenaId, setSelectedArenaId] = useState<string>(safeArenas[0]?.id || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [endTime, setEndTime] = useState<string>('19:00');
  const [weeksAhead, setWeeksAhead] = useState<number>(4);
  const [price, setPrice] = useState<number>(
    safeArenas[0]?.pricePerSlot || (safeArenas[0] as any)?.defaultPricePerHour || activeTurf?.basePrice || 1000
  );
  const [visibility, setVisibility] = useState<'PUBLIC' | 'OWNER_ONLY'>('PUBLIC');
  
  // Team Pass & Guaranteed Allocation settings
  const [enableTeamPass, setEnableTeamPass] = useState<boolean>(true);
  const [teamPassDiscount, setTeamPassDiscount] = useState<number>(15); // 15% off for regular team pass
  const [reservedTeamName, setReservedTeamName] = useState<string>('');

  // Sync selectedArenaId if safeArenas changes
  React.useEffect(() => {
    if (!selectedArenaId && safeArenas.length > 0) {
      setSelectedArenaId(safeArenas[0].id);
      setPrice(safeArenas[0].pricePerSlot || (safeArenas[0] as any).defaultPricePerHour || activeTurf?.basePrice || 1000);
    }
  }, [safeArenas, selectedArenaId, activeTurf]);

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
    const arena = safeArenas.find((a) => a.id === arenaId);
    if (arena) {
      setPrice(arena.pricePerSlot || (arena as any).defaultPricePerHour || activeTurf?.basePrice || 1000);
    }
  };

  const handlePreview = async () => {
    if (!selectedArenaId || !user || !activeTurf) return;
    setPreviewing(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + weeksAhead * 7);
      const endDate = future.toISOString().split('T')[0];

      const res = await previewRecurringSlots(
        user.uid,
        activeTurf.id,
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
    if (!user || !selectedArenaId || !activeTurf) return;
    const selectedArena = safeArenas.find((a) => a.id === selectedArenaId) || safeArenas[0];

    setGenerating(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + weeksAhead * 7);
      const endDate = future.toISOString().split('T')[0];

      const startParts = (startTime || '18:00').split(':').map(Number);
      const endParts = (endTime || '19:00').split(':').map(Number);
      const durationMinutes = ((endParts[0] || 19) * 60 + (endParts[1] || 0)) - ((startParts[0] || 18) * 60 + (startParts[1] || 0)) || 60;

      const res = await generateRecurringSlots({
        ownerId: user.uid,
        turfId: activeTurf.id,
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
      if (onSlotsGenerated) onSlotsGenerated();
      if (onGenerated) onGenerated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate recurring slots', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recurring Slot Schedules</h3>
            <p className="text-xs text-slate-400">Guaranteed multi-week allocation & team pass pricing for {activeTurf?.name || 'Venue'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Arena Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Arena / Pitch</label>
            <select
              value={selectedArenaId}
              onChange={(e) => handleArenaChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
            >
              {safeArenas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.sport || (a as any).sports?.join(', ') || 'Turf'}) - ₹{a.pricePerSlot || activeTurf?.basePrice || 1000}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Schedule Pattern Presets</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PRESETS.map((p) => {
                const isActive = JSON.stringify(p.days) === JSON.stringify(selectedDays);
                return (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => setSelectedDays(p.days)}
                    className={`text-[11px] font-semibold p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Days Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Active Days of Week</label>
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
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times */}
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

          {/* Schedule Horizon Window & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Window Horizon</label>
              <select
                value={weeksAhead}
                onChange={(e) => setWeeksAhead(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={4}>4 Weeks (30-Day Monthly Pass)</option>
                <option value={8}>8 Weeks (60-Day Pass)</option>
                <option value={12}>12 Weeks (90-Day Team Pass)</option>
                <option value={2}>2 Weeks Short Window</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Standard Rate per Slot (₹)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>
          </div>

          {/* Team Pass Configuration */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Enable Recurring Team Pass Discount</span>
              </div>
              <input
                type="checkbox"
                checked={enableTeamPass}
                onChange={(e) => setEnableTeamPass(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            {enableTeamPass && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Team Discount %</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="40"
                      value={teamPassDiscount}
                      onChange={(e) => setTeamPassDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pass Rate / Match</label>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl">
                    ₹{Math.round(price * (1 - teamPassDiscount / 100))} (Save ₹{Math.round(price * (teamPassDiscount / 100))})
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Slot Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="PUBLIC">Public (Visible for regular players & team passes)</option>
              <option value="OWNER_ONLY">Private (Reserved for offline academy squads)</option>
            </select>
          </div>

          {/* Preview Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                      {previewResults.conflictingDates.length > 3 ? '...' : ''}. Existing bookings will be safely preserved.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No collisions found! All {previewResults.validSlots.length} dates are available across the {weeksAhead}-week window.</span>
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
            className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-950/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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

