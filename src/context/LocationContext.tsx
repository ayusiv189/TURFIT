import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateDistanceKm } from '../lib/utils';

export interface CityOption {
  name: string;
  state?: string;
  latitude: number;
  longitude: number;
  popular?: boolean;
}

export const POPULAR_CITIES: CityOption[] = [
  { name: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, popular: true },
  { name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, popular: true },
  { name: 'Delhi NCR', state: 'Delhi', latitude: 28.6139, longitude: 77.2090, popular: true },
  { name: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, popular: true },
  { name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, popular: true },
  { name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, popular: true },
  { name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, popular: true },
  { name: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714, popular: true },
  { name: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, popular: true },
  { name: 'Chandigarh', state: 'Punjab', latitude: 30.7333, longitude: 76.7794, popular: true },
  { name: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673, popular: true },
  { name: 'Goa', state: 'Goa', latitude: 15.2993, longitude: 74.1240, popular: true },
  { name: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
  { name: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311 },
  { name: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185 },
];

export const CITY_COORDINATES_MAP: Record<string, { latitude: number; longitude: number }> = {
  mumbai: { latitude: 19.0760, longitude: 72.8777 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  'delhi ncr': { latitude: 28.6139, longitude: 77.2090 },
  delhi: { latitude: 28.6139, longitude: 77.2090 },
  'new delhi': { latitude: 28.6139, longitude: 77.2090 },
  noida: { latitude: 28.5355, longitude: 77.3910 },
  gurgaon: { latitude: 28.4595, longitude: 77.0266 },
  gurugram: { latitude: 28.4595, longitude: 77.0266 },
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  kolkata: { latitude: 22.5726, longitude: 88.3639 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  chandigarh: { latitude: 30.7333, longitude: 76.7794 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  cochin: { latitude: 9.9312, longitude: 76.2673 },
  goa: { latitude: 15.2993, longitude: 74.1240 },
  indore: { latitude: 22.7196, longitude: 75.8577 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  coimbatore: { latitude: 11.0168, longitude: 76.9558 },
  surat: { latitude: 21.1702, longitude: 72.8311 },
  nagpur: { latitude: 21.1458, longitude: 79.0882 },
  bhopal: { latitude: 23.2599, longitude: 77.4126 },
  visakhapatnam: { latitude: 17.6868, longitude: 83.2185 },
  vizag: { latitude: 17.6868, longitude: 83.2185 },
};

interface LocationContextType {
  userLocation: { latitude: number; longitude: number } | null;
  permissionGranted: boolean;
  permissionDenied: boolean;
  loadingLocation: boolean;
  requestLocation: () => Promise<void>;
  setManualLocation: (lat: number, lng: number, cityName?: string) => void;
  cityName: string;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isCityModalOpen: boolean;
  openCityModal: () => void;
  closeCityModal: () => void;
  calculateDistanceKm: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

const LocationContext = createContext<LocationContextType>({
  userLocation: null,
  permissionGranted: false,
  permissionDenied: false,
  loadingLocation: false,
  requestLocation: async () => {},
  setManualLocation: () => {},
  cityName: 'Mumbai',
  selectedCity: 'Mumbai',
  setSelectedCity: () => {},
  isCityModalOpen: false,
  openCityModal: () => {},
  closeCityModal: () => {},
  calculateDistanceKm,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    return { latitude: 19.0760, longitude: 72.8777 };
  });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  
  // Initialize city from localStorage or default
  const [selectedCity, setSelectedCityState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('turfit_selected_city');
      if (saved && saved.trim()) return saved.trim();
    } catch {
      // ignore storage error
    }
    return 'Mumbai';
  });

  const [cityName, setCityName] = useState<string>(selectedCity);
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);

  const openCityModal = () => setIsCityModalOpen(true);
  const closeCityModal = () => setIsCityModalOpen(false);

  const setSelectedCity = (city: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    setSelectedCityState(trimmed);
    setCityName(trimmed);
    try {
      localStorage.setItem('turfit_selected_city', trimmed);
    } catch {
      // ignore
    }

    // Automatically update coordinates to city center if available
    const key = trimmed.toLowerCase();
    const coords = CITY_COORDINATES_MAP[key];
    if (coords) {
      setUserLocation(coords);
    }
  };

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
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lng });
        setPermissionGranted(true);
        setPermissionDenied(false);
        setLoadingLocation(false);

        // Find nearest city from known list
        let nearestCity = selectedCity;
        let minDistance = Infinity;
        for (const c of POPULAR_CITIES) {
          const d = calculateDistanceKm(lat, lng, c.latitude, c.longitude);
          if (d < minDistance) {
            minDistance = d;
            nearestCity = c.name;
          }
        }
        if (minDistance < 60) {
          setSelectedCityState(nearestCity);
          setCityName(nearestCity);
          try {
            localStorage.setItem('turfit_selected_city', nearestCity);
          } catch {
            // ignore
          }
        }
      },
      (error) => {
        console.warn('Geolocation denied or error:', error.message);
        setPermissionDenied(true);
        setPermissionGranted(false);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    // Check if user previously saved a city
    try {
      const saved = localStorage.getItem('turfit_selected_city');
      if (saved && saved.trim()) {
        setSelectedCityState(saved.trim());
        setCityName(saved.trim());
        const key = saved.trim().toLowerCase();
        if (CITY_COORDINATES_MAP[key]) {
          setUserLocation(CITY_COORDINATES_MAP[key]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setManualLocation = (lat: number, lng: number, city?: string) => {
    setUserLocation({ latitude: lat, longitude: lng });
    setPermissionGranted(true);
    setPermissionDenied(false);
    if (city) {
      setSelectedCity(city);
    }
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
        selectedCity,
        setSelectedCity,
        isCityModalOpen,
        openCityModal,
        closeCityModal,
        calculateDistanceKm,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

