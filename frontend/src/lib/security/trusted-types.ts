// Trusted Types polyfill and configuration for XSS prevention
// This implements the W3C Trusted Types specification

declare global {
  interface Window {
    trustedTypes?: {
      createPolicy(
        name: string,
        policy: TrustedTypePolicyOptions,
      ): TrustedTypePolicy;
      defaultPolicy?: TrustedTypePolicy;
      isHTML(value: any): boolean;
      isScript(value: any): boolean;
      isScriptURL(value: any): boolean;
      emptyHTML: TrustedHTML;
      emptyScript: TrustedScript;
    };
  }

  interface TrustedHTML {
    readonly __brand?: "TrustedHTML";
  }

  interface TrustedScript {
    readonly __brand?: "TrustedScript";
  }

  interface TrustedScriptURL {
    readonly __brand?: "TrustedScriptURL";
  }

  interface CustomTrustedTypePolicy {
    readonly name: string;
    createHTML?(input: string, ...args: any[]): TrustedHTML;
    createScript?(input: string, ...args: any[]): TrustedScript;
    createScriptURL?(input: string, ...args: any[]): TrustedScriptURL;
  }

  interface TrustedTypePolicyOptions {
    createHTML?(input: string, ...args: any[]): string;
    createScript?(input: string, ...args: any[]): string;
    createScriptURL?(input: string, ...args: any[]): string;
  }
}

// Simplified trusted types implementation
class SimpleTrustedTypes {
  private policies = new Map<string, any>();

  createPolicy(name: string, policy: any): any {
    if (this.policies.has(name)) {
      throw new Error(`Policy with name "${name}" already exists`);
    }

    const trustedPolicy = {
      name,
      createHTML: policy.createHTML
        ? (input: string) => ({ __brand: "TrustedHTML", value: input })
        : undefined,
      createScript: policy.createScript
        ? (input: string) => ({ __brand: "TrustedScript", value: input })
        : undefined,
      createScriptURL: policy.createScriptURL
        ? (input: string) => ({ __brand: "TrustedScriptURL", value: input })
        : undefined,
    };

    this.policies.set(name, trustedPolicy);
    return trustedPolicy;
  }

  isHTML(value: any): boolean {
    return (
      value && typeof value === "object" && value.__brand === "TrustedHTML"
    );
  }

  isScript(value: any): boolean {
    return (
      value && typeof value === "object" && value.__brand === "TrustedScript"
    );
  }

  isScriptURL(value: any): boolean {
    return (
      value && typeof value === "object" && value.__brand === "TrustedScriptURL"
    );
  }

  get emptyHTML(): any {
    return { __brand: "TrustedHTML", value: "" };
  }

  get emptyScript(): any {
    return { __brand: "TrustedScript", value: "" };
  }
}

// Initialize simple implementation if Trusted Types is not supported
if (typeof window !== "undefined" && !window.trustedTypes) {
  (window as any).trustedTypes = new SimpleTrustedTypes();
}

// Basic HTML sanitization without DOMPurify
function basicHTMLSanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>/gi, "")
    .replace(/<object[\s\S]*?>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<applet[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:text\/html/gi, "");
}

// URL validation and sanitization
function sanitizeURL(url: string): string {
  try {
    const urlObj = new URL(url);

    // Block dangerous protocols
    const dangerousProtocols = [
      "javascript:",
      "vbscript:",
      "data:",
      "file:",
      "ftp:",
    ];
    if (
      dangerousProtocols.some((protocol) =>
        url.toLowerCase().startsWith(protocol),
      )
    ) {
      return "about:blank";
    }

    // Only allow HTTP, HTTPS, and mailto
    if (!["http:", "https:", "mailto:"].includes(urlObj.protocol)) {
      return "about:blank";
    }

    return urlObj.toString();
  } catch {
    return "about:blank";
  }
}

// Script validation (basic - only allow known safe patterns)
function validateScript(script: string): string {
  // In production, you'd want more sophisticated validation
  // For now, only allow very basic patterns
  const dangerousPatterns = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\.write/gi,
    /innerHTML/gi,
    /outerHTML/gi,
    /execScript/gi,
    /javascript:/gi,
    /vbscript:/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(script)) {
      throw new Error("Script contains dangerous patterns");
    }
  }

  return script;
}

// Create the main security policy
export function createSecurityPolicy(): TrustedTypePolicy {
  if (!window.trustedTypes) {
    throw new Error("Trusted Types not supported");
  }

  return window.trustedTypes.createPolicy("fastnext-security", {
    createHTML: (input: string): string => {
      if (typeof input !== "string") {
        throw new Error("HTML input must be a string");
      }

      // Sanitize HTML content using basic sanitization
      return basicHTMLSanitize(input);
    },

    createScript: (input: string): string => {
      if (typeof input !== "string") {
        throw new Error("Script input must be a string");
      }

      // Validate script content
      return validateScript(input);
    },

    createScriptURL: (input: string): string => {
      if (typeof input !== "string") {
        throw new Error("Script URL input must be a string");
      }

      // Sanitize and validate URL
      return sanitizeURL(input);
    },
  });
}

// Create a stricter policy for user-generated content
export function createStrictPolicy(): TrustedTypePolicy {
  if (!window.trustedTypes) {
    throw new Error("Trusted Types not supported");
  }

  return window.trustedTypes.createPolicy("fastnext-strict", {
    createHTML: (input: string): string => {
      if (typeof input !== "string") {
        throw new Error("HTML input must be a string");
      }

      // Use basic sanitization and strip all HTML tags for strict policy
      return input.replace(/<[^>]*>/g, "");
    },

    createScript: (): string => {
      // Never allow scripts in strict policy
      throw new Error("Scripts not allowed in strict policy");
    },

    createScriptURL: (): string => {
      // Never allow script URLs in strict policy
      throw new Error("Script URLs not allowed in strict policy");
    },
  });
}

// Utility class for working with Trusted Types
export class TrustedTypesHelper {
  private static securityPolicy: TrustedTypePolicy | null = null;
  private static strictPolicy: TrustedTypePolicy | null = null;

  static async getSecurityPolicy(): Promise<TrustedTypePolicy> {
    if (!TrustedTypesHelper.securityPolicy) {
      TrustedTypesHelper.securityPolicy = createSecurityPolicy();
    }
    return TrustedTypesHelper.securityPolicy;
  }

  static async getStrictPolicy(): Promise<TrustedTypePolicy> {
    if (!TrustedTypesHelper.strictPolicy) {
      TrustedTypesHelper.strictPolicy = createStrictPolicy();
    }
    return TrustedTypesHelper.strictPolicy;
  }

  // Safe HTML creation
  static async createSafeHTML(
    html: string,
    strict = false,
  ): Promise<TrustedHTML> {
    const policy = strict
      ? await TrustedTypesHelper.getStrictPolicy()
      : await TrustedTypesHelper.getSecurityPolicy();

    if (!policy.createHTML) {
      throw new Error("Policy does not support HTML creation");
    }

    return policy.createHTML(html);
  }

  // Safe script creation
  static async createSafeScript(script: string): Promise<TrustedScript> {
    const policy = await TrustedTypesHelper.getSecurityPolicy();

    if (!policy.createScript) {
      throw new Error("Policy does not support script creation");
    }

    return policy.createScript(script);
  }

  // Safe script URL creation
  static async createSafeScriptURL(url: string): Promise<TrustedScriptURL> {
    const policy = await TrustedTypesHelper.getSecurityPolicy();

    if (!policy.createScriptURL) {
      throw new Error("Policy does not support script URL creation");
    }

    return policy.createScriptURL(url);
  }

  // Check if value is trusted
  static isTrustedHTML(value: any): boolean {
    return window.trustedTypes?.isHTML(value) ?? false;
  }

  static isTrustedScript(value: any): boolean {
    return window.trustedTypes?.isScript(value) ?? false;
  }

  static isTrustedScriptURL(value: any): boolean {
    return window.trustedTypes?.isScriptURL(value) ?? false;
  }
}

// React hook for safe HTML rendering
export function useSafeHTML(html: string, strict = false) {
  const [trustedHTML, setTrustedHTML] = React.useState<TrustedHTML | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isCancelled = false;

    const createTrustedHTML = async () => {
      try {
        setLoading(true);
        setError(null);

        const trusted = await TrustedTypesHelper.createSafeHTML(html, strict);

        if (!isCancelled) {
          setTrustedHTML(trusted);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setTrustedHTML(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    createTrustedHTML();

    return () => {
      isCancelled = true;
    };
  }, [html, strict]);

  return { trustedHTML, error, loading };
}

// Initialize Trusted Types on app startup
export function initializeTrustedTypes(): void {
  if (typeof window === "undefined") return;

  try {
    // Create default policy if it doesn't exist
    if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
      window.trustedTypes.createPolicy("default", {
        createHTML: (input: string) => {
          console.warn("Using default policy for HTML creation:", input);
          return basicHTMLSanitize(input);
        },
        createScript: (input: string) => {
          console.warn("Using default policy for script creation:", input);
          throw new Error("Scripts must use explicit policy");
        },
        createScriptURL: (input: string) => {
          console.warn("Using default policy for script URL creation:", input);
          return sanitizeURL(input);
        },
      });
    }

    // Pre-create our main policies
    createSecurityPolicy();
    createStrictPolicy();
  } catch (_error) {
    console.error("Failed to initialize Trusted Types:", _error);
  }
}

// Export React for the hook
import React from "react";
