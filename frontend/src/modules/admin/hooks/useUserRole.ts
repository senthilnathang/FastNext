"use client";

import { useContext } from "react";
import { AuthContext } from "@/modules/auth";

export const useUserRole = () => {
  const context = useContext(AuthContext);
  const user = context?.user || null;

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Check if user is superuser/admin (full access)
    if (user.roles?.includes("admin") || user.is_superuser) return true;

    // Check specific permissions
    if (user.permissions?.includes(permission)) return true;

    // Check role-based permissions
    if (user.roles?.includes(permission)) return true;

    return false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some((permission) => hasPermission(permission));
  };

  const isAdmin = (): boolean => {
    if (!user) return false;
    return (
      user.roles?.includes("admin") ||
      user.is_superuser ||
      hasPermission("system_manage")
    );
  };

  const canAccessModule = (module: string): boolean => {
    if (!user) return false;

    // If user is admin, allow access to all modules
    if (isAdmin()) return true;

    // Check module-specific permissions
    const modulePermissions = {
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
    };

    const permissions =
      modulePermissions[module as keyof typeof modulePermissions] || [];
    return hasAnyPermission(permissions);
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    canAccessModule,
  };
};
