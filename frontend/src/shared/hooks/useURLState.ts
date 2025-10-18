"use client";

import { useState, useCallback } from "react";

// Temporary replacement for nuqs hooks until Next.js 16 support is available
// TODO: Replace with nuqs when Next.js 16 support is added

// Simple state-based replacement for useQueryState
function useQueryState<T>(
  key: string,
  parser: { withDefault: () => T }
): [T, (value: T | null | ((prev: T) => T | null)) => void] {
  const defaultValue = parser.withDefault();
  const [state, setState] = useState<T>(defaultValue);

  const setValue = useCallback((value: T | null | ((prev: T) => T | null)) => {
    if (typeof value === 'function') {
      setState((prev) => {
        const newValue = (value as (prev: T) => T | null)(prev);
        return newValue ?? defaultValue;
      });
    } else {
      setState(value ?? defaultValue);
    }
  }, [defaultValue]);

  return [state, setValue];
}

// Simple parsers (temporary replacements)
const parseAsString = {
  withDefault: (defaultValue: string) => defaultValue,
};

const parseAsInteger = {
  withDefault: (defaultValue: number) => defaultValue,
};

const parseAsBoolean = {
  withDefault: (defaultValue: boolean) => defaultValue,
};

const parseAsStringLiteral = (options: readonly string[]) => ({
  withDefault: (defaultValue: string) => defaultValue,
});

const parseAsArrayOf = (parser: any) => ({
  withDefault: (defaultValue: any[]) => defaultValue,
});

const parseAsJson = (parser: any) => ({
  withDefault: (defaultValue: any) => defaultValue,
});

/**
 * Custom hook for managing search/filter state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useSearchState(defaultValue = "") {
  return useQueryState("search", { withDefault: () => defaultValue });
}

/**
 * Custom hook for managing pagination state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function usePaginationState(defaultPage = 1, defaultLimit = 10) {
  const [page, setPage] = useQueryState(
    "page",
    { withDefault: () => defaultPage },
  );
  const [limit, setLimit] = useQueryState(
    "limit",
    { withDefault: () => defaultLimit },
  );

  return {
    page,
    setPage,
    limit,
    setLimit,
    offset: (page - 1) * limit,
  };
}

/**
 * Custom hook for managing sort state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useSortState(
  defaultSortBy = "",
  defaultSortOrder: "asc" | "desc" = "asc",
) {
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    { withDefault: () => defaultSortBy },
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "sortOrder",
    { withDefault: () => defaultSortOrder },
  );

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    setSorting: (by: string, order: "asc" | "desc") => {
      setSortBy(by);
      setSortOrder(order);
    },
  };
}

/**
 * Custom hook for managing filter arrays in URL (e.g., tags, categories)
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useFilterArrayState(key: string, defaultValue: string[] = []) {
  return useQueryState(
    key,
    { withDefault: () => defaultValue },
  );
}

/**
 * Custom hook for managing boolean filters in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useBooleanFilterState(key: string, defaultValue = false) {
  return useQueryState(key, { withDefault: () => defaultValue });
}

/**
 * Custom hook for managing view mode state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useViewModeState<T extends readonly string[]>(
  modes: T,
  defaultMode: T[number],
) {
  return useQueryState(
    "view",
    { withDefault: () => defaultMode },
  );
}

/**
 * Custom hook for managing complex object state in URL as JSON
 * Note: Consider using schema validation libraries like Zod for production use
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useJSONState<T extends Record<string, any>>(
  key: string,
  defaultValue: T,
) {
  return useQueryState(
    key,
    { withDefault: () => defaultValue },
  );
}

/**
 * Custom hook for managing date range state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useDateRangeState() {
  const [startDate, setStartDate] = useQueryState<string | null>("startDate", { withDefault: () => null });
  const [endDate, setEndDate] = useQueryState<string | null>("endDate", { withDefault: () => null });

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    setDateRange: (start: string | null, end: string | null) => {
      setStartDate(start);
      setEndDate(end);
    },
  };
}

/**
 * Custom hook for managing tab state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useTabState<T extends readonly string[]>(
  tabs: T,
  defaultTab: T[number],
): [T[number], (value: string) => void] {
  const [state, setState] = useQueryState(
    "tab",
    { withDefault: () => defaultTab },
  );

  const setTabValue = useCallback((value: string) => {
    // Only set the value if it's a valid tab
    if (tabs.includes(value as T[number])) {
      setState(value as T[number]);
    }
  }, [tabs, setState]);

  return [state, setTabValue];
}

/**
 * Custom hook for managing modal/dialog state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useModalState(defaultOpen = false) {
  const [isOpen, setIsOpen] = useQueryState(
    "modal",
    { withDefault: () => defaultOpen },
  );

  return {
    isOpen,
    setIsOpen,
    openModal: () => setIsOpen(true),
    closeModal: () => setIsOpen(false),
    toggleModal: () => setIsOpen(!isOpen),
  };
}

/**
 * Custom hook for managing generic string literal state in URL
 * TODO: Currently using local state, will use URL state when nuqs supports Next.js 16
 */
export function useStringLiteralState<T extends readonly string[]>(
  key: string,
  options: T,
  defaultValue: T[number],
) {
  return useQueryState(
    key,
    { withDefault: () => defaultValue },
  );
}
