import { z } from 'zod'

// Import/Export operation status enum
export const OperationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
  'partially_completed'
])

// File format enum
export const FileFormatSchema = z.enum([
  'csv',
  'json',
  'xlsx',
  'xml',
  'parquet',
  'sql'
])

// Import operation types
export const ImportOperationSchema = z.enum([
  'insert',
  'update',
  'upsert',
  'replace'
])

// Export operation types
export const ExportOperationSchema = z.enum([
  'full',
  'incremental',
  'filtered',
  'custom_query'
])

// Validation severity levels
export const ValidationSeveritySchema = z.enum([
  'error',
  'warning',
  'info'
])

// Data type validation schema
export const DataTypeSchema = z.enum([
  'string',
  'integer',
  'float',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'uuid',
  'email',
  'url',
  'json'
])

// Field mapping schema
export const FieldMappingSchema = z.object({
  source_field: z.string().min(1, 'Source field is required'),
  target_field: z.string().min(1, 'Target field is required'),
  data_type: DataTypeSchema,
  is_required: z.boolean().default(false),
  default_value: z.unknown().optional(),
  transform_rule: z.string().optional(),
  validation_rules: z.array(z.object({
    rule_type: z.enum(['min_length', 'max_length', 'regex', 'range', 'unique', 'not_null', 'custom']),
    value: z.unknown(),
    message: z.string().optional()
  })).default([])
})

// Import options schema
export const ImportOptionsSchema = z.object({
  operation: ImportOperationSchema.default('insert'),
  batch_size: z.number().int().positive().max(10000).default(1000),
  skip_header: z.boolean().default(true),
  delimiter: z.string().length(1).default(','),
  quote_char: z.string().length(1).default('"'),
  escape_char: z.string().length(1).optional(),
  encoding: z.string().default('utf-8'),
  date_format: z.string().optional(),
  datetime_format: z.string().optional(),
  null_values: z.array(z.string()).default(['', 'NULL', 'null', 'None']),
  trim_whitespace: z.boolean().default(true),
  validate_before_import: z.boolean().default(true),
  stop_on_error: z.boolean().default(false),
  max_error_count: z.number().int().nonnegative().default(100),
  duplicate_handling: z.enum(['skip', 'update', 'error']).default('skip'),
  create_backup: z.boolean().default(true)
})

// Export options schema
export const ExportOptionsSchema = z.object({
  operation: ExportOperationSchema.default('full'),
  format: FileFormatSchema.default('csv'),
  include_header: z.boolean().default(true),
  delimiter: z.string().length(1).default(','),
  quote_char: z.string().length(1).default('"'),
  encoding: z.string().default('utf-8'),
  date_format: z.string().optional(),
  datetime_format: z.string().optional(),
  null_representation: z.string().default(''),
  compress: z.boolean().default(false),
  compression_type: z.enum(['gzip', 'zip', 'bz2']).optional(),
  split_files: z.boolean().default(false),
  max_rows_per_file: z.number().int().positive().optional(),
  filters: z.record(z.unknown()).default({}),
  custom_query: z.string().optional()
})

// Validation result schema
export const ValidationResultSchema = z.object({
  id: z.string().uuid(),
  total_rows: z.number().int().nonnegative(),
  valid_rows: z.number().int().nonnegative(),
  invalid_rows: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  errors: z.array(z.object({
    row_number: z.number().int().positive(),
    field: z.string().optional(),
    severity: ValidationSeveritySchema,
    message: z.string(),
    value: z.unknown().optional(),
    suggestion: z.string().optional()
  })).default([]),
  field_analysis: z.array(z.object({
    field_name: z.string(),
    data_type: DataTypeSchema,
    unique_values: z.number().int().nonnegative(),
    null_count: z.number().int().nonnegative(),
    min_length: z.number().int().nonnegative().optional(),
    max_length: z.number().int().nonnegative().optional(),
    sample_values: z.array(z.unknown()).max(10).default([])
  })).default([]),
  recommendations: z.array(z.string()).default([]),
  estimated_import_time: z.number().int().nonnegative().optional(),
  validation_duration: z.number().int().nonnegative()
})

// Base import job schema
export const ImportJobBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Import job name is required').max(200),
  description: z.string().max(1000).optional(),
  status: OperationStatusSchema.default('pending'),
  table_name: z.string().min(1, 'Table name is required').max(100),
  file_name: z.string().min(1, 'File name is required'),
  file_size: z.number().int().nonnegative(),
  file_format: FileFormatSchema,
  import_options: ImportOptionsSchema,
  field_mappings: z.array(FieldMappingSchema).min(1, 'At least one field mapping is required'),
  validation_result: ValidationResultSchema.optional(),
  progress: z.object({
    total_rows: z.number().int().nonnegative().default(0),
    processed_rows: z.number().int().nonnegative().default(0),
    successful_rows: z.number().int().nonnegative().default(0),
    failed_rows: z.number().int().nonnegative().default(0),
    skipped_rows: z.number().int().nonnegative().default(0),
    percentage: z.number().min(0).max(100).default(0)
  }).default({}),
  error_details: z.array(z.object({
    row_number: z.number().int().positive(),
    field: z.string().optional(),
    error_message: z.string(),
    raw_value: z.unknown().optional()
  })).default([]),
  backup_info: z.object({
    backup_id: z.string().uuid().optional(),
    backup_location: z.string().optional(),
    created_at: z.date().optional()
  }).optional(),
  created_by: z.number().int().positive(),
  created_at: z.date(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  duration_ms: z.number().int().nonnegative().nullable()
})

// Import job creation schema
export const ImportJobCreateSchema = z.object({
  name: ImportJobBaseSchema.shape.name,
  description: ImportJobBaseSchema.shape.description.optional(),
  table_name: ImportJobBaseSchema.shape.table_name,
  file_name: ImportJobBaseSchema.shape.file_name,
  file_size: ImportJobBaseSchema.shape.file_size,
  file_format: FileFormatSchema,
  import_options: ImportOptionsSchema.optional(),
  field_mappings: z.array(FieldMappingSchema).min(1),
  validation_result: ValidationResultSchema.optional()
})

// Export job schema
export const ExportJobBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Export job name is required').max(200),
  description: z.string().max(1000).optional(),
  status: OperationStatusSchema.default('pending'),
  table_name: z.string().min(1, 'Table name is required').max(100),
  export_options: ExportOptionsSchema,
  output_files: z.array(z.object({
    file_name: z.string(),
    file_size: z.number().int().nonnegative(),
    download_url: z.string().url(),
    expires_at: z.date()
  })).default([]),
  progress: z.object({
    total_rows: z.number().int().nonnegative().default(0),
    processed_rows: z.number().int().nonnegative().default(0),
    percentage: z.number().min(0).max(100).default(0)
  }).default({}),
  created_by: z.number().int().positive(),
  created_at: z.date(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  duration_ms: z.number().int().nonnegative().nullable()
})

// Export job creation schema
export const ExportJobCreateSchema = z.object({
  name: ExportJobBaseSchema.shape.name,
  description: ExportJobBaseSchema.shape.description.optional(),
  table_name: ExportJobBaseSchema.shape.table_name,
  export_options: ExportOptionsSchema.optional()
})

// File validation request schema
export const FileValidationRequestSchema = z.object({
  table_name: z.string().min(1, 'Table name is required'),
  import_options: ImportOptionsSchema.optional(),
  field_mappings: z.array(FieldMappingSchema).min(1, 'At least one field mapping is required'),
  sample_size: z.number().int().positive().max(10000).default(1000)
})

// Data import/export search schema
export const JobSearchSchema = z.object({
  query: z.string().optional(),
  status: OperationStatusSchema.optional(),
  table_name: z.string().optional(),
  file_format: FileFormatSchema.optional(),
  created_by: z.number().int().positive().optional(),
  created_after: z.coerce.date().optional(),
  created_before: z.coerce.date().optional(),
  job_type: z.enum(['import', 'export']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['created_at', 'started_at', 'completed_at', 'name', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Bulk job operations schema
export const JobBulkOperationSchema = z.object({
  job_ids: z.array(z.string().uuid()).min(1, 'At least one job ID is required'),
  operation: z.enum(['cancel', 'retry', 'delete']),
  reason: z.string().max(500).optional()
})

// Data preview schema
export const DataPreviewSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.unknown())).max(100),
  total_rows: z.number().int().nonnegative(),
  detected_format: FileFormatSchema,
  detected_delimiter: z.string().length(1).optional(),
  detected_encoding: z.string().optional(),
  suggested_mappings: z.array(FieldMappingSchema).default([])
})

// Type exports
export type OperationStatus = z.infer<typeof OperationStatusSchema>
export type FileFormat = z.infer<typeof FileFormatSchema>
export type ImportOperation = z.infer<typeof ImportOperationSchema>
export type ExportOperation = z.infer<typeof ExportOperationSchema>
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>
export type DataType = z.infer<typeof DataTypeSchema>
export type FieldMapping = z.infer<typeof FieldMappingSchema>
export type ImportOptions = z.infer<typeof ImportOptionsSchema>
export type ExportOptions = z.infer<typeof ExportOptionsSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
export type ImportJob = z.infer<typeof ImportJobBaseSchema>
export type ImportJobCreate = z.infer<typeof ImportJobCreateSchema>
export type ExportJob = z.infer<typeof ExportJobBaseSchema>
export type ExportJobCreate = z.infer<typeof ExportJobCreateSchema>
export type FileValidationRequest = z.infer<typeof FileValidationRequestSchema>
export type JobSearch = z.infer<typeof JobSearchSchema>
export type JobBulkOperation = z.infer<typeof JobBulkOperationSchema>
export type DataPreview = z.infer<typeof DataPreviewSchema>

// Validation helpers
export const validateImportJob = (data: unknown) => ImportJobBaseSchema.parse(data)
export const validateImportJobCreate = (data: unknown) => ImportJobCreateSchema.parse(data)
export const validateExportJob = (data: unknown) => ExportJobBaseSchema.parse(data)
export const validateExportJobCreate = (data: unknown) => ExportJobCreateSchema.parse(data)
export const validateFieldMapping = (data: unknown) => FieldMappingSchema.parse(data)
export const validateValidationResult = (data: unknown) => ValidationResultSchema.parse(data)
export const validateFileValidationRequest = (data: unknown) => FileValidationRequestSchema.parse(data)
