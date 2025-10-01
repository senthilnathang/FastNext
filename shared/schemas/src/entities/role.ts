import { z } from 'zod'

// Role status enum
export const RoleStatusSchema = z.enum([
  'active',
  'inactive',
  'archived'
])

// Permission categories
export const PermissionCategorySchema = z.enum([
  'user_management',
  'role_management', 
  'workflow_management',
  'data_management',
  'system_settings',
  'api_access',
  'reporting',
  'integration_management'
])

// Permission action types
export const PermissionActionSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'execute',
  'manage',
  'view_all',
  'view_own'
])

// Base permission schema
export const PermissionBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string()
    .min(1, 'Permission name is required')
    .max(100, 'Permission name must be less than 100 characters')
    .regex(/^[a-z_]+$/, 'Permission name must be lowercase with underscores only'),
  description: z.string().max(500).optional(),
  category: PermissionCategorySchema,
  action: PermissionActionSchema,
  resource: z.string()
    .min(1, 'Resource is required')
    .max(50, 'Resource must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Resource must be lowercase with underscores only'),
  conditions: z.record(z.unknown()).default({}),
  is_system: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date().nullable()
})

// Permission creation schema
export const PermissionCreateSchema = z.object({
  name: PermissionBaseSchema.shape.name,
  description: PermissionBaseSchema.shape.description.optional(),
  category: PermissionCategorySchema,
  action: PermissionActionSchema,
  resource: PermissionBaseSchema.shape.resource,
  conditions: PermissionBaseSchema.shape.conditions.optional()
})

// Permission update schema
export const PermissionUpdateSchema = z.object({
  name: PermissionBaseSchema.shape.name.optional(),
  description: PermissionBaseSchema.shape.description.optional(),
  category: PermissionCategorySchema.optional(),
  action: PermissionActionSchema.optional(),
  resource: PermissionBaseSchema.shape.resource.optional(),
  conditions: PermissionBaseSchema.shape.conditions.optional()
})

// Base role schema
export const RoleBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_\s-]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'),
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters'),
  description: z.string().max(500).optional(),
  status: RoleStatusSchema.default('active'),
  is_system: z.boolean().default(false),
  is_default: z.boolean().default(false),
  level: z.number().int().nonnegative().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  permissions: z.array(z.number().int().positive()).default([]),
  user_count: z.number().int().nonnegative().default(0),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  created_by: z.number().int().positive().nullable()
})

// Role creation schema
export const RoleCreateSchema = z.object({
  name: RoleBaseSchema.shape.name,
  display_name: RoleBaseSchema.shape.display_name,
  description: RoleBaseSchema.shape.description.optional(),
  status: RoleStatusSchema.optional(),
  level: RoleBaseSchema.shape.level.optional(),
  color: RoleBaseSchema.shape.color.optional(),
  permissions: z.array(z.number().int().positive()).default([])
}).refine((data) => {
  // Validate that role name is unique (this would be enforced at API level)
  return data.name.trim().length > 0
}, {
  message: 'Role name cannot be empty or whitespace only'
})

// Role update schema
export const RoleUpdateSchema = z.object({
  name: RoleBaseSchema.shape.name.optional(),
  display_name: RoleBaseSchema.shape.display_name.optional(),
  description: RoleBaseSchema.shape.description.optional(),
  status: RoleStatusSchema.optional(),
  level: RoleBaseSchema.shape.level.optional(),
  color: RoleBaseSchema.shape.color.optional(),
  permissions: z.array(z.number().int().positive()).optional()
})

// Role assignment schema
export const RoleAssignmentSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  assigned_by: z.number().int().positive(),
  assigned_at: z.date(),
  expires_at: z.date().nullable(),
  is_active: z.boolean().default(true),
  conditions: z.record(z.unknown()).default({})
})

// Role assignment creation schema
export const RoleAssignmentCreateSchema = z.object({
  user_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  expires_at: z.date().nullable().optional(),
  conditions: z.record(z.unknown()).default({})
})

// Role search/filter schema
export const RoleSearchSchema = z.object({
  query: z.string().optional(),
  status: RoleStatusSchema.optional(),
  category: PermissionCategorySchema.optional(),
  is_system: z.boolean().optional(),
  created_after: z.date().optional(),
  created_before: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'display_name', 'level', 'user_count']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
})

// Permission search schema
export const PermissionSearchSchema = z.object({
  query: z.string().optional(),
  category: PermissionCategorySchema.optional(),
  action: PermissionActionSchema.optional(),
  resource: z.string().optional(),
  is_system: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['name', 'category', 'action', 'resource', 'created_at']).default('category'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
})

// Bulk role operations schema
export const RoleBulkUpdateSchema = z.object({
  role_ids: z.array(z.number().int().positive()).min(1, 'At least one role ID is required'),
  updates: z.object({
    status: RoleStatusSchema.optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be updated'
  })
})

// User role permissions view schema
export const UserRolePermissionsSchema = z.object({
  user_id: z.number().int().positive(),
  roles: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    display_name: z.string(),
    level: z.number().int().nonnegative(),
    assigned_at: z.date(),
    expires_at: z.date().nullable()
  })),
  permissions: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    category: PermissionCategorySchema,
    action: PermissionActionSchema,
    resource: z.string(),
    source_roles: z.array(z.string())
  })),
  effective_level: z.number().int().nonnegative()
})

// Type exports
export type RoleStatus = z.infer<typeof RoleStatusSchema>
export type PermissionCategory = z.infer<typeof PermissionCategorySchema>
export type PermissionAction = z.infer<typeof PermissionActionSchema>
export type Permission = z.infer<typeof PermissionBaseSchema>
export type PermissionCreate = z.infer<typeof PermissionCreateSchema>
export type PermissionUpdate = z.infer<typeof PermissionUpdateSchema>
export type Role = z.infer<typeof RoleBaseSchema>
export type RoleCreate = z.infer<typeof RoleCreateSchema>
export type RoleUpdate = z.infer<typeof RoleUpdateSchema>
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>
export type RoleAssignmentCreate = z.infer<typeof RoleAssignmentCreateSchema>
export type RoleSearch = z.infer<typeof RoleSearchSchema>
export type PermissionSearch = z.infer<typeof PermissionSearchSchema>
export type RoleBulkUpdate = z.infer<typeof RoleBulkUpdateSchema>
export type UserRolePermissions = z.infer<typeof UserRolePermissionsSchema>

// Validation helpers
export const validateRole = (data: unknown) => RoleBaseSchema.parse(data)
export const validateRoleCreate = (data: unknown) => RoleCreateSchema.parse(data)
export const validateRoleUpdate = (data: unknown) => RoleUpdateSchema.parse(data)
export const validatePermission = (data: unknown) => PermissionBaseSchema.parse(data)
export const validatePermissionCreate = (data: unknown) => PermissionCreateSchema.parse(data)
export const validateRoleAssignment = (data: unknown) => RoleAssignmentSchema.parse(data)