/**
 * Tests for useIdleDetection hook
 *
 * Note: This test file creates tests for a useIdleDetection hook that
 * detects user inactivity based on events like mouse movement and key presses.
 */

import { jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useIdleDetection hook implementation
interface UseIdleDetectionOptions {
  timeout?: number; // milliseconds
  onIdle?: () => void;
  onActive?: () => void;
  events?: string[];
}

interface UseIdleDetectionReturn {
  isIdle: boolean;
  lastActivity: Date;
  reset: () => void;
}

function useIdleDetection(
  options: UseIdleDetectionOptions = {}
): UseIdleDetectionReturn {
  const {
    timeout = 30000,
    onIdle,
    onActive,
    events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'],
  } = options;

  const [isIdle, setIsIdle] = React.useState(false);
  const [lastActivity, setLastActivity] = React.useState(new Date());
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetTimer = React.useCallback(() => {
    setLastActivity(new Date());

    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, timeout);
  }, [isIdle, timeout, onIdle, onActive]);

  const reset = React.useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  React.useEffect(() => {
    // Start the timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [events, resetTimer]);

  return {
    isIdle,
    lastActivity,
    reset,
  };
}

describe('useIdleDetection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('initializes with isIdle as false', () => {
    const { result } = renderHook(() => useIdleDetection());

    expect(result.current.isIdle).toBe(false);
  });

  test('initializes lastActivity with current date', () => {
    const before = new Date();
    const { result } = renderHook(() => useIdleDetection());
    const after = new Date();

    expect(result.current.lastActivity.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.current.lastActivity.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('sets isIdle to true after timeout', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    expect(result.current.isIdle).toBe(false);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isIdle).toBe(true);
  });

  test('calls onIdle callback when idle', () => {
    const onIdle = jest.fn();
    renderHook(() => useIdleDetection({ timeout: 5000, onIdle }));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onIdle).toHaveBeenCalled();
  });

  test('resets timer on user activity', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);

    // Simulate user activity
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isIdle).toBe(true);
  });

  test('calls onActive callback when returning from idle', () => {
    const onActive = jest.fn();
    const onIdle = jest.fn();
    renderHook(() => useIdleDetection({ timeout: 5000, onIdle, onActive }));

    // Go idle
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onIdle).toHaveBeenCalled();

    // Become active
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(onActive).toHaveBeenCalled();
  });

  test('updates lastActivity on user activity', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    const initialActivity = result.current.lastActivity;

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(result.current.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
  });

  test('listens to default events', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useIdleDetection());

    const expectedEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    expectedEvents.forEach((event) => {
      expect(addEventListenerSpy).toHaveBeenCalledWith(event, expect.any(Function), { passive: true });
    });
  });

  test('listens to custom events when provided', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useIdleDetection({ events: ['click', 'wheel'] }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: true });
  });

  test('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIdleDetection());

    unmount();

    const expectedEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    expectedEvents.forEach((event) => {
      expect(removeEventListenerSpy).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });

  test('clears timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test('resets timer when reset is called', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('uses default timeout of 30 seconds', () => {
    const onIdle = jest.fn();
    renderHook(() => useIdleDetection({ onIdle }));

    act(() => {
      jest.advanceTimersByTime(29999);
    });

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(onIdle).toHaveBeenCalled();
  });

  test('handles keydown events', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('handles mousedown events', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'));
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('handles touchstart events', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      window.dispatchEvent(new TouchEvent('touchstart'));
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('handles scroll events', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('does not call onActive before going idle first', () => {
    const onActive = jest.fn();
    renderHook(() => useIdleDetection({ timeout: 5000, onActive }));

    // Activity before idle
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(onActive).not.toHaveBeenCalled();
  });

  test('handles rapid activity events', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 5000 }));

    // Rapid events
    for (let i = 0; i < 10; i++) {
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(100);
      });
    }

    expect(result.current.isIdle).toBe(false);

    // Now wait for timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isIdle).toBe(true);
  });
});
