'use client';

/**
 * Online Status Hook
 *
 * Provides browser online/offline detection with callback support.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

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

// Callback-based online status hook options
export interface UseOnlineStatusWithCallbacksOptions {
  /** Callback when browser goes online */
  onOnline?: () => void;
  /** Callback when browser goes offline */
  onOffline?: () => void;
  /** Callback on any status change */
  onChange?: (isOnline: boolean) => void;
}

export interface UseOnlineStatusWithCallbacksReturn {
  /** Whether browser is online */
  isOnline: boolean;
  /** Whether browser is offline */
  isOffline: boolean;
  /** Time of last status change */
  lastChange: Date | null;
  /** Duration offline in milliseconds (0 if online) */
  offlineDuration: number;
  /** Number of times gone offline since mount */
  offlineCount: number;
}

/**
 * useOnlineStatusWithCallbacks hook
 *
 * Online status hook with callback support for online/offline events.
 *
 * @example
 * ```tsx
 * function NetworkStatus() {
 *   const { isOnline, offlineDuration } = useOnlineStatusWithCallbacks({
 *     onOnline: () => {
 *       toast.success('Back online!');
 *       syncPendingChanges();
 *     },
 *     onOffline: () => {
 *       toast.warning('You are offline');
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       Status: {isOnline ? 'Online' : `Offline for ${offlineDuration}ms`}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatusWithCallbacks(
  options: UseOnlineStatusWithCallbacksOptions = {},
): UseOnlineStatusWithCallbacksReturn {
  const { onOnline, onOffline, onChange } = options;

  const isOnline = useOnlineStatus();
  const [lastChange, setLastChange] = useState<Date | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(null);
  const [offlineDuration, setOfflineDuration] = useState(0);

  // Refs for callbacks to avoid stale closures
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);
  const onChangeRef = useRef(onChange);
  const previousOnlineRef = useRef<boolean | null>(null);

  // Update callback refs
  useEffect(() => {
    onOnlineRef.current = onOnline;
    onOfflineRef.current = onOffline;
    onChangeRef.current = onChange;
  }, [onOnline, onOffline, onChange]);

  // Handle status changes
  useEffect(() => {
    // Skip initial render
    if (previousOnlineRef.current === null) {
      previousOnlineRef.current = isOnline;
      return;
    }

    // Only trigger if status actually changed
    if (previousOnlineRef.current === isOnline) {
      return;
    }

    previousOnlineRef.current = isOnline;
    setLastChange(new Date());

    // Call callbacks
    onChangeRef.current?.(isOnline);

    if (isOnline) {
      // Going online
      onOnlineRef.current?.();

      // Calculate offline duration
      if (offlineStartTime) {
        setOfflineDuration(Date.now() - offlineStartTime);
        setOfflineStartTime(null);
      }
    } else {
      // Going offline
      onOfflineRef.current?.();
      setOfflineCount((count) => count + 1);
      setOfflineStartTime(Date.now());
      setOfflineDuration(0);
    }
  }, [isOnline, offlineStartTime]);

  // Update offline duration periodically while offline
  useEffect(() => {
    if (!isOnline && offlineStartTime) {
      const interval = setInterval(() => {
        setOfflineDuration(Date.now() - offlineStartTime);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOnline, offlineStartTime]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChange,
    offlineDuration,
    offlineCount,
  };
}

export default useOnlineStatus;
