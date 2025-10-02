// API Configuration
export const API_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/v1/auth/login',
      REGISTER: '/api/v1/auth/register',
      REFRESH: '/api/v1/auth/refresh',
      LOGOUT: '/api/v1/auth/logout',
      ME: '/api/v1/auth/me',
      TEST_TOKEN: '/api/v1/auth/test-token',
    },
    PROFILE: {
      ME: '/api/v1/profile/me',
      PASSWORD: '/api/v1/profile/password',
      QUICK_ACTIONS: '/api/v1/profile/quick-actions',
    },
    SECURITY: {
      SETTINGS: '/api/v1/security/settings',
      OVERVIEW: '/api/v1/security/overview',
      TWO_FA_DISABLE: '/api/v1/security/2fa/disable',
    },
    ACTIVITY_LOGS: {
      LIST: '/api/v1/activity-logs',
      ME: '/api/v1/activity-logs/me',
      STATS: '/api/v1/activity-logs/stats',
      EXPORT: '/api/v1/activity-logs/export',
    },
    USERS: '/api/v1/users',
    PROJECTS: '/api/v1/projects',
    PAGES: '/api/v1/pages',
    COMPONENTS: '/api/v1/components',
    ROLES: '/api/v1/roles',
    PERMISSIONS: '/api/v1/permissions',
    WORKFLOW: {
      TYPES: '/api/v1/workflow-types',
      STATES: '/api/v1/workflow-states', 
      TEMPLATES: '/api/v1/workflow-templates',
      INSTANCES: '/api/v1/workflow-instances',
    },
    USER_ROLES: '/api/v1/user-roles',
    ASSETS: '/api/v1/assets',
    AUDIT_TRAILS: '/api/v1/audit-trails',
    PRODUCTS: '/api/v1/products/',
    BLOG_POSTS: '/api/v1/blog-posts',
    CATEGORIES: '/api/v1/categories',
    AUTHORS: '/api/v1/authors',
    SALES: '/api/v1/sales',
  }
}

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.API_BASE_URL.replace(/\/$/, '')
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}