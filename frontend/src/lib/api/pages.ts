import { apiClient } from './client'
import type { 
  Page, 
  CreatePageRequest, 
  UpdatePageRequest 
} from '@/types'

export const pagesApi = {
  getProjectPages: async (projectId: number): Promise<Page[]> => {
    const response = await apiClient.get(`/pages/project/${projectId}/pages`)
    return response.data
  },

  getPage: async (id: number): Promise<Page> => {
    const response = await apiClient.get(`/pages/${id}`)
    return response.data
  },

  createPage: async (data: CreatePageRequest): Promise<Page> => {
    const response = await apiClient.post('/pages/', data)
    return response.data
  },

  updatePage: async (id: number, data: UpdatePageRequest): Promise<Page> => {
    const response = await apiClient.put(`/pages/${id}`, data)
    return response.data
  },

  deletePage: async (id: number): Promise<void> => {
    await apiClient.delete(`/pages/${id}`)
  },
}