/**
 * Employee Module Registration
 */

import type { ComponentType } from "react";
import { registerModuleComponents } from "@/lib/modules/componentRegistry";
import { moduleRegistry } from "@/lib/modules/registry";
import type { ModuleConfig } from "@/lib/modules/types";
import { EmployeeListTable, GenericModuleList } from "./components";

export const employeeModuleConfig: ModuleConfig = {
  name: "employee",
  displayName: "Employee",
  version: "1.0.0",
  menus: [
    {
      id: "employee",
      name: "Employee",
      icon: "Users",
      sequence: 20,
      module: "employee",
      children: [
        {
          id: "employee-dashboard",
          name: "Dashboard",
          path: "/employee",
          icon: "LayoutDashboard",
          sequence: 1,
          module: "employee",
        },
        {
          id: "employee-list",
          name: "Employee List",
          path: "/employee/list",
          icon: "List",
          sequence: 2,
          module: "employee",
        },
        {
          id: "employee-documents",
          name: "Documents",
          path: "/employee/documents",
          icon: "FileText",
          sequence: 3,
          module: "employee",
        },
        {
          id: "employee-notes",
          name: "Notes",
          path: "/employee/notes",
          icon: "StickyNote",
          sequence: 4,
          module: "employee",
        },
        {
          id: "employee-reports",
          name: "Reports",
          path: "/employee/reports",
          icon: "BarChart3",
          sequence: 5,
          module: "employee",
        },
        {
          id: "employee-bonus-points",
          name: "Bonus Points",
          path: "/employee/bonus-points",
          icon: "Award",
          sequence: 6,
          module: "employee",
        },
        {
          id: "employee-disciplinary",
          name: "Disciplinary Actions",
          path: "/employee/disciplinary-actions",
          icon: "AlertTriangle",
          sequence: 7,
          module: "employee",
        },
        {
          id: "employee-policies",
          name: "Policies",
          path: "/employee/policies",
          icon: "Shield",
          sequence: 8,
          module: "employee",
        },
        {
          id: "employee-settings",
          name: "Settings",
          path: "/employee/settings",
          icon: "Settings",
          sequence: 10,
          module: "employee",
        },
      ],
    },
  ],
  permissions: [
    "employee.view",
    "employee.create",
    "employee.edit",
    "employee.delete",
    "employee.documents.view",
    "employee.documents.create",
    "employee.documents.edit",
    "employee.documents.delete",
    "employee.notes.view",
    "employee.notes.create",
    "employee.notes.edit",
    "employee.notes.delete",
    "employee.reports.view",
    "employee.bonus_points.view",
    "employee.bonus_points.create",
    "employee.disciplinary.view",
    "employee.disciplinary.create",
    "employee.policies.view",
    "employee.policies.manage",
    "employee.settings.manage",
  ],
};

export function registerEmployeeModule(): void {
  registerModuleComponents("employee", {
    EmployeeListTable: EmployeeListTable as ComponentType,
    GenericModuleList: GenericModuleList as ComponentType,
  });

  moduleRegistry.register(employeeModuleConfig, {
    routes: [
      { path: "/employee", meta: { title: "Employee Dashboard", module: "employee", requiresAuth: true } },
      { path: "/employee/list", meta: { title: "Employees", module: "employee", requiresAuth: true } },
      { path: "/employee/list/:id", meta: { title: "Employee Detail", module: "employee", requiresAuth: true } },
      { path: "/employee/documents", meta: { title: "Documents", module: "employee", requiresAuth: true } },
      { path: "/employee/notes", meta: { title: "Notes", module: "employee", requiresAuth: true } },
      { path: "/employee/reports", meta: { title: "Reports", module: "employee", requiresAuth: true } },
      { path: "/employee/bonus-points", meta: { title: "Bonus Points", module: "employee", requiresAuth: true } },
      { path: "/employee/disciplinary-actions", meta: { title: "Disciplinary Actions", module: "employee", requiresAuth: true } },
      { path: "/employee/policies", meta: { title: "Policies", module: "employee", requiresAuth: true } },
      { path: "/employee/settings", meta: { title: "Settings", module: "employee", requiresAuth: true } },
    ],
    components: new Map<string, ComponentType>([
      ["EmployeeListTable", EmployeeListTable as ComponentType],
    ]),
  });
}

let registered = false;
export function ensureEmployeeModuleRegistered(): void {
  if (!registered) {
    registerEmployeeModule();
    registered = true;
  }
}
