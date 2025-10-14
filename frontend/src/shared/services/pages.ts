import type {
  CreatePageRequest,
  Page,
  UpdatePageRequest,
} from "@/shared/types";
import { apiClient } from "./api/client";
import { API_CONFIG } from "./api/config";

export const pagesApi = {
  getProjectPages: async (projectId: number): Promise<Page[]> => {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.PAGES}/project/${projectId}/pages`,
    );
    return response.data;
  },

  getPage: async (id: number): Promise<Page> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PAGES}/${id}`);
    return response.data;
  },

  createPage: async (data: CreatePageRequest): Promise<Page> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAGES, data);
    return response.data;
  },

  updatePage: async (id: number, data: UpdatePageRequest): Promise<Page> => {
    const response = await apiClient.put(
      `${API_CONFIG.ENDPOINTS.PAGES}/${id}`,
      data,
    );
    return response.data;
  },

  deletePage: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.PAGES}/${id}`);
  },
};
