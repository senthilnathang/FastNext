// Authentication Components Exports

export { default as AuthGuard, withAuthGuard, useAuthGuard } from './AuthGuard';
export { default as RouteProtection } from './RouteProtection';

// Re-export auth types and hooks for convenience
export { useAuth, AuthContext } from '@/modules/auth';
export type { AuthUser, AuthState, LoginCredentials } from '@/modules/auth/types';