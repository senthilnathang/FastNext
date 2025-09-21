import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG } from './config'

// Extended config interface for metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number
    requestId: string
  }
}

// Enhanced API Error types
export interface ApiError {
  message: string
  status: number
  code?: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface ApiErrorResponse {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
  code?: string
}

// Create enhanced API client
export const apiClient = axios.create({
  baseURL: API_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Enhanced request interceptor
apiClient.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    // Add auth token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request timestamp for logging
    config.metadata = { 
      startTime: Date.now(),
      requestId: Math.random().toString(36).substring(7)
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      requestId: config.metadata.requestId,
      headers: config.headers,
      data: config.data
    })

    return config
  },
  (error: AxiosError<ApiErrorResponse>) => {
    console.error('[API Request Error]', error)
    return Promise.reject(createApiError(error))
  }
)

// Enhanced response interceptor with comprehensive error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as ExtendedAxiosRequestConfig
    const duration = Date.now() - (config.metadata?.startTime || 0)
    
    console.log(`[API Response] ${response.status} ${config.method?.toUpperCase()} ${config.url}`, {
      requestId: config.metadata?.requestId,
      duration: `${duration}ms`,
      status: response.status
    })

    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as ExtendedAxiosRequestConfig
    const duration = config?.metadata ? Date.now() - config.metadata.startTime : 0

    console.error(`[API Error] ${error.response?.status} ${config?.method?.toUpperCase()} ${config?.url}`, {
      requestId: config?.metadata?.requestId,
      duration: `${duration}ms`,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    })

    // Handle specific HTTP status codes
    const status = error.response?.status
    if (status === 401) {
      await handleAuthError(error)
    } else if (status === 403) {
      handleForbiddenError(error)
    } else if (status && status >= 500) {
      handleServerError(error)
    }

    return Promise.reject(createApiError(error))
  }
)

// Create standardized API error
function createApiError(error: AxiosError<ApiErrorResponse>): ApiError {
  const response = error.response
  const data = response?.data

  return {
    message: getErrorMessage(data, error),
    status: response?.status || 0,
    code: data?.code || error.code,
    details: data?.errors || (data as Record<string, unknown>),
    timestamp: new Date().toISOString()
  }
}

// Extract user-friendly error message
function getErrorMessage(data: ApiErrorResponse | undefined, error: AxiosError): string {
  if (data?.detail) return data.detail
  if (data?.message) return data.message
  
  // Handle validation errors
  if (data?.errors) {
    const firstField = Object.keys(data.errors)[0]
    const firstError = data.errors[firstField]?.[0]
    if (firstError) return `${firstField}: ${firstError}`
  }

  // Fallback messages based on status
  const status = error.response?.status
  switch (status) {
    case 400: return 'Invalid request. Please check your input.'
    case 401: return 'Authentication required. Please log in.'
    case 403: return 'Access denied. You do not have permission for this action.'
    case 404: return 'Resource not found.'
    case 409: return 'Conflict. This action cannot be completed.'
    case 422: return 'Validation failed. Please check your input.'
    case 429: return 'Too many requests. Please try again later.'
    case 500: return 'Server error. Please try again later.'
    case 502: return 'Service temporarily unavailable.'
    case 503: return 'Service unavailable. Please try again later.'
    default: return error.message || 'An unexpected error occurred.'
  }
}

// Handle authentication errors
async function handleAuthError(error: AxiosError<ApiErrorResponse>) {
  console.warn('[Auth Error] Handling 401 response', error.response?.headers)
  
  // Check if auto-logout is requested by server
  const autoLogout = error.response?.headers['x-auto-logout']
  const authStatus = error.response?.headers['x-auth-status']
  
  if (autoLogout === 'true') {
    // Clear all auth data
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    
    // Store current path for redirect after login
    const currentPath = window.location.pathname
    if (currentPath !== '/login' && currentPath !== '/register') {
      sessionStorage.setItem('redirectAfterLogin', currentPath)
    }
    
    // Redirect with reason
    const reason = authStatus || 'session_expired'
    window.location.href = `/login?reason=${reason}`
  }
}

// Handle forbidden errors
function handleForbiddenError(error: AxiosError<ApiErrorResponse>) {
  console.warn('[Forbidden] Access denied:', error.response?.data)
  
  // Could show a toast notification or redirect to unauthorized page
  // For now, we'll let the component handle it
}

// Handle server errors
function handleServerError(error: AxiosError<ApiErrorResponse>) {
  console.error('[Server Error] Internal server error:', error.response?.data)
  
  // Could show a global error notification
  // For now, we'll let the component handle it
}

// Utility functions for common API patterns
export const apiUtils = {
  // Check if error is a specific type
  isApiError: (error: unknown): error is ApiError => {
    return error !== null && typeof error === 'object' && 'message' in error && 'status' in error
  },

  // Check if error is network related
  isNetworkError: (error: unknown): boolean => {
    const err = error as { code?: string; message?: string }
    return err?.code === 'ERR_NETWORK' || Boolean(err?.message?.includes('Network Error'))
  },

  // Check if error is timeout related
  isTimeoutError: (error: unknown): boolean => {
    const err = error as { code?: string; message?: string }
    return err?.code === 'ECONNABORTED' || Boolean(err?.message?.includes('timeout'))
  },

  // Get user-friendly error message
  getErrorMessage: (error: unknown): string => {
    if (apiUtils.isApiError(error)) {
      return error.message
    }
    if (apiUtils.isNetworkError(error)) {
      return 'Network connection failed. Please check your internet connection.'
    }
    if (apiUtils.isTimeoutError(error)) {
      return 'Request timed out. Please try again.'
    }
    return 'An unexpected error occurred. Please try again.'
  }
}

