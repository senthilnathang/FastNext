/**
 * Bookmarks API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface Bookmark {
  id: number;
  user_id: number;
  bookmark_type: string;
  reference_id: number;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface BookmarkListParams {
  bookmark_type?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedBookmarks {
  items: Bookmark[];
  total: number;
}

export interface BookmarkToggleRequest {
  bookmark_type: string;
  reference_id: number;
  note?: string;
}

export interface BookmarkToggleResponse {
  action: string; // 'added' or 'removed'
  bookmark_type: string;
  reference_id: number;
  bookmark?: Bookmark | null;
}

export interface BookmarkCheckRequest {
  bookmark_type: string;
  reference_ids: number[];
}

export interface BookmarkCheckResponse {
  bookmarked: Record<string, boolean>;
}

// API Functions
export const bookmarksApi = {
  /**
   * List user's bookmarks with optional filters
   */
  list: (params?: BookmarkListParams): Promise<PaginatedBookmarks> =>
    apiClient.get("/api/v1/bookmarks", params),

  /**
   * Get a specific bookmark by ID
   */
  get: (bookmarkId: number): Promise<Bookmark> =>
    apiClient.get(`/api/v1/bookmarks/${bookmarkId}`),

  /**
   * Create a new bookmark
   */
  create: (data: { bookmark_type: string; reference_id: number; note?: string }): Promise<Bookmark> =>
    apiClient.post("/api/v1/bookmarks", data),

  /**
   * Update a bookmark (note only)
   */
  update: (bookmarkId: number, data: { note?: string }): Promise<Bookmark> =>
    apiClient.patch(`/api/v1/bookmarks/${bookmarkId}`, data),

  /**
   * Delete a bookmark
   */
  delete: (bookmarkId: number): Promise<void> =>
    apiClient.delete(`/api/v1/bookmarks/${bookmarkId}`),

  /**
   * Toggle a bookmark (add if not exists, remove if exists)
   */
  toggle: (data: BookmarkToggleRequest): Promise<BookmarkToggleResponse> =>
    apiClient.post("/api/v1/bookmarks/toggle", data),

  /**
   * Check if multiple items are bookmarked
   */
  check: (data: BookmarkCheckRequest): Promise<BookmarkCheckResponse> =>
    apiClient.post("/api/v1/bookmarks/check", data),
};

export default bookmarksApi;
