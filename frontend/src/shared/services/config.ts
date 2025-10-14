export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  API_VERSION: '/api/v1',

  get API_BASE_URL() {
    return `${this.BASE_URL}${this.API_VERSION}`;
  },

  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
    },
    PROFILE: {
      ME: '/profile/me',
      PASSWORD: '/profile/me/password',
      QUICK_ACTIONS: '/profile/quick-actions',
    },
    PROJECTS: {
      LIST: '/projects/',
    },
    COMPONENTS: {
      LIST: '/components/',
      INSTANCES: '/components/instances/',
    },
    ACTIVITY_LOGS: {
      LIST: '/activity-logs',
      ME: '/activity-logs/me',
      STATS: '/activity-logs/stats/summary',
      EXPORT: '/activity-logs/export',
    },
    SECURITY: {
      SETTINGS: '/security/settings',
      OVERVIEW: '/security/overview',
      TWO_FA_DISABLE: '/security/2fa/disable',
    },
  }
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.API_BASE_URL}${endpoint}`;
};

export const getFullUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
