// Centralized API exports
export * from './client'
export * from './config'

// Resource APIs
export * from './users'
export * from './roles'
export * from './permissions'
export * from './projects'
export * from './components'
export * from './pages'

// Re-export commonly used types
export type { 
  ApiError, 
  ApiErrorResponse 
} from './client'

export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListParams,
  UserListResponse
} from './users'

export type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleListParams,
  RoleListResponse
} from './roles'

export type {
  Permission as PermissionType,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionListParams,
  PermissionListResponse,
  PermissionCategory
} from './permissions'