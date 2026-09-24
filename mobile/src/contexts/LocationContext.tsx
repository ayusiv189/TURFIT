import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  location: Coordinates | null;
  userLocation: Coordinates | null;
  city: string;
  setCity: (city: string) => void;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  calculateDistance: (lat: number, lng: number, lat2?: number, lng2?: number) => number | null;
  calculateDistanceKm: (lat: number, lng: number, lat2?: number, lng2?: number) => number | null;
  formatDistance: (lat: number, lng: number) => string;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  userLocation: null,
  city: 'Mumbai',
  setCity: () => {},
  hasPermission: false,
  requestPermission: async () => {},
  calculateDistance: () => null,
  calculateDistanceKm: () => null,
  formatDistance: () => '',
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [city, setCity] = useState<string>('Mumbai');
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({
          latitude: cur.coords.latitude,
          longitude: cur.coords.longitude,
        });

        // Reverse geocode to find city
        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: cur.coords.latitude,
            longitude: cur.coords.longitude,
          });
          if (rev && rev[0]?.city) {
            setCity(rev[0].city);
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Location permission request note:', err);
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  // Haversine formula in kilometers
  const calculateDistance = (lat: number, lng: number, lat2?: number, lng2?: number): number | null => {
    let sourceLat = location ? location.latitude : null;
    let sourceLng = location ? location.longitude : null;
    let destLat = lat;
    let destLng = lng;

    if (lat2 !== undefined && lng2 !== undefined) {
      sourceLat = lat;
      sourceLng = lng;
      destLat = lat2;
      destLng = lng2;
    }

    if (sourceLat === null || sourceLng === null) return null;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(destLat - sourceLat);
    const dLon = toRad(destLng - sourceLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(sourceLat)) * Math.cos(toRad(destLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (lat: number, lng: number): string => {
    const d = calculateDistance(lat, lng);
    if (d === null) return 'Nearby';
    if (d < 1) return `${Math.round(d * 1000)} m`;
    return `${d.toFixed(1)} km`;
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        userLocation: location,
        city,
        setCity,
        hasPermission,
        requestPermission,
        calculateDistance,
        calculateDistanceKm: calculateDistance,
        formatDistance,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
