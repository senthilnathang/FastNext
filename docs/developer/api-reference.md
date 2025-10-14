# FastNext Framework API Reference

## Overview

The FastNext Framework provides a comprehensive REST API for building modern web applications. This reference covers all available endpoints, authentication, and usage examples.

## Base URL
```
https://api.fastnext.dev/api/v1
```

## Authentication

All API requests require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

## Response Format

All responses follow a consistent format:

```json
{
  "data": {},
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    },
    "version": "1.5"
  },
  "errors": []
}
```

## Error Responses

```json
{
  "data": null,
  "meta": { "version": "1.5" },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "field": "email",
      "details": {}
    }
  ]
}
```

## Core Resources

### Users

#### Get Current User
```http
GET /users/me
```

**Response:**
```json
{
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-12-01T10:30:00Z"
  }
}
```

#### Update User Profile
```http
PATCH /users/me
Content-Type: application/json

{
  "name": "John Smith",
  "preferences": {
    "theme": "dark",
    "locale": "en-US"
  }
}
```

### Projects

#### List Projects
```http
GET /projects?page=1&limit=20&search=web
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search term
- `sort`: Sort field (created_at, updated_at, name)
- `order`: Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "proj_123",
      "name": "E-commerce Platform",
      "description": "Modern e-commerce solution",
      "status": "active",
      "owner_id": "user_123",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-12-01T00:00:00Z",
      "members_count": 5
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

#### Create Project
```http
POST /projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "settings": {
    "visibility": "private",
    "features": ["collaboration", "versioning"]
  }
}
```

#### Get Project Details
```http
GET /projects/{project_id}
```

#### Update Project
```http
PATCH /projects/{project_id}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /projects/{project_id}
```

### Data Management

#### List Records
```http
GET /data/{resource}?page=1&limit=20&filters[field]=value&sort=created_at&order=desc
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `filters[field]`: Field filters
- `sort`, `order`: Sorting
- `search`: Full-text search
- `include`: Related data to include

#### Create Record
```http
POST /data/{resource}
Content-Type: application/json

{
  "field1": "value1",
  "field2": "value2",
  "relationships": {
    "related_resource": "resource_id"
  }
}
```

#### Bulk Operations
```http
POST /data/{resource}/bulk
Content-Type: application/json

{
  "operation": "create|update|delete",
  "records": [
    { "id": "1", "field": "value" },
    { "id": "2", "field": "value" }
  ]
}
```

### File Management

#### Upload File
```http
POST /assets/upload
Content-Type: multipart/form-data

file: <file_data>
metadata: {"category": "images", "tags": ["logo"]}
```

**Response:**
```json
{
  "data": {
    "id": "asset_123",
    "filename": "logo.png",
    "url": "https://cdn.fastnext.dev/assets/logo.png",
    "size": 1024000,
    "mime_type": "image/png",
    "metadata": {
      "category": "images",
      "tags": ["logo"]
    }
  }
}
```

#### List Assets
```http
GET /assets?category=images&page=1&limit=20
```

#### Delete Asset
```http
DELETE /assets/{asset_id}
```

### Real-time Collaboration

#### WebSocket Connection
```javascript
const ws = new WebSocket('wss://api.fastnext.dev/api/v1/collaboration/documents/{document_id}');

// Send cursor update
ws.send(JSON.stringify({
  type: 'cursor_update',
  position: { x: 100, y: 200 },
  selection: { start: 10, end: 20 }
}));

// Send content change
ws.send(JSON.stringify({
  type: 'content_change',
  operation: {
    type: 'insert',
    position: 10,
    content: 'Hello World'
  }
}));
```

#### Get Active Users
```http
GET /collaboration/documents/{document_id}/users
```

**Response:**
```json
{
  "data": {
    "users": [
      {
        "user_id": "user_123",
        "name": "John Doe",
        "status": "active",
        "last_seen": "2024-12-01T10:30:00Z"
      }
    ]
  }
}
```

### Notifications

#### Get Notifications
```http
GET /notifications?page=1&limit=20&status=unread
```

#### Mark as Read
```http
PATCH /notifications/{notification_id}
Content-Type: application/json

{
  "status": "read"
}
```

#### Bulk Mark Read
```http
PATCH /notifications/bulk
Content-Type: application/json

{
  "ids": ["notif_1", "notif_2"],
  "status": "read"
}
```

### Analytics & Reporting

#### Get Dashboard Metrics
```http
GET /analytics/dashboard?period=30d&metrics=users,projects,activity
```

**Response:**
```json
{
  "data": {
    "period": "30d",
    "metrics": {
      "users": {
        "total": 1250,
        "active": 890,
        "new": 45
      },
      "projects": {
        "total": 156,
        "active": 134,
        "completed": 22
      },
      "activity": {
        "page_views": 45600,
        "api_calls": 125000,
        "errors": 12
      }
    }
  }
}
```

#### Export Report
```http
POST /analytics/export
Content-Type: application/json

{
  "type": "csv|pdf|xlsx",
  "metrics": ["users", "projects"],
  "date_range": {
    "start": "2024-11-01",
    "end": "2024-11-30"
  },
  "filters": {
    "project_status": "active"
  }
}
```

### Security & Compliance

#### Get Security Events
```http
GET /security/events?page=1&limit=50&severity=high&start_date=2024-11-01
```

#### Run Compliance Check
```http
POST /compliance/check
Content-Type: application/json

{
  "standards": ["gdpr", "hipaa"],
  "scope": "full"
}
```

#### Get Audit Trail
```http
GET /audit/events?user_id=user_123&start_date=2024-11-01&end_date=2024-11-30
```

### Internationalization

#### Get Available Locales
```http
GET /i18n/locales
```

**Response:**
```json
{
  "data": {
    "locales": [
      {
        "code": "en",
        "name": "English",
        "native_name": "English",
        "direction": "ltr"
      },
      {
        "code": "es",
        "name": "Spanish",
        "native_name": "Español",
        "direction": "ltr"
      },
      {
        "code": "ar",
        "name": "Arabic",
        "native_name": "العربية",
        "direction": "rtl"
      }
    ]
  }
}
```

#### Get Translations
```http
GET /i18n/translations/{locale}?category=ui
```

## Rate Limiting

API endpoints are rate limited based on user tier:

- **Free Tier**: 100 requests/hour
- **Pro Tier**: 1000 requests/hour
- **Enterprise Tier**: 10000 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
```

## Webhooks

Configure webhooks for real-time event notifications:

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["user.created", "project.updated"],
  "secret": "your_webhook_secret",
  "active": true
}
```

### Supported Events
- `user.created`, `user.updated`, `user.deleted`
- `project.created`, `project.updated`, `project.deleted`
- `data.created`, `data.updated`, `data.deleted`
- `security.alert`, `compliance.violation`

## SDKs & Libraries

### JavaScript/TypeScript SDK
```bash
npm install @fastnext/sdk
```

```javascript
import { FastNextClient } from '@fastnext/sdk';

const client = new FastNextClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.fastnext.dev/api/v1'
});

// Authenticate
await client.auth.login('user@example.com', 'password');

// Get data
const projects = await client.projects.list({ page: 1, limit: 20 });
```

### Python SDK
```bash
pip install fastnext-sdk
```

```python
from fastnext import FastNextClient

client = FastNextClient(api_key='your_api_key')

# Authenticate
client.auth.login('user@example.com', 'password')

# Get data
projects = client.projects.list(page=1, limit=20)
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Authentication required |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Versioning

API versions are indicated in the URL path (`/api/v1/`). Breaking changes will result in new version numbers. Non-breaking changes are backward compatible.

### Deprecation Policy
- Deprecated endpoints will be marked in documentation
- Deprecation warnings will be included in response headers
- Deprecated endpoints will be supported for 12 months after deprecation notice

## Support

For API support:
- **Documentation**: https://docs.fastnext.dev
- **Status Page**: https://status.fastnext.dev
- **Support Email**: api-support@fastnext.dev
- **Community Forum**: https://community.fastnext.dev

## Changelog

### v1.5 (Current)
- Added real-time collaboration endpoints
- Enhanced security with zero-trust architecture
- Added internationalization support
- Improved accessibility features

### v1.4
- Added advanced threat detection
- Implemented compliance automation
- Enhanced performance monitoring

### v1.3
- Added workflow engine
- Implemented dark mode
- Enhanced mobile optimization

### v1.2
- Added database optimization
- Implemented caching strategy
- Enhanced horizontal scaling

### v1.1
- Added MFA authentication
- Implemented audit trails
- Enhanced security features

### v1.0
- Initial release
- Core CRUD operations
- Basic authentication
- RESTful API design