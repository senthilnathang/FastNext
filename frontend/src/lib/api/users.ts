/**
 * Users API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string | null;
  phone?: string | null;
  timezone: string;
  language: string;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  two_factor_enabled: boolean;
  current_company_id?: number | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CompanyRoleInfo {
  company_id: number;
  company_name: string;
  company_code: string;
  role_id: number;
  role_name: string;
  role_codename: string;
  is_default: boolean;
}

export interface UserWithRoles extends User {
  company_roles: CompanyRoleInfo[];
  permissions: string[];
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedUsers {
  total: number;
  items: User[];
  page: number;
  page_size: number;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  full_name?: string | null;
  phone?: string | null;
  timezone?: string;
  language?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UpdateUserData {
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  timezone?: string | null;
  language?: string | null;
  is_active?: boolean | null;
}

export interface MenuPermission {
  code: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export interface MenuPermissionsResponse {
  menu_permissions: MenuPermission[];
}

export interface UserMentionSuggestion {
  id: number;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface MessageableUserInfo {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_online: boolean;
}

export interface PaginatedMessageableUsers {
  total: number;
  items: MessageableUserInfo[];
  page: number;
  page_size: number;
}

// API Functions
export const usersApi = {
  /**
   * List all users with optional filters
   */
  list: (params?: UserListParams): Promise<PaginatedUsers> =>
    apiClient.get("/api/v1/users/", params),

  /**
   * Get user by ID with roles and permissions
   */
  get: (userId: number): Promise<UserWithRoles> =>
    apiClient.get(`/api/v1/users/${userId}`),

  /**
   * Create a new user
   */
  create: (data: CreateUserData): Promise<User> =>
    apiClient.post("/api/v1/users/", data),

  /**
   * Update a user
   */
  update: (userId: number, data: UpdateUserData): Promise<User> =>
    apiClient.put(`/api/v1/users/${userId}`, data),

  /**
   * Delete a user (soft delete)
   */
  delete: (userId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/users/${userId}`),

  /**
   * Assign user to a company with a role
   */
  assignCompany: (
    userId: number,
    params: { company_id: number; role_id: number; is_default?: boolean }
  ): Promise<{ message: string }> => {
    const query = new URLSearchParams();
    query.append("company_id", String(params.company_id));
    query.append("role_id", String(params.role_id));
    if (params.is_default !== undefined) {
      query.append("is_default", String(params.is_default));
    }
    return apiClient.post(`/api/v1/users/${userId}/assign-company?${query.toString()}`);
  },

  /**
   * Remove user from a company
   */
  removeCompany: (userId: number, companyId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/users/${userId}/remove-company/${companyId}`),

  /**
   * Get menu permissions for a user
   */
  getMenuPermissions: (
    userId: number,
    companyId?: number
  ): Promise<MenuPermissionsResponse> =>
    apiClient.get(`/api/v1/users/${userId}/menu-permissions`, companyId ? { company_id: companyId } : undefined),

  /**
   * Set menu permissions for a user
   */
  setMenuPermissions: (
    userId: number,
    permissions: MenuPermission[],
    companyId?: number
  ): Promise<{ success: boolean; message: string }> =>
    apiClient.put(
      `/api/v1/users/${userId}/menu-permissions${companyId ? `?company_id=${companyId}` : ""}`,
      permissions
    ),

  /**
   * Search users for @mention autocomplete
   */
  searchMentions: (
    q?: string,
    limit?: number
  ): Promise<UserMentionSuggestion[]> =>
    apiClient.get("/api/v1/users/search/mentions", { q, limit }),

  /**
   * Get users that the current user can message
   */
  getMessageable: (params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedMessageableUsers> =>
    apiClient.get("/api/v1/users/messageable", params),
};

export default usersApi;
