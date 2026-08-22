import React, { useState } from 'react';
import { MapPin, Search, Crosshair, Navigation, Users, Trophy, Layers } from 'lucide-react';
import { Turf, Lobby, Match } from '../types';
import { calculateDistanceKm, formatCurrency } from '../lib/utils';

interface InteractiveTurfMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  turfs: Turf[];
  lobbies?: Lobby[];
  matches?: Match[];
  selectedTurfId?: string;
  onSelectTurf: (turf: Turf) => void;
  onSelectLobby?: (lobby: Lobby) => void;
  onSelectMatch?: (match: Match) => void;
  interactiveSelectLocation?: boolean; // For Owner Add Turf map selection
  onLocationChange?: (lat: number, lng: number, addressHint?: string) => void;
}

export const InteractiveTurfMap: React.FC<InteractiveTurfMapProps> = ({
  userLocation,
  turfs,
  lobbies = [],
  matches = [],
  selectedTurfId,
  onSelectTurf,
  onSelectLobby,
  onSelectMatch,
  interactiveSelectLocation = false,
  onLocationChange,
}) => {
  const defaultCenter = userLocation || { latitude: 19.076, longitude: 72.8777 }; // default
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>(defaultCenter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [markerPos, setMarkerPos] = useState<{ latitude: number; longitude: number }>(
    userLocation || defaultCenter
  );

  // Layer filters
  const [showTurfsLayer, setShowTurfsLayer] = useState(true);
  const [showLobbiesLayer, setShowLobbiesLayer] = useState(true);
  const [showMatchesLayer, setShowMatchesLayer] = useState(true);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveSelectLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel offset to delta coordinates relative to map center
    const latDelta = (0.5 - y / rect.height) * 0.05;
    const lngDelta = (x / rect.width - 0.5) * 0.05;

    const newLat = parseFloat((mapCenter.latitude + latDelta).toFixed(6));
    const newLng = parseFloat((mapCenter.longitude + lngDelta).toFixed(6));

    setMarkerPos({ latitude: newLat, longitude: newLng });
    if (onLocationChange) {
      onLocationChange(newLat, newLng, `Pin at ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    }
  };

  const handleRecenter = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMarkerPos(userLocation);
      if (interactiveSelectLocation && onLocationChange) {
        onLocationChange(userLocation.latitude, userLocation.longitude);
      }
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
      {/* Search overlay & Recenter button */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              interactiveSelectLocation
                ? 'Search area or click on map to set turf pin...'
                : 'Filter arenas, lobbies, or matches on map...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-2.5 shadow-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {!interactiveSelectLocation && (
            <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1 rounded-xl gap-1 shadow-lg">
              <button
                type="button"
                onClick={() => setShowTurfsLayer(!showTurfsLayer)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  showTurfsLayer ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Turfs ({turfs.length})
              </button>
              {lobbies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLobbiesLayer(!showLobbiesLayer)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    showLobbiesLayer ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Lobbies ({lobbies.length})
                </button>
              )}
              {matches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMatchesLayer(!showMatchesLayer)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    showMatchesLayer ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matches ({matches.length})
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleRecenter}
            title="Recenter to my location"
            className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-indigo-400 p-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map visual canvas simulation with grid coordinates & turf markers */}
      <div
        id="interactive-map-canvas"
        onClick={handleMapClick}
        className="h-72 sm:h-96 w-full relative bg-slate-950 overflow-hidden cursor-crosshair select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 70%),
            linear-gradient(to right, rgba(51, 65, 85, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(51, 65, 85, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      >
        {/* Simulated Road / Area contours */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none stroke-slate-700 fill-none"
          strokeWidth="2"
        >
          <path d="M -50 150 Q 200 80 400 220 T 900 180" />
          <path d="M 120 -20 Q 180 180 220 400" />
          <path d="M 350 -10 Q 300 200 450 350" />
          <circle cx="280" cy="180" r="40" strokeDasharray="4,4" className="stroke-indigo-600/40" />
        </svg>

        {/* User Location Radar Marker */}
        {userLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-500 z-10"
            style={{
              left: `50%`,
              top: `50%`,
            }}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 animate-ping absolute -inset-0" />
            <div className="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center shadow-lg">
              <Navigation className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="absolute top-6 -left-6 bg-slate-900/90 text-indigo-300 font-semibold text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-slate-700">
              You are here
            </span>
          </div>
        )}

        {/* Interactive Mode draggable pin */}
        {interactiveSelectLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-full z-30 transition-all duration-200"
            style={{
              left: `${50 + (markerPos.longitude - mapCenter.longitude) * 2000}%`,
              top: `${50 - (markerPos.latitude - mapCenter.latitude) * 2000}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap mb-0.5">
                Turf Location Selected
              </div>
              <MapPin className="w-8 h-8 text-indigo-400 fill-indigo-500 drop-shadow-[0_4px_8px_rgba(99,102,241,0.5)] animate-bounce" />
            </div>
          </div>
        )}

        {/* Turf Markers in Discovery mode */}
        {!interactiveSelectLocation &&
          showTurfsLayer &&
          turfs
            .filter((t) =>
              searchQuery
                ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.area.toLowerCase().includes(searchQuery.toLowerCase())
                : true
            )
            .map((turf, idx) => {
              const isSelected = turf.id === selectedTurfId;
              const distance = userLocation
                ? calculateDistanceKm(
                    userLocation.latitude,
                    userLocation.longitude,
                    turf.latitude,
                    turf.longitude
                  )
                : null;

              // Calculate visual offset based on relative lat/lng
              const offsetX =
                50 +
                ((turf.longitude - defaultCenter.longitude) || (idx % 3 - 1) * 0.015) * 2500;
              const offsetY =
                50 -
                ((turf.latitude - defaultCenter.latitude) || (Math.floor(idx / 3) - 1) * 0.015) *
                  2500;

              // Clamp inside map bounds
              const boundedX = Math.max(12, Math.min(88, offsetX));
              const boundedY = Math.max(18, Math.min(82, offsetY));

              return (
                <div
                  key={`turf_${turf.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTurf(turf);
                  }}
                  style={{
                    left: `${boundedX}%`,
                    top: `${boundedY}%`,
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all duration-300 ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-white font-bold ring-4 ring-indigo-500/30'
                        : 'bg-slate-900/90 text-white border-slate-700 hover:border-indigo-500'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-xs font-semibold whitespace-nowrap max-w-[110px] truncate">
                        {turf.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] opacity-85">
                        <span>{formatCurrency(turf.basePrice)}</span>
                        {distance !== null && <span>• {distance} km</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

        {/* Lobbies Markers */}
        {!interactiveSelectLocation &&
          showLobbiesLayer &&
          lobbies.map((lobby, idx) => {
            const turf = turfs.find((t) => t.id === lobby.turfId);
            const lat = turf?.latitude || defaultCenter.latitude + 0.005 * (idx + 1);
            const lng = turf?.longitude || defaultCenter.longitude - 0.005 * (idx + 1);

            const offsetX = 50 + ((lng - defaultCenter.longitude) + 0.003 * ((idx % 2) ? 1 : -1)) * 2500;
            const offsetY = 50 - ((lat - defaultCenter.latitude) + 0.003 * ((idx % 2) ? -1 : 1)) * 2500;

            const boundedX = Math.max(15, Math.min(85, offsetX));
            const boundedY = Math.max(22, Math.min(80, offsetY));

            return (
              <div
                key={`lobby_${lobby.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectLobby) onSelectLobby(lobby);
                }}
                style={{
                  left: `${boundedX}%`,
                  top: `${boundedY}%`,
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/90 text-emerald-200 shadow-xl backdrop-blur-md text-[11px] font-bold">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span className="max-w-[90px] truncate">{lobby.name}</span>
                  <span className="bg-emerald-800 text-emerald-100 text-[9px] px-1 rounded">
                    {lobby.currentPlayers}/{lobby.maxPlayers}
                  </span>
                </div>
              </div>
            );
          })}

        {/* Matches Markers */}
        {!interactiveSelectLocation &&
          showMatchesLayer &&
          matches.map((match, idx) => {
            const turf = turfs.find((t) => t.id === match.turfId);
            const lat = turf?.latitude || defaultCenter.latitude - 0.006 * (idx + 1);
            const lng = turf?.longitude || defaultCenter.longitude + 0.006 * (idx + 1);

            const offsetX = 50 + ((lng - defaultCenter.longitude) + 0.004 * ((idx % 2) ? 1 : -1)) * 2500;
            const offsetY = 50 - ((lat - defaultCenter.latitude) - 0.004 * ((idx % 2) ? -1 : 1)) * 2500;

            const boundedX = Math.max(15, Math.min(85, offsetX));
            const boundedY = Math.max(22, Math.min(80, offsetY));

            return (
              <div
                key={`match_${match.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectMatch) onSelectMatch(match);
                }}
                style={{
                  left: `${boundedX}%`,
                  top: `${boundedY}%`,
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-950/90 text-amber-200 shadow-xl backdrop-blur-md text-[11px] font-bold">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="max-w-[90px] truncate">{match.matchName}</span>
                  <span className="bg-amber-800 text-amber-100 text-[9px] px-1 rounded">
                    {match.sport}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Map Footer Bar */}
      <div className="bg-slate-900 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800">
        <span>
          {interactiveSelectLocation
            ? `Pin: ${markerPos.latitude.toFixed(4)}, ${markerPos.longitude.toFixed(4)}`
            : `${turfs.length} Arenas • ${lobbies.length} Lobbies • ${matches.length} Matches`}
        </span>
        <span className="text-indigo-400 font-medium">TruFit Live Geolocation</span>
      </div>
    </div>
  );
};
