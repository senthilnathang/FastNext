// API Client with enhanced error handling
import { API_CONFIG, getApiUrl, getAuthHeaders } from "./config";

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Enhanced fetch wrapper with error handling
const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  const url = getApiUrl(endpoint);
  const defaultHeaders = getAuthHeaders();

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Add timeout
    signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
  };

  try {
    const response = await fetch(url, config);

    // Clone response to read body multiple times if needed
    const responseClone = response.clone();

    let data: T;
    try {
      data = await response.json();
    } catch {
      // If JSON parsing fails, try text
      data = (await responseClone.text()) as unknown as T;
    }

    if (!response.ok) {
      const error: ApiError = new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;
      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    if (error instanceof Error) {
      // Network or timeout errors
      if (error.name === "AbortError") {
        const timeoutError: ApiError = new Error("Request timeout");
        timeoutError.status = 408;
        throw timeoutError;
      }

      // Re-throw API errors as-is
      if ("status" in error) {
        throw error;
      }

      // Wrap other errors
      const networkError: ApiError = new Error(
        `Network error: ${error.message}`,
      );
      networkError.status = 0;
      throw networkError;
    }

    throw error;
  }
};

// HTTP method helpers
export const apiClient = {
  get: <T = any>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, any> },
  ): Promise<ApiResponse<T>> => {
    const { params, ...fetchOptions } = options || {};
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    return apiFetch<T>(url, { ...fetchOptions, method: "GET" });
  },

  post: <T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(
    endpoint: string,
    options?: RequestInit & { data?: any },
  ): Promise<ApiResponse<T>> => {
    const { data, ...fetchOptions } = options || {};
    return apiFetch<T>(endpoint, {
      ...fetchOptions,
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

// Utility functions for error handling
export const apiUtils = {
  isApiError: (error: any): error is ApiError => {
    return error instanceof Error && "status" in error;
  },

  isNetworkError: (error: any): boolean => {
    return apiUtils.isApiError(error) && (error.status === 0 || !error.status);
  },

  isTimeoutError: (error: any): boolean => {
    return apiUtils.isApiError(error) && error.status === 408;
  },

  isAuthError: (error: any): boolean => {
    return apiUtils.isApiError(error) && error.status === 401;
  },

  isForbiddenError: (error: any): boolean => {
    return apiUtils.isApiError(error) && error.status === 403;
  },

  isNotFoundError: (error: any): boolean => {
    return apiUtils.isApiError(error) && error.status === 404;
  },

  isServerError: (error: any): boolean => {
    return (
      apiUtils.isApiError(error) &&
      typeof error.status === "number" &&
      error.status >= 500
    );
  },

  getErrorMessage: (error: any): string => {
    if (apiUtils.isApiError(error)) {
      if (error.data?.detail) return error.data.detail;
      if (error.data?.message) return error.data.message;
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "An unexpected error occurred";
  },
};
