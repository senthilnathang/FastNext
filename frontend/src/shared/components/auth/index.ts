// Authentication Components Exports

// Re-export auth types and hooks for convenience
export { AuthContext, useAuth } from "@/modules/auth";
export type {
  AuthState,
  AuthUser,
  LoginCredentials,
} from "@/modules/auth/types";
export { default as AuthGuard, useAuthGuard, withAuthGuard } from "./AuthGuard";
export { default as RouteProtection } from "./RouteProtection";
