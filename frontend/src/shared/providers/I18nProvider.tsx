/**
 * Internationalization Provider for React applications
 *
 * Provides i18n context with translation functions, locale management,
 * and formatting utilities for dates, numbers, and currencies.
 */

"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Direction,
  type I18nContextValue,
  type LocaleCode,
  type TranslateFunction,
  type TranslationOptions,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  flattenTranslations,
  getInitialLocale,
  getLocaleDirection,
  interpolate,
  pluralize,
  saveLocale,
} from "@/lib/i18n";

// Import default translations
import enUS from "@/lib/i18n/locales/en-US.json";

/**
 * I18n Context
 */
export const I18nContext = createContext<I18nContextValue | undefined>(
  undefined
);

/**
 * Props for I18nProvider
 */
interface I18nProviderProps {
  children: ReactNode;
  /** Initial locale (defaults to detected or saved locale) */
  initialLocale?: LocaleCode;
  /** Default currency for currency formatting */
  defaultCurrency?: string;
}

/**
 * Pre-flatten default translations for faster access
 */
const DEFAULT_TRANSLATIONS: Record<LocaleCode, Record<string, string>> = {
  "en-US": flattenTranslations(enUS),
  // Other locales will be loaded dynamically
  "en-GB": {},
  "es-ES": {},
  "fr-FR": {},
  "de-DE": {},
  "ar-SA": {},
  "zh-CN": {},
  "ja-JP": {},
  "pt-BR": {},
};

/**
 * I18n Provider Component
 *
 * Wraps the application to provide i18n context with translations,
 * locale switching, and formatting utilities.
 */
export function I18nProvider({
  children,
  initialLocale,
  defaultCurrency = "USD",
}: I18nProviderProps) {
  // Initialize locale from saved preference or browser detection
  const [locale, setLocaleState] = useState<LocaleCode>(
    initialLocale || DEFAULT_LOCALE
  );
  const [translations, setTranslations] = useState<Record<string, string>>(
    DEFAULT_TRANSLATIONS[DEFAULT_LOCALE]
  );
  const [isLoading, setIsLoading] = useState(false);

  // Detect and load initial locale on mount (client-side only)
  useEffect(() => {
    if (!initialLocale) {
      const detectedLocale = getInitialLocale();
      if (detectedLocale !== locale) {
        setLocaleState(detectedLocale);
      }
    }
  }, [initialLocale, locale]);

  // Load translations when locale changes
  useEffect(() => {
    const loadTranslationsForLocale = async () => {
      // Check if we already have translations cached
      if (
        DEFAULT_TRANSLATIONS[locale] &&
        Object.keys(DEFAULT_TRANSLATIONS[locale]).length > 0
      ) {
        setTranslations(DEFAULT_TRANSLATIONS[locale]);
        return;
      }

      setIsLoading(true);

      try {
        // Dynamic import for code splitting
        const translationModule = await import(
          `@/lib/i18n/locales/${locale}.json`
        );
        const flatTranslations = flattenTranslations(
          translationModule.default || translationModule
        );

        // Cache the translations
        DEFAULT_TRANSLATIONS[locale] = flatTranslations;
        setTranslations(flatTranslations);
      } catch (error) {
        console.warn(
          `Failed to load translations for ${locale}, using fallback`
        );
        // Fall back to default locale translations
        setTranslations(DEFAULT_TRANSLATIONS[FALLBACK_LOCALE]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslationsForLocale();

    // Update document attributes for RTL support
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = getLocaleDirection(locale);
    }
  }, [locale]);

  /**
   * Set the current locale
   */
  const setLocale = useCallback((newLocale: LocaleCode) => {
    const isSupported = SUPPORTED_LOCALES.some((l) => l.code === newLocale);
    if (isSupported) {
      setLocaleState(newLocale);
      saveLocale(newLocale);
    } else {
      console.warn(`Locale "${newLocale}" is not supported`);
    }
  }, []);

  /**
   * Translation function
   */
  const t: TranslateFunction = useCallback(
    (key: string, options?: TranslationOptions): string => {
      const { fallback, count, variables = {} } = options || {};

      // Handle pluralization
      if (count !== undefined) {
        const pluralTranslation = pluralize(translations, key, count);
        if (pluralTranslation) {
          return interpolate(pluralTranslation, { ...variables, count });
        }
      }

      // Get translation or fallback
      let translation = translations[key];

      if (!translation) {
        // Try fallback translations
        translation = DEFAULT_TRANSLATIONS[FALLBACK_LOCALE]?.[key];
      }

      if (!translation) {
        // Use provided fallback or key itself
        return fallback || key;
      }

      // Interpolate variables
      if (Object.keys(variables).length > 0 || count !== undefined) {
        return interpolate(translation, { ...variables, count: count ?? 0 });
      }

      return translation;
    },
    [translations]
  );

  /**
   * Get current direction
   */
  const direction: Direction = useMemo(
    () => getLocaleDirection(locale),
    [locale]
  );

  /**
   * Check if a locale is the current one
   */
  const isCurrentLocale = useCallback(
    (code: string) => code === locale,
    [locale]
  );

  /**
   * Format a date according to locale
   */
  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          ...options,
        }).format(date);
      } catch {
        return date.toLocaleDateString();
      }
    },
    [locale]
  );

  /**
   * Format a time according to locale
   */
  const formatTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        return new Intl.DateTimeFormat(locale, {
          timeStyle: "short",
          ...options,
        }).format(date);
      } catch {
        return date.toLocaleTimeString();
      }
    },
    [locale]
  );

  /**
   * Format a number according to locale
   */
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(locale, options).format(value);
      } catch {
        return value.toString();
      }
    },
    [locale]
  );

  /**
   * Format currency according to locale
   */
  const formatCurrency = useCallback(
    (value: number, currency: string = defaultCurrency): string => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
        }).format(value);
      } catch {
        return `${currency} ${value.toFixed(2)}`;
      }
    },
    [locale, defaultCurrency]
  );

  /**
   * Format relative time
   */
  const formatRelativeTime = useCallback(
    (date: Date): string => {
      try {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);
        const diffWeek = Math.round(diffDay / 7);
        const diffMonth = Math.round(diffDay / 30);
        const diffYear = Math.round(diffDay / 365);

        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

        if (Math.abs(diffSec) < 60) {
          return rtf.format(diffSec, "second");
        }
        if (Math.abs(diffMin) < 60) {
          return rtf.format(diffMin, "minute");
        }
        if (Math.abs(diffHour) < 24) {
          return rtf.format(diffHour, "hour");
        }
        if (Math.abs(diffDay) < 7) {
          return rtf.format(diffDay, "day");
        }
        if (Math.abs(diffWeek) < 4) {
          return rtf.format(diffWeek, "week");
        }
        if (Math.abs(diffMonth) < 12) {
          return rtf.format(diffMonth, "month");
        }
        return rtf.format(diffYear, "year");
      } catch {
        return date.toLocaleDateString();
      }
    },
    [locale]
  );

  /**
   * Context value
   */
  const contextValue: I18nContextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      direction,
      supportedLocales: SUPPORTED_LOCALES,
      isCurrentLocale,
      formatDate,
      formatTime,
      formatNumber,
      formatCurrency,
      formatRelativeTime,
      isLoading,
    }),
    [
      locale,
      setLocale,
      t,
      direction,
      isCurrentLocale,
      formatDate,
      formatTime,
      formatNumber,
      formatCurrency,
      formatRelativeTime,
      isLoading,
    ]
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

/**
 * Hook to use I18n context (alias for useTranslation)
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

// Re-export types
export type { I18nContextValue, LocaleCode, Direction };
