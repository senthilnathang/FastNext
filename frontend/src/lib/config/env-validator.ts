/**
 * Environment Variable Validation System
 * Validates and sanitizes environment variables for security
 */

import { z } from 'zod';

// Environment variable schema definition
const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Next.js specific
  NEXT_PUBLIC_API_URL: z.string().url('Invalid API URL').optional(),
  NEXT_PUBLIC_ENVIRONMENT: z.string().default('development'),
  NEXT_PUBLIC_DOMAIN: z.string().optional(),

  // Vercel specific (if deployed on Vercel)
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // Database (for full-stack features)
  DATABASE_URL: z.string().url('Invalid database URL').optional(),

  // Authentication secrets (server-side only)
  NEXTAUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters').optional(),
  NEXTAUTH_URL: z.string().url('Invalid auth URL').optional(),

  // External API keys (server-side only)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  // Monitoring and analytics
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  NEXT_PUBLIC_GA_TRACKING_ID: z.string().optional(),

  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_PWA: z.coerce.boolean().default(false),

  // Security
  CSP_NONCE: z.string().optional(),
  SECURITY_HEADERS_ENABLED: z.coerce.boolean().default(true),

  // Development only
  ANALYZE_BUNDLE: z.coerce.boolean().default(false),
  DISABLE_TELEMETRY: z.coerce.boolean().default(false)
});

// Client-side environment variables schema (only NEXT_PUBLIC_* variables)
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url('Invalid API URL').optional(),
  NEXT_PUBLIC_ENVIRONMENT: z.string().default('development'),
  NEXT_PUBLIC_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  NEXT_PUBLIC_GA_TRACKING_ID: z.string().optional(),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_PWA: z.coerce.boolean().default(false)
});

// Type definitions
export type EnvConfig = z.infer<typeof EnvSchema>;
export type ClientEnvConfig = z.infer<typeof ClientEnvSchema>;

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private validatedEnv: EnvConfig | null = null;
  private validatedClientEnv: ClientEnvConfig | null = null;
  private errors: string[] = [];
  private warnings: string[] = [];

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  /**
   * Validate server-side environment variables
   */
  validateServerEnv(): EnvConfig {
    if (this.validatedEnv) {
      return this.validatedEnv;
    }

    try {
      // Parse and validate environment variables
      const result = EnvSchema.safeParse(process.env);

      if (!result.success) {
        this.errors = result.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        );
        throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
      }

      this.validatedEnv = result.data;

      // Perform additional security checks
      this.performSecurityChecks(result.data);

      // Log warnings if any
      if (this.warnings.length > 0) {
        console.warn('Environment validation warnings:');
        this.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      return this.validatedEnv;
    } catch (error) {
      console.error('Environment validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate client-side environment variables
   */
  validateClientEnv(): ClientEnvConfig {
    if (this.validatedClientEnv) {
      return this.validatedClientEnv;
    }

    try {
      // Only validate NEXT_PUBLIC_* variables on client
      const clientEnv = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
      );

      const result = ClientEnvSchema.safeParse(clientEnv);

      if (!result.success) {
        this.errors = result.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        );
        throw new Error(`Client environment validation failed:\n${this.errors.join('\n')}`);
      }

      this.validatedClientEnv = result.data;

      // Check for security issues in client env
      this.checkClientSecurity(result.data);

      return this.validatedClientEnv;
    } catch (error) {
      console.error('Client environment validation failed:', error);
      throw error;
    }
  }

  /**
   * Perform security checks on environment variables
   */
  private performSecurityChecks(env: EnvConfig): void {
    // Check for development settings in production
    if (env.NODE_ENV === 'production') {
      if (env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
        this.warnings.push('Using localhost API URL in production');
      }

      if (!env.NEXTAUTH_SECRET && env.NEXTAUTH_URL) {
        this.errors.push('NEXTAUTH_SECRET is required in production');
      }

      if (env.ANALYZE_BUNDLE) {
        this.warnings.push('Bundle analysis is enabled in production');
      }
    }

    // Check for insecure URLs
    if (env.NEXT_PUBLIC_API_URL?.startsWith('http://') && env.NODE_ENV === 'production') {
      this.errors.push('API URL must use HTTPS in production');
    }

    // Check secret strength
    if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length < 32) {
      this.errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
    }

    // Check for common misconfigurations
    if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_SENTRY_DSN) {
      this.warnings.push('No error monitoring configured for production');
    }
  }

  /**
   * Check client-side environment for security issues
   */
  private checkClientSecurity(env: ClientEnvConfig): void {
    // Check for potentially sensitive data in public variables
    Object.entries(env).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Check for potential secrets (long alphanumeric strings)
        if (value.length > 40 && /^[A-Za-z0-9+/=]+$/.test(value)) {
          this.warnings.push(`${key} might contain sensitive data exposed to client`);
        }

        // Check for common secret patterns
        const secretPatterns = [
          { pattern: /sk_live_/, name: 'Stripe secret key' },
          { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS access key' },
          { pattern: /AIza[0-9A-Za-z\-_]{35}/, name: 'Google API key' }
        ];

        secretPatterns.forEach(({ pattern, name }) => {
          if (pattern.test(value)) {
            this.errors.push(`${key} contains ${name} which should not be public`);
          }
        });
      }
    });
  }

  /**
   * Get validation errors
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Get validation warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Check if environment is valid
   */
  isValid(): boolean {
    return this.errors.length === 0;
  }

  /**
   * Generate environment report
   */
  generateReport(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    environment: string;
    publicVariables: Record<string, any>;
  } {
    const env = typeof window === 'undefined'
      ? this.validateServerEnv()
      : this.validateClientEnv();

    return {
      isValid: this.isValid(),
      errors: this.errors,
      warnings: this.warnings,
      environment: process.env.NODE_ENV || env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
      publicVariables: typeof window === 'undefined'
        ? this.getPublicVariables(env as EnvConfig)
        : env
    };
  }

  /**
   * Extract public variables from server env
   */
  private getPublicVariables(env: EnvConfig): Record<string, any> {
    return Object.fromEntries(
      Object.entries(env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    );
  }
}

// Singleton instance
const envValidator = EnvironmentValidator.getInstance();

/**
 * Server-side environment validation
 */
export function validateServerEnvironment(): EnvConfig {
  return envValidator.validateServerEnv();
}

/**
 * Client-side environment validation
 */
export function validateClientEnvironment(): ClientEnvConfig {
  return envValidator.validateClientEnv();
}

/**
 * Get environment validation report
 */
export function getEnvironmentReport() {
  return envValidator.generateReport();
}

/**
 * Environment configuration hook for React components
 */
export function useEnvironment(): {
  env: ClientEnvConfig;
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  // This should only run on client side
  if (typeof window === 'undefined') {
    throw new Error('useEnvironment hook can only be used on client side');
  }

  const env = envValidator.validateClientEnv();

  return {
    env,
    isValid: envValidator.isValid(),
    errors: envValidator.getErrors(),
    warnings: envValidator.getWarnings()
  };
}

/**
 * Environment configuration for server components
 */
export function getServerEnvironment(): EnvConfig {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnvironment can only be used on server side');
  }

  return envValidator.validateServerEnv();
}

/**
 * Safe environment getter with fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];

  if (!value && !fallback) {
    console.warn(`Environment variable ${key} is not set and no fallback provided`);
    return '';
  }

  return value || fallback || '';
}

/**
 * Check if we're in a secure context
 */
export function isSecureContext(): boolean {
  if (typeof window !== 'undefined') {
    return window.isSecureContext;
  }

  // Server-side check
  const env = envValidator.validateServerEnv();
  return env.NODE_ENV === 'production' ||
         env.NEXT_PUBLIC_API_URL?.startsWith('https://') ||
         false;
}

/**
 * Environment validation middleware for API routes
 */
export function validateEnvironmentMiddleware() {
  return (req: any, res: any, next: any) => {
    try {
      validateServerEnvironment();
      next();
    } catch (error) {
      console.error('Environment validation failed in middleware:', error);
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Environment validation failed'
      });
    }
  };
}


// Initialize validation on module load
if (typeof window === 'undefined') {
  // Server-side initialization
  try {
    validateServerEnvironment();
  } catch (error) {
    console.error('Failed to validate server environment on startup:', error);
  }
} else {
  // Client-side initialization
  try {
    validateClientEnvironment();
  } catch (error) {
    console.error('Failed to validate client environment on startup:', error);
  }
}
