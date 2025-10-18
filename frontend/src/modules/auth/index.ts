// Auth Module Exports - Conditional exports for server/client

// Components
export { default as ChangePasswordForm } from "./components/ChangePasswordForm";
export { default as SecuritySettings } from "./components/SecuritySettings";
export { default as UpdateProfileForm } from "./components/UpdateProfileForm";
// Client-side exports (hooks, context usage)
// Provider can be used in both contexts (it's a client component)
export { AuthContext, AuthProvider, useAuth } from "./services/AuthContext";

// Types (can be used in both contexts)
export type {
  AuthState,
  AuthUser,
  LoginCredentials,
  RegisterData,
  TokenResponse,
} from "./types";
