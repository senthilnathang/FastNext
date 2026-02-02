/**
 * RBAC API Client
 * Matches backend API schema for menus, content types, and access rules
 */

import { apiClient } from "./client";

// Types matching backend

export interface MenuItem {
  id: number;
  name: string;
  code: string;
  path: string;
  icon?: string | null;
  parent_id?: number | null;
  order: number;
  is_active: boolean;
  children: MenuItem[];
}

export interface ContentType {
  id: number;
  app_label: string;
  model: string;
  name: string;
}

export type AccessRuleScope = "own" | "department" | "company" | "all" | "custom";

export interface AccessRule {
  id: number;
  name: string;
  description?: string | null;
  content_type: number;
  content_type_name: string;
  scope: string;
  filters: Record<string, unknown>;
  can_view: boolean;
  can_add: boolean;
  can_change: boolean;
  can_delete: boolean;
  priority: number;
  is_active: boolean;
  user?: number | null;
  group?: number | null;
}

export interface AccessRuleCreateData {
  name: string;
  description?: string;
  content_type: number;
  scope?: string;
  filters?: Record<string, unknown>;
  can_view?: boolean;
  can_add?: boolean;
  can_change?: boolean;
  can_delete?: boolean;
  priority?: number;
  is_active?: boolean;
  user?: number;
  group?: number;
}

export interface AccessRuleUpdateData {
  name?: string;
  description?: string;
  scope?: string;
  filters?: Record<string, unknown>;
  can_view?: boolean;
  can_add?: boolean;
  can_change?: boolean;
  can_delete?: boolean;
  priority?: number;
  is_active?: boolean;
}

export interface AccessRuleListParams {
  user?: number;
  group?: number;
  content_type?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedAccessRules {
  total: number;
  items: AccessRule[];
  page: number;
  page_size: number;
}

export interface MenuPermission {
  code: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface AccessibleMenuResponse {
  code: string;
  menu_item_id: number;
  name: string;
  path?: string | null;
  icon?: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
  source: string;
}

// API Functions
export const rbacApi = {
  // ---- Menu Endpoints ----

  /**
   * Get menu items as tree structure
   */
  getMenuTree: (): Promise<MenuItem[]> =>
    apiClient.get("/api/v1/menus/tree"),

  /**
   * Get menu items as flat list (no children nested)
   */
  getMenuFlat: (): Promise<MenuItem[]> =>
    apiClient.get("/api/v1/menus/flat"),

  /**
   * Get menus accessible to the current user
   */
  getAccessibleMenus: (): Promise<AccessibleMenuResponse[]> =>
    apiClient.get("/api/v1/menus/accessible"),

  /**
   * Get list of menu codes accessible to the current user
   */
  getAccessibleMenuCodes: (): Promise<string[]> =>
    apiClient.get("/api/v1/menus/accessible/codes"),

  // ---- Content Type Endpoints ----

  /**
   * Get all available content types
   */
  getContentTypes: (): Promise<ContentType[]> =>
    apiClient.get("/api/v1/content-types"),

  /**
   * Get a specific content type by ID
   */
  getContentType: (contentTypeId: number): Promise<ContentType> =>
    apiClient.get(`/api/v1/content-types/${contentTypeId}`),

  // ---- Access Rule Endpoints ----

  /**
   * List access rules with optional filters
   */
  listAccessRules: (params?: AccessRuleListParams): Promise<PaginatedAccessRules> =>
    apiClient.get("/api/v1/access-rules", params),

  /**
   * Create a new access rule
   */
  createAccessRule: (data: AccessRuleCreateData): Promise<AccessRule> =>
    apiClient.post("/api/v1/access-rules", data),

  /**
   * Get a specific access rule by ID
   */
  getAccessRule: (ruleId: number): Promise<AccessRule> =>
    apiClient.get(`/api/v1/access-rules/${ruleId}`),

  /**
   * Update an access rule
   */
  updateAccessRule: (ruleId: number, data: AccessRuleUpdateData): Promise<AccessRule> =>
    apiClient.put(`/api/v1/access-rules/${ruleId}`, data),

  /**
   * Delete an access rule
   */
  deleteAccessRule: (ruleId: number): Promise<void> =>
    apiClient.delete(`/api/v1/access-rules/${ruleId}`),
};

export default rbacApi;
