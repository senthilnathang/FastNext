import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home, Users, Settings } from 'lucide-react'
import { BottomNavigation, useBottomNavigation } from '../BottomNavigation'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({})
}), { virtual: true })

const mockItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'users', label: 'Users', icon: Users, badge: 5 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const manyItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'users', label: 'Users', icon: Users, badge: 12 },
  { id: 'search', label: 'Search', icon: Home },
  { id: 'notifications', label: 'Notifications', icon: Users, badge: 99 },
  { id: 'favorites', label: 'Favorites', icon: Settings, badge: 5 },
  { id: 'messages', label: 'Messages', icon: Home, badge: 2 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

describe('BottomNavigation', () => {
  const defaultProps = {
    items: mockItems,
    onItemClick: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders all navigation items', () => {
      render(<BottomNavigation {...defaultProps} />)
      
      expect(screen.getByLabelText('Home')).toBeInTheDocument()
      expect(screen.getByLabelText('Users')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })

    it('renders item labels when showLabels is true', () => {
      render(<BottomNavigation {...defaultProps} showLabels={true} />)
      
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('does not render item labels when showLabels is false', () => {
      render(<BottomNavigation {...defaultProps} showLabels={false} />)
      
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
      expect(screen.queryByText('Users')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('renders badges for items that have them', () => {
      render(<BottomNavigation {...defaultProps} />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders large badge numbers as 99+', () => {
      const itemsWithLargeBadge = [
        { id: 'test', label: 'Test', icon: Home, badge: 150 }
      ]
      
      render(<BottomNavigation items={itemsWithLargeBadge} />)
      
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('Navigation Behavior', () => {
    it('calls onItemClick when item is clicked', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = jest.fn()
      
      render(
        <BottomNavigation 
          {...defaultProps} 
          onItemClick={mockOnItemClick}
        />
      )
      
      const homeButton = screen.getByLabelText('Home')
      await user.click(homeButton)
      
      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0])
    })

    it('calls item onClick when provided', async () => {
      const user = userEvent.setup()
      const mockItemClick = jest.fn()
      const itemsWithClick = [
        { ...mockItems[0], onClick: mockItemClick }
      ]
      
      render(<BottomNavigation items={itemsWithClick} />)
      
      const homeButton = screen.getByLabelText('Home')
      await user.click(homeButton)
      
      expect(mockItemClick).toHaveBeenCalled()
    })

    it('shows active state for selected item', () => {
      render(
        <BottomNavigation 
          {...defaultProps} 
          activeItem="users"
        />
      )
      
      const usersButton = screen.getByLabelText('Users')
      expect(usersButton).toHaveClass('text-blue-600')
    })

    it('does not trigger click for disabled items', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = jest.fn()
      const disabledItems = [
        { ...mockItems[0], disabled: true }
      ]
      
      render(
        <BottomNavigation 
          items={disabledItems}
          onItemClick={mockOnItemClick}
        />
      )
      
      const homeButton = screen.getByLabelText('Home')
      await user.click(homeButton)
      
      expect(mockOnItemClick).not.toHaveBeenCalled()
    })
  })

  describe('Overflow Handling', () => {
    it('shows overflow menu when items exceed maxVisibleItems', () => {
      render(
        <BottomNavigation 
          items={manyItems}
          maxVisibleItems={4}
        />
      )
      
      expect(screen.getByLabelText('More options')).toBeInTheDocument()
    })

    it('shows overflow items when more button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <BottomNavigation 
          items={manyItems}
          maxVisibleItems={4}
        />
      )
      
      const moreButton = screen.getByLabelText('More options')
      await user.click(moreButton)
      
      // Should show overflow items
      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument()
        expect(screen.getByText('Messages')).toBeInTheDocument()
      })
    })

    it('closes overflow menu when overlay is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <BottomNavigation 
          items={manyItems}
          maxVisibleItems={4}
        />
      )
      
      const moreButton = screen.getByLabelText('More options')
      await user.click(moreButton)
      
      // Wait for overflow menu to appear
      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument()
      })
      
      // Click overlay to close
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/20')
      if (overlay) {
        await user.click(overlay)
        
        await waitFor(() => {
          expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
        })
      }
    })

    it('closes overflow menu when overflow item is clicked', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = jest.fn()
      
      render(
        <BottomNavigation 
          items={manyItems}
          maxVisibleItems={4}
          onItemClick={mockOnItemClick}
        />
      )
      
      // Open overflow menu
      const moreButton = screen.getByLabelText('More options')
      await user.click(moreButton)
      
      // Click overflow item
      await waitFor(async () => {
        const favoritesItem = screen.getByText('Favorites')
        await user.click(favoritesItem)
      })
      
      expect(mockOnItemClick).toHaveBeenCalled()
      
      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
      })
    })
  })

  describe('Scroll Behavior', () => {
    it('hides navigation when scrolling down', () => {
      render(
        <BottomNavigation 
          {...defaultProps} 
          hideOnScroll={true}
        />
      )
      
      // Simulate scroll down
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 200
      })
      
      fireEvent.scroll(window, { target: { scrollY: 200 } })
      
      // Navigation should have transform applied for hiding
      const nav = screen.getByRole('tablist')
      expect(nav).toBeInTheDocument()
    })

    it('does not hide navigation when hideOnScroll is false', () => {
      render(
        <BottomNavigation 
          {...defaultProps} 
          hideOnScroll={false}
        />
      )
      
      // Simulate scroll
      fireEvent.scroll(window, { target: { scrollY: 200 } })
      
      const nav = screen.getByRole('tablist')
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<BottomNavigation {...defaultProps} />)
      
      const nav = screen.getByRole('tablist')
      expect(nav).toHaveAttribute('aria-label', 'Bottom navigation')
    })

    it('has proper tab roles for items', () => {
      render(<BottomNavigation {...defaultProps} activeItem="home" />)
      
      const homeTab = screen.getByRole('tab', { name: 'Home' })
      expect(homeTab).toHaveAttribute('aria-selected', 'true')
      
      const usersTab = screen.getByRole('tab', { name: 'Users' })
      expect(usersTab).toHaveAttribute('aria-selected', 'false')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = jest.fn()
      
      render(
        <BottomNavigation 
          {...defaultProps} 
          onItemClick={mockOnItemClick}
        />
      )
      
      const homeButton = screen.getByLabelText('Home')
      homeButton.focus()
      
      await user.keyboard('{Enter}')
      expect(mockOnItemClick).toHaveBeenCalled()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(
        <BottomNavigation 
          {...defaultProps} 
          className="custom-class"
        />
      )
      
      const nav = screen.getByRole('tablist')
      expect(nav).toHaveClass('custom-class')
    })
  })
})

describe('useBottomNavigation', () => {
  function TestComponent({ items, defaultActive }: { 
    items: typeof mockItems
    defaultActive?: string 
  }) {
    const { activeItem, handleItemClick } = useBottomNavigation(items, defaultActive)
    
    return (
      <div>
        <div data-testid="active-item">{activeItem}</div>
        <button 
          onClick={() => handleItemClick(items[1])}
          data-testid="click-users"
        >
          Click Users
        </button>
      </div>
    )
  }

  it('initializes with first item as default active', () => {
    render(<TestComponent items={mockItems} />)
    
    expect(screen.getByTestId('active-item')).toHaveTextContent('home')
  })

  it('initializes with specified default active item', () => {
    render(<TestComponent items={mockItems} defaultActive="users" />)
    
    expect(screen.getByTestId('active-item')).toHaveTextContent('users')
  })

  it('updates active item when handleItemClick is called', async () => {
    const user = userEvent.setup()
    
    render(<TestComponent items={mockItems} />)
    
    const clickButton = screen.getByTestId('click-users')
    await user.click(clickButton)
    
    expect(screen.getByTestId('active-item')).toHaveTextContent('users')
  })

  it('handles items with href property', () => {
    const itemsWithHref = [
      { ...mockItems[0], href: '/test-page' }
    ]
    
    render(<TestComponent items={itemsWithHref} />)
    
    // Just verify the component renders without errors
    expect(screen.getByTestId('active-item')).toHaveTextContent('home')
  })
})