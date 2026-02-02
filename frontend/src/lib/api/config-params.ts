/**
 * Config Parameters API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface ConfigParameter {
  id: number;
  key: string;
  value?: string | null;
  typed_value?: unknown;
  value_type: string;
  module_name?: string | null;
  description?: string | null;
  is_system: boolean;
  company_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ConfigListParams {
  module_name?: string;
  company_id?: number;
  include_system?: boolean;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedConfigs {
  items: ConfigParameter[];
  total: number;
}

export interface SetConfigData {
  key: string;
  value?: unknown;
  value_type?: string;
  module_name?: string;
  description?: string;
  company_id?: number;
  is_system?: boolean;
}

export interface UpdateConfigData {
  value?: unknown;
  description?: string;
}

export interface ConfigValueResponse {
  key: string;
  value: unknown;
}

export interface BulkConfigUpdate {
  parameters: Record<string, unknown>;
  module_name?: string;
  company_id?: number;
}

// API Functions
export const configParamsApi = {
  /**
   * List all configuration parameters with optional filters
   */
  list: (params?: ConfigListParams): Promise<ConfigParameter[]> =>
    apiClient.get("/api/v1/base/config/", params),

  /**
   * Get a configuration parameter by key (full object)
   */
  get: (key: string, params?: { company_id?: number }): Promise<ConfigParameter> =>
    apiClient.get(`/api/v1/base/config/${key}`, params),

  /**
   * Get a configuration parameter value by key (simple key-value)
   */
  getByKey: (key: string, params?: { default?: string; company_id?: number }): Promise<ConfigValueResponse> =>
    apiClient.get(`/api/v1/base/config/value/${key}`, params),

  /**
   * Create a new configuration parameter
   */
  set: (data: SetConfigData): Promise<ConfigParameter> =>
    apiClient.post("/api/v1/base/config/", data),

  /**
   * Update a configuration parameter
   */
  update: (key: string, data: UpdateConfigData, params?: { company_id?: number }): Promise<ConfigParameter> =>
    apiClient.put(`/api/v1/base/config/${key}`, data),

  /**
   * Delete a configuration parameter
   */
  delete: (key: string, params?: { company_id?: number }): Promise<void> =>
    apiClient.delete(`/api/v1/base/config/${key}`),

  /**
   * Get all configuration for a module as key-value map
   */
  getModuleConfig: (moduleName: string, params?: { company_id?: number }): Promise<Record<string, unknown>> =>
    apiClient.get(`/api/v1/base/config/module/${moduleName}`, params),

  /**
   * Initialize module configuration from defaults
   */
  initModuleConfig: (moduleName: string, defaults: Record<string, Record<string, unknown>>): Promise<ConfigParameter[]> =>
    apiClient.post(`/api/v1/base/config/module/${moduleName}/init`, defaults),

  /**
   * Set multiple configuration parameters at once
   */
  bulkSet: (data: BulkConfigUpdate): Promise<ConfigParameter[]> =>
    apiClient.post("/api/v1/base/config/bulk", data),

  /**
   * Get list of supported value types
   */
  getValueTypes: (): Promise<string[]> =>
    apiClient.get("/api/v1/base/config/types/"),
};

export default configParamsApi;
