'use client'

import { 
  useQueryState, 
  parseAsString, 
  parseAsInteger, 
  parseAsBoolean,
  parseAsArrayOf,
  parseAsStringLiteral,
  parseAsJson,
  type ParseAsStringLiterals,
  type Parser
} from 'nuqs'

/**
 * Custom hook for managing search/filter state in URL
 */
export function useSearchState(defaultValue = '') {
  return useQueryState('search', parseAsString.withDefault(defaultValue))
}

/**
 * Custom hook for managing pagination state in URL
 */
export function usePaginationState(defaultPage = 1, defaultLimit = 10) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(defaultPage))
  const [limit, setLimit] = useQueryState('limit', parseAsInteger.withDefault(defaultLimit))
  
  return {
    page,
    setPage,
    limit,
    setLimit,
    offset: (page - 1) * limit
  }
}

/**
 * Custom hook for managing sort state in URL
 */
export function useSortState(defaultSortBy = '', defaultSortOrder: 'asc' | 'desc' = 'asc') {
  const [sortBy, setSortBy] = useQueryState('sortBy', parseAsString.withDefault(defaultSortBy))
  const [sortOrder, setSortOrder] = useQueryState(
    'sortOrder', 
    parseAsStringLiteral(['asc', 'desc'] as const).withDefault(defaultSortOrder)
  )
  
  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    setSorting: (by: string, order: 'asc' | 'desc') => {
      setSortBy(by)
      setSortOrder(order)
    }
  }
}

/**
 * Custom hook for managing filter arrays in URL (e.g., tags, categories)
 */
export function useFilterArrayState(key: string, defaultValue: string[] = []) {
  return useQueryState(key, parseAsArrayOf(parseAsString).withDefault(defaultValue))
}

/**
 * Custom hook for managing boolean filters in URL
 */
export function useBooleanFilterState(key: string, defaultValue = false) {
  return useQueryState(key, parseAsBoolean.withDefault(defaultValue))
}

/**
 * Custom hook for managing view mode state in URL
 */
export function useViewModeState<T extends readonly string[]>(
  modes: T,
  defaultMode: T[number]
) {
  return useQueryState(
    'view',
    parseAsStringLiteral(modes).withDefault(defaultMode)
  )
}

/**
 * Custom hook for managing complex object state in URL as JSON
 */
export function useJSONState<T>(key: string, defaultValue: T) {
  return useQueryState(key, parseAsJson<T>().withDefault(defaultValue))
}

/**
 * Custom hook for managing date range state in URL
 */
export function useDateRangeState() {
  const [startDate, setStartDate] = useQueryState('startDate', parseAsString)
  const [endDate, setEndDate] = useQueryState('endDate', parseAsString)
  
  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    setDateRange: (start: string | null, end: string | null) => {
      setStartDate(start)
      setEndDate(end)
    }
  }
}

/**
 * Custom hook for managing tab state in URL
 */
export function useTabState<T extends readonly string[]>(
  tabs: T,
  defaultTab: T[number]
) {
  return useQueryState(
    'tab',
    parseAsStringLiteral(tabs).withDefault(defaultTab)
  )
}

/**
 * Custom hook for managing modal/dialog state in URL
 */
export function useModalState(defaultOpen = false) {
  const [isOpen, setIsOpen] = useQueryState('modal', parseAsBoolean.withDefault(defaultOpen))
  
  return {
    isOpen,
    setIsOpen,
    openModal: () => setIsOpen(true),
    closeModal: () => setIsOpen(false),
    toggleModal: () => setIsOpen(!isOpen)
  }
}

/**
 * Custom hook for managing generic string literal state in URL
 */
export function useStringLiteralState<T extends readonly string[]>(
  key: string,
  options: T,
  defaultValue: T[number]
) {
  return useQueryState(key, parseAsStringLiteral(options).withDefault(defaultValue))
}