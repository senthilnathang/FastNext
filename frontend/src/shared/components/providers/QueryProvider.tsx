"use client"

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { apiUtils, type ApiError } from '@/shared/services/api/client'

// Global error handler for React Query
const handleGlobalError = (error: Error | ApiError) => {
  console.error('[Query Error]', error)

  // You could integrate with error tracking service here
  // e.g., Sentry.captureException(error)

  // Show user-friendly error messages for API errors
  if (apiUtils.isApiError(error)) {
    // You could show a toast notification here
    console.error('API Error:', apiUtils.getErrorMessage(error))
  }
}

// Create query client with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for this duration
      gcTime: 10 * 60 * 1000, // 10 minutes - unused data cached for this duration

      // Error handling
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (apiUtils.isApiError(error) && error.status && error.status >= 400 && error.status < 500) {
          return false
        }

        // Retry network/timeout errors up to 2 times
        if (apiUtils.isNetworkError(error) || apiUtils.isTimeoutError(error)) {
          return failureCount < 2
        }

        // Retry server errors once
        if (apiUtils.isApiError(error) && error.status && error.status >= 500) {
          return failureCount < 1
        }

        // Default retry behavior for other errors
        return failureCount < 1
      },

      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts

      // Error handling
      throwOnError: false, // Let components handle errors gracefully
    },
    mutations: {
      // Error handling for mutations
      retry: false, // Don't retry mutations by default
      onError: handleGlobalError,

      // Network error handling
      networkMode: 'online', // Only run when online
    },
  },

})

interface QueryProviderProps {
  children: React.ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}

// Export query client for use in other files (e.g., SSR, prefetching)
export { queryClient }
