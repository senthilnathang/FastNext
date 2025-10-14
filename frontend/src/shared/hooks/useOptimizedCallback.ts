"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Enhanced useCallback that prevents unnecessary re-renders
 * by using a stable reference when dependencies haven't changed
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);

  // Check if dependencies have actually changed
  const depsChanged = useMemo(() => {
    if (depsRef.current.length !== deps.length) return true;
    return deps.some((dep, index) => !Object.is(dep, depsRef.current[index]));
  }, [deps]);

  if (depsChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback(
    (...args: Parameters<T>) => callbackRef.current(...args),
    [],
  ) as T;
}

/**
 * Memoized callback that only updates when specific dependencies change
 * Useful for preventing child re-renders in complex component trees
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: {
    // Deep compare dependencies (use sparingly, expensive operation)
    deepCompare?: boolean;
    // Debounce the callback execution
    debounce?: number;
    // Throttle the callback execution
    throttle?: number;
  } = {},
): T {
  const { deepCompare = false, debounce, throttle } = options;

  const callbackRef = useRef<T>(callback);
  const lastCallTime = useRef<number>(0);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Deep comparison utility
  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      return keysA.every((key) => deepEqual(a[key], b[key]));
    }

    return false;
  };

  // Check if dependencies changed
  const previousDeps = useRef<React.DependencyList>(deps);
  const depsChanged = useMemo(() => {
    if (previousDeps.current.length !== deps.length) return true;

    if (deepCompare) {
      return !deps.every((dep, index) =>
        deepEqual(dep, previousDeps.current[index]),
      );
    }

    return deps.some(
      (dep, index) => !Object.is(dep, previousDeps.current[index]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, deepCompare, deepEqual]);

  // Update callback if dependencies changed
  if (depsChanged) {
    callbackRef.current = callback;
    previousDeps.current = deps;
  }

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      // Handle throttling
      if (throttle && now - lastCallTime.current < throttle) {
        return;
      }

      // Handle debouncing
      if (debounce) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
          callbackRef.current(...args);
          lastCallTime.current = Date.now();
        }, debounce);

        return;
      }

      lastCallTime.current = now;
      return callbackRef.current(...args);
    }) as T,
    [],
  );
}

/**
 * Event handler optimization for form inputs
 * Prevents unnecessary re-renders by memoizing event handlers
 */
export function useOptimizedEventHandlers<T extends Record<string, any>>(
  handlers: T,
  deps: React.DependencyList = [],
): T {
  return useMemo(() => {
    const optimizedHandlers = {} as T;

    Object.keys(handlers).forEach((key) => {
      const handler = handlers[key];

      if (typeof handler === "function") {
        optimizedHandlers[key as keyof T] = handler;
      } else {
        optimizedHandlers[key as keyof T] = handler;
      }
    });

    return optimizedHandlers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers, ...deps]);
}

/**
 * Optimized ref callback that prevents unnecessary updates
 */
export function useStableRef<T>(initialValue?: T) {
  const ref = useRef<T | undefined>(initialValue);

  const setRef = useCallback((value: T | undefined) => {
    if (ref.current !== value) {
      ref.current = value;
    }
  }, []);

  return [ref, setRef] as const;
}

/**
 * Batched state updates to prevent multiple re-renders
 */
export function useBatchedUpdates<T extends Record<string, any>>(
  initialState: T,
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const updateTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    updateTimer.current = setTimeout(() => {
      setState((prevState) => ({ ...prevState, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }, 0);
  }, []);

  const flushUpdates = useCallback(() => {
    if (updateTimer.current) {
      clearTimeout(updateTimer.current);
    }

    if (Object.keys(pendingUpdates.current).length > 0) {
      setState((prevState) => ({ ...prevState, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }
  }, []);

  return [state, batchUpdate, flushUpdates];
}

/**
 * Memoized async function that prevents race conditions
 */
export function useAsyncCallback<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  deps: React.DependencyList,
): [(...args: T) => Promise<R | undefined>, boolean, Error | null, () => void] {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: T): Promise<R | undefined> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);

        if (mountedRef.current && !abortControllerRef.current.signal.aborted) {
          setLoading(false);
          return result;
        }
      } catch (err) {
        if (mountedRef.current && !abortControllerRef.current.signal.aborted) {
          setError(err as Error);
          setLoading(false);
        }
      }

      return undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn, ...deps],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setError(null);
  }, []);

  return [execute, loading, error, cancel];
}

/**
 * Optimized selector hook for complex state objects
 * Prevents unnecessary re-renders when unrelated state changes
 */
export function useSelector<T, R>(
  state: T,
  selector: (state: T) => R,
  equalityFn: (prev: R, next: R) => boolean = Object.is,
): R {
  const selectorRef = useRef<typeof selector>(selector);
  const stateRef = useRef<T>(state);
  const selectedValueRef = useRef<R | undefined>(undefined);

  // Update selector reference if it changed
  if (selectorRef.current !== selector) {
    selectorRef.current = selector;
  }

  // Only recompute if state actually changed
  const selectedValue = useMemo(() => {
    if (stateRef.current === state && selectedValueRef.current !== undefined) {
      return selectedValueRef.current;
    }

    const newValue = selectorRef.current(state);

    if (
      selectedValueRef.current !== undefined &&
      equalityFn(selectedValueRef.current, newValue)
    ) {
      return selectedValueRef.current;
    }

    stateRef.current = state;
    selectedValueRef.current = newValue;
    return newValue;
  }, [state, equalityFn]);

  return selectedValue;
}

// Type definitions
export type OptimizedCallbackOptions = {
  deepCompare?: boolean;
  debounce?: number;
  throttle?: number;
};

export type BatchedUpdateFunction<T> = (updates: Partial<T>) => void;
export type AsyncCallbackResult<T extends any[], R> = [
  (...args: T) => Promise<R | undefined>,
  boolean,
  Error | null,
  () => void,
];
