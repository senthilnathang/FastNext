/**
 * Multi-tenancy Utilities
 * Handles company context management for multi-tenant applications
 */

// Constants
export const COMPANY_HEADER_NAME = "X-Company-ID";
export const COMPANY_STORAGE_KEY = "current_company_id";
export const COMPANY_CONTEXT_KEY = "company_context";

/**
 * Company context type
 */
export interface CompanyContext {
  id: string;
  name?: string;
  slug?: string;
  selectedAt?: string;
}

/**
 * Get the current company ID from storage or context
 * Priority: sessionStorage > localStorage > null
 */
export function getCompanyId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // First check session storage (current session context)
    const sessionCompanyId = sessionStorage.getItem(COMPANY_STORAGE_KEY);
    if (sessionCompanyId) {
      return sessionCompanyId;
    }

    // Fall back to local storage (persistent selection)
    const localCompanyId = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (localCompanyId) {
      return localCompanyId;
    }

    // Check for full context object
    const contextJson = localStorage.getItem(COMPANY_CONTEXT_KEY);
    if (contextJson) {
      const context: CompanyContext = JSON.parse(contextJson);
      return context.id;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Set the current company ID
 * Stores in both session storage (for current session) and local storage (for persistence)
 */
export function setCompanyId(
  companyId: string,
  options: {
    persistent?: boolean;
    context?: Omit<CompanyContext, "id">;
  } = {}
): void {
  if (typeof window === "undefined") {
    return;
  }

  const { persistent = true, context } = options;

  try {
    // Always set in session storage
    sessionStorage.setItem(COMPANY_STORAGE_KEY, companyId);

    // Optionally persist to local storage
    if (persistent) {
      localStorage.setItem(COMPANY_STORAGE_KEY, companyId);

      // If context is provided, store the full context
      if (context) {
        const fullContext: CompanyContext = {
          id: companyId,
          ...context,
          selectedAt: new Date().toISOString(),
        };
        localStorage.setItem(COMPANY_CONTEXT_KEY, JSON.stringify(fullContext));
      }
    }

    // Dispatch event for listeners
    window.dispatchEvent(
      new CustomEvent("companyChanged", {
        detail: { companyId, context },
      })
    );
  } catch {
    // Ignore storage errors (e.g., quota exceeded, private browsing)
  }
}

/**
 * Clear the current company ID from all storage
 */
export function clearCompanyId(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(COMPANY_STORAGE_KEY);
    localStorage.removeItem(COMPANY_STORAGE_KEY);
    localStorage.removeItem(COMPANY_CONTEXT_KEY);

    // Dispatch event for listeners
    window.dispatchEvent(
      new CustomEvent("companyChanged", {
        detail: { companyId: null, context: null },
      })
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the full company context
 */
export function getCompanyContext(): CompanyContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const contextJson = localStorage.getItem(COMPANY_CONTEXT_KEY);
    if (contextJson) {
      return JSON.parse(contextJson);
    }

    // Fall back to just the ID if context is not available
    const companyId = getCompanyId();
    if (companyId) {
      return { id: companyId };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a company is currently selected
 */
export function hasCompanyContext(): boolean {
  return getCompanyId() !== null;
}

/**
 * Subscribe to company changes
 */
export function onCompanyChange(
  callback: (event: { companyId: string | null; context?: CompanyContext }) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{
      companyId: string | null;
      context?: CompanyContext;
    }>;
    callback(customEvent.detail);
  };

  window.addEventListener("companyChanged", handler);

  return () => {
    window.removeEventListener("companyChanged", handler);
  };
}

/**
 * Get company headers for API requests
 */
export function getCompanyHeaders(): Record<string, string> {
  const companyId = getCompanyId();
  if (!companyId) {
    return {};
  }
  return {
    [COMPANY_HEADER_NAME]: companyId,
  };
}

/**
 * Validate company ID format
 */
export function isValidCompanyId(companyId: string): boolean {
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Numeric ID validation
  const numericRegex = /^\d+$/;

  return uuidRegex.test(companyId) || numericRegex.test(companyId);
}

export default {
  COMPANY_HEADER_NAME,
  COMPANY_STORAGE_KEY,
  COMPANY_CONTEXT_KEY,
  getCompanyId,
  setCompanyId,
  clearCompanyId,
  getCompanyContext,
  hasCompanyContext,
  onCompanyChange,
  getCompanyHeaders,
  isValidCompanyId,
};
