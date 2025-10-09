import { apiClient } from './client'
import { API_CONFIG } from './config'

export interface Permission {
  id: number
  name: string
  codename?: string
  description?: string
  category?: string
  resource_type?: string
  action: string
  resource?: string
  is_active?: boolean
  is_system_permission: boolean
  created_at?: string
  updated_at?: string
}

export interface CreatePermissionRequest {
  name: string
  codename?: string
  description?: string
  category?: string
  resource_type?: string
  action: string
  resource?: string
  is_active?: boolean
}

export interface UpdatePermissionRequest {
  name?: string
  description?: string
  category?: string
  action?: string
  resource?: string
}

export interface PermissionListParams {
  skip?: number
  limit?: number
  category?: string
  search?: string
  system_only?: boolean
}

export interface PermissionListResponse {
  items: Permission[]
  total: number
  skip: number
  limit: number
}

// Permissions API
export const permissionsApi = {
  // Get list of permissions
  getPermissions: async (params?: PermissionListParams): Promise<PermissionListResponse> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.PERMISSIONS, { params })
    return response.data
  },

  // Get single permission by ID
  getPermission: async (id: number): Promise<Permission> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/${id}`)
    return response.data
  },

  // Create new permission
  createPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.PERMISSIONS, data)
    return response.data
  },

  // Update permission
  updatePermission: async (id: number, data: UpdatePermissionRequest): Promise<Permission> => {
    const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/${id}`, data)
    return response.data
  },

  // Delete permission
  deletePermission: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/${id}`)
  },

  // Get permissions grouped by category
  getPermissionsByCategory: async (): Promise<Record<string, Permission[]>> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/by-category`)
    return response.data
  },

  // Get list of permission categories
  getPermissionCategories: async (): Promise<string[]> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/categories`)
    return response.data
  },

  // Get list of permission actions
  getPermissionActions: async (): Promise<string[]> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PERMISSIONS}/actions`)
    return response.data
  },
}