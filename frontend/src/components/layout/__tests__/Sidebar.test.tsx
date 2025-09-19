import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '../Sidebar'
import { AuthContext } from '@/contexts/AuthContext'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock user role hook
jest.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      roles: ['admin']
    },
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isAdmin: () => true,
    canAccessModule: () => true
  })
}))

const mockAuthContextValue = {
  user: {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    is_active: true,
    is_verified: true,
    created_at: '2023-01-01T00:00:00Z',
    roles: ['admin']
  },
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  updateUser: jest.fn()
}

describe('Sidebar Component', () => {
  const renderWithAuth = (children: React.ReactNode) => {
    return render(
      <AuthContext.Provider value={mockAuthContextValue}>
        {children}
      </AuthContext.Provider>
    )
  }

  it('renders the FastNext logo and title', () => {
    renderWithAuth(<Sidebar />)
    
    expect(screen.getByText('FastNext')).toBeInTheDocument()
    expect(screen.getByText('Enterprise App Builder')).toBeInTheDocument()
    expect(screen.getByText('FN')).toBeInTheDocument()
  })

  it('renders main navigation items', () => {
    renderWithAuth(<Sidebar />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Builder')).toBeInTheDocument()
    expect(screen.getByText('Compliance')).toBeInTheDocument()
    expect(screen.getByText('AI Management')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Administration')).toBeInTheDocument()
  })

  it('expands and collapses submenu items', () => {
    renderWithAuth(<Sidebar />)
    
    const complianceButton = screen.getByText('Compliance')
    
    // Initially, submenu items should not be visible
    expect(screen.queryByText('AI Trust Center')).not.toBeInTheDocument()
    
    // Click to expand
    fireEvent.click(complianceButton)
    
    // Now submenu items should be visible
    expect(screen.getByText('AI Trust Center')).toBeInTheDocument()
    expect(screen.getByText('Policy Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Framework')).toBeInTheDocument()
  })

  it('renders version information', () => {
    renderWithAuth(<Sidebar />)
    
    expect(screen.getByText('v2.1.0 - FastNext Platform')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = renderWithAuth(<Sidebar className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles administration submenu expansion', () => {
    renderWithAuth(<Sidebar />)
    
    const adminButton = screen.getByText('Administration')
    
    // Click to expand administration menu
    fireEvent.click(adminButton)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
    expect(screen.getByText('Permissions')).toBeInTheDocument()
  })

  it('shows all menu items when user has admin role', () => {
    renderWithAuth(<Sidebar />)
    
    // All main menu items should be visible for admin
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Builder')).toBeInTheDocument()
    expect(screen.getByText('Compliance')).toBeInTheDocument()
    expect(screen.getByText('AI Management')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Administration')).toBeInTheDocument()
  })
})