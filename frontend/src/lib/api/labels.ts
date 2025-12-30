/**
 * Labels API Client
 * Handles label CRUD operations and resource assignments
 */

import { apiClient } from "./client";

// Types
export type ResourceType =
  | "inbox"
  | "message"
  | "conversation"
  | "task"
  | "project"
  | "document"
  | "contact"
  | "ticket"
  | "issue";

export interface Label {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  parent_id?: number | null;
  created_by_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  usage_count?: number;
  children?: Label[];
}

export interface LabelListParams {
  search?: string;
  is_active?: boolean;
  is_system?: boolean;
  parent_id?: number | null;
  include_children?: boolean;
  skip?: number;
  limit?: number;
}

export interface CreateLabelData {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  parent_id?: number;
  sort_order?: number;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
  icon?: string | null;
  description?: string | null;
  is_active?: boolean;
  parent_id?: number | null;
  sort_order?: number;
}

export interface LabelAssignment {
  id: number;
  label_id: number;
  resource_type: ResourceType;
  resource_id: number;
  assigned_by_id: number;
  assigned_at: string;
  label?: Label;
}

export interface PaginatedLabels {
  items: Label[];
  total: number;
  skip: number;
  limit: number;
}

export interface LabelStats {
  total: number;
  active: number;
  system: number;
  by_usage: { label_id: number; name: string; count: number }[];
}

export interface AssignLabelResult {
  success: boolean;
  assignment?: LabelAssignment;
  error?: string;
}

export interface UnassignLabelResult {
  success: boolean;
  error?: string;
}

export interface BulkAssignResult {
  success: number;
  failed: number;
  assignments?: LabelAssignment[];
  errors?: { resource_id: number; error: string }[];
}

// API Functions
export const labelsApi = {
  /**
   * Get all labels
   */
  getLabels: (params?: LabelListParams): Promise<PaginatedLabels> =>
    apiClient.get("/api/v1/labels", params),

  /**
   * Get a single label by ID
   */
  getLabel: (id: number): Promise<Label> =>
    apiClient.get(`/api/v1/labels/${id}`),

  /**
   * Create a new label
   */
  createLabel: (data: CreateLabelData): Promise<Label> =>
    apiClient.post("/api/v1/labels", data),

  /**
   * Update a label
   */
  updateLabel: (id: number, data: UpdateLabelData): Promise<Label> =>
    apiClient.patch(`/api/v1/labels/${id}`, data),

  /**
   * Delete a label
   */
  deleteLabel: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/labels/${id}`),

  /**
   * Assign a label to a resource
   */
  assignLabel: (
    resourceType: ResourceType,
    resourceId: number,
    labelId: number
  ): Promise<AssignLabelResult> =>
    apiClient.post(`/api/v1/labels/${labelId}/assign`, {
      resource_type: resourceType,
      resource_id: resourceId,
    }),

  /**
   * Unassign a label from a resource
   */
  unassignLabel: (
    resourceType: ResourceType,
    resourceId: number,
    labelId: number
  ): Promise<UnassignLabelResult> =>
    apiClient.post(`/api/v1/labels/${labelId}/unassign`, {
      resource_type: resourceType,
      resource_id: resourceId,
    }),

  /**
   * Get labels for a specific resource
   */
  getResourceLabels: (
    resourceType: ResourceType,
    resourceId: number
  ): Promise<Label[]> =>
    apiClient.get(`/api/v1/labels/resource/${resourceType}/${resourceId}`),

  /**
   * Set labels for a resource (replace all)
   */
  setResourceLabels: (
    resourceType: ResourceType,
    resourceId: number,
    labelIds: number[]
  ): Promise<Label[]> =>
    apiClient.put(`/api/v1/labels/resource/${resourceType}/${resourceId}`, {
      label_ids: labelIds,
    }),

  // Bulk operations
  bulk: {
    /**
     * Assign a label to multiple resources
     */
    assign: (
      labelId: number,
      resources: { resource_type: ResourceType; resource_id: number }[]
    ): Promise<BulkAssignResult> =>
      apiClient.post(`/api/v1/labels/${labelId}/bulk/assign`, { resources }),

    /**
     * Unassign a label from multiple resources
     */
    unassign: (
      labelId: number,
      resources: { resource_type: ResourceType; resource_id: number }[]
    ): Promise<BulkAssignResult> =>
      apiClient.post(`/api/v1/labels/${labelId}/bulk/unassign`, { resources }),

    /**
     * Delete multiple labels
     */
    delete: (ids: number[]): Promise<{ success: number; failed: number }> =>
      apiClient.post("/api/v1/labels/bulk/delete", { ids }),

    /**
     * Merge labels (move all assignments to target label)
     */
    merge: (
      sourceIds: number[],
      targetId: number
    ): Promise<{ merged: number; assignments_moved: number }> =>
      apiClient.post("/api/v1/labels/bulk/merge", {
        source_ids: sourceIds,
        target_id: targetId,
      }),
  },

  // Stats
  stats: {
    /**
     * Get label statistics
     */
    get: (): Promise<LabelStats> =>
      apiClient.get("/api/v1/labels/stats"),

    /**
     * Get usage count for a label
     */
    getUsage: (id: number): Promise<{ count: number; by_type: Record<ResourceType, number> }> =>
      apiClient.get(`/api/v1/labels/${id}/stats/usage`),
  },

  // Hierarchy
  hierarchy: {
    /**
     * Get label tree (hierarchical structure)
     */
    getTree: (): Promise<Label[]> =>
      apiClient.get("/api/v1/labels/tree"),

    /**
     * Move label to new parent
     */
    move: (id: number, newParentId: number | null): Promise<Label> =>
      apiClient.post(`/api/v1/labels/${id}/move`, { parent_id: newParentId }),

    /**
     * Reorder labels within a parent
     */
    reorder: (
      parentId: number | null,
      labelIds: number[]
    ): Promise<{ success: boolean }> =>
      apiClient.post("/api/v1/labels/reorder", {
        parent_id: parentId,
        label_ids: labelIds,
      }),
  },
};

export default labelsApi;
