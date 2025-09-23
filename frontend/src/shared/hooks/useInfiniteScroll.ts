"use client"

import * as React from "react"

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  hasNextPage?: boolean
  isFetching?: boolean
  fetchNextPage?: () => void
}

interface UseInfiniteScrollReturn {
  ref: React.RefCallback<HTMLElement>
  isIntersecting: boolean
}

export function useInfiniteScroll({
  threshold = 0.1,
  rootMargin = "100px",
  hasNextPage = true,
  isFetching = false,
  fetchNextPage
}: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const [element, setElement] = React.useState<HTMLElement | null>(null)

  const ref = React.useCallback((node: HTMLElement | null) => {
    setElement(node)
  }, [])

  React.useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting
        setIsIntersecting(isElementIntersecting)

        // Trigger fetch when element comes into view
        if (isElementIntersecting && hasNextPage && !isFetching && fetchNextPage) {
          fetchNextPage()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [element, threshold, rootMargin, hasNextPage, isFetching, fetchNextPage])

  return { ref, isIntersecting }
}

interface UseInfiniteDataOptions<T> {
  initialData?: T[]
  pageSize?: number
  fetchFn?: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>
  enabled?: boolean
}

interface UseInfiniteDataReturn<T> {
  data: T[]
  hasNextPage: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<void>
  error: string | null
  reset: () => void
  total?: number
  currentPage: number
}

export function useInfiniteData<T>({
  initialData = [],
  pageSize = 20,
  fetchFn,
  enabled = true
}: UseInfiniteDataOptions<T>): UseInfiniteDataReturn<T> {
  const [data, setData] = React.useState<T[]>(initialData)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [hasNextPage, setHasNextPage] = React.useState(true)
  const [isFetching, setIsFetching] = React.useState(false)
  const [isFetchingNextPage, setIsFetchingNextPage] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [total, setTotal] = React.useState<number | undefined>(undefined)

  const fetchNextPage = React.useCallback(async () => {
    if (!fetchFn || !hasNextPage || isFetchingNextPage) return

    try {
      setIsFetchingNextPage(true)
      setError(null)

      const result = await fetchFn(currentPage, pageSize)
      
      setData(prev => [...prev, ...result.data])
      setHasNextPage(result.hasMore)
      setCurrentPage(prev => prev + 1)
      
      if (result.total !== undefined) {
        setTotal(result.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsFetchingNextPage(false)
    }
  }, [fetchFn, currentPage, pageSize, hasNextPage, isFetchingNextPage])

  const reset = React.useCallback(() => {
    setData(initialData)
    setCurrentPage(1)
    setHasNextPage(true)
    setIsFetching(false)
    setIsFetchingNextPage(false)
    setError(null)
    setTotal(undefined)
  }, [initialData])

  // Initial fetch
  React.useEffect(() => {
    if (!enabled || !fetchFn || data.length > 0) return

    const initialFetch = async () => {
      try {
        setIsFetching(true)
        setError(null)

        const result = await fetchFn(1, pageSize)
        
        setData(result.data)
        setHasNextPage(result.hasMore)
        setCurrentPage(2) // Next page will be 2
        
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch initial data')
      } finally {
        setIsFetching(false)
      }
    }

    initialFetch()
  }, [enabled, fetchFn, pageSize, data.length])

  return {
    data,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    error,
    reset,
    total,
    currentPage: currentPage - 1 // Return 0-based for display
  }
}

export default useInfiniteScroll