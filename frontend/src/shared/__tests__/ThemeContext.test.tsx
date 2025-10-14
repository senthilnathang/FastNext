import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '../services/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock the localStorage in the ThemeContext module
jest.mock('../services/ThemeContext', () => {
  const original = jest.requireActual('../services/ThemeContext');
  return {
    ...original,
    // Mock localStorage usage in the context
  };
});

// Set global localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
const createMockMatchMedia = (matches: boolean) => {
  return jest.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

// Test component to access theme context
const TestComponent: React.FC = () => {
  const { theme, setTheme, actualTheme, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="actual-theme">{actualTheme}</div>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        Set System
      </button>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    document.documentElement.className = '';

    // Reset matchMedia to default (light theme)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(false),
    });
  });

  it('provides theme context values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toBeInTheDocument();
    expect(screen.getByTestId('actual-theme')).toBeInTheDocument();
  });

  it('defaults to system theme when no localStorage value', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');
    });
  });

  it('loads theme from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return 'dark';
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });
  });

  it('loads theme from user preferences when no direct theme setting', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return null;
      if (key === 'userPreferences') return JSON.stringify({ theme: 'dark' });
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  it('sets theme and saves to localStorage', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    const setDarkButton = screen.getByTestId('set-dark');
    fireEvent.click(setDarkButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  it('applies theme class to document element', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setDarkButton = screen.getByTestId('set-dark');
    fireEvent.click(setDarkButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    const setLightButton = screen.getByTestId('set-light');
    fireEvent.click(setLightButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('toggles theme correctly', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    const toggleButton = screen.getByTestId('toggle-theme');

    // Start with system, should go to light
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    // Light -> Dark
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    // Dark -> System
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });
  });

  it('detects system theme preference', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(true), // Dark theme
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setSystemButton = screen.getByTestId('set-system');
    fireEvent.click(setSystemButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark');
    });
  });

  it('listens to system theme changes', async () => {
    const mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: false,  // Start with light mode
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

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    const setSystemButton = screen.getByTestId('set-system');
    fireEvent.click(setSystemButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      expect(screen.getByTestId('actual-theme')).toHaveTextContent('light');  // matches: false means light mode
    });
  });

  it('handles invalid localStorage values gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-theme');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });
  });

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error loading theme:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('handles invalid JSON in user preferences', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return null;
      if (key === 'userPreferences') return 'invalid-json';
      return null;
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('throws error when useTheme is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useTheme();
      return <div>Should not render</div>;
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});
