# API Documentation Export Guide

This guide explains how to export the FastNext Framework API documentation in various formats for external use.

## Overview

The FastNext Framework provides comprehensive API documentation through OpenAPI/Swagger. You can export this documentation in multiple formats:

- **OpenAPI JSON** - Standard OpenAPI specification format
- **OpenAPI YAML** - Human-readable YAML format
- **Postman Collection** - Ready-to-import Postman collection
- **Insomnia Collection** - Ready-to-import Insomnia collection

## Quick Export

### Option 1: Using the Export Script (Recommended)

```bash
# Navigate to backend directory
cd backend

# Run the export script
./export-api-docs.sh
```

This will create an `exports/` directory with all format variations.

### Option 2: Manual Export

#### Export OpenAPI JSON
```bash
# Start the backend server
cd backend
python main.py

# In another terminal, export the JSON
curl http://localhost:8000/api/v1/openapi.json > openapi.json
```

#### Convert JSON to YAML
```bash
# Install yq if not present
pip install yq

# Convert JSON to YAML
cat openapi.json | yq -y . > openapi.yaml
```

## Import Instructions

### Postman

1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `fastnext-postman-collection.json`
5. Click **Import**

#### Setting up Authentication in Postman

1. After importing, go to the collection settings
2. Go to **Variables** tab
3. Set the `base_url` variable to your server URL (e.g., `http://localhost:8000`)
4. Use the `/auth/login` endpoint to get an access token
5. The token will be automatically saved to the `access_token` variable

### Insomnia

1. Open Insomnia
2. Click **Create** → **Import From** → **File**
3. Select `fastnext-insomnia-collection.json`
4. Click **Import**

#### Setting up Authentication in Insomnia

1. Go to **Manage Environments**
2. Set the `base_url` to your server URL
3. Use the login endpoint to get a token
4. Set the `access_token` environment variable

### Other API Clients

For other tools that support OpenAPI:

1. Import the `openapi.yaml` or `openapi.json` file
2. Configure the base URL to point to your FastNext backend
3. Set up Bearer token authentication using the `/auth/login` endpoint

## Environment Variables

When using the exported collections, configure these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | Backend server URL | `http://localhost:8000` |
| `access_token` | JWT access token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Authentication Flow

1. **Register/Login**: Use the `/auth/register` or `/auth/login` endpoint
2. **Get Token**: Extract the `access_token` from the response
3. **Set Variable**: Add the token to your API client's environment variables
4. **Test Endpoints**: All protected endpoints will automatically use the token

### Example Login Request

```json
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### Example Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## Available Endpoints

The exported documentation includes all FastNext Framework endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/me` - Current user info

### User Management
- `GET /users` - List users
- `POST /users` - Create user
- `GET /users/{id}` - Get user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project

### Components & Pages
- Component management endpoints
- Page management endpoints
- Asset management endpoints

### RBAC (Role-Based Access Control)
- Role management endpoints
- Permission management endpoints
- User role assignments

### Audit & Monitoring
- Activity logs
- Audit trails
- Security events

## Advanced Usage

### Custom Export Scripts

You can create custom export scripts for specific needs:

```python
from main import create_app
import json

app = create_app()
openapi_schema = app.openapi()

# Custom processing
filtered_schema = {
    "openapi": openapi_schema["openapi"],
    "info": openapi_schema["info"],
    "paths": {
        path: details 
        for path, details in openapi_schema["paths"].items()
        if path.startswith("/api/v1/users")  # Only user endpoints
    }
}

with open("users-api.json", "w") as f:
    json.dump(filtered_schema, f, indent=2)
```

### Environment-Specific Exports

Create different collections for different environments:

```bash
# Development
export BASE_URL=http://localhost:8000
python scripts/export_openapi.py

# Staging
export BASE_URL=https://staging-api.yourdomain.com
python scripts/export_openapi.py

# Production
export BASE_URL=https://api.yourdomain.com
python scripts/export_openapi.py
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   pip install pyyaml fastapi
   ```

2. **Server Not Running**
   ```bash
   cd backend
   python main.py
   ```

3. **Port Already in Use**
   ```bash
   # Check what's using port 8000
   lsof -i :8000
   # Kill the process or use a different port
   ```

4. **Permission Errors**
   ```bash
   chmod +x export-api-docs.sh
   ```

### Validation

After export, validate your OpenAPI files:

```bash
# Install swagger-codegen-cli
npm install -g swagger-codegen-cli

# Validate OpenAPI spec
swagger-codegen-cli validate -i openapi.yaml
```

## Integration with CI/CD

Add API documentation export to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Export API Documentation
  run: |
    cd backend
    ./export-api-docs.sh
    
- name: Upload API Docs
  uses: actions/upload-artifact@v3
  with:
    name: api-documentation
    path: backend/exports/
```

## Keeping Documentation Updated

### Automated Updates

Set up automatic documentation updates when the API changes:

1. **Git Hooks**: Export docs on every commit
2. **CI/CD**: Update docs on deployment
3. **Scheduled Jobs**: Regular exports to catch changes

### Version Management

Maintain documentation versions alongside code:

```bash
# Tag documentation with version
git tag -a v1.0.0-docs -m "API Documentation v1.0.0"

# Export with version
export API_VERSION=v1.0.0
python scripts/export_openapi.py
```

This comprehensive guide should help you export and use the FastNext Framework API documentation effectively across different tools and environments.