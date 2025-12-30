/**
 * Groups API Client
 * Handles group CRUD operations and member management
 */

import { apiClient } from "./client";

// Types
export type GroupType = "team" | "department" | "project" | "custom";
export type GroupVisibility = "public" | "private" | "secret";
export type MemberRole = "owner" | "admin" | "moderator" | "member";

export interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  group_type: GroupType;
  visibility: GroupVisibility;
  avatar_url?: string | null;
  cover_url?: string | null;
  color?: string | null;
  icon?: string | null;
  owner_id: number;
  parent_group_id?: number | null;
  is_active: boolean;
  is_default: boolean;
  settings?: GroupSettings | null;
  metadata?: Record<string, unknown>;
  member_count?: number;
  created_at: string;
  updated_at?: string | null;
  owner?: GroupMember;
  members?: GroupMember[];
}

export interface GroupSettings {
  allow_member_posts?: boolean;
  require_approval?: boolean;
  allow_member_invites?: boolean;
  post_approval_required?: boolean;
  notifications_enabled?: boolean;
  max_members?: number | null;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: MemberRole;
  title?: string | null;
  is_active: boolean;
  notifications_enabled: boolean;
  joined_at: string;
  last_active_at?: string | null;
  invited_by_id?: number | null;
  user?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    avatar_url?: string | null;
    is_online?: boolean;
  };
}

export interface GroupListParams {
  group_type?: GroupType;
  visibility?: GroupVisibility;
  is_active?: boolean;
  search?: string;
  parent_group_id?: number | null;
  owner_id?: number;
  member_user_id?: number;
  skip?: number;
  limit?: number;
}

export interface CreateGroupData {
  name: string;
  slug?: string;
  description?: string;
  group_type?: GroupType;
  visibility?: GroupVisibility;
  avatar_url?: string;
  cover_url?: string;
  color?: string;
  icon?: string;
  parent_group_id?: number;
  settings?: Partial<GroupSettings>;
  metadata?: Record<string, unknown>;
  initial_member_ids?: number[];
}

export interface UpdateGroupData {
  name?: string;
  slug?: string;
  description?: string | null;
  group_type?: GroupType;
  visibility?: GroupVisibility;
  avatar_url?: string | null;
  cover_url?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
  parent_group_id?: number | null;
  settings?: Partial<GroupSettings>;
  metadata?: Record<string, unknown>;
}

export interface PaginatedGroups {
  items: Group[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginatedMembers {
  items: GroupMember[];
  total: number;
  skip: number;
  limit: number;
}

export interface GroupStats {
  total_members: number;
  active_members: number;
  posts_count: number;
  activity_score: number;
  by_role: { [key in MemberRole]?: number };
}

export interface AddMemberResult {
  success: boolean;
  member?: GroupMember;
  error?: string;
}

export interface RemoveMemberResult {
  success: boolean;
  error?: string;
}

export interface BulkMemberResult {
  success: number;
  failed: number;
  members?: GroupMember[];
  errors?: { user_id: number; error: string }[];
}

// API Functions
export const groupsApi = {
  /**
   * Get groups list
   */
  getGroups: (params?: GroupListParams): Promise<PaginatedGroups> =>
    apiClient.get("/api/v1/groups", params),

  /**
   * Get a single group by ID
   */
  getGroup: (id: number | string): Promise<Group> =>
    apiClient.get(`/api/v1/groups/${id}`),

  /**
   * Get group by slug
   */
  getGroupBySlug: (slug: string): Promise<Group> =>
    apiClient.get(`/api/v1/groups/slug/${slug}`),

  /**
   * Create a new group
   */
  createGroup: (data: CreateGroupData): Promise<Group> =>
    apiClient.post("/api/v1/groups", data),

  /**
   * Update a group
   */
  updateGroup: (id: number | string, data: UpdateGroupData): Promise<Group> =>
    apiClient.patch(`/api/v1/groups/${id}`, data),

  /**
   * Delete a group
   */
  deleteGroup: (id: number | string): Promise<void> =>
    apiClient.delete(`/api/v1/groups/${id}`),

  /**
   * Add a member to a group
   */
  addMember: (
    groupId: number | string,
    userId: number,
    options?: { role?: MemberRole; title?: string }
  ): Promise<AddMemberResult> =>
    apiClient.post(`/api/v1/groups/${groupId}/members`, {
      user_id: userId,
      ...options,
    }),

  /**
   * Remove a member from a group
   */
  removeMember: (
    groupId: number | string,
    userId: number
  ): Promise<RemoveMemberResult> =>
    apiClient.delete(`/api/v1/groups/${groupId}/members/${userId}`),

  /**
   * Get my groups (groups where user is a member)
   */
  getMyGroups: (params?: { role?: MemberRole; skip?: number; limit?: number }): Promise<Group[]> =>
    apiClient.get("/api/v1/groups/me", params),

  /**
   * Join a public group
   */
  join: (groupId: number | string): Promise<GroupMember> =>
    apiClient.post(`/api/v1/groups/${groupId}/join`),

  /**
   * Leave a group
   */
  leave: (groupId: number | string): Promise<void> =>
    apiClient.post(`/api/v1/groups/${groupId}/leave`),

  // Members
  members: {
    /**
     * List group members
     */
    list: (
      groupId: number | string,
      params?: { role?: MemberRole; is_active?: boolean; search?: string; skip?: number; limit?: number }
    ): Promise<PaginatedMembers> =>
      apiClient.get(`/api/v1/groups/${groupId}/members`, params),

    /**
     * Get a member by user ID
     */
    get: (groupId: number | string, userId: number): Promise<GroupMember> =>
      apiClient.get(`/api/v1/groups/${groupId}/members/${userId}`),

    /**
     * Update a member
     */
    update: (
      groupId: number | string,
      userId: number,
      data: { role?: MemberRole; title?: string | null; is_active?: boolean; notifications_enabled?: boolean }
    ): Promise<GroupMember> =>
      apiClient.patch(`/api/v1/groups/${groupId}/members/${userId}`, data),

    /**
     * Bulk add members
     */
    bulkAdd: (
      groupId: number | string,
      userIds: number[],
      options?: { role?: MemberRole }
    ): Promise<BulkMemberResult> =>
      apiClient.post(`/api/v1/groups/${groupId}/members/bulk`, {
        user_ids: userIds,
        ...options,
      }),

    /**
     * Bulk remove members
     */
    bulkRemove: (
      groupId: number | string,
      userIds: number[]
    ): Promise<BulkMemberResult> =>
      apiClient.post(`/api/v1/groups/${groupId}/members/bulk/remove`, {
        user_ids: userIds,
      }),

    /**
     * Transfer ownership
     */
    transferOwnership: (groupId: number | string, newOwnerId: number): Promise<Group> =>
      apiClient.post(`/api/v1/groups/${groupId}/transfer-ownership`, {
        new_owner_id: newOwnerId,
      }),
  },

  // Invitations
  invitations: {
    /**
     * List pending invitations
     */
    list: (groupId: number | string): Promise<GroupInvitation[]> =>
      apiClient.get(`/api/v1/groups/${groupId}/invitations`),

    /**
     * Send invitation
     */
    send: (
      groupId: number | string,
      data: { user_id?: number; email?: string; role?: MemberRole; message?: string }
    ): Promise<GroupInvitation> =>
      apiClient.post(`/api/v1/groups/${groupId}/invitations`, data),

    /**
     * Cancel invitation
     */
    cancel: (groupId: number | string, invitationId: number): Promise<void> =>
      apiClient.delete(`/api/v1/groups/${groupId}/invitations/${invitationId}`),

    /**
     * Accept invitation
     */
    accept: (groupId: number | string, invitationId: number): Promise<GroupMember> =>
      apiClient.post(`/api/v1/groups/${groupId}/invitations/${invitationId}/accept`),

    /**
     * Decline invitation
     */
    decline: (groupId: number | string, invitationId: number): Promise<void> =>
      apiClient.post(`/api/v1/groups/${groupId}/invitations/${invitationId}/decline`),

    /**
     * Get my pending invitations
     */
    getMine: (): Promise<GroupInvitation[]> =>
      apiClient.get("/api/v1/groups/invitations/me"),
  },

  // Join requests (for private groups)
  requests: {
    /**
     * List join requests
     */
    list: (groupId: number | string): Promise<GroupJoinRequest[]> =>
      apiClient.get(`/api/v1/groups/${groupId}/requests`),

    /**
     * Request to join
     */
    create: (groupId: number | string, message?: string): Promise<GroupJoinRequest> =>
      apiClient.post(`/api/v1/groups/${groupId}/requests`, { message }),

    /**
     * Approve request
     */
    approve: (groupId: number | string, requestId: number): Promise<GroupMember> =>
      apiClient.post(`/api/v1/groups/${groupId}/requests/${requestId}/approve`),

    /**
     * Reject request
     */
    reject: (groupId: number | string, requestId: number, reason?: string): Promise<void> =>
      apiClient.post(`/api/v1/groups/${groupId}/requests/${requestId}/reject`, { reason }),

    /**
     * Cancel my request
     */
    cancel: (groupId: number | string): Promise<void> =>
      apiClient.delete(`/api/v1/groups/${groupId}/requests/me`),
  },

  // Stats
  stats: {
    /**
     * Get group statistics
     */
    get: (groupId: number | string): Promise<GroupStats> =>
      apiClient.get(`/api/v1/groups/${groupId}/stats`),

    /**
     * Get activity feed
     */
    getActivity: (
      groupId: number | string,
      params?: { skip?: number; limit?: number }
    ): Promise<GroupActivity[]> =>
      apiClient.get(`/api/v1/groups/${groupId}/activity`, params),
  },

  // Settings
  settings: {
    /**
     * Get group settings
     */
    get: (groupId: number | string): Promise<GroupSettings> =>
      apiClient.get(`/api/v1/groups/${groupId}/settings`),

    /**
     * Update group settings
     */
    update: (groupId: number | string, data: Partial<GroupSettings>): Promise<GroupSettings> =>
      apiClient.patch(`/api/v1/groups/${groupId}/settings`, data),
  },

  // Hierarchy
  hierarchy: {
    /**
     * Get group tree (for groups with parent-child relationships)
     */
    getTree: (rootGroupId?: number): Promise<Group[]> =>
      apiClient.get("/api/v1/groups/tree", rootGroupId ? { root_id: rootGroupId } : undefined),

    /**
     * Get subgroups
     */
    getSubgroups: (groupId: number | string): Promise<Group[]> =>
      apiClient.get(`/api/v1/groups/${groupId}/subgroups`),

    /**
     * Move group to new parent
     */
    move: (groupId: number | string, newParentId: number | null): Promise<Group> =>
      apiClient.post(`/api/v1/groups/${groupId}/move`, { parent_group_id: newParentId }),
  },
};

// Additional types
export interface GroupInvitation {
  id: number;
  group_id: number;
  user_id?: number | null;
  email?: string | null;
  role: MemberRole;
  message?: string | null;
  invited_by_id: number;
  status: "pending" | "accepted" | "declined" | "expired";
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
  group?: Group;
  invited_by?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface GroupJoinRequest {
  id: number;
  group_id: number;
  user_id: number;
  message?: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  reviewed_by_id?: number | null;
  created_at: string;
  reviewed_at?: string | null;
  user?: {
    id: number;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface GroupActivity {
  id: number;
  group_id: number;
  user_id: number;
  action: string;
  action_type: "member_joined" | "member_left" | "member_promoted" | "settings_changed" | "post_created" | "other";
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export default groupsApi;
