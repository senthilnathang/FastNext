/**
 * GraphQL Client Configuration
 * Apollo Client setup with authentication and error handling
 */
import {
  ApolloClient,
  createHttpLink,
  from,
  InMemoryCache,
  type NormalizedCacheObject,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";

// GraphQL endpoint
const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/api/v1/graphql";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Global Apollo Client instance (for SSR compatibility)
let apolloClientInstance: ApolloClient<NormalizedCacheObject> | null = null;

// HTTP link for GraphQL requests
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: "include", // Include cookies for authentication
});

// Auth link to add JWT token to headers
const authLink = setContext((_, { headers }) => {
  // Only access localStorage in browser environment
  let token = null;
  if (isBrowser) {
    try {
      token = localStorage.getItem("access_token");
    } catch (error) {
      console.warn("Failed to access localStorage:", error);
    }
  }

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  };
});

// Error link for handling GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Handle 401 errors by redirecting to login
    if ("statusCode" in networkError && networkError.statusCode === 401) {
      // Clear stored token
      if (isBrowser) {
        try {
          localStorage.removeItem("access_token");
          // Redirect to login page
          window.location.href = "/login";
        } catch (error) {
          console.warn("Failed to handle logout:", error);
        }
      }
    }
  }
});

// Retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      // Retry on network errors, but not on authentication errors
      return !!error && !error.message.includes("401");
    },
  },
});

// Create Apollo Client instance (SSR compatible)
function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: !isBrowser,
    link: from([errorLink, retryLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Pagination for users
            users: {
              keyArgs: ["search"],
              merge(existing, incoming) {
                if (!existing) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing.edges || []), ...(incoming.edges || [])],
                };
              },
            },
            // Pagination for projects
            projects: {
              keyArgs: ["userId", "isPublic"],
              merge(existing, incoming) {
                if (!existing) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing.edges || []), ...(incoming.edges || [])],
                };
              },
            },
            // Pagination for pages
            pages: {
              keyArgs: ["projectId"],
              merge(existing, incoming) {
                if (!existing) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing.edges || []), ...(incoming.edges || [])],
                };
              },
            },
          },
        },
        User: {
          fields: {
            projects: {
              merge(existing, incoming) {
                return incoming;
              },
            },
          },
        },
        Project: {
          fields: {
            pages: {
              merge(existing, incoming) {
                return incoming;
              },
            },
            components: {
              merge(existing, incoming) {
                return incoming;
              },
            },
            members: {
              merge(existing, incoming) {
                return incoming;
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
      },
      query: {
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
      },
      mutate: {
        errorPolicy: "all",
      },
    },
    // Enable devtools in development
    devtools: {
      enabled: isBrowser && process.env.NODE_ENV === "development",
    },
  });
}

// Get or create Apollo Client instance
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  if (!apolloClientInstance) {
    apolloClientInstance = createApolloClient();
  }
  return apolloClientInstance;
}

// Export the client for backward compatibility
export const apolloClient = getApolloClient();

/**
 * Helper function to handle authentication token updates
 */
export const updateAuthToken = (token: string | null) => {
  if (isBrowser) {
    try {
      if (token) {
        localStorage.setItem("access_token", token);
      } else {
        localStorage.removeItem("access_token");
      }

      // Reset Apollo Client cache to refetch with new token
      const client = getApolloClient();
      client.resetStore();
    } catch (error) {
      console.warn("Failed to update auth token:", error);
    }
  }
};

/**
 * Helper function to clear Apollo cache and logout
 */
export const logout = async () => {
  if (isBrowser) {
    try {
      localStorage.removeItem("access_token");
      const client = getApolloClient();
      await client.clearStore();
      window.location.href = "/login";
    } catch (error) {
      console.warn("Failed to logout:", error);
    }
  }
};
