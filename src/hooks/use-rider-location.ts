import { useState, useRef } from 'react';
import { useRTDB, useUser } from '@/firebase';
import { ref, update, onDisconnect, set } from 'firebase/database';

export function useRiderLocation() {
  const rtdb = useRTDB();
  const { user } = useUser();
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState<'off' | 'on' | 'denied' | 'unavailable'>('off');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const watchId = useRef<number | null>(null);

  const startSharing = () => {
    if (!user) return;
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    
    setIsSharing(true);
    setStatus('on');

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const locationRef = ref(rtdb, `riderLocations/${user.uid}`);
        set(locationRef, {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          timestamp: Date.now(),
          sharing: true,
          lastUpdated: Date.now()
        });
        setLastUpdated(new Date());
      },
      (error) => {
        console.error("Geolocation error:", error);
        setStatus('denied');
        setIsSharing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Handle disconnect - update sharing status when rider closes browser
    const locationRef = ref(rtdb, `riderLocations/${user.uid}`);
    onDisconnect(locationRef).update({ sharing: false });
  };

  const stopSharing = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    if (user) {
      const locationRef = ref(rtdb, `riderLocations/${user.uid}`);
      update(locationRef, { sharing: false });
    }
    setIsSharing(false);
    setStatus('off');
  };

  return { isSharing, status, lastUpdated, startSharing, stopSharing };
}
