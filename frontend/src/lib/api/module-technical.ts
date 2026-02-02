/**
 * Module Technical API Client
 * Handles module technical information, models, views, routes, and services
 */

import { apiClient } from "./client";

// Types
export interface ModuleTechnicalInfo {
  name: string;
  models_count: number;
  views_count: number;
  routes_count: number;
  services_count: number;
  dependencies: string[];
}

export interface ModelField {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key: string | null;
}

export interface ModelInfo {
  name: string;
  table_name: string;
  fields: ModelField[];
  relationships: string[];
}

export interface ModuleView {
  name: string;
  type: string;
  model: string | null;
  template: string | null;
}

export interface ModuleRoute {
  method: string;
  path: string;
  description: string;
  tags: string[];
}

export interface ModuleService {
  name: string;
  methods: string[];
}

export interface ModuleStatistics {
  total_files: number;
  total_lines: number;
  python_files: number;
  python_lines: number;
}

export interface ModuleAssets {
  css: string[];
  js: string[];
  images: string[];
  templates: string[];
}

// API Functions
export const moduleTechnicalApi = {
  /**
   * Get technical info for a module
   */
  getTechnicalInfo: (moduleName: string): Promise<ModuleTechnicalInfo> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/technical`),

  /**
   * Get module models
   */
  getModels: (moduleName: string): Promise<ModelInfo[]> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/models`),

  /**
   * Get model details
   */
  getModelDetails: (moduleName: string, modelName: string): Promise<ModelInfo> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/models/${modelName}`),

  /**
   * Get module views
   */
  getViews: (moduleName: string): Promise<ModuleView[]> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/views`),

  /**
   * Get module API routes
   */
  getRoutes: (moduleName: string): Promise<ModuleRoute[]> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/routes`),

  /**
   * Get module services
   */
  getServices: (moduleName: string): Promise<ModuleService[]> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/services`),

  /**
   * Get code statistics for a module
   */
  getStatistics: (moduleName: string): Promise<ModuleStatistics> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/statistics`),

  /**
   * Get assets info for a module
   */
  getAssets: (moduleName: string): Promise<ModuleAssets> =>
    apiClient.get(`/api/v1/base/modules/${moduleName}/assets`),
};

export default moduleTechnicalApi;
