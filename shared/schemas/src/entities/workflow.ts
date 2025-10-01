import { z } from 'zod'

// Workflow status enum
export const WorkflowStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'archived',
  'error'
])

// Workflow execution status enum
export const ExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'timeout'
])

// Workflow trigger types
export const TriggerTypeSchema = z.enum([
  'manual',
  'schedule',
  'webhook',
  'event',
  'api'
])

// Node types for workflow builder
export const NodeTypeSchema = z.enum([
  'start',
  'end',
  'task',
  'decision',
  'parallel',
  'loop',
  'delay',
  'webhook',
  'script',
  'email',
  'notification'
])

// Base workflow node schema
export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  type: NodeTypeSchema,
  name: z.string().min(1, 'Node name is required').max(100),
  description: z.string().max(500).optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  config: z.record(z.unknown()).default({}),
  connections: z.array(z.object({
    target_node_id: z.string().uuid(),
    condition: z.string().optional()
  })).default([])
})

// Workflow definition schema
export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).min(1, 'Workflow must have at least one node'),
  edges: z.array(z.object({
    id: z.string().uuid(),
    source: z.string().uuid(),
    target: z.string().uuid(),
    condition: z.string().optional(),
    label: z.string().optional()
  })).default([]),
  variables: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    default_value: z.unknown().optional(),
    description: z.string().optional()
  })).default({})
}).refine((data) => {
  // Validate that all edge sources and targets reference existing nodes
  const nodeIds = new Set(data.nodes.map(node => node.id))
  return data.edges.every(edge => 
    nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
}, {
  message: 'All edge sources and targets must reference existing nodes'
})

// Base workflow schema
export const WorkflowBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name must be less than 100 characters'),
  description: z.string().max(1000).optional(),
  status: WorkflowStatusSchema.default('draft'),
  definition: WorkflowDefinitionSchema,
  version: z.number().int().positive().default(1),
  tags: z.array(z.string().max(50)).default([]),
  owner_id: z.number().int().positive(),
  is_public: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  last_executed: z.date().nullable(),
  execution_count: z.number().int().nonnegative().default(0),
  success_count: z.number().int().nonnegative().default(0),
  failure_count: z.number().int().nonnegative().default(0)
})

// Workflow creation schema
export const WorkflowCreateSchema = z.object({
  name: WorkflowBaseSchema.shape.name,
  description: WorkflowBaseSchema.shape.description.optional(),
  definition: WorkflowDefinitionSchema,
  tags: WorkflowBaseSchema.shape.tags.optional(),
  is_public: WorkflowBaseSchema.shape.is_public.optional()
})

// Workflow update schema
export const WorkflowUpdateSchema = z.object({
  name: WorkflowBaseSchema.shape.name.optional(),
  description: WorkflowBaseSchema.shape.description.optional(),
  status: WorkflowStatusSchema.optional(),
  definition: WorkflowDefinitionSchema.optional(),
  tags: WorkflowBaseSchema.shape.tags.optional(),
  is_public: WorkflowBaseSchema.shape.is_public.optional()
})

// Workflow execution schema
export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.number().int().positive(),
  status: ExecutionStatusSchema.default('pending'),
  triggered_by: TriggerTypeSchema,
  trigger_data: z.record(z.unknown()).default({}),
  input_data: z.record(z.unknown()).default({}),
  output_data: z.record(z.unknown()).nullable(),
  error_message: z.string().nullable(),
  error_details: z.record(z.unknown()).nullable(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
  executed_nodes: z.array(z.object({
    node_id: z.string().uuid(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
    started_at: z.date(),
    completed_at: z.date().nullable(),
    output: z.record(z.unknown()).nullable(),
    error: z.string().nullable()
  })).default([]),
  created_at: z.date(),
  updated_at: z.date().nullable()
})

// Workflow schedule schema
export const WorkflowScheduleSchema = z.object({
  id: z.number().int().positive(),
  workflow_id: z.number().int().positive(),
  name: z.string().min(1, 'Schedule name is required').max(100),
  description: z.string().max(500).optional(),
  cron_expression: z.string()
    .regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, 
      'Invalid cron expression'),
  timezone: z.string().default('UTC'),
  is_active: z.boolean().default(true),
  input_data: z.record(z.unknown()).default({}),
  next_run: z.date().nullable(),
  last_run: z.date().nullable(),
  last_run_status: ExecutionStatusSchema.nullable(),
  created_at: z.date(),
  updated_at: z.date().nullable()
})

// Workflow search/filter schema
export const WorkflowSearchSchema = z.object({
  query: z.string().optional(),
  status: WorkflowStatusSchema.optional(),
  owner_id: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
  created_after: z.date().optional(),
  created_before: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'execution_count', 'last_executed']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Workflow execution search schema
export const ExecutionSearchSchema = z.object({
  workflow_id: z.number().int().positive().optional(),
  status: ExecutionStatusSchema.optional(),
  triggered_by: TriggerTypeSchema.optional(),
  started_after: z.date().optional(),
  started_before: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['started_at', 'completed_at', 'duration_ms']).default('started_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Workflow analytics schema
export const WorkflowAnalyticsSchema = z.object({
  workflow_id: z.number().int().positive().optional(),
  date_from: z.date(),
  date_to: z.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
}).refine((data) => data.date_from <= data.date_to, {
  message: 'date_from must be before or equal to date_to'
})

// Webhook configuration schema
export const WebhookConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).default({}),
  secret: z.string().optional(),
  timeout_ms: z.number().int().positive().max(30000).default(5000),
  retry_attempts: z.number().int().nonnegative().max(5).default(3),
  retry_delay_ms: z.number().int().positive().max(60000).default(1000)
})

// Type exports
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>
export type TriggerType = z.infer<typeof TriggerTypeSchema>
export type NodeType = z.infer<typeof NodeTypeSchema>
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>
export type Workflow = z.infer<typeof WorkflowBaseSchema>
export type WorkflowCreate = z.infer<typeof WorkflowCreateSchema>
export type WorkflowUpdate = z.infer<typeof WorkflowUpdateSchema>
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>
export type WorkflowSchedule = z.infer<typeof WorkflowScheduleSchema>
export type WorkflowSearch = z.infer<typeof WorkflowSearchSchema>
export type ExecutionSearch = z.infer<typeof ExecutionSearchSchema>
export type WorkflowAnalytics = z.infer<typeof WorkflowAnalyticsSchema>
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>

// Validation helpers
export const validateWorkflow = (data: unknown) => WorkflowBaseSchema.parse(data)
export const validateWorkflowCreate = (data: unknown) => WorkflowCreateSchema.parse(data)
export const validateWorkflowUpdate = (data: unknown) => WorkflowUpdateSchema.parse(data)
export const validateWorkflowDefinition = (data: unknown) => WorkflowDefinitionSchema.parse(data)
export const validateWorkflowExecution = (data: unknown) => WorkflowExecutionSchema.parse(data)