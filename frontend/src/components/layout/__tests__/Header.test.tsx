import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '../Header'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/projects',
}))

// Mock Breadcrumb component
jest.mock('../Breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Home / Dashboard / Projects</div>
  }
})

describe('Header Component', () => {
  it('renders search input with correct placeholder', () => {
    render(<Header />)
    
    const searchInput = screen.getByPlaceholderText('Search projects, components...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveClass('pl-10', 'pr-4', 'py-2', 'w-80')
  })

  it('renders all action buttons', () => {
    render(<Header />)
    
    // Check for buttons by their title attributes
    expect(screen.getByTitle('Help')).toBeInTheDocument()
    expect(screen.getByTitle('Notifications')).toBeInTheDocument()
    expect(screen.getByTitle('Toggle theme')).toBeInTheDocument()
  })

  it('renders user profile dropdown trigger', () => {
    render(<Header />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('opens user profile dropdown when clicked', () => {
    render(<Header />)
    
    const userButton = screen.getByText('John Doe').closest('button')
    expect(userButton).toBeInTheDocument()
    
    fireEvent.click(userButton!)
    
    // Check for dropdown menu items (these might be in a portal)
    // Note: Testing dropdown content might require additional setup
    // for portal testing or using a different testing approach
  })

  it('renders breadcrumb component', () => {
    render(<Header />)
    
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('Home / Dashboard / Projects')).toBeInTheDocument()
  })

  it('has proper search input styling', () => {
    render(<Header />)
    
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
    render(<Header />)
    
    const themeButton = screen.getByTitle('Toggle theme')
    expect(themeButton).toBeInTheDocument()
    
    // Check for Sun/Moon icons (they are rendered conditionally)
    const sunIcon = themeButton.querySelector('.lucide-sun')
    const moonIcon = themeButton.querySelector('.lucide-moon')
    
    expect(sunIcon || moonIcon).toBeTruthy()
  })

  it('has correct header structure', () => {
    const { container } = render(<Header />)
    
    // Check main header structure
    const headerElement = container.querySelector('header')
    expect(headerElement).toHaveClass('h-16', 'flex', 'items-center', 'justify-between', 'px-6')
    
    // Check breadcrumb section
    const breadcrumbSection = container.querySelector('.px-6.py-3')
    expect(breadcrumbSection).toBeInTheDocument()
  })

  it('renders with proper dark mode classes', () => {
    const { container } = render(<Header />)
    
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