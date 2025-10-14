import { apiClient } from './client'
import { API_CONFIG } from './config'

// Role types
export interface Role {
  id?: number
  name: string
  description?: string
  is_system_role?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  permissions?: Permission[]
  user_count?: number // Number of users with this role
  permission_count?: number // Number of permissions assigned to this role
}

export interface Permission {
  id: number
  name: string
  description?: string
  category: string
  action: string
  resource?: string
  is_system_permission: boolean
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions?: number[] // Permission IDs
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  is_active?: boolean
  permissions?: number[] // Permission IDs
}

export interface RoleListParams {
  skip?: number
  limit?: number
  active_only?: boolean
  include_system?: boolean
  search?: string
}

export interface RoleListResponse {
  items: Role[]
  total: number
  page: number
  pages: number
}

// Roles API
export const rolesApi = {
  // Get list of roles with pagination and filters
  getRoles: async (params?: RoleListParams): Promise<RoleListResponse> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.ROLES, { params })
    return response.data
  },

  // Get single role by ID
  getRole: async (id: number): Promise<Role> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`)
    return response.data
  },

  // Create new role
  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.ROLES, data)
    return response.data
  },

  // Update role
  updateRole: async (id: number, data: UpdateRoleRequest): Promise<Role> => {
    const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`, data)
    return response.data
  },

  // Delete role
  deleteRole: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`)
  },

  // Toggle role active status
  toggleRoleStatus: async (id: number): Promise<Role> => {
    const response = await apiClient.patch(`${API_CONFIG.ENDPOINTS.ROLES}/${id}/toggle-status`)
    return response.data
  },

  // Get role permissions
  getRolePermissions: async (id: number): Promise<Permission[]> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.ROLES}/${id}/permissions`)
    return response.data
  },

  // Assign permissions to role
  assignRolePermissions: async (id: number, permissionIds: number[]): Promise<Role> => {
    const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.ROLES}/${id}/permissions`, {
      permission_ids: permissionIds
    })
    return response.data
  },

  // Remove permissions from role
  removeRolePermissions: async (id: number, permissionIds: number[]): Promise<Role> => {
    const response = await apiClient.delete(`${API_CONFIG.ENDPOINTS.ROLES}/${id}/permissions`, {
      data: { permission_ids: permissionIds }
    })
    return response.data
  },
}
