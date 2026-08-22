import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationContextType {
  userLocation: { latitude: number; longitude: number } | null;
  permissionGranted: boolean;
  permissionDenied: boolean;
  loadingLocation: boolean;
  requestLocation: () => Promise<void>;
  setManualLocation: (lat: number, lng: number, cityName?: string) => void;
  cityName: string;
}

const LocationContext = createContext<LocationContextType>({
  userLocation: null,
  permissionGranted: false,
  permissionDenied: false,
  loadingLocation: false,
  requestLocation: async () => {},
  setManualLocation: () => {},
  cityName: 'Select City',
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [cityName, setCityName] = useState<string>('Nearby');

  const requestLocation = async () => {
    setLoadingLocation(true);
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setPermissionDenied(true);
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPermissionGranted(true);
        setPermissionDenied(false);
        setLoadingLocation(false);
      },
      (error) => {
        console.warn('Geolocation denied or error:', error.message);
        setPermissionDenied(true);
        setPermissionGranted(false);
        setLoadingLocation(false);
        // Fallback default coordinates (e.g. Mumbai/Bangalore sports hub coordinate)
        setUserLocation({
          latitude: 19.0760,
          longitude: 72.8777,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    // Auto-prompt location on load
    requestLocation();
  }, []);

  const setManualLocation = (lat: number, lng: number, city?: string) => {
    setUserLocation({ latitude: lat, longitude: lng });
    setPermissionGranted(true);
    setPermissionDenied(false);
    if (city) setCityName(city);
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        permissionGranted,
        permissionDenied,
        loadingLocation,
        requestLocation,
        setManualLocation,
        cityName,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
