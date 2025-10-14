#!/usr/bin/env python3
"""
Simple OpenAPI export script for FastNext Framework
This script creates OpenAPI documentation and Postman collections without dependencies
"""

import json
import os
from pathlib import Path


def create_basic_openapi_spec():
    """Create a basic OpenAPI specification for FastNext Framework"""

    return {
        "openapi": "3.0.2",
        "info": {
            "title": "FastNext Framework API",
            "description": "A comprehensive full-stack web application framework built with modern technologies for rapid development and enterprise-grade app building.",
            "version": "1.0.0",
            "contact": {
                "name": "FastNext Framework",
                "url": "https://github.com/your-username/FastNext",
            },
            "license": {
                "name": "MIT License",
                "url": "https://opensource.org/licenses/MIT",
            },
        },
        "servers": [
            {"url": "http://localhost:8000", "description": "Development server"},
            {"url": "https://api.yourdomain.com", "description": "Production server"},
        ],
        "components": {
            "securitySchemes": {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "JWT access token obtained from /auth/login endpoint",
                }
            },
            "schemas": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer", "example": 1},
                        "username": {"type": "string", "example": "johndoe"},
                        "email": {
                            "type": "string",
                            "format": "email",
                            "example": "john@example.com",
                        },
                        "full_name": {"type": "string", "example": "John Doe"},
                        "is_active": {"type": "boolean", "example": True},
                        "created_at": {"type": "string", "format": "date-time"},
                        "updated_at": {"type": "string", "format": "date-time"},
                    },
                },
                "UserCreate": {
                    "type": "object",
                    "required": ["username", "email", "password"],
                    "properties": {
                        "username": {"type": "string", "example": "johndoe"},
                        "email": {
                            "type": "string",
                            "format": "email",
                            "example": "john@example.com",
                        },
                        "password": {"type": "string", "example": "SecurePassword123!"},
                        "full_name": {"type": "string", "example": "John Doe"},
                    },
                },
                "LoginRequest": {
                    "type": "object",
                    "required": ["username", "password"],
                    "properties": {
                        "username": {"type": "string", "example": "johndoe"},
                        "password": {"type": "string", "example": "SecurePassword123!"},
                    },
                },
                "Token": {
                    "type": "object",
                    "properties": {
                        "access_token": {
                            "type": "string",
                            "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        },
                        "token_type": {"type": "string", "example": "bearer"},
                        "expires_in": {"type": "integer", "example": 3600},
                    },
                },
                "Project": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer", "example": 1},
                        "name": {"type": "string", "example": "My Project"},
                        "description": {
                            "type": "string",
                            "example": "Project description",
                        },
                        "owner_id": {"type": "integer", "example": 1},
                        "created_at": {"type": "string", "format": "date-time"},
                        "updated_at": {"type": "string", "format": "date-time"},
                    },
                },
                "Error": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string", "example": "Error message"}
                    },
                },
            },
        },
        "security": [{"BearerAuth": []}],
        "paths": {
            "/api/v1/auth/login": {
                "post": {
                    "tags": ["Authentication"],
                    "summary": "User Login",
                    "description": "Authenticate user and return JWT access token",
                    "security": [],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/LoginRequest"}
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "Successful login",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Token"}
                                }
                            },
                        },
                        "401": {
                            "description": "Invalid credentials",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            },
                        },
                    },
                }
            },
            "/api/v1/auth/register": {
                "post": {
                    "tags": ["Authentication"],
                    "summary": "User Registration",
                    "description": "Register a new user account",
                    "security": [],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UserCreate"}
                            }
                        },
                    },
                    "responses": {
                        "201": {
                            "description": "User created successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/User"}
                                }
                            },
                        },
                        "400": {
                            "description": "Validation error",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            },
                        },
                    },
                }
            },
            "/api/v1/auth/me": {
                "get": {
                    "tags": ["Authentication"],
                    "summary": "Get Current User",
                    "description": "Get current authenticated user information",
                    "responses": {
                        "200": {
                            "description": "Current user information",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/User"}
                                }
                            },
                        },
                        "401": {
                            "description": "Not authenticated",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            },
                        },
                    },
                }
            },
            "/api/v1/users": {
                "get": {
                    "tags": ["Users"],
                    "summary": "List Users",
                    "description": "Get a list of all users (admin only)",
                    "parameters": [
                        {
                            "name": "skip",
                            "in": "query",
                            "description": "Number of users to skip",
                            "schema": {"type": "integer", "default": 0},
                        },
                        {
                            "name": "limit",
                            "in": "query",
                            "description": "Maximum number of users to return",
                            "schema": {"type": "integer", "default": 100},
                        },
                    ],
                    "responses": {
                        "200": {
                            "description": "List of users",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/User"},
                                    }
                                }
                            },
                        }
                    },
                },
                "post": {
                    "tags": ["Users"],
                    "summary": "Create User",
                    "description": "Create a new user (admin only)",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UserCreate"}
                            }
                        },
                    },
                    "responses": {
                        "201": {
                            "description": "User created successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/User"}
                                }
                            },
                        }
                    },
                },
            },
            "/api/v1/users/{user_id}": {
                "get": {
                    "tags": ["Users"],
                    "summary": "Get User",
                    "description": "Get a specific user by ID",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "description": "User ID",
                            "schema": {"type": "integer"},
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "User information",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/User"}
                                }
                            },
                        },
                        "404": {"description": "User not found"},
                    },
                },
                "put": {
                    "tags": ["Users"],
                    "summary": "Update User",
                    "description": "Update a user's information",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "description": "User ID",
                            "schema": {"type": "integer"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UserCreate"}
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "User updated successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/User"}
                                }
                            },
                        }
                    },
                },
                "delete": {
                    "tags": ["Users"],
                    "summary": "Delete User",
                    "description": "Delete a user (admin only)",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "description": "User ID",
                            "schema": {"type": "integer"},
                        }
                    ],
                    "responses": {
                        "204": {"description": "User deleted successfully"},
                        "404": {"description": "User not found"},
                    },
                },
            },
            "/api/v1/projects": {
                "get": {
                    "tags": ["Projects"],
                    "summary": "List Projects",
                    "description": "Get a list of projects for the current user",
                    "responses": {
                        "200": {
                            "description": "List of projects",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {
                                            "$ref": "#/components/schemas/Project"
                                        },
                                    }
                                }
                            },
                        }
                    },
                },
                "post": {
                    "tags": ["Projects"],
                    "summary": "Create Project",
                    "description": "Create a new project",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["name"],
                                    "properties": {
                                        "name": {
                                            "type": "string",
                                            "example": "My Project",
                                        },
                                        "description": {
                                            "type": "string",
                                            "example": "Project description",
                                        },
                                    },
                                }
                            }
                        },
                    },
                    "responses": {
                        "201": {
                            "description": "Project created successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Project"}
                                }
                            },
                        }
                    },
                },
            },
            "/health": {
                "get": {
                    "tags": ["Health"],
                    "summary": "Health Check",
                    "description": "Check if the API is running",
                    "security": [],
                    "responses": {
                        "200": {
                            "description": "API is healthy",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {
                                                "type": "string",
                                                "example": "healthy",
                                            },
                                            "timestamp": {
                                                "type": "string",
                                                "format": "date-time",
                                            },
                                        },
                                    }
                                }
                            },
                        }
                    },
                }
            },
        },
        "tags": [
            {
                "name": "Authentication",
                "description": "🔐 User authentication and session management",
            },
            {"name": "Users", "description": "👥 User management operations"},
            {"name": "Projects", "description": "📂 Project management"},
            {"name": "Health", "description": "🏥 System health checks"},
        ],
    }


def export_yaml(data, output_file):
    """Export data to YAML format using basic string formatting"""

    def dict_to_yaml(obj, indent=0):
        yaml_str = ""
        spaces = "  " * indent

        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, (dict, list)):
                    yaml_str += f"{spaces}{key}:\n"
                    yaml_str += dict_to_yaml(value, indent + 1)
                elif isinstance(value, str):
                    # Handle multiline strings
                    if "\n" in value:
                        yaml_str += f"{spaces}{key}: |\n"
                        for line in value.split("\n"):
                            yaml_str += f"{spaces}  {line}\n"
                    else:
                        yaml_str += f'{spaces}{key}: "{value}"\n'
                elif isinstance(value, bool):
                    yaml_str += f"{spaces}{key}: {str(value).lower()}\n"
                else:
                    yaml_str += f"{spaces}{key}: {value}\n"
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    yaml_str += f"{spaces}-\n"
                    yaml_str += dict_to_yaml(item, indent + 1)
                else:
                    yaml_str += f"{spaces}- {item}\n"

        return yaml_str

    yaml_content = dict_to_yaml(data)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(yaml_content)


def create_postman_collection(openapi_spec):
    """Create a Postman collection from OpenAPI spec"""

    collection = {
        "info": {
            "name": f"{openapi_spec['info']['title']} API",
            "description": openapi_spec["info"]["description"],
            "version": openapi_spec["info"]["version"],
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{access_token}}", "type": "string"}],
        },
        "variable": [
            {"key": "base_url", "value": "http://localhost:8000", "type": "string"},
            {"key": "access_token", "value": "", "type": "string"},
        ],
        "item": [],
    }

    # Group endpoints by tags
    tag_groups = {}

    for path, methods in openapi_spec.get("paths", {}).items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "delete", "patch"]:
                tags = details.get("tags", ["Other"])
                tag = tags[0] if tags else "Other"

                if tag not in tag_groups:
                    tag_groups[tag] = {"name": tag, "item": []}

                # Create request
                request = {
                    "name": details.get("summary", f"{method.upper()} {path}"),
                    "request": {
                        "method": method.upper(),
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json",
                                "type": "text",
                            }
                        ],
                        "url": {
                            "raw": "{{base_url}}" + path,
                            "host": ["{{base_url}}"],
                            "path": (
                                path.strip("/").split("/") if path.strip("/") else []
                            ),
                        },
                        "description": details.get("description", ""),
                    },
                }

                # Add auth if needed (skip for login/register)
                if "security" not in details and path not in [
                    "/api/v1/auth/login",
                    "/api/v1/auth/register",
                    "/health",
                ]:
                    request["request"]["auth"] = {
                        "type": "bearer",
                        "bearer": [
                            {
                                "key": "token",
                                "value": "{{access_token}}",
                                "type": "string",
                            }
                        ],
                    }

                # Add request body for POST/PUT/PATCH
                if (
                    method.lower() in ["post", "put", "patch"]
                    and "requestBody" in details
                ):
                    content = details["requestBody"].get("content", {})
                    if "application/json" in content:
                        schema_ref = content["application/json"].get("schema", {})
                        if "$ref" in schema_ref:
                            schema_name = schema_ref["$ref"].split("/")[-1]
                            if schema_name == "LoginRequest":
                                example = {
                                    "username": "your_username",
                                    "password": "your_password",
                                }
                            elif schema_name == "UserCreate":
                                example = {
                                    "username": "johndoe",
                                    "email": "john@example.com",
                                    "password": "SecurePassword123!",
                                    "full_name": "John Doe",
                                }
                            else:
                                example = {"key": "value"}
                        else:
                            example = {"key": "value"}

                        request["request"]["body"] = {
                            "mode": "raw",
                            "raw": json.dumps(example, indent=2),
                        }

                # Add query parameters
                parameters = details.get("parameters", [])
                query_params = [p for p in parameters if p.get("in") == "query"]
                if query_params:
                    request["request"]["url"]["query"] = [
                        {
                            "key": param["name"],
                            "value": param.get("schema", {}).get("default", ""),
                            "description": param.get("description", ""),
                            "disabled": not param.get("required", False),
                        }
                        for param in query_params
                    ]

                tag_groups[tag]["item"].append(request)

    collection["item"] = list(tag_groups.values())

    # Add pre-request script for auto-token handling
    collection["event"] = [
        {
            "listen": "test",
            "script": {
                "type": "text/javascript",
                "exec": [
                    "// Auto-save token from login response",
                    "if (pm.response.code === 200 && pm.request.url.toString().includes('/auth/login')) {",
                    "    const responseJson = pm.response.json();",
                    "    if (responseJson.access_token) {",
                    "        pm.collectionVariables.set('access_token', responseJson.access_token);",
                    "        console.log('✅ Access token saved automatically');",
                    "    }",
                    "}",
                ],
            },
        }
    ]

    return collection


def main():
    """Main export function"""
    print("🚀 Exporting FastNext Framework API Documentation...")

    # Create exports directory
    exports_dir = Path("exports")
    exports_dir.mkdir(exist_ok=True)

    # Generate OpenAPI spec
    openapi_spec = create_basic_openapi_spec()

    # Export JSON
    json_file = exports_dir / "openapi.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(openapi_spec, f, indent=2, ensure_ascii=False)
    print(f"✅ OpenAPI JSON exported to: {json_file}")

    # Export YAML
    yaml_file = exports_dir / "openapi.yaml"
    export_yaml(openapi_spec, yaml_file)
    print(f"✅ OpenAPI YAML exported to: {yaml_file}")

    # Create Postman collection
    postman_collection = create_postman_collection(openapi_spec)
    postman_file = exports_dir / "fastnext-postman-collection.json"
    with open(postman_file, "w", encoding="utf-8") as f:
        json.dump(postman_collection, f, indent=2, ensure_ascii=False)
    print(f"✅ Postman collection exported to: {postman_file}")

    print("\n✅ Export completed successfully!")
    print(f"📁 Files available in: {exports_dir.absolute()}")
    print("\n📋 Next steps:")
    print("1. Import the Postman collection into Postman")
    print("2. Set up your environment variables (base_url)")
    print("3. Use /auth/login to get an access token")
    print("4. Start testing your API endpoints!")


if __name__ == "__main__":
    main()
