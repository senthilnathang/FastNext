import { apiClient } from './client'
import type { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest 
} from '@/types'

export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects/')
    return response.data
  },

  getProject: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`)
    return response.data
  },

  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post('/projects/', data)
    return response.data
  },

  updateProject: async (id: number, data: UpdateProjectRequest): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, data)
    return response.data
  },

  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },
}