/**
 * GraphQL Client for TRPC
 * Helper functions to use GraphQL operations within TRPC procedures
 */
import { getApolloClient } from '@/lib/graphql/client';
import {
  GET_USERS,
  GET_USER,
  GET_PROJECTS,
  GET_PROJECT,
  GET_PAGES,
  GET_PAGE,
  GET_COMPONENTS,
  GET_COMPONENT,
  GET_ROLES,
  GET_PERMISSIONS,
  GET_ACTIVITY_LOGS,
  GET_PROJECT_MEMBERS,
  GET_AUDIT_TRAILS,
  GET_ASSETS,
} from '@/lib/graphql/queries';
import {
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  CREATE_PAGE,
  UPDATE_PAGE,
  DELETE_PAGE,
  CREATE_COMPONENT,
  UPDATE_COMPONENT,
  DELETE_COMPONENT,
  ADD_PROJECT_MEMBER,
  REMOVE_PROJECT_MEMBER,
} from '@/lib/graphql/mutations';
import { ApolloError } from '@apollo/client';
import type {
  UserInput,
  UserUpdateInput,
  ProjectInput,
  ProjectUpdateInput,
  PageInput,
  PageUpdateInput,
  ComponentInput,
  ComponentUpdateInput,
  ProjectMemberInput
} from '@/lib/graphql/types';

// Helper function to handle GraphQL errors consistently
function handleGraphQLError(error: unknown): never {
  if (error instanceof ApolloError) {
    const message = error.graphQLErrors[0]?.message || error.message || 'GraphQL operation failed';
    throw new Error(message);
  }
  throw new Error('Unknown GraphQL error occurred');
}

// User operations
export const userOperations = {
  async getAll(variables: { first?: number; after?: string; search?: string }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_USERS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async getById(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_USER,
        variables: { id },
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async create(input: UserInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: CREATE_USER,
        variables: { input },
        refetchQueries: [{ query: GET_USERS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async update(id: number, input: UserUpdateInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: UPDATE_USER,
        variables: { id, input },
        refetchQueries: [
          { query: GET_USER, variables: { id } },
          { query: GET_USERS },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async delete(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: DELETE_USER,
        variables: { id },
        refetchQueries: [{ query: GET_USERS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Project operations
export const projectOperations = {
  async getAll(variables: { first?: number; after?: string; userId?: number; isPublic?: boolean }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PROJECTS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async getById(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PROJECT,
        variables: { id },
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async create(input: ProjectInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: CREATE_PROJECT,
        variables: { input },
        refetchQueries: [{ query: GET_PROJECTS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async update(id: number, input: ProjectUpdateInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: UPDATE_PROJECT,
        variables: { id, input },
        refetchQueries: [
          { query: GET_PROJECT, variables: { id } },
          { query: GET_PROJECTS },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async delete(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: DELETE_PROJECT,
        variables: { id },
        refetchQueries: [{ query: GET_PROJECTS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Page operations
export const pageOperations = {
  async getAll(variables: { first?: number; after?: string; projectId?: number }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PAGES,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async getById(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PAGE,
        variables: { id },
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async create(input: PageInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: CREATE_PAGE,
        variables: { input },
        refetchQueries: [{ query: GET_PAGES }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async update(id: number, input: PageUpdateInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: UPDATE_PAGE,
        variables: { id, input },
        refetchQueries: [
          { query: GET_PAGE, variables: { id } },
          { query: GET_PAGES },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async delete(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: DELETE_PAGE,
        variables: { id },
        refetchQueries: [{ query: GET_PAGES }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Component operations
export const componentOperations = {
  async getAll(variables: { projectId?: number; componentType?: string }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_COMPONENTS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async getById(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_COMPONENT,
        variables: { id },
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async create(input: ComponentInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: CREATE_COMPONENT,
        variables: { input },
        refetchQueries: [{ query: GET_COMPONENTS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async update(id: number, input: ComponentUpdateInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: UPDATE_COMPONENT,
        variables: { id, input },
        refetchQueries: [
          { query: GET_COMPONENT, variables: { id } },
          { query: GET_COMPONENTS },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async delete(id: number) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: DELETE_COMPONENT,
        variables: { id },
        refetchQueries: [{ query: GET_COMPONENTS }],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Role operations
export const roleOperations = {
  async getAll() {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_ROLES,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Permission operations
export const permissionOperations = {
  async getAll() {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PERMISSIONS,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Activity log operations
export const activityLogOperations = {
  async getAll(variables: { userId?: number; action?: string; limit?: number }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_ACTIVITY_LOGS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Project member operations
export const projectMemberOperations = {
  async getAll(projectId: number) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_PROJECT_MEMBERS,
        variables: { projectId },
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async add(input: ProjectMemberInput) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: ADD_PROJECT_MEMBER,
        variables: { input },
        refetchQueries: [
          { query: GET_PROJECT_MEMBERS, variables: { projectId: input.projectId } },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },

  async remove(projectId: number, userId: number) {
    try {
      const client = getApolloClient();
      const result = await client.mutate({
        mutation: REMOVE_PROJECT_MEMBER,
        variables: { projectId, userId },
        refetchQueries: [
          { query: GET_PROJECT_MEMBERS, variables: { projectId } },
        ],
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Audit trail operations
export const auditTrailOperations = {
  async getAll(variables: { resourceType?: string; resourceId?: string; limit?: number }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_AUDIT_TRAILS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};

// Asset operations
export const assetOperations = {
  async getAll(variables: { projectId?: number }) {
    try {
      const client = getApolloClient();
      const result = await client.query({
        query: GET_ASSETS,
        variables,
        fetchPolicy: 'cache-first',
      });
      return result.data;
    } catch (error) {
      handleGraphQLError(error);
    }
  },
};