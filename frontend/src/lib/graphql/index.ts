/**
 * GraphQL Library Exports
 * Central export point for all GraphQL-related functionality
 */

// Types (re-export common Apollo types)
export type {
  ApolloError,
  LazyQueryResult,
  MutationResult,
  QueryResult,
} from "@apollo/client";
// Client and configuration
export { apolloClient, logout, updateAuthToken } from "./client";
// React hooks
export * from "./hooks";
export * from "./mutations";

// Provider component
export { GraphQLProvider } from "./provider";
// Queries and mutations
export * from "./queries";
