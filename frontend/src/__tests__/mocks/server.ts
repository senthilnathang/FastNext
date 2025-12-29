/**
 * MSW Server Setup
 *
 * Creates an MSW server instance for Node.js (test environment).
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create server with default handlers
export const server = setupServer(...handlers);
