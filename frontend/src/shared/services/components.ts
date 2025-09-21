import { apiClient } from './client'
import type { 
  Component, 
  ComponentInstance,
  CreateComponentRequest,
  CreateComponentInstanceRequest,
  UpdateComponentInstanceRequest
} from '@/shared/types'

export const componentsApi = {
  getComponents: async (params?: { 
    project_id?: number; 
    is_global?: boolean 
  }): Promise<Component[]> => {
    const response = await apiClient.get('/components/', { params })
    return response.data
  },

  getComponent: async (id: number): Promise<Component> => {
    const response = await apiClient.get(`/components/${id}`)
    return response.data
  },

  createComponent: async (data: CreateComponentRequest): Promise<Component> => {
    const response = await apiClient.post('/components/', data)
    return response.data
  },

  getPageComponents: async (pageId: number): Promise<ComponentInstance[]> => {
    const response = await apiClient.get(`/components/instances/page/${pageId}`)
    return response.data
  },

  createComponentInstance: async (data: CreateComponentInstanceRequest): Promise<ComponentInstance> => {
    const response = await apiClient.post('/components/instances/', data)
    return response.data
  },

  updateComponentInstance: async (
    id: number, 
    data: UpdateComponentInstanceRequest
  ): Promise<ComponentInstance> => {
    const response = await apiClient.put(`/components/instances/${id}`, data)
    return response.data
  },

  deleteComponentInstance: async (id: number): Promise<void> => {
    await apiClient.delete(`/components/instances/${id}`)
  },
}