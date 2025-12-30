import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ACLManager from '@/modules/acl/components/ACLManager';

// Mock fetch
global.fetch = jest.fn();

const mockACLs = [
  {
    id: 1,
    name: 'Test ACL',
    description: 'Test access control list',
    entity_type: 'orders',
    operation: 'read',
    allowed_roles: ['admin', 'manager'],
    denied_roles: [],
    priority: 100,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

describe('ACLManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/v1/acls')) {
        // Handle different HTTP methods
        const method = options?.method || 'GET';

        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockACLs),
          });
        }
        if (method === 'POST') {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 2, ...body }),
          });
        }
        if (method === 'PUT') {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(body),
          });
        }
        if (method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders ACL manager with table', async () => {
    render(<ACLManager />);

    await waitFor(() => {
      expect(screen.getByText('Test ACL')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for ACL content
    expect(screen.getByText('orders')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
  });

  test('opens create ACL form', async () => {
    render(<ACLManager />);

    await waitFor(() => {
      expect(screen.getByText('Test ACL')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create|add/i });
    fireEvent.click(createButton);

    expect(screen.getByText(/create.*acl/i)).toBeInTheDocument();
  });

  test('creates new ACL', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/acls')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 2,
            name: 'New ACL',
            description: 'New access control list',
            entity_type: 'invoices',
            operation: 'write',
            allowed_roles: ['admin'],
            denied_roles: [],
            priority: 100,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: mockACLs,
          total: 1,
          skip: 0,
          limit: 10,
        }),
      });
    });

    render(<ACLManager />);

    await waitFor(() => {
      expect(screen.getByText('Test ACL')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByRole('button', { name: /create|add/i });
    fireEvent.click(createButton);

    // Fill form
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'New ACL' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'New access control list' },
    });

    // Select entity type
    const entitySelect = screen.getByRole('combobox', { name: /entity.type/i });
    fireEvent.change(entitySelect, { target: { value: 'invoices' } });

    // Select operation
    const operationSelect = screen.getByRole('combobox', { name: /operation/i });
    fireEvent.change(operationSelect, { target: { value: 'write' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New ACL')).toBeInTheDocument();
    });
  });

  test('edits existing ACL', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PUT' && url.includes('/acls/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockACLs[0],
            description: 'Updated description',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: mockACLs,
          total: 1,
          skip: 0,
          limit: 10,
        }),
      });
    });

    render(<ACLManager />);

    await waitFor(() => {
      expect(screen.getByText('Test ACL')).toBeInTheDocument();
    });

    // Click edit button (assuming it's in the row)
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Update description
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Updated description' },
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Updated description')).toBeInTheDocument();
    });
  });

  test('deletes ACL', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE' && url.includes('/acls/1')) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/acls') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [], // Empty after deletion
            total: 0,
            skip: 0,
            limit: 10,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: mockACLs,
          total: 1,
          skip: 0,
          limit: 10,
        }),
      });
    });

    render(<ACLManager />);

    await waitFor(() => {
      expect(screen.getByText('Test ACL')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm|delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('Test ACL')).not.toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<ACLManager />);

    // When fetch fails, component should show empty state or error
    await waitFor(() => {
      // Either shows error message or empty state
      const hasError = screen.queryByText(/error|failed/i);
      const hasEmptyState = screen.queryByText(/no acl/i);
      expect(hasError || hasEmptyState).toBeTruthy();
    }, { timeout: 3000 });
  });
});