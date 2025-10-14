# FastNext Backend API Reference

## Overview

The FastNext Backend API is built on **FastAPI** and follows **REST** principles with comprehensive **OpenAPI 3.0** documentation. All endpoints support JSON request/response format and include proper HTTP status codes.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.yourdomain.com`

## Authentication

### JWT Token Authentication

Most endpoints require authentication via JWT Bearer tokens:

```http
Authorization: Bearer <jwt_token>
```

### Token Endpoints

#### Login
```http
POST /api/v1/auth/login/access-token
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Token Validation
```http
POST /api/v1/auth/test-token
Authorization: Bearer <token>
```

## API Versioning

The API uses URL path versioning:
- **Current Version**: `v1`
- **Base Path**: `/api/v1/`

## Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success message",
  "status": "success"
}
```

### Error Response
```json
{
  "detail": "Error description",
  "error_code": "VALIDATION_ERROR",
  "status": "error"
}
```

### Paginated Response
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20,
  "pages": 5,
  "has_next": true,
  "has_prev": false
}
```

## Core Endpoints

### Authentication & Authorization

#### 🔐 Auth Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/login/access-token` | User login | ❌ |
| POST | `/api/v1/auth/register` | User registration | ❌ |
| POST | `/api/v1/auth/test-token` | Validate token | ✅ |
| POST | `/api/v1/auth/refresh-token` | Refresh JWT token | ✅ |
| POST | `/api/v1/auth/logout` | User logout | ✅ |

### User Management

#### 👤 Users
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/users/` | List all users | `user.read` |
| POST | `/api/v1/users/` | Create new user | `user.create` |
| GET | `/api/v1/users/{id}` | Get user by ID | `user.read` |
| PUT | `/api/v1/users/{id}` | Update user | `user.update` |
| DELETE | `/api/v1/users/{id}` | Delete user | `user.delete` |
| GET | `/api/v1/users/me` | Get current user | ✅ |
| PUT | `/api/v1/users/me` | Update current user | ✅ |

**User Model:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2023-12-01T10:00:00Z",
  "updated_at": "2023-12-01T10:00:00Z",
  "roles": [...]
}
```

#### 👤 User Profile
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/profile/me` | Get user profile | ✅ |
| PUT | `/api/v1/profile/me` | Update profile | ✅ |
| PUT | `/api/v1/profile/me/password` | Change password | ✅ |
| GET | `/api/v1/profile/quick-actions` | Get quick actions | ✅ |

### Role-Based Access Control

#### 🛡️ Roles
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/roles/` | List all roles | `role.read` |
| POST | `/api/v1/roles/` | Create new role | `role.create` |
| GET | `/api/v1/roles/{id}` | Get role details | `role.read` |
| PUT | `/api/v1/roles/{id}` | Update role | `role.update` |
| DELETE | `/api/v1/roles/{id}` | Delete role | `role.delete` |
| POST | `/api/v1/roles/{id}/permissions` | Assign permission | `role.manage` |
| DELETE | `/api/v1/roles/{id}/permissions/{permission_id}` | Remove permission | `role.manage` |

**Role Model:**
```json
{
  "id": 1,
  "name": "Admin",
  "description": "Full system access",
  "is_system_role": true,
  "is_active": true,
  "created_at": "2023-12-01T10:00:00Z",
  "permissions": [...]
}
```

#### 🔑 Permissions
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/permissions/` | List permissions | `permission.read` |
| POST | `/api/v1/permissions/` | Create permission | `permission.create` |
| GET | `/api/v1/permissions/{id}` | Get permission | `permission.read` |
| PUT | `/api/v1/permissions/{id}` | Update permission | `permission.update` |
| DELETE | `/api/v1/permissions/{id}` | Delete permission | `permission.delete` |

### Project Management

#### 📁 Projects
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/projects/` | List user projects | ✅ |
| POST | `/api/v1/projects/` | Create project | `project.create` |
| GET | `/api/v1/projects/{id}` | Get project details | `project.read` |
| PUT | `/api/v1/projects/{id}` | Update project | `project.update` |
| DELETE | `/api/v1/projects/{id}` | Delete project | `project.delete` |

**Project Model:**
```json
{
  "id": 1,
  "name": "My Project",
  "description": "Project description",
  "is_active": true,
  "created_by": 1,
  "created_at": "2023-12-01T10:00:00Z",
  "members": [...]
}
```

#### 👥 Project Members
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/project-members/project/{project_id}/members` | List members | `project.read` |
| POST | `/api/v1/project-members/project/{project_id}/members` | Add member | `project.manage` |
| POST | `/api/v1/project-members/project/{project_id}/invite` | Invite by email | `project.manage` |
| PUT | `/api/v1/project-members/members/{member_id}` | Update member | `project.manage` |
| DELETE | `/api/v1/project-members/members/{member_id}` | Remove member | `project.manage` |

### Workflow Management

#### 🔄 Workflow Types
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/workflow-types/` | List workflow types | `workflow.read` |
| POST | `/api/v1/workflow-types/` | Create workflow type | `workflow.create` |
| GET | `/api/v1/workflow-types/{id}` | Get workflow type | `workflow.read` |
| PUT | `/api/v1/workflow-types/{id}` | Update workflow type | `workflow.update` |
| DELETE | `/api/v1/workflow-types/{id}` | Delete workflow type | `workflow.delete` |

#### 📋 Workflow Templates
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/workflow-templates/` | List templates | `workflow.read` |
| POST | `/api/v1/workflow-templates/` | Create template | `workflow.create` |
| GET | `/api/v1/workflow-templates/{id}` | Get template | `workflow.read` |
| PUT | `/api/v1/workflow-templates/{id}` | Update template | `workflow.update` |
| DELETE | `/api/v1/workflow-templates/{id}` | Delete template | `workflow.delete` |

#### 🏃 Workflow Instances
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/workflow-instances/` | List instances | `workflow.read` |
| POST | `/api/v1/workflow-instances/` | Create instance | `workflow.execute` |
| GET | `/api/v1/workflow-instances/{id}` | Get instance | `workflow.read` |
| PUT | `/api/v1/workflow-instances/{id}` | Update instance | `workflow.update` |
| POST | `/api/v1/workflow-instances/{id}/execute` | Execute action | `workflow.execute` |
| GET | `/api/v1/workflow-instances/{id}/history` | Get history | `workflow.read` |

### Security & Monitoring

#### 🔒 Security Settings
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/security/settings` | Get settings | ✅ |
| PUT | `/api/v1/security/settings` | Update settings | ✅ |
| GET | `/api/v1/security/overview` | Security overview | ✅ |
| POST | `/api/v1/security/2fa/disable` | Disable 2FA | ✅ |

#### 📊 Activity Logs
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/activity-logs/` | List activity logs | `activity.read` |
| GET | `/api/v1/activity-logs/me` | Get user activities | ✅ |
| GET | `/api/v1/activity-logs/{id}` | Get specific log | `activity.read` |
| POST | `/api/v1/activity-logs/` | Create activity log | `activity.create` |
| GET | `/api/v1/activity-logs/stats/summary` | Get statistics | `activity.read` |
| DELETE | `/api/v1/activity-logs/bulk` | Bulk delete logs | `activity.delete` |

#### 📋 Audit Trails
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/audit-trails/` | List audit trails | `audit.read` |
| GET | `/api/v1/audit-trails/entity/{type}/{id}` | Get entity history | `audit.read` |
| GET | `/api/v1/audit-trails/{id}` | Get audit detail | `audit.read` |
| GET | `/api/v1/audit-trails/{id}/comparison` | Compare changes | `audit.read` |
| GET | `/api/v1/audit-trails/export/{format}` | Export audit data | `audit.export` |

### Generated CRUD Endpoints

The scaffolding system generates complete CRUD endpoints for each model:

#### Example: Products API
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/products/` | List products | `product.read` |
| POST | `/api/v1/products/` | Create product | `product.create` |
| GET | `/api/v1/products/{id}` | Get product | `product.read` |
| PUT | `/api/v1/products/{id}` | Update product | `product.update` |
| DELETE | `/api/v1/products/{id}` | Delete product | `product.delete` |
| POST | `/api/v1/products/{id}/toggle-status` | Toggle status | `product.manage` |

## Query Parameters

### Pagination
```http
GET /api/v1/users/?page=1&size=20
```
- `page`: Page number (default: 1)
- `size`: Items per page (default: 20, max: 100)

### Filtering
```http
GET /api/v1/users/?is_active=true&role=admin
```

### Searching
```http
GET /api/v1/users/?search=john
```

### Sorting
```http
GET /api/v1/users/?sort_by=created_at&sort_order=desc
```
- `sort_by`: Field to sort by
- `sort_order`: `asc` or `desc` (default: asc)

### Date Filtering
```http
GET /api/v1/activity-logs/?created_after=2023-01-01&created_before=2023-12-31
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Successful GET, PUT requests |
| 201 | Created - Successful POST requests |
| 204 | No Content - Successful DELETE requests |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Error Handling

### Validation Errors
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### Business Logic Errors
```json
{
  "detail": "User already exists with this email",
  "error_code": "USER_EXISTS",
  "status": "error"
}
```

### Permission Errors
```json
{
  "detail": "Not enough permissions",
  "error_code": "PERMISSION_DENIED",
  "required_permission": "user.create"
}
```

## Rate Limiting

API endpoints have rate limiting applied:

- **Anonymous users**: 100 requests/hour
- **Authenticated users**: 1000 requests/hour
- **Admin users**: 5000 requests/hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## OpenAPI Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Frontend Integration
The frontend includes an integrated Swagger UI at:
- `http://localhost:3000/api-docs`

## SDK and Code Examples

### Python SDK
```python
import httpx
from fastapi import HTTPException

class FastNextClient:
    def __init__(self, base_url: str, token: str = None):
        self.base_url = base_url
        self.token = token
        self.client = httpx.AsyncClient()

    async def login(self, email: str, password: str):
        response = await self.client.post(
            f"{self.base_url}/api/v1/auth/login/access-token",
            json={"username": email, "password": password}
        )
        data = response.json()
        self.token = data["access_token"]
        return data

    async def get_users(self, page: int = 1, size: int = 20):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = await self.client.get(
            f"{self.base_url}/api/v1/users/",
            headers=headers,
            params={"page": page, "size": size}
        )
        return response.json()
```

### JavaScript/TypeScript SDK
```typescript
class FastNextAPI {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  async getUsers(page = 1, size = 20) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/users/?page=${page}&size=${size}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return response.json();
  }
}
```

## Testing the API

### Using curl
```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login/access-token" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@example.com", "password": "admin123"}'

# Use token
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:8000/api/v1/users/" \
  -H "Authorization: Bearer $TOKEN"
```

### Using HTTPie
```bash
# Login
http POST localhost:8000/api/v1/auth/login/access-token \
  username=admin@example.com password=admin123

# Use token
http GET localhost:8000/api/v1/users/ \
  Authorization:"Bearer your_jwt_token_here"
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if token is included in Authorization header
   - Verify token hasn't expired
   - Ensure token format is correct: `Bearer <token>`

2. **403 Forbidden**
   - User lacks required permissions
   - Check user roles and permissions
   - Verify resource ownership for owner-based permissions

3. **422 Validation Error**
   - Request body doesn't match expected schema
   - Check required fields and data types
   - Review API documentation for correct format

4. **429 Rate Limited**
   - Requests exceeded rate limit
   - Wait for rate limit reset
   - Consider implementing exponential backoff

### Getting Help

- **Documentation**: Check the full API documentation at `/docs`
- **Support**: Contact the development team
- **Issues**: Report bugs in the project repository
- **Community**: Join the developer community for discussions

This API reference provides comprehensive information for integrating with the FastNext backend. For the most up-to-date information, always refer to the interactive OpenAPI documentation at `/docs`.
