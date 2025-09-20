import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle, SimpleThemeToggle } from '../theme-toggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';
  });

  it('renders theme toggle dropdown', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveAttribute('title', undefined);
  });

  it('opens dropdown menu when clicked', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  it('switches to light theme when light option is clicked', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const lightOption = screen.getByText('Light');
      fireEvent.click(lightOption);
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });

  it('switches to dark theme when dark option is clicked', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const darkOption = screen.getByText('Dark');
      fireEvent.click(darkOption);
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('switches to system theme when system option is clicked', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const systemOption = screen.getByText('System');
      fireEvent.click(systemOption);
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'system');
    });
  });

  it('loads theme from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });

  it('falls back to user preferences if no direct theme setting', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return null;
      if (key === 'userPreferences') return JSON.stringify({ theme: 'dark' });
      return null;
    });

    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith('userPreferences');
  });
});

describe('SimpleThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';
  });

  it('renders simple theme toggle button', () => {
    render(
      <TestWrapper>
        <SimpleThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('displays sun icon for light theme', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(
      <TestWrapper>
        <SimpleThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // We can't easily test the icon content, but we can test the title
    expect(button).toHaveAttribute('title', 'Light mode');
  });

  it('displays moon icon for dark theme', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <TestWrapper>
        <SimpleThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Dark mode');
    });
  });

  it('displays monitor icon for system theme', async () => {
    localStorageMock.getItem.mockReturnValue('system');

    render(
      <TestWrapper>
        <SimpleThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'System (light)');
    });
  });

  it('cycles through themes when clicked', async () => {
    render(
      <TestWrapper>
        <SimpleThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');

    // First click: light -> dark
    fireEvent.click(button);
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    // Second click: dark -> system
    fireEvent.click(button);
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'system');
    });

    // Third click: system -> light
    fireEvent.click(button);
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });
});

describe('Theme Context Integration', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';
  });

  it('applies theme class to document element', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const darkOption = screen.getByText('Dark');
      fireEvent.click(darkOption);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  it('handles system theme preference changes', async () => {
    const mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const systemOption = screen.getByText('System');
      fireEvent.click(systemOption);
    });

    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('handles errors in localStorage gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    expect(consoleSpy).toHaveBeenCalledWith('Error loading theme:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});