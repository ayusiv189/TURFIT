import React, { useState, useMemo } from 'react';
import { useLocation, POPULAR_CITIES } from '../context/LocationContext';
import { Turf } from '../types';
import {
  MapPin,
  Search,
  Crosshair,
  Check,
  X,
  Building2,
  Sparkles,
  ChevronRight,
  Globe2,
} from 'lucide-react';

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  turfs?: Turf[];
  onSelectCity?: (city: string) => void;
  title?: string;
  subtitle?: string;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  onClose,
  turfs = [],
  onSelectCity,
  title = 'Select Your City',
  subtitle = 'Discover, book, and play at verified turfs & arenas registered in your city.',
}) => {
  const { selectedCity, setSelectedCity, requestLocation, loadingLocation } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all unique cities from registered turfs in DB and merge with popular cities
  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    turfs.forEach((t) => {
      if (t.city && typeof t.city === 'string' && t.city.trim()) {
        const normalized = t.city.trim();
        const key = normalized.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }, [turfs]);

  // Unified list of cities
  const allCityOptions = useMemo(() => {
    const list: { name: string; state?: string; venueCount: number; isPopular: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Add popular list
    POPULAR_CITIES.forEach((c) => {
      const key = c.name.toLowerCase();
      seen.add(key);
      list.push({
        name: c.name,
        state: c.state,
        venueCount: cityCounts.get(key) || 0,
        isPopular: !!c.popular,
      });
    });

    // 2. Add any additional cities found in DB turfs
    turfs.forEach((t) => {
      if (t.city && typeof t.city === 'string' && t.city.trim()) {
        const trimmed = t.city.trim();
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            name: trimmed,
            state: 'India',
            venueCount: cityCounts.get(key) || 0,
            isPopular: false,
          });
        }
      }
    });

    return list;
  }, [turfs, cityCounts]);

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return allCityOptions;
    const q = searchTerm.toLowerCase().trim();
    return allCityOptions.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.state && c.state.toLowerCase().includes(q))
    );
  }, [allCityOptions, searchTerm]);

  const handleCityPick = (cityName: string) => {
    setSelectedCity(cityName);
    if (onSelectCity) {
      onSelectCity(cityName);
    }
    onClose();
  };

  const handleAutoDetect = async () => {
    await requestLocation();
    onClose();
  };

  if (!isOpen) return null;

  const popularPicks = allCityOptions.filter((c) => c.isPopular || c.venueCount > 0).slice(0, 10);

  return (
    <div
      id="city-selector-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="city-selector-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  City First
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            id="close-city-selector-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & GPS Auto-detect */}
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="city-search-input"
              autoFocus
              placeholder="Search by city name (e.g. Mumbai, Bengaluru, Delhi NCR...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="button"
            id="gps-auto-detect-city-btn"
            onClick={handleAutoDetect}
            disabled={loadingLocation}
            className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 text-indigo-400 ${loadingLocation ? 'animate-spin' : ''}`} />
            <span>{loadingLocation ? 'Detecting GPS location...' : 'Use My Current Location / GPS'}</span>
          </button>
        </div>

        {/* Cities Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Popular Cities Grid (shown when not searching) */}
          {!searchTerm.trim() && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Popular Sports Hubs
                </span>
                <span className="text-[10px] text-slate-500">Tap to switch</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {popularPicks.map((city) => {
                  const isCurrent =
                    selectedCity.toLowerCase().trim() === city.name.toLowerCase().trim();
                  return (
                    <button
                      type="button"
                      key={`popular_city_${city.name}`}
                      onClick={() => handleCityPick(city.name)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                          : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs sm:text-sm text-white">{city.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />}
                      </div>
                      <span className="text-[10px] text-indigo-400/90 mt-1 font-medium">
                        {city.venueCount > 0 ? `${city.venueCount} registered ${city.venueCount === 1 ? 'venue' : 'venues'}` : 'Browse venues'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Cities List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              {searchTerm.trim() ? `Search Results (${filteredCities.length})` : 'All Available Cities'}
            </span>

            {filteredCities.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">No cities matching "{searchTerm}"</p>
                <p className="text-[11px] text-slate-500">
                  You can still select any major city or use "All Cities" in filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                {filteredCities.map((city) => {
                  const isCurrent =
                    selectedCity.toLowerCase().trim() === city.name.toLowerCase().trim();
                  return (
                    <button
                      type="button"
                      key={`list_city_${city.name}`}
                      onClick={() => handleCityPick(city.name)}
                      className={`w-full py-3 px-4 text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-950/40 text-indigo-300'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin className={`w-3.5 h-3.5 ${isCurrent ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                            <span>{city.name}</span>
                            {city.state && (
                              <span className="text-[10px] text-slate-500 font-normal">({city.state})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {city.venueCount > 0 && (
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            {city.venueCount} {city.venueCount === 1 ? 'venue' : 'venues'}
                          </span>
                        )}
                        {isCurrent ? (
                          <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span>Current:</span>
            <strong className="text-indigo-400 font-bold">{selectedCity || 'None Selected'}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Confirm & View Venues
          </button>
        </div>
      </div>
    </div>
  );
};
