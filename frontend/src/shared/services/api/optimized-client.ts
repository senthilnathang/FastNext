"use client";

import { performance as perfUtils } from "@/shared/utils/performance";
// Enhanced API client with caching, retries, and optimization
import { type ApiError, type ApiResponse, apiClient } from "./client";

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
}

// Request configuration
interface OptimizedRequestConfig {
  cache?: boolean | CacheConfig;
  retry?:
    | boolean
    | {
        attempts: number;
        delay: number;
        exponentialBackoff?: boolean;
      };
  timeout?: number;
  priority?: "low" | "normal" | "high";
  deduplication?: boolean;
  measurement?: string; // Performance measurement label
}

// Cache entry structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  stale?: boolean;
}

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

// In-memory cache with LRU eviction
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Check if entry is expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, data: T, ttl: number): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      stale: false,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStale(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Mark as stale if expired but still return data
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      entry.stale = true;
    }

    return entry.data;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new LRUCache(200);

// Default configurations
const defaultCacheConfig: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  staleWhileRevalidate: true,
};

const defaultRetryConfig = {
  attempts: 3,
  delay: 1000,
  exponentialBackoff: true,
};

// Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  config: typeof defaultRetryConfig,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.attempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = config.exponentialBackoff
        ? config.delay * 2 ** (attempt - 1)
        : config.delay;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Generate cache key from request parameters
function generateCacheKey(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, any> },
): string {
  const { params, ...fetchOptions } = options || {};

  const keyParts = [
    endpoint,
    fetchOptions.method || "GET",
    JSON.stringify(params || {}),
    JSON.stringify(fetchOptions.body || {}),
  ];

  return keyParts.join("|");
}

// Enhanced API client with optimization features
export const optimizedApiClient = {
  async get<T = any>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, any> },
    config?: OptimizedRequestConfig,
  ): Promise<ApiResponse<T>> {
    const cacheKey = generateCacheKey(endpoint, options);
    const cacheConfig =
      typeof config?.cache === "object" ? config.cache : defaultCacheConfig;
    const retryConfig =
      typeof config?.retry === "object"
        ? {
            ...defaultRetryConfig,
            ...config.retry,
          }
        : defaultRetryConfig;

    // Check cache first
    if (config?.cache !== false) {
      const cachedData = globalCache.get(cacheKey);
      if (cachedData) {
        return cachedData as ApiResponse<T>;
      }

      // Stale-while-revalidate: return stale data while fetching fresh
      if (cacheConfig.staleWhileRevalidate) {
        const staleData = globalCache.getStale(cacheKey);
        if (staleData && globalCache.isStale(cacheKey)) {
          // Return stale data immediately and fetch fresh data in background
          optimizedApiClient
            .get(endpoint, options, { ...config, cache: cacheConfig })
            .then((freshData) => {
              globalCache.set(cacheKey, freshData, cacheConfig.ttl);
            })
            .catch(() => {
              // Keep stale data if fresh fetch fails
            });

          return staleData as ApiResponse<T>;
        }
      }
    }

    // Request deduplication
    if (config?.deduplication !== false) {
      const pendingKey = `${endpoint}|${JSON.stringify(options)}`;
      if (pendingRequests.has(pendingKey)) {
        return pendingRequests.get(pendingKey);
      }
    }

    // Create the request function
    const requestFn = async (): Promise<ApiResponse<T>> => {
      const measurementLabel = config?.measurement || `GET ${endpoint}`;

      return perfUtils.measure(measurementLabel, async () => {
        const response = await apiClient.get<T>(endpoint, options);

        // Cache successful responses
        if (
          config?.cache !== false &&
          response.status >= 200 &&
          response.status < 300
        ) {
          globalCache.set(cacheKey, response, cacheConfig.ttl);
        }

        return response;
      });
    };

    // Execute with retry if configured
    const promise =
      config?.retry !== false ? withRetry(requestFn, retryConfig) : requestFn();

    // Store pending request for deduplication
    if (config?.deduplication !== false) {
      const pendingKey = `${endpoint}|${JSON.stringify(options)}`;
      pendingRequests.set(pendingKey, promise);

      promise.finally(() => {
        pendingRequests.delete(pendingKey);
      });
    }

    return promise;
  },

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
    config?: OptimizedRequestConfig,
  ): Promise<ApiResponse<T>> {
    const retryConfig =
      typeof config?.retry === "object"
        ? {
            ...defaultRetryConfig,
            ...config.retry,
          }
        : defaultRetryConfig;

    const requestFn = async (): Promise<ApiResponse<T>> => {
      const measurementLabel = config?.measurement || `POST ${endpoint}`;

      return perfUtils.measure(measurementLabel, async () => {
        const response = await apiClient.post<T>(endpoint, data, options);

        // Invalidate related cache entries
        this.invalidateCache(endpoint);

        return response;
      });
    };

    return config?.retry !== false
      ? withRetry(requestFn, retryConfig)
      : requestFn();
  },

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
    config?: OptimizedRequestConfig,
  ): Promise<ApiResponse<T>> {
    const retryConfig =
      typeof config?.retry === "object"
        ? {
            ...defaultRetryConfig,
            ...config.retry,
          }
        : defaultRetryConfig;

    const requestFn = async (): Promise<ApiResponse<T>> => {
      const measurementLabel = config?.measurement || `PUT ${endpoint}`;

      return perfUtils.measure(measurementLabel, async () => {
        const response = await apiClient.put<T>(endpoint, data, options);

        // Invalidate related cache entries
        this.invalidateCache(endpoint);

        return response;
      });
    };

    return config?.retry !== false
      ? withRetry(requestFn, retryConfig)
      : requestFn();
  },

  async delete<T = any>(
    endpoint: string,
    options?: RequestInit & { data?: any },
    config?: OptimizedRequestConfig,
  ): Promise<ApiResponse<T>> {
    const retryConfig =
      typeof config?.retry === "object"
        ? {
            ...defaultRetryConfig,
            ...config.retry,
          }
        : defaultRetryConfig;

    const requestFn = async (): Promise<ApiResponse<T>> => {
      const measurementLabel = config?.measurement || `DELETE ${endpoint}`;

      return perfUtils.measure(measurementLabel, async () => {
        const response = await apiClient.delete<T>(endpoint, options);

        // Invalidate related cache entries
        this.invalidateCache(endpoint);

        return response;
      });
    };

    return config?.retry !== false
      ? withRetry(requestFn, retryConfig)
      : requestFn();
  },

  // Cache management methods
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      globalCache.clear();
      return;
    }

    // Simple pattern matching for cache invalidation
    const keys = Array.from((globalCache as any).cache.keys()) as string[];
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    });
  },

  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: globalCache.size(),
      maxSize: defaultCacheConfig.maxSize,
    };
  },

  // Preload data for better perceived performance
  async preload<T = any>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, any> },
    config?: OptimizedRequestConfig,
  ): Promise<void> {
    try {
      await this.get<T>(endpoint, options, {
        ...config,
        cache: config?.cache !== false ? defaultCacheConfig : false,
        priority: "low",
      });
    } catch (error) {
      // Preload failures should not affect the application
      console.warn("Preload failed:", endpoint, error);
    }
  },

  // Batch multiple requests
  async batch<T = any>(
    requests: Array<{
      endpoint: string;
      options?: RequestInit & { params?: Record<string, any> };
      config?: OptimizedRequestConfig;
    }>,
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, options, config }) =>
      this.get<T>(endpoint, options, config),
    );

    return Promise.all(promises);
  },
};

// React hook for optimized API calls
import { useCallback, useEffect, useState } from "react";

export function useOptimizedApiQuery<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, any> },
  config?: OptimizedRequestConfig & {
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const _optionsString = JSON.stringify(options);
  const _configString = JSON.stringify(config);

  const fetchData = useCallback(async () => {
    if (config?.enabled === false) return;

    try {
      setLoading(true);
      setError(null);

      const response = await optimizedApiClient.get<T>(
        endpoint,
        options,
        config,
      );
      setData(response.data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
     
  }, [endpoint, config, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus if enabled
  useEffect(() => {
    if (!config?.refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchData, config?.refetchOnWindowFocus]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate: () => optimizedApiClient.invalidateCache(endpoint),
  };
}

// Export types
export type { CacheConfig, OptimizedRequestConfig, CacheEntry };
