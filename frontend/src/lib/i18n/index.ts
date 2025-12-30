/**
 * Internationalization (i18n) Configuration
 *
 * Provides comprehensive i18n support for the FastNext application
 * with language detection, locale switching, and translation management.
 */

import type { ReactNode } from "react";

// Supported locales configuration
export const SUPPORTED_LOCALES = [
  { code: "en-US", name: "English (US)", flag: "us", direction: "ltr" as const },
  { code: "en-GB", name: "English (UK)", flag: "gb", direction: "ltr" as const },
  { code: "es-ES", name: "Espanol", flag: "es", direction: "ltr" as const },
  { code: "fr-FR", name: "Francais", flag: "fr", direction: "ltr" as const },
  { code: "de-DE", name: "Deutsch", flag: "de", direction: "ltr" as const },
  { code: "ar-SA", name: "Arabic", flag: "sa", direction: "rtl" as const },
  { code: "zh-CN", name: "Chinese (Simplified)", flag: "cn", direction: "ltr" as const },
  { code: "ja-JP", name: "Japanese", flag: "jp", direction: "ltr" as const },
  { code: "pt-BR", name: "Portuguese (Brazil)", flag: "br", direction: "ltr" as const },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];
export type Direction = "ltr" | "rtl";

export const DEFAULT_LOCALE: LocaleCode = "en-US";
export const FALLBACK_LOCALE: LocaleCode = "en-US";

// Locale storage key for persistence
export const LOCALE_STORAGE_KEY = "fastnext-locale";

/**
 * Get locale info by code
 */
export function getLocaleInfo(code: string) {
  return SUPPORTED_LOCALES.find((locale) => locale.code === code);
}

/**
 * Get direction for a locale
 */
export function getLocaleDirection(code: string): Direction {
  const locale = getLocaleInfo(code);
  return locale?.direction ?? "ltr";
}

/**
 * Check if locale is RTL
 */
export function isRTL(code: string): boolean {
  return getLocaleDirection(code) === "rtl";
}

/**
 * Detect browser locale
 */
export function detectBrowserLocale(): LocaleCode {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const browserLocales = navigator.languages || [navigator.language];

  for (const browserLocale of browserLocales) {
    // Try exact match first
    const exactMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.code.toLowerCase() === browserLocale.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.code;
    }

    // Try language-only match (e.g., "en" matches "en-US")
    const languageCode = browserLocale.split("-")[0].toLowerCase();
    const languageMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.code.split("-")[0].toLowerCase() === languageCode
    );
    if (languageMatch) {
      return languageMatch.code;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Get saved locale from storage
 */
export function getSavedLocale(): LocaleCode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
      return saved as LocaleCode;
    }
  } catch {
    // Ignore localStorage errors
  }

  return null;
}

/**
 * Save locale to storage
 */
export function saveLocale(code: LocaleCode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get initial locale based on saved preference or browser detection
 */
export function getInitialLocale(): LocaleCode {
  const saved = getSavedLocale();
  if (saved) {
    return saved;
  }

  return detectBrowserLocale();
}

/**
 * Translation key path type for type-safe translations
 */
export type TranslationKey = string;

/**
 * Translation interpolation variables
 */
export type TranslationVariables = Record<string, string | number>;

/**
 * Translation options
 */
export interface TranslationOptions {
  /** Fallback text if translation is not found */
  fallback?: string;
  /** Count for pluralization */
  count?: number;
  /** Variables for interpolation */
  variables?: TranslationVariables;
}

/**
 * Translation function type
 */
export type TranslateFunction = (
  key: TranslationKey,
  options?: TranslationOptions
) => string;

/**
 * I18n context value type
 */
export interface I18nContextValue {
  /** Current locale code */
  locale: LocaleCode;
  /** Set the current locale */
  setLocale: (locale: LocaleCode) => void;
  /** Translation function */
  t: TranslateFunction;
  /** Current text direction */
  direction: Direction;
  /** List of supported locales */
  supportedLocales: typeof SUPPORTED_LOCALES;
  /** Check if a locale is the current one */
  isCurrentLocale: (code: string) => boolean;
  /** Format a date according to locale */
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  /** Format a time according to locale */
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  /** Format a number according to locale */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Format currency according to locale */
  formatCurrency: (value: number, currency?: string) => string;
  /** Format relative time */
  formatRelativeTime: (date: Date) => string;
  /** Whether translations are loading */
  isLoading: boolean;
}

/**
 * Load translations for a locale
 */
export async function loadTranslations(
  locale: LocaleCode
): Promise<Record<string, string>> {
  try {
    // Dynamic import for code splitting
    const translations = await import(`./locales/${locale}.json`);
    return flattenTranslations(translations.default || translations);
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}, falling back to ${FALLBACK_LOCALE}`);

    if (locale !== FALLBACK_LOCALE) {
      try {
        const fallbackTranslations = await import(`./locales/${FALLBACK_LOCALE}.json`);
        return flattenTranslations(fallbackTranslations.default || fallbackTranslations);
      } catch {
        console.error("Failed to load fallback translations");
        return {};
      }
    }

    return {};
  }
}

/**
 * Flatten nested translation object to dot-notation keys
 */
export function flattenTranslations(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(
        result,
        flattenTranslations(value as Record<string, unknown>, fullKey)
      );
    }
  }

  return result;
}

/**
 * Interpolate variables in translation string
 */
export function interpolate(
  template: string,
  variables: TranslationVariables
): string {
  return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key) => {
    return key in variables ? String(variables[key]) : match;
  });
}

/**
 * Handle pluralization
 */
export function pluralize(
  translations: Record<string, string>,
  key: string,
  count: number
): string | undefined {
  // Check for specific plural forms
  const pluralRules = new Intl.PluralRules();
  const pluralForm = pluralRules.select(count);

  // Try specific plural key first (e.g., "items.other", "items.one")
  const pluralKey = `${key}.${pluralForm}`;
  if (translations[pluralKey]) {
    return translations[pluralKey];
  }

  // Try count-based keys
  if (count === 0 && translations[`${key}.zero`]) {
    return translations[`${key}.zero`];
  }
  if (count === 1 && translations[`${key}.one`]) {
    return translations[`${key}.one`];
  }
  if (translations[`${key}.other`]) {
    return translations[`${key}.other`];
  }

  return undefined;
}

// Re-export types and utilities
export type { ReactNode };
