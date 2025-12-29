'use client';

/**
 * Online Status Hook
 *
 * Provides browser online/offline detection.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

function getSnapshot(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerSnapshot(): boolean {
  return true;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * Hook to track browser online/offline status
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface UseOnlineStatusExtendedReturn {
  /** Whether browser is online */
  isOnline: boolean;
  /** Whether browser is offline */
  isOffline: boolean;
  /** Time since last status change */
  lastChange: Date | null;
}

/**
 * Extended online status hook with additional info
 */
export function useOnlineStatusExtended(): UseOnlineStatusExtendedReturn {
  const isOnline = useOnlineStatus();
  const [lastChange, setLastChange] = useState<Date | null>(null);

  useEffect(() => {
    setLastChange(new Date());
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChange,
  };
}

export default useOnlineStatus;
