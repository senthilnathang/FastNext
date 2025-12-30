import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddGroupMembersRequest,
  GroupMemberListParams,
  GroupMemberRole,
  UpdateGroupMemberRequest,
} from "@/modules/groups/types";
import { groupsApi } from "@/shared/services/api/groups";
import { groupKeys } from "./useGroups";

/**
 * Query keys for group members
 */
export const groupMemberKeys = {
  all: (groupId: number) => [...groupKeys.detail(groupId), "members"] as const,
  list: (groupId: number, params?: GroupMemberListParams) =>
    [...groupMemberKeys.all(groupId), "list", params] as const,
  detail: (groupId: number, userId: number) =>
    [...groupMemberKeys.all(groupId), userId] as const,
};

/**
 * Hook for fetching members of a group
 */
export const useGroupMembers = (
  groupId: number,
  params?: GroupMemberListParams
) => {
  return useQuery({
    queryKey: groupMemberKeys.list(groupId, params),
    queryFn: () => groupsApi.getGroupMembers(groupId, params),
    enabled: !!groupId && groupId > 0,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for adding members to a group
 */
export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: number;
      data: AddGroupMembersRequest;
    }) => groupsApi.addGroupMembers(groupId, data),
    onSuccess: (_, { groupId }) => {
      // Invalidate member list and group details (member count may change)
      queryClient.invalidateQueries({
        queryKey: groupMemberKeys.all(groupId),
      });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to add group members:", error);
    },
  });
};

/**
 * Hook for removing members from a group
 */
export const useRemoveGroupMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userIds,
    }: {
      groupId: number;
      userIds: number[];
    }) => groupsApi.removeGroupMembers(groupId, userIds),
    onSuccess: (_, { groupId }) => {
      // Invalidate member list and group details
      queryClient.invalidateQueries({
        queryKey: groupMemberKeys.all(groupId),
      });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to remove group members:", error);
    },
  });
};

/**
 * Hook for updating a group member (role, status)
 */
export const useUpdateGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      data,
    }: {
      groupId: number;
      userId: number;
      data: UpdateGroupMemberRequest;
    }) => groupsApi.updateGroupMember(groupId, userId, data),
    onSuccess: (updatedMember, { groupId, userId }) => {
      // Update the member in cache
      queryClient.setQueryData(
        groupMemberKeys.detail(groupId, userId),
        updatedMember
      );
      // Invalidate member list to reflect changes
      queryClient.invalidateQueries({
        queryKey: groupMemberKeys.all(groupId),
      });
    },
    onError: (error) => {
      console.error("Failed to update group member:", error);
    },
  });
};

/**
 * Hook for batch operations on group members
 */
export const useGroupMemberBatchOperations = () => {
  const addMembersMutation = useAddGroupMembers();
  const removeMembersMutation = useRemoveGroupMembers();
  const updateMemberMutation = useUpdateGroupMember();

  return {
    /**
     * Add multiple members with the same role
     */
    addMembersWithRole: async (
      groupId: number,
      userIds: number[],
      role: GroupMemberRole = "member"
    ) => {
      return addMembersMutation.mutateAsync({
        groupId,
        data: { user_ids: userIds, role },
      });
    },

    /**
     * Remove multiple members
     */
    removeMembers: async (groupId: number, userIds: number[]) => {
      return removeMembersMutation.mutateAsync({ groupId, userIds });
    },

    /**
     * Update role for multiple members
     */
    updateMembersRole: async (
      groupId: number,
      userIds: number[],
      role: GroupMemberRole
    ) => {
      const promises = userIds.map((userId) =>
        updateMemberMutation.mutateAsync({
          groupId,
          userId,
          data: { role },
        })
      );
      return Promise.all(promises);
    },

    isLoading:
      addMembersMutation.isPending ||
      removeMembersMutation.isPending ||
      updateMemberMutation.isPending,
  };
};
