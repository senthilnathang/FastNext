import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGroupRequest,
  GroupListParams,
  UpdateGroupRequest,
} from "@/modules/groups/types";
import { groupsApi } from "@/shared/services/api/groups";

/**
 * Query keys for groups - follows TanStack Query best practices
 */
export const groupKeys = {
  all: ["groups"] as const,
  lists: () => [...groupKeys.all, "list"] as const,
  list: (params?: GroupListParams) => [...groupKeys.lists(), params] as const,
  details: () => [...groupKeys.all, "detail"] as const,
  detail: (id: number) => [...groupKeys.details(), id] as const,
  hierarchy: () => [...groupKeys.all, "hierarchy"] as const,
  permissions: (id: number) =>
    [...groupKeys.detail(id), "permissions"] as const,
};

/**
 * Hook for fetching paginated list of groups
 */
export const useGroups = (params?: GroupListParams) => {
  return useQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => groupsApi.getGroups(params),
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for fetching group hierarchy (tree structure)
 */
export const useGroupHierarchy = () => {
  return useQuery({
    queryKey: groupKeys.hierarchy(),
    queryFn: () => groupsApi.getGroupHierarchy(),
    staleTime: 5 * 60 * 1000, // 5 minutes - hierarchy doesn't change often
  });
};

/**
 * Hook for fetching group permissions
 */
export const useGroupPermissions = (groupId: number) => {
  return useQuery({
    queryKey: groupKeys.permissions(groupId),
    queryFn: () => groupsApi.getGroupPermissions(groupId),
    enabled: !!groupId && groupId > 0,
  });
};

/**
 * Hook for creating a new group
 */
export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupsApi.createGroup(data),
    onSuccess: () => {
      // Invalidate all group lists and hierarchy
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupKeys.hierarchy() });
    },
    onError: (error) => {
      console.error("Failed to create group:", error);
    },
  });
};

/**
 * Hook for updating a group
 */
export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGroupRequest }) =>
      groupsApi.updateGroup(id, data),
    onSuccess: (updatedGroup, { id }) => {
      // Update the group in cache
      queryClient.setQueryData(groupKeys.detail(id), updatedGroup);
      // Invalidate lists and hierarchy to reflect changes
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupKeys.hierarchy() });
    },
    onError: (error) => {
      console.error("Failed to update group:", error);
    },
  });
};

/**
 * Hook for deleting a group
 */
export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => groupsApi.deleteGroup(id),
    onSuccess: (_, id) => {
      // Remove group from cache
      queryClient.removeQueries({ queryKey: groupKeys.detail(id) });
      // Invalidate lists and hierarchy
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupKeys.hierarchy() });
    },
    onError: (error) => {
      console.error("Failed to delete group:", error);
    },
  });
};

/**
 * Hook for toggling group active status
 */
export const useToggleGroupStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => groupsApi.toggleGroupStatus(id),
    onSuccess: (updatedGroup, id) => {
      // Update the group in cache
      queryClient.setQueryData(groupKeys.detail(id), updatedGroup);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to toggle group status:", error);
    },
  });
};

/**
 * Hook for assigning permissions to a group
 */
export const useAssignGroupPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      permissionIds,
    }: {
      groupId: number;
      permissionIds: number[];
    }) =>
      groupsApi.assignGroupPermissions(groupId, {
        permission_ids: permissionIds,
      }),
    onSuccess: (updatedGroup, { groupId }) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updatedGroup);
      queryClient.invalidateQueries({ queryKey: groupKeys.permissions(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to assign group permissions:", error);
    },
  });
};

/**
 * Hook for removing permissions from a group
 */
export const useRemoveGroupPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      permissionIds,
    }: {
      groupId: number;
      permissionIds: number[];
    }) => groupsApi.removeGroupPermissions(groupId, permissionIds),
    onSuccess: (updatedGroup, { groupId }) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updatedGroup);
      queryClient.invalidateQueries({ queryKey: groupKeys.permissions(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to remove group permissions:", error);
    },
  });
};
