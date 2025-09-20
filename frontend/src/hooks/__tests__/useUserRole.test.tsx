import { renderHook } from '@testing-library/react'
import { AuthContext } from '@/contexts/AuthContext'
import { useUserRole } from '../useUserRole'
import React from 'react'

// Mock user data
const mockAdminUser = {
  id: 1,
  email: 'admin@example.com',
  username: 'admin',
  full_name: 'Admin User',
  is_active: true,
  is_verified: true,
  created_at: '2023-01-01T00:00:00Z',
  roles: ['admin', 'projects.read', 'compliance.read']
}

const mockRegularUser = {
  id: 2,
  email: 'user@example.com',
  username: 'user',
  full_name: 'Regular User',
  is_active: true,
  is_verified: true,
  created_at: '2023-01-01T00:00:00Z',
  roles: ['projects.read', 'builder.read']
}

const mockAuthContextValue = {
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  updateUser: jest.fn()
}

describe('useUserRole Hook', () => {
  const createWrapper = (user: typeof mockAdminUser | null) => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={{
        ...mockAuthContextValue,
        user
      }}>
        {children}
      </AuthContext.Provider>
    )
    TestWrapper.displayName = 'TestWrapper'
    return TestWrapper
  }

  describe('hasPermission', () => {
    it('returns true for admin users', () => {
      const wrapper = createWrapper(mockAdminUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasPermission('any.permission')).toBe(true)
      expect(result.current.hasPermission('admin.users')).toBe(true)
    })

    it('returns true for specific permissions user has', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasPermission('projects.read')).toBe(true)
      expect(result.current.hasPermission('builder.read')).toBe(true)
    })

    it('returns false for permissions user does not have', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasPermission('admin.users')).toBe(false)
      expect(result.current.hasPermission('compliance.write')).toBe(false)
    })

    it('returns false when user has no roles', () => {
      const userWithoutRoles = { ...mockRegularUser, roles: [] }
      const wrapper = createWrapper(userWithoutRoles)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasPermission('any.permission')).toBe(false)
    })

    it('returns false when no user is present', () => {
      const wrapper = createWrapper(null)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasPermission('any.permission')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true if user has any of the specified permissions', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasAnyPermission(['admin.users', 'projects.read', 'compliance.write'])).toBe(true)
    })

    it('returns false if user has none of the specified permissions', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasAnyPermission(['admin.users', 'compliance.write'])).toBe(false)
    })

    it('returns true for admin users regardless of permissions', () => {
      const wrapper = createWrapper(mockAdminUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.hasAnyPermission(['any.permission'])).toBe(true)
    })
  })

  describe('isAdmin', () => {
    it('returns true for users with admin role', () => {
      const wrapper = createWrapper(mockAdminUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.isAdmin()).toBe(true)
    })

    it('returns false for regular users', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.isAdmin()).toBe(false)
    })

    it('returns false when no user is present', () => {
      const wrapper = createWrapper(null)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.isAdmin()).toBe(false)
    })
  })

  describe('canAccessModule', () => {
    it('allows admin users to access all modules', () => {
      const wrapper = createWrapper(mockAdminUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.canAccessModule('compliance')).toBe(true)
      expect(result.current.canAccessModule('ai-management')).toBe(true)
      expect(result.current.canAccessModule('administration')).toBe(true)
      expect(result.current.canAccessModule('operations')).toBe(true)
    })

    it('allows regular users to access modules they have permissions for', () => {
      const wrapper = createWrapper(mockRegularUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      // Currently returns true for all modules due to fallback
      expect(result.current.canAccessModule('projects')).toBe(true)
      expect(result.current.canAccessModule('builder')).toBe(true)
    })

    it('returns false when no user is present', () => {
      const wrapper = createWrapper(null)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.canAccessModule('any-module')).toBe(false)
    })
  })

  describe('user property', () => {
    it('returns the current user when authenticated', () => {
      const wrapper = createWrapper(mockAdminUser)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.user).toEqual(mockAdminUser)
    })

    it('returns null when no user is authenticated', () => {
      const wrapper = createWrapper(null)
      const { result } = renderHook(() => useUserRole(), { wrapper })
      
      expect(result.current.user).toBeNull()
    })
  })

  describe('context handling', () => {
    it('handles missing auth context gracefully', () => {
      // Render without provider
      const { result } = renderHook(() => useUserRole())
      
      expect(result.current.user).toBeNull()
      expect(result.current.hasPermission('any')).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.canAccessModule('any')).toBe(false)
    })
  })
})