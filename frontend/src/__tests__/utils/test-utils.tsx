/**
 * Custom Test Utilities
 *
 * Provides custom render functions and test helpers.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * All Providers wrapper for tests
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

/**
 * Custom render function that wraps component with providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

/**
 * Re-export everything from testing-library
 */
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
