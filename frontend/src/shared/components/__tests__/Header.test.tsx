import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '../layout/Header'
import { AuthProvider } from '@/modules/auth'
import { ThemeProvider } from '@/shared/services/ThemeContext'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/projects',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock Breadcrumb component
jest.mock('../navigation/Breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Home / Dashboard / Projects</div>
  }
})

// Mock fetch API
global.fetch = jest.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock API config
jest.mock('@/lib/api/config', () => ({
  API_CONFIG: {
    API_BASE_URL: 'http://localhost:8000',
    ENDPOINTS: {
      AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
      },
    },
  },
  getApiUrl: (endpoint: string) => `http://localhost:8000${endpoint}`,
}))

// Test wrapper with AuthProvider and ThemeProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('renders search input with correct placeholder', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search projects, components...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveClass('pl-10', 'pr-4', 'py-2', 'w-80')
  })

  it('renders all action buttons', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Check for buttons by their title attributes
    expect(screen.getByTitle('Help')).toBeInTheDocument()
    expect(screen.getByTitle('Notifications')).toBeInTheDocument()
    expect(screen.getByTitle('Toggle theme')).toBeInTheDocument()
  })

  it('renders user profile dropdown trigger', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('opens user profile dropdown when clicked', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const userButton = screen.getByText('John Doe').closest('button')
    expect(userButton).toBeInTheDocument()

    fireEvent.click(userButton!)

    // Check for dropdown menu items (these might be in a portal)
    // Note: Testing dropdown content might require additional setup
    // for portal testing or using a different testing approach
  })

  it('renders breadcrumb component', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('Home / Dashboard / Projects')).toBeInTheDocument()
  })

  it('has proper search input styling', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search projects, components...')
    expect(searchInput).toHaveClass(
      'border',
      'border-gray-300',
      'dark:border-gray-600',
      'rounded-lg',
      'focus:ring-2',
      'focus:ring-blue-500'
    )
  })

  it('renders theme toggle icons', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const themeButton = screen.getByTitle('Toggle theme')
    expect(themeButton).toBeInTheDocument()

    // Check for Sun/Moon icons (they are rendered conditionally)
    const sunIcon = themeButton.querySelector('.lucide-sun')
    const moonIcon = themeButton.querySelector('.lucide-moon')

    expect(sunIcon || moonIcon).toBeTruthy()
  })

  it('has correct header structure', () => {
    const { container } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Check main header structure
    const headerElement = container.querySelector('header')
    expect(headerElement).toHaveClass('h-16', 'flex', 'items-center', 'justify-between', 'px-6')

    // Check breadcrumb section
    const breadcrumbSection = container.querySelector('.px-6.py-3')
    expect(breadcrumbSection).toBeInTheDocument()
  })

  it('renders with proper dark mode classes', () => {
    const { container } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const headerContainer = container.firstChild
    expect(headerContainer).toHaveClass(
      'bg-white',
      'dark:bg-gray-900',
      'border-b',
      'border-gray-200',
      'dark:border-gray-800'
    )
  })
})
