/**
 * Exports API Client
 * Handles module export/import operations, data exports, and templates
 */

import { apiClient } from "./client";

// Types
export interface ExportHistory {
  id: string;
  module_name: string;
  type: string;
  file_path: string;
  status: string;
  created_at: string;
}

export interface ImportInfo {
  id: string;
  module_name: string;
  file_name: string;
  status: string;
  validation_result: Record<string, unknown> | null;
  created_at: string;
}

export interface ExportTemplate {
  id: string;
  code: string;
  name: string;
  model_name: string;
  fields: string[];
  filters: Record<string, unknown>;
  format: string;
  created_at: string;
}

// API Functions
export const exportsApi = {
  /**
   * Export module as ZIP
   */
  exportModule: (moduleName: string): Promise<{ success: boolean; file_path: string }> =>
    apiClient.post(`/api/v1/base/exports/modules/${moduleName}`),

  /**
   * Download module ZIP
   */
  downloadModule: (moduleName: string): Promise<Blob> =>
    apiClient.get(`/api/v1/base/exports/modules/${moduleName}/download`),

  /**
   * Export module data as JSON
   */
  exportData: (moduleName: string): Promise<{ success: boolean; file_path: string }> =>
    apiClient.post(`/api/v1/base/exports/modules/${moduleName}/data`),

  /**
   * List export history
   */
  getHistory: (): Promise<ExportHistory[]> =>
    apiClient.get("/api/v1/base/exports/history"),

  // Import operations
  imports: {
    /**
     * Upload module ZIP for import
     */
    upload: (data: FormData): Promise<ImportInfo> =>
      apiClient.post("/api/v1/base/exports/import", data),

    /**
     * Execute a pending import
     */
    execute: (importId: string): Promise<{ success: boolean; message: string }> =>
      apiClient.post(`/api/v1/base/exports/import/${importId}/execute`),

    /**
     * Rollback an import
     */
    rollback: (importId: string): Promise<{ success: boolean; message: string }> =>
      apiClient.post(`/api/v1/base/exports/import/${importId}/rollback`),

    /**
     * Get import details
     */
    get: (importId: string): Promise<ImportInfo> =>
      apiClient.get(`/api/v1/base/exports/import/${importId}`),

    /**
     * List import history
     */
    list: (): Promise<ImportInfo[]> =>
      apiClient.get("/api/v1/base/exports/imports"),

    /**
     * Import data from JSON
     */
    importData: (data: unknown): Promise<{ success: boolean; records_imported: number }> =>
      apiClient.post("/api/v1/base/exports/data/import", data),
  },

  // Templates
  templates: {
    /**
     * List data export templates
     */
    list: (): Promise<ExportTemplate[]> =>
      apiClient.get("/api/v1/base/exports/templates"),

    /**
     * Get template by code
     */
    get: (code: string): Promise<ExportTemplate> =>
      apiClient.get(`/api/v1/base/exports/templates/${code}`),

    /**
     * Create export template
     */
    create: (data: Omit<ExportTemplate, "id" | "created_at">): Promise<ExportTemplate> =>
      apiClient.post("/api/v1/base/exports/templates", data),

    /**
     * Execute template
     */
    execute: (code: string): Promise<{ success: boolean; file_path: string }> =>
      apiClient.post(`/api/v1/base/exports/templates/${code}/execute`),

    /**
     * Delete template
     */
    delete: (code: string): Promise<void> =>
      apiClient.delete(`/api/v1/base/exports/templates/${code}`),
  },
};

export default exportsApi;
