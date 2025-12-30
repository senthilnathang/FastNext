/**
 * Demo Module API Client
 * Handles demo item operations
 */

import { apiClient } from "./client";

// Types
export interface DemoItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface DemoItemCreate {
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface DemoItemUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface DemoItemListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface PaginatedDemoItems {
  items: DemoItem[];
  total: number;
  skip: number;
  limit: number;
}

// API Functions
export const demoApi = {
  /**
   * List all demo items
   */
  list: (params?: DemoItemListParams): Promise<PaginatedDemoItems> =>
    apiClient.get("/api/v1/demo-items", params),

  /**
   * Get a single demo item by ID
   */
  get: (id: number): Promise<DemoItem> =>
    apiClient.get(`/api/v1/demo-items/${id}`),

  /**
   * Create a new demo item
   */
  create: (data: DemoItemCreate): Promise<DemoItem> =>
    apiClient.post("/api/v1/demo-items", data),

  /**
   * Update a demo item
   */
  update: (id: number, data: DemoItemUpdate): Promise<DemoItem> =>
    apiClient.patch(`/api/v1/demo-items/${id}`, data),

  /**
   * Delete a demo item
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/v1/demo-items/${id}`),
};

export default demoApi;
