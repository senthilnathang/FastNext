// Shared Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGIN_FORM: '/api/v1/auth/login/access-token',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    TEST_TOKEN: '/api/v1/auth/test-token',
  },
  USERS: {
    BASE: '/api/v1/users',
    ME: '/api/v1/users/me',
  },
  PROFILE: {
    BASE: '/api/v1/profile',
    ME: '/api/v1/profile/me',
    PASSWORD: '/api/v1/profile/me/password',
  },
  PROJECTS: {
    BASE: '/api/v1/projects',
  },
  COMPONENTS: {
    BASE: '/api/v1/components',
    INSTANCES: '/api/v1/components/instances',
  },
  ROLES: {
    BASE: '/api/v1/roles',
  },
  PERMISSIONS: {
    BASE: '/api/v1/permissions',
  },
  ACTIVITY_LOGS: {
    BASE: '/api/v1/activity-logs',
    ME: '/api/v1/activity-logs/me',
    STATS: '/api/v1/activity-logs/stats/summary',
  },
  SECURITY: {
    BASE: '/api/v1/security',
    SETTINGS: '/api/v1/security/settings',
    OVERVIEW: '/api/v1/security/overview',
  },
} as const

export const QUERY_KEYS = {
  AUTH: ['auth'],
  USER: ['user'],
  USERS: ['users'],
  PROJECTS: ['projects'],
  COMPONENTS: ['components'],
  ROLES: ['roles'],
  PERMISSIONS: ['permissions'],
  ACTIVITY_LOGS: ['activity-logs'],
  SECURITY: ['security'],
} as const

export const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const
