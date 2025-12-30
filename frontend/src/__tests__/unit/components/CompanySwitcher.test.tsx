/**
 * Tests for CompanySwitcher component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { CompanySwitcher, type Company } from '@/shared/components/company/CompanySwitcher';

const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    description: 'Leading technology company',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Tech Innovations',
    slug: 'tech-innovations',
    logo: 'https://example.com/logo.png',
    description: 'Innovation at scale',
  },
  {
    id: '3',
    name: 'Global Services',
    slug: 'global-services',
  },
];

describe('CompanySwitcher', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders company switcher button', () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Select company');
  });

  test('displays default company on initial render', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    });
  });

  test('displays placeholder when no companies', () => {
    const { container } = render(<CompanySwitcher companies={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('opens popover when button is clicked', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Switch Company')).toBeInTheDocument();
      expect(screen.getByText('Select the company to work with')).toBeInTheDocument();
    });
  });

  test('displays all companies in the dropdown', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      mockCompanies.forEach((company) => {
        expect(screen.getByText(company.name)).toBeInTheDocument();
      });
    });
  });

  test('selects a company when clicked', async () => {
    const onCompanyChange = jest.fn();
    render(
      <CompanySwitcher
        companies={mockCompanies}
        onCompanyChange={onCompanyChange}
      />
    );

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Tech Innovations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tech Innovations'));

    await waitFor(() => {
      expect(onCompanyChange).toHaveBeenCalledWith(mockCompanies[1]);
    });
  });

  test('stores selected company in localStorage', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Tech Innovations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tech Innovations'));

    await waitFor(() => {
      expect(localStorage.getItem('fastnext_selected_company')).toBe('2');
    });
  });

  test('uses defaultCompanyId when provided', async () => {
    render(
      <CompanySwitcher
        companies={mockCompanies}
        defaultCompanyId="2"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tech Innovations')).toBeInTheDocument();
    });
  });

  test('shows add company button when showAddButton is true', async () => {
    const onAddCompany = jest.fn();
    render(
      <CompanySwitcher
        companies={mockCompanies}
        showAddButton
        onAddCompany={onAddCompany}
      />
    );

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Add new company')).toBeInTheDocument();
    });
  });

  test('calls onAddCompany when add button is clicked', async () => {
    const onAddCompany = jest.fn();
    render(
      <CompanySwitcher
        companies={mockCompanies}
        showAddButton
        onAddCompany={onAddCompany}
      />
    );

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Add new company')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add new company'));

    expect(onAddCompany).toHaveBeenCalled();
  });

  test('disables button when disabled prop is true', () => {
    render(<CompanySwitcher companies={mockCompanies} disabled />);

    const button = screen.getByRole('combobox');
    expect(button).toBeDisabled();
  });

  test('shows company description in dropdown', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Leading technology company')).toBeInTheDocument();
    });
  });

  test('renders different sizes correctly', () => {
    const { rerender } = render(
      <CompanySwitcher companies={mockCompanies} size="sm" />
    );

    let button = screen.getByRole('combobox');
    expect(button).toHaveClass('h-8');

    rerender(<CompanySwitcher companies={mockCompanies} size="md" />);
    button = screen.getByRole('combobox');
    expect(button).toHaveClass('h-10');

    rerender(<CompanySwitcher companies={mockCompanies} size="lg" />);
    button = screen.getByRole('combobox');
    expect(button).toHaveClass('h-12');
  });

  test('shows check icon for selected company', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      // The default company should have a check indicator
      const acmeRow = screen.getByText('Acme Corporation').closest('button');
      expect(acmeRow?.querySelector('svg')).toBeInTheDocument();
    });
  });

  test('closes popover after selection', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Switch Company')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tech Innovations'));

    await waitFor(() => {
      expect(screen.queryByText('Switch Company')).not.toBeInTheDocument();
    });
  });

  test('displays company initials when no logo', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    await waitFor(() => {
      // "Acme Corporation" should show "AC"
      expect(screen.getByText('AC')).toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(<CompanySwitcher companies={mockCompanies} className="custom-class" />);

    const button = screen.getByRole('combobox');
    expect(button).toHaveClass('custom-class');
  });

  test('rotates chevron icon when open', async () => {
    render(<CompanySwitcher companies={mockCompanies} />);

    const button = screen.getByRole('combobox');

    // Initially not rotated
    fireEvent.click(button);

    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
