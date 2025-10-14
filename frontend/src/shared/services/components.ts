import type {
  Component,
  ComponentInstance,
  CreateComponentInstanceRequest,
  CreateComponentRequest,
  UpdateComponentInstanceRequest,
} from "@/shared/types";
import { apiClient } from "./api/client";
import { API_CONFIG } from "./api/config";

export const componentsApi = {
  getComponents: async (params?: {
    project_id?: number;
    is_global?: boolean;
  }): Promise<Component[]> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.COMPONENTS, {
      params,
    });
    return response.data;
  },

  getComponent: async (id: number): Promise<Component> => {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.COMPONENTS}/${id}`,
    );
    return response.data;
  },

  createComponent: async (data: CreateComponentRequest): Promise<Component> => {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.COMPONENTS,
      data,
    );
    return response.data;
  },

  getPageComponents: async (pageId: number): Promise<ComponentInstance[]> => {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/page/${pageId}`,
    );
    return response.data;
  },

  createComponentInstance: async (
    data: CreateComponentInstanceRequest,
  ): Promise<ComponentInstance> => {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.COMPONENTS}/instances`,
      data,
    );
    return response.data;
  },

  updateComponentInstance: async (
    id: number,
    data: UpdateComponentInstanceRequest,
  ): Promise<ComponentInstance> => {
    const response = await apiClient.put(
      `${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/${id}`,
      data,
    );
    return response.data;
  },

  deleteComponentInstance: async (id: number): Promise<void> => {
    await apiClient.delete(
      `${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/${id}`,
    );
  },
};
