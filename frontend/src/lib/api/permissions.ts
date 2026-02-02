/**
 * Permissions API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Permission {
  id: number;
  name: string;
  codename: string;
  description?: string | null;
  category: string;
  action: string;
  resource?: string | null;
  is_system_permission: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface PermissionGrouped {
  category: string;
  permissions: Permission[];
}

export interface PermissionListParams {
  page?: number;
  page_size?: number;
  category?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedPermissions {
  total: number;
  items: Permission[];
  page: number;
  page_size: number;
}

export interface CreatePermissionData {
  name: string;
  codename: string;
  description?: string | null;
  category: string;
  action: string;
  resource?: string | null;
  is_active?: boolean;
}

// API Functions
export const permissionsApi = {
  /**
   * List all permissions with optional filters
   */
  list: (params?: PermissionListParams): Promise<PaginatedPermissions> =>
    apiClient.get("/api/v1/permissions/", params),

  /**
   * List all permissions grouped by category
   */
  grouped: (): Promise<PermissionGrouped[]> =>
    apiClient.get("/api/v1/permissions/grouped"),

  /**
   * Get permission by ID
   */
  get: (permissionId: number): Promise<Permission> =>
    apiClient.get(`/api/v1/permissions/${permissionId}`),

  /**
   * Create a new permission
   */
  create: (data: CreatePermissionData): Promise<Permission> =>
    apiClient.post("/api/v1/permissions/", data),

  /**
   * Delete a permission
   */
  delete: (permissionId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/permissions/${permissionId}`),
};

export default permissionsApi;
