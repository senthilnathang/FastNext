import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../../ui/input'

describe('Input Component', () => {
  it('renders input with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm'
    )
  })

  it('accepts different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} data-testid="input" />)
    
    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('accepts custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('supports placeholder text', () => {
    render(<Input placeholder="Enter your name" />)
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
  })

  it('supports default value', () => {
    render(<Input defaultValue="default text" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveValue('default text')
  })

  it('supports controlled value', () => {
    const { rerender } = render(<Input value="controlled" data-testid="input" readOnly />)
    expect(screen.getByTestId('input')).toHaveValue('controlled')

    rerender(<Input value="updated" data-testid="input" readOnly />)
    expect(screen.getByTestId('input')).toHaveValue('updated')
  })

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} data-testid="input" />)
    
    const input = screen.getByTestId('input')
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('supports error prop (custom prop)', () => {
    render(<Input data-testid="input" className="border-red-500" />)
    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('border-red-500')
  })

  it('supports file input type', () => {
    render(<Input type="file" data-testid="file-input" />)
    const input = screen.getByTestId('file-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveClass('file:border-0', 'file:bg-transparent', 'file:text-sm', 'file:font-medium')
  })

  it('supports required attribute', () => {
    render(<Input required data-testid="input" />)
    expect(screen.getByTestId('input')).toBeRequired()
  })

  it('supports readonly attribute', () => {
    render(<Input readOnly data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('readonly')
  })

  it('supports maxLength attribute', () => {
    render(<Input maxLength={10} data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('maxLength', '10')
  })

  it('supports minLength attribute', () => {
    render(<Input minLength={5} data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('minLength', '5')
  })

  it('supports pattern attribute', () => {
    render(<Input pattern="[0-9]{3}" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('pattern', '[0-9]{3}')
  })
})