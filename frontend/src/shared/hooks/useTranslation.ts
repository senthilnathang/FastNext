/**
 * Internationalization hook for React components
 */

import { useCallback, useContext } from "react";
import { I18nContext } from "../providers/I18nProvider";

export interface TranslationOptions {
  locale?: string;
  fallback?: string;
  count?: number;
}

export const useTranslation = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }

  const {
    locale,
    setLocale,
    t,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
  } = context;

  const translate = useCallback(
    (
      key: string,
      options: TranslationOptions = {},
      variables: Record<string, any> = {},
    ) => {
      const { count, ...translateOptions } = options;

      if (count !== undefined) {
        // Handle pluralization
        return t(key, { ...translateOptions, count }, { ...variables, count });
      }

      return t(key, translateOptions, variables);
    },
    [t],
  );

  return {
    t: translate,
    locale,
    setLocale,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    // Convenience methods
    changeLanguage: setLocale,
    currentLanguage: locale,
  };
};

// Convenience hook for common translations
export const useCommonTranslations = () => {
  const { t } = useTranslation();

  return {
    save: t("common.save"),
    cancel: t("common.cancel"),
    delete: t("common.delete"),
    edit: t("common.edit"),
    view: t("common.view"),
    create: t("common.create"),
    search: t("common.search"),
    loading: t("common.loading"),
    error: t("common.error"),
    success: t("common.success"),
    warning: t("common.warning"),
    info: t("common.info"),
  };
};

// Hook for form validation messages
export const useValidationTranslations = () => {
  const { t } = useTranslation();

  return {
    required: t("validation.required"),
    email: t("validation.email"),
    minLength: (min: number) => t("validation.min_length", {}, { min }),
    maxLength: (max: number) => t("validation.max_length", {}, { max }),
  };
};

// Hook for pagination
export const usePaginationTranslations = () => {
  const { t } = useTranslation();

  return {
    previous: t("pagination.previous"),
    next: t("pagination.next"),
    showing: (start: number, end: number, total: number) =>
      t("pagination.showing", {}, { start, end, total }),
  };
};
