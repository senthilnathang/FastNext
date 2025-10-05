/**
 * GraphQL Library Exports
 * Central export point for all GraphQL-related functionality
 */

// Client and configuration
export { apolloClient, updateAuthToken, logout } from './client';

// Queries and mutations
export * from './queries';
export * from './mutations';

// React hooks
export * from './hooks';

// Provider component
export { GraphQLProvider } from './provider';

// Types (re-export common Apollo types)
export type {
  ApolloError,
  QueryResult,
  MutationResult,
  LazyQueryResult,
} from '@apollo/client';