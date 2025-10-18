/**
 * Application constants and configuration values.
 *
 * This file contains all magic numbers, default values, and configuration
 * constants used throughout the application for better maintainability.
 */

// API Configuration
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_SEARCH_LENGTH: 2,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  CSP_NONCE_LENGTH: 16,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300, // milliseconds
  ANIMATION_DURATION: 200, // milliseconds
  TOAST_DURATION: 5000, // 5 seconds
  MODAL_Z_INDEX: 1000,
  DROPDOWN_Z_INDEX: 900,
  TOOLTIP_Z_INDEX: 1100,
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "text/plain",
    "application/msword",
  ],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large uploads
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  LONG_TTL: 3600, // 1 hour
  SHORT_TTL: 60, // 1 minute
  MAX_CACHE_SIZE: 100, // Maximum items in memory cache
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL_REGEX:
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  PHONE_REGEX: /^\+?[\d\s\-()]+$/,
  PASSWORD_STRENGTH: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: false,
  },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ADVANCED_SEARCH: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_REAL_TIME_COLLABORATION: false, // Coming soon
  ENABLE_AI_ASSISTANT: false, // Coming soon
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_EXPORT_FUNCTIONALITY: true,
  ENABLE_IMPORT_FUNCTIONALITY: true,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    "Network connection failed. Please check your internet connection.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "Access to this resource is forbidden.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  SERVER_ERROR: "An unexpected error occurred. Please try again later.",
  FILE_TOO_LARGE: "File size exceeds the maximum allowed limit.",
  INVALID_FILE_TYPE: "File type is not supported.",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: "Changes saved successfully.",
  DELETE_SUCCESS: "Item deleted successfully.",
  UPLOAD_SUCCESS: "File uploaded successfully.",
  IMPORT_SUCCESS: "Data imported successfully.",
  EXPORT_SUCCESS: "Data exported successfully.",
} as const;
