/**
 * ACLs (Access Control Lists) API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface ACL {
  id: number;
  name: string;
  description?: string | null;
  entity_type: string;
  operation: string;
  field_name?: string | null;
  condition_script?: string | null;
  condition_context?: Record<string, unknown>;
  allowed_roles?: string[];
  denied_roles?: string[];
  allowed_users?: number[];
  denied_users?: number[];
  requires_approval: boolean;
  approval_workflow_id?: number | null;
  priority: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string | null;
}

export interface ACLListParams {
  skip?: number;
  limit?: number;
  entity_type?: string;
  operation?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedACLs {
  items: ACL[];
  total: number;
  page: number;
  pages: number;
  size: number;
}

export interface CreateACLData {
  name: string;
  description?: string | null;
  entity_type: string;
  operation: string;
  field_name?: string | null;
  condition_script?: string | null;
  condition_context?: Record<string, unknown>;
  allowed_roles?: string[];
  denied_roles?: string[];
  allowed_users?: number[];
  denied_users?: number[];
  requires_approval?: boolean;
  approval_workflow_id?: number | null;
  priority?: number;
  is_active?: boolean;
}

export interface UpdateACLData {
  name?: string;
  description?: string | null;
  condition_script?: string | null;
  condition_context?: Record<string, unknown>;
  allowed_roles?: string[];
  denied_roles?: string[];
  allowed_users?: number[];
  denied_users?: number[];
  requires_approval?: boolean;
  approval_workflow_id?: number | null;
  priority?: number;
  is_active?: boolean;
}

export interface RecordPermission {
  id: number;
  entity_type: string;
  entity_id: string;
  user_id?: number | null;
  role_id?: number | null;
  operation: string;
  granted_by: number;
  granted_at: string;
  is_active: boolean;
  expires_at?: string | null;
  conditions?: Record<string, unknown>;
  revoked_by?: number | null;
  revoked_at?: string | null;
}

export interface PermissionCheckRequest {
  entity_type: string;
  entity_id?: string | null;
  operation: string;
  field_name?: string | null;
  entity_data?: Record<string, unknown>;
}

export interface PermissionCheckResponse {
  has_access: boolean;
  reason: string;
  applicable_acls?: string[] | null;
}

// API Functions
export const aclsApi = {
  /**
   * List ACLs with optional filtering
   */
  list: (params?: ACLListParams): Promise<PaginatedACLs> =>
    apiClient.get("/api/v1/acls", params),

  /**
   * Get a single ACL by ID
   */
  get: (id: number): Promise<ACL> =>
    apiClient.get(`/api/v1/acls/${id}`),

  /**
   * Create a new ACL
   */
  create: (data: CreateACLData): Promise<ACL> =>
    apiClient.post("/api/v1/acls", data),

  /**
   * Update an ACL
   */
  update: (id: number, data: UpdateACLData): Promise<ACL> =>
    apiClient.put(`/api/v1/acls/${id}`, data),

  /**
   * Delete an ACL
   */
  delete: (id: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/acls/${id}`),

  /**
   * Check if current user has permission for an operation
   */
  checkPermission: (data: PermissionCheckRequest): Promise<PermissionCheckResponse> =>
    apiClient.post("/api/v1/acls/check-permission", data),

  /**
   * Get all permissions for the current user
   */
  getUserPermissions: (params?: { entity_type?: string; entity_id?: string }): Promise<{
    user_id: number;
    permissions: Array<{
      id: number;
      entity_type: string;
      entity_id: string;
      operation: string;
      granted_at: string;
      expires_at?: string | null;
      conditions?: Record<string, unknown>;
    }>;
  }> =>
    apiClient.get("/api/v1/acls/user-permissions", params),

  /**
   * List record permissions
   */
  listRecordPermissions: (params?: {
    skip?: number;
    limit?: number;
    entity_type?: string;
    entity_id?: string;
    user_id?: number;
    operation?: string;
  }): Promise<{
    items: RecordPermission[];
    total: number;
    page: number;
    pages: number;
    size: number;
  }> =>
    apiClient.get("/api/v1/acls/record-permissions", params),

  /**
   * Create a new record permission
   */
  createRecordPermission: (data: {
    entity_type: string;
    entity_id: string;
    user_id?: number | null;
    role_id?: number | null;
    operation: string;
    expires_at?: string | null;
    conditions?: Record<string, unknown>;
  }): Promise<RecordPermission> =>
    apiClient.post("/api/v1/acls/record-permissions", data),

  /**
   * Revoke a record permission
   */
  revokeRecordPermission: (permissionId: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/acls/record-permissions/${permissionId}`),
};

export default aclsApi;
