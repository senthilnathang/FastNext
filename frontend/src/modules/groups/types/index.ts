// Group Types and Interfaces

/**
 * Represents a group in the system
 */
export interface Group {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  parent?: Group;
  is_active: boolean;
  is_system_group?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  member_count?: number;
  permission_count?: number;
  children?: Group[];
  permissions?: GroupPermission[];
}

/**
 * Represents a member of a group
 */
export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  user?: GroupMemberUser;
  role?: GroupMemberRole;
  joined_at: string;
  added_by?: number;
  is_active: boolean;
}

/**
 * User information for group member display
 */
export interface GroupMemberUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
}

/**
 * Role within a group (optional group-specific roles)
 */
export type GroupMemberRole = "owner" | "admin" | "member" | "viewer";

/**
 * Permission assigned to a group
 */
export interface GroupPermission {
  id: number;
  name: string;
  description?: string;
  category: string;
  action: string;
  resource?: string;
}

/**
 * Request payload for creating a new group
 */
export interface CreateGroupRequest {
  name: string;
  description?: string;
  parent_id?: number;
  is_active?: boolean;
  permission_ids?: number[];
}

/**
 * Request payload for updating a group
 */
export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  parent_id?: number;
  is_active?: boolean;
  permission_ids?: number[];
}

/**
 * Parameters for listing groups
 */
export interface GroupListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  parent_id?: number;
  include_children?: boolean;
  include_permissions?: boolean;
}

/**
 * Response structure for paginated group list
 */
export interface GroupListResponse {
  items: Group[];
  total: number;
  page: number;
  pages: number;
  skip?: number;
  limit?: number;
}

/**
 * Parameters for listing group members
 */
export interface GroupMemberListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  role?: GroupMemberRole;
}

/**
 * Response structure for paginated group member list
 */
export interface GroupMemberListResponse {
  items: GroupMember[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Request payload for adding members to a group
 */
export interface AddGroupMembersRequest {
  user_ids: number[];
  role?: GroupMemberRole;
}

/**
 * Request payload for removing members from a group
 */
export interface RemoveGroupMembersRequest {
  user_ids: number[];
}

/**
 * Request payload for updating a group member
 */
export interface UpdateGroupMemberRequest {
  role?: GroupMemberRole;
  is_active?: boolean;
}

/**
 * Request payload for assigning permissions to a group
 */
export interface AssignGroupPermissionsRequest {
  permission_ids: number[];
}

/**
 * Group hierarchy node for tree display
 */
export interface GroupHierarchyNode extends Group {
  level: number;
  hasChildren: boolean;
  isExpanded?: boolean;
}

/**
 * Filter options for group list
 */
export interface GroupFilterOptions {
  status: "all" | "active" | "inactive";
  parentGroup: number | null;
  hasMembers: boolean | null;
}
