# Data Fetching & State Management Guide

## Overview

FastNext uses **React Query (TanStack Query v5)** as the primary data fetching and state management solution. This provides a consistent, powerful, and efficient way to handle server state throughout the application.

## Architecture

### Core Components

1. **Enhanced API Client** (`/lib/api/client.ts`)
   - Axios-based HTTP client with comprehensive error handling
   - Automatic token management and refresh
   - Request/response logging and monitoring
   - Graceful error recovery and user-friendly messages

2. **Query Provider** (`/components/providers/QueryProvider.tsx`)
   - Global React Query configuration
   - Development tools integration
   - Intelligent retry logic and caching strategies

3. **Resource-Specific APIs** (`/lib/api/`)
   - Modular API functions for each resource (users, roles, permissions)
   - Type-safe request/response interfaces
   - Consistent error handling

4. **Custom Hooks** (`/hooks/`)
   - React Query hooks for each resource
   - Optimistic updates and cache management
   - Loading states and error handling

## Usage Patterns

### Basic Data Fetching

```typescript
import { useUsers } from '@/hooks/useUsers'

function UsersPage() {
  const { data, isLoading, error } = useUsers()
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <UsersList users={data?.items || []} />
}
```

### Mutations with Optimistic Updates

```typescript
import { useCreateUser, useUsers } from '@/hooks/useUsers'

function CreateUserForm() {
  const createUser = useCreateUser()
  
  const handleSubmit = (userData) => {
    createUser.mutate(userData, {
      onSuccess: () => {
        // Query cache is automatically invalidated
        toast.success('User created successfully')
      },
      onError: (error) => {
        toast.error(`Failed to create user: ${apiUtils.getErrorMessage(error)}`)
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Advanced Patterns

#### Parallel Queries
```typescript
function AdminDashboard() {
  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const { data: permissions, isLoading: permissionsLoading } = usePermissions()
  
  const isLoading = usersLoading || rolesLoading || permissionsLoading
  
  if (isLoading) return <LoadingSpinner />
  
  return <DashboardContent users={users} roles={roles} permissions={permissions} />
}
```

#### Dependent Queries
```typescript
function UserDetails({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)
  const { data: userRoles } = useUserRoles(userId, {
    enabled: !!user // Only fetch roles after user is loaded
  })
  
  return <UserDetailsView user={user} roles={userRoles} />
}
```

#### Pagination
```typescript
function UsersList() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUsers({ 
    skip: (page - 1) * 10, 
    limit: 10 
  })
  
  return (
    <div>
      <DataTable data={data?.items || []} />
      <Pagination 
        currentPage={page}
        totalPages={data?.pages || 0}
        onPageChange={setPage}
      />
    </div>
  )
}
```

## Error Handling

### Global Error Handling
- Automatic retry for network/timeout errors
- No retry for 4xx client errors
- User-friendly error messages
- Development error details

### Component-Level Error Handling
```typescript
import { apiUtils } from '@/lib/api/client'

function MyComponent() {
  const { data, error } = useUsers()
  
  if (error) {
    return (
      <div className="error-state">
        <h3>Failed to load users</h3>
        <p>{apiUtils.getErrorMessage(error)}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    )
  }
  
  return <div>{/* success state */}</div>
}
```

## Best Practices

### 1. Use Consistent Query Keys
```typescript
// Good: Use centralized query key factories
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
}
```

### 2. Handle Loading States Gracefully
```typescript
function DataComponent() {
  const { data, isLoading, error } = useData()
  
  // Show loading skeleton instead of spinner when possible
  if (isLoading) return <DataSkeleton />
  if (error) return <ErrorFallback error={error} />
  
  return <DataDisplay data={data} />
}
```

### 3. Optimize Cache Usage
```typescript
// Use staleTime for data that doesn't change often
const { data } = usePermissions({
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000,    // 30 minutes
})

// Use placeholderData for smooth pagination
const { data } = useUsers({
  placeholderData: (previousData) => previousData
})
```

### 4. Implement Optimistic Updates
```typescript
const updateUser = useOptimisticMutation(
  (variables) => usersApi.updateUser(variables.id, variables.data),
  {
    queryKey: userKeys.detail(userId),
    updater: (oldData, variables) => ({ ...oldData, ...variables.data }),
    onSuccess: () => toast.success('User updated'),
    onError: () => toast.error('Update failed')
  }
)
```

### 5. Type Safety
```typescript
// Always use proper TypeScript types
interface UserFormData {
  email: string
  username: string
  full_name?: string
}

const createUser = useCreateUser()
createUser.mutate(userData as CreateUserRequest) // Type-safe
```

## Configuration

### Query Client Configuration
The global query client is configured with sensible defaults:

- **Stale Time**: 5 minutes (data considered fresh)
- **GC Time**: 10 minutes (unused data cached)
- **Retry Logic**: Smart retry based on error type
- **Refetch**: On reconnect, not on window focus

### Environment-Specific Behavior
- **Development**: React Query DevTools enabled
- **Production**: Enhanced error reporting (integrate with Sentry)

## Migration Guide

### From Manual Fetch to React Query

**Before:**
```typescript
function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])
  
  // Manual error handling, no caching, no background updates
}
```

**After:**
```typescript
function UsersList() {
  const { data: users, isLoading, error } = useUsers()
  
  // Automatic caching, background updates, error handling
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <UsersTable users={users?.items || []} />
}
```

## Debugging

### React Query DevTools
Available in development mode at the bottom-right corner of the screen. Provides:
- Query inspection
- Cache visualization
- Network status monitoring
- Mutation tracking

### Console Logging
All API requests and responses are logged in development with:
- Request ID for tracing
- Response time
- Error details
- Cache hit/miss information

## Performance Considerations

1. **Smart Caching**: Reduces unnecessary API calls
2. **Background Updates**: Keeps data fresh without blocking UI
3. **Optimistic Updates**: Immediate UI feedback
4. **Request Deduplication**: Prevents duplicate requests
5. **Garbage Collection**: Automatic cleanup of unused data

## Next Steps

1. **Infinite Queries**: For large datasets with load-more functionality
2. **Real-time Updates**: Integration with WebSockets or Server-Sent Events
3. **Offline Support**: Cache persistence for offline functionality
4. **Advanced Error Recovery**: Retry with exponential backoff