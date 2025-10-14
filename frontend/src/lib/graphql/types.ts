/**
 * GraphQL TypeScript Types
 * Manual type definitions for GraphQL operations
 * These will be replaced by generated types once codegen is set up
 */

// Scalar types
export type DateTime = string;
export type JSON = Record<string, unknown>;
export type Upload = File;

// Enum types
export enum ActivityAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  SHARE = 'share',
  PERMISSION_CHANGE = 'permission_change',
  SYSTEM_EVENT = 'system_event',
  SECURITY_EVENT = 'security_event',
  API_CALL = 'api_call',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  WORKFLOW_EXECUTE = 'workflow_execute',
  VALIDATION_FAILED = 'validation_failed',
}

// Base entity types
export interface User {
  id: number;
  email: string;
  username: string;
  fullName?: string | null;
  isActive: boolean;
  isVerified: boolean;
  isSuperuser: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  lastLoginAt?: DateTime | null;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  userId: number;
  isPublic: boolean;
  settings: JSON;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  owner?: User | null;
}

export interface Page {
  id: number;
  title: string;
  path: string;
  content?: JSON | null;
  projectId: number;
  isPublic: boolean;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  project?: Project | null;
}

export interface Component {
  id: number;
  name: string;
  componentType: string;
  schema?: JSON | null;
  projectId: number;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  project?: Project | null;
}

export interface ActivityLog {
  id: number;
  userId?: number | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: JSON | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: DateTime;
  user?: User | null;
}

export interface AuditTrail {
  id: number;
  userId?: number | null;
  resourceType: string;
  resourceId: string;
  action: string;
  oldValues?: JSON | null;
  newValues?: JSON | null;
  createdAt: DateTime;
  user?: User | null;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  permissions?: JSON | null;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  project?: Project | null;
  user?: User | null;
}

export interface Asset {
  id: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize?: number | null;
  contentType?: string | null;
  projectId?: number | null;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
  project?: Project | null;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  permissions?: string[] | null;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
}

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  resource?: string | null;
  action?: string | null;
  createdAt: DateTime;
  updatedAt?: DateTime | null;
}

// Pagination types
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface Connection<T> {
  edges: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

export type UserConnection = Connection<User>;
export type ProjectConnection = Connection<Project>;
export type PageConnection = Connection<Page>;

// Input types for mutations
export interface UserInput {
  email: string;
  username: string;
  fullName?: string | null;
  password: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
}

export interface UserUpdateInput {
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isActive?: boolean | null;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  isPublic?: boolean;
  settings?: JSON | null;
}

export interface ProjectUpdateInput {
  name?: string | null;
  description?: string | null;
  isPublic?: boolean | null;
  settings?: JSON | null;
}

export interface PageInput {
  title: string;
  path: string;
  content?: JSON | null;
  projectId: number;
  isPublic?: boolean;
}

export interface PageUpdateInput {
  title?: string | null;
  path?: string | null;
  content?: JSON | null;
  isPublic?: boolean | null;
}

export interface ComponentInput {
  name: string;
  componentType: string;
  schema?: JSON | null;
  projectId: number;
}

export interface ComponentUpdateInput {
  name?: string | null;
  componentType?: string | null;
  schema?: JSON | null;
}

export interface ProjectMemberInput {
  projectId: number;
  userId: number;
  role: string;
  permissions?: JSON | null;
}

// Response types for mutations
export interface MutationResponse {
  success: boolean;
  message: string;
  errors?: string[] | null;
}

export interface UserResponse extends MutationResponse {
  user?: User | null;
}

export interface ProjectResponse extends MutationResponse {
  project?: Project | null;
}

export interface PageResponse extends MutationResponse {
  page?: Page | null;
}

export interface ComponentResponse extends MutationResponse {
  component?: Component | null;
}

// Query variables types
export interface PaginationVariables {
  first?: number | null;
  after?: string | null;
}

export interface UsersQueryVariables extends PaginationVariables {
  search?: string | null;
}

export interface ProjectsQueryVariables extends PaginationVariables {
  userId?: number | null;
  isPublic?: boolean | null;
}

export interface PagesQueryVariables extends PaginationVariables {
  projectId?: number | null;
}

export interface ComponentsQueryVariables {
  projectId?: number | null;
  componentType?: string | null;
}

export interface ActivityLogsQueryVariables {
  userId?: number | null;
  action?: string | null;
  limit?: number | null;
}

export interface AuditTrailsQueryVariables {
  resourceType?: string | null;
  resourceId?: string | null;
  limit?: number | null;
}

export interface AssetsQueryVariables {
  projectId?: number | null;
}

// GraphQL operation result types
export interface QueryResult<T> {
  data?: T | null;
  loading: boolean;
  error?: Error | null;
  refetch?: () => Promise<any>;
  fetchMore?: (options: any) => Promise<any>;
}

export interface MutationResult<T> {
  data?: T | null;
  loading: boolean;
  error?: Error | null;
}

// Common error types
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

export interface GraphQLFormattedError extends GraphQLError {
  source?: any;
  positions?: number[];
  originalError?: Error;
}

// Context types
export interface GraphQLContext {
  user?: User | null;
  permissions?: string[];
  roles?: string[];
}
