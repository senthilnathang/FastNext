/**
 * Module Component Registry
 *
 * Maps module names to their pre-built React components.
 * This allows conditional rendering based on installed modules.
 */

import type { ComponentType } from "react";

// Component registry type
type ComponentRegistry = Map<string, Map<string, ComponentType>>;

// Singleton registry
const componentRegistry: ComponentRegistry = new Map();

/**
 * Register a component for a module
 */
export function registerModuleComponent(
  moduleName: string,
  componentName: string,
  component: ComponentType
): void {
  if (!componentRegistry.has(moduleName)) {
    componentRegistry.set(moduleName, new Map());
  }
  componentRegistry.get(moduleName)!.set(componentName, component);
}

/**
 * Register multiple components for a module
 */
export function registerModuleComponents(
  moduleName: string,
  components: Record<string, ComponentType>
): void {
  for (const [name, component] of Object.entries(components)) {
    registerModuleComponent(moduleName, name, component);
  }
}

/**
 * Get a component from a module
 */
export function getModuleComponent(
  moduleName: string,
  componentName: string
): ComponentType | undefined {
  return componentRegistry.get(moduleName)?.get(componentName);
}

/**
 * Get all components from a module
 */
export function getModuleComponents(
  moduleName: string
): Map<string, ComponentType> | undefined {
  return componentRegistry.get(moduleName);
}

/**
 * Check if a module has a specific component
 */
export function hasModuleComponent(
  moduleName: string,
  componentName: string
): boolean {
  return componentRegistry.get(moduleName)?.has(componentName) ?? false;
}

/**
 * Get all registered module names
 */
export function getRegisteredModules(): string[] {
  return Array.from(componentRegistry.keys());
}

/**
 * Unregister all components for a module
 */
export function unregisterModule(moduleName: string): void {
  componentRegistry.delete(moduleName);
}

/**
 * Clear all registered components
 */
export function clearComponentRegistry(): void {
  componentRegistry.clear();
}

// Export the registry for direct access
export { componentRegistry };
