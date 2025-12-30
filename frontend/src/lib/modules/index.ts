/**
 * Module System
 *
 * Dynamic module loading system for FastNext.
 * Provides module discovery, loading, and lifecycle management.
 */

// Types
export * from './types';

// Registry
export { moduleRegistry, ModuleRegistry } from './registry';

// Loader
export { moduleLoader, ModuleLoader } from './loader';
export type { ModuleLoadOptions } from './loader';

// Component Registry
export {
  registerModuleComponent,
  registerModuleComponents,
  getModuleComponent,
  getModuleComponents,
  hasModuleComponent,
  getRegisteredModules,
  unregisterModule,
  clearComponentRegistry,
  componentRegistry,
} from './componentRegistry';
