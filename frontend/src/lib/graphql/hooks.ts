/**
 * GraphQL React Hooks
 * Custom hooks for GraphQL operations with proper TypeScript typing
 */
"use client";

import { type ApolloError, useMutation, useQuery } from "@apollo/client";
import { useCallback, useState } from "react";
import {
  CREATE_PROJECT,
  CREATE_USER,
  DELETE_PROJECT,
  DELETE_USER,
  UPDATE_PROJECT,
  UPDATE_USER,
} from "./mutations";
import {
  GET_ACTIVITY_LOGS,
  GET_ASSETS,
  GET_AUDIT_TRAILS,
  GET_COMPONENT,
  GET_COMPONENTS,
  GET_ME,
  GET_PAGE,
  GET_PAGES,
  GET_PERMISSIONS,
  GET_PROJECT,
  GET_PROJECT_MEMBERS,
  GET_PROJECTS,
  GET_ROLES,
  GET_USER,
  GET_USERS,
} from "./queries";

// Types for GraphQL responses
interface User {
  id: number;
  email: string;
  username: string;
  fullName?: string;
  isActive: boolean;
  isVerified: boolean;
  isSuperuser: boolean;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  userId: number;
  isPublic: boolean;
  settings: any;
  createdAt: string;
  updatedAt?: string;
  owner?: User;
}

interface Page {
  id: number;
  title: string;
  path: string;
  content?: any;
  projectId: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
  project?: Project;
}

interface Component {
  id: number;
  name: string;
  componentType: string;
  schema?: any;
  projectId: number;
  createdAt: string;
  updatedAt?: string;
  project?: Project;
}

interface MutationResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

interface UserResponse extends MutationResponse {
  user?: User;
}

interface ProjectResponse extends MutationResponse {
  project?: Project;
}

// Query variables types
interface PaginationVariables {
  first?: number;
  after?: string;
}

interface UsersVariables extends PaginationVariables {
  search?: string;
}

interface ProjectsVariables extends PaginationVariables {
  userId?: number;
  isPublic?: boolean;
}

interface PagesVariables extends PaginationVariables {
  projectId?: number;
}

// User hooks
export const useMe = () => {
  return useQuery<{ me: User | null }>(GET_ME, {
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const useUsers = (variables?: UsersVariables) => {
  return useQuery<{
    users: {
      edges: User[];
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
      };
      totalCount: number;
    };
  }>(GET_USERS, {
    variables,
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const useUser = (id: number) => {
  return useQuery<{ user: User | null }>(GET_USER, {
    variables: { id },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Project hooks
export const useProjects = (variables?: ProjectsVariables) => {
  return useQuery<{
    projects: {
      edges: Project[];
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
      };
      totalCount: number;
    };
  }>(GET_PROJECTS, {
    variables,
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const useProject = (id: number) => {
  return useQuery<{ project: Project | null }>(GET_PROJECT, {
    variables: { id },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Page hooks
export const usePages = (variables?: PagesVariables) => {
  return useQuery<{
    pages: {
      edges: Page[];
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string;
        endCursor?: string;
      };
      totalCount: number;
    };
  }>(GET_PAGES, {
    variables,
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const usePage = (id: number) => {
  return useQuery<{ page: Page | null }>(GET_PAGE, {
    variables: { id },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Component hooks
export const useComponents = (projectId?: number, componentType?: string) => {
  return useQuery<{ components: Component[] }>(GET_COMPONENTS, {
    variables: { projectId, componentType },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const useComponent = (id: number) => {
  return useQuery<{ component: Component | null }>(GET_COMPONENT, {
    variables: { id },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Activity log hooks
export const useActivityLogs = (
  userId?: number,
  action?: string,
  limit?: number,
) => {
  return useQuery<{ activityLogs: any[] }>(GET_ACTIVITY_LOGS, {
    variables: { userId, action, limit },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Project member hooks
export const useProjectMembers = (projectId: number) => {
  return useQuery<{ projectMembers: any[] }>(GET_PROJECT_MEMBERS, {
    variables: { projectId },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Role and permission hooks
export const useRoles = () => {
  return useQuery<{ roles: any[] }>(GET_ROLES, {
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

export const usePermissions = () => {
  return useQuery<{ permissions: any[] }>(GET_PERMISSIONS, {
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Audit trail hooks
export const useAuditTrails = (
  userId?: number,
  action?: string,
  limit?: number,
) => {
  return useQuery<{ auditTrails: any[] }>(GET_AUDIT_TRAILS, {
    variables: { userId, action, limit },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Asset hooks
export const useAssets = (projectId?: number, assetType?: string) => {
  return useQuery<{ assets: any[] }>(GET_ASSETS, {
    variables: { projectId, assetType },
    errorPolicy: "all",
    skip: typeof window === "undefined", // Skip during SSR
  });
};

// Mutation hooks with optimistic updates and error handling
export const useCreateUser = () => {
  const [mutate, { loading, error }] = useMutation<{
    createUser: UserResponse;
  }>(CREATE_USER);

  return {
    createUser: useCallback(
      async (input: any) => {
        try {
          const result = await mutate({
            variables: { input },
            refetchQueries: [{ query: GET_USERS }],
          });
          return result.data?.createUser;
        } catch (err) {
          console.error("Error creating user:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

export const useUpdateUser = () => {
  const [mutate, { loading, error }] = useMutation<{
    updateUser: UserResponse;
  }>(UPDATE_USER);

  return {
    updateUser: useCallback(
      async (id: number, input: any) => {
        try {
          const result = await mutate({
            variables: { id, input },
            refetchQueries: [{ query: GET_USER, variables: { id } }],
          });
          return result.data?.updateUser;
        } catch (err) {
          console.error("Error updating user:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

export const useDeleteUser = () => {
  const [mutate, { loading, error }] = useMutation<{
    deleteUser: MutationResponse;
  }>(DELETE_USER);

  return {
    deleteUser: useCallback(
      async (id: number) => {
        try {
          const result = await mutate({
            variables: { id },
            refetchQueries: [{ query: GET_USERS }],
          });
          return result.data?.deleteUser;
        } catch (err) {
          console.error("Error deleting user:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

export const useCreateProject = () => {
  const [mutate, { loading, error }] = useMutation<{
    createProject: ProjectResponse;
  }>(CREATE_PROJECT);

  return {
    createProject: useCallback(
      async (input: any) => {
        try {
          const result = await mutate({
            variables: { input },
            refetchQueries: [{ query: GET_PROJECTS }],
          });
          return result.data?.createProject;
        } catch (err) {
          console.error("Error creating project:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

export const useUpdateProject = () => {
  const [mutate, { loading, error }] = useMutation<{
    updateProject: ProjectResponse;
  }>(UPDATE_PROJECT);

  return {
    updateProject: useCallback(
      async (id: number, input: any) => {
        try {
          const result = await mutate({
            variables: { id, input },
            refetchQueries: [{ query: GET_PROJECT, variables: { id } }],
          });
          return result.data?.updateProject;
        } catch (err) {
          console.error("Error updating project:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

export const useDeleteProject = () => {
  const [mutate, { loading, error }] = useMutation<{
    deleteProject: MutationResponse;
  }>(DELETE_PROJECT);

  return {
    deleteProject: useCallback(
      async (id: number) => {
        try {
          const result = await mutate({
            variables: { id },
            refetchQueries: [{ query: GET_PROJECTS }],
          });
          return result.data?.deleteProject;
        } catch (err) {
          console.error("Error deleting project:", err);
          throw err;
        }
      },
      [mutate],
    ),
    loading,
    error,
  };
};

// Helper hook for handling GraphQL errors
export const useGraphQLError = () => {
  const [error, setError] = useState<ApolloError | null>(null);

  const handleError = useCallback((err: ApolloError) => {
    setError(err);
    console.error("GraphQL Error:", err);

    // Handle specific error types
    if (err.networkError) {
      // Handle network errors
      console.error("Network Error:", err.networkError);
    }

    if (err.graphQLErrors) {
      // Handle GraphQL errors
      err.graphQLErrors.forEach((gqlError) => {
        console.error("GraphQL Error:", gqlError.message);
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

// Hook for pagination
export const usePagination = () => {
  const [variables, setVariables] = useState<PaginationVariables>({
    first: 10,
  });

  const loadMore = useCallback((endCursor: string) => {
    setVariables((prev) => ({
      ...prev,
      after: endCursor,
    }));
  }, []);

  const reset = useCallback(() => {
    setVariables({
      first: 10,
    });
  }, []);

  return { variables, loadMore, reset, setVariables };
};
