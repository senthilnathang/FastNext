// Admin Types
export interface Role {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  description?: string
  category: string
  resource: string
  action: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: number
  user_id: number
  role_id: number
  is_active: boolean
  assigned_at: string
  assigned_by: number
}

export interface ActivityLog {
  id: number
  user_id: number
  action: string
  resource_type: string
  resource_id?: number
  details: Record<string, any>
  ip_address: string
  user_agent: string
  created_at: string
}