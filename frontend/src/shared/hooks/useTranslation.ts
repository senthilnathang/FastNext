/**
 * Internationalization hook for React components
 *
 * Provides translation functions and locale management for components.
 * Integrates with the I18nProvider context.
 */

"use client";

import { useCallback, useContext, useMemo } from "react";
import { I18nContext } from "../providers/I18nProvider";
import type {
  LocaleCode,
  TranslationKey,
  TranslationOptions,
  TranslationVariables,
} from "@/lib/i18n";

/**
 * Hook for accessing i18n functionality
 */
export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }

  const {
    locale,
    setLocale,
    t,
    direction,
    supportedLocales,
    isCurrentLocale,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    isLoading,
  } = context;

  /**
   * Translate a key with optional variables
   */
  const translate = useCallback(
    (
      key: TranslationKey,
      options?: TranslationOptions | TranslationVariables
    ): string => {
      // Handle legacy API where second param was variables directly
      if (options && !("fallback" in options) && !("count" in options) && !("variables" in options)) {
        return t(key, { variables: options as TranslationVariables });
      }
      return t(key, options);
    },
    [t]
  );

  /**
   * Change the current language
   */
  const changeLanguage = useCallback(
    (newLocale: LocaleCode) => {
      setLocale(newLocale);
    },
    [setLocale]
  );

  /**
   * Get the current language code (short form)
   */
  const language = useMemo(() => locale.split("-")[0], [locale]);

  /**
   * Check if current direction is RTL
   */
  const isRTL = useMemo(() => direction === "rtl", [direction]);

  return {
    // Core translation
    t: translate,
    locale,
    language,

    // Locale management
    setLocale,
    changeLanguage,
    supportedLocales,
    isCurrentLocale,

    // Direction
    direction,
    isRTL,

    // Formatting
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,

    // State
    isLoading,

    // Legacy aliases
    currentLanguage: locale,
  };
}

/**
 * Convenience hook for common translations
 */
export function useCommonTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      save: t("common.save"),
      cancel: t("common.cancel"),
      delete: t("common.delete"),
      edit: t("common.edit"),
      view: t("common.view"),
      create: t("common.create"),
      add: t("common.add"),
      remove: t("common.remove"),
      update: t("common.update"),
      search: t("common.search"),
      filter: t("common.filter"),
      loading: t("common.loading"),
      error: t("common.error"),
      success: t("common.success"),
      warning: t("common.warning"),
      info: t("common.info"),
      yes: t("common.yes"),
      no: t("common.no"),
      ok: t("common.ok"),
      close: t("common.close"),
      confirm: t("common.confirm"),
      submit: t("common.submit"),
      back: t("common.back"),
      next: t("common.next"),
      previous: t("common.previous"),
      noData: t("common.noData"),
      noResults: t("common.noResults"),
      tryAgain: t("common.tryAgain"),
    }),
    [t]
  );
}

/**
 * Hook for form validation messages
 */
export function useValidationTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      required: t("validation.required"),
      email: t("validation.email"),
      minLength: (min: number) => t("validation.minLength", { variables: { min } }),
      maxLength: (max: number) => t("validation.maxLength", { variables: { max } }),
      min: (min: number) => t("validation.min", { variables: { min } }),
      max: (max: number) => t("validation.max", { variables: { max } }),
      pattern: t("validation.pattern"),
      match: t("validation.match"),
      unique: t("validation.unique"),
      numeric: t("validation.numeric"),
      url: t("validation.url"),
      phone: t("validation.phone"),
      date: t("validation.date"),
      invalidInput: t("validation.invalidInput"),
      formErrors: t("validation.formErrors"),
    }),
    [t]
  );
}

/**
 * Hook for pagination translations
 */
export function usePaginationTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      previous: t("pagination.previous"),
      next: t("pagination.next"),
      first: t("pagination.first"),
      last: t("pagination.last"),
      page: t("pagination.page"),
      of: t("pagination.of"),
      showing: (start: number, end: number, total: number) =>
        t("pagination.showing", { variables: { start, end, total } }),
      itemsPerPage: t("pagination.itemsPerPage"),
      goToPage: t("pagination.goToPage"),
    }),
    [t]
  );
}

/**
 * Hook for auth-related translations
 */
export function useAuthTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      login: t("auth.login"),
      logout: t("auth.logout"),
      signUp: t("auth.signUp"),
      signIn: t("auth.signIn"),
      signOut: t("auth.signOut"),
      register: t("auth.register"),
      forgotPassword: t("auth.forgotPassword"),
      resetPassword: t("auth.resetPassword"),
      email: t("auth.email"),
      password: t("auth.password"),
      rememberMe: t("auth.rememberMe"),
      createAccount: t("auth.createAccount"),
      sessionExpired: t("auth.sessionExpired"),
      invalidCredentials: t("auth.invalidCredentials"),
      welcomeBack: t("auth.welcomeBack"),
      profile: t("auth.profile"),
      myAccount: t("auth.myAccount"),
    }),
    [t]
  );
}

/**
 * Hook for navigation translations
 */
export function useNavigationTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      home: t("navigation.home"),
      dashboard: t("navigation.dashboard"),
      profile: t("navigation.profile"),
      settings: t("navigation.settings"),
      help: t("navigation.help"),
      support: t("navigation.support"),
      documentation: t("navigation.documentation"),
      about: t("navigation.about"),
      contact: t("navigation.contact"),
      goBack: t("navigation.goBack"),
      goHome: t("navigation.goHome"),
    }),
    [t]
  );
}

/**
 * Hook for error translations
 */
export function useErrorTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      general: t("errors.general"),
      notFound: t("errors.notFound"),
      pageNotFound: t("errors.pageNotFound"),
      unauthorized: t("errors.unauthorized"),
      forbidden: t("errors.forbidden"),
      serverError: t("errors.serverError"),
      networkError: t("errors.networkError"),
      timeout: t("errors.timeout"),
      tryAgain: t("errors.tryAgain"),
      somethingWentWrong: t("errors.somethingWentWrong"),
      connectionLost: t("errors.connectionLost"),
      sessionExpired: t("errors.sessionExpired"),
    }),
    [t]
  );
}

/**
 * Hook for table translations
 */
export function useTableTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      noData: t("table.noData"),
      loading: t("table.loading"),
      search: t("table.search"),
      filter: t("table.filter"),
      sort: t("table.sort"),
      columns: t("table.columns"),
      actions: t("table.actions"),
      selectRow: t("table.selectRow"),
      selectAll: t("table.selectAll"),
      selectedRows: (count: number) =>
        t("table.selectedRows", { variables: { count } }),
      rowsPerPage: t("table.rowsPerPage"),
    }),
    [t]
  );
}

/**
 * Hook for time-related translations
 */
export function useTimeTranslations() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      justNow: t("time.justNow"),
      minutesAgo: (count: number) =>
        t("time.minutesAgo", { variables: { count } }),
      hoursAgo: (count: number) =>
        t("time.hoursAgo", { variables: { count } }),
      daysAgo: (count: number) =>
        t("time.daysAgo", { variables: { count } }),
      today: t("time.today"),
      yesterday: t("time.yesterday"),
      tomorrow: t("time.tomorrow"),
      thisWeek: t("time.thisWeek"),
      lastWeek: t("time.lastWeek"),
      thisMonth: t("time.thisMonth"),
      lastMonth: t("time.lastMonth"),
    }),
    [t]
  );
}

// Export types
export type { TranslationKey, TranslationOptions, TranslationVariables };
