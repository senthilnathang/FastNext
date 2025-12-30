/**
 * useModules Hook
 *
 * React hook for interacting with the module system.
 * Provides access to module loading, listing, and management functions.
 */

'use client';

import { useContext, useCallback, useMemo, useState, useEffect } from 'react';
import type {
  ModuleMetadata,
  ModuleStatus,
  ModuleActionResult,
  ModuleConfig,
  ModuleRoute,
  ModuleMenuItem,
  BackendModuleInfo,
} from '@/lib/modules/types';
import { ModuleStatus as Status } from '@/lib/modules/types';
import { ModuleContext } from '@/shared/providers/ModuleProvider';
import { moduleLoader } from '@/lib/modules/loader';
import { moduleRegistry } from '@/lib/modules/registry';
import { modulesApi } from '@/lib/api/modules';

/**
 * Hook return type for module operations
 */
export interface UseModulesReturn {
  // State
  /** All loaded modules */
  modules: ModuleMetadata[];
  /** All available module configs */
  configs: ModuleConfig[];
  /** Whether modules are being loaded */
  isLoading: boolean;
  /** Current loading module names */
  loadingModules: string[];
  /** Errors by module name */
  errors: Map<string, Error>;
  /** Whether initial discovery is complete */
  initialized: boolean;
  /** All registered routes */
  routes: ModuleRoute[];
  /** All registered menus */
  menus: ModuleMenuItem[];

  // Module Operations
  /** Load a module by name */
  loadModule: (name: string, options?: { force?: boolean }) => Promise<ModuleMetadata | null>;
  /** Unload a module by name */
  unloadModule: (name: string) => Promise<boolean>;
  /** Get a specific module by name */
  getModule: (name: string) => ModuleMetadata | undefined;
  /** Check if a module is loaded */
  isModuleLoaded: (name: string) => boolean;
  /** Get module status */
  getModuleStatus: (name: string) => ModuleStatus;
  /** Refresh/reload all modules */
  refreshModules: () => Promise<void>;

  // Install/Uninstall Operations (backend)
  /** Install a module (backend operation) */
  installModule: (name: string, options?: { force?: boolean }) => Promise<ModuleActionResult>;
  /** Uninstall a module (backend operation) */
  uninstallModule: (name: string, options?: { force?: boolean }) => Promise<ModuleActionResult>;
  /** Upgrade a module (backend operation) */
  upgradeModule: (name: string) => Promise<ModuleActionResult>;

  // Listing
  /** List all installed modules from backend */
  listInstalled: () => Promise<BackendModuleInfo[]>;
  /** List available modules (not installed) */
  listAvailable: () => Promise<BackendModuleInfo[]>;
  /** Get modules with updates available */
  listUpdates: () => Promise<BackendModuleInfo[]>;

  // Utilities
  /** Get module config by name */
  getConfig: (name: string) => ModuleConfig | undefined;
  /** Get backend module info */
  getBackendInfo: (name: string) => BackendModuleInfo | undefined;
  /** Check if module can be unloaded */
  canUnloadModule: (name: string) => { canUnload: boolean; blockers: string[] };
}

/**
 * Hook for accessing module system functionality
 */
export function useModules(): UseModulesReturn {
  const context = useContext(ModuleContext);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState<string[]>([]);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  // Get state from context or fall back to registry
  const modules = useMemo(() => {
    if (context) {
      return Array.from(context.modules.values());
    }
    return moduleRegistry.getAll();
  }, [context]);

  const configs = useMemo(() => {
    return moduleLoader.getAllConfigs();
  }, []);

  const initialized = useMemo(() => {
    if (context) {
      return context.initialized;
    }
    return moduleLoader.isDiscovered();
  }, [context]);

  const routes = useMemo(() => {
    if (context) {
      return context.routes;
    }
    return moduleRegistry.getAllRoutes();
  }, [context]);

  const menus = useMemo(() => {
    if (context) {
      return context.menus;
    }
    return moduleRegistry.getAllMenus();
  }, [context]);

  /**
   * Load a module by name
   */
  const loadModule = useCallback(
    async (name: string, options?: { force?: boolean }): Promise<ModuleMetadata | null> => {
      if (context?.loadModule) {
        return context.loadModule(name);
      }

      setLoadingModules(prev => [...prev, name]);
      try {
        const result = await moduleLoader.loadModule(name, options);
        return result;
      } catch (error) {
        setErrors(prev => new Map(prev).set(name, error instanceof Error ? error : new Error(String(error))));
        return null;
      } finally {
        setLoadingModules(prev => prev.filter(m => m !== name));
      }
    },
    [context]
  );

  /**
   * Unload a module by name
   */
  const unloadModule = useCallback(
    async (name: string): Promise<boolean> => {
      if (context?.unloadModule) {
        return context.unloadModule(name);
      }
      return moduleLoader.unloadModule(name);
    },
    [context]
  );

  /**
   * Get a specific module by name
   */
  const getModule = useCallback(
    (name: string): ModuleMetadata | undefined => {
      if (context?.getModule) {
        return context.getModule(name);
      }
      return moduleRegistry.get(name);
    },
    [context]
  );

  /**
   * Check if a module is loaded
   */
  const isModuleLoaded = useCallback(
    (name: string): boolean => {
      if (context?.isModuleLoaded) {
        return context.isModuleLoaded(name);
      }
      return moduleRegistry.isLoaded(name);
    },
    [context]
  );

  /**
   * Get module status
   */
  const getModuleStatus = useCallback(
    (name: string): ModuleStatus => {
      if (context?.getModuleStatus) {
        return context.getModuleStatus(name);
      }
      return moduleRegistry.getStatus(name);
    },
    [context]
  );

  /**
   * Refresh/reload all modules
   */
  const refreshModules = useCallback(async (): Promise<void> => {
    if (context?.refreshModules) {
      return context.refreshModules();
    }

    setIsLoading(true);
    try {
      await moduleLoader.rediscover();
      await moduleLoader.loadAllModules();
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  /**
   * Install a module (backend operation)
   */
  const installModule = useCallback(
    async (name: string, options?: { force?: boolean }): Promise<ModuleActionResult> => {
      if (context?.installModule) {
        return context.installModule(name);
      }

      try {
        const result = await modulesApi.install(name, {
          force: options?.force,
        });

        // After successful install, load the module
        if (result.success) {
          await moduleLoader.rediscover();
          await loadModule(name, { force: true });
        }

        return {
          success: result.success,
          moduleName: result.module_name,
          action: 'install',
          message: result.message,
          installedDependencies: result.installed_dependencies,
          errors: result.errors,
        };
      } catch (error) {
        return {
          success: false,
          moduleName: name,
          action: 'install',
          message: error instanceof Error ? error.message : String(error),
          errors: [String(error)],
        };
      }
    },
    [context, loadModule]
  );

  /**
   * Uninstall a module (backend operation)
   */
  const uninstallModule = useCallback(
    async (name: string, options?: { force?: boolean }): Promise<ModuleActionResult> => {
      if (context?.uninstallModule) {
        return context.uninstallModule(name);
      }

      try {
        // First unload the module from frontend
        await unloadModule(name);

        const result = await modulesApi.uninstall(name, {
          force: options?.force,
        });

        return {
          success: result.success,
          moduleName: result.module_name,
          action: 'uninstall',
          message: result.message,
          errors: result.errors,
        };
      } catch (error) {
        return {
          success: false,
          moduleName: name,
          action: 'uninstall',
          message: error instanceof Error ? error.message : String(error),
          errors: [String(error)],
        };
      }
    },
    [context, unloadModule]
  );

  /**
   * Upgrade a module (backend operation)
   */
  const upgradeModule = useCallback(
    async (name: string): Promise<ModuleActionResult> => {
      try {
        const result = await modulesApi.upgrade(name);

        // After successful upgrade, reload the module
        if (result.success) {
          await moduleLoader.rediscover();
          await loadModule(name, { force: true });
        }

        return {
          success: result.success,
          moduleName: result.module_name,
          action: 'upgrade',
          message: result.message,
          errors: result.errors,
        };
      } catch (error) {
        return {
          success: false,
          moduleName: name,
          action: 'upgrade',
          message: error instanceof Error ? error.message : String(error),
          errors: [String(error)],
        };
      }
    },
    [loadModule]
  );

  /**
   * List all installed modules from backend
   */
  const listInstalled = useCallback(async (): Promise<BackendModuleInfo[]> => {
    const result = await modulesApi.list({ state: 'installed' });
    return result.items as unknown as BackendModuleInfo[];
  }, []);

  /**
   * List available modules (not installed)
   */
  const listAvailable = useCallback(async (): Promise<BackendModuleInfo[]> => {
    const result = await modulesApi.list({ state: 'uninstalled' });
    return result.items as unknown as BackendModuleInfo[];
  }, []);

  /**
   * Get modules with updates available
   */
  const listUpdates = useCallback(async (): Promise<BackendModuleInfo[]> => {
    const result = await modulesApi.getUpdates();
    return result as unknown as BackendModuleInfo[];
  }, []);

  /**
   * Get module config by name
   */
  const getConfig = useCallback((name: string): ModuleConfig | undefined => {
    return moduleLoader.getConfig(name);
  }, []);

  /**
   * Get backend module info
   */
  const getBackendInfo = useCallback((name: string): BackendModuleInfo | undefined => {
    return moduleLoader.getBackendInfo(name);
  }, []);

  /**
   * Check if module can be unloaded
   */
  const canUnloadModule = useCallback(
    (name: string): { canUnload: boolean; blockers: string[] } => {
      return moduleRegistry.canUnload(name);
    },
    []
  );

  return {
    // State
    modules,
    configs,
    isLoading: isLoading || loadingModules.length > 0,
    loadingModules,
    errors,
    initialized,
    routes,
    menus,

    // Module Operations
    loadModule,
    unloadModule,
    getModule,
    isModuleLoaded,
    getModuleStatus,
    refreshModules,

    // Install/Uninstall Operations
    installModule,
    uninstallModule,
    upgradeModule,

    // Listing
    listInstalled,
    listAvailable,
    listUpdates,

    // Utilities
    getConfig,
    getBackendInfo,
    canUnloadModule,
  };
}

/**
 * Hook to get a specific module by name
 */
export function useModule(name: string): {
  module: ModuleMetadata | undefined;
  isLoaded: boolean;
  status: ModuleStatus;
  error: Error | undefined;
  load: () => Promise<ModuleMetadata | null>;
  unload: () => Promise<boolean>;
} {
  const { getModule, isModuleLoaded, getModuleStatus, loadModule, unloadModule, errors } = useModules();

  const module = getModule(name);
  const isLoaded = isModuleLoaded(name);
  const status = getModuleStatus(name);
  const error = errors.get(name);

  const load = useCallback(() => loadModule(name), [loadModule, name]);
  const unload = useCallback(() => unloadModule(name), [unloadModule, name]);

  return {
    module,
    isLoaded,
    status,
    error,
    load,
    unload,
  };
}

/**
 * Hook to track module loading status
 */
export function useModuleLoading(): {
  isLoading: boolean;
  loadingModules: string[];
  progress: number;
  totalModules: number;
} {
  const { isLoading, loadingModules, modules, configs } = useModules();

  const totalModules = configs.length || modules.length;
  const loadedCount = modules.filter(m => m.status === Status.LOADED).length;
  const progress = totalModules > 0 ? (loadedCount / totalModules) * 100 : 0;

  return {
    isLoading,
    loadingModules,
    progress,
    totalModules,
  };
}

/**
 * Hook to get module routes
 */
export function useModuleRoutes(): ModuleRoute[] {
  const { routes } = useModules();
  return routes;
}

/**
 * Hook to get module menus
 */
export function useModuleMenus(): ModuleMenuItem[] {
  const { menus } = useModules();
  return menus;
}

/**
 * Hook to get module menus directly from backend API
 * This is a simpler alternative to useModuleMenus that doesn't require
 * the full module system to be initialized.
 */
export function useBackendModuleMenus() {
  const [menus, setMenus] = useState<import('@/lib/api/modules').ModuleMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await modulesApi.getMenuItems();
      setMenus(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  return { menus, loading, error, refresh: fetchMenus };
}

export default useModules;
