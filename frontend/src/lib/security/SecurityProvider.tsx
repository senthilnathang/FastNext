'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeTrustedTypes } from './trusted-types';

interface SecurityContextType {
  cspNonce: string;
  trustedTypesEnabled: boolean;
  isSecureContext: boolean;
  securityFeatures: {
    trustedTypes: boolean;
    csp: boolean;
    sri: boolean;
    hsts: boolean;
  };
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

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
    // Generate CSP nonce
    const nonce = generateNonce();
    
    // Check for Trusted Types support
    const trustedTypesEnabled = typeof window !== 'undefined' && 'trustedTypes' in window;
    
    // Check if we're in a secure context (HTTPS)
    const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
    
    // Initialize Trusted Types
    if (trustedTypesEnabled) {
      try {
        initializeTrustedTypes();
      } catch (error) {
        console.error('Failed to initialize Trusted Types:', error);
      }
    }

    // Detect security features
    const securityFeatures = detectSecurityFeatures();

    setSecurityState({
      cspNonce: nonce,
      trustedTypesEnabled,
      isSecureContext,
      securityFeatures
    });

    // Add security event listeners
    addSecurityEventListeners();

    // Perform security checks
    performSecurityChecks();

  }, []);

  return (
    <SecurityContext.Provider value={securityState}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

function generateNonce(): string {
  if (typeof window === 'undefined') return '';
  
  // Generate a cryptographically secure random nonce
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function detectSecurityFeatures() {
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

function checkCSPSupport(): boolean {
  // Check if CSP is supported by looking for violation events
  return 'SecurityPolicyViolationEvent' in window;
}

function checkSRISupport(): boolean {
  // Check if Subresource Integrity is supported
  const script = document.createElement('script');
  return 'integrity' in script;
}

function addSecurityEventListeners(): void {
  if (typeof window === 'undefined') return;

  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    console.error('CSP Violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      disposition: event.disposition,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber
    });

    // Send violation report to analytics/monitoring service
    reportSecurityViolation('csp', {
      type: 'csp_violation',
      blocked_uri: event.blockedURI,
      violated_directive: event.violatedDirective,
      source_file: event.sourceFile,
      line_number: event.lineNumber,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  });

  // Listen for mixed content warnings
  if ('onbeforeunload' in window) {
    window.addEventListener('beforeunload', () => {
      // Check for mixed content issues before page unload
      checkMixedContent();
    });
  }

  // Listen for iframe security violations
  window.addEventListener('message', (event) => {
    // Validate message origin for security
    validateMessageOrigin(event);
  }, false);
}

function performSecurityChecks(): void {
  if (typeof window === 'undefined') return;

  // Check for insecure protocols
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    console.warn('Application is running over HTTP in production. Consider using HTTPS.');
  }

  // Check for dangerous globals
  checkDangerousGlobals();

  // Check for inline scripts without CSP
  checkInlineScripts();

  // Validate document origin
  validateDocumentOrigin();
}

function checkDangerousGlobals(): void {
  const dangerousGlobals = ['eval', 'Function', 'setTimeout', 'setInterval'];
  
  for (const global of dangerousGlobals) {
    if (typeof (window as any)[global] === 'function') {
      // Wrap dangerous functions to log usage
      const original = (window as any)[global];
      (window as any)[global] = function(...args: any[]) {
        console.warn(`Potentially dangerous function called: ${global}`, args);
        return original.apply(this, args);
      };
    }
  }
}

function checkInlineScripts(): void {
  const inlineScripts = document.querySelectorAll('script:not([src])');
  if (inlineScripts.length > 0) {
    console.warn(`Found ${inlineScripts.length} inline script(s). Consider using CSP with nonces.`);
  }
}

function validateDocumentOrigin(): void {
  const expectedOrigins = [
    window.location.origin,
    'https://localhost:3000',
    'https://127.0.0.1:3000'
  ];

  if (!expectedOrigins.includes(window.location.origin)) {
    console.warn('Document origin does not match expected origins:', window.location.origin);
  }
}

function checkMixedContent(): void {
  // Check for mixed content (HTTP resources on HTTPS pages)
  if (window.location.protocol === 'https:') {
    const httpResources = document.querySelectorAll('[src^="http:"], [href^="http:"]');
    if (httpResources.length > 0) {
      console.warn(`Found ${httpResources.length} HTTP resource(s) on HTTPS page (mixed content)`);
    }
  }
}

function validateMessageOrigin(event: MessageEvent): void {
  const allowedOrigins = [
    window.location.origin,
    'https://vercel.com',
    'https://vercel.app'
  ];

  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Received message from unauthorized origin:', event.origin);
    return;
  }

  // Additional validation for message content
  if (typeof event.data === 'string' && event.data.includes('<script')) {
    console.error('Potentially malicious script content in message:', event.data);
  }
}

function reportSecurityViolation(type: string, details: any): void {
  // In production, send to your security monitoring service
  if (process.env.NODE_ENV === 'development') {
    console.error(`Security violation [${type}]:`, details);
  } else {
    // Send to monitoring service like Sentry, DataDog, etc.
    fetch('/api/security/violations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(error => {
      console.error('Failed to report security violation:', error);
    });
  }
}

// Hook for components that need to perform secure operations
export function useSecureOperation() {
  const security = useSecurity();

  const executeSecurely = async (operation: () => Promise<void> | void, options?: {
    requireHTTPS?: boolean;
    requireTrustedTypes?: boolean;
  }) => {
    const { requireHTTPS = false, requireTrustedTypes = false } = options || {};

    if (requireHTTPS && !security.isSecureContext) {
      throw new Error('Operation requires HTTPS');
    }

    if (requireTrustedTypes && !security.trustedTypesEnabled) {
      console.warn('Operation recommended Trusted Types, but not available');
    }

    try {
      await operation();
    } catch (error) {
      console.error('Secure operation failed:', error);
      reportSecurityViolation('operation_failure', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requireHTTPS,
        requireTrustedTypes
      });
      throw error;
    }
  };

  return { executeSecurely };
}

// Hook for secure HTML rendering
export function useSecureHTML() {
  const security = useSecurity();

  const renderHTML = (html: string) => {

    if (!security.trustedTypesEnabled) {
      console.warn('Trusted Types not available, using basic sanitization');
      return basicSanitizeHTML(html);
    }

    // If Trusted Types is available, use it
    return html; // This would be processed by Trusted Types policy
  };

  return { renderHTML };
}

function basicSanitizeHTML(html: string): string {
  // Basic HTML sanitization when Trusted Types is not available
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');
}