// Builder Types
export interface Component {
  id: number
  name: string
  display_name: string
  description?: string
  category: string
  component_schema: Record<string, any>
  default_props: Record<string, any>
  is_global: boolean
  project_id?: number
  created_at: string
  updated_at: string
}

export interface ComponentInstance {
  id: string
  component_id: number
  page_id: number
  props: Record<string, any>
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  parent_id?: string
  order: number
  created_at: string
  updated_at: string
}

export interface BuilderState {
  selectedComponent: ComponentInstance | null
  draggedComponent: Component | null
  canvasComponents: ComponentInstance[]
  isPreviewMode: boolean
}