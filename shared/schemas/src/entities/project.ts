import { z } from 'zod'

// Project status enum
export const ProjectStatusSchema = z.enum([
  'active',
  'inactive',
  'completed',
  'on_hold',
  'cancelled',
  'archived'
])

// Project priority enum
export const ProjectPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
])

// Project visibility enum
export const ProjectVisibilitySchema = z.enum([
  'public',
  'private',
  'internal',
  'restricted'
])

// Project member role enum
export const ProjectRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'viewer',
  'contributor'
])

// Base project schema
export const ProjectBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  slug: z.string()
    .min(1, 'Project slug is required')
    .max(50, 'Project slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Project slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.default('active'),
  priority: ProjectPrioritySchema.default('medium'),
  visibility: ProjectVisibilitySchema.default('private'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  avatar_url: z.string().url().nullable().optional(),
  owner_id: z.number().int().positive(),
  organization_id: z.number().int().positive().nullable(),
  start_date: z.date().nullable(),
  end_date: z.date().nullable(),
  budget: z.number().nonnegative().nullable(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  tags: z.array(z.string().max(30)).default([]),
  metadata: z.record(z.unknown()).default({}),
  settings: z.object({
    enable_workflows: z.boolean().default(true),
    enable_notifications: z.boolean().default(true),
    enable_integrations: z.boolean().default(true),
    enable_analytics: z.boolean().default(true),
    auto_archive_days: z.number().int().positive().nullable().default(null),
    require_approval: z.boolean().default(false)
  }).default({
    enable_workflows: true,
    enable_notifications: true,
    enable_integrations: true,
    enable_analytics: true,
    auto_archive_days: null,
    require_approval: false
  }),
  stats: z.object({
    member_count: z.number().int().nonnegative().default(0),
    workflow_count: z.number().int().nonnegative().default(0),
    task_count: z.number().int().nonnegative().default(0),
    completed_tasks: z.number().int().nonnegative().default(0),
    active_workflows: z.number().int().nonnegative().default(0)
  }).default({}),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  archived_at: z.date().nullable()
}).refine((data) => {
  // End date must be after start date if both are provided
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

// Project creation schema
export const ProjectCreateSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  slug: z.string()
    .min(1, 'Project slug is required')
    .max(50, 'Project slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Project slug can only contain lowercase letters, numbers, and hyphens')
    .optional(), // Auto-generated from name if not provided
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  organization_id: z.number().int().positive().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  tags: z.array(z.string().max(30)).default([]).optional(),
  settings: z.object({
    enable_workflows: z.boolean().default(true),
    enable_notifications: z.boolean().default(true),
    enable_integrations: z.boolean().default(true),
    enable_analytics: z.boolean().default(true),
    auto_archive_days: z.number().int().positive().nullable().default(null),
    require_approval: z.boolean().default(false)
  }).optional()
}).refine((data) => {
  // Validate dates if both provided
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

// Project update schema
export const ProjectUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .optional(),
  slug: z.string()
    .min(1, 'Project slug is required')
    .max(50, 'Project slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Project slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  avatar_url: z.string().url().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  tags: z.array(z.string().max(30)).optional(),
  metadata: z.record(z.unknown()).optional(),
  settings: z.object({
    enable_workflows: z.boolean().default(true),
    enable_notifications: z.boolean().default(true),
    enable_integrations: z.boolean().default(true),
    enable_analytics: z.boolean().default(true),
    auto_archive_days: z.number().int().positive().nullable().default(null),
    require_approval: z.boolean().default(false)
  }).optional()
})

// Project member schema
export const ProjectMemberSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  role: ProjectRoleSchema,
  permissions: z.array(z.string()).default([]),
  invited_by: z.number().int().positive().nullable(),
  invited_at: z.date(),
  joined_at: z.date().nullable(),
  is_active: z.boolean().default(true),
  last_activity: z.date().nullable()
})

// Project member invitation schema
export const ProjectMemberInviteSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  role: ProjectRoleSchema.default('member'),
  permissions: z.array(z.string()).default([]),
  message: z.string().max(500).optional()
})

// Project member update schema
export const ProjectMemberUpdateSchema = z.object({
  role: ProjectRoleSchema.optional(),
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
})

// Project search/filter schema
export const ProjectSearchSchema = z.object({
  query: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  owner_id: z.number().int().positive().optional(),
  organization_id: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  created_after: z.coerce.date().optional(),
  created_before: z.coerce.date().optional(),
  start_date_after: z.coerce.date().optional(),
  start_date_before: z.coerce.date().optional(),
  has_budget: z.boolean().optional(),
  is_overdue: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum([
    'created_at', 'updated_at', 'name', 'status', 'priority',
    'start_date', 'end_date', 'member_count'
  ]).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Project analytics schema
export const ProjectAnalyticsSchema = z.object({
  project_id: z.number().int().positive().optional(),
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
  metrics: z.array(z.enum([
    'task_completion_rate',
    'workflow_execution_count',
    'member_activity',
    'budget_utilization',
    'timeline_adherence'
  ])).default(['task_completion_rate', 'workflow_execution_count']),
  granularity: z.enum(['day', 'week', 'month']).default('week')
}).refine((data) => data.date_from <= data.date_to, {
  message: 'date_from must be before or equal to date_to'
})

// Project template schema
export const ProjectTemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50),
  template_data: z.object({
    default_settings: z.object({
      enable_workflows: z.boolean().default(true),
      enable_notifications: z.boolean().default(true),
      enable_integrations: z.boolean().default(true),
      enable_analytics: z.boolean().default(true),
      auto_archive_days: z.number().int().positive().nullable().default(null),
      require_approval: z.boolean().default(false)
    }),
    default_tags: z.array(z.string()).default([]),
    default_workflows: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      definition: z.record(z.unknown())
    })).default([]),
    default_roles: z.array(z.object({
      role: ProjectRoleSchema,
      permissions: z.array(z.string()).default([])
    })).default([])
  }),
  is_public: z.boolean().default(false),
  usage_count: z.number().int().nonnegative().default(0),
  created_by: z.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date().nullable()
})

// Project archive schema
export const ProjectArchiveSchema = z.object({
  reason: z.string().max(500).optional(),
  archive_workflows: z.boolean().default(true),
  archive_members: z.boolean().default(false),
  notify_members: z.boolean().default(true)
})

// Project restore schema
export const ProjectRestoreSchema = z.object({
  restore_workflows: z.boolean().default(true),
  restore_members: z.boolean().default(true),
  notify_members: z.boolean().default(true)
})

// Bulk project operations schema
export const ProjectBulkUpdateSchema = z.object({
  project_ids: z.array(z.number().int().positive()).min(1, 'At least one project ID is required'),
  updates: z.object({
    status: ProjectStatusSchema.optional(),
    priority: ProjectPrioritySchema.optional(),
    visibility: ProjectVisibilitySchema.optional(),
    tags: z.array(z.string()).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be updated'
  })
})

// Type exports
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>
export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>
export type ProjectRole = z.infer<typeof ProjectRoleSchema>
export type Project = z.infer<typeof ProjectBaseSchema>
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>
export type ProjectMember = z.infer<typeof ProjectMemberSchema>
export type ProjectMemberInvite = z.infer<typeof ProjectMemberInviteSchema>
export type ProjectMemberUpdate = z.infer<typeof ProjectMemberUpdateSchema>
export type ProjectSearch = z.infer<typeof ProjectSearchSchema>
export type ProjectAnalytics = z.infer<typeof ProjectAnalyticsSchema>
export type ProjectTemplate = z.infer<typeof ProjectTemplateSchema>
export type ProjectArchive = z.infer<typeof ProjectArchiveSchema>
export type ProjectRestore = z.infer<typeof ProjectRestoreSchema>
export type ProjectBulkUpdate = z.infer<typeof ProjectBulkUpdateSchema>

// Validation helpers
export const validateProject = (data: unknown) => ProjectBaseSchema.parse(data)
export const validateProjectCreate = (data: unknown) => ProjectCreateSchema.parse(data)
export const validateProjectUpdate = (data: unknown) => ProjectUpdateSchema.parse(data)
export const validateProjectMember = (data: unknown) => ProjectMemberSchema.parse(data)
export const validateProjectMemberInvite = (data: unknown) => ProjectMemberInviteSchema.parse(data)
export const validateProjectSearch = (data: unknown) => ProjectSearchSchema.parse(data)
