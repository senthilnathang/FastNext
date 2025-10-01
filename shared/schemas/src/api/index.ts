import { z } from 'zod'
import {
  UserCreateSchema,
  UserUpdateSchema,
  UserSearchSchema,
  LoginSchema,
  RegisterSchema,
  PasswordChangeSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  EmailVerificationSchema,
  RoleCreateSchema,
  RoleUpdateSchema,
  RoleSearchSchema,
  PermissionCreateSchema,
  PermissionUpdateSchema,
  PermissionSearchSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ProjectSearchSchema,
  ProjectMemberInviteSchema,
  ProjectMemberUpdateSchema,
  WorkflowCreateSchema,
  WorkflowUpdateSchema,
  WorkflowSearchSchema,
  ExecutionSearchSchema,
  WorkflowAnalyticsSchema,
  ImportJobCreateSchema,
  ExportJobCreateSchema,
  FileValidationRequestSchema,
  JobSearchSchema,
  JobBulkOperationSchema,
  ApiResponseSchema,
  PaginatedResponseSchema
} from '../entities'

// Authentication API schemas
export const AuthLoginRequestSchema = LoginSchema
export const AuthRegisterRequestSchema = RegisterSchema
export const AuthForgotPasswordRequestSchema = ForgotPasswordSchema
export const AuthResetPasswordRequestSchema = ResetPasswordSchema
export const AuthVerifyEmailRequestSchema = EmailVerificationSchema
export const AuthChangePasswordRequestSchema = PasswordChangeSchema

export const AuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
  user: z.object({
    id: z.number().int().positive(),
    email: z.string().email(),
    username: z.string(),
    full_name: z.string(),
    is_verified: z.boolean(),
    roles: z.array(z.string())
  })
})

export const AuthRefreshRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
})

// User API schemas
export const UserCreateRequestSchema = UserCreateSchema
export const UserUpdateRequestSchema = UserUpdateSchema
export const UserSearchRequestSchema = UserSearchSchema

export const UserBulkActionRequestSchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1),
  action: z.enum(['activate', 'deactivate', 'verify', 'unverify', 'delete']),
  reason: z.string().max(500).optional()
})

// Role and Permission API schemas
export const RoleCreateRequestSchema = RoleCreateSchema
export const RoleUpdateRequestSchema = RoleUpdateSchema
export const RoleSearchRequestSchema = RoleSearchSchema

export const PermissionCreateRequestSchema = PermissionCreateSchema
export const PermissionUpdateRequestSchema = PermissionUpdateSchema
export const PermissionSearchRequestSchema = PermissionSearchSchema

export const RolePermissionAssignRequestSchema = z.object({
  permission_ids: z.array(z.number().int().positive()).min(1)
})

export const UserRoleAssignRequestSchema = z.object({
  role_ids: z.array(z.number().int().positive()).min(1),
  expires_at: z.coerce.date().optional()
})

// Project API schemas
export const ProjectCreateRequestSchema = ProjectCreateSchema
export const ProjectUpdateRequestSchema = ProjectUpdateSchema
export const ProjectSearchRequestSchema = ProjectSearchSchema

export const ProjectMemberInviteRequestSchema = ProjectMemberInviteSchema
export const ProjectMemberUpdateRequestSchema = ProjectMemberUpdateSchema

export const ProjectTransferRequestSchema = z.object({
  new_owner_id: z.number().int().positive(),
  confirm: z.boolean().refine(val => val === true, {
    message: 'Confirmation is required for project transfer'
  })
})

export const ProjectArchiveRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  notify_members: z.boolean().default(true)
})

// Workflow API schemas
export const WorkflowCreateRequestSchema = WorkflowCreateSchema
export const WorkflowUpdateRequestSchema = WorkflowUpdateSchema
export const WorkflowSearchRequestSchema = WorkflowSearchSchema
export const WorkflowExecutionSearchRequestSchema = ExecutionSearchSchema
export const WorkflowAnalyticsRequestSchema = WorkflowAnalyticsSchema

export const WorkflowExecuteRequestSchema = z.object({
  input_data: z.record(z.unknown()).default({}),
  trigger_type: z.enum(['manual', 'api', 'webhook']).default('manual')
})

export const WorkflowScheduleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cron_expression: z.string().regex(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    'Invalid cron expression'
  ),
  timezone: z.string().default('UTC'),
  is_active: z.boolean().default(true),
  input_data: z.record(z.unknown()).default({})
})

export const WorkflowDuplicateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  copy_schedules: z.boolean().default(false)
})

// Data Import/Export API schemas
export const ImportJobCreateRequestSchema = ImportJobCreateSchema
export const ExportJobCreateRequestSchema = ExportJobCreateSchema
export const ApiFileValidationRequestSchema = FileValidationRequestSchema
export const JobSearchRequestSchema = JobSearchSchema
export const JobBulkOperationRequestSchema = JobBulkOperationSchema

export const FileUploadRequestSchema = z.object({
  table_name: z.string().min(1),
  import_options: z.string().optional(), // JSON string
  field_mappings: z.string().optional()   // JSON string
})

export const ImportExecuteRequestSchema = z.object({
  validation_id: z.string().uuid(),
  skip_validation: z.boolean().default(false),
  dry_run: z.boolean().default(false)
})

// File management API schemas
export const FileDeleteRequestSchema = z.object({
  file_paths: z.array(z.string().min(1)).min(1),
  permanent: z.boolean().default(false)
})

export const FileDownloadRequestSchema = z.object({
  file_path: z.string().min(1),
  download_name: z.string().optional()
})

// Integration API schemas
export const IntegrationCreateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['slack', 'postgresql', 'sendgrid', 's3', 'webhook', 'custom']),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()),
  is_active: z.boolean().default(true),
  test_connection: z.boolean().default(true)
})

export const IntegrationUpdateRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional()
})

export const IntegrationTestRequestSchema = z.object({
  config: z.record(z.unknown()),
  test_type: z.enum(['connection', 'authentication', 'permissions']).default('connection')
})

// Webhook API schemas
export const WebhookCreateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  is_active: z.boolean().default(true),
  retry_config: z.object({
    max_attempts: z.number().int().min(1).max(10).default(3),
    retry_delay_ms: z.number().int().min(100).max(60000).default(1000)
  }).optional()
})

export const WebhookUpdateRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().optional(),
  is_active: z.boolean().optional(),
  retry_config: z.object({
    max_attempts: z.number().int().min(1).max(10),
    retry_delay_ms: z.number().int().min(100).max(60000)
  }).optional()
})

export const WebhookTestRequestSchema = z.object({
  url: z.string().url(),
  payload: z.record(z.unknown()).default({}),
  headers: z.record(z.string()).default({})
})

// System API schemas
export const SystemHealthRequestSchema = z.object({
  include_details: z.boolean().default(false)
})

export const SystemStatsRequestSchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
})

export const SystemBackupRequestSchema = z.object({
  tables: z.array(z.string()).optional(),
  compress: z.boolean().default(true),
  include_data: z.boolean().default(true)
})

// Notification API schemas
export const NotificationCreateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  recipient_ids: z.array(z.number().int().positive()).optional(),
  recipient_roles: z.array(z.string()).optional(),
  send_email: z.boolean().default(false),
  send_push: z.boolean().default(true),
  scheduled_at: z.coerce.date().optional()
})

export const NotificationMarkReadRequestSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1)
})

// Settings API schemas
export const SettingsUpdateRequestSchema = z.object({
  settings: z.record(z.unknown()),
  merge: z.boolean().default(true)
})

export const SettingsExportRequestSchema = z.object({
  categories: z.array(z.string()).optional(),
  format: z.enum(['json', 'yaml', 'env']).default('json')
})

export const SettingsImportRequestSchema = z.object({
  settings: z.record(z.unknown()),
  overwrite: z.boolean().default(false),
  validate_only: z.boolean().default(false)
})

// API Response wrappers
export const createApiResponseSchema = <T>(dataSchema: z.ZodType<T>) => 
  z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional()
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      details: z.unknown().optional(),
      code: z.string().optional()
    })
  ])

export const createPaginatedApiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  createApiResponseSchema(PaginatedResponseSchema(dataSchema))

// Type exports for API schemas
export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>
export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>
export type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>
export type UserUpdateRequest = z.infer<typeof UserUpdateRequestSchema>
export type UserSearchRequest = z.infer<typeof UserSearchRequestSchema>
export type ProjectCreateRequest = z.infer<typeof ProjectCreateRequestSchema>
export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateRequestSchema>
export type WorkflowCreateRequest = z.infer<typeof WorkflowCreateRequestSchema>
export type WorkflowUpdateRequest = z.infer<typeof WorkflowUpdateRequestSchema>
export type ImportJobCreateRequest = z.infer<typeof ImportJobCreateRequestSchema>
export type ExportJobCreateRequest = z.infer<typeof ExportJobCreateRequestSchema>
export type IntegrationCreateRequest = z.infer<typeof IntegrationCreateRequestSchema>
export type WebhookCreateRequest = z.infer<typeof WebhookCreateRequestSchema>
export type NotificationCreateRequest = z.infer<typeof NotificationCreateRequestSchema>