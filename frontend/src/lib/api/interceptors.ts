/**
 * Request/Response Interceptors
 * Handles cross-cutting concerns for API requests
 */

import { getCompanyId } from "./multitenancy";

// Constants
export const COMPANY_HEADER = "X-Company-ID";
export const REQUEST_ID_HEADER = "X-Request-ID";

// Rate limit retry configuration
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;

/**
 * Generate a UUID v4 for request tracing
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * XSS sanitization patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
];

/**
 * Sanitize a string value for XSS protection
 */
export function sanitizeString(value: string): string {
  let sanitized = value;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  return sanitized;
}

/**
 * Deep sanitize an object for XSS protection
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return sanitizeString(data) as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item)) as T;
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized as T;
  }

  return data;
}

/**
 * Request interceptor configuration
 */
export interface RequestInterceptorConfig {
  addCompanyHeader?: boolean;
  addRequestId?: boolean;
  sanitizeRequestData?: boolean;
}

/**
 * Apply request interceptors to headers and data
 */
export function applyRequestInterceptors(
  headers: HeadersInit,
  data?: unknown,
  config: RequestInterceptorConfig = {}
): { headers: HeadersInit; data: unknown } {
  const {
    addCompanyHeader = true,
    addRequestId = true,
    sanitizeRequestData = true,
  } = config;

  const newHeaders: Record<string, string> = { ...headers } as Record<string, string>;

  // Add company header for multi-tenancy
  if (addCompanyHeader) {
    const companyId = getCompanyId();
    if (companyId) {
      newHeaders[COMPANY_HEADER] = companyId;
    }
  }

  // Add request ID for tracing
  if (addRequestId) {
    newHeaders[REQUEST_ID_HEADER] = generateRequestId();
  }

  // Sanitize request data for XSS protection
  let processedData = data;
  if (sanitizeRequestData && data) {
    processedData = sanitizeData(data);
  }

  return { headers: newHeaders, data: processedData };
}

/**
 * Token storage keys
 */
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * Get stored tokens
 */
function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  try {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

/**
 * Set access token
 */
function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all tokens
 */
function clearTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Token refresh state to prevent multiple simultaneous refreshes
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const { refreshToken } = getTokens();
  if (!refreshToken) {
    return null;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.access_token;

      if (newAccessToken) {
        setAccessToken(newAccessToken);
        return newAccessToken;
      }

      return null;
    } catch {
      clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Response interceptor result
 */
export interface ResponseInterceptorResult {
  shouldRetry: boolean;
  retryDelay?: number;
  newHeaders?: HeadersInit;
  redirectToLogin?: boolean;
}

/**
 * Handle rate limit (429) response with exponential backoff
 */
export function handleRateLimit(
  response: Response,
  retryCount: number = 0
): ResponseInterceptorResult {
  if (response.status !== 429) {
    return { shouldRetry: false };
  }

  if (retryCount >= RATE_LIMIT_MAX_RETRIES) {
    return { shouldRetry: false };
  }

  // Check for Retry-After header
  const retryAfter = response.headers.get("Retry-After");
  let delayMs: number;

  if (retryAfter) {
    // Retry-After can be seconds or a date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      delayMs = seconds * 1000;
    } else {
      const date = new Date(retryAfter);
      delayMs = Math.max(0, date.getTime() - Date.now());
    }
  } else {
    // Exponential backoff
    delayMs = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, retryCount);
  }

  return {
    shouldRetry: true,
    retryDelay: delayMs,
  };
}

/**
 * Handle 401 unauthorized response with token refresh
 */
export async function handleUnauthorized(
  response: Response,
  baseUrl: string,
  originalHeaders: HeadersInit,
  hasTriedRefresh: boolean = false
): Promise<ResponseInterceptorResult> {
  if (response.status !== 401) {
    return { shouldRetry: false };
  }

  // Don't retry if we've already tried to refresh
  if (hasTriedRefresh) {
    clearTokens();
    return { shouldRetry: false, redirectToLogin: true };
  }

  // Attempt token refresh
  const newAccessToken = await refreshAccessToken(baseUrl);

  if (!newAccessToken) {
    return { shouldRetry: false, redirectToLogin: true };
  }

  // Update headers with new token
  const newHeaders: Record<string, string> = { ...originalHeaders } as Record<string, string>;
  newHeaders["Authorization"] = `Bearer ${newAccessToken}`;

  return {
    shouldRetry: true,
    newHeaders,
  };
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a fetch request with interceptors and retry logic
 */
export async function fetchWithInterceptors(
  url: string,
  options: RequestInit,
  config: {
    baseUrl: string;
    interceptorConfig?: RequestInterceptorConfig;
    maxRetries?: number;
  }
): Promise<Response> {
  const { baseUrl, interceptorConfig, maxRetries = RATE_LIMIT_MAX_RETRIES } = config;

  // Apply request interceptors
  const { headers, data } = applyRequestInterceptors(
    options.headers || {},
    options.body ? JSON.parse(options.body as string) : undefined,
    interceptorConfig
  );

  let currentHeaders = headers;
  let retryCount = 0;
  let hasTriedRefresh = false;

  while (true) {
    const response = await fetch(url, {
      ...options,
      headers: currentHeaders,
      body: data ? JSON.stringify(data) : options.body,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const rateLimitResult = handleRateLimit(response, retryCount);
      if (rateLimitResult.shouldRetry && retryCount < maxRetries) {
        await sleep(rateLimitResult.retryDelay || RATE_LIMIT_BASE_DELAY_MS);
        retryCount++;
        continue;
      }
    }

    // Handle unauthorized
    if (response.status === 401) {
      const authResult = await handleUnauthorized(
        response,
        baseUrl,
        currentHeaders,
        hasTriedRefresh
      );

      if (authResult.shouldRetry && authResult.newHeaders) {
        currentHeaders = authResult.newHeaders;
        hasTriedRefresh = true;
        continue;
      }

      if (authResult.redirectToLogin && typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return response;
  }
}

export default {
  generateRequestId,
  sanitizeString,
  sanitizeData,
  applyRequestInterceptors,
  handleRateLimit,
  handleUnauthorized,
  fetchWithInterceptors,
  sleep,
  COMPANY_HEADER,
  REQUEST_ID_HEADER,
};
