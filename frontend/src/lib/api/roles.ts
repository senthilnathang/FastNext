/**
 * Roles API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Role {
  id: number;
  name: string;
  codename: string;
  description?: string | null;
  company_id?: number | null;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface PermissionInfo {
  id: number;
  name: string;
  codename: string;
  category: string;
  action: string;
}

export interface RoleWithPermissions extends Role {
  permissions: PermissionInfo[];
}

export interface RoleListParams {
  page?: number;
  page_size?: number;
  company_id?: number;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedRoles {
  total: number;
  items: Role[];
  page: number;
  page_size: number;
}

export interface CreateRoleData {
  name: string;
  codename: string;
  description?: string | null;
  company_id?: number | null;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface UpdateRoleData {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  permission_ids?: number[] | null;
}

// API Functions
export const rolesApi = {
  /**
   * List all roles with optional filters
   */
  list: (params?: RoleListParams): Promise<PaginatedRoles> =>
    apiClient.get("/api/v1/roles/", params),

  /**
   * Get role by ID with permissions
   */
  get: (roleId: number): Promise<RoleWithPermissions> =>
    apiClient.get(`/api/v1/roles/${roleId}`),

  /**
   * Create a new role
   */
  create: (data: CreateRoleData): Promise<Role> =>
    apiClient.post("/api/v1/roles/", data),

  /**
   * Update a role
   */
  update: (roleId: number, data: UpdateRoleData): Promise<Role> =>
    apiClient.put(`/api/v1/roles/${roleId}`, data),

  /**
   * Delete a role
   */
  delete: (roleId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/roles/${roleId}`),

  /**
   * Add a permission to a role
   */
  addPermission: (roleId: number, permissionId: number): Promise<{ message: string }> =>
    apiClient.post(`/api/v1/roles/${roleId}/permissions/${permissionId}`),

  /**
   * Remove a permission from a role
   */
  removePermission: (roleId: number, permissionId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/roles/${roleId}/permissions/${permissionId}`),
};

export default rolesApi;
