'use client';

/**
 * Labels Hook
 *
 * Provides label management with CRUD operations, assign/unassign functionality,
 * color management, and TanStack Query integration.
 */

import { useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useWebSocketEvent } from './useWebSocket';

// Label colors
export const LABEL_COLORS = [
  { name: 'Gray', value: '#6b7280', bg: '#f3f4f6' },
  { name: 'Red', value: '#ef4444', bg: '#fef2f2' },
  { name: 'Orange', value: '#f97316', bg: '#fff7ed' },
  { name: 'Amber', value: '#f59e0b', bg: '#fffbeb' },
  { name: 'Yellow', value: '#eab308', bg: '#fefce8' },
  { name: 'Lime', value: '#84cc16', bg: '#f7fee7' },
  { name: 'Green', value: '#22c55e', bg: '#f0fdf4' },
  { name: 'Emerald', value: '#10b981', bg: '#ecfdf5' },
  { name: 'Teal', value: '#14b8a6', bg: '#f0fdfa' },
  { name: 'Cyan', value: '#06b6d4', bg: '#ecfeff' },
  { name: 'Sky', value: '#0ea5e9', bg: '#f0f9ff' },
  { name: 'Blue', value: '#3b82f6', bg: '#eff6ff' },
  { name: 'Indigo', value: '#6366f1', bg: '#eef2ff' },
  { name: 'Violet', value: '#8b5cf6', bg: '#f5f3ff' },
  { name: 'Purple', value: '#a855f7', bg: '#faf5ff' },
  { name: 'Fuchsia', value: '#d946ef', bg: '#fdf4ff' },
  { name: 'Pink', value: '#ec4899', bg: '#fdf2f8' },
  { name: 'Rose', value: '#f43f5e', bg: '#fff1f2' },
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number]['value'];

// Label interface
export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

// Label assignment interface
export interface LabelAssignment {
  labelId: string;
  itemId: string;
  itemType: string;
  assignedAt: string;
}

// API response types
export interface LabelsResponse {
  items: Label[];
  total: number;
}

export interface LabelFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

// Create/Update label data
export interface LabelData {
  name: string;
  color: string;
  description?: string;
}

// Query keys
export const labelKeys = {
  all: ['labels'] as const,
  lists: () => [...labelKeys.all, 'list'] as const,
  list: (filters: LabelFilters) => [...labelKeys.lists(), filters] as const,
  detail: (id: string) => [...labelKeys.all, 'detail', id] as const,
  assignments: (itemType: string, itemId: string) =>
    [...labelKeys.all, 'assignments', itemType, itemId] as const,
};

// API functions
async function fetchLabels(filters: LabelFilters = {}): Promise<LabelsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 100,
    search: filters.search,
  };

  return apiClient.get<LabelsResponse>('/api/v1/labels', params);
}

async function fetchLabel(id: string): Promise<Label> {
  return apiClient.get<Label>(`/api/v1/labels/${id}`);
}

async function createLabel(data: LabelData): Promise<Label> {
  return apiClient.post<Label>('/api/v1/labels', data);
}

async function updateLabel(id: string, data: Partial<LabelData>): Promise<Label> {
  return apiClient.patch<Label>(`/api/v1/labels/${id}`, data);
}

async function deleteLabel(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/labels/${id}`);
}

async function fetchItemLabels(
  itemType: string,
  itemId: string,
): Promise<Label[]> {
  return apiClient.get<Label[]>(`/api/v1/${itemType}/${itemId}/labels`);
}

async function assignLabel(
  itemType: string,
  itemId: string,
  labelId: string,
): Promise<void> {
  return apiClient.post(`/api/v1/${itemType}/${itemId}/labels/${labelId}`);
}

async function unassignLabel(
  itemType: string,
  itemId: string,
  labelId: string,
): Promise<void> {
  return apiClient.delete(`/api/v1/${itemType}/${itemId}/labels/${labelId}`);
}

// Hook options
export interface UseLabelsOptions {
  /** Filters for labels query */
  filters?: LabelFilters;
  /** Enable real-time updates via WebSocket */
  realtime?: boolean;
  /** Custom query options */
  queryOptions?: Partial<UseQueryOptions<LabelsResponse>>;
}

// Hook return type
export interface UseLabelsReturn {
  /** List of labels */
  labels: Label[];
  /** Total count of labels */
  total: number;
  /** Whether labels are loading */
  isLoading: boolean;
  /** Whether labels are being fetched */
  isFetching: boolean;
  /** Error if any */
  error: Error | null;
  /** Create a new label */
  createLabel: (data: LabelData) => Promise<Label>;
  /** Update an existing label */
  updateLabel: (id: string, data: Partial<LabelData>) => Promise<Label>;
  /** Delete a label */
  deleteLabel: (id: string) => Promise<void>;
  /** Refetch labels */
  refetch: () => void;
  /** Check if creating label is in progress */
  isCreating: boolean;
  /** Check if updating label is in progress */
  isUpdating: boolean;
  /** Check if deleting label is in progress */
  isDeleting: boolean;
  /** Get label by ID */
  getLabelById: (id: string) => Label | undefined;
  /** Available colors */
  colors: typeof LABEL_COLORS;
  /** Get color info */
  getColorInfo: (color: string) => (typeof LABEL_COLORS)[number] | undefined;
}

/**
 * useLabels hook
 *
 * Provides label management with CRUD operations.
 *
 * @example
 * ```tsx
 * function LabelManager() {
 *   const {
 *     labels,
 *     createLabel,
 *     updateLabel,
 *     deleteLabel,
 *     colors,
 *   } = useLabels();
 *
 *   const handleCreate = async () => {
 *     await createLabel({
 *       name: 'Important',
 *       color: '#ef4444',
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       {labels.map((label) => (
 *         <LabelItem key={label.id} label={label} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLabels(options: UseLabelsOptions = {}): UseLabelsReturn {
  const { filters = {}, realtime = true, queryOptions } = options;

  const queryClient = useQueryClient();

  // Fetch labels
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: labelKeys.list(filters),
    queryFn: () => fetchLabels(filters),
    staleTime: 60 * 1000, // 1 minute
    ...queryOptions,
  });

  // Create label mutation
  const createMutation = useMutation({
    mutationFn: createLabel,
    onSuccess: (newLabel) => {
      queryClient.setQueryData<LabelsResponse>(
        labelKeys.list(filters),
        (old) => {
          if (!old) return { items: [newLabel], total: 1 };
          return {
            ...old,
            items: [...old.items, newLabel],
            total: old.total + 1,
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.lists() });
    },
  });

  // Update label mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LabelData> }) =>
      updateLabel(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.lists() });

      const previousData = queryClient.getQueryData<LabelsResponse>(
        labelKeys.list(filters),
      );

      queryClient.setQueryData<LabelsResponse>(
        labelKeys.list(filters),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((label) =>
              label.id === id
                ? { ...label, ...data, updatedAt: new Date().toISOString() }
                : label,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(labelKeys.list(filters), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.lists() });
    },
  });

  // Delete label mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLabel,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.lists() });

      const previousData = queryClient.getQueryData<LabelsResponse>(
        labelKeys.list(filters),
      );

      queryClient.setQueryData<LabelsResponse>(
        labelKeys.list(filters),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((label) => label.id !== id),
            total: old.total - 1,
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(labelKeys.list(filters), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.lists() });
    },
  });

  // Real-time updates
  useWebSocketEvent<Label>(
    'label:created',
    useCallback(
      (label) => {
        queryClient.setQueryData<LabelsResponse>(
          labelKeys.list(filters),
          (old) => {
            if (!old) return { items: [label], total: 1 };
            // Avoid duplicates
            if (old.items.some((l) => l.id === label.id)) return old;
            return {
              ...old,
              items: [...old.items, label],
              total: old.total + 1,
            };
          },
        );
      },
      [queryClient, filters],
    ),
    [realtime],
  );

  useWebSocketEvent<Label>(
    'label:updated',
    useCallback(
      (label) => {
        queryClient.setQueryData<LabelsResponse>(
          labelKeys.list(filters),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((l) => (l.id === label.id ? label : l)),
            };
          },
        );
      },
      [queryClient, filters],
    ),
    [realtime],
  );

  useWebSocketEvent<{ id: string }>(
    'label:deleted',
    useCallback(
      ({ id }) => {
        queryClient.setQueryData<LabelsResponse>(
          labelKeys.list(filters),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.filter((l) => l.id !== id),
              total: old.total - 1,
            };
          },
        );
      },
      [queryClient, filters],
    ),
    [realtime],
  );

  // Memoized values
  const labels = useMemo(() => data?.items ?? [], [data]);
  const total = useMemo(() => data?.total ?? 0, [data]);

  const getLabelById = useCallback(
    (id: string) => labels.find((label) => label.id === id),
    [labels],
  );

  const getColorInfo = useCallback(
    (color: string) => LABEL_COLORS.find((c) => c.value === color),
    [],
  );

  return {
    labels,
    total,
    isLoading,
    isFetching,
    error: error as Error | null,
    createLabel: async (data: LabelData) => {
      return createMutation.mutateAsync(data);
    },
    updateLabel: async (id: string, data: Partial<LabelData>) => {
      return updateMutation.mutateAsync({ id, data });
    },
    deleteLabel: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    refetch: () => {
      refetch();
    },
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getLabelById,
    colors: LABEL_COLORS,
    getColorInfo,
  };
}

// Item labels hook options
export interface UseItemLabelsOptions {
  /** Item type (e.g., 'conversations', 'contacts') */
  itemType: string;
  /** Item ID */
  itemId: string;
  /** Enable real-time updates */
  realtime?: boolean;
  /** Custom query options */
  queryOptions?: Partial<UseQueryOptions<Label[]>>;
}

// Item labels hook return type
export interface UseItemLabelsReturn {
  /** Labels assigned to the item */
  labels: Label[];
  /** Whether labels are loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Assign a label to the item */
  assignLabel: (labelId: string) => Promise<void>;
  /** Unassign a label from the item */
  unassignLabel: (labelId: string) => Promise<void>;
  /** Toggle a label assignment */
  toggleLabel: (labelId: string) => Promise<void>;
  /** Check if a label is assigned */
  hasLabel: (labelId: string) => boolean;
  /** Refetch labels */
  refetch: () => void;
  /** Check if assigning is in progress */
  isAssigning: boolean;
  /** Check if unassigning is in progress */
  isUnassigning: boolean;
}

/**
 * useItemLabels hook
 *
 * Manages label assignments for a specific item.
 *
 * @example
 * ```tsx
 * function ConversationLabels({ conversationId }: { conversationId: string }) {
 *   const {
 *     labels,
 *     assignLabel,
 *     unassignLabel,
 *     hasLabel,
 *   } = useItemLabels({
 *     itemType: 'conversations',
 *     itemId: conversationId,
 *   });
 *
 *   return (
 *     <div>
 *       {labels.map((label) => (
 *         <LabelBadge
 *           key={label.id}
 *           label={label}
 *           onRemove={() => unassignLabel(label.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useItemLabels(options: UseItemLabelsOptions): UseItemLabelsReturn {
  const { itemType, itemId, realtime = true, queryOptions } = options;

  const queryClient = useQueryClient();
  const queryKey = labelKeys.assignments(itemType, itemId);

  // Fetch item labels
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchItemLabels(itemType, itemId),
    staleTime: 30 * 1000,
    enabled: Boolean(itemType && itemId),
    ...queryOptions,
  });

  // Assign label mutation
  const assignMutation = useMutation({
    mutationFn: (labelId: string) => assignLabel(itemType, itemId, labelId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Unassign label mutation
  const unassignMutation = useMutation({
    mutationFn: (labelId: string) => unassignLabel(itemType, itemId, labelId),
    onMutate: async (labelId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<Label[]>(queryKey);

      queryClient.setQueryData<Label[]>(queryKey, (old) => {
        if (!old) return old;
        return old.filter((label) => label.id !== labelId);
      });

      return { previousData };
    },
    onError: (_err, _labelId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const labels = useMemo(() => data ?? [], [data]);

  const hasLabel = useCallback(
    (labelId: string) => labels.some((label) => label.id === labelId),
    [labels],
  );

  const toggleLabel = useCallback(
    async (labelId: string) => {
      if (hasLabel(labelId)) {
        await unassignMutation.mutateAsync(labelId);
      } else {
        await assignMutation.mutateAsync(labelId);
      }
    },
    [hasLabel, assignMutation, unassignMutation],
  );

  return {
    labels,
    isLoading,
    error: error as Error | null,
    assignLabel: async (labelId: string) => {
      await assignMutation.mutateAsync(labelId);
    },
    unassignLabel: async (labelId: string) => {
      await unassignMutation.mutateAsync(labelId);
    },
    toggleLabel,
    hasLabel,
    refetch: () => {
      refetch();
    },
    isAssigning: assignMutation.isPending,
    isUnassigning: unassignMutation.isPending,
  };
}

/**
 * useLabel hook
 *
 * Fetches a single label by ID.
 */
export function useLabel(
  id: string,
  options?: Partial<UseQueryOptions<Label>>,
): {
  label: Label | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: labelKeys.detail(id),
    queryFn: () => fetchLabel(id),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
    ...options,
  });

  return {
    label: data,
    isLoading,
    error: error as Error | null,
  };
}

export default useLabels;
