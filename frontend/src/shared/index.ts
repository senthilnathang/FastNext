// Shared Module Exports

// Components
export { ErrorBoundary } from './components/ErrorBoundary'
export { default as QueryProvider } from './components/QueryProvider'
export { ResourceManagementExamples } from './components/ResourceExamples'
export { default as QuickActionButton } from './components/QuickActionButton'
export { default as QuickActionsMenu } from './components/QuickActionsMenu'

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