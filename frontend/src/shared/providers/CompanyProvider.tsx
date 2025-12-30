'use client';

/**
 * Company Provider
 *
 * Multi-tenancy context for managing company selection across the application.
 * Provides company state, persistence to localStorage, and API header injection.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// Company interface
export interface Company {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  settings?: Record<string, unknown>;
}

// Context value interface
export interface CompanyContextValue {
  /** Currently selected company */
  company: Company | null;
  /** Set the active company */
  setCompany: (company: Company | null) => void;
  /** Company ID for API headers */
  companyId: string | null;
  /** Whether company is loading from storage */
  isLoading: boolean;
  /** Clear company selection */
  clearCompany: () => void;
  /** Check if a company is selected */
  hasCompany: boolean;
  /** Get headers for API requests */
  getCompanyHeaders: () => Record<string, string>;
}

// Storage key for persisting company
const STORAGE_KEY = 'fastnext_company';

// Create context
const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

// Provider props
export interface CompanyProviderProps {
  children: React.ReactNode;
  /** Default company to use if none is stored */
  defaultCompany?: Company | null;
  /** Custom storage key */
  storageKey?: string;
  /** Callback when company changes */
  onCompanyChange?: (company: Company | null) => void;
}

/**
 * CompanyProvider component
 *
 * Wraps the application to provide multi-tenancy company context.
 * Persists company selection to localStorage and provides API header injection.
 */
export function CompanyProvider({
  children,
  defaultCompany = null,
  storageKey = STORAGE_KEY,
  onCompanyChange,
}: CompanyProviderProps) {
  const [company, setCompanyState] = useState<Company | null>(defaultCompany);
  const [isLoading, setIsLoading] = useState(true);

  // Load company from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedCompany = JSON.parse(stored) as Company;
        setCompanyState(parsedCompany);
      }
    } catch (error) {
      console.error('Failed to load company from storage:', error);
      // Clear invalid data
      localStorage.removeItem(storageKey);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Set company and persist to localStorage
  const setCompany = useCallback(
    (newCompany: Company | null) => {
      setCompanyState(newCompany);

      if (typeof window !== 'undefined') {
        try {
          if (newCompany) {
            localStorage.setItem(storageKey, JSON.stringify(newCompany));
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error('Failed to persist company to storage:', error);
        }
      }

      // Notify about company change
      onCompanyChange?.(newCompany);
    },
    [storageKey, onCompanyChange],
  );

  // Clear company selection
  const clearCompany = useCallback(() => {
    setCompany(null);
  }, [setCompany]);

  // Get company ID
  const companyId = useMemo(() => company?.id ?? null, [company]);

  // Check if company is selected
  const hasCompany = useMemo(() => company !== null, [company]);

  // Get headers for API requests with company context
  const getCompanyHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (company?.id) {
      headers['X-Company-ID'] = company.id;
    }

    if (company?.slug) {
      headers['X-Company-Slug'] = company.slug;
    }

    return headers;
  }, [company]);

  // Context value
  const value = useMemo<CompanyContextValue>(
    () => ({
      company,
      setCompany,
      companyId,
      isLoading,
      clearCompany,
      hasCompany,
      getCompanyHeaders,
    }),
    [company, setCompany, companyId, isLoading, clearCompany, hasCompany, getCompanyHeaders],
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

/**
 * useCompany hook
 *
 * Hook to access company context for multi-tenancy support.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { company, setCompany, getCompanyHeaders } = useCompany();
 *
 *   const handleSwitch = (newCompany: Company) => {
 *     setCompany(newCompany);
 *   };
 *
 *   // Use headers in API calls
 *   const headers = getCompanyHeaders();
 * }
 * ```
 */
export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);

  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }

  return context;
}

/**
 * useCompanyId hook
 *
 * Convenience hook to get just the company ID.
 */
export function useCompanyId(): string | null {
  const { companyId } = useCompany();
  return companyId;
}

/**
 * useRequireCompany hook
 *
 * Hook that ensures a company is selected, throws if not.
 */
export function useRequireCompany(): Company {
  const { company, hasCompany } = useCompany();

  if (!hasCompany || !company) {
    throw new Error('A company must be selected to use this feature');
  }

  return company;
}

export default CompanyProvider;
