"use client";

import { useContext, useCallback } from "react";
import { AuthContext } from "@/modules/auth";
import { ModuleContext } from "@/shared/providers/ModuleProvider";

export const useUserRole = () => {
  const context = useContext(AuthContext);
  const moduleContext = useContext(ModuleContext);
  const user = context?.user || null;

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // Check if user is superuser/admin (full access)
    if (user.roles?.includes("admin") || user.is_superuser) return true;

    // Check specific permissions
    if (user.permissions?.includes(permission)) return true;

    // Check role-based permissions
    if (user.roles?.includes(permission)) return true;

    return false;
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some((permission) => hasPermission(permission));
  }, [user, hasPermission]);

  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    return (
      user.roles?.includes("admin") ||
      user.is_superuser ||
      hasPermission("system_manage")
    );
  }, [user, hasPermission]);

  /**
   * Check if a module is installed (loaded in the frontend)
   */
  const isModuleInstalled = useCallback((module: string): boolean => {
    // Core/built-in modules are always available
    const coreModules = [
      "administration",
      "configuration",
      "settings",
      "notifications",
      "api-docs",
    ];
    if (coreModules.includes(module)) {
      return true;
    }

    // Dynamic modules loaded from backend - their menus are only returned
    // when the module is installed, so we can trust they're available
    const dynamicModules = ["demo", "crm", "marketplace"];
    if (dynamicModules.includes(module)) {
      return true;
    }

    // Check module context for other frontend-loaded modules
    if (moduleContext?.isModuleLoaded) {
      return moduleContext.isModuleLoaded(module);
    }

    // For modules without context, assume available
    // (This handles cases where ModuleProvider isn't mounted yet)
    return true;
  }, [moduleContext]);

  const canAccessModule = useCallback((module: string): boolean => {
    if (!user) return false;

    // First check if the module is installed
    if (!isModuleInstalled(module)) {
      return false;
    }

    // If user is admin, allow access to all installed modules
    if (isAdmin()) return true;

    // Check module-specific permissions
    const modulePermissions: Record<string, string[]> = {
      compliance: ["compliance.*", "compliance.read"],
      "ai-management": ["ai.*", "ai.read"],
      operations: ["operations.*", "operations.read"],
      administration: [
        "admin.*",
        "admin.read",
        "admin.users",
        "admin.roles",
        "admin.permissions",
        "user_manage",
        "system_manage",
      ],
      builder: ["builder.*", "builder.read"],
      projects: ["projects.*", "projects.read", "project_manage"],
      // Module-specific permissions
      demo: ["demo.*", "demo.view", "demo.read"],
      crm: ["crm.*", "crm.view", "crm.read"],
      marketplace: ["marketplace.*", "marketplace.view", "marketplace.read"],
      notifications: ["notifications.*", "notifications.view"],
    };

    const permissions = modulePermissions[module] || [];

    // If no specific permissions are defined, allow access if module is installed
    if (permissions.length === 0) {
      return true;
    }

    return hasAnyPermission(permissions);
  }, [user, isAdmin, isModuleInstalled, hasAnyPermission]);

  return {
    user,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    isModuleInstalled,
    canAccessModule,
  };
};
