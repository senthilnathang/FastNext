import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import { apiUtils, type ApiError } from '@/lib/api/client'

// Generic hook for API queries with common patterns
export function useApiQuery<TData = unknown, TError = ApiError>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery({
    ...options,
    // Add default error handling
    onError: (error) => {
      console.error('Query error:', apiUtils.getErrorMessage(error))
      options.onError?.(error)
    },
  })
}

// Generic hook for API mutations with common patterns
export function useApiMutation<TData = unknown, TError = ApiError, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation({
    ...options,
    // Add default error handling
    onError: (error, variables, context) => {
      console.error('Mutation error:', apiUtils.getErrorMessage(error))
      options.onError?.(error, variables, context)
    },
  })
}

// Hook for paginated queries with common patterns
export function usePaginatedQuery<TData = unknown>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options?: Partial<UseQueryOptions<TData, ApiError>>
) {
  return useQuery({
    queryKey,
    queryFn,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    staleTime: 30 * 1000, // 30 seconds for paginated data
    ...options,
  })
}

// Hook for creating optimistic updates
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: any[]
    updater: (oldData: any, variables: TVariables) => any
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: ApiError, variables: TVariables, context: any) => void
  }
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(options.queryKey)
      
      // Optimistically update
      queryClient.setQueryData(options.queryKey, (old: any) => 
        options.updater(old, variables)
      )
      
      return { previousData }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData)
      }
      options.onError?.(error, variables, context)
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: options.queryKey })
    },
    onSuccess: options.onSuccess,
  })
}

// Hook for infinite queries (for load more functionality)
export function useInfiniteApiQuery<TData = unknown>(
  queryKey: any[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<TData>,
  options?: {
    getNextPageParam?: (lastPage: any, allPages: any[]) => number | undefined
    staleTime?: number
  }
) {
  const { useInfiniteQuery } = require('@tanstack/react-query')
  
  return useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: options?.getNextPageParam || ((lastPage: any) => {
      // Default pagination logic
      if (lastPage?.page < lastPage?.pages) {
        return lastPage.page + 1
      }
      return undefined
    }),
    staleTime: options?.staleTime || 60 * 1000, // 1 minute
  })
}

// Utility hooks for common cache operations
export function useCacheUtils() {
  const queryClient = useQueryClient()
  
  return {
    // Prefetch data
    prefetch: <TData>(queryKey: any[], queryFn: () => Promise<TData>) => {
      return queryClient.prefetchQuery({ queryKey, queryFn })
    },
    
    // Set cache data
    setCache: (queryKey: any[], data: any) => {
      queryClient.setQueryData(queryKey, data)
    },
    
    // Invalidate queries
    invalidate: (queryKey: any[]) => {
      queryClient.invalidateQueries({ queryKey })
    },
    
    // Remove from cache
    remove: (queryKey: any[]) => {
      queryClient.removeQueries({ queryKey })
    },
    
    // Clear all cache
    clearAll: () => {
      queryClient.clear()
    },
  }
}

// Hook for handling loading states across multiple queries
export function useLoadingStates(queries: Array<{ isLoading: boolean; error: any }>) {
  const isLoading = queries.some(q => q.isLoading)
  const hasError = queries.some(q => q.error)
  const errors = queries.filter(q => q.error).map(q => q.error)
  
  return {
    isLoading,
    hasError,
    errors,
    isReady: !isLoading && !hasError,
  }
}

// Export commonly used types
export type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'