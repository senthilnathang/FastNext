/**
 * Inbox API Client
 * Handles unified inbox operations for notifications, messages, and activities
 */

import { apiClient } from "./client";

// Types
export type InboxItemType = "notification" | "message" | "mention" | "activity" | "task" | "approval";
export type InboxPriority = "low" | "normal" | "high" | "urgent";
export type InboxStatus = "unread" | "read" | "archived" | "deleted";

export interface InboxItem {
  id: number;
  user_id: number;
  item_type: InboxItemType;
  priority: InboxPriority;
  status: InboxStatus;
  title: string;
  summary: string | null;
  body: string | null;
  body_html: string | null;
  model_name: string | null;
  record_id: number | null;
  source_id: number | null;
  source_type: string | null;
  action_url: string | null;
  action_label: string | null;
  icon: string | null;
  icon_color: string | null;
  is_pinned: boolean;
  is_starred: boolean;
  is_actionable: boolean;
  action_completed: boolean;
  expires_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string | null;
  labels?: InboxLabel[];
  related_record?: Record<string, unknown>;
}

export interface InboxLabel {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
  description?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface InboxListParams {
  item_type?: InboxItemType;
  priority?: InboxPriority;
  status?: InboxStatus;
  is_pinned?: boolean;
  is_starred?: boolean;
  is_actionable?: boolean;
  label_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface CreateInboxItemData {
  item_type: InboxItemType;
  priority?: InboxPriority;
  title: string;
  summary?: string;
  body?: string;
  body_html?: string;
  model_name?: string;
  record_id?: number;
  action_url?: string;
  action_label?: string;
  icon?: string;
  icon_color?: string;
  is_actionable?: boolean;
  expires_at?: string;
  label_ids?: number[];
}

export interface UpdateInboxItemData {
  status?: InboxStatus;
  priority?: InboxPriority;
  is_pinned?: boolean;
  is_starred?: boolean;
  action_completed?: boolean;
}

export interface InboxStats {
  total: number;
  unread: number;
  by_type: { [key in InboxItemType]?: number };
  by_priority: { [key in InboxPriority]?: number };
  actionable: number;
  starred: number;
  pinned: number;
}

export interface PaginatedInboxItems {
  items: InboxItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors?: { id: number; error: string }[];
}

// API Functions
export const inboxApi = {
  /**
   * List inbox items with optional filters
   */
  list: (params?: InboxListParams): Promise<PaginatedInboxItems> =>
    apiClient.get("/api/v1/inbox", params),

  /**
   * Get a single inbox item by ID
   */
  get: (id: number): Promise<InboxItem> =>
    apiClient.get(`/api/v1/inbox/${id}`),

  /**
   * Create a new inbox item
   */
  create: (data: CreateInboxItemData): Promise<InboxItem> =>
    apiClient.post("/api/v1/inbox", data),

  /**
   * Update an inbox item
   */
  update: (id: number, data: UpdateInboxItemData): Promise<InboxItem> =>
    apiClient.patch(`/api/v1/inbox/${id}`, data),

  /**
   * Delete an inbox item
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/inbox/${id}`),

  /**
   * Mark item as read
   */
  markRead: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/read`),

  /**
   * Mark item as unread
   */
  markUnread: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/unread`),

  /**
   * Archive an item
   */
  archive: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/archive`),

  /**
   * Unarchive an item
   */
  unarchive: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/unarchive`),

  /**
   * Toggle star on item
   */
  toggleStar: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/star`),

  /**
   * Toggle pin on item
   */
  togglePin: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/pin`),

  /**
   * Mark action as completed
   */
  completeAction: (id: number): Promise<InboxItem> =>
    apiClient.post(`/api/v1/inbox/${id}/complete`),

  // Bulk operations
  bulk: {
    /**
     * Mark multiple items as read
     */
    markRead: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/read", { ids }),

    /**
     * Mark multiple items as unread
     */
    markUnread: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/unread", { ids }),

    /**
     * Archive multiple items
     */
    archive: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/archive", { ids }),

    /**
     * Delete multiple items
     */
    delete: (ids: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/delete", { ids }),

    /**
     * Add labels to multiple items
     */
    addLabels: (ids: number[], labelIds: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/labels/add", { ids, label_ids: labelIds }),

    /**
     * Remove labels from multiple items
     */
    removeLabels: (ids: number[], labelIds: number[]): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/labels/remove", { ids, label_ids: labelIds }),

    /**
     * Mark all as read
     */
    markAllRead: (params?: { item_type?: InboxItemType }): Promise<BulkActionResult> =>
      apiClient.post("/api/v1/inbox/bulk/read-all", params),
  },

  // Stats
  stats: {
    /**
     * Get inbox statistics
     */
    get: (): Promise<InboxStats> =>
      apiClient.get("/api/v1/inbox/stats"),

    /**
     * Get unread count
     */
    getUnreadCount: (): Promise<{ count: number }> =>
      apiClient.get("/api/v1/inbox/stats/unread"),

    /**
     * Get counts by type
     */
    getByType: (): Promise<{ [key in InboxItemType]?: number }> =>
      apiClient.get("/api/v1/inbox/stats/by-type"),
  },

  // Labels
  labels: {
    /**
     * List all labels
     */
    list: (): Promise<InboxLabel[]> =>
      apiClient.get("/api/v1/inbox/labels"),

    /**
     * Get a label by ID
     */
    get: (id: number): Promise<InboxLabel> =>
      apiClient.get(`/api/v1/inbox/labels/${id}`),

    /**
     * Create a new label
     */
    create: (data: { name: string; color: string; icon?: string; description?: string }): Promise<InboxLabel> =>
      apiClient.post("/api/v1/inbox/labels", data),

    /**
     * Update a label
     */
    update: (id: number, data: { name?: string; color?: string; icon?: string; description?: string }): Promise<InboxLabel> =>
      apiClient.patch(`/api/v1/inbox/labels/${id}`, data),

    /**
     * Delete a label
     */
    delete: (id: number): Promise<void> =>
      apiClient.delete(`/api/v1/inbox/labels/${id}`),

    /**
     * Add label to inbox item
     */
    addToItem: (itemId: number, labelId: number): Promise<InboxItem> =>
      apiClient.post(`/api/v1/inbox/${itemId}/labels/${labelId}`),

    /**
     * Remove label from inbox item
     */
    removeFromItem: (itemId: number, labelId: number): Promise<InboxItem> =>
      apiClient.delete(`/api/v1/inbox/${itemId}/labels/${labelId}`),
  },

  // Search
  search: {
    /**
     * Search inbox items
     */
    query: (query: string, params?: Omit<InboxListParams, "search">): Promise<PaginatedInboxItems> =>
      apiClient.get("/api/v1/inbox/search", { ...params, q: query }),

    /**
     * Get recent searches
     */
    getRecent: (): Promise<string[]> =>
      apiClient.get("/api/v1/inbox/search/recent"),

    /**
     * Clear recent searches
     */
    clearRecent: (): Promise<void> =>
      apiClient.delete("/api/v1/inbox/search/recent"),
  },
};

export default inboxApi;
