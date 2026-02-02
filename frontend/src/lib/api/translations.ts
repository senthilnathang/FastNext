/**
 * Translations API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Translation {
  id: number;
  lang: string;
  type: string;
  name: string;
  res_id?: number | null;
  source: string;
  value?: string | null;
  module_name?: string | null;
  state: string;
  comments?: string | null;
  is_translated: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  iso_code?: string | null;
  direction: string;
  date_format?: string | null;
  time_format?: string | null;
  decimal_separator: string;
  thousands_separator: string;
  is_active: boolean;
  is_default: boolean;
  translation_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TranslationListParams {
  lang?: string;
  type?: string;
  module_name?: string;
  state?: string;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedTranslations {
  items: Translation[];
  total: number;
}

export interface SetTranslationData {
  source: string;
  value?: string | null;
  lang: string;
  type?: string;
  name?: string;
  res_id?: number;
  module_name?: string;
  comments?: string;
}

export interface UpdateTranslationData {
  value?: string | null;
  comments?: string;
  state?: string;
}

export interface ImportTranslationData {
  module_name: string;
  file: File;
}

export interface BulkTranslationData {
  translations: SetTranslationData[];
  lang: string;
  module_name?: string;
}

export interface TranslationStats {
  lang: string;
  module_name?: string | null;
  total: number;
  translated: number;
  validated: number;
  to_translate: number;
  completion_rate: number;
}

export interface TranslateRequest {
  text: string;
  lang: string;
  type?: string;
  name?: string;
  res_id?: number;
}

export interface TranslateResponse {
  source: string;
  translation: string;
  lang: string;
}

export interface LanguageCreateData {
  code: string;
  name: string;
  iso_code?: string;
  direction?: string;
  date_format?: string;
  time_format?: string;
  decimal_separator?: string;
  thousands_separator?: string;
  is_default?: boolean;
}

export interface LanguageUpdateData {
  name?: string;
  direction?: string;
  date_format?: string;
  time_format?: string;
  decimal_separator?: string;
  thousands_separator?: string;
  is_active?: boolean;
  is_default?: boolean;
}

// API Functions
export const translationsApi = {
  /**
   * List translations with optional filters
   */
  list: (params?: TranslationListParams): Promise<Translation[]> =>
    apiClient.get("/api/v1/base/translations/", params),

  /**
   * Get a translation by ID
   */
  get: (translationId: number): Promise<Translation> =>
    apiClient.get(`/api/v1/base/translations/${translationId}`),

  /**
   * Create a new translation
   */
  set: (data: SetTranslationData): Promise<Translation> =>
    apiClient.post("/api/v1/base/translations/", data),

  /**
   * Update a translation
   */
  update: (translationId: number, data: UpdateTranslationData): Promise<Translation> =>
    apiClient.put(`/api/v1/base/translations/${translationId}`, data),

  /**
   * Delete a translation
   */
  delete: (translationId: number): Promise<void> =>
    apiClient.delete(`/api/v1/base/translations/${translationId}`),

  /**
   * Validate a translation (mark as validated)
   */
  validate: (translationId: number): Promise<Translation> =>
    apiClient.post(`/api/v1/base/translations/${translationId}/validate`),

  /**
   * Translate text (simple API)
   */
  translate: (data: TranslateRequest): Promise<TranslateResponse> =>
    apiClient.post("/api/v1/base/translations/translate", data),

  /**
   * Bulk create/update translations
   */
  bulkSet: (data: BulkTranslationData): Promise<{ created: number; updated: number }> =>
    apiClient.post("/api/v1/base/translations/bulk", data),

  /**
   * Import translations from file for a language
   * Note: This endpoint expects multipart form data with a file upload.
   * The apiClient JSON methods won't work directly; use fetch for file uploads.
   */
  importTranslations: (lang: string, moduleName: string, file: File): Promise<{
    success: boolean;
    lang: string;
    module_name: string;
    created: number;
    updated: number;
  }> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/base/translations/import/${lang}?module_name=${encodeURIComponent(moduleName)}`,
      {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      }
    ).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw { detail: err.detail || "Import failed", status: res.status };
      }
      return res.json();
    });
  },

  /**
   * Export translations for a module in JSON or PO format
   */
  exportTranslations: (moduleName: string, lang: string, params?: {
    format?: "json" | "po";
    include_untranslated?: boolean;
  }): Promise<string> =>
    apiClient.get(`/api/v1/base/translations/export/${moduleName}/${lang}`, params),

  /**
   * Get all translations for a module
   */
  getModuleTranslations: (moduleName: string, params: { lang: string }): Promise<Translation[]> =>
    apiClient.get(`/api/v1/base/translations/module/${moduleName}`, params),

  /**
   * Delete all translations for a module
   */
  deleteModuleTranslations: (moduleName: string, params?: { lang?: string }): Promise<void> =>
    apiClient.delete(`/api/v1/base/translations/module/${moduleName}`),

  /**
   * Get model translations for a record
   */
  getModelTranslations: (modelName: string, resId: number, params: { lang: string }): Promise<Record<string, string>> =>
    apiClient.get(`/api/v1/base/translations/model/${modelName}/${resId}`, params),

  /**
   * Delete all translations for a record
   */
  deleteRecordTranslations: (modelName: string, resId: number): Promise<void> =>
    apiClient.delete(`/api/v1/base/translations/model/${modelName}/${resId}`),

  /**
   * Get translation statistics for a language
   */
  getStats: (lang: string, params?: { module_name?: string }): Promise<TranslationStats> =>
    apiClient.get(`/api/v1/base/translations/stats/${lang}`, params),

  /**
   * Get untranslated entries for a language
   */
  getUntranslated: (lang: string, params?: {
    module_name?: string;
    type?: string;
    limit?: number;
  }): Promise<Translation[]> =>
    apiClient.get(`/api/v1/base/translations/untranslated/${lang}`, params),

  // --- Language endpoints ---

  /**
   * List all languages
   */
  listLanguages: (params?: { active_only?: boolean }): Promise<Language[]> =>
    apiClient.get("/api/v1/base/translations/languages/", params),

  /**
   * Get a language by code
   */
  getLanguage: (code: string): Promise<Language> =>
    apiClient.get(`/api/v1/base/translations/languages/${code}`),

  /**
   * Create a new language
   */
  createLanguage: (data: LanguageCreateData): Promise<Language> =>
    apiClient.post("/api/v1/base/translations/languages/", data),

  /**
   * Update a language
   */
  updateLanguage: (code: string, data: LanguageUpdateData): Promise<Language> =>
    apiClient.put(`/api/v1/base/translations/languages/${code}`, data),

  /**
   * Delete a language
   */
  deleteLanguage: (code: string): Promise<void> =>
    apiClient.delete(`/api/v1/base/translations/languages/${code}`),

  /**
   * Get list of translation types
   */
  getTypes: (): Promise<string[]> =>
    apiClient.get("/api/v1/base/translations/types/"),

  /**
   * Get list of translation states
   */
  getStates: (): Promise<string[]> =>
    apiClient.get("/api/v1/base/translations/states/"),
};

export default translationsApi;
