// Projects Types
export interface Project {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive' | 'completed'
  owner_id: number
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  role: string
  permissions: string[]
  joined_at: string
}