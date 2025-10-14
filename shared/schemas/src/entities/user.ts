import { z } from 'zod'

// Base user schema with common validations
export const UserBaseSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email('Invalid email format').toLowerCase(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  full_name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  last_login: z.date().nullable(),
  profile_image_url: z.string().url().nullable().optional(),
  timezone: z.string().default('UTC'),
  locale: z.string().default('en-US'),
  preferences: z.record(z.unknown()).default({})
})

// User creation schema (for registration/admin creation)
export const UserCreateSchema = z.object({
  email: UserBaseSchema.shape.email,
  username: UserBaseSchema.shape.username,
  full_name: UserBaseSchema.shape.full_name,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  confirm_password: z.string(),
  is_active: UserBaseSchema.shape.is_active.optional(),
  timezone: UserBaseSchema.shape.timezone.optional(),
  locale: UserBaseSchema.shape.locale.optional()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})

// User update schema (partial updates allowed)
export const UserUpdateSchema = z.object({
  email: UserBaseSchema.shape.email.optional(),
  username: UserBaseSchema.shape.username.optional(),
  full_name: UserBaseSchema.shape.full_name.optional(),
  is_active: UserBaseSchema.shape.is_active.optional(),
  is_verified: UserBaseSchema.shape.is_verified.optional(),
  profile_image_url: UserBaseSchema.shape.profile_image_url.optional(),
  timezone: UserBaseSchema.shape.timezone.optional(),
  locale: UserBaseSchema.shape.locale.optional(),
  preferences: UserBaseSchema.shape.preferences.optional()
})

// Password change schema
export const PasswordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  confirm_new_password: z.string()
}).refine((data) => data.new_password === data.confirm_new_password, {
  message: "New passwords don't match",
  path: ["confirm_new_password"]
}).refine((data) => data.current_password !== data.new_password, {
  message: "New password must be different from current password",
  path: ["new_password"]
})

// User profile update schema (for self-service updates)
export const UserProfileUpdateSchema = z.object({
  full_name: UserBaseSchema.shape.full_name.optional(),
  profile_image_url: UserBaseSchema.shape.profile_image_url.optional(),
  timezone: UserBaseSchema.shape.timezone.optional(),
  locale: UserBaseSchema.shape.locale.optional(),
  preferences: UserBaseSchema.shape.preferences.optional()
})

// User search/filter schema
export const UserSearchSchema = z.object({
  query: z.string().optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  created_after: z.date().optional(),
  created_before: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort_by: z.enum(['created_at', 'updated_at', 'last_login', 'email', 'username', 'full_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// User bulk operations schema
export const UserBulkUpdateSchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1, 'At least one user ID is required'),
  updates: z.object({
    is_active: z.boolean().optional(),
    is_verified: z.boolean().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be updated'
  })
})

// Authentication schemas
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().default(false)
})

export const RegisterSchema = UserCreateSchema

export const ForgotPasswordSchema = z.object({
  email: UserBaseSchema.shape.email
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})

// Email verification schema
export const EmailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

// Type exports for TypeScript
export type User = z.infer<typeof UserBaseSchema>
export type UserCreate = z.infer<typeof UserCreateSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>
export type UserSearch = z.infer<typeof UserSearchSchema>
export type UserBulkUpdate = z.infer<typeof UserBulkUpdateSchema>
export type PasswordChange = z.infer<typeof PasswordChangeSchema>
export type Login = z.infer<typeof LoginSchema>
export type Register = z.infer<typeof RegisterSchema>
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>
export type ResetPassword = z.infer<typeof ResetPasswordSchema>
export type EmailVerification = z.infer<typeof EmailVerificationSchema>

// Validation helpers
export const validateUser = (data: unknown) => UserBaseSchema.parse(data)
export const validateUserCreate = (data: unknown) => UserCreateSchema.parse(data)
export const validateUserUpdate = (data: unknown) => UserUpdateSchema.parse(data)
export const validatePasswordChange = (data: unknown) => PasswordChangeSchema.parse(data)
export const validateLogin = (data: unknown) => LoginSchema.parse(data)
