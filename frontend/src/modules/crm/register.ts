/**
 * CRM Module Registration
 *
 * Registers CRM module components and configuration.
 */

import type { ComponentType } from "react";
import { registerModuleComponents } from "@/lib/modules/componentRegistry";
import { moduleRegistry } from "@/lib/modules/registry";
import type { ModuleConfig } from "@/lib/modules/types";
import { LeadsList, OpportunityKanban } from "./components";

// Module configuration
export const crmModuleConfig: ModuleConfig = {
  name: "crm",
  displayName: "CRM",
  version: "1.0.0",
  menus: [
    {
      id: "crm",
      name: "CRM",
      icon: "Users",
      sequence: 30,
      module: "crm",
      children: [
        {
          id: "crm-dashboard",
          name: "Dashboard",
          path: "/crm",
          icon: "LayoutDashboard",
          sequence: 1,
          module: "crm",
        },
        {
          id: "crm-leads",
          name: "Leads",
          path: "/crm/leads",
          icon: "UserPlus",
          sequence: 2,
          module: "crm",
        },
        {
          id: "crm-opportunities",
          name: "Opportunities",
          path: "/crm/opportunities",
          icon: "TrendingUp",
          sequence: 3,
          module: "crm",
        },
        {
          id: "crm-contacts",
          name: "Contacts",
          path: "/crm/contacts",
          icon: "Contact",
          sequence: 4,
          module: "crm",
        },
        {
          id: "crm-accounts",
          name: "Accounts",
          path: "/crm/accounts",
          icon: "Building",
          sequence: 5,
          module: "crm",
        },
        {
          id: "crm-activities",
          name: "Activities",
          path: "/crm/activities",
          icon: "Activity",
          sequence: 6,
          module: "crm",
        },
        {
          id: "crm-settings",
          name: "Settings",
          path: "/crm/settings",
          icon: "Settings",
          sequence: 10,
          module: "crm",
        },
      ],
    },
  ],
  permissions: [
    "crm.view",
    "crm.leads.view",
    "crm.leads.create",
    "crm.leads.edit",
    "crm.leads.delete",
    "crm.opportunities.view",
    "crm.opportunities.create",
    "crm.opportunities.edit",
    "crm.opportunities.delete",
    "crm.contacts.view",
    "crm.contacts.create",
    "crm.contacts.edit",
    "crm.contacts.delete",
    "crm.accounts.view",
    "crm.accounts.create",
    "crm.accounts.edit",
    "crm.accounts.delete",
    "crm.activities.view",
    "crm.activities.create",
    "crm.activities.edit",
    "crm.activities.delete",
    "crm.settings.manage",
  ],
};

// Register components
export function registerCRMModule(): void {
  // Register components (cast to ComponentType for generic registry)
  registerModuleComponents("crm", {
    LeadsList: LeadsList as ComponentType,
    OpportunityKanban: OpportunityKanban as ComponentType,
  });

  // Register with module registry
  moduleRegistry.register(crmModuleConfig, {
    routes: [
      {
        path: "/crm",
        meta: {
          title: "CRM Dashboard",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/leads",
        meta: {
          title: "Leads",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/leads/:id",
        meta: {
          title: "Lead Details",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/opportunities",
        meta: {
          title: "Opportunities",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/opportunities/:id",
        meta: {
          title: "Opportunity Details",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/contacts",
        meta: {
          title: "Contacts",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/contacts/:id",
        meta: {
          title: "Contact Details",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/accounts",
        meta: {
          title: "Accounts",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/accounts/:id",
        meta: {
          title: "Account Details",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/activities",
        meta: {
          title: "Activities",
          module: "crm",
          requiresAuth: true,
        },
      },
      {
        path: "/crm/settings",
        meta: {
          title: "CRM Settings",
          module: "crm",
          requiresAuth: true,
        },
      },
    ],
    components: new Map<string, ComponentType>([
      ["LeadsList", LeadsList as ComponentType],
      ["OpportunityKanban", OpportunityKanban as ComponentType],
    ]),
  });
}

// Auto-register when imported
let registered = false;
export function ensureCRMModuleRegistered(): void {
  if (!registered) {
    registerCRMModule();
    registered = true;
  }
}
