/**
 * Module Loader
 *
 * Handles discovering, loading, and registering frontend modules.
 * Fetches module configuration from the backend and dynamically imports assets.
 * Manages module lifecycle and dependency resolution.
 */

import type { ComponentType } from 'react';
import type {
  ModuleConfig,
  ModuleMetadata,
  ModuleRoute,
  ModuleMenuItem,
  ModuleLoaderEvent,
  ModuleLoaderEventHandler,
  ModuleLoaderEventData,
  BackendModuleInfo,
  ModuleDependencyNode,
  ModuleHooks,
} from './types';
import { ModuleStatus } from './types';
import { moduleRegistry } from './registry';
import { apiClient } from '../api/client';

/**
 * Module loading options
 */
export interface ModuleLoadOptions {
  /** Skip dependency loading */
  skipDependencies?: boolean;
  /** Force reload even if already loaded */
  force?: boolean;
  /** Timeout for loading (ms) */
  timeout?: number;
}

/**
 * Module Loader class
 * Handles the lifecycle of loading and unloading modules
 */
class ModuleLoader {
  /** Base URL for module static files */
  private staticBaseUrl: string = '/modules';

  /** API endpoint for module configs */
  private configEndpoint: string = '/api/v1/modules/installed/frontend-config';

  /** API endpoint for listing modules */
  private listEndpoint: string = '/api/v1/modules';

  /** Whether modules have been discovered */
  private discovered: boolean = false;

  /** Discovered module configurations */
  private configs: ModuleConfig[] = [];

  /** Backend module info cache */
  private backendModules: Map<string, BackendModuleInfo> = new Map();

  /** Event handlers */
  private eventHandlers: Set<ModuleLoaderEventHandler> = new Set();

  /** Loading promises for deduplication */
  private loadingPromises: Map<string, Promise<ModuleMetadata | null>> = new Map();

  /** Default load timeout (30 seconds) */
  private defaultTimeout: number = 30000;

  /**
   * Discover all installed modules from the backend
   */
  async discoverModules(): Promise<ModuleConfig[]> {
    if (this.discovered && this.configs.length > 0) {
      return this.configs;
    }

    try {
      this.emit('module:discovering', { status: 'loading' });

      // Fetch frontend configs
      const configs = await apiClient.get<ModuleConfig[]>(this.configEndpoint);
      this.configs = configs || [];

      // Also fetch backend module info for dependency resolution
      const backendModules = await apiClient.get<{ items: BackendModuleInfo[] }>(
        this.listEndpoint,
        { state: 'installed', limit: 1000 }
      );

      if (backendModules?.items) {
        for (const module of backendModules.items) {
          this.backendModules.set(module.name, module);
        }
      }

      this.discovered = true;

      this.emit('module:discovered', {
        status: 'complete',
        count: this.configs.length,
      });

      return this.configs;
    } catch (error) {
      console.error('Failed to discover modules:', error);
      this.emit('module:error', {
        phase: 'discovery',
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return [];
    }
  }

  /**
   * Load all discovered modules
   */
  async loadAllModules(options?: ModuleLoadOptions): Promise<ModuleMetadata[]> {
    const configs = await this.discoverModules();
    const results: ModuleMetadata[] = [];

    // Sort by dependency order
    const sortedConfigs = this.sortByDependencies(configs);

    for (const config of sortedConfigs) {
      try {
        const metadata = await this.loadModule(config.name, options);
        if (metadata) {
          results.push(metadata);
        }
      } catch (error) {
        console.error(`Failed to load module ${config.name}:`, error);
        this.emit('module:error', {
          name: config.name,
          phase: 'load',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return results;
  }

  /**
   * Load a single module by name
   */
  async loadModule(
    name: string,
    options?: ModuleLoadOptions
  ): Promise<ModuleMetadata | null> {
    // Check if already loading
    const existingPromise = this.loadingPromises.get(name);
    if (existingPromise && !options?.force) {
      return existingPromise;
    }

    // Check if already loaded
    if (moduleRegistry.isLoaded(name) && !options?.force) {
      return moduleRegistry.get(name) || null;
    }

    // Find config
    const config = this.configs.find(c => c.name === name);
    if (!config) {
      // Try to fetch config for this specific module
      try {
        const moduleConfig = await apiClient.get<ModuleConfig>(
          `${this.configEndpoint}/${name}`
        );
        if (moduleConfig) {
          this.configs.push(moduleConfig);
          return this.loadModule(name, options);
        }
      } catch {
        console.warn(`Module config not found for ${name}`);
        return null;
      }
    }

    if (!config) {
      return null;
    }

    // Create loading promise
    const loadPromise = this.doLoadModule(config, options);
    this.loadingPromises.set(name, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  /**
   * Internal module loading logic
   */
  private async doLoadModule(
    config: ModuleConfig,
    options?: ModuleLoadOptions
  ): Promise<ModuleMetadata | null> {
    const timeout = options?.timeout || this.defaultTimeout;

    // Wrap in timeout
    const loadWithTimeout = async (): Promise<ModuleMetadata | null> => {
      moduleRegistry.updateStatus(config.name, ModuleStatus.LOADING);
      this.emit('module:loading', { name: config.name });

      // Load dependencies first
      if (!options?.skipDependencies) {
        const depResult = await this.loadDependencies(config.name);
        if (!depResult.success) {
          throw new Error(
            `Failed to load dependencies for ${config.name}: ${depResult.errors.join(', ')}`
          );
        }
      }

      // Execute before load hook
      if (config.hooks?.onBeforeLoad) {
        await config.hooks.onBeforeLoad();
      }

      // Load module resources
      const routes = await this.loadModuleRoutes(config);
      const components = await this.loadModuleComponents(config);

      // Get dependency info
      const backendInfo = this.backendModules.get(config.name);
      const dependencies = backendInfo?.depends || [];

      // Register module
      const metadata = moduleRegistry.register(config, {
        routes,
        components,
        dependencies,
        dependents: [],
      });

      // Update dependents
      for (const depName of dependencies) {
        moduleRegistry.addDependent(depName, config.name);
      }

      // Execute after load hook
      if (config.hooks?.onLoad) {
        await config.hooks.onLoad();
      }

      this.emit('module:loaded', { name: config.name, metadata });

      return metadata;
    };

    // Apply timeout
    return Promise.race([
      loadWithTimeout(),
      new Promise<null>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Module load timeout for ${config.name}`)),
          timeout
        )
      ),
    ]).catch(error => {
      moduleRegistry.updateStatus(config.name, ModuleStatus.ERROR, error);

      // Execute error hook
      if (config.hooks?.onError) {
        config.hooks.onError(error);
      }

      this.emit('module:error', {
        name: config.name,
        phase: 'load',
        error,
      });

      throw error;
    });
  }

  /**
   * Load dependencies for a module
   */
  private async loadDependencies(
    moduleName: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const backendInfo = this.backendModules.get(moduleName);
    if (!backendInfo?.depends || backendInfo.depends.length === 0) {
      return { success: true, errors: [] };
    }

    const errors: string[] = [];

    for (const depName of backendInfo.depends) {
      if (moduleRegistry.isLoaded(depName)) {
        continue;
      }

      try {
        await this.loadModule(depName);
      } catch (error) {
        errors.push(
          `${depName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.emit('dependencies:resolved', {
      module: moduleName,
      dependencies: backendInfo.depends,
    });

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Unload a module
   */
  async unloadModule(name: string): Promise<boolean> {
    const metadata = moduleRegistry.get(name);
    if (!metadata) {
      return false;
    }

    // Check if can unload
    const { canUnload, blockers } = moduleRegistry.canUnload(name);
    if (!canUnload) {
      console.warn(`Cannot unload ${name}: required by ${blockers.join(', ')}`);
      return false;
    }

    moduleRegistry.updateStatus(name, ModuleStatus.UNLOADING);
    this.emit('module:unloading', { name });

    // Execute before unload hook
    const config = metadata.config;
    if (config.hooks?.onBeforeUnload) {
      await config.hooks.onBeforeUnload();
    }

    // Remove from dependents of dependencies
    for (const depName of metadata.dependencies) {
      moduleRegistry.removeDependent(depName, name);
    }

    // Unregister module
    const result = moduleRegistry.unregister(name);

    // Execute after unload hook
    if (config.hooks?.onUnload) {
      await config.hooks.onUnload();
    }

    return result;
  }

  /**
   * Load routes from a module
   */
  private async loadModuleRoutes(config: ModuleConfig): Promise<ModuleRoute[]> {
    if (!config.routes) {
      return [];
    }

    try {
      const routeUrl = this.buildAssetUrl(config.name, config.routes);
      const routeModule = await this.importModule(routeUrl);
      const routes: ModuleRoute[] = (routeModule.default || routeModule.routes || []) as ModuleRoute[];

      // Add module metadata to routes
      const enhancedRoutes = routes.map(route => ({
        ...route,
        path: route.path.startsWith('/') ? route.path : `/${route.path}`,
        meta: {
          ...route.meta,
          module: config.name,
        },
      }));

      moduleRegistry.registerRoutes(config.name, enhancedRoutes);
      return enhancedRoutes;
    } catch (error) {
      console.warn(`Failed to load routes for ${config.name}:`, error);
      return [];
    }
  }

  /**
   * Load components from a module
   */
  private async loadModuleComponents(
    config: ModuleConfig
  ): Promise<Map<string, ComponentType>> {
    const components = new Map<string, ComponentType>();

    if (!config.components || config.components.length === 0) {
      return components;
    }

    for (const componentPath of config.components) {
      try {
        const componentUrl = this.buildAssetUrl(config.name, componentPath);
        const componentModule = await this.importModule(componentUrl);
        const name = this.extractComponentName(componentPath);
        const component = componentModule.default || componentModule;

        components.set(name, component as ComponentType);
        moduleRegistry.registerComponent(`${config.name}:${name}`, component as ComponentType);
      } catch (error) {
        console.warn(`Failed to load component ${componentPath}:`, error);
      }
    }

    this.emit('components:registered', {
      module: config.name,
      count: components.size,
    });

    return components;
  }

  /**
   * Get all menus from loaded modules
   */
  getModuleMenus(): ModuleMenuItem[] {
    return moduleRegistry.getAllMenus();
  }

  /**
   * Get all routes from loaded modules
   */
  getLoadedRoutes(): ModuleRoute[] {
    return moduleRegistry.getAllRoutes();
  }

  /**
   * Get dependency tree for a module
   */
  getDependencyTree(moduleName: string): ModuleDependencyNode | null {
    const backendInfo = this.backendModules.get(moduleName);
    if (!backendInfo) {
      return null;
    }

    const buildTree = (name: string, visited: Set<string>): ModuleDependencyNode => {
      const info = this.backendModules.get(name);
      if (!info) {
        return {
          name,
          version: 'unknown',
          dependencies: [],
          satisfied: false,
          error: 'Module not found',
        };
      }

      if (visited.has(name)) {
        return {
          name,
          version: info.version,
          dependencies: [],
          satisfied: moduleRegistry.isLoaded(name),
          error: 'Circular dependency detected',
        };
      }

      visited.add(name);

      return {
        name,
        version: info.version,
        dependencies: (info.depends || []).map(dep => buildTree(dep, new Set(visited))),
        satisfied: moduleRegistry.isLoaded(name),
      };
    };

    return buildTree(moduleName, new Set());
  }

  /**
   * Sort configs by dependencies (topological sort)
   */
  private sortByDependencies(configs: ModuleConfig[]): ModuleConfig[] {
    const sorted: ModuleConfig[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        console.warn(`Circular dependency detected for ${name}`);
        return;
      }

      visiting.add(name);

      const backendInfo = this.backendModules.get(name);
      if (backendInfo?.depends) {
        for (const dep of backendInfo.depends) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);

      const config = configs.find(c => c.name === name);
      if (config) {
        sorted.push(config);
      }
    };

    for (const config of configs) {
      visit(config.name);
    }

    return sorted;
  }

  /**
   * Build full URL for a module asset
   */
  private buildAssetUrl(moduleName: string, assetPath: string): string {
    const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
    return `${this.staticBaseUrl}/${moduleName}/static/${cleanPath}`;
  }

  /**
   * Import a module dynamically
   */
  private async importModule(url: string): Promise<Record<string, unknown>> {
    try {
      // Try dynamic import first
      return await import(/* @vite-ignore */ url);
    } catch {
      // Fallback: fetch the module
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }

      const code = await response.text();

      // Handle JSON files
      if (url.endsWith('.json')) {
        return JSON.parse(code);
      }

      // For other files, we need compilation/bundling
      throw new Error(`Cannot dynamically import ${url} - needs to be pre-compiled`);
    }
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] || '';
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  /**
   * Subscribe to loader events
   */
  on(handler: ModuleLoaderEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Emit an event
   */
  private emit<E extends ModuleLoaderEvent>(
    event: E,
    data: ModuleLoaderEventData[E]
  ): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in module loader event handler:`, error);
      }
    }
  }

  /**
   * Get a specific module config
   */
  getConfig(name: string): ModuleConfig | undefined {
    return this.configs.find(c => c.name === name);
  }

  /**
   * Get all discovered configs
   */
  getAllConfigs(): ModuleConfig[] {
    return [...this.configs];
  }

  /**
   * Get backend module info
   */
  getBackendInfo(name: string): BackendModuleInfo | undefined {
    return this.backendModules.get(name);
  }

  /**
   * Check if discovery has completed
   */
  isDiscovered(): boolean {
    return this.discovered;
  }

  /**
   * Force rediscovery of modules
   */
  async rediscover(): Promise<ModuleConfig[]> {
    this.discovered = false;
    this.configs = [];
    this.backendModules.clear();
    return this.discoverModules();
  }

  /**
   * Reset the loader state (mainly for testing)
   */
  reset(): void {
    this.discovered = false;
    this.configs = [];
    this.backendModules.clear();
    this.loadingPromises.clear();
    moduleRegistry.clear();
  }

  /**
   * Set static base URL
   */
  setStaticBaseUrl(url: string): void {
    this.staticBaseUrl = url;
  }

  /**
   * Set config endpoint
   */
  setConfigEndpoint(endpoint: string): void {
    this.configEndpoint = endpoint;
  }
}

// Singleton instance
export const moduleLoader = new ModuleLoader();

// Also export the class for testing
export { ModuleLoader };
