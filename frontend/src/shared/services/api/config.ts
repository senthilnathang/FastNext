// API Configuration
export const API_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "", // Use empty string for relative URLs
  TIMEOUT: 30000,

  ENDPOINTS: {
    AUTH: {
      LOGIN: "/api/v1/auth/login",
      REGISTER: "/api/v1/auth/register",
      REFRESH: "/api/v1/auth/refresh",
      LOGOUT: "/api/v1/auth/logout",
      ME: "/api/v1/auth/me",
      TEST_TOKEN: "/api/v1/auth/test-token",
    },
    PROFILE: {
      ME: "/api/v1/profile/me",
      PASSWORD: "/api/v1/profile/password",
      QUICK_ACTIONS: "/api/v1/profile/quick-actions",
    },
    SECURITY: {
      SETTINGS: "/api/v1/security/settings",
      OVERVIEW: "/api/v1/security/overview",
      TWO_FA_DISABLE: "/api/v1/security/2fa/disable",
    },
    ACTIVITY_LOGS: {
      LIST: "/api/v1/activity-logs",
      ME: "/api/v1/activity-logs/me",
      STATS: "/api/v1/activity-logs/stats",
      EXPORT: "/api/v1/activity-logs/export",
    },
    EVENTS: {
      LIST: "/api/v1/events",
      ME: "/api/v1/events/me",
      STATS: "/api/v1/events/stats",
      EXPORT: "/api/v1/events/export",
    },
    USERS: "/api/v1/users",
    ROLES: "/api/v1/roles",
    PERMISSIONS: "/api/v1/permissions",
    USER_ROLES: "/api/v1/user-roles",
    NOTIFICATIONS: "/api/v1/notifications",
    COMPANIES: "/api/v1/companies",
    GROUPS: "/api/v1/groups",
    PRODUCTS: "/api/v1/products",
    ADMIN: {
      CONFIG: {
        LIST: "/api/admin/config",
        GET: "/api/admin/config/{key}",
        CREATE: "/api/admin/config",
        UPDATE: "/api/admin/config/{key}",
        DELETE: "/api/admin/config/{key}",
        VALIDATE: "/api/admin/config/validate",
        AUDIT: "/api/admin/config/{key}/audit",
        RESET: "/api/admin/config/reset/{key}",
        DATA_IMPORT_EXPORT: {
          CURRENT: "/api/admin/config/data-import-export/current",
          UPDATE: "/api/admin/config/data-import-export/current",
        },
      },
    },
  },
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.API_BASE_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // If no base URL is configured, use relative URLs (for Next.js API routes)
  if (!baseUrl) {
    return cleanEndpoint;
  }

  return `${baseUrl}${cleanEndpoint}`;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
