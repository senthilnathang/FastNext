# API Documentation Integration

This directory contains components for integrating Swagger UI with the FastNext Framework frontend, providing interactive API documentation and testing capabilities.

## Features

### 🚀 Interactive API Documentation
- **Swagger UI Integration**: Full-featured Swagger UI embedded in the frontend
- **Real-time API Testing**: Test endpoints directly from the documentation
- **Authentication Support**: Automatic token injection for protected endpoints
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### 🔒 Authentication Integration
- **Automatic Token Management**: Tokens are automatically included in API requests
- **Session Handling**: Proper handling of authentication errors and session expiry
- **User Context**: Display current user information in the API documentation

### 🧪 CRUD Testing Utilities
- **Comprehensive Testing**: Built-in utilities for testing Create, Read, Update, Delete operations
- **Test Results**: Detailed success/failure reporting with error messages
- **Connection Testing**: API connectivity and health check functionality

## Components

### SwaggerUI Component
Located in `./SwaggerUI.tsx`

```tsx
import { SwaggerUI } from '@/components/api'

// Basic usage
<SwaggerUI />

// With custom configuration
<SwaggerUI
  apiUrl="http://localhost:8000/api/v1/openapi.json"
  showToolbar={true}
  className="custom-swagger"
/>
```

**Props:**
- `className?: string` - Custom CSS classes
- `apiUrl?: string` - OpenAPI specification URL (default: localhost:8000)
- `showToolbar?: boolean` - Show/hide the connection toolbar (default: true)

**Features:**
- Automatic API connection testing
- Real-time connection status display
- Authentication status indicator
- Custom styling with Tailwind CSS
- Error handling and retry functionality

## API Documentation Page

Located in `/api-docs` route

### Tabs Overview

1. **Interactive API** - Full Swagger UI interface for testing endpoints
2. **Endpoints Overview** - Categorized list of all available endpoints
3. **Testing Guide** - Comprehensive guide for API testing and CRUD operations

### Key Features

- **Endpoint Categories**: Organized by functionality (Auth, Users, Projects, etc.)
- **HTTP Method Indicators**: Color-coded badges for GET, POST, PUT, DELETE
- **Copy-to-Clipboard**: Quick copying of endpoint URLs
- **Status Code Reference**: Common HTTP status codes and their meanings
- **CRUD Testing Guide**: Step-by-step instructions for testing operations

## Utilities

### API Testing Utilities
Located in `@/lib/api/swagger.ts`

```tsx
import { testAPIConnection, CRUDTester, getAvailableEndpoints } from '@/lib/api/swagger'

// Test API connectivity
const result = await testAPIConnection('http://localhost:8000')

// Test authenticated endpoints
const authResult = await testAuthenticatedEndpoint(token, '/api/v1/auth/me')

// CRUD testing
const tester = new CRUDTester('http://localhost:8000', token)
const createResult = await tester.testCreate('/api/v1/users', userData)
const readResult = await tester.testRead('/api/v1/users')
const updateResult = await tester.testUpdate('/api/v1/users/1', updatedData)
const deleteResult = await tester.testDelete('/api/v1/users/1')

// Get available endpoints from OpenAPI spec
const { endpoints } = await getAvailableEndpoints('http://localhost:8000/api/v1/openapi.json')
```

### Available Functions

#### `testAPIConnection(baseUrl: string)`
Tests basic connectivity to the API server.

#### `testAuthenticatedEndpoint(token: string, endpoint: string, baseUrl?: string)`
Tests authenticated endpoints with the provided token.

#### `getAvailableEndpoints(openApiUrl: string)`
Parses the OpenAPI specification and returns all available endpoints with metadata.

#### `CRUDTester` Class
Comprehensive CRUD testing utility with methods for all operations.

## Integration with FastAPI Backend

### CORS Configuration
The backend is configured to allow requests from the frontend:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"]
)
```

### OpenAPI Documentation
FastAPI automatically generates OpenAPI documentation available at:
- **JSON Spec**: `http://localhost:8000/api/v1/openapi.json`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Authentication Flow
1. User logs in through the frontend authentication system
2. JWT tokens are stored in localStorage
3. Swagger UI automatically includes tokens in API requests
4. Backend validates tokens and returns appropriate responses

## Usage Examples

### Basic API Documentation Page
Navigate to `/api-docs` in the application to access the full API documentation interface.

### Testing CRUD Operations

1. **Authentication**: Log in to the application first
2. **Navigate**: Go to the API Documentation page
3. **Select Endpoint**: Choose an endpoint from the interactive interface
4. **Test Request**: Use the "Try it out" button to test the endpoint
5. **View Response**: See real-time response data and status codes

### Endpoint Categories

#### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Current user information

#### User Management
- `GET /users` - List all users
- `POST /users` - Create new user
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

#### Project Management
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure the backend is running on `http://localhost:8000`
   - Check CORS configuration in the backend
   - Verify network connectivity

2. **Authentication Errors**
   - Ensure you're logged in to the frontend application
   - Check if the JWT token is valid and not expired
   - Verify the token is being included in requests

3. **CORS Issues**
   - Check backend CORS settings
   - Ensure frontend URL is in allowed origins
   - Verify all required headers are allowed

### Debug Mode

Enable debug logging by opening browser developer tools:

```javascript
// In browser console
localStorage.setItem('debug', 'swagger-ui:*')
```

## Development

### Adding New Endpoints
When new endpoints are added to the backend:

1. Restart the backend server
2. Refresh the API documentation page
3. New endpoints will automatically appear in the Swagger UI

### Customizing Swagger UI
Modify the `swaggerConfig` object in `SwaggerUI.tsx` to customize:

- Appearance and layout
- Request/response interceptors
- Authentication handling
- UI behavior

### Styling
The Swagger UI is styled to match the application theme using Tailwind CSS. Custom styles are applied through the `style` tag in the component.

## Security Considerations

1. **Token Security**: JWT tokens are stored in localStorage and automatically included in requests
2. **HTTPS**: Use HTTPS in production for secure token transmission
3. **Token Expiry**: Tokens are automatically refreshed when needed
4. **CORS**: Proper CORS configuration prevents unauthorized cross-origin requests

## Dependencies

- `swagger-ui-react`: React wrapper for Swagger UI
- `next/dynamic`: Dynamic imports for SSR compatibility
- `@/contexts/AuthContext`: Authentication state management
- `@/lib/api/config`: API configuration utilities
