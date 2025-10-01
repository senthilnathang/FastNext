import { z } from 'zod'

// Common validation schemas
export const EmailSchema = z.string().email('Invalid email format')

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')

export const UrlSchema = z.string().url('Invalid URL format')

export const UuidSchema = z.string().uuid('Invalid UUID format')

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
  .min(1, 'Slug is required')
  .max(100, 'Slug must be less than 100 characters')

export const ColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')

// User schemas
export const UserCreateSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.string().optional(),
})

export const UserUpdateSchema = z.object({
  email: EmailSchema.optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.string().optional(),
})

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
})

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Role schemas
export const RoleCreateSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default([]),
})

export const RoleUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
})

export const PermissionCreateSchema = z.object({
  name: z.string().min(1, 'Permission name is required').max(100),
  description: z.string().max(500).optional(),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
})

// Project schemas
export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(1000).optional(),
  slug: SlugSchema,
  isPublic: z.boolean().default(false),
})

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  slug: SlugSchema.optional(),
  isPublic: z.boolean().optional(),
})

export const ProjectMemberInviteSchema = z.object({
  email: EmailSchema,
  role: z.string().min(1, 'Role is required'),
  projectId: UuidSchema,
})

// Workflow schemas
export const WorkflowCreateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(100),
  description: z.string().max(1000).optional(),
  projectId: UuidSchema,
  definition: z.record(z.string(), z.any()).optional(),
})

export const WorkflowUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  definition: z.record(z.string(), z.any()).optional(),
})

// Data import/export schemas
export const ImportJobCreateSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  tableName: z.string().min(1, 'Table name is required'),
  mappings: z.record(z.string(), z.string()),
  options: z.object({
    skipValidation: z.boolean().default(false),
    batchSize: z.number().min(1).max(1000).default(100),
  }).optional(),
})

export const ExportJobCreateSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
})

export const FileValidationRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

// API request schemas
export const AuthLoginRequestSchema = LoginSchema

export const AuthRegisterRequestSchema = RegisterSchema

export const UserCreateRequestSchema = UserCreateSchema

export const ProjectCreateRequestSchema = ProjectCreateSchema

export const WorkflowCreateRequestSchema = WorkflowCreateSchema

export const ImportJobCreateRequestSchema = ImportJobCreateSchema

// Export type inference helpers
export type UserType = z.infer<typeof UserCreateSchema>
export type UserUpdateType = z.infer<typeof UserUpdateSchema>
export type LoginType = z.infer<typeof LoginSchema>
export type RegisterType = z.infer<typeof RegisterSchema>
export type PasswordChangeType = z.infer<typeof PasswordChangeSchema>
export type ForgotPasswordType = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordType = z.infer<typeof ResetPasswordSchema>

export type RoleType = z.infer<typeof RoleCreateSchema>
export type RoleUpdateType = z.infer<typeof RoleUpdateSchema>
export type PermissionType = z.infer<typeof PermissionCreateSchema>

export type ProjectType = z.infer<typeof ProjectCreateSchema>
export type ProjectUpdateType = z.infer<typeof ProjectUpdateSchema>
export type ProjectMemberInviteType = z.infer<typeof ProjectMemberInviteSchema>

export type WorkflowType = z.infer<typeof WorkflowCreateSchema>
export type WorkflowUpdateType = z.infer<typeof WorkflowUpdateSchema>

export type ImportJobType = z.infer<typeof ImportJobCreateSchema>
export type ExportJobType = z.infer<typeof ExportJobCreateSchema>
export type FileValidationRequestType = z.infer<typeof FileValidationRequestSchema>