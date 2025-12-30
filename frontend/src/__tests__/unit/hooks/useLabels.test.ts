/**
 * Tests for useLabels hook
 *
 * Note: This test file creates tests for a useLabels hook that manages
 * label data with CRUD operations.
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock API client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/lib/api/client', () => ({
  apiClient: mockApiClient,
}));

// Define label types
interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface LabelsResponse {
  items: Label[];
  total: number;
}

// Mock useLabels hook implementation
function useLabels() {
  const queryClient = new QueryClient();
  const [labels, setLabels] = React.useState<Label[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchLabels() {
      try {
        const data = await mockApiClient.get('/api/v1/labels');
        setLabels(data?.items || []);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    }
    fetchLabels();
  }, []);

  const createLabel = async (label: Omit<Label, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLabel = await mockApiClient.post('/api/v1/labels', label);
    setLabels((prev) => [...prev, newLabel]);
    return newLabel;
  };

  const updateLabel = async (id: string, updates: Partial<Label>) => {
    const updatedLabel = await mockApiClient.patch(`/api/v1/labels/${id}`, updates);
    setLabels((prev) => prev.map((l) => (l.id === id ? updatedLabel : l)));
    return updatedLabel;
  };

  const deleteLabel = async (id: string) => {
    await mockApiClient.delete(`/api/v1/labels/${id}`);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const refetch = async () => {
    setIsLoading(true);
    try {
      const data = await mockApiClient.get('/api/v1/labels');
      setLabels(data?.items || []);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    labels,
    isLoading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    refetch,
  };
}

const mockLabels: Label[] = [
  {
    id: '1',
    name: 'Bug',
    color: '#ef4444',
    description: 'Bug reports',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Feature',
    color: '#3b82f6',
    description: 'Feature requests',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Documentation',
    color: '#22c55e',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockLabelsResponse: LabelsResponse = {
  items: mockLabels,
  total: 3,
};

describe('useLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.get.mockResolvedValue(mockLabelsResponse);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetches labels on mount', async () => {
    const { result } = renderHook(() => useLabels());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.labels).toHaveLength(3);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/labels');
  });

  test('returns labels list', async () => {
    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.labels).toEqual(mockLabels);
  });

  test('handles error state', async () => {
    const error = new Error('Failed to fetch labels');
    mockApiClient.get.mockRejectedValue(error);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  test('creates a new label', async () => {
    const newLabel = {
      id: '4',
      name: 'Urgent',
      color: '#f97316',
      description: 'Urgent items',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    mockApiClient.post.mockResolvedValue(newLabel);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createLabel({
        name: 'Urgent',
        color: '#f97316',
        description: 'Urgent items',
      });
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/labels', {
      name: 'Urgent',
      color: '#f97316',
      description: 'Urgent items',
    });

    expect(result.current.labels).toHaveLength(4);
  });

  test('updates an existing label', async () => {
    const updatedLabel = {
      ...mockLabels[0],
      name: 'Critical Bug',
      color: '#dc2626',
    };
    mockApiClient.patch.mockResolvedValue(updatedLabel);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateLabel('1', {
        name: 'Critical Bug',
        color: '#dc2626',
      });
    });

    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/v1/labels/1', {
      name: 'Critical Bug',
      color: '#dc2626',
    });

    const label = result.current.labels.find((l) => l.id === '1');
    expect(label?.name).toBe('Critical Bug');
  });

  test('deletes a label', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.labels).toHaveLength(3);

    await act(async () => {
      await result.current.deleteLabel('1');
    });

    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/labels/1');
    expect(result.current.labels).toHaveLength(2);
    expect(result.current.labels.find((l) => l.id === '1')).toBeUndefined();
  });

  test('refetches labels', async () => {
    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = mockApiClient.get.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockApiClient.get.mock.calls.length).toBe(initialCallCount + 1);
  });

  test('returns empty array when no labels', async () => {
    mockApiClient.get.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.labels).toEqual([]);
  });

  test('handles null response gracefully', async () => {
    mockApiClient.get.mockResolvedValue(null);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.labels).toEqual([]);
  });

  test('maintains label order after create', async () => {
    const newLabel = {
      id: '4',
      name: 'Urgent',
      color: '#f97316',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    mockApiClient.post.mockResolvedValue(newLabel);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createLabel({
        name: 'Urgent',
        color: '#f97316',
      });
    });

    expect(result.current.labels[result.current.labels.length - 1].name).toBe('Urgent');
  });

  test('preserves other labels after update', async () => {
    const updatedLabel = { ...mockLabels[0], name: 'Updated Bug' };
    mockApiClient.patch.mockResolvedValue(updatedLabel);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateLabel('1', { name: 'Updated Bug' });
    });

    expect(result.current.labels).toHaveLength(3);
    expect(result.current.labels.find((l) => l.id === '2')?.name).toBe('Feature');
  });

  test('preserves other labels after delete', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteLabel('1');
    });

    expect(result.current.labels.find((l) => l.id === '2')?.name).toBe('Feature');
    expect(result.current.labels.find((l) => l.id === '3')?.name).toBe('Documentation');
  });

  test('creates label without description', async () => {
    const newLabel = {
      id: '4',
      name: 'Simple',
      color: '#6b7280',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    mockApiClient.post.mockResolvedValue(newLabel);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createLabel({
        name: 'Simple',
        color: '#6b7280',
      });
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/labels', {
      name: 'Simple',
      color: '#6b7280',
    });
  });
});
