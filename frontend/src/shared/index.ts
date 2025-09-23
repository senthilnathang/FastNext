// Shared Module Exports

// Components
export { ErrorBoundary } from './components/feedback/ErrorBoundary'
export { default as QueryProvider } from './components/providers/QueryProvider'
export { ResourceManagementExamples } from './components/ui/ResourceExamples'
export { default as QuickActionButton } from './components/ui/QuickActionButton'
export { default as QuickActionsMenu } from './components/ui/QuickActionsMenu'

// Hooks
export * from './hooks/useApiQuery'

// Services
export * from './services'

// Types (excluding conflicting names)
export type { 
  Project, 
  Page, 
  Component, 
  ComponentInstance, 
  ComponentType,
  Asset,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateComponentRequest,
  CreateComponentInstanceRequest,
  UpdateComponentInstanceRequest
} from './types'

// Constants
export * from './constants'

// Utils
export * from './utils'