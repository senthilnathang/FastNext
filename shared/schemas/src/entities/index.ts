// Entity schema exports
export * from './user'
export * from './role'
export * from './project'
export * from './workflow'
export * from './data-import-export'

// Re-export common validation utilities
import { z } from 'zod'
export { z }

// Common validation helpers
export const createPaginationSchema = (defaultLimit = 10, maxLimit = 100) => z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(maxLimit).default(defaultLimit),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

export const createSearchSchema = (searchFields: string[] = ['name', 'description']) => z.object({
  query: z.string().optional(),
  created_after: z.coerce.date().optional(),
  created_before: z.coerce.date().optional(),
  ...createPaginationSchema().shape
})

// Common field validation schemas
export const EmailSchema = z.string().email('Invalid email format').toLowerCase()
export const UrlSchema = z.string().url('Invalid URL format')
export const UuidSchema = z.string().uuid('Invalid UUID format')
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
export const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')

// Date validation helpers
export const FutureDateSchema = z.date().refine(date => date > new Date(), {
  message: 'Date must be in the future'
})

export const PastDateSchema = z.date().refine(date => date < new Date(), {
  message: 'Date must be in the past'
})

export const DateRangeSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
}).refine(data => data.end_date > data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date']
})

// File validation schemas
export const FileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().int().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
  lastModified: z.number().int().positive().optional()
})

export const ImageFileSchema = FileUploadSchema.extend({
  type: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, 'File must be a valid image format')
})

// Bulk operation schemas
export const BulkDeleteSchema = z.object({
  ids: z.array(z.union([z.string().uuid(), z.number().int().positive()])).min(1, 'At least one ID is required'),
  confirm: z.boolean().refine(val => val === true, {
    message: 'Confirmation is required for bulk delete operations'
  })
})

// API response schemas
export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.unknown().optional()
})

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
  code: z.string().optional()
})

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema])

// Pagination response schema
export const PaginatedResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  data: z.array(dataSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    pages: z.number().int().nonnegative(),
    has_next: z.boolean(),
    has_prev: z.boolean()
  })
})

// Common types
export type Pagination = z.infer<ReturnType<typeof createPaginationSchema>>
export type Search = z.infer<ReturnType<typeof createSearchSchema>>
export type DateRange = z.infer<typeof DateRangeSchema>
export type FileUpload = z.infer<typeof FileUploadSchema>
export type ImageFile = z.infer<typeof ImageFileSchema>
export type BulkDelete = z.infer<typeof BulkDeleteSchema>
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
