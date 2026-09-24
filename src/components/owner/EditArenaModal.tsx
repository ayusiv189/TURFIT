import React, { useState, useEffect } from 'react';
import { Arena } from '../../types';
import { updateArena } from '../../lib/db';
import {
  X,
  Pencil,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  DollarSign,
  Users,
  FileText,
  Layers,
  Upload,
  Zap,
} from 'lucide-react';

interface EditArenaModalProps {
  arena: Arena;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_AMENITIES = [
  '💡 Pro LED Floodlights',
  '🌿 50mm FIFA Turf',
  '🚿 Changing Rooms & Showers',
  '❄️ Air Conditioning',
  '🛋️ Sofa Lounge Access',
  '🚰 Filtered Drinking Water',
  '🪑 Spectator Seating',
  '🅿️ Reserved Parking',
  '📶 Free High-Speed Wi-Fi',
  '🎱 Cues, Chalk & Triangle',
  '🩺 First Aid Kit',
  '🔒 Secure Lockers',
  '⚽ Free Match Balls & Bibs',
  '🔊 Surround Sound System',
];

export const EditArenaModal: React.FC<EditArenaModalProps> = ({
  arena,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [name, setName] = useState(arena.name || '');
  const [sport, setSport] = useState(arena.sport || 'Football');
  const [sports, setSports] = useState<string[]>(arena.sports || [arena.sport || 'Football']);
  const [description, setDescription] = useState(arena.description || '');
  const [capacity, setCapacity] = useState(arena.capacity || 14);
  const [pricePerSlot, setPricePerSlot] = useState(arena.pricePerSlot || 1200);
  const [photos, setPhotos] = useState<string[]>(arena.photos || []);
  const [amenities, setAmenities] = useState<string[]>(arena.amenities || []);
  const [equipmentIncluded, setEquipmentIncluded] = useState<string[]>(arena.equipmentIncluded || []);
  const [hasAC, setHasAC] = useState<boolean>(arena.hasAirConditioning || false);
  const [hasLounge, setHasLounge] = useState<boolean>(arena.hasLoungeAccess || false);
  const [customAmenity, setCustomAmenity] = useState('');
  const [customEquip, setCustomEquip] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'AMENITIES' | 'PHOTOS'>('DETAILS');

  useEffect(() => {
    setName(arena.name || '');
    setSport(arena.sport || 'Football');
    setSports(arena.sports || [arena.sport || 'Football']);
    setDescription(arena.description || '');
    setCapacity(arena.capacity || 14);
    setPricePerSlot(arena.pricePerSlot || 1200);
    setPhotos(arena.photos || []);
    setAmenities(arena.amenities || []);
    setEquipmentIncluded(arena.equipmentIncluded || []);
    setHasAC(arena.hasAirConditioning || false);
    setHasLounge(arena.hasLoungeAccess || false);
  }, [arena]);

  if (!isOpen) return null;

  const handleToggleAmenity = (item: string) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((a) => a !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleAddCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    const trimmed = customAmenity.trim();
    if (!amenities.includes(trimmed)) {
      setAmenities([...amenities, trimmed]);
    }
    setCustomAmenity('');
  };

  const handleAddCustomEquip = () => {
    if (!customEquip.trim()) return;
    const trimmed = customEquip.trim();
    if (!equipmentIncluded.includes(trimmed)) {
      setEquipmentIncluded([...equipmentIncluded, trimmed]);
    }
    setCustomEquip('');
  };

  const handleRemoveEquip = (item: string) => {
    setEquipmentIncluded(equipmentIncluded.filter((e) => e !== item));
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    setPhotos([...photos, photoUrlInput.trim()]);
    setPhotoUrlInput('');
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Image ${file.name} is larger than 5MB`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setPhotos((prev) => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Arena name is required', 'error');
      return;
    }
    if (pricePerSlot <= 0) {
      showToast('Price per slot must be greater than 0', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateArena(arena.id, {
        name: name.trim(),
        sport: sports[0] || sport,
        sports: sports,
        description: description.trim(),
        capacity: Number(capacity),
        pricePerSlot: Number(pricePerSlot),
        photos: photos,
        amenities: amenities,
        equipmentIncluded: equipmentIncluded,
        hasAirConditioning: hasAC,
        hasLoungeAccess: hasLounge,
      });

      showToast(`Arena "${name}" updated successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating arena:', err);
      showToast(err.message || 'Failed to update arena.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Edit Arena / Pitch</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {arena.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Update price, specs, photos, and amenities visible to players.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'DETAILS'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pricing & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AMENITIES')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'AMENITIES'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Amenities & Gear ({amenities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PHOTOS')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'PHOTOS'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Pitch Photos ({photos.length})</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'DETAILS' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Arena / Court Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pitch 1 - FIFA 7v7 Astroturf"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Price Per Slot (₹) *</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={pricePerSlot}
                    onChange={(e) => setPricePerSlot(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Base slot price shown to players during booking.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Player Capacity (Max)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ideal max players (e.g., 14 for 7v7, 4 for TT/Pool).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Supported Sports
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Football', label: '⚽ Football' },
                    { id: 'Cricket', label: '🏏 Box Cricket' },
                    { id: 'Badminton', label: '🏸 Badminton' },
                    { id: 'Tennis', label: '🎾 Tennis' },
                    { id: 'Pickleball', label: '🏓 Pickleball' },
                    { id: 'Basketball', label: '🏀 Basketball' },
                    { id: 'Pool', label: '🎱 Pool / Snooker' },
                    { id: 'Table Tennis', label: '🏓 Table Tennis' },
                    { id: 'Console PS5', label: '🎮 PS5 Lounge' },
                  ].map((s) => {
                    const isSelected = sports.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (sports.includes(s.id)) {
                            if (sports.length === 1) return;
                            setSports(sports.filter((item) => item !== s.id));
                          } else {
                            setSports([...sports, s.id]);
                          }
                        }}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pitch Description & Technical Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Premium 50mm monofilament FIFA certified synthetic turf with rubber granule shockpad. Features 100W LED floodlighting and boundary netting."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'AMENITIES' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-300 mb-2">
                  Select Arena Amenities
                </span>
                <p className="text-[11px] text-slate-400 mb-3">
                  Check all amenities available specifically for this pitch/court:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_AMENITIES.map((item) => {
                    const isChecked = amenities.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleAmenity(item)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{item}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Amenity */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Add Custom Amenity
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    placeholder="e.g. Tournament Scoreboard"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Equipment Included Section */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Included Gear & Equipment
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {equipmentIncluded.map((eq) => (
                    <span
                      key={eq}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      <span>{eq}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEquip(eq)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {equipmentIncluded.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic">No equipment items specified yet.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEquip}
                    onChange={(e) => setCustomEquip(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomEquip();
                      }
                    }}
                    placeholder="e.g. 2 Ash Cues or FIFA Match Ball"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEquip}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Add Gear
                  </button>
                </div>
              </div>

              {/* Quick Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAC}
                    onChange={(e) => setHasAC(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-200">❄️ Air Conditioning</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasLounge}
                    onChange={(e) => setHasLounge(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-200">🛋️ Sofa Lounge Access</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'PHOTOS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-300">
                    Pitch Photos ({photos.length})
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Upload photos specifically highlighting this arena / pitch.
                  </p>
                </div>

                <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-950/40">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photo URL Direct input */}
              <div className="flex gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="Paste Image URL (https://...)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              {/* Photo Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {photos.map((url, idx) => (
                  <div
                    key={`arena_photo_${idx}`}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-28"
                  >
                    <img
                      src={url}
                      alt={`Arena photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 bg-rose-600/90 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {photos.length === 0 && (
                <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No photos uploaded for this arena yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Players love seeing pitch surface quality, floodlights, and goalposts!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-950/50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Arena Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
