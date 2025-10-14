import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileSidebar, useMobileSidebar } from '../navigation/MobileSidebar'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}), { virtual: true })

// Mock useSwipeGesture hook
jest.mock('@/shared/hooks/useSwipeGesture', () => ({
  useSwipeGesture: () => ({
    addSwipeListeners: jest.fn(() => jest.fn())
  })
}))

describe('MobileSidebar', () => {
  const defaultProps = {
    isOpen: false,
    onOpenChange: jest.fn(),
    children: <div>Sidebar Content</div>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Reset body styles
    document.body.style.overflow = 'unset'
  })

  describe('Basic Rendering', () => {
    it('renders trigger button when closed', () => {
      render(<MobileSidebar {...defaultProps} />)

      const triggerButton = screen.getByLabelText('Open sidebar')
      expect(triggerButton).toBeInTheDocument()
    })

    it('renders sidebar content when open', () => {
      render(<MobileSidebar {...defaultProps} isOpen={true} />)

      expect(screen.getByText('Sidebar Content')).toBeInTheDocument()
    })

    it('renders custom trigger button', () => {
      const customTrigger = <button>Custom Trigger</button>
      render(
        <MobileSidebar
          {...defaultProps}
          triggerButton={customTrigger}
        />
      )

      expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    })
  })

  describe('Sidebar Behavior', () => {
    it('calls onOpenChange when trigger button is clicked', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          onOpenChange={mockOnOpenChange}
        />
      )

      const triggerButton = screen.getByLabelText('Open sidebar')
      fireEvent.click(triggerButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(true)
    })

    it('calls onOpenChange when close button is clicked', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const closeButton = screen.getByLabelText('Close sidebar')
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onOpenChange when overlay is clicked', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          closeOnOverlayClick={true}
        />
      )

      // Find overlay by class since it doesn't have specific text
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(overlay).toBeInTheDocument()

      if (overlay) {
        fireEvent.click(overlay)
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      }
    })

    it('does not close on overlay click when disabled', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          closeOnOverlayClick={false}
        />
      )

      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50')
      if (overlay) {
        fireEvent.click(overlay)
        expect(mockOnOpenChange).not.toHaveBeenCalled()
      }
    })
  })

  describe('Keyboard Navigation', () => {
    it('closes sidebar on Escape key', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('does not close on other keys', () => {
      const mockOnOpenChange = jest.fn()
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'Tab' })

      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Management', () => {
    it('sets body overflow to hidden when open', () => {
      render(<MobileSidebar {...defaultProps} isOpen={true} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('resets body overflow when closed', () => {
      const { rerender } = render(<MobileSidebar {...defaultProps} isOpen={true} />)
      expect(document.body.style.overflow).toBe('hidden')

      rerender(<MobileSidebar {...defaultProps} isOpen={false} />)
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Customization Props', () => {
    it('applies custom width', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          width={350}
        />
      )

      const sidebar = document.querySelector('[style*="width: 350px"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('applies custom width as string', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          width="300px"
        />
      )

      const sidebar = document.querySelector('[style*="width: 300px"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('renders on right side', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          side="right"
        />
      )

      const sidebar = document.querySelector('.right-0')
      expect(sidebar).toBeInTheDocument()
    })

    it('hides close button when showCloseButton is false', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          showCloseButton={false}
        />
      )

      expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<MobileSidebar {...defaultProps} />)

      const triggerButton = screen.getByLabelText('Open sidebar')
      expect(triggerButton).toBeInTheDocument()
    })

    it('has proper ARIA labels for close button', () => {
      render(<MobileSidebar {...defaultProps} isOpen={true} />)

      const closeButton = screen.getByLabelText('Close sidebar')
      expect(closeButton).toBeInTheDocument()
    })
  })
})

describe('useMobileSidebar', () => {
  function TestComponent({ initialOpen = false }: { initialOpen?: boolean }) {
    const { isOpen, open, close, toggle } = useMobileSidebar(initialOpen)

    return (
      <div>
        <div data-testid="status">{isOpen ? 'open' : 'closed'}</div>
        <button onClick={open} data-testid="open">Open</button>
        <button onClick={close} data-testid="close">Close</button>
        <button onClick={toggle} data-testid="toggle">Toggle</button>
      </div>
    )
  }

  it('initializes with closed state by default', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('status')).toHaveTextContent('closed')
  })

  it('initializes with open state when specified', () => {
    render(<TestComponent initialOpen={true} />)

    expect(screen.getByTestId('status')).toHaveTextContent('open')
  })

  it('opens sidebar when open is called', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByTestId('open'))
    expect(screen.getByTestId('status')).toHaveTextContent('open')
  })

  it('closes sidebar when close is called', () => {
    render(<TestComponent initialOpen={true} />)

    fireEvent.click(screen.getByTestId('close'))
    expect(screen.getByTestId('status')).toHaveTextContent('closed')
  })

  it('toggles sidebar state when toggle is called', () => {
    render(<TestComponent />)

    // Start closed, toggle to open
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('status')).toHaveTextContent('open')

    // Toggle back to closed
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('status')).toHaveTextContent('closed')
  })
})
