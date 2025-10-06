# TRPC + GraphQL Mixed Architecture Documentation

## Overview

The FastNext frontend implements a hybrid architecture combining **TRPC** and **GraphQL** to provide type-safe API communication with flexible data fetching capabilities.

## Architecture Design

### TRPC Layer (Presentation/Procedure Layer)
- **Purpose**: Provides type-safe RPC-style API calls with Zod validation
- **Location**: `frontend/src/lib/trpc/`
- **Benefits**: End-to-end type safety, automatic serialization, React Query integration

### GraphQL Layer (Data Fetching Layer)
- **Purpose**: Handles actual data fetching with flexible queries and caching
- **Location**: `frontend/src/lib/graphql/`
- **Benefits**: Flexible data selection, powerful caching, real-time subscriptions

### Integration Pattern
TRPC procedures call GraphQL operations under the hood, providing the best of both worlds:

```typescript
// TRPC procedure calls GraphQL operation
export const usersRouter = router({
  getAll: protectedProcedure
    .input(zodSchema)
    .query(async ({ input }) => {
      // Convert TRPC input to GraphQL variables
      const result = await userOperations.getAll(input)
      // Return formatted response
      return result
    })
})
```

## File Structure

```
frontend/src/lib/
├── trpc/
│   ├── client.ts              # TRPC client configuration
│   ├── server.ts              # TRPC server setup with middleware
│   ├── context.ts             # Request context and auth
│   ├── provider.tsx           # React provider component
│   ├── graphql-client.ts      # GraphQL operations wrapper
│   └── routers/
│       ├── _app.ts           # Main router combining all sub-routers
│       ├── users.ts          # User-related procedures
│       ├── projects.ts       # Project-related procedures
│       ├── pages.ts          # Page-related procedures
│       ├── components.ts     # Component-related procedures
│       ├── roles.ts          # Role-related procedures
│       └── permissions.ts    # Permission-related procedures
├── graphql/
│   ├── client.ts             # Apollo Client configuration
│   ├── types.ts              # TypeScript type definitions
│   ├── queries.ts            # GraphQL query definitions
│   ├── mutations.ts          # GraphQL mutation definitions
│   ├── hooks.ts              # Custom React hooks
│   ├── provider.tsx          # Apollo Provider component
│   └── index.ts              # Public exports
```

## Type Safety Implementation

### 1. GraphQL Types
All GraphQL operations use strongly typed interfaces:

```typescript
// frontend/src/lib/graphql/types.ts
export interface User {
  id: number;
  email: string;
  username: string;
  fullName?: string | null;
  isActive: boolean;
  // ... more fields
}

export interface UserInput {
  email: string;
  username: string;
  password: string;
  fullName?: string | null;
}
```

### 2. TRPC Schema Validation
All inputs are validated using Zod schemas:

```typescript
// frontend/src/lib/trpc/routers/users.ts
const createUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
})
```

### 3. GraphQL-TRPC Bridge
The bridge layer ensures type consistency:

```typescript
// frontend/src/lib/trpc/graphql-client.ts
export const userOperations = {
  async create(input: UserInput) {
    const client = getApolloClient();
    const result = await client.mutate({
      mutation: CREATE_USER,
      variables: { input },
    });
    return result.data;
  }
}
```

## Authentication & Security

### Token Management
Both layers use the same authentication token:

```typescript
// Consistent token storage key: 'access_token'
// TRPC client
headers() {
  const token = localStorage.getItem('access_token')
  return token ? { authorization: `Bearer ${token}` } : {}
}

// GraphQL client
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token')
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    }
  }
})
```

### Protected Procedures
TRPC procedures use middleware for authentication:

```typescript
// frontend/src/lib/trpc/server.ts
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
```

## Data Flow

### Query Flow
1. React component calls TRPC hook: `api.users.getAll.useQuery()`
2. TRPC procedure validates input with Zod schema
3. TRPC calls GraphQL operation: `userOperations.getAll()`
4. GraphQL operation executes Apollo Client query
5. Response flows back through the chain with proper typing

### Mutation Flow
1. React component calls TRPC mutation: `api.users.create.useMutation()`
2. TRPC procedure validates input
3. TRPC calls GraphQL mutation operation
4. GraphQL mutation executes with cache updates
5. Success/error response propagated back

## Error Handling

### GraphQL Error Handling
```typescript
// frontend/src/lib/trpc/graphql-client.ts
function handleGraphQLError(error: unknown): never {
  if (error instanceof ApolloError) {
    const message = error.graphQLErrors[0]?.message || error.message
    throw new Error(message)
  }
  throw new Error('Unknown GraphQL error occurred')
}
```

### TRPC Error Formatting
```typescript
// frontend/src/lib/trpc/server.ts
errorFormatter(opts) {
  const { shape, error } = opts
  return {
    ...shape,
    data: {
      ...shape.data,
      zodError: error.code === 'BAD_REQUEST' && error.cause ? error.cause : null,
    },
  }
}
```

## Caching Strategy

### Apollo Client Cache
- Normalized caching for GraphQL data
- Type policies for pagination
- Optimistic updates for mutations

### React Query Cache (via TRPC)
- Automatic background refetching
- Stale-while-revalidate strategy
- Manual cache invalidation

## Usage Examples

### Component Usage
```typescript
'use client'
import { api } from '@/lib/trpc/provider'

export function UsersList() {
  const { data: users, isLoading, error } = api.users.getAll.useQuery({
    page: 1,
    limit: 10,
    search: 'john'
  })

  const createUser = api.users.create.useMutation({
    onSuccess: () => {
      // Automatically refetches users list
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {users?.data.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
    </div>
  )
}
```

### Direct GraphQL Usage (when needed)
```typescript
import { useQuery } from '@apollo/client'
import { GET_USERS } from '@/lib/graphql/queries'

export function DirectGraphQLComponent() {
  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { first: 10 },
    fetchPolicy: 'cache-first'
  })

  // Handle response...
}
```

## Best Practices

### 1. Prefer TRPC for Component API Calls
- Use TRPC procedures for React components
- Benefits from React Query integration
- Automatic type inference

### 2. Use GraphQL Directly for Advanced Cases
- Complex queries with fragments
- Real-time subscriptions
- Custom cache management

### 3. Type Safety Rules
- Always import types from `@/lib/graphql/types`
- Use Zod schemas for all TRPC inputs
- Never use `any` or `unknown` in production code

### 4. Error Handling
- Implement consistent error boundaries
- Handle both network and validation errors
- Provide meaningful user feedback

### 5. Performance Optimization
- Use proper cache policies
- Implement pagination consistently
- Leverage DataLoader patterns for N+1 prevention

## Migration Path

### From Pure REST to Hybrid
1. Keep existing REST endpoints working
2. Add GraphQL operations alongside
3. Wrap GraphQL with TRPC procedures
4. Gradually migrate components to TRPC

### Future GraphQL-First
1. Generate TypeScript types from GraphQL schema
2. Use GraphQL Code Generator
3. Implement GraphQL subscriptions
4. Consider Apollo Federation for microservices

## Troubleshooting

### Common Issues
1. **Type mismatches**: Ensure GraphQL types match TRPC schemas
2. **Authentication errors**: Verify token key consistency
3. **Cache inconsistency**: Use proper cache invalidation
4. **Performance issues**: Check for N+1 queries and implement DataLoaders

### Debug Tools
- Apollo Client DevTools for GraphQL debugging
- TRPC panel for procedure inspection
- React Query DevTools for cache inspection

## Testing Strategy

### Unit Testing
- Test TRPC procedures with mock GraphQL operations
- Test GraphQL operations with mock Apollo Client
- Use MSW for API mocking

### Integration Testing
- Test complete data flow from component to backend
- Verify authentication and authorization
- Test error handling scenarios

### End-to-End Testing
- Use Playwright for full user flows
- Test real API interactions
- Verify caching behavior

## Performance Metrics

### Key Metrics to Monitor
- GraphQL query execution time
- TRPC procedure response time
- Cache hit ratios
- Bundle size impact
- Time to first contentful paint

### Optimization Strategies
- Code splitting for GraphQL operations
- Lazy loading of TRPC routers
- Efficient pagination implementation
- Proper cache configuration

## Conclusion

This hybrid architecture provides:
- **Type Safety**: End-to-end TypeScript safety
- **Developer Experience**: Excellent DX with auto-completion and validation
- **Performance**: Efficient caching and data fetching
- **Flexibility**: Can use either TRPC or GraphQL as needed
- **Maintainability**: Clear separation of concerns and consistent patterns

The architecture is production-ready and scalable, providing a solid foundation for complex frontend applications.