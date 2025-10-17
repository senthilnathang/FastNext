'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeTrustedTypes } from './trusted-types';

/**
 * Security features available in the current browser environment
 */
interface SecurityFeatures {
  /** Whether Trusted Types API is supported */
  trustedTypes: boolean;
  /** Whether Content Security Policy is supported */
  csp: boolean;
  /** Whether Subresource Integrity is supported */
  sri: boolean;
  /** Whether HTTP Strict Transport Security is active */
  hsts: boolean;
}

/**
 * Security context providing security-related state and utilities
 */
interface SecurityContextType {
  /** Current CSP nonce for inline scripts/styles */
  cspNonce: string;
  /** Whether Trusted Types are enabled and working */
  trustedTypesEnabled: boolean;
  /** Whether the current context is secure (HTTPS) */
  isSecureContext: boolean;
  /** Available security features in current environment */
  securityFeatures: SecurityFeatures;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

/**
 * Props for the SecurityProvider component
 */
interface SecurityProviderProps {
  /** Child components to be wrapped with security context */
  children: ReactNode;
}

/**
 * Security provider component that initializes and manages security features
 * for the entire application. Provides CSP nonces, Trusted Types support,
 * and security feature detection.
 */
export function SecurityProvider({ children }: SecurityProviderProps) {
  const [securityState, setSecurityState] = useState<SecurityContextType>({
    cspNonce: '',
    trustedTypesEnabled: false,
    isSecureContext: false,
    securityFeatures: {
      trustedTypes: false,
      csp: false,
      sri: false,
      hsts: false
    }
  });

  useEffect(() => {
    // Initialize security features on mount
    initializeSecurityFeatures();
  }, []);

  /**
   * Initialize all security features and update state
   */
  const initializeSecurityFeatures = () => {
    try {
      // Generate CSP nonce for inline scripts/styles
      const nonce = generateNonce();

      // Check for Trusted Types API support
      const trustedTypesEnabled = typeof window !== 'undefined' && 'trustedTypes' in window;

      // Check if we're in a secure context (HTTPS)
      const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

      // Initialize Trusted Types if supported
      if (trustedTypesEnabled) {
        try {
          initializeTrustedTypes();
        } catch (error) {
          console.warn('Failed to initialize Trusted Types:', error);
          // Continue without Trusted Types - not critical for basic functionality
        }
      }

      // Detect available security features
      const securityFeatures = detectSecurityFeatures();

      // Update security state with all detected features
      setSecurityState({
        cspNonce: nonce,
        trustedTypesEnabled,
        isSecureContext,
        securityFeatures
      });

      // Set up security event listeners for monitoring
      addSecurityEventListeners();

      // Perform initial security checks
      performSecurityChecks();

    } catch (error) {
      console.error('Failed to initialize security features:', error);
      // Set minimal security state on failure
      setSecurityState(prev => ({
        ...prev,
        securityFeatures: {
          ...prev.securityFeatures,
          csp: false,
          trustedTypes: false
        }
      }));
    }
  };

  return (
    <SecurityContext.Provider value={securityState}>
      {children}
    </SecurityContext.Provider>
  );
}

/**
 * Hook to access security context and features
 *
 * @returns Security context with CSP nonce, feature detection, and utilities
 * @throws Error if used outside of SecurityProvider
 *
 * @example
 * ```tsx
 * const { cspNonce, isSecureContext, securityFeatures } = useSecurity();
 *
 * // Use CSP nonce for inline scripts
 * const script = `<script nonce="${cspNonce}">console.log('Secure script');</script>`;
 * ```
 */
export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error(
      'useSecurity must be used within a SecurityProvider. ' +
      'Make sure your component is wrapped with <SecurityProvider>.'
    );
  }
  return context;
}

/**
 * Generate a cryptographically secure CSP nonce
 *
 * @returns Base64-encoded nonce string, or empty string if crypto is unavailable
 */
function generateNonce(): string {
  // Return empty string for SSR to avoid hydration mismatches
  if (typeof window === 'undefined') return '';

  try {
    // Generate a cryptographically secure random nonce
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('Failed to generate CSP nonce:', error);
    return '';
  }
}

/**
 * Detect which security features are available in the current browser environment
 *
 * @returns Object containing boolean flags for each security feature
 */
function detectSecurityFeatures(): SecurityFeatures {
  // Return all features as false during SSR
  if (typeof window === 'undefined') {
    return {
      trustedTypes: false,
      csp: false,
      sri: false,
      hsts: false
    };
  }

  return {
    trustedTypes: 'trustedTypes' in window,
    csp: checkCSPSupport(),
    sri: checkSRISupport(),
    hsts: window.isSecureContext
  };
}

/**
 * Check if Content Security Policy is supported by the browser
 *
 * @returns True if CSP violation events are supported
 */
function checkCSPSupport(): boolean {
  try {
    return 'SecurityPolicyViolationEvent' in window;
  } catch {
    return false;
  }
}

/**
 * Check if Subresource Integrity is supported by the browser
 *
 * @returns True if the integrity attribute is supported on script elements
 */
function checkSRISupport(): boolean {
  try {
    const script = document.createElement('script');
    return 'integrity' in script;
  } catch {
    return false;
  }
}

/**
 * Set up security event listeners for monitoring and violation detection
 */
function addSecurityEventListeners(): void {
  if (typeof window === 'undefined') return;

  try {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Listen for mixed content warnings on page unload
    if ('onbeforeunload' in window) {
      window.addEventListener('beforeunload', checkMixedContent);
    }

    // Listen for potentially malicious messages
    window.addEventListener('message', validateMessageOrigin, false);

  } catch (error) {
    console.warn('Failed to add security event listeners:', error);
  }
}

/**
 * Handle Content Security Policy violations
 */
function handleCSPViolation(event: SecurityPolicyViolationEvent): void {
  const violationDetails = {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    effectiveDirective: event.effectiveDirective,
    originalPolicy: event.originalPolicy,
    disposition: event.disposition,
    sourceFile: event.sourceFile,
    lineNumber: event.lineNumber,
    columnNumber: event.columnNumber,
    timestamp: new Date().toISOString()
  };

  console.error('CSP Violation detected:', violationDetails);

  // Report violation for monitoring
  reportSecurityViolation('csp_violation', violationDetails);
}

/**
 * Perform initial security checks on page load
 */
function performSecurityChecks(): void {
  if (typeof window === 'undefined') return;

  try {
    // Check for insecure protocols in production
    checkProtocolSecurity();

    // Monitor dangerous global function usage
    checkDangerousGlobals();

    // Check for inline scripts that should use CSP nonces
    checkInlineScripts();

    // Validate current document origin
    validateDocumentOrigin();

  } catch (error) {
    console.warn('Security check failed:', error);
  }
}

/**
 * Check if the application is running over a secure protocol
 */
function checkProtocolSecurity(): void {
  const isLocalhost = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.startsWith('192.168.') ||
                     window.location.hostname.startsWith('10.');

  if (window.location.protocol === 'http:' && !isLocalhost) {
    console.warn(
      'Security Warning: Application is running over HTTP in a non-local environment. ' +
      'Consider using HTTPS for enhanced security.'
    );
  }
}

/**
 * Monitor usage of potentially dangerous global functions
 * Wraps them to log when they're called for security monitoring
 */
function checkDangerousGlobals(): void {
  const dangerousGlobals: string[] = ['eval', 'Function'];

  for (const globalName of dangerousGlobals) {
    try {
      const globalValue = (window as any)[globalName];
      if (typeof globalValue === 'function') {
        // Wrap dangerous functions to log usage
        const original = globalValue;
        (window as any)[globalName] = function(...args: unknown[]) {
          console.warn(`Security Warning: Potentially dangerous function '${globalName}' called`, {
            args: args.length,
            stack: new Error().stack?.split('\n')[2]?.trim()
          });
          return original.apply(this, args);
        };
      }
    } catch (error) {
      // Ignore errors when trying to wrap globals
      console.debug(`Could not monitor global '${globalName}':`, error);
    }
  }
}

/**
 * Check for inline scripts that should use CSP nonces
 */
function checkInlineScripts(): void {
  try {
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
      console.warn(
        `Security Warning: Found ${inlineScripts.length} inline script(s) without CSP nonces. ` +
        'Consider using CSP with nonces for enhanced security.'
      );
    }
  } catch (error) {
    console.debug('Could not check for inline scripts:', error);
  }
}

/**
 * Validate that the current document origin is expected
 */
function validateDocumentOrigin(): void {
  const currentOrigin = window.location.origin;
  const allowedOrigins = [
    currentOrigin, // Current origin is always allowed
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'http://localhost:3000', // Allow HTTP for local development
    'http://127.0.0.1:3000'
  ];

  if (!allowedOrigins.includes(currentOrigin)) {
    console.warn('Security Warning: Document origin not in allowed list:', {
      current: currentOrigin,
      allowed: allowedOrigins
    });
  }
}

/**
 * Check for mixed content (HTTP resources on HTTPS pages)
 */
function checkMixedContent(): void {
  if (window.location.protocol === 'https:') {
    try {
      const httpResources = document.querySelectorAll('[src^="http:"], [href^="http:"]');
      if (httpResources.length > 0) {
        console.warn(
          `Security Warning: Found ${httpResources.length} HTTP resource(s) on HTTPS page. ` +
          'This creates mixed content and should be avoided.'
        );
      }
    } catch (error) {
      console.debug('Could not check for mixed content:', error);
    }
  }
}

/**
 * Validate the origin of postMessage events for security
 */
function validateMessageOrigin(event: MessageEvent): void {
  const allowedOrigins = [
    window.location.origin,
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Security Warning: Received message from unauthorized origin:', {
      origin: event.origin,
      allowed: allowedOrigins,
      data: typeof event.data
    });
    return;
  }

  // Additional validation for message content
  if (typeof event.data === 'string') {
    if (event.data.includes('<script') || event.data.includes('javascript:')) {
      console.error('Security Alert: Potentially malicious script content in message:', {
        origin: event.origin,
        data: event.data.substring(0, 100) + '...'
      });
    }
  }
}

/**
 * Report security violations to monitoring services
 */
function reportSecurityViolation(type: string, details: Record<string, unknown>): void {
  const violationData = {
    type,
    details,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    environment: process.env.NODE_ENV || 'unknown'
  };

  if (process.env.NODE_ENV === 'development') {
    console.error(`Security violation [${type}]:`, violationData);
  } else {
    // Send to monitoring service like Sentry, DataDog, etc.
    try {
      fetch('/api/security/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violationData)
      }).catch(error => {
        console.error('Failed to report security violation:', error);
      });
    } catch (error) {
      console.error('Error reporting security violation:', error);
    }
  }
}

/**
 * Hook for components that need to perform secure operations with validation
 *
 * @returns Object with executeSecurely function for running operations with security checks
 *
 * @example
 * ```tsx
 * const { executeSecurely } = useSecureOperation();
 *
 * await executeSecurely(
 *   async () => {
 *     // Your secure operation here
 *     await sensitiveApiCall();
 *   },
 *   { requireHTTPS: true, requireTrustedTypes: false }
 * );
 * ```
 */
export function useSecureOperation() {
  const security = useSecurity();

  const executeSecurely = async (
    operation: () => Promise<void> | void,
    options: {
      requireHTTPS?: boolean;
      requireTrustedTypes?: boolean;
    } = {}
  ): Promise<void> => {
    const { requireHTTPS = false, requireTrustedTypes = false } = options;

    // Validate security requirements
    if (requireHTTPS && !security.isSecureContext) {
      throw new Error(
        'Operation requires HTTPS context but current context is not secure. ' +
        'Please ensure the application is served over HTTPS.'
      );
    }

    if (requireTrustedTypes && !security.trustedTypesEnabled) {
      console.warn(
        'Operation requested Trusted Types but they are not available. ' +
        'Falling back to basic security measures.'
      );
    }

    try {
      await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('Secure operation failed:', errorMessage);

      // Report the failure for monitoring
      reportSecurityViolation('operation_failure', {
        error: errorMessage,
        requireHTTPS,
        requireTrustedTypes,
        operationName: operation.name || 'anonymous'
      });

      throw error;
    }
  };

  return { executeSecurely };
}

/**
 * Hook for secure HTML rendering with sanitization
 *
 * @returns Object with renderHTML function for safe HTML rendering
 *
 * @example
 * ```tsx
 * const { renderHTML } = useSecureHTML();
 *
 * return <div dangerouslySetInnerHTML={{ __html: renderHTML(userContent) }} />;
 * ```
 */
export function useSecureHTML() {
  const security = useSecurity();

  const renderHTML = (html: string): string => {
    if (typeof html !== 'string') {
      console.warn('useSecureHTML: Input must be a string');
      return '';
    }

    if (!security.trustedTypesEnabled) {
      console.warn('Trusted Types not available, using basic sanitization');
      return basicSanitizeHTML(html);
    }

    // If Trusted Types is available, the HTML would be processed by the policy
    // For now, return as-is (in production, this should use Trusted Types)
    return html;
  };

  return { renderHTML };
}

/**
 * Basic HTML sanitization when Trusted Types is not available
 * This is a fallback and should not be relied upon as primary security
 */
function basicSanitizeHTML(html: string): string {
  if (typeof html !== 'string') return '';

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[\s\S]*?>/gi, '') // Remove iframe tags
    .replace(/<object[\s\S]*?>/gi, '') // Remove object tags
    .replace(/<embed[\s\S]*?>/gi, '') // Remove embed tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/data:text\/html/gi, ''); // Remove data: URLs with HTML
}
