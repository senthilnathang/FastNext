"use client"

import * as React from "react"
import type { SearchState, SearchFilter, SortOption } from "@/shared/components/AdvancedSearch"

interface UseAdvancedSearchOptions {
  initialQuery?: string
  initialFilters?: SearchFilter[]
  initialSort?: SortOption | null
  initialPageSize?: number
  debounceMs?: number
  onSearch?: (state: SearchState) => void
}

interface SearchResults<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function useAdvancedSearch<T = any>({
  initialQuery = '',
  initialFilters = [],
  initialSort = null,
  initialPageSize = 20,
  debounceMs = 300,
  onSearch
}: UseAdvancedSearchOptions = {}) {
  const [searchState, setSearchState] = React.useState<SearchState>({
    query: initialQuery,
    filters: initialFilters,
    sort: initialSort,
    page: 1,
    pageSize: initialPageSize
  })

  const [results, setResults] = React.useState<SearchResults<T>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: initialPageSize,
    hasMore: false
  })

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Debounced search effect
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        setLoading(true)
        setError(null)
        onSearch(searchState)
      }
    }, debounceMs)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchState, debounceMs, onSearch])

  // Update search state
  const updateSearchState = React.useCallback((newState: SearchState) => {
    setSearchState(newState)
  }, [])

  // Set search results
  const setSearchResults = React.useCallback((newResults: SearchResults<T>) => {
    setResults(newResults)
    setLoading(false)
  }, [])

  // Set search error
  const setSearchError = React.useCallback((errorMessage: string) => {
    setError(errorMessage)
    setLoading(false)
  }, [])

  // Reset search
  const resetSearch = React.useCallback(() => {
    setSearchState({
      query: '',
      filters: [],
      sort: null,
      page: 1,
      pageSize: initialPageSize
    })
    setResults({
      data: [],
      total: 0,
      page: 1,
      pageSize: initialPageSize,
      hasMore: false
    })
    setError(null)
  }, [initialPageSize])

  // Load more (for pagination)
  const loadMore = React.useCallback(() => {
    if (!loading && results.hasMore) {
      setSearchState(prev => ({
        ...prev,
        page: prev.page + 1
      }))
    }
  }, [loading, results.hasMore])

  // Go to specific page
  const goToPage = React.useCallback((page: number) => {
    setSearchState(prev => ({
      ...prev,
      page: Math.max(1, page)
    }))
  }, [])

  // Change page size
  const changePageSize = React.useCallback((pageSize: number) => {
    setSearchState(prev => ({
      ...prev,
      pageSize,
      page: 1
    }))
  }, [])

  // Helper to build query parameters for API calls
  const buildQueryParams = React.useCallback(() => {
    const params = new URLSearchParams()

    // Add search query
    if (searchState.query) {
      params.set('q', searchState.query)
    }

    // Add filters
    searchState.filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== '') {
        if (Array.isArray(filter.value)) {
          // Handle multiselect filters
          filter.value.forEach((value: string) => {
            params.append(`filter_${filter.field}`, value)
          })
        } else if (filter.type === 'daterange' && filter.value?.from) {
          // Handle date range filters
          params.set(`filter_${filter.field}_from`, filter.value.from.toISOString())
          if (filter.value.to) {
            params.set(`filter_${filter.field}_to`, filter.value.to.toISOString())
          }
        } else {
          // Handle other filter types
          params.set(`filter_${filter.field}`, 
            filter.type === 'date' && filter.value instanceof Date 
              ? filter.value.toISOString()
              : String(filter.value)
          )
        }
      }
    })

    // Add sorting
    if (searchState.sort) {
      params.set('sort', searchState.sort.field)
      params.set('order', searchState.sort.direction)
    }

    // Add pagination
    params.set('page', String(searchState.page))
    params.set('limit', String(searchState.pageSize))

    return params
  }, [searchState])

  // Helper to get filter values by field
  const getFilterValue = React.useCallback((field: string) => {
    const filter = searchState.filters.find(f => f.field === field)
    return filter?.value
  }, [searchState.filters])

  // Helper to check if a filter is active
  const hasFilter = React.useCallback((field: string) => {
    return searchState.filters.some(f => f.field === field && f.value !== undefined && f.value !== '')
  }, [searchState.filters])

  // Helper to get active filter count
  const getActiveFilterCount = React.useCallback(() => {
    return searchState.filters.filter(f => f.value !== undefined && f.value !== '').length
  }, [searchState.filters])

  // Helper to check if search is active
  const hasActiveSearch = React.useCallback(() => {
    return !!(searchState.query || getActiveFilterCount() > 0 || searchState.sort)
  }, [searchState.query, searchState.sort, getActiveFilterCount])

  return {
    // State
    searchState,
    results,
    loading,
    error,

    // Actions
    updateSearchState,
    setSearchResults,
    setSearchError,
    resetSearch,
    loadMore,
    goToPage,
    changePageSize,

    // Helpers
    buildQueryParams,
    getFilterValue,
    hasFilter,
    getActiveFilterCount,
    hasActiveSearch,

    // Computed values
    totalPages: Math.ceil(results.total / searchState.pageSize),
    currentPage: searchState.page,
    hasNextPage: results.hasMore,
    hasPrevPage: searchState.page > 1,
  }
}

export default useAdvancedSearch