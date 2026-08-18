import { createContext, useContext, useState, type ReactNode } from 'react';

interface LocationContextValue {
  selectedLocation: {
    label: string;
    lat: number;
    lng: number;
  };
  setLocation: (label: string, lat: number, lng: number) => void;
}

const defaultLocation = {
  label: 'San Francisco, CA',
  lat: 37.7749,
  lng: -122.4194,
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);

  const setLocation = (label: string, lat: number, lng: number) => {
    setSelectedLocation({ label, lat, lng });
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
