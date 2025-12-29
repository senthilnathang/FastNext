/**
 * MSW Browser Setup
 *
 * Creates an MSW service worker for browser environment.
 * Useful for development and Storybook.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create service worker with default handlers
export const worker = setupWorker(...handlers);
