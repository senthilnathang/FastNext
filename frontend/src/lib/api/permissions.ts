import { apiClient } from './client'

// Permission types
export interface Permission {
  id: number
  name: string
  description?: string
  category: string // project, page, component, user, system
  action: string // create, read, update, delete, manage, publish, deploy
  resource?: string
  is_system_permission: boolean
  created_at: string
  updated_at?: string
}

export interface CreatePermissionRequest {
  name: string
  description?: string
  category: string
  action: string
  resource?: string
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
  action?: string
  include_system?: boolean
  search?: string
}

export interface PermissionListResponse {
  items: Permission[]
  total: number
  page: number
  pages: number
}

export interface PermissionCategory {
  name: string
  label: string
  description: string
  permissions: Permission[]
}

// Permissions API
export const permissionsApi = {
  // Get list of permissions with pagination and filters
  getPermissions: async (params?: PermissionListParams): Promise<PermissionListResponse> => {
    const response = await apiClient.get('/permissions/', { params })
    return response.data
  },

  // Get permissions grouped by category
  getPermissionsByCategory: async (): Promise<PermissionCategory[]> => {
    const response = await apiClient.get('/permissions/categories')
    return response.data
  },

  // Get single permission by ID
  getPermission: async (id: number): Promise<Permission> => {
    const response = await apiClient.get(`/permissions/${id}`)
    return response.data
  },

  // Create new permission
  createPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await apiClient.post('/permissions/', data)
    return response.data
  },

  // Update permission
  updatePermission: async (id: number, data: UpdatePermissionRequest): Promise<Permission> => {
    const response = await apiClient.put(`/permissions/${id}`, data)
    return response.data
  },

  // Delete permission
  deletePermission: async (id: number): Promise<void> => {
    await apiClient.delete(`/permissions/${id}`)
  },

  // Get available permission categories
  getPermissionCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/permissions/categories/list')
    return response.data
  },

  // Get available permission actions
  getPermissionActions: async (): Promise<string[]> => {
    const response = await apiClient.get('/permissions/actions/list')
    return response.data
  },
}