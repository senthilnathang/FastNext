import type {
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from "@/shared/types";
import { apiClient } from "./client";
import { API_CONFIG } from "./config";

export interface ProjectListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_public?: boolean;
  user_id?: number;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  skip: number;
  limit: number;
}

// Projects API
export const projectsApi = {
  // Get list of projects
  getProjects: async (
    params?: ProjectListParams,
  ): Promise<ProjectListResponse> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.PROJECTS, {
      params,
    });
    // Backend returns array directly, adapt to expected format
    const items = Array.isArray(response.data)
      ? response.data
      : response.data.items || [];
    return {
      items,
      total: items.length,
      skip: params?.skip || 0,
      limit: params?.limit || 100,
    };
  },

  // Get single project by ID
  getProject: async (id: number): Promise<Project> => {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`,
    );
    return response.data;
  },

  // Create new project
  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.PROJECTS, data);
    return response.data;
  },

  // Update project
  updateProject: async (
    id: number,
    data: UpdateProjectRequest,
  ): Promise<Project> => {
    const response = await apiClient.put(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`,
      data,
    );
    return response.data;
  },

  // Delete project
  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`);
  },
};
