'use client';

/**
 * Idle Detection Hook
 *
 * Provides idle timeout detection with configurable timeout,
 * callbacks for idle/active states, and automatic reset on user activity.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Activity events to monitor
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'touchmove',
  'wheel',
  'resize',
  'visibilitychange',
];

// Hook options
export interface UseIdleDetectionOptions {
  /** Timeout in milliseconds before user is considered idle (default: 5 minutes) */
  timeout?: number;
  /** Callback when user becomes idle */
  onIdle?: () => void;
  /** Callback when user becomes active after being idle */
  onActive?: () => void;
  /** Callback with remaining time before idle (called every second) */
  onCountdown?: (remainingMs: number) => void;
  /** Custom events to monitor for activity */
  events?: (keyof WindowEventMap)[];
  /** Whether to start monitoring immediately (default: true) */
  enabled?: boolean;
  /** Whether to trigger onIdle immediately if tab is hidden */
  idleOnHidden?: boolean;
  /** Throttle activity events in ms (default: 500ms) */
  throttleMs?: number;
}

// Hook return type
export interface UseIdleDetectionReturn {
  /** Whether user is currently idle */
  isIdle: boolean;
  /** Time remaining until idle in milliseconds */
  remainingTime: number;
  /** Last activity timestamp */
  lastActiveAt: Date | null;
  /** Manually reset the idle timer */
  reset: () => void;
  /** Start monitoring for idle */
  start: () => void;
  /** Stop monitoring for idle */
  stop: () => void;
  /** Whether monitoring is active */
  isMonitoring: boolean;
}

/**
 * useIdleDetection hook
 *
 * Detects user idle state based on activity events.
 *
 * @example
 * ```tsx
 * function SessionManager() {
 *   const { isIdle, remainingTime, reset } = useIdleDetection({
 *     timeout: 5 * 60 * 1000, // 5 minutes
 *     onIdle: () => {
 *       console.log('User is idle, show warning');
 *     },
 *     onActive: () => {
 *       console.log('User is active again');
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       {isIdle ? (
 *         <IdleWarning onContinue={reset} />
 *       ) : (
 *         <span>Session active: {Math.ceil(remainingTime / 1000)}s remaining</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIdleDetection(
  options: UseIdleDetectionOptions = {},
): UseIdleDetectionReturn {
  const {
    timeout = 5 * 60 * 1000, // 5 minutes default
    onIdle,
    onActive,
    onCountdown,
    events = ACTIVITY_EVENTS,
    enabled = true,
    idleOnHidden = false,
    throttleMs = 500,
  } = options;

  // State
  const [isIdle, setIsIdle] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(timeout);

  // Refs for callbacks to avoid stale closures
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const onCountdownRef = useRef(onCountdown);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);

  // Update refs
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
    onCountdownRef.current = onCountdown;
  }, [onIdle, onActive, onCountdown]);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Start idle timer
  const startIdleTimer = useCallback(() => {
    clearTimers();

    lastActivityRef.current = Date.now();
    setRemainingTime(timeout);

    // Set idle timer
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdleRef.current?.();
    }, timeout);

    // Start countdown timer for remaining time updates
    if (onCountdownRef.current) {
      countdownTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, timeout - elapsed);
        setRemainingTime(remaining);
        onCountdownRef.current?.(remaining);
      }, 1000);
    }
  }, [timeout, clearTimers]);

  // Handle activity
  const handleActivity = useCallback(() => {
    // Throttle activity events
    const now = Date.now();
    if (now - throttleRef.current < throttleMs) {
      return;
    }
    throttleRef.current = now;

    const wasIdle = isIdle;
    setLastActiveAt(new Date());

    if (wasIdle) {
      setIsIdle(false);
      onActiveRef.current?.();
    }

    startIdleTimer();
  }, [isIdle, throttleMs, startIdleTimer]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && idleOnHidden) {
      clearTimers();
      setIsIdle(true);
      onIdleRef.current?.();
    } else if (!document.hidden) {
      handleActivity();
    }
  }, [idleOnHidden, clearTimers, handleActivity]);

  // Start monitoring
  const start = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsMonitoring(true);
    setLastActiveAt(new Date());
    startIdleTimer();

    // Add event listeners
    events.forEach((event) => {
      if (event === 'visibilitychange') {
        document.addEventListener(event, handleVisibilityChange);
      } else {
        window.addEventListener(event, handleActivity, { passive: true });
      }
    });
  }, [events, startIdleTimer, handleActivity, handleVisibilityChange]);

  // Stop monitoring
  const stop = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsMonitoring(false);
    clearTimers();

    // Remove event listeners
    events.forEach((event) => {
      if (event === 'visibilitychange') {
        document.removeEventListener(event, handleVisibilityChange);
      } else {
        window.removeEventListener(event, handleActivity);
      }
    });
  }, [events, clearTimers, handleActivity, handleVisibilityChange]);

  // Reset idle state
  const reset = useCallback(() => {
    setIsIdle(false);
    setLastActiveAt(new Date());
    startIdleTimer();
  }, [startIdleTimer]);

  // Effect to start/stop monitoring based on enabled prop
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isIdle,
    remainingTime,
    lastActiveAt,
    reset,
    start,
    stop,
    isMonitoring,
  };
}

/**
 * useIdleLogout hook
 *
 * Specialized hook for auto-logout after idle timeout.
 *
 * @example
 * ```tsx
 * function App() {
 *   useIdleLogout({
 *     timeout: 15 * 60 * 1000, // 15 minutes
 *     warningTime: 60 * 1000, // Show warning 1 minute before logout
 *     onLogout: () => {
 *       authService.logout();
 *       router.push('/login');
 *     },
 *   });
 *
 *   return <MainContent />;
 * }
 * ```
 */
export interface UseIdleLogoutOptions {
  /** Total idle timeout before logout (default: 15 minutes) */
  timeout?: number;
  /** Time before logout to show warning (default: 60 seconds) */
  warningTime?: number;
  /** Callback when user should be logged out */
  onLogout: () => void;
  /** Callback when warning should be shown */
  onWarning?: () => void;
  /** Callback when warning is dismissed */
  onWarningDismissed?: () => void;
  /** Whether idle logout is enabled (default: true) */
  enabled?: boolean;
}

export interface UseIdleLogoutReturn {
  /** Whether warning should be shown */
  showWarning: boolean;
  /** Time remaining until logout in milliseconds */
  remainingTime: number;
  /** Dismiss warning and reset timer */
  dismissWarning: () => void;
  /** Whether user is idle */
  isIdle: boolean;
}

export function useIdleLogout(options: UseIdleLogoutOptions): UseIdleLogoutReturn {
  const {
    timeout = 15 * 60 * 1000, // 15 minutes
    warningTime = 60 * 1000, // 1 minute before logout
    onLogout,
    onWarning,
    onWarningDismissed,
    enabled = true,
  } = options;

  const [showWarning, setShowWarning] = useState(false);
  const warningShownRef = useRef(false);
  const onLogoutRef = useRef(onLogout);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onLogoutRef.current = onLogout;
    onWarningRef.current = onWarning;
  }, [onLogout, onWarning]);

  const handleIdle = useCallback(() => {
    onLogoutRef.current();
  }, []);

  const handleCountdown = useCallback(
    (remainingMs: number) => {
      if (remainingMs <= warningTime && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowWarning(true);
        onWarningRef.current?.();
      }
    },
    [warningTime],
  );

  const { isIdle, remainingTime, reset } = useIdleDetection({
    timeout,
    onIdle: handleIdle,
    onCountdown: handleCountdown,
    enabled,
  });

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    warningShownRef.current = false;
    reset();
    onWarningDismissed?.();
  }, [reset, onWarningDismissed]);

  // Reset warning state when user becomes active
  useEffect(() => {
    if (!isIdle && remainingTime > warningTime) {
      setShowWarning(false);
      warningShownRef.current = false;
    }
  }, [isIdle, remainingTime, warningTime]);

  return {
    showWarning,
    remainingTime,
    dismissWarning,
    isIdle,
  };
}

export default useIdleDetection;
