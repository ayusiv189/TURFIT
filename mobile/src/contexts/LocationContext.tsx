import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  location: Coordinates | null;
  city: string;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  calculateDistance: (lat: number, lng: number) => number | null;
  formatDistance: (lat: number, lng: number) => string;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  city: 'Mumbai',
  hasPermission: false,
  requestPermission: async () => {},
  calculateDistance: () => null,
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
  const calculateDistance = (lat: number, lng: number): number | null => {
    if (!location) return null;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat - location.latitude);
    const dLon = toRad(lng - location.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(location.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
        city,
        hasPermission,
        requestPermission,
        calculateDistance,
        formatDistance,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
