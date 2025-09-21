import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import { type ApiError } from '@/shared/services/api/client'

// Generic hook for API queries with common patterns
export function useApiQuery<TData = unknown, TError = ApiError>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery({
    ...options,
  })
}

// Generic hook for API mutations with common patterns
export function useApiMutation<TData = unknown, TError = ApiError, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation({
    ...options,
  })
}

// Hook for paginated queries with common patterns
export function usePaginatedQuery<TData = unknown>(
  queryKey: unknown[],
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
    queryKey: unknown[]
    updater: (oldData: unknown, variables: TVariables) => unknown
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables, context: unknown) => void
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
      queryClient.setQueryData(options.queryKey, (old: unknown) => 
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
  queryKey: unknown[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<TData>,
  options?: {
    getNextPageParam?: (lastPage: unknown, allPages: unknown[]) => number | undefined
    staleTime?: number
  }
) {
  
  return useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: 1,
    getNextPageParam: options?.getNextPageParam || ((lastPage: unknown) => {
      // Default pagination logic
      const page = lastPage as { page?: number; pages?: number }
      if (page?.page && page?.pages && page.page < page.pages) {
        return page.page + 1
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
    prefetch: <TData>(queryKey: unknown[], queryFn: () => Promise<TData>) => {
      return queryClient.prefetchQuery({ queryKey, queryFn })
    },
    
    // Set cache data
    setCache: (queryKey: unknown[], data: unknown) => {
      queryClient.setQueryData(queryKey, data)
    },
    
    // Invalidate queries
    invalidate: (queryKey: unknown[]) => {
      queryClient.invalidateQueries({ queryKey })
    },
    
    // Remove from cache
    remove: (queryKey: unknown[]) => {
      queryClient.removeQueries({ queryKey })
    },
    
    // Clear all cache
    clearAll: () => {
      queryClient.clear()
    },
  }
}

// Hook for handling loading states across multiple queries
export function useLoadingStates(queries: Array<{ isLoading: boolean; error: unknown }>) {
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