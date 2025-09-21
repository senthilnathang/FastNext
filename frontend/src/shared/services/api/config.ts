// API Configuration
export const API_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/v1/auth/login',
      REGISTER: '/api/v1/auth/register',
      REFRESH: '/api/v1/auth/refresh',
      LOGOUT: '/api/v1/auth/logout',
      ME: '/api/v1/auth/me',
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
    COMPONENTS: '/api/v1/components',
    ROLES: '/api/v1/roles',
    PERMISSIONS: '/api/v1/permissions',
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