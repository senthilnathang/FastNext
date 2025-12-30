/**
 * Marketplace Module Registration
 *
 * Registers marketplace module components and configuration.
 */

import type { ComponentType } from "react";
import { registerModuleComponents } from "@/lib/modules/componentRegistry";
import { moduleRegistry } from "@/lib/modules/registry";
import type { ModuleConfig } from "@/lib/modules/types";
import { ModuleCard, ModuleGrid } from "./components";

// Module configuration
export const marketplaceModuleConfig: ModuleConfig = {
  name: "marketplace",
  displayName: "Marketplace",
  version: "1.0.0",
  menus: [
    {
      id: "marketplace",
      name: "Marketplace",
      path: "/marketplace",
      icon: "Store",
      sequence: 60,
      module: "marketplace",
    },
  ],
  permissions: [
    "marketplace.view",
    "marketplace.purchase",
    "marketplace.licenses.view",
    "marketplace.licenses.manage",
    "marketplace.publisher",
  ],
};

// Register components
export function registerMarketplaceModule(): void {
  // Register components (cast to ComponentType for generic registry)
  registerModuleComponents("marketplace", {
    ModuleCard: ModuleCard as ComponentType,
    ModuleGrid: ModuleGrid as ComponentType,
  });

  // Register with module registry
  moduleRegistry.register(marketplaceModuleConfig, {
    routes: [
      {
        path: "/marketplace",
        meta: {
          title: "Marketplace",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/:slug",
        meta: {
          title: "Module Details",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/cart",
        meta: {
          title: "Cart",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/orders",
        meta: {
          title: "Orders",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/orders/:id",
        meta: {
          title: "Order Details",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/licenses",
        meta: {
          title: "My Licenses",
          module: "marketplace",
          requiresAuth: true,
        },
      },
      {
        path: "/marketplace/publisher",
        meta: {
          title: "Publisher Dashboard",
          module: "marketplace",
          requiresAuth: true,
          permissions: ["marketplace.publisher"],
        },
      },
    ],
    components: new Map<string, ComponentType>([
      ["ModuleCard", ModuleCard as ComponentType],
      ["ModuleGrid", ModuleGrid as ComponentType],
    ]),
  });
}

// Auto-register when imported
let registered = false;
export function ensureMarketplaceModuleRegistered(): void {
  if (!registered) {
    registerMarketplaceModule();
    registered = true;
  }
}
