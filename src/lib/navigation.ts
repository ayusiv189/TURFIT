/**
 * Utility to launch native map navigation or directions in external apps / browsers
 */
export function openTurfDirections(latitude: number, longitude: number, turfName?: string) {
  if (!latitude || !longitude) return;

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const destinationParam = `${latitude},${longitude}`;
  const label = turfName ? encodeURIComponent(turfName) : 'Sports Turf';

  if (isIOS) {
    // Apple Maps URI Scheme
    const appleUrl = `https://maps.apple.com/?daddr=${destinationParam}&q=${label}`;
    window.open(appleUrl, '_blank');
  } else {
    // Google Maps standard navigation intent / URL
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`;
    window.open(googleUrl, '_blank');
  }
}

export function openDirectionsInMaps(turf: {
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  locationUrl?: string;
}) {
  if (turf.locationUrl && (turf.locationUrl.startsWith('http://') || turf.locationUrl.startsWith('https://'))) {
    window.open(turf.locationUrl, '_blank');
    return;
  }
  if (turf.latitude && turf.longitude) {
    openTurfDirections(turf.latitude, turf.longitude, turf.name);
  } else {
    const queryStr = encodeURIComponent(`${turf.name}, ${turf.address || ''}, ${turf.city || ''}`);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(`https://maps.apple.com/?q=${queryStr}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${queryStr}`, '_blank');
    }
  }
}

/**
 * Calculates geographical distance between two coordinates in Kilometers (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}
