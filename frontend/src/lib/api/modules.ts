/**
 * Modules API Client
 * Handles module management operations
 */

import { apiClient } from "./client";

// Types
export type ModuleState = "uninstalled" | "installed" | "to_install" | "to_upgrade" | "to_remove";

export interface ModuleManifest {
  name: string;
  display_name?: string;
  version: string;
  summary?: string;
  description?: string;
  author?: string;
  website?: string;
  license?: string;
  category?: string;
  depends?: string[];
  data?: string[];
  demo?: string[];
  assets?: {
    css?: string[];
    js?: string[];
  };
  installable?: boolean;
  auto_install?: boolean;
  application?: boolean;
  icon?: string;
}

export interface InstalledModule {
  id: number;
  name: string;
  display_name: string;
  version: string;
  summary: string | null;
  description: string | null;
  author: string | null;
  website: string | null;
  license: string | null;
  category: string | null;
  state: ModuleState;
  installed_version: string | null;
  latest_version: string | null;
  depends: string[];
  application: boolean;
  auto_install: boolean;
  icon: string | null;
  manifest: ModuleManifest;
  installed_at: string | null;
  updated_at: string | null;
  load_order: number;
  is_core: boolean;
}

export interface ModuleListParams {
  state?: ModuleState;
  category?: string;
  application?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface ModuleInstallResult {
  success: boolean;
  module_name: string;
  action: "install" | "upgrade" | "uninstall";
  message: string;
  installed_dependencies?: string[];
  errors?: string[];
}

export interface ModuleActionParams {
  force?: boolean;
  skip_dependencies?: boolean;
}

export interface PaginatedModules {
  items: InstalledModule[];
  total: number;
  skip: number;
  limit: number;
}

export interface ModuleCategory {
  name: string;
  display_name: string;
  module_count: number;
}

export interface ModuleMenuItem {
  title: string;
  href: string;
  icon?: string;
  parent?: string;
  order?: number;
  permission?: string;
  module: string;
}

export interface ModuleDependencyTree {
  module: string;
  version: string;
  dependencies: ModuleDependencyTree[];
  dependents?: ModuleDependencyTree[];
}

// API Functions
export const modulesApi = {
  /**
   * List all modules
   */
  list: (params?: ModuleListParams): Promise<PaginatedModules> =>
    apiClient.get("/api/v1/modules", params),

  /**
   * Get a single module by name
   */
  get: (name: string): Promise<InstalledModule> =>
    apiClient.get(`/api/v1/modules/${name}`),

  /**
   * Get module manifest
   */
  getManifest: (name: string): Promise<ModuleManifest> =>
    apiClient.get(`/api/v1/modules/${name}/manifest`),

  /**
   * Install a module
   */
  install: (name: string, params?: ModuleActionParams): Promise<ModuleInstallResult> =>
    apiClient.post(`/api/v1/modules/${name}/install`, params),

  /**
   * Upgrade a module
   */
  upgrade: (name: string, params?: ModuleActionParams): Promise<ModuleInstallResult> =>
    apiClient.post(`/api/v1/modules/${name}/upgrade`, params),

  /**
   * Uninstall a module
   */
  uninstall: (name: string, params?: ModuleActionParams): Promise<ModuleInstallResult> =>
    apiClient.post(`/api/v1/modules/${name}/uninstall`, params),

  /**
   * Refresh module list (discover new modules)
   */
  refresh: (): Promise<{ discovered: number; updated: number }> =>
    apiClient.post("/api/v1/modules/refresh"),

  /**
   * Get available updates
   */
  getUpdates: (): Promise<InstalledModule[]> =>
    apiClient.get("/api/v1/modules/updates"),

  /**
   * Get menu items from installed modules
   */
  getMenuItems: (): Promise<ModuleMenuItem[]> =>
    apiClient.get("/api/v1/modules/installed/menus"),

  /**
   * Apply all pending module operations
   */
  applyPending: (): Promise<ModuleInstallResult[]> =>
    apiClient.post("/api/v1/modules/apply"),

  // Categories
  categories: {
    /**
     * List module categories
     */
    list: (): Promise<ModuleCategory[]> =>
      apiClient.get("/api/v1/modules/categories"),

    /**
     * Get modules by category
     */
    getModules: (category: string): Promise<InstalledModule[]> =>
      apiClient.get(`/api/v1/modules/categories/${category}/modules`),
  },

  // Dependencies
  dependencies: {
    /**
     * Get module dependency tree
     */
    getTree: (name: string): Promise<ModuleDependencyTree> =>
      apiClient.get(`/api/v1/modules/${name}/dependencies`),

    /**
     * Get modules that depend on this module
     */
    getDependents: (name: string): Promise<InstalledModule[]> =>
      apiClient.get(`/api/v1/modules/${name}/dependents`),

    /**
     * Check if module can be uninstalled
     */
    canUninstall: (name: string): Promise<{ can_uninstall: boolean; blockers?: string[] }> =>
      apiClient.get(`/api/v1/modules/${name}/can-uninstall`),
  },

  // Configuration
  config: {
    /**
     * Get module configuration
     */
    get: (name: string): Promise<Record<string, unknown>> =>
      apiClient.get(`/api/v1/modules/${name}/config`),

    /**
     * Update module configuration
     */
    update: (name: string, config: Record<string, unknown>): Promise<Record<string, unknown>> =>
      apiClient.patch(`/api/v1/modules/${name}/config`, config),

    /**
     * Reset module configuration to defaults
     */
    reset: (name: string): Promise<Record<string, unknown>> =>
      apiClient.post(`/api/v1/modules/${name}/config/reset`),
  },

  // Actions
  actions: {
    /**
     * Get scheduled actions for a module
     */
    getScheduled: (name: string): Promise<ScheduledAction[]> =>
      apiClient.get(`/api/v1/modules/${name}/scheduled-actions`),

    /**
     * Get server actions for a module
     */
    getServer: (name: string): Promise<ServerAction[]> =>
      apiClient.get(`/api/v1/modules/${name}/server-actions`),

    /**
     * Run a scheduled action manually
     */
    runScheduled: (actionCode: string): Promise<{ success: boolean; result?: unknown; error?: string }> =>
      apiClient.post(`/api/v1/scheduled-actions/${actionCode}/run`),
  },

  // Sequences
  sequences: {
    /**
     * Get sequences for a module
     */
    list: (moduleName?: string): Promise<Sequence[]> =>
      apiClient.get("/api/v1/sequences", moduleName ? { module_name: moduleName } : undefined),

    /**
     * Get next sequence number
     */
    getNext: (code: string): Promise<{ next_number: string }> =>
      apiClient.get(`/api/v1/sequences/${code}/next`),

    /**
     * Preview next sequence number without consuming
     */
    preview: (code: string): Promise<{ preview: string }> =>
      apiClient.get(`/api/v1/sequences/${code}/preview`),
  },
};

// Additional types for module features
export interface ScheduledAction {
  id: number;
  code: string;
  name: string;
  method_name: string;
  model_name: string | null;
  module_name: string | null;
  interval_number: number;
  interval_type: "minutes" | "hours" | "days" | "weeks" | "months";
  cron_expression: string | null;
  next_run: string;
  last_run: string | null;
  last_run_status: string | null;
  last_run_duration: number | null;
  is_active: boolean;
  priority: number;
}

export interface ServerAction {
  id: number;
  code: string;
  name: string;
  action_type: string;
  model_name: string | null;
  module_name: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Sequence {
  id: number;
  code: string;
  name: string;
  prefix: string | null;
  suffix: string | null;
  padding: number;
  next_number: number;
  step: number;
  module_name: string | null;
  model_name: string | null;
  is_active: boolean;
}

export default modulesApi;
