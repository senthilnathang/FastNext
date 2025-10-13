/**
 * Configuration Management System
 * Centralized configuration with validation and security
 */

export {
  validateServerEnvironment,
  validateClientEnvironment,
  getEnvironmentReport,
  useEnvironment,
  getServerEnvironment,
  getEnvVar,
  isSecureContext,
  validateEnvironmentMiddleware,
  type EnvConfig,
  type ClientEnvConfig
} from './env-validator';

import { validateServerEnvironment, validateClientEnvironment } from './env-validator';

// Application configuration derived from environment variables
export class AppConfig {
  private static instance: AppConfig;
  private config: any = null;

  private constructor() {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  /**
   * Initialize configuration
   */
  init() {
    if (this.config) return this.config;

    try {
      const env = typeof window === 'undefined' 
        ? validateServerEnvironment()
        : validateClientEnvironment();

      this.config = this.buildConfig(env);
      return this.config;
    } catch (error) {
      console.error('Failed to initialize app configuration:', error);
      throw error;
    }
  }

  /**
   * Build application configuration from environment
   */
  private buildConfig(env: any) {
    const isProduction = env.NODE_ENV === 'production';
    const isDevelopment = env.NODE_ENV === 'development';

    return {
      // Environment
      environment: env.NODE_ENV || 'development',
      isProduction,
      isDevelopment,
      isTest: env.NODE_ENV === 'test',

      // API Configuration
      api: {
        baseUrl: env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        timeout: isProduction ? 10000 : 30000,
        retries: isProduction ? 3 : 1
      },

      // Security Configuration
      security: {
        enableCSP: env.SECURITY_HEADERS_ENABLED ?? true,
        enableHSTS: isProduction,
        enableCORP: isProduction,
        trustedDomains: this.getTrustedDomains(env),
        rateLimiting: {
          enabled: true,
          windowMs: isProduction ? 60000 : 120000, // 1-2 minutes
          maxRequests: isProduction ? 100 : 200
        }
      },

      // Features
      features: {
        analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS ?? false,
        pwa: env.NEXT_PUBLIC_ENABLE_PWA ?? false,
        bundleAnalysis: env.ANALYZE_BUNDLE ?? false,
        telemetry: !env.DISABLE_TELEMETRY
      },

      // Monitoring
      monitoring: {
        sentry: {
          dsn: env.NEXT_PUBLIC_SENTRY_DSN,
          enabled: !!env.NEXT_PUBLIC_SENTRY_DSN && isProduction,
          environment: env.NODE_ENV,
          tracesSampleRate: isProduction ? 0.1 : 1.0
        },
        analytics: {
          googleAnalytics: env.NEXT_PUBLIC_GA_TRACKING_ID,
          enabled: !!env.NEXT_PUBLIC_GA_TRACKING_ID && env.NEXT_PUBLIC_ENABLE_ANALYTICS
        }
      },

      // Performance
      performance: {
        enableServiceWorker: isProduction && env.NEXT_PUBLIC_ENABLE_PWA,
        enablePreload: isProduction,
        bundleOptimization: isProduction,
        imageOptimization: true
      },

      // Development
      development: {
        showDebugInfo: isDevelopment,
        enableHotReload: isDevelopment,
        verboseLogging: isDevelopment
      }
    };
  }

  /**
   * Get trusted domains for security policies
   */
  private getTrustedDomains(env: any): string[] {
    const domains = ['self'];
    
    if (env.NEXT_PUBLIC_DOMAIN) {
      domains.push(env.NEXT_PUBLIC_DOMAIN);
    }
    
    if (env.VERCEL_URL) {
      domains.push(env.VERCEL_URL);
    }
    
    // Add API domain if different
    if (env.NEXT_PUBLIC_API_URL) {
      try {
        const apiUrl = new URL(env.NEXT_PUBLIC_API_URL);
        domains.push(apiUrl.origin);
      } catch (_error) {
        console.warn('Invalid API URL in environment:', env.NEXT_PUBLIC_API_URL);
      }
    }
    
    return domains;
  }

  /**
   * Get current configuration
   */
  get() {
    if (!this.config) {
      return this.init();
    }
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  getSection(section: string) {
    const config = this.get();
    return config[section] || {};
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const features = this.getSection('features');
    return features[feature] ?? false;
  }

  /**
   * Get API configuration
   */
  getApiConfig() {
    return this.getSection('api');
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.getSection('security');
  }
}

// Singleton instance
export const appConfig = AppConfig.getInstance();

/**
 * React hook for accessing configuration
 */
export function useConfig() {
  return appConfig.get();
}

/**
 * Get configuration for server-side usage
 */
export function getConfig() {
  return appConfig.get();
}

/**
 * Configuration validation and health check
 */
export function validateConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: any;
} {
  try {
    const config = appConfig.init();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate API configuration
    if (!config.api.baseUrl) {
      errors.push('API base URL is not configured');
    } else {
      try {
        new URL(config.api.baseUrl);
      } catch {
        errors.push('API base URL is invalid');
      }
    }

    // Validate production requirements
    if (config.isProduction) {
      if (config.api.baseUrl.includes('localhost')) {
        warnings.push('Using localhost API in production');
      }
      
      if (!config.monitoring.sentry.enabled) {
        warnings.push('Error monitoring not configured for production');
      }
      
      if (!config.security.enableHSTS) {
        warnings.push('HSTS not enabled for production');
      }
    }

    // Validate security configuration
    if (!config.security.trustedDomains.length) {
      warnings.push('No trusted domains configured');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Configuration validation failed'],
      warnings: [],
      config: null
    };
  }
}

/**
 * Initialize configuration on module load
 */
try {
  appConfig.init();
} catch (error) {
  console.error('Failed to initialize configuration:', error);
}