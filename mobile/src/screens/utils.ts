import { sanitizeData } from '../services/dbService';
import { Linking, Platform, Alert } from 'react-native';

export const sanitizeFirestoreData = sanitizeData;
export { sanitizeData };

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Compulsory Google Maps deep-link helper.
 * When an owner provides a Google Maps short-link (maps.app.goo.gl) or full link,
 * this directly opens Google Maps / Apple Maps to lead straight to the turf entry gate.
 */
export function openVenueInMaps(venue: {
  name?: string;
  address?: string;
  area?: string;
  city?: string;
  locationUrl?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
}): void {
  const directLink = (venue.locationUrl || venue.googleMapsUrl || '').trim();
  if (directLink && (directLink.startsWith('http://') || directLink.startsWith('https://') || directLink.startsWith('maps://'))) {
    Linking.openURL(directLink).catch((err) => {
      console.warn('Could not open direct maps link, falling back to coordinates:', err);
      fallbackToCoordMaps(venue);
    });
    return;
  }
  fallbackToCoordMaps(venue);
}

function fallbackToCoordMaps(venue: {
  name?: string;
  address?: string;
  area?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}): void {
  const label = encodeURIComponent(venue.name || 'Sports Arena');
  if (venue.latitude && venue.longitude) {
    const lat = venue.latitude;
    const lng = venue.longitude;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url as string).catch((err) => {
      console.warn('Error opening maps via coords:', err);
      Alert.alert('Map Error', 'Unable to open maps application.');
    });
  } else {
    const query = encodeURIComponent(
      [venue.name, venue.address, venue.area, venue.city].filter(Boolean).join(', ')
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Map Error', 'Unable to open Google Maps.');
    });
  }
}

