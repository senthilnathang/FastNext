// Groups API Service
import type {
  AddGroupMembersRequest,
  AssignGroupPermissionsRequest,
  CreateGroupRequest,
  Group,
  GroupListParams,
  GroupListResponse,
  GroupMember,
  GroupMemberListParams,
  GroupMemberListResponse,
  GroupPermission,
  UpdateGroupMemberRequest,
  UpdateGroupRequest,
} from "@/modules/groups/types";
import { apiClient } from "./client";

const GROUPS_ENDPOINT = "/api/v1/groups";

/**
 * Groups API client
 */
export const groupsApi = {
  /**
   * Get list of groups with pagination and filters
   */
  getGroups: async (params?: GroupListParams): Promise<GroupListResponse> => {
    const response = await apiClient.get(GROUPS_ENDPOINT, { params });
    return response.data;
  },

  /**
   * Get a single group by ID
   */
  getGroup: async (id: number): Promise<Group> => {
    const response = await apiClient.get(`${GROUPS_ENDPOINT}/${id}`);
    return response.data;
  },

  /**
   * Create a new group
   */
  createGroup: async (data: CreateGroupRequest): Promise<Group> => {
    const response = await apiClient.post(GROUPS_ENDPOINT, data);
    return response.data;
  },

  /**
   * Update an existing group
   */
  updateGroup: async (id: number, data: UpdateGroupRequest): Promise<Group> => {
    const response = await apiClient.put(`${GROUPS_ENDPOINT}/${id}`, data);
    return response.data;
  },

  /**
   * Delete a group
   */
  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`${GROUPS_ENDPOINT}/${id}`);
  },

  /**
   * Toggle group active status
   */
  toggleGroupStatus: async (id: number): Promise<Group> => {
    const response = await apiClient.patch(
      `${GROUPS_ENDPOINT}/${id}/toggle-status`
    );
    return response.data;
  },

  /**
   * Get group hierarchy (tree structure)
   */
  getGroupHierarchy: async (): Promise<Group[]> => {
    const response = await apiClient.get(`${GROUPS_ENDPOINT}/hierarchy`);
    return response.data;
  },

  // ============ Member Management ============

  /**
   * Get members of a group
   */
  getGroupMembers: async (
    groupId: number,
    params?: GroupMemberListParams
  ): Promise<GroupMemberListResponse> => {
    const response = await apiClient.get(
      `${GROUPS_ENDPOINT}/${groupId}/members`,
      { params }
    );
    return response.data;
  },

  /**
   * Add members to a group
   */
  addGroupMembers: async (
    groupId: number,
    data: AddGroupMembersRequest
  ): Promise<GroupMember[]> => {
    const response = await apiClient.post(
      `${GROUPS_ENDPOINT}/${groupId}/members`,
      data
    );
    return response.data;
  },

  /**
   * Remove members from a group
   */
  removeGroupMembers: async (
    groupId: number,
    userIds: number[]
  ): Promise<void> => {
    await apiClient.delete(`${GROUPS_ENDPOINT}/${groupId}/members`, {
      data: { user_ids: userIds },
    });
  },

  /**
   * Update a group member (change role, status)
   */
  updateGroupMember: async (
    groupId: number,
    userId: number,
    data: UpdateGroupMemberRequest
  ): Promise<GroupMember> => {
    const response = await apiClient.patch(
      `${GROUPS_ENDPOINT}/${groupId}/members/${userId}`,
      data
    );
    return response.data;
  },

  // ============ Permission Management ============

  /**
   * Get permissions assigned to a group
   */
  getGroupPermissions: async (groupId: number): Promise<GroupPermission[]> => {
    const response = await apiClient.get(
      `${GROUPS_ENDPOINT}/${groupId}/permissions`
    );
    return response.data;
  },

  /**
   * Assign permissions to a group
   */
  assignGroupPermissions: async (
    groupId: number,
    data: AssignGroupPermissionsRequest
  ): Promise<Group> => {
    const response = await apiClient.post(
      `${GROUPS_ENDPOINT}/${groupId}/permissions`,
      data
    );
    return response.data;
  },

  /**
   * Remove permissions from a group
   */
  removeGroupPermissions: async (
    groupId: number,
    permissionIds: number[]
  ): Promise<Group> => {
    const response = await apiClient.delete(
      `${GROUPS_ENDPOINT}/${groupId}/permissions`,
      {
        data: { permission_ids: permissionIds },
      }
    );
    return response.data;
  },
};
