import { apiClient } from './api/client'
import { API_CONFIG } from './api/config'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest
} from '@/shared/types'

export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.PROJECTS)
    return response.data
  },

  getProject: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`)
    return response.data
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.PROJECTS, data)
    return response.data
  },

  updateProject: async (id: number, data: UpdateProjectRequest): Promise<Project> => {
    const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`, data)
    return response.data
  },

  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`)
  },
}
