"use client";

// Performance monitoring and optimization utilities
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Performance measurement utilities
export const performance = {
  /**
   * Measure execution time of a function
   */
  measure: async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
    const start = window.performance.now();
    const result = await fn();
    const end = window.performance.now();

    // Send to analytics if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "timing_complete", {
        name,
        value: Math.round(end - start),
      });
    }

    return result;
  },

  /**
   * Mark performance points for complex operations
   */
  mark: (name: string) => {
    if (window?.performance?.mark) {
      window.performance.mark(name);
    }
  },

  /**
   * Measure between two marks
   */
  measureBetween: (name: string, startMark: string, endMark: string) => {
    if (window?.performance?.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
        const measures = window.performance.getEntriesByName(name, "measure");
        if (measures.length > 0) {
          const _duration = measures[measures.length - 1].duration;
        }
      } catch {
        console.warn("Performance measurement failed");
      }
    }
  },
};

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for limiting function calls
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [],
  );
}

// Memoization with size limit to prevent memory leaks
export function useMemoWithLimit<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  limit: number = 100,
): T {
  const cache = useRef<Map<string, { value: T; timestamp: number }>>(new Map());

  return useMemo(() => {
    const key = JSON.stringify(deps);
    const cached = cache.current.get(key);

    if (cached) {
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached.value;
    }

    const value = factory();

    // Cleanup old entries if limit exceeded
    if (cache.current.size >= limit) {
      const entries = Array.from(cache.current.entries());
      entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

      // Remove oldest entries
      const toRemove = entries.slice(0, Math.floor(limit * 0.3));
      toRemove.forEach(([key]) => cache.current.delete(key));
    }

    cache.current.set(key, { value, timestamp: Date.now() });
    return value;
  }, [factory, limit, deps]);
}

// Heavy computation hook with Web Workers support
export function useWebWorker<T, R>(
  workerScript: string,
  input: T,
  enabled: boolean = true,
): { result: R | null; loading: boolean; error: Error | null } {
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled || typeof Worker === "undefined") return;

    setLoading(true);
    setError(null);

    try {
      workerRef.current = new Worker(workerScript);

      workerRef.current.onmessage = (event) => {
        setResult(event.data);
        setLoading(false);
      };

      workerRef.current.onerror = () => {
        setError(new Error("Worker error"));
        setLoading(false);
      };

      workerRef.current.postMessage(input);
    } catch (err) {
      console.warn("WebWorker error:", err);
      setError(err as Error);
      setLoading(false);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [workerScript, input, enabled]);

  return { result, loading, error };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  const ref = useCallback((el: Element | null) => {
    setElement(el);
  }, []);

  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options]);

  return [ref, isIntersecting];
}

// Resource preloader for images, scripts, etc.
export const resourcePreloader = {
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },

  preloadScript: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  preloadCSS: (href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = reject;
      document.head.appendChild(link);
    });
  },
};

// Virtual scrolling utilities
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length,
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
}

// Bundle size analyzer for development
export const bundleAnalyzer = {
  analyzeComponent: (componentName: string, component: React.ComponentType) => {
    if (process.env.NODE_ENV === "development") {
      const componentString = component.toString();
      const size = new Blob([componentString]).size;

      // Warn if component is large
      if (size > 50 * 1024) {
        // 50KB
        console.warn(
          `⚠️  Component ${componentName} is large (${(size / 1024).toFixed(2)}KB). Consider code splitting.`,
        );
      }
    }
  },

  measureRenderTime: (componentName: string) => {
    return {
      start: () => performance.mark(`${componentName}-render-start`),
      end: () => {
        performance.mark(`${componentName}-render-end`);
        performance.measureBetween(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`,
        );
      },
    };
  },
};

// Memory usage monitoring
export const memoryMonitor = {
  getUsage: () => {
    if (typeof window !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };
    }
    return null;
  },

  logUsage: (_label?: string) => {
    const usage = memoryMonitor.getUsage();
    if (usage) {
    }
  },

  warnIfHigh: (threshold: number = 80) => {
    const usage = memoryMonitor.getUsage();
    if (usage && (usage.used / usage.limit) * 100 > threshold) {
      console.warn(
        `⚠️  High memory usage: ${usage.used}MB / ${usage.limit}MB (${((usage.used / usage.limit) * 100).toFixed(1)}%)`,
      );
    }
  },
};

// Performance budget enforcement
export const performanceBudget = {
  checkLoadTime: (threshold: number = 3000) => {
    if (window?.performance?.timing) {
      const loadTime =
        window.performance.timing.loadEventEnd -
        window.performance.timing.navigationStart;

      if (loadTime > threshold) {
        console.warn(
          `⚠️  Page load time (${loadTime}ms) exceeds budget (${threshold}ms)`,
        );
      } else {
      }

      return loadTime;
    }
    return null;
  },

  checkBundleSize: async (threshold: number = 250 * 1024) => {
    // 250KB
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection;
      if (
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g"
      ) {
        console.warn(
          "⚠️  Slow connection detected. Consider reducing bundle size.",
        );
      }
    }
    // Use threshold for future implementations
    return threshold;
  },
};

// Global performance configuration
export interface PerformanceConfig {
  enableMetrics: boolean;
  enableWarnings: boolean;
  memoryThreshold: number;
  renderTimeThreshold: number;
}

export const defaultPerformanceConfig: PerformanceConfig = {
  enableMetrics: process.env.NODE_ENV === "development",
  enableWarnings: true,
  memoryThreshold: 80,
  renderTimeThreshold: 16, // 60fps = 16ms per frame
};

let performanceConfig = defaultPerformanceConfig;

export const setPerformanceConfig = (config: Partial<PerformanceConfig>) => {
  performanceConfig = { ...performanceConfig, ...config };
};

export const getPerformanceConfig = () => performanceConfig;

// Export types
export type PerformanceMeasurement = {
  name: string;
  duration: number;
  timestamp: number;
};

export type VirtualScrollResult<T> = {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
};
