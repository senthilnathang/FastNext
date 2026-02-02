/**
 * Templates API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface TextTemplate {
  id: number;
  name: string;
  shortcut: string;
  content: string;
  category?: string | null;
  is_system: boolean;
  is_active: boolean;
  use_count: number;
  user_id?: number | null;
  company_id?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface TemplateListParams {
  category?: string;
  include_system?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedTemplates {
  items: TextTemplate[];
  total: number;
}

export interface CreateTemplateData {
  name: string;
  shortcut: string;
  content: string;
  category?: string;
  is_system?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  shortcut?: string;
  content?: string;
  category?: string;
  is_active?: boolean;
}

export interface TemplateExpandRequest {
  shortcut: string;
}

export interface TemplateExpandResponse {
  found: boolean;
  shortcut: string;
  content?: string | null;
  template?: TextTemplate | null;
}

// API Functions
export const templatesApi = {
  /**
   * List all templates available to the current user
   */
  list: (params?: TemplateListParams): Promise<PaginatedTemplates> =>
    apiClient.get("/api/v1/templates", params),

  /**
   * Get a specific template by ID
   */
  get: (templateId: number): Promise<TextTemplate> =>
    apiClient.get(`/api/v1/templates/${templateId}`),

  /**
   * Create a new text template
   */
  create: (data: CreateTemplateData): Promise<TextTemplate> =>
    apiClient.post("/api/v1/templates", data),

  /**
   * Update a text template
   */
  update: (templateId: number, data: UpdateTemplateData): Promise<TextTemplate> =>
    apiClient.put(`/api/v1/templates/${templateId}`, data),

  /**
   * Delete a text template
   */
  delete: (templateId: number): Promise<void> =>
    apiClient.delete(`/api/v1/templates/${templateId}`),

  /**
   * Search templates by name or shortcut
   */
  search: (q: string, params?: { limit?: number }): Promise<TextTemplate[]> =>
    apiClient.get("/api/v1/templates/search", { q, ...params }),

  /**
   * Expand a template shortcut to its content
   */
  expand: (shortcut: string): Promise<TemplateExpandResponse> =>
    apiClient.post("/api/v1/templates/expand", { shortcut }),

  /**
   * Get list of template categories
   */
  listCategories: (): Promise<string[]> =>
    apiClient.get("/api/v1/templates/categories/list"),
};

export default templatesApi;
