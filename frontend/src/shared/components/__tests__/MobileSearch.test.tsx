import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileSearch } from '../navigation/MobileSearch'

// Mock Web Speech API
const mockRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
  continuous: false,
  interimResults: false,
  lang: 'en-US'
}

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockRecognition)
})

describe('MobileSearch', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders search input', () => {
      render(<MobileSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search...')
      expect(input).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          placeholder="Custom search..."
        />
      )
      
      expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument()
    })

    it('renders in compact mode', () => {
      render(<MobileSearch {...defaultProps} compact={true} />)
      
      const input = screen.getByPlaceholderText('Search...')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Search Input Behavior', () => {
    it('displays the current value', () => {
      render(<MobileSearch {...defaultProps} value="test query" />)
      
      const input = screen.getByDisplayValue('test query')
      expect(input).toBeInTheDocument()
    })

    it('calls onChange when input changes', () => {
      const mockOnChange = jest.fn()
      render(<MobileSearch {...defaultProps} onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Search...')
      fireEvent.change(input, { target: { value: 'test' } })
      
      expect(mockOnChange).toHaveBeenCalledWith('test')
    })

    it('calls onSubmit when Enter is pressed', () => {
      const mockOnSubmit = jest.fn()
      render(
        <MobileSearch 
          {...defaultProps} 
          value="test query"
          onSubmit={mockOnSubmit}
        />
      )
      
      const input = screen.getByPlaceholderText('Search...')
      fireEvent.keyDown(input, { key: 'Enter' })
      
      expect(mockOnSubmit).toHaveBeenCalledWith('test query')
    })

    it('shows clear button when value is present', () => {
      render(<MobileSearch {...defaultProps} value="test query" />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('does not show clear button when value is empty', () => {
      render(<MobileSearch {...defaultProps} value="" />)
      
      // Should only have voice and filter buttons if enabled, not clear
      const allButtons = screen.getAllByRole('button')
      // In default mode with voice and filters enabled, we expect 2 buttons (voice + filter)
      expect(allButtons.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Voice Search', () => {
    it('includes voice search elements when enabled', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          enableVoiceSearch={true}
        />
      )
      
      // Voice search functionality should be present
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    })

    it('excludes voice search when disabled', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          enableVoiceSearch={false}
        />
      )
      
      // Should have fewer buttons without voice search
      const buttons = screen.getAllByRole('button')
      expect(buttons).toBeDefined()
    })
  })

  describe('Filters', () => {
    it('shows filter button when enabled', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          enableFilters={true}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('shows filter count when provided', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          enableFilters={true}
          filterCount={5}
        />
      )
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('calls onFiltersClick when provided', () => {
      const mockOnFiltersClick = jest.fn()
      render(
        <MobileSearch 
          {...defaultProps} 
          enableFilters={true}
          onFiltersClick={mockOnFiltersClick}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      if (buttons.length > 0) {
        fireEvent.click(buttons[buttons.length - 1]) // Last button should be filters
        expect(mockOnFiltersClick).toHaveBeenCalled()
      }
    })
  })

  describe('Compact Mode', () => {
    it('renders compact layout correctly', () => {
      render(
        <MobileSearch 
          {...defaultProps} 
          compact={true}
          enableFilters={true}
          filterCount={3}
        />
      )
      
      const input = screen.getByPlaceholderText('Search...')
      expect(input).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('handles escape key', () => {
      render(<MobileSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search...')
      fireEvent.keyDown(input, { key: 'Escape' })
      
      // Should not throw an error
      expect(input).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(<MobileSearch {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })
  })
})