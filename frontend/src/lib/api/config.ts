export const API_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      ME: "/auth/me",
    },
    USERS: {
      LIST: "/users",
      CREATE: "/users",
      UPDATE: "/users/:id",
      DELETE: "/users/:id",
    },
    PROJECTS: {
      LIST: "/projects",
      CREATE: "/projects",
      UPDATE: "/projects/:id",
      DELETE: "/projects/:id",
    },
  },
} as const;

export type APIConfig = typeof API_CONFIG;