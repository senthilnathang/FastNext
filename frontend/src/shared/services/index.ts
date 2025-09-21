// Centralized API exports
export * from './api/client'
export * from './api/config'

// Resource APIs
export * from './api/users'
export * from './api/roles'
export * from './api/permissions'
export * from './api/projects'
export * from './api/components'
export * from './api'

// Re-export commonly used types
export type { 
  ApiError, 
  ApiResponse 
} from './api/client'

export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListParams,
  UserListResponse
} from './api/users'

export type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleListParams,
  RoleListResponse
} from './api/roles'

export type {
  Permission as PermissionType,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionListParams,
  PermissionListResponse
} from './api/permissions'