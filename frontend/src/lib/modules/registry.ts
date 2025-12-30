/**
 * Module Registry
 *
 * Tracks loaded modules and their resources in the frontend.
 * Provides centralized access to module metadata, routes, and components.
 */

import type { ComponentType } from 'react';
import type {
  ModuleConfig,
  ModuleMetadata,
  ModuleRoute,
  ModuleMenuItem,
  ModuleStatus,
  ModuleLoaderEvent,
  ModuleLoaderEventHandler,
  ModuleLoaderEventData,
} from './types';
import { ModuleStatus as Status } from './types';

/**
 * Module Registry class
 * Singleton that manages all loaded modules
 */
class ModuleRegistry {
  /** Loaded modules by name */
  private modules: Map<string, ModuleMetadata> = new Map();

  /** Registered routes from modules */
  private moduleRoutes: Map<string, ModuleRoute[]> = new Map();

  /** Registered components from modules */
  private moduleComponents: Map<string, ComponentType> = new Map();

  /** Registered menu items from modules */
  private moduleMenus: Map<string, ModuleMenuItem[]> = new Map();

  /** Event handlers */
  private eventHandlers: Set<ModuleLoaderEventHandler> = new Set();

  /** Module load order for dependency resolution */
  private loadOrder: string[] = [];

  /**
   * Register a loaded module
   */
  register(
    config: ModuleConfig,
    data: Partial<Omit<ModuleMetadata, 'config' | 'status'>>
  ): ModuleMetadata {
    const existingModule = this.modules.get(config.name);

    const metadata: ModuleMetadata = {
      config,
      status: Status.LOADED,
      routes: data.routes || [],
      components: data.components || new Map(),
      dependencies: data.dependencies || [],
      dependents: data.dependents || [],
      loadedAt: new Date(),
      error: undefined,
    };

    this.modules.set(config.name, metadata);

    // Track load order
    if (!this.loadOrder.includes(config.name)) {
      this.loadOrder.push(config.name);
    }

    // Register routes
    if (metadata.routes.length > 0) {
      this.moduleRoutes.set(config.name, metadata.routes);
    }

    // Register menus
    if (config.menus && config.menus.length > 0) {
      this.moduleMenus.set(config.name, config.menus.map(menu => ({
        ...menu,
        module: config.name,
      })));
    }

    this.emit('module:loaded', { name: config.name, metadata });

    return metadata;
  }

  /**
   * Update module status
   */
  updateStatus(name: string, status: ModuleStatus, error?: Error): void {
    const module = this.modules.get(name);
    if (module) {
      module.status = status;
      if (error) {
        module.error = error;
      }
      this.modules.set(name, module);
    }
  }

  /**
   * Unregister a module
   */
  unregister(name: string): boolean {
    const module = this.modules.get(name);
    if (!module) {
      return false;
    }

    // Check for dependents
    if (module.dependents.length > 0) {
      const loadedDependents = module.dependents.filter(dep =>
        this.isLoaded(dep)
      );
      if (loadedDependents.length > 0) {
        console.warn(
          `Cannot unregister module ${name}: required by ${loadedDependents.join(', ')}`
        );
        return false;
      }
    }

    // Remove routes
    this.moduleRoutes.delete(name);

    // Remove components
    for (const [key] of this.moduleComponents) {
      if (key.startsWith(`${name}:`)) {
        this.moduleComponents.delete(key);
      }
    }

    // Remove menus
    this.moduleMenus.delete(name);

    // Remove from load order
    const orderIndex = this.loadOrder.indexOf(name);
    if (orderIndex > -1) {
      this.loadOrder.splice(orderIndex, 1);
    }

    // Remove module
    this.modules.delete(name);

    this.emit('module:unloaded', { name });

    return true;
  }

  /**
   * Get a loaded module by name
   */
  get(name: string): ModuleMetadata | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(name: string): boolean {
    const module = this.modules.get(name);
    return module?.status === Status.LOADED;
  }

  /**
   * Get module status
   */
  getStatus(name: string): ModuleStatus {
    const module = this.modules.get(name);
    return module?.status || Status.IDLE;
  }

  /**
   * Get all loaded modules
   */
  getAll(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all loaded module names
   */
  getLoadedNames(): string[] {
    return Array.from(this.modules.entries())
      .filter(([, meta]) => meta.status === Status.LOADED)
      .map(([name]) => name);
  }

  /**
   * Get modules in load order
   */
  getInLoadOrder(): ModuleMetadata[] {
    return this.loadOrder
      .map(name => this.modules.get(name))
      .filter((m): m is ModuleMetadata => m !== undefined);
  }

  /**
   * Register routes from a module
   */
  registerRoutes(moduleName: string, routes: ModuleRoute[]): void {
    // Add module metadata to routes
    const enhancedRoutes = routes.map(route => ({
      ...route,
      meta: {
        ...route.meta,
        module: moduleName,
      },
    }));

    this.moduleRoutes.set(moduleName, enhancedRoutes);

    // Update module metadata
    const module = this.modules.get(moduleName);
    if (module) {
      module.routes = enhancedRoutes;
    }

    this.emit('routes:registered', { module: moduleName, count: routes.length });
  }

  /**
   * Get routes from a specific module
   */
  getRoutes(moduleName: string): ModuleRoute[] {
    return this.moduleRoutes.get(moduleName) || [];
  }

  /**
   * Get all module routes
   */
  getAllRoutes(): ModuleRoute[] {
    const allRoutes: ModuleRoute[] = [];
    for (const routes of this.moduleRoutes.values()) {
      allRoutes.push(...routes);
    }
    return allRoutes;
  }

  /**
   * Register a component from a module
   */
  registerComponent(name: string, component: ComponentType): void {
    this.moduleComponents.set(name, component);
  }

  /**
   * Get a registered component
   */
  getComponent(name: string): ComponentType | undefined {
    return this.moduleComponents.get(name);
  }

  /**
   * Get all registered components
   */
  getAllComponents(): Map<string, ComponentType> {
    return new Map(this.moduleComponents);
  }

  /**
   * Get components from a specific module
   */
  getModuleComponents(moduleName: string): Map<string, ComponentType> {
    const components = new Map<string, ComponentType>();
    for (const [name, component] of this.moduleComponents) {
      if (name.startsWith(`${moduleName}:`)) {
        components.set(name.replace(`${moduleName}:`, ''), component);
      }
    }
    return components;
  }

  /**
   * Register menu items from a module
   */
  registerMenus(moduleName: string, menus: ModuleMenuItem[]): void {
    this.moduleMenus.set(moduleName, menus.map(menu => ({
      ...menu,
      module: moduleName,
    })));
  }

  /**
   * Get menu items from a specific module
   */
  getMenus(moduleName: string): ModuleMenuItem[] {
    return this.moduleMenus.get(moduleName) || [];
  }

  /**
   * Get all module menus sorted by sequence
   */
  getAllMenus(): ModuleMenuItem[] {
    const allMenus: ModuleMenuItem[] = [];
    for (const menus of this.moduleMenus.values()) {
      allMenus.push(...menus);
    }
    return allMenus.sort((a, b) => (a.sequence || 10) - (b.sequence || 10));
  }

  /**
   * Add a dependent to a module
   */
  addDependent(moduleName: string, dependentName: string): void {
    const module = this.modules.get(moduleName);
    if (module && !module.dependents.includes(dependentName)) {
      module.dependents.push(dependentName);
    }
  }

  /**
   * Remove a dependent from a module
   */
  removeDependent(moduleName: string, dependentName: string): void {
    const module = this.modules.get(moduleName);
    if (module) {
      const index = module.dependents.indexOf(dependentName);
      if (index > -1) {
        module.dependents.splice(index, 1);
      }
    }
  }

  /**
   * Check if a module can be unloaded (no dependents)
   */
  canUnload(moduleName: string): { canUnload: boolean; blockers: string[] } {
    const module = this.modules.get(moduleName);
    if (!module) {
      return { canUnload: true, blockers: [] };
    }

    const loadedDependents = module.dependents.filter(dep => this.isLoaded(dep));
    return {
      canUnload: loadedDependents.length === 0,
      blockers: loadedDependents,
    };
  }

  /**
   * Subscribe to registry events
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
        console.error(`Error in module event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Clear all registered modules (mainly for testing)
   */
  clear(): void {
    this.modules.clear();
    this.moduleRoutes.clear();
    this.moduleComponents.clear();
    this.moduleMenus.clear();
    this.loadOrder = [];
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModules: number;
    loadedModules: number;
    totalRoutes: number;
    totalComponents: number;
    totalMenus: number;
  } {
    let loadedCount = 0;
    for (const module of this.modules.values()) {
      if (module.status === Status.LOADED) {
        loadedCount++;
      }
    }

    return {
      totalModules: this.modules.size,
      loadedModules: loadedCount,
      totalRoutes: this.getAllRoutes().length,
      totalComponents: this.moduleComponents.size,
      totalMenus: this.getAllMenus().length,
    };
  }

  /**
   * Export registry state (for debugging/persistence)
   */
  exportState(): {
    modules: Array<{ name: string; status: ModuleStatus; loadedAt?: string }>;
    loadOrder: string[];
  } {
    const modules = Array.from(this.modules.entries()).map(([name, meta]) => ({
      name,
      status: meta.status,
      loadedAt: meta.loadedAt?.toISOString(),
    }));

    return {
      modules,
      loadOrder: [...this.loadOrder],
    };
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();

// Also export the class for testing
export { ModuleRegistry };
