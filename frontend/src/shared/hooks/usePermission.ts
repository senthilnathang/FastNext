'use client';

/**
 * Permission Hook
 *
 * Provides permission checking functionality for access control.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

export type Permission = string;
export type Role = string;

export interface User {
  id: number;
  roles?: Role[];
  permissions?: Permission[];
  is_superuser?: boolean;
  is_active?: boolean;
}

export interface UsePermissionOptions {
  /** Current user */
  user?: User | null;
  /** All permissions (for fetching) */
  allPermissions?: Permission[];
  /** Role-permission mapping */
  rolePermissions?: Record<Role, Permission[]>;
}

export interface UsePermissionReturn {
  /** Check if user has a specific permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  /** Check if user has a specific role */
  hasRole: (role: Role) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: Role[]) => boolean;
  /** Check if user has all of the specified roles */
  hasAllRoles: (roles: Role[]) => boolean;
  /** Check if user is superuser */
  isSuperuser: boolean;
  /** Check if user is active */
  isActive: boolean;
  /** Check if user is authenticated */
  isAuthenticated: boolean;
  /** All user permissions (including from roles) */
  permissions: Permission[];
  /** All user roles */
  roles: Role[];
}

/**
 * Permission checking hook
 */
export function usePermission(
  options: UsePermissionOptions = {},
): UsePermissionReturn {
  const { user, rolePermissions = {} } = options;

  // Compute all permissions including those from roles
  const permissions = useMemo(() => {
    if (!user) return [];

    const directPermissions = user.permissions || [];
    const roleBasedPermissions: Permission[] = [];

    // Get permissions from roles
    if (user.roles) {
      user.roles.forEach((role) => {
        const perms = rolePermissions[role] || [];
        roleBasedPermissions.push(...perms);
      });
    }

    // Combine and deduplicate
    return [...new Set([...directPermissions, ...roleBasedPermissions])];
  }, [user, rolePermissions]);

  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user]);

  const isSuperuser = useMemo(() => {
    return user?.is_superuser === true;
  }, [user]);

  const isActive = useMemo(() => {
    return user?.is_active !== false;
  }, [user]);

  const isAuthenticated = useMemo(() => {
    return user != null && user.id != null;
  }, [user]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (isSuperuser) return true;
      return permissions.includes(permission);
    },
    [user, isSuperuser, permissions],
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (perms: Permission[]): boolean => {
      if (!user) return false;
      if (isSuperuser) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [user, isSuperuser, permissions],
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (perms: Permission[]): boolean => {
      if (!user) return false;
      if (isSuperuser) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [user, isSuperuser, permissions],
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: Role): boolean => {
      if (!user) return false;
      return roles.includes(role);
    },
    [user, roles],
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (checkRoles: Role[]): boolean => {
      if (!user) return false;
      return checkRoles.some((r) => roles.includes(r));
    },
    [user, roles],
  );

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = useCallback(
    (checkRoles: Role[]): boolean => {
      if (!user) return false;
      return checkRoles.every((r) => roles.includes(r));
    },
    [user, roles],
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isSuperuser,
    isActive,
    isAuthenticated,
    permissions,
    roles,
  };
}

/**
 * Permission gate component props
 */
export interface PermissionGateProps {
  /** Required permission(s) */
  permission?: Permission | Permission[];
  /** Required role(s) */
  role?: Role | Role[];
  /** Whether all permissions/roles are required (default: false = any) */
  requireAll?: boolean;
  /** Fallback content when permission denied */
  fallback?: React.ReactNode;
  /** Children to render when permitted */
  children: React.ReactNode;
  /** User for permission check */
  user?: User | null;
}

export default usePermission;
