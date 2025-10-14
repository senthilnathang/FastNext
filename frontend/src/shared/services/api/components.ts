import { apiClient } from './client'
import { API_CONFIG } from './config'
import type {
  Component,
  ComponentInstance,
  CreateComponentRequest,
  CreateComponentInstanceRequest,
  UpdateComponentInstanceRequest
} from '@/shared/types'

export interface ComponentListParams {
  project_id?: number
  is_global?: boolean
  category?: string
  type?: string
  search?: string
  skip?: number
  limit?: number
}

export interface ComponentListResponse {
  items: Component[]
  total: number
  skip: number
  limit: number
}

export interface ComponentInstanceListParams {
  page_id?: number
  component_id?: number
  parent_id?: number
  skip?: number
  limit?: number
}

export interface ComponentInstanceListResponse {
  items: ComponentInstance[]
  total: number
  skip: number
  limit: number
}

// Components API
export const componentsApi = {
  // Get list of components with pagination and filters
  getComponents: async (params?: ComponentListParams): Promise<ComponentListResponse> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.COMPONENTS, { params })
    return response.data
  },

  // Get single component by ID
  getComponent: async (id: number): Promise<Component> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.COMPONENTS}/${id}`)
    return response.data
  },

  // Create new component
  createComponent: async (data: CreateComponentRequest): Promise<Component> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.COMPONENTS, data)
    return response.data
  },

  // Update component
  updateComponent: async (id: number, data: Partial<CreateComponentRequest>): Promise<Component> => {
    const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.COMPONENTS}/${id}`, data)
    return response.data
  },

  // Delete component
  deleteComponent: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.COMPONENTS}/${id}`)
  },

  // Get component instances
  getComponentInstances: async (params?: ComponentInstanceListParams): Promise<ComponentInstanceListResponse> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.COMPONENTS}/instances`, { params })
    return response.data
  },

  // Get single component instance by ID
  getComponentInstance: async (id: number): Promise<ComponentInstance> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/${id}`)
    return response.data
  },

  // Create new component instance
  createComponentInstance: async (data: CreateComponentInstanceRequest): Promise<ComponentInstance> => {
    const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.COMPONENTS}/instances`, data)
    return response.data
  },

  // Update component instance
  updateComponentInstance: async (id: number, data: UpdateComponentInstanceRequest): Promise<ComponentInstance> => {
    const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/${id}`, data)
    return response.data
  },

  // Delete component instance
  deleteComponentInstance: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.COMPONENTS}/instances/${id}`)
  },

  // Get components for a specific page
  getPageComponents: async (pageId: number): Promise<ComponentInstance[]> => {
    const response = await apiClient.get(`/api/v1/pages/${pageId}/components`)
    return response.data
  },
}
