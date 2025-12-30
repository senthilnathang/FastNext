/**
 * Modules Index
 *
 * Central registry for all installable modules.
 * Handles module initialization and registration.
 *
 * Note: Module components, hooks, and types are NOT exported here.
 * They are loaded dynamically when modules are installed via:
 * - import { ... } from "@/modules/demo";
 * - import { ... } from "@/modules/crm";
 * - import { ... } from "@/modules/marketplace";
 */

// Module registration functions (lazy loaded)
const getModuleRegistration = (name: string) => {
  switch (name) {
    case "demo":
      return import("./demo/register").then((m) => m.ensureDemoModuleRegistered);
    case "crm":
      return import("./crm/register").then((m) => m.ensureCRMModuleRegistered);
    case "marketplace":
      return import("./marketplace/register").then((m) => m.ensureMarketplaceModuleRegistered);
    default:
      return Promise.resolve(null);
  }
};

/**
 * Available module names
 */
export const AVAILABLE_MODULES = ["demo", "crm", "marketplace"] as const;
export type AvailableModule = (typeof AVAILABLE_MODULES)[number];

/**
 * Register a specific module (async - loads module code dynamically)
 */
export async function registerModule(moduleName: AvailableModule): Promise<void> {
  const registerFn = await getModuleRegistration(moduleName);
  if (registerFn) {
    registerFn();
  } else {
    console.warn(`Unknown module: ${moduleName}`);
  }
}

/**
 * Register all available modules
 */
export async function registerAllModules(): Promise<void> {
  await Promise.all(AVAILABLE_MODULES.map((name) => registerModule(name)));
}

/**
 * Register modules that are installed (from backend)
 */
export async function registerInstalledModules(installedModules: string[]): Promise<void> {
  const validModules = installedModules.filter((name) =>
    AVAILABLE_MODULES.includes(name as AvailableModule)
  );
  await Promise.all(validModules.map((name) => registerModule(name as AvailableModule)));
}

/**
 * Check if a module is available (has frontend implementation)
 */
export function isModuleAvailable(moduleName: string): boolean {
  return AVAILABLE_MODULES.includes(moduleName as AvailableModule);
}
