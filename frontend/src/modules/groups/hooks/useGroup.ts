import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Group } from "@/modules/groups/types";
import { groupsApi } from "@/shared/services/api/groups";
import { groupKeys } from "./useGroups";

/**
 * Hook for fetching a single group by ID
 */
export const useGroup = (id: number) => {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: () => groupsApi.getGroup(id),
    enabled: !!id && id > 0,
  });
};

/**
 * Hook for fetching group with all related data
 */
export const useGroupWithDetails = (id: number) => {
  const groupQuery = useGroup(id);
  const permissionsQuery = useQuery({
    queryKey: groupKeys.permissions(id),
    queryFn: () => groupsApi.getGroupPermissions(id),
    enabled: !!id && id > 0,
  });

  return {
    group: groupQuery.data,
    permissions: permissionsQuery.data,
    isLoading: groupQuery.isLoading || permissionsQuery.isLoading,
    isError: groupQuery.isError || permissionsQuery.isError,
    error: groupQuery.error || permissionsQuery.error,
    refetch: () => {
      groupQuery.refetch();
      permissionsQuery.refetch();
    },
  };
};

/**
 * Hook for optimistic group updates
 */
export const useOptimisticGroupUpdate = () => {
  const queryClient = useQueryClient();

  return {
    /**
     * Optimistically update a group in the cache
     */
    updateGroupOptimistically: (id: number, updates: Partial<Group>) => {
      queryClient.setQueryData(
        groupKeys.detail(id),
        (old: Group | undefined) => (old ? { ...old, ...updates } : old)
      );
    },

    /**
     * Revert optimistic update by re-fetching from server
     */
    revertGroupUpdate: (id: number) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(id) });
    },
  };
};

/**
 * Hook for prefetching a group (useful for hover states)
 */
export const usePrefetchGroup = () => {
  const queryClient = useQueryClient();

  return {
    prefetchGroup: (id: number) => {
      if (id > 0) {
        queryClient.prefetchQuery({
          queryKey: groupKeys.detail(id),
          queryFn: () => groupsApi.getGroup(id),
          staleTime: 30 * 1000, // 30 seconds
        });
      }
    },
  };
};
