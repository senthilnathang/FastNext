/**
 * Tests for useOnlineStatus hook
 */

import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, useOnlineStatusExtended } from '@/shared/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to online
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  test('returns true when online', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  test('returns false when offline', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  test('updates when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  test('updates when coming online', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  test('adds event listeners on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useOnlineStatus());

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  test('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  test('handles multiple status changes', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Go offline
    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    // Come online
    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);

    // Go offline again
    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  test('returns consistent value across re-renders', () => {
    const { result, rerender } = renderHook(() => useOnlineStatus());

    const firstValue = result.current;
    rerender();
    const secondValue = result.current;

    expect(firstValue).toBe(secondValue);
  });
});

describe('useOnlineStatusExtended', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  test('returns isOnline and isOffline correctly when online', () => {
    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  test('returns isOnline and isOffline correctly when offline', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  test('tracks lastChange when status changes', () => {
    const { result } = renderHook(() => useOnlineStatusExtended());

    const initialLastChange = result.current.lastChange;

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.lastChange?.getTime()).toBeGreaterThanOrEqual(
      initialLastChange?.getTime() || 0
    );
  });

  test('initializes lastChange on mount', () => {
    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.lastChange).toBeInstanceOf(Date);
  });

  test('updates all values when going offline', () => {
    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  test('updates all values when coming online', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  test('isOnline and isOffline are always opposite', () => {
    const { result } = renderHook(() => useOnlineStatusExtended());

    expect(result.current.isOnline).not.toBe(result.current.isOffline);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).not.toBe(result.current.isOffline);

    act(() => {
      Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).not.toBe(result.current.isOffline);
  });
});
