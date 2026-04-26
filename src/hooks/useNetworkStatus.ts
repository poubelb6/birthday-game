import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then(s => setIsOnline(s.connected));
      let removeFn: (() => void) | undefined;
      Network.addListener('networkStatusChange', s => setIsOnline(s.connected))
        .then(h => { removeFn = () => h.remove(); });
      return () => removeFn?.();
    } else {
      setIsOnline(navigator.onLine);
      const on  = () => setIsOnline(true);
      const off = () => setIsOnline(false);
      window.addEventListener('online',  on);
      window.addEventListener('offline', off);
      return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }
  }, []);

  return isOnline;
}
