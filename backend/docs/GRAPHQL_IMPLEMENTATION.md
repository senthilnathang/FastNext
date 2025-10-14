# GraphQL Implementation Guide

## Overview

This document describes the complete GraphQL implementation in the FastNext Framework, covering both backend and frontend integration.

## Backend Implementation

### 🍓 Strawberry GraphQL

We use Strawberry GraphQL for the Python/FastAPI backend implementation.

#### Key Files:
- `backend/app/graphql/types.py` - GraphQL type definitions
- `backend/app/graphql/resolvers.py` - Query resolvers
- `backend/app/graphql/mutations.py` - Mutation resolvers
- `backend/app/graphql/schema.py` - Main schema and endpoint setup
- `backend/app/graphql/auth.py` - Authentication & authorization
- `backend/app/graphql/dataloaders.py` - Performance optimization

#### Features:
- ✅ Complete CRUD operations for all models
- ✅ Pagination with cursor-based navigation
- ✅ Search and filtering capabilities
- ✅ Authentication and authorization
- ✅ DataLoaders for N+1 query prevention
- ✅ Error handling and validation
- ✅ Type safety with Strawberry decorators

### GraphQL Endpoint

**URL:** `http://localhost:8000/api/v1/graphql`
**GraphiQL:** `http://localhost:8000/api/v1/graphql` (development only)

### Schema Features

#### Types:
- `UserType` - User management
- `ProjectType` - Project operations
- `PageType` - Page management
- `ComponentType` - Component system
- `ActivityLogType` - Activity tracking
- `AuditTrailType` - Change auditing
- `ProjectMemberType` - Team management
- `AssetType` - File management
- `RoleType` & `PermissionType` - Access control

#### Queries:
```graphql
# User queries
me: UserType
users(first: Int, after: String, search: String): UserConnection
user(id: Int!): UserType

# Project queries
projects(first: Int, after: String, userId: Int, isPublic: Boolean): ProjectConnection
project(id: Int!): ProjectType

# Page queries
pages(first: Int, after: String, projectId: Int): PageConnection
page(id: Int!): PageType

# Component queries
components(projectId: Int, componentType: String): [ComponentType]
component(id: Int!): ComponentType
```

#### Mutations:
```graphql
# User mutations
createUser(input: UserInput!): UserResponse
updateUser(id: Int!, input: UserUpdateInput!): UserResponse
deleteUser(id: Int!): MutationResponse

# Project mutations
createProject(input: ProjectInput!): ProjectResponse
updateProject(id: Int!, input: ProjectUpdateInput!): ProjectResponse
deleteProject(id: Int!): MutationResponse

# Page mutations
createPage(input: PageInput!): PageResponse
updatePage(id: Int!, input: PageUpdateInput!): PageResponse
deletePage(id: Int!): MutationResponse
```

## Frontend Implementation

### 🚀 Apollo Client

The frontend uses Apollo Client for GraphQL integration with React.

#### Key Files:
- `frontend/src/lib/graphql/client.ts` - Apollo Client configuration
- `frontend/src/lib/graphql/queries.ts` - GraphQL queries
- `frontend/src/lib/graphql/mutations.ts` - GraphQL mutations
- `frontend/src/lib/graphql/hooks.ts` - React hooks
- `frontend/src/lib/graphql/types.ts` - TypeScript definitions
- `frontend/src/lib/graphql/provider.tsx` - React provider

#### Features:
- ✅ Type-safe GraphQL operations
- ✅ Automatic token management
- ✅ Error handling and retry logic
- ✅ Optimistic updates
- ✅ Caching and pagination
- ✅ Real-time subscriptions (ready)

### Code Generation

Use GraphQL Code Generator for type-safe operations:

```bash
# Install dependencies
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo

# Generate types
npm run graphql:codegen

# Watch for changes
npm run graphql:watch
```

### Usage Examples

#### Query Hook:
```typescript
import { useUsers } from '@/lib/graphql';

function UsersList() {
  const { data, loading, error } = useUsers({
    first: 10,
    search: 'john'
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data?.users.edges.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

#### Mutation Hook:
```typescript
import { useCreateProject } from '@/lib/graphql';

function CreateProjectForm() {
  const { createProject, loading } = useCreateProject();

  const handleSubmit = async (data) => {
    const result = await createProject({
      name: data.name,
      description: data.description,
      isPublic: data.isPublic
    });

    if (result?.success) {
      // Handle success
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Authentication

GraphQL endpoints support JWT authentication via Bearer tokens:

```typescript
// Headers automatically added by Apollo Client
{
  "Authorization": "Bearer your_jwt_token_here"
}
```

## Performance Optimizations

### DataLoaders
Implemented to prevent N+1 queries:
- `UserDataLoader` - Batch user lookups
- `ProjectDataLoader` - Batch project lookups
- `PageDataLoader` - Batch page lookups
- `ComponentDataLoader` - Batch component lookups

### Caching
Apollo Client configured with:
- Normalized caching
- Optimistic updates
- Cache invalidation
- Pagination merge functions

### Pagination
Cursor-based pagination for scalable data loading:
```graphql
query GetUsers($first: Int, $after: String) {
  users(first: $first, after: $after) {
    edges { ...UserFragment }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Demo Components

Visit `/graphql-demo` to see live examples:
- **UsersList** - Paginated user query with search
- **ProjectsGrid** - Project CRUD operations
- **GraphQLDemo** - Complete feature showcase

## Error Handling

### Backend Errors:
- Authentication errors (401)
- Authorization errors (403)
- Validation errors (422)
- Not found errors (404)
- Server errors (500)

### Frontend Error Handling:
```typescript
import { useGraphQLError } from '@/lib/graphql';

function MyComponent() {
  const { error, handleError, clearError } = useGraphQLError();

  // Handle errors automatically
  const { data, error: queryError } = useQuery(GET_USERS, {
    onError: handleError
  });
}
```

## Security Features

### Backend Security:
- JWT token validation
- Role-based access control
- Input validation
- SQL injection prevention
- Rate limiting (when enabled)

### Frontend Security:
- Automatic token refresh
- Secure token storage
- CSRF protection
- XSS prevention

## Monitoring & Debugging

### Development Tools:
- GraphiQL interface at `/graphql`
- Apollo Client DevTools
- Real-time query inspection
- Performance monitoring

### Production Monitoring:
- Query complexity analysis
- Performance metrics
- Error tracking
- Rate limiting logs

## Getting Started

1. **Install dependencies:**
```bash
# Backend
cd backend
pip install strawberry-graphql[fastapi]==0.246.2

# Frontend
cd frontend
npm install @apollo/client graphql
```

2. **Start the backend:**
```bash
cd backend
python main.py
```

3. **Start the frontend:**
```bash
cd frontend
npm run dev
```

4. **Visit GraphiQL:**
Open `http://localhost:8000/api/v1/graphql` in your browser

5. **View the demo:**
Navigate to `http://localhost:3000/graphql-demo`

## Example Queries

### Get current user:
```graphql
query GetMe {
  me {
    id
    username
    email
    fullName
    isActive
  }
}
```

### List projects with pagination:
```graphql
query GetProjects($first: Int, $after: String) {
  projects(first: $first, after: $after) {
    edges {
      id
      name
      description
      isPublic
      owner {
        username
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Create a new project:
```graphql
mutation CreateProject($input: ProjectInput!) {
  createProject(input: $input) {
    success
    message
    project {
      id
      name
      description
    }
  }
}
```

With variables:
```json
{
  "input": {
    "name": "My New Project",
    "description": "A GraphQL-powered project",
    "isPublic": false
  }
}
```

## Next Steps

1. **Subscriptions** - Add real-time features
2. **File Uploads** - Implement GraphQL file uploads
3. **Advanced Caching** - Redis-backed caching
4. **Schema Stitching** - Microservices integration
5. **Performance** - Query complexity analysis

## Troubleshooting

### Common Issues:

1. **GraphQL endpoint not accessible:**
   - Check backend is running on port 8000
   - Verify CORS settings in FastAPI

2. **Authentication errors:**
   - Ensure JWT token is valid
   - Check token expiration
   - Verify user permissions

3. **Type generation issues:**
   - Run `npm run graphql:codegen`
   - Check schema URL in codegen.yml
   - Verify GraphQL endpoint is accessible

4. **Performance issues:**
   - Enable DataLoaders
   - Check query complexity
   - Optimize database queries

This GraphQL implementation provides a solid foundation for building scalable, type-safe applications with real-time capabilities.
