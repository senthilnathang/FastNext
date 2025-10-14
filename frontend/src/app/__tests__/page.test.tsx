import { render, screen } from '@testing-library/react'
import Home from '../page'

describe('Home', () => {
  it('renders the main page', () => {
    render(<Home />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })
})
