/**
 * GraphQL Queries
 * Centralized GraphQL queries for the application
 */
import { gql } from '@apollo/client';

// Fragment definitions for reusable type definitions
export const USER_FRAGMENT = gql`
  fragment UserFragment on UserType {
    id
    email
    username
    fullName
    isActive
    isVerified
    isSuperuser
    avatarUrl
    bio
    location
    website
    createdAt
    updatedAt
    lastLoginAt
  }
`;

export const PROJECT_FRAGMENT = gql`
  fragment ProjectFragment on ProjectType {
    id
    name
    description
    userId
    isPublic
    settings
    createdAt
    updatedAt
    owner {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const PAGE_FRAGMENT = gql`
  fragment PageFragment on PageType {
    id
    title
    path
    content
    projectId
    isPublic
    createdAt
    updatedAt
    project {
      ...ProjectFragment
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const COMPONENT_FRAGMENT = gql`
  fragment ComponentFragment on ComponentType {
    id
    name
    componentType
    schema
    projectId
    createdAt
    updatedAt
    project {
      ...ProjectFragment
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const ACTIVITY_LOG_FRAGMENT = gql`
  fragment ActivityLogFragment on ActivityLogType {
    id
    userId
    action
    resourceType
    resourceId
    details
    ipAddress
    userAgent
    createdAt
    user {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const PROJECT_MEMBER_FRAGMENT = gql`
  fragment ProjectMemberFragment on ProjectMemberType {
    id
    projectId
    userId
    role
    permissions
    createdAt
    updatedAt
    project {
      ...ProjectFragment
    }
    user {
      ...UserFragment
    }
  }
  ${PROJECT_FRAGMENT}
  ${USER_FRAGMENT}
`;

// Query definitions

// User queries
export const GET_ME = gql`
  query GetMe {
    me {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USERS = gql`
  query GetUsers($first: Int, $after: String, $search: String) {
    users(first: $first, after: $after, search: $search) {
      edges {
        ...UserFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USER = gql`
  query GetUser($id: Int!) {
    user(id: $id) {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

// Project queries
export const GET_PROJECTS = gql`
  query GetProjects($first: Int, $after: String, $userId: Int, $isPublic: Boolean) {
    projects(first: $first, after: $after, userId: $userId, isPublic: $isPublic) {
      edges {
        ...ProjectFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const GET_PROJECT = gql`
  query GetProject($id: Int!) {
    project(id: $id) {
      ...ProjectFragment
    }
  }
  ${PROJECT_FRAGMENT}
`;

// Page queries
export const GET_PAGES = gql`
  query GetPages($first: Int, $after: String, $projectId: Int) {
    pages(first: $first, after: $after, projectId: $projectId) {
      edges {
        ...PageFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${PAGE_FRAGMENT}
`;

export const GET_PAGE = gql`
  query GetPage($id: Int!) {
    page(id: $id) {
      ...PageFragment
    }
  }
  ${PAGE_FRAGMENT}
`;

// Component queries
export const GET_COMPONENTS = gql`
  query GetComponents($projectId: Int, $componentType: String) {
    components(projectId: $projectId, componentType: $componentType) {
      ...ComponentFragment
    }
  }
  ${COMPONENT_FRAGMENT}
`;

export const GET_COMPONENT = gql`
  query GetComponent($id: Int!) {
    component(id: $id) {
      ...ComponentFragment
    }
  }
  ${COMPONENT_FRAGMENT}
`;

// Activity log queries
export const GET_ACTIVITY_LOGS = gql`
  query GetActivityLogs($userId: Int, $action: String, $limit: Int) {
    activityLogs(userId: $userId, action: $action, limit: $limit) {
      ...ActivityLogFragment
    }
  }
  ${ACTIVITY_LOG_FRAGMENT}
`;

// Project member queries
export const GET_PROJECT_MEMBERS = gql`
  query GetProjectMembers($projectId: Int!) {
    projectMembers(projectId: $projectId) {
      ...ProjectMemberFragment
    }
  }
  ${PROJECT_MEMBER_FRAGMENT}
`;

// Role and permission queries
export const GET_ROLES = gql`
  query GetRoles {
    roles {
      id
      name
      description
      permissions
      createdAt
      updatedAt
    }
  }
`;

export const GET_PERMISSIONS = gql`
  query GetPermissions {
    permissions {
      id
      name
      description
      resource
      action
      createdAt
      updatedAt
    }
  }
`;

// Audit trail queries
export const GET_AUDIT_TRAILS = gql`
  query GetAuditTrails($resourceType: String, $resourceId: String, $limit: Int) {
    auditTrails(resourceType: $resourceType, resourceId: $resourceId, limit: $limit) {
      id
      userId
      resourceType
      resourceId
      action
      oldValues
      newValues
      createdAt
      user {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

// Asset queries
export const GET_ASSETS = gql`
  query GetAssets($projectId: Int) {
    assets(projectId: $projectId) {
      id
      filename
      originalFilename
      filePath
      fileSize
      contentType
      projectId
      createdAt
      updatedAt
      project {
        ...ProjectFragment
      }
    }
  }
  ${PROJECT_FRAGMENT}
`;