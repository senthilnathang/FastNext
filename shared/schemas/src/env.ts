import { z } from 'zod'

// Base environment validation schema
export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').transform(Number).pipe(z.number().int().positive()),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('UTC')
})

// Database environment schema
export const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('Invalid database URL'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  DB_POOL_MIN: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative()).default('2'),
  DB_POOL_MAX: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('10'),
  DB_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('30000')
})

// Authentication environment schema
export const AuthEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(8).max(15)).default('12'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),
  COOKIE_SECURE: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax')
})

// Redis environment schema
export const RedisEnvSchema = z.object({
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative()).default('0'),
  REDIS_TTL: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('3600')
})

// Email environment schema
export const EmailEnvSchema = z.object({
  EMAIL_PROVIDER: z.enum(['sendgrid', 'smtp', 'mailgun', 'ses']).default('smtp'),
  EMAIL_FROM: z.string().email('Invalid email address'),
  EMAIL_FROM_NAME: z.string().default('FastNext'),

  // SMTP settings
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // SendGrid settings
  SENDGRID_API_KEY: z.string().optional(),

  // Mailgun settings
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),

  // AWS SES settings
  AWS_SES_REGION: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional()
})

// File storage environment schema
export const StorageEnvSchema = z.object({
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs', 'azure']).default('local'),
  STORAGE_BASE_PATH: z.string().default('./uploads'),

  // S3 settings
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_S3_ACCESS_KEY_ID: z.string().optional(),
  AWS_S3_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().url().optional(),

  // Google Cloud Storage settings
  GCS_BUCKET: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  GCS_KEY_FILE: z.string().optional(),

  // Azure Blob Storage settings
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().optional(),

  // File upload limits
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('10485760'), // 10MB
  ALLOWED_FILE_TYPES: z.string().default('image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv')
})

// External integrations environment schema
export const IntegrationsEnvSchema = z.object({
  // Slack integration
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),

  // GitHub integration
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Microsoft OAuth
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // Discord integration
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional()
})

// Security environment schema
export const SecurityEnvSchema = z.object({
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('100'),
  RATE_LIMIT_SKIP_SUCCESSFUL: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),

  // HTTPS settings
  HTTPS_ENABLED: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),

  // Security headers
  HELMET_ENABLED: z.string().transform(val => val === 'true').pipe(z.boolean()).default('true'),
  CSP_ENABLED: z.string().transform(val => val === 'true').pipe(z.boolean()).default('true'),

  // API keys and secrets
  API_KEY_LENGTH: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(32).max(128)).default('64'),
  WEBHOOK_SECRET_LENGTH: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(32).max(128)).default('64')
})

// Monitoring environment schema
export const MonitoringEnvSchema = z.object({
  // Application monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // Metrics collection
  METRICS_ENABLED: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
  METRICS_PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),

  // Health check settings
  HEALTH_CHECK_INTERVAL_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('30000'),
  HEALTH_CHECK_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('5000'),

  // Logging
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_FILE_PATH: z.string().optional(),
  LOG_MAX_SIZE: z.string().default('10m'),
  LOG_MAX_FILES: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('5')
})

// Frontend environment schema (for Next.js)
export const FrontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url('Invalid API URL'),
  NEXT_PUBLIC_APP_NAME: z.string().default('FastNext'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_ID: z.string().optional(),
  NEXT_PUBLIC_CRISP_WEBSITE_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_FEATURE_FLAGS: z.string().optional() // JSON string
})

// Complete backend environment schema
export const BackendEnvSchema = BaseEnvSchema
  .merge(DatabaseEnvSchema)
  .merge(AuthEnvSchema)
  .merge(RedisEnvSchema.partial())
  .merge(EmailEnvSchema.partial())
  .merge(StorageEnvSchema.partial())
  .merge(IntegrationsEnvSchema.partial())
  .merge(SecurityEnvSchema.partial())
  .merge(MonitoringEnvSchema.partial())

// Complete frontend environment schema
export const CompleteEnvSchema = FrontendEnvSchema.partial()

// Environment validation functions
export const validateBackendEnv = (env: Record<string, string | undefined>) => {
  const result = BackendEnvSchema.safeParse(env)
  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
    throw new Error(`Environment validation failed:\n${errors}`)
  }
  return result.data
}

export const validateFrontendEnv = (env: Record<string, string | undefined>) => {
  const result = CompleteEnvSchema.safeParse(env)
  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
    throw new Error(`Frontend environment validation failed:\n${errors}`)
  }
  return result.data
}

// Environment variable helpers
export const getRequiredEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

export const getOptionalEnv = (key: string, defaultValue?: string): string | undefined => {
  return process.env[key] || defaultValue
}

export const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = process.env[key]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

export const getNumberEnv = (key: string, defaultValue?: number): number | undefined => {
  const value = process.env[key]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`)
  }
  return parsed
}

// Type exports
export type BackendEnv = z.infer<typeof BackendEnvSchema>
export type FrontendEnv = z.infer<typeof CompleteEnvSchema>
export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>
export type AuthEnv = z.infer<typeof AuthEnvSchema>
export type RedisEnv = z.infer<typeof RedisEnvSchema>
export type EmailEnv = z.infer<typeof EmailEnvSchema>
export type StorageEnv = z.infer<typeof StorageEnvSchema>
export type IntegrationsEnv = z.infer<typeof IntegrationsEnvSchema>
export type SecurityEnv = z.infer<typeof SecurityEnvSchema>
export type MonitoringEnv = z.infer<typeof MonitoringEnvSchema>
