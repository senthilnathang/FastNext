/**
 * ModuleProvider
 *
 * React context provider for the module system.
 * Handles module state management and loading on app initialization.
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  ModuleContextType,
  ModuleContextState,
  ModuleMetadata,
  ModuleStatus,
  ModuleRoute,
  ModuleMenuItem,
  ModuleActionResult,
  ModuleLoaderEvent,
  ModuleLoaderEventData,
} from '@/lib/modules/types';
import { ModuleStatus as Status } from '@/lib/modules/types';
import { moduleLoader } from '@/lib/modules/loader';
import { moduleRegistry } from '@/lib/modules/registry';
import { modulesApi } from '@/lib/api/modules';

/**
 * Module context
 */
export const ModuleContext = createContext<ModuleContextType | null>(null);

/**
 * Module state action types
 */
type ModuleAction =
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { name: string; loading: boolean } }
  | { type: 'SET_MODULE'; payload: ModuleMetadata }
  | { type: 'REMOVE_MODULE'; payload: string }
  | { type: 'SET_ERROR'; payload: { name: string; error: Error | null } }
  | { type: 'SET_ROUTES'; payload: ModuleRoute[] }
  | { type: 'SET_MENUS'; payload: ModuleMenuItem[] }
  | { type: 'SYNC_FROM_REGISTRY' }
  | { type: 'RESET' };

/**
 * Initial state
 */
const initialState: ModuleContextState = {
  modules: new Map(),
  loading: new Set(),
  errors: new Map(),
  initialized: false,
  routes: [],
  menus: [],
};

/**
 * Module state reducer
 */
function moduleReducer(state: ModuleContextState, action: ModuleAction): ModuleContextState {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };

    case 'SET_LOADING': {
      const newLoading = new Set(state.loading);
      if (action.payload.loading) {
        newLoading.add(action.payload.name);
      } else {
        newLoading.delete(action.payload.name);
      }
      return { ...state, loading: newLoading };
    }

    case 'SET_MODULE': {
      const newModules = new Map(state.modules);
      newModules.set(action.payload.config.name, action.payload);
      return {
        ...state,
        modules: newModules,
        routes: moduleRegistry.getAllRoutes(),
        menus: moduleRegistry.getAllMenus(),
      };
    }

    case 'REMOVE_MODULE': {
      const newModules = new Map(state.modules);
      newModules.delete(action.payload);
      return {
        ...state,
        modules: newModules,
        routes: moduleRegistry.getAllRoutes(),
        menus: moduleRegistry.getAllMenus(),
      };
    }

    case 'SET_ERROR': {
      const newErrors = new Map(state.errors);
      if (action.payload.error) {
        newErrors.set(action.payload.name, action.payload.error);
      } else {
        newErrors.delete(action.payload.name);
      }
      return { ...state, errors: newErrors };
    }

    case 'SET_ROUTES':
      return { ...state, routes: action.payload };

    case 'SET_MENUS':
      return { ...state, menus: action.payload };

    case 'SYNC_FROM_REGISTRY': {
      const modules = new Map<string, ModuleMetadata>();
      for (const meta of moduleRegistry.getAll()) {
        modules.set(meta.config.name, meta);
      }
      return {
        ...state,
        modules,
        routes: moduleRegistry.getAllRoutes(),
        menus: moduleRegistry.getAllMenus(),
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * Module provider props
 */
export interface ModuleProviderProps {
  /** Child components */
  children: ReactNode;
  /** Auto-load all modules on mount */
  autoLoad?: boolean;
  /** Modules to load initially (if not autoLoad) */
  initialModules?: string[];
  /** Called when all modules are loaded */
  onLoaded?: () => void;
  /** Called on module load error */
  onError?: (moduleName: string, error: Error) => void;
  /** Loading component while modules load */
  loadingComponent?: ReactNode;
  /** Show loading component while initializing */
  showLoadingOnInit?: boolean;
}

/**
 * ModuleProvider component
 */
export function ModuleProvider({
  children,
  autoLoad = true,
  initialModules,
  onLoaded,
  onError,
  loadingComponent,
  showLoadingOnInit = false,
}: ModuleProviderProps) {
  const [state, dispatch] = useReducer(moduleReducer, initialState);

  /**
   * Handle module loader events
   */
  const handleLoaderEvent = useCallback(
    <E extends ModuleLoaderEvent>(event: E, data: ModuleLoaderEventData[E]) => {
      switch (event) {
        case 'module:loading':
          dispatch({
            type: 'SET_LOADING',
            payload: { name: (data as ModuleLoaderEventData['module:loading']).name, loading: true },
          });
          break;

        case 'module:loaded':
          dispatch({
            type: 'SET_LOADING',
            payload: { name: (data as ModuleLoaderEventData['module:loaded']).name, loading: false },
          });
          dispatch({
            type: 'SET_MODULE',
            payload: (data as ModuleLoaderEventData['module:loaded']).metadata,
          });
          dispatch({
            type: 'SET_ERROR',
            payload: { name: (data as ModuleLoaderEventData['module:loaded']).name, error: null },
          });
          break;

        case 'module:unloaded':
          dispatch({
            type: 'REMOVE_MODULE',
            payload: (data as ModuleLoaderEventData['module:unloaded']).name,
          });
          break;

        case 'module:error': {
          const errorData = data as ModuleLoaderEventData['module:error'];
          if (errorData.name) {
            dispatch({
              type: 'SET_LOADING',
              payload: { name: errorData.name, loading: false },
            });
            dispatch({
              type: 'SET_ERROR',
              payload: { name: errorData.name, error: errorData.error },
            });
            onError?.(errorData.name, errorData.error);
          }
          break;
        }

        case 'routes:registered':
          dispatch({ type: 'SET_ROUTES', payload: moduleRegistry.getAllRoutes() });
          break;
      }
    },
    [onError]
  );

  /**
   * Initialize modules on mount
   */
  useEffect(() => {
    const unsubscribe = moduleLoader.on(handleLoaderEvent);

    const initModules = async () => {
      try {
        await moduleLoader.discoverModules();

        if (autoLoad) {
          await moduleLoader.loadAllModules();
        } else if (initialModules && initialModules.length > 0) {
          for (const moduleName of initialModules) {
            await moduleLoader.loadModule(moduleName);
          }
        }

        dispatch({ type: 'SYNC_FROM_REGISTRY' });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        onLoaded?.();
      } catch (error) {
        console.error('Failed to initialize modules:', error);
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    initModules();

    return () => {
      unsubscribe();
    };
  }, [autoLoad, initialModules, handleLoaderEvent, onLoaded]);

  /**
   * Load a module by name
   */
  const loadModule = useCallback(
    async (name: string): Promise<ModuleMetadata | null> => {
      dispatch({ type: 'SET_LOADING', payload: { name, loading: true } });
      try {
        const metadata = await moduleLoader.loadModule(name);
        if (metadata) {
          dispatch({ type: 'SET_MODULE', payload: metadata });
        }
        return metadata;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({ type: 'SET_ERROR', payload: { name, error: err } });
        onError?.(name, err);
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { name, loading: false } });
      }
    },
    [onError]
  );

  /**
   * Unload a module by name
   */
  const unloadModule = useCallback(async (name: string): Promise<boolean> => {
    const result = await moduleLoader.unloadModule(name);
    if (result) {
      dispatch({ type: 'REMOVE_MODULE', payload: name });
    }
    return result;
  }, []);

  /**
   * Get a module by name
   */
  const getModule = useCallback(
    (name: string): ModuleMetadata | undefined => {
      return state.modules.get(name);
    },
    [state.modules]
  );

  /**
   * Check if a module is loaded
   */
  const isModuleLoaded = useCallback(
    (name: string): boolean => {
      const module = state.modules.get(name);
      return module?.status === Status.LOADED;
    },
    [state.modules]
  );

  /**
   * Get module status
   */
  const getModuleStatus = useCallback(
    (name: string): ModuleStatus => {
      const module = state.modules.get(name);
      return module?.status || Status.IDLE;
    },
    [state.modules]
  );

  /**
   * Install a module (backend operation)
   */
  const installModule = useCallback(
    async (name: string): Promise<ModuleActionResult> => {
      try {
        const result = await modulesApi.install(name);

        if (result.success) {
          await moduleLoader.rediscover();
          await loadModule(name);
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
    [loadModule]
  );

  /**
   * Uninstall a module (backend operation)
   */
  const uninstallModule = useCallback(
    async (name: string): Promise<ModuleActionResult> => {
      try {
        await unloadModule(name);
        const result = await modulesApi.uninstall(name);

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
    [unloadModule]
  );

  /**
   * Refresh module list
   */
  const refreshModules = useCallback(async (): Promise<void> => {
    await moduleLoader.rediscover();
    await moduleLoader.loadAllModules();
    dispatch({ type: 'SYNC_FROM_REGISTRY' });
  }, []);

  /**
   * Get all loaded modules
   */
  const getLoadedModules = useCallback((): ModuleMetadata[] => {
    return Array.from(state.modules.values()).filter(m => m.status === Status.LOADED);
  }, [state.modules]);

  /**
   * Get all routes
   */
  const getAllRoutes = useCallback((): ModuleRoute[] => {
    return state.routes;
  }, [state.routes]);

  /**
   * Get all menus
   */
  const getAllMenus = useCallback((): ModuleMenuItem[] => {
    return state.menus;
  }, [state.menus]);

  /**
   * Context value
   */
  const contextValue = useMemo<ModuleContextType>(
    () => ({
      // State
      modules: state.modules,
      loading: state.loading,
      errors: state.errors,
      initialized: state.initialized,
      routes: state.routes,
      menus: state.menus,

      // Actions
      loadModule,
      unloadModule,
      getModule,
      isModuleLoaded,
      getModuleStatus,
      installModule,
      uninstallModule,
      refreshModules,
      getLoadedModules,
      getAllRoutes,
      getAllMenus,
    }),
    [
      state,
      loadModule,
      unloadModule,
      getModule,
      isModuleLoaded,
      getModuleStatus,
      installModule,
      uninstallModule,
      refreshModules,
      getLoadedModules,
      getAllRoutes,
      getAllMenus,
    ]
  );

  // Show loading component while initializing
  if (showLoadingOnInit && !state.initialized && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <ModuleContext.Provider value={contextValue}>
      {children}
    </ModuleContext.Provider>
  );
}

/**
 * Hook to access module context
 */
export function useModuleContext(): ModuleContextType {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModuleContext must be used within a ModuleProvider');
  }
  return context;
}

/**
 * Higher-order component to wrap with ModuleProvider
 */
export function withModuleProvider<P extends object>(
  Component: React.ComponentType<P>,
  providerProps?: Omit<ModuleProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ModuleProvider {...providerProps}>
      <Component {...props} />
    </ModuleProvider>
  );

  WrappedComponent.displayName = `withModuleProvider(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Component that renders only when modules are loaded
 */
export function ModuleGate({
  children,
  modules,
  fallback,
  loadOnMount = true,
}: {
  children: ReactNode;
  modules: string[];
  fallback?: ReactNode;
  loadOnMount?: boolean;
}) {
  const context = useContext(ModuleContext);
  const [allLoaded, setAllLoaded] = React.useState(false);

  useEffect(() => {
    if (!context) return;

    const checkModules = () => {
      const loaded = modules.every(name => context.isModuleLoaded(name));
      setAllLoaded(loaded);
    };

    checkModules();

    if (loadOnMount) {
      const loadMissing = async () => {
        for (const name of modules) {
          if (!context.isModuleLoaded(name)) {
            await context.loadModule(name);
          }
        }
        checkModules();
      };
      loadMissing();
    }
  }, [context, modules, loadOnMount]);

  if (!allLoaded) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ModuleProvider;
