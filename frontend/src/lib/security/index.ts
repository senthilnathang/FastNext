// Security library exports

export { AdvancedRateLimit, rateLimit } from "./rate-limit";
export { validateRequest, validateRequestBody } from "./request-validator";
export {
  SecurityProvider,
  useSecureHTML,
  useSecureOperation,
  useSecurity,
} from "./SecurityProvider";
export {
  generateSRIHash,
  SecureScript,
  SecureStylesheet,
  SRI_HASHES,
  useSecureScript,
} from "./sri";
export {
  initializeTrustedTypes,
  TrustedTypesHelper,
  useSafeHTML,
} from "./trusted-types";
export { ClientXSSProtection, detectXSSAttempts } from "./xss-protection";

// Global types from trusted-types are available without explicit export

export type { SecureScriptProps, SecureStylesheetProps } from "./sri";

// Security utilities
export class SecurityUtils {
  // Generate secure random strings
  static generateSecureRandom(length: number = 32): string {
    if (typeof window === "undefined") {
      return Math.random()
        .toString(36)
        .substring(2, length + 2);
    }

    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  // Generate CSP nonce
  static generateCSPNonce(): string {
    return SecurityUtils.generateSecureRandom(16);
  }

  // Validate origin
  static isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.includes(origin);
  }

  // Check if running in secure context
  static isSecureContext(): boolean {
    return typeof window !== "undefined" && window.isSecureContext;
  }

  // Sanitize file name
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 255);
  }

  // Validate file type
  static isAllowedFileType(fileName: string, allowedTypes: string[]): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }

  // Check for potentially dangerous file types
  static isDangerousFileType(fileName: string): boolean {
    const dangerousTypes = [
      "exe",
      "scr",
      "bat",
      "cmd",
      "com",
      "pif",
      "vbs",
      "js",
      "jar",
      "php",
      "asp",
      "aspx",
      "jsp",
      "pl",
      "py",
      "rb",
      "sh",
      "ps1",
    ];

    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? dangerousTypes.includes(extension) : false;
  }
}

// Security constants
export const SECURITY_CONSTANTS = {
  // CSP directives
  CSP_DIRECTIVES: {
    DEFAULT_SRC: "'self'",
    SCRIPT_SRC: "'self' 'unsafe-inline'",
    STYLE_SRC: "'self' 'unsafe-inline'",
    FONT_SRC: "'self' data:",
    IMG_SRC: "'self' data: https: blob:",
    CONNECT_SRC: "'self'",
    OBJECT_SRC: "'none'",
    FRAME_SRC: "'none'",
    BASE_URI: "'self'",
    FORM_ACTION: "'self'",
  },

  // Security headers
  SECURITY_HEADERS: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },

  // Rate limiting
  RATE_LIMITS: {
    LOGIN: { requests: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    REGISTER: { requests: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
    API: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    STRICT: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
  },

  // File upload limits
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ["jpg", "jpeg", "png", "gif", "pdf", "txt", "doc", "docx"],
    MAX_FILES: 5,
  },
};

// Security validation functions
export const SecurityValidators = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // Password strength validation
  isStrongPassword: (
    password: string,
  ): { isValid: boolean; score: number; feedback: string[] } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push("Password must be at least 8 characters long");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Password must contain lowercase letters");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Password must contain uppercase letters");

    if (/\d/.test(password)) score += 1;
    else feedback.push("Password must contain numbers");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push("Password must contain special characters");

    if (password.length >= 12) score += 1;

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  },

  // URL validation
  isValidURL: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  // Input sanitization
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>"']/g, "") // Remove potential XSS characters
      .trim()
      .slice(0, 1000); // Limit length
  },
};

export * from "./rate-limit";
export * from "./request-validator";
// Export everything for easy access
export * from "./SecurityProvider";
export * from "./sri";
export * from "./trusted-types";
export * from "./xss-protection";
