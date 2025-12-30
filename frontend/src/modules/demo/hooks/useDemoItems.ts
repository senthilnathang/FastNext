/**
 * Demo Items Hook
 * React Query hooks for demo item CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demoApi } from "@/lib/api/demo";
import type {
  DemoItem,
  DemoItemCreate,
  DemoItemUpdate,
  DemoItemListParams,
  PaginatedDemoItems,
} from "@/lib/api/demo";

// Query keys
export const demoItemKeys = {
  all: ["demo-items"] as const,
  lists: () => [...demoItemKeys.all, "list"] as const,
  list: (params?: DemoItemListParams) => [...demoItemKeys.lists(), params] as const,
  details: () => [...demoItemKeys.all, "detail"] as const,
  detail: (id: number) => [...demoItemKeys.details(), id] as const,
};

/**
 * Hook to fetch paginated demo items
 */
export function useDemoItems(params?: DemoItemListParams) {
  return useQuery<PaginatedDemoItems>({
    queryKey: demoItemKeys.list(params),
    queryFn: () => demoApi.list(params),
  });
}

/**
 * Hook to fetch a single demo item by ID
 */
export function useDemoItem(id: number, options?: { enabled?: boolean }) {
  return useQuery<DemoItem>({
    queryKey: demoItemKeys.detail(id),
    queryFn: () => demoApi.get(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new demo item
 */
export function useCreateDemoItem() {
  const queryClient = useQueryClient();

  return useMutation<DemoItem, Error, DemoItemCreate>({
    mutationFn: (data) => demoApi.create(data),
    onSuccess: () => {
      // Invalidate all list queries to refetch
      queryClient.invalidateQueries({ queryKey: demoItemKeys.lists() });
    },
  });
}

/**
 * Hook to update a demo item
 */
export function useUpdateDemoItem() {
  const queryClient = useQueryClient();

  return useMutation<DemoItem, Error, { id: number; data: DemoItemUpdate }>({
    mutationFn: ({ id, data }) => demoApi.update(id, data),
    onSuccess: (data) => {
      // Update the specific item in cache
      queryClient.setQueryData(demoItemKeys.detail(data.id), data);
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: demoItemKeys.lists() });
    },
  });
}

/**
 * Hook to delete a demo item
 */
export function useDeleteDemoItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => demoApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: demoItemKeys.detail(id) });
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: demoItemKeys.lists() });
    },
  });
}

/**
 * Hook to toggle demo item active status
 */
export function useToggleDemoItemActive() {
  const queryClient = useQueryClient();

  return useMutation<DemoItem, Error, { id: number; is_active: boolean }>({
    mutationFn: ({ id, is_active }) => demoApi.update(id, { is_active }),
    onSuccess: (data) => {
      queryClient.setQueryData(demoItemKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: demoItemKeys.lists() });
    },
  });
}
