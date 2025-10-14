import { render, screen } from '@testing-library/react'
import SwaggerUI from '../SwaggerUI'

// Mock the auth context
jest.mock('@/modules/auth', () => ({
  useAuth: () => ({
    user: { username: 'testuser' },
  }),
}))

// Mock dynamic imports
jest.mock('next/dynamic', () => () => {
  const MockSwaggerUI = () => <div data-testid="swagger-ui-mock">Swagger UI</div>
  return MockSwaggerUI
})

// Mock fetch for API connection testing
global.fetch = jest.fn()

describe('SwaggerUI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    })
  })

  it('renders with toolbar by default', () => {
    render(<SwaggerUI />)

    expect(screen.getByText('API Status:')).toBeInTheDocument()
    expect(screen.getByText('Authenticated as: testuser')).toBeInTheDocument()
  })

  it('renders without toolbar when showToolbar is false', () => {
    render(<SwaggerUI showToolbar={false} />)

    expect(screen.queryByText('API Status:')).not.toBeInTheDocument()
  })

  it('can use strict mode', () => {
    render(<SwaggerUI useStrictMode={true} />)

    // Should still render the component
    expect(screen.getByText('API Status:')).toBeInTheDocument()
  })

  it('uses non-strict mode by default', () => {
    render(<SwaggerUI useStrictMode={false} />)

    // Should still render the component
    expect(screen.getByText('API Status:')).toBeInTheDocument()
  })
})
