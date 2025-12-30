/**
 * Demo Module Registration
 *
 * Registers demo module components and configuration.
 */

import type { ComponentType } from "react";
import { registerModuleComponents } from "@/lib/modules/componentRegistry";
import { moduleRegistry } from "@/lib/modules/registry";
import type { ModuleConfig } from "@/lib/modules/types";
import { DemoItemCard, DemoItemForm, DemoItemList } from "./components";

// Module configuration
export const demoModuleConfig: ModuleConfig = {
  name: "demo",
  displayName: "Demo Module",
  version: "1.0.0",
  menus: [
    {
      id: "demo",
      name: "Demo",
      path: "/demo",
      icon: "FlaskConical",
      sequence: 50,
      module: "demo",
    },
  ],
  permissions: ["demo.view", "demo.create", "demo.edit", "demo.delete"],
};

// Register components
export function registerDemoModule(): void {
  // Register components (cast to ComponentType for generic registry)
  registerModuleComponents("demo", {
    DemoItemCard: DemoItemCard as ComponentType,
    DemoItemForm: DemoItemForm as ComponentType,
    DemoItemList: DemoItemList as ComponentType,
  });

  // Register with module registry
  moduleRegistry.register(demoModuleConfig, {
    routes: [
      {
        path: "/demo",
        meta: {
          title: "Demo",
          module: "demo",
          requiresAuth: true,
        },
      },
      {
        path: "/demo/:id",
        meta: {
          title: "Demo Item",
          module: "demo",
          requiresAuth: true,
        },
      },
    ],
    components: new Map<string, ComponentType>([
      ["DemoItemCard", DemoItemCard as ComponentType],
      ["DemoItemForm", DemoItemForm as ComponentType],
      ["DemoItemList", DemoItemList as ComponentType],
    ]),
  });
}

// Auto-register when imported
let registered = false;
export function ensureDemoModuleRegistered(): void {
  if (!registered) {
    registerDemoModule();
    registered = true;
  }
}
