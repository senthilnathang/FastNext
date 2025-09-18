export interface User {
  id: number
  email: string
  username: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  user_id: number
  is_public: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface Page {
  id: number
  name: string
  slug: string
  project_id: number
  layout: unknown[]
  meta_data: Record<string, unknown>
  is_home: boolean
  order_index: number
  created_at: string
  updated_at?: string
}

export enum ComponentType {
  LAYOUT = 'layout',
  TEXT = 'text',
  IMAGE = 'image',
  BUTTON = 'button',
  FORM = 'form',
  NAVIGATION = 'navigation',
  CUSTOM = 'custom',
}

export interface Component {
  id: number
  name: string
  type: ComponentType
  category: string
  description?: string
  project_id?: number
  schema: Record<string, unknown>
  default_props: Record<string, unknown>
  template?: string
  styles: Record<string, unknown>
  is_global: boolean
  is_published: boolean
  version: string
  created_at: string
  updated_at?: string
}

export interface ComponentInstance {
  id: number
  component_id: number
  page_id: number
  props: Record<string, unknown>
  position: Record<string, unknown>
  parent_id?: number
  order_index: number
  created_at: string
  updated_at?: string
  component?: Component
}

export interface Asset {
  id: number
  name: string
  original_name: string
  file_path: string
  file_url: string
  mime_type: string
  file_size: number
  user_id: number
  project_id?: number
  is_public: boolean
  created_at: string
  updated_at?: string
}

// API Request/Response types
export interface CreateProjectRequest {
  name: string
  description?: string
  is_public?: boolean
  settings?: Record<string, unknown>
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  is_public?: boolean
  settings?: Record<string, unknown>
}

export interface CreatePageRequest {
  name: string
  slug: string
  project_id: number
  layout?: unknown[]
  meta_data?: Record<string, unknown>
  is_home?: boolean
  order_index?: number
}

export interface UpdatePageRequest {
  name?: string
  slug?: string
  layout?: unknown[]
  meta_data?: Record<string, unknown>
  is_home?: boolean
  order_index?: number
}

export interface CreateComponentRequest {
  name: string
  type: ComponentType
  category?: string
  description?: string
  project_id?: number
  schema?: Record<string, unknown>
  default_props?: Record<string, unknown>
  template?: string
  styles?: Record<string, unknown>
  is_global?: boolean
  is_published?: boolean
  version?: string
}

export interface CreateComponentInstanceRequest {
  component_id: number
  page_id: number
  props?: Record<string, unknown>
  position?: Record<string, unknown>
  parent_id?: number
  order_index?: number
}

export interface UpdateComponentInstanceRequest {
  props?: Record<string, unknown>
  position?: Record<string, unknown>
  parent_id?: number
  order_index?: number
}