/**
 * Module System Types
 *
 * TypeScript interfaces for the FastNext dynamic module system.
 * Adapted from FastVue module patterns for React/Next.js.
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * Module status enum for tracking module lifecycle
 */
export enum ModuleStatus {
  /** Module is not yet loaded */
  IDLE = 'idle',
  /** Module is currently being loaded */
  LOADING = 'loading',
  /** Module has been successfully loaded */
  LOADED = 'loaded',
  /** Module failed to load */
  ERROR = 'error',
  /** Module is being unloaded */
  UNLOADING = 'unloading',
  /** Module has been unloaded */
  UNLOADED = 'unloaded',
}

/**
 * Module state from backend
 */
export type ModuleState =
  | 'installed'
  | 'uninstalled'
  | 'to_install'
  | 'to_upgrade'
  | 'to_remove';

/**
 * Module manifest - describes module package metadata
 */
export interface ModuleManifest {
  /** Technical module name (unique identifier) */
  name: string;
  /** Human-readable display name */
  displayName?: string;
  /** Module version (semver) */
  version: string;
  /** Short description */
  summary?: string;
  /** Long description */
  description?: string;
  /** Module author */
  author?: string;
  /** Module website URL */
  website?: string;
  /** License type */
  license?: string;
  /** Module category for grouping */
  category?: string;
  /** Module dependencies (other module names) */
  depends?: string[];
  /** Data files to load */
  data?: string[];
  /** Demo data files */
  demo?: string[];
  /** Static assets */
  assets?: {
    css?: string[];
    js?: string[];
  };
  /** Whether module can be installed */
  installable?: boolean;
  /** Auto-install with dependencies */
  autoInstall?: boolean;
  /** Is this a main application module */
  application?: boolean;
  /** Module icon */
  icon?: string;
}

/**
 * Module frontend configuration
 * Defines frontend resources provided by a module
 */
export interface ModuleConfig {
  /** Technical module name */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Module version */
  version: string;
  /** Path to routes configuration */
  routes?: string;
  /** Paths to React component files */
  components?: string[];
  /** Paths to view/page components */
  views?: string[];
  /** Paths to locale/i18n files */
  locales?: string[];
  /** Menu items defined by this module */
  menus?: ModuleMenuItem[];
  /** Module permissions */
  permissions?: string[];
  /** Module settings schema */
  settings?: ModuleSettingsSchema;
  /** Additional module hooks */
  hooks?: ModuleHooks;
}

/**
 * Module menu item configuration
 */
export interface ModuleMenuItem {
  /** Unique identifier */
  id: string;
  /** Display name (can be i18n key) */
  name: string;
  /** Route path */
  path?: string;
  /** Icon name or component */
  icon?: string;
  /** Parent menu id for nesting */
  parentId?: string;
  /** Sort order (lower = higher priority) */
  sequence?: number;
  /** Source module name */
  module?: string;
  /** Child menu items */
  children?: ModuleMenuItem[];
  /** Required permission to view */
  permission?: string;
  /** Whether menu is visible */
  visible?: boolean;
  /** Badge content */
  badge?: string | number;
}

/**
 * Module settings schema for configuration UI
 */
export interface ModuleSettingsSchema {
  /** Settings groups */
  groups?: {
    id: string;
    name: string;
    description?: string;
    fields: ModuleSettingsField[];
  }[];
  /** Flat list of settings fields */
  fields?: ModuleSettingsField[];
}

/**
 * Settings field definition
 */
export interface ModuleSettingsField {
  /** Field identifier */
  key: string;
  /** Field label */
  label: string;
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
  /** Default value */
  defaultValue?: unknown;
  /** Field description */
  description?: string;
  /** Whether field is required */
  required?: boolean;
  /** Options for select fields */
  options?: { value: string | number; label: string }[];
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * Module lifecycle hooks
 */
export interface ModuleHooks {
  /** Called before module is loaded */
  onBeforeLoad?: () => Promise<void> | void;
  /** Called after module is loaded */
  onLoad?: () => Promise<void> | void;
  /** Called before module is unloaded */
  onBeforeUnload?: () => Promise<void> | void;
  /** Called after module is unloaded */
  onUnload?: () => Promise<void> | void;
  /** Called on module error */
  onError?: (error: Error) => void;
}

/**
 * Module route definition (React Router compatible)
 */
export interface ModuleRoute {
  /** Route path */
  path: string;
  /** Route component */
  component?: ComponentType;
  /** Lazy loaded component */
  lazy?: () => Promise<{ default: ComponentType }>;
  /** Child routes */
  children?: ModuleRoute[];
  /** Route metadata */
  meta?: {
    /** Route title */
    title?: string;
    /** Required permissions */
    permissions?: string[];
    /** Parent module name */
    module?: string;
    /** Layout component to use */
    layout?: string;
    /** Whether route requires auth */
    requiresAuth?: boolean;
    /** Breadcrumb configuration */
    breadcrumb?: string | { label: string; path?: string }[];
  };
  /** Index route flag */
  index?: boolean;
  /** Route guard/loader */
  loader?: () => Promise<unknown>;
  /** Error element */
  errorElement?: ReactNode;
}

/**
 * Module metadata for registry
 */
export interface ModuleMetadata {
  /** Module configuration */
  config: ModuleConfig;
  /** Current module status */
  status: ModuleStatus;
  /** Loaded routes */
  routes: ModuleRoute[];
  /** Registered components */
  components: Map<string, ComponentType>;
  /** Error if any */
  error?: Error;
  /** When module was loaded */
  loadedAt?: Date;
  /** Module dependencies (resolved) */
  dependencies: string[];
  /** Modules that depend on this module */
  dependents: string[];
}

/**
 * Module loader events
 */
export type ModuleLoaderEvent =
  | 'module:discovering'
  | 'module:discovered'
  | 'module:loading'
  | 'module:loaded'
  | 'module:unloading'
  | 'module:unloaded'
  | 'module:error'
  | 'routes:registered'
  | 'components:registered'
  | 'dependencies:resolved';

/**
 * Module loader event data
 */
export interface ModuleLoaderEventData {
  'module:discovering': { status: 'loading' };
  'module:discovered': { status: 'complete'; count: number };
  'module:loading': { name: string };
  'module:loaded': { name: string; metadata: ModuleMetadata };
  'module:unloading': { name: string };
  'module:unloaded': { name: string };
  'module:error': { name?: string; phase: string; error: Error };
  'routes:registered': { module: string; count: number };
  'components:registered': { module: string; count: number };
  'dependencies:resolved': { module: string; dependencies: string[] };
}

/**
 * Module loader event handler
 */
export type ModuleLoaderEventHandler = <E extends ModuleLoaderEvent>(
  event: E,
  data: ModuleLoaderEventData[E]
) => void;

/**
 * Module install/uninstall result
 */
export interface ModuleActionResult {
  /** Whether action succeeded */
  success: boolean;
  /** Module name */
  moduleName: string;
  /** Action performed */
  action: 'install' | 'uninstall' | 'upgrade' | 'load' | 'unload';
  /** Result message */
  message: string;
  /** Installed dependencies */
  installedDependencies?: string[];
  /** Errors if any */
  errors?: string[];
}

/**
 * Module context state
 */
export interface ModuleContextState {
  /** All known modules */
  modules: Map<string, ModuleMetadata>;
  /** Currently loading modules */
  loading: Set<string>;
  /** Module errors by name */
  errors: Map<string, Error>;
  /** Whether initial discovery is complete */
  initialized: boolean;
  /** All registered routes */
  routes: ModuleRoute[];
  /** All registered menu items */
  menus: ModuleMenuItem[];
}

/**
 * Module context actions
 */
export interface ModuleContextActions {
  /** Load a module by name */
  loadModule: (name: string) => Promise<ModuleMetadata | null>;
  /** Unload a module by name */
  unloadModule: (name: string) => Promise<boolean>;
  /** Get a module by name */
  getModule: (name: string) => ModuleMetadata | undefined;
  /** Check if a module is loaded */
  isModuleLoaded: (name: string) => boolean;
  /** Get module status */
  getModuleStatus: (name: string) => ModuleStatus;
  /** Install a module from backend */
  installModule: (name: string) => Promise<ModuleActionResult>;
  /** Uninstall a module from backend */
  uninstallModule: (name: string) => Promise<ModuleActionResult>;
  /** Refresh module list */
  refreshModules: () => Promise<void>;
  /** Get all loaded modules */
  getLoadedModules: () => ModuleMetadata[];
  /** Get all routes */
  getAllRoutes: () => ModuleRoute[];
  /** Get all menus */
  getAllMenus: () => ModuleMenuItem[];
}

/**
 * Full module context type
 */
export type ModuleContextType = ModuleContextState & ModuleContextActions;

/**
 * Backend module info (from API)
 */
export interface BackendModuleInfo {
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

/**
 * Module dependency node for tree resolution
 */
export interface ModuleDependencyNode {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Direct dependencies */
  dependencies: ModuleDependencyNode[];
  /** Is dependency satisfied */
  satisfied?: boolean;
  /** Error if dependency cannot be resolved */
  error?: string;
}
