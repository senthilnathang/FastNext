// Auth Module Exports - Conditional exports for server/client

// Client-side exports (hooks, context usage)
export { useAuth, AuthContext } from './services/AuthContext'

// Provider can be used in both contexts (it's a client component)
export { AuthProvider } from './services/AuthContext'

// Components
export { default as ChangePasswordForm } from './components/ChangePasswordForm'
export { default as UpdateProfileForm } from './components/UpdateProfileForm'  
export { default as SecuritySettings } from './components/SecuritySettings'

// Types (can be used in both contexts)
export type { AuthUser, AuthState, LoginCredentials, RegisterData, TokenResponse } from './types'