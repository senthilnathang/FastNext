"""
API Documentation Generation for Backend Scaffolding

Generates comprehensive API documentation including:
- OpenAPI/Swagger specifications
- Interactive API documentation
- Code examples and usage guides
- Permission documentation
- Rate limiting and error documentation
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

from .backend_generator import FieldDefinition, FieldType, ModelDefinition


class DocsGenerator:
    """Generate comprehensive API documentation"""

    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()
        self.plural_name = self.snake_name + 's'
        self.permission_category = model_def.permission_category or self.snake_name

    def generate_all_docs(self):
        """Generate complete documentation suite"""
        print(f"📖 Generating API documentation for {self.model_name}...")

        # Generate OpenAPI specifications
        self.generate_openapi_spec()

        # Generate usage examples
        self.generate_usage_examples()

        # Generate permission documentation
        self.generate_permission_docs()

        # Generate error handling docs
        self.generate_error_docs()

        # Generate integration guides
        self.generate_integration_guides()

        print(f"✅ API documentation generated for {self.model_name}")

    def generate_openapi_spec(self):
        """Generate OpenAPI/Swagger specification"""
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": f"{self.model_name} API",
                "version": "1.0.0",
                "description": f"RESTful API for managing {self.model_name} resources",
                "contact": {
                    "name": "API Support",
                    "email": "support@fastnext.com"
                },
                "license": {
                    "name": "MIT",
                    "url": "https://opensource.org/licenses/MIT"
                }
            },
            "servers": [
                {
                    "url": "https://api.fastnext.com/v1",
                    "description": "Production server"
                },
                {
                    "url": "https://staging-api.fastnext.com/v1",
                    "description": "Staging server"
                },
                {
                    "url": "http://localhost:8000",
                    "description": "Development server"
                }
            ],
            "security": [
                {"BearerAuth": []}
            ],
            "components": {
                "securitySchemes": {
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT",
                        "description": "JWT token for authentication"
                    }
                },
                "schemas": self._generate_schemas(),
                "parameters": self._generate_parameters(),
                "responses": self._generate_responses(),
                "examples": self._generate_examples()
            },
            "paths": self._generate_paths(),
            "tags": [
                {
                    "name": self.plural_name,
                    "description": f"Operations related to {self.model_name} management",
                    "externalDocs": {
                        "description": f"Learn more about {self.model_name}",
                        "url": f"https://docs.fastnext.com/{self.plural_name}"
                    }
                }
            ]
        }

        # Write OpenAPI spec as JSON
        import json
        spec_file = self.base_path / "docs" / "openapi" / f"{self.snake_name}.json"
        spec_file.parent.mkdir(parents=True, exist_ok=True)
        spec_file.write_text(json.dumps(spec, indent=2))

        # Write OpenAPI spec as YAML
        try:
            import yaml
            yaml_file = self.base_path / "docs" / "openapi" / f"{self.snake_name}.yaml"
            yaml_file.write_text(yaml.dump(spec, default_flow_style=False))
        except ImportError:
            print("PyYAML not installed, skipping YAML generation")

    def _generate_schemas(self) -> Dict[str, Any]:
        """Generate OpenAPI schema definitions"""
        schemas = {}

        # Main model schema
        schemas[self.model_name] = {
            "type": "object",
            "description": f"{self.model_name} resource",
            "properties": {
                "id": {
                    "type": "integer",
                    "description": f"Unique identifier for the {self.model_name}",
                    "example": 1,
                    "readOnly": True
                },
                "created_at": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Creation timestamp",
                    "example": "2023-12-01T10:00:00Z",
                    "readOnly": True
                },
                "updated_at": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Last update timestamp",
                    "example": "2023-12-01T15:30:00Z",
                    "readOnly": True,
                    "nullable": True
                }
            },
            "required": ["id", "created_at"]
        }

        # Add custom fields
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                field_schema = self._get_field_schema(field)
                schemas[self.model_name]["properties"][field.name] = field_schema

                if field.required:
                    schemas[self.model_name]["required"].append(field.name)

        # Create schema
        schemas[f"{self.model_name}Create"] = {
            "type": "object",
            "description": f"Data for creating a new {self.model_name}",
            "properties": {},
            "required": []
        }

        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                field_schema = self._get_field_schema(field)
                # Remove readOnly for create schema
                field_schema.pop('readOnly', None)
                schemas[f"{self.model_name}Create"]["properties"][field.name] = field_schema

                if field.required:
                    schemas[f"{self.model_name}Create"]["required"].append(field.name)

        # Update schema
        schemas[f"{self.model_name}Update"] = {
            "type": "object",
            "description": f"Data for updating a {self.model_name}",
            "properties": {},
            "required": []
        }

        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                field_schema = self._get_field_schema(field)
                # Remove readOnly and make optional for update
                field_schema.pop('readOnly', None)
                schemas[f"{self.model_name}Update"]["properties"][field.name] = field_schema

        # List response schema
        schemas[f"{self.model_name}ListResponse"] = {
            "type": "object",
            "description": f"Paginated list of {self.plural_name}",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"$ref": f"#/components/schemas/{self.model_name}"}
                },
                "total": {
                    "type": "integer",
                    "description": "Total number of items",
                    "example": 100
                },
                "page": {
                    "type": "integer",
                    "description": "Current page number",
                    "example": 1
                },
                "limit": {
                    "type": "integer",
                    "description": "Items per page",
                    "example": 50
                },
                "has_next": {
                    "type": "boolean",
                    "description": "Whether there are more pages",
                    "example": True
                },
                "has_prev": {
                    "type": "boolean",
                    "description": "Whether there are previous pages",
                    "example": False
                }
            },
            "required": ["items", "total", "page", "limit", "has_next", "has_prev"]
        }

        # Error schemas
        schemas["ValidationError"] = {
            "type": "object",
            "properties": {
                "detail": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": {"type": "string"},
                            "message": {"type": "string"},
                            "type": {"type": "string"}
                        }
                    }
                }
            }
        }

        schemas["ErrorResponse"] = {
            "type": "object",
            "properties": {
                "error": {"type": "string"},
                "message": {"type": "string"},
                "timestamp": {"type": "string", "format": "date-time"}
            }
        }

        return schemas

    def _generate_parameters(self) -> Dict[str, Any]:
        """Generate reusable parameters"""
        return {
            "PageParam": {
                "name": "page",
                "in": "query",
                "description": "Page number (1-based)",
                "schema": {
                    "type": "integer",
                    "minimum": 1,
                    "default": 1
                },
                "example": 1
            },
            "LimitParam": {
                "name": "limit",
                "in": "query",
                "description": "Number of items per page",
                "schema": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": self.model_def.max_page_size,
                    "default": self.model_def.list_page_size
                },
                "example": self.model_def.list_page_size
            },
            "SearchParam": {
                "name": "search",
                "in": "query",
                "description": "Search query string",
                "schema": {"type": "string"},
                "example": "search term"
            },
            "SortByParam": {
                "name": "sort_by",
                "in": "query",
                "description": "Field to sort by",
                "schema": {
                    "type": "string",
                    "enum": [f.name for f in self.model_def.fields] + ["created_at", "updated_at"]
                },
                "example": "created_at"
            },
            "SortOrderParam": {
                "name": "sort_order",
                "in": "query",
                "description": "Sort order",
                "schema": {
                    "type": "string",
                    "enum": ["asc", "desc"],
                    "default": "desc"
                },
                "example": "desc"
            },
            f"{self.model_name}IdParam": {
                "name": "id",
                "in": "path",
                "required": True,
                "description": f"{self.model_name} ID",
                "schema": {
                    "type": "integer",
                    "minimum": 1
                },
                "example": 1
            }
        }

    def _generate_responses(self) -> Dict[str, Any]:
        """Generate reusable responses"""
        return {
            "ValidationError": {
                "description": "Validation error",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ValidationError"}
                    }
                }
            },
            "NotFound": {
                "description": f"{self.model_name} not found",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                        "example": {
                            "error": "Not Found",
                            "message": f"{self.model_name} with ID 123 not found",
                            "timestamp": "2023-12-01T10:00:00Z"
                        }
                    }
                }
            },
            "Unauthorized": {
                "description": "Authentication required",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                        "example": {
                            "error": "Unauthorized",
                            "message": "Authentication token required",
                            "timestamp": "2023-12-01T10:00:00Z"
                        }
                    }
                }
            },
            "Forbidden": {
                "description": "Insufficient permissions",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                        "example": {
                            "error": "Forbidden",
                            "message": f"Insufficient permissions to access {self.model_name}",
                            "timestamp": "2023-12-01T10:00:00Z"
                        }
                    }
                }
            }
        }

    def _generate_examples(self) -> Dict[str, Any]:
        """Generate example data"""
        examples = {}

        # Create example
        create_example = {}
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                create_example[field.name] = self._get_example_value(field)

        examples[f"{self.model_name}CreateExample"] = {
            "summary": f"Create {self.model_name} example",
            "value": create_example
        }

        # Full model example
        model_example = {
            "id": 1,
            "created_at": "2023-12-01T10:00:00Z",
            "updated_at": "2023-12-01T15:30:00Z",
            **create_example
        }

        examples[f"{self.model_name}Example"] = {
            "summary": f"{self.model_name} example",
            "value": model_example
        }

        # List example
        examples[f"{self.model_name}ListExample"] = {
            "summary": f"{self.model_name} list example",
            "value": {
                "items": [model_example],
                "total": 1,
                "page": 1,
                "limit": 50,
                "has_next": False,
                "has_prev": False
            }
        }

        return examples

    def _generate_paths(self) -> Dict[str, Any]:
        """Generate API paths/endpoints"""
        paths = {}

        # List and Create endpoints
        paths[f"/{self.plural_name}"] = {
            "get": {
                "tags": [self.plural_name],
                "summary": f"List {self.plural_name}",
                "description": f"Retrieve a paginated list of {self.plural_name} with optional filtering and search",
                "operationId": f"list{self.model_name}s",
                "security": [{"BearerAuth": []}],
                "parameters": [
                    {"$ref": "#/components/parameters/PageParam"},
                    {"$ref": "#/components/parameters/LimitParam"},
                    {"$ref": "#/components/parameters/SearchParam"},
                    {"$ref": "#/components/parameters/SortByParam"},
                    {"$ref": "#/components/parameters/SortOrderParam"}
                ],
                "responses": {
                    "200": {
                        "description": f"List of {self.plural_name}",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": f"#/components/schemas/{self.model_name}ListResponse"},
                                "examples": {
                                    "default": {"$ref": f"#/components/examples/{self.model_name}ListExample"}
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            },
            "post": {
                "tags": [self.plural_name],
                "summary": f"Create {self.model_name}",
                "description": f"Create a new {self.model_name}",
                "operationId": f"create{self.model_name}",
                "security": [{"BearerAuth": []}],
                "requestBody": {
                    "description": f"{self.model_name} data",
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{self.model_name}Create"},
                            "examples": {
                                "default": {"$ref": f"#/components/examples/{self.model_name}CreateExample"}
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": f"{self.model_name} created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": f"#/components/schemas/{self.model_name}"},
                                "examples": {
                                    "default": {"$ref": f"#/components/examples/{self.model_name}Example"}
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/ValidationError"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"},
                    "422": {"$ref": "#/components/responses/ValidationError"}
                }
            }
        }

        # Individual resource endpoints
        paths[f"/{self.plural_name}/{{id}}"] = {
            "get": {
                "tags": [self.plural_name],
                "summary": f"Get {self.model_name}",
                "description": f"Retrieve a specific {self.model_name} by ID",
                "operationId": f"get{self.model_name}",
                "security": [{"BearerAuth": []}],
                "parameters": [
                    {"$ref": f"#/components/parameters/{self.model_name}IdParam"}
                ],
                "responses": {
                    "200": {
                        "description": f"{self.model_name} details",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": f"#/components/schemas/{self.model_name}"},
                                "examples": {
                                    "default": {"$ref": f"#/components/examples/{self.model_name}Example"}
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"},
                    "404": {"$ref": "#/components/responses/NotFound"}
                }
            },
            "put": {
                "tags": [self.plural_name],
                "summary": f"Update {self.model_name}",
                "description": f"Update a specific {self.model_name}",
                "operationId": f"update{self.model_name}",
                "security": [{"BearerAuth": []}],
                "parameters": [
                    {"$ref": f"#/components/parameters/{self.model_name}IdParam"}
                ],
                "requestBody": {
                    "description": f"Updated {self.model_name} data",
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{self.model_name}Update"}
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": f"{self.model_name} updated successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": f"#/components/schemas/{self.model_name}"},
                                "examples": {
                                    "default": {"$ref": f"#/components/examples/{self.model_name}Example"}
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/ValidationError"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"},
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "422": {"$ref": "#/components/responses/ValidationError"}
                }
            },
            "delete": {
                "tags": [self.plural_name],
                "summary": f"Delete {self.model_name}",
                "description": f"Delete a specific {self.model_name}",
                "operationId": f"delete{self.model_name}",
                "security": [{"BearerAuth": []}],
                "parameters": [
                    {"$ref": f"#/components/parameters/{self.model_name}IdParam"}
                ],
                "responses": {
                    "204": {
                        "description": f"{self.model_name} deleted successfully"
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"},
                    "404": {"$ref": "#/components/responses/NotFound"}
                }
            }
        }

        # Bulk operations
        paths[f"/{self.plural_name}/bulk"] = {
            "post": {
                "tags": [self.plural_name],
                "summary": f"Bulk create {self.plural_name}",
                "description": f"Create multiple {self.plural_name} at once",
                "operationId": f"bulkCreate{self.model_name}s",
                "security": [{"BearerAuth": []}],
                "requestBody": {
                    "description": f"Array of {self.model_name} data",
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "items": {
                                        "type": "array",
                                        "items": {"$ref": f"#/components/schemas/{self.model_name}Create"}
                                    }
                                },
                                "required": ["items"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": f"{self.plural_name} created successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "items": {
                                            "type": "array",
                                            "items": {"$ref": f"#/components/schemas/{self.model_name}"}
                                        },
                                        "created_count": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/ValidationError"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            },
            "delete": {
                "tags": [self.plural_name],
                "summary": f"Bulk delete {self.plural_name}",
                "description": f"Delete multiple {self.plural_name} at once",
                "operationId": f"bulkDelete{self.model_name}s",
                "security": [{"BearerAuth": []}],
                "requestBody": {
                    "description": f"Array of {self.model_name} IDs",
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "ids": {
                                        "type": "array",
                                        "items": {"type": "integer"}
                                    }
                                },
                                "required": ["ids"]
                            }
                        }
                    }
                },
                "responses": {
                    "204": {"description": f"{self.plural_name} deleted successfully"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            }
        }

        return paths

    def _get_field_schema(self, field: FieldDefinition) -> Dict[str, Any]:
        """Generate OpenAPI schema for a field"""
        schema = {}

        if field.type == FieldType.STRING:
            schema["type"] = "string"
            if field.max_length:
                schema["maxLength"] = field.max_length
        elif field.type == FieldType.TEXT:
            schema["type"] = "string"
            schema["format"] = "text"
        elif field.type == FieldType.EMAIL:
            schema["type"] = "string"
            schema["format"] = "email"
        elif field.type == FieldType.URL:
            schema["type"] = "string"
            schema["format"] = "uri"
        elif field.type == FieldType.INTEGER:
            schema["type"] = "integer"
        elif field.type == FieldType.FLOAT:
            schema["type"] = "number"
            schema["format"] = "float"
        elif field.type == FieldType.BOOLEAN:
            schema["type"] = "boolean"
        elif field.type == FieldType.DATE:
            schema["type"] = "string"
            schema["format"] = "date"
        elif field.type == FieldType.DATETIME:
            schema["type"] = "string"
            schema["format"] = "date-time"
        elif field.type == FieldType.JSON:
            schema["type"] = "object"
            schema["additionalProperties"] = True
        elif field.type == FieldType.ENUM:
            schema["type"] = "string"
            if field.enum_values:
                schema["enum"] = field.enum_values
        elif field.type == FieldType.FOREIGN_KEY:
            schema["type"] = "integer"
            schema["format"] = "int64"

        # Add validation constraints
        if field.validation:
            if field.validation.min_length is not None:
                schema["minLength"] = field.validation.min_length
            if field.validation.max_length is not None:
                schema["maxLength"] = field.validation.max_length
            if field.validation.min_value is not None:
                schema["minimum"] = field.validation.min_value
            if field.validation.max_value is not None:
                schema["maximum"] = field.validation.max_value
            if field.validation.pattern:
                schema["pattern"] = field.validation.pattern

        # Add description and example
        if field.description:
            schema["description"] = field.description
        else:
            schema["description"] = f"{field.name.replace('_', ' ').title()}"

        if field.example is not None:
            schema["example"] = field.example
        else:
            schema["example"] = self._get_example_value(field)

        # Add nullable if applicable
        if field.nullable:
            schema["nullable"] = True

        return schema

    def _get_example_value(self, field: FieldDefinition) -> Any:
        """Generate example value for field"""
        if field.example is not None:
            return field.example

        if field.type == FieldType.STRING:
            if 'name' in field.name.lower():
                return "Sample Name"
            elif 'title' in field.name.lower():
                return "Sample Title"
            elif 'status' in field.name.lower():
                return "active"
            else:
                return "sample value"
        elif field.type == FieldType.TEXT:
            return "This is a longer text field with more detailed content."
        elif field.type == FieldType.EMAIL:
            return "user@example.com"
        elif field.type == FieldType.URL:
            return "https://example.com"
        elif field.type == FieldType.INTEGER:
            return 123
        elif field.type == FieldType.FLOAT:
            return 123.45
        elif field.type == FieldType.BOOLEAN:
            return True
        elif field.type == FieldType.DATE:
            return "2023-12-01"
        elif field.type == FieldType.DATETIME:
            return "2023-12-01T10:00:00Z"
        elif field.type == FieldType.JSON:
            return {"key": "value", "nested": {"inner": "data"}}
        elif field.type == FieldType.ENUM and field.enum_values:
            return field.enum_values[0]
        elif field.type == FieldType.FOREIGN_KEY:
            return 1
        else:
            return "example"

    def generate_usage_examples(self):
        """Generate usage examples and code snippets"""
        content = f'''# {self.model_name} API Usage Examples

This document provides comprehensive examples of how to use the {self.model_name} API endpoints.

## Authentication

All API requests require authentication using a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  https://api.fastnext.com/v1/{self.plural_name}
```

## Quick Start

### 1. Create a {self.model_name}

```bash
curl -X POST https://api.fastnext.com/v1/{self.plural_name} \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '''
{self._get_create_example_json()}
```

### 2. List {self.plural_name}

```bash
curl https://api.fastnext.com/v1/{self.plural_name} \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get a specific {self.model_name}

```bash
curl https://api.fastnext.com/v1/{self.plural_name}/1 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Update a {self.model_name}

```bash
curl -X PUT https://api.fastnext.com/v1/{self.plural_name}/1 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '''
{self._get_update_example_json()}
```

### 5. Delete a {self.model_name}

```bash
curl -X DELETE https://api.fastnext.com/v1/{self.plural_name}/1 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Advanced Usage

### Filtering and Search

#### Search {self.plural_name}
```bash
curl "https://api.fastnext.com/v1/{self.plural_name}?search=query" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Pagination
```bash
curl "https://api.fastnext.com/v1/{self.plural_name}?page=2&limit=25" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Sorting
```bash
curl "https://api.fastnext.com/v1/{self.plural_name}?sort_by=created_at&sort_order=asc" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Bulk Operations

#### Bulk Create
```bash
curl -X POST https://api.fastnext.com/v1/{self.plural_name}/bulk \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '''{{
  "items": [
{self._get_create_example_json("    ")},
{self._get_create_example_json("    ")}
  ]
}}'''
```

#### Bulk Delete
```bash
curl -X DELETE https://api.fastnext.com/v1/{self.plural_name}/bulk \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{{"ids": [1, 2, 3]}}'
```

## Code Examples

### JavaScript/TypeScript

#### Using fetch()
```javascript
const API_BASE = 'https://api.fastnext.com/v1';
const token = 'YOUR_JWT_TOKEN';

// Create {self.model_name}
async function create{self.model_name}(data) {{
  const response = await fetch(`${{API_BASE}}/{self.plural_name}`, {{
    method: 'POST',
    headers: {{
      'Authorization': `Bearer ${{token}}`,
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify(data)
  }});

  if (!response.ok) {{
    throw new Error(`HTTP ${{response.status}}: ${{response.statusText}}`);
  }}

  return await response.json();
}}

// Get {self.model_name}
async function get{self.model_name}(id) {{
  const response = await fetch(`${{API_BASE}}/{self.plural_name}/${{id}}`, {{
    headers: {{
      'Authorization': `Bearer ${{token}}`
    }}
  }});

  if (!response.ok) {{
    throw new Error(`HTTP ${{response.status}}: ${{response.statusText}}`);
  }}

  return await response.json();
}}

// List {self.plural_name}
async function list{self.model_name}s(params = {{}}) {{
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`${{API_BASE}}/{self.plural_name}?${{searchParams}}`, {{
    headers: {{
      'Authorization': `Bearer ${{token}}`
    }}
  }});

  return await response.json();
}}

// Example usage
const new{self.model_name} = await create{self.model_name}('''
{self._get_create_example_json()}
);
```

#### Using Axios
```javascript
import 'axios'
import axios

const api = axios.create({{
  baseURL: 'https://api.fastnext.com/v1',
  headers: {{
    'Authorization': `Bearer ${{token}}`
  }}
}});

// Create {self.model_name}
const create{self.model_name} = async (data) => {{
  try {{
    const response = await api.post('/{self.plural_name}', data);
    return response.data;
  }} catch (error) {{
    console.error('Error creating {self.model_name}:', error.response?.data);
    throw error;
  }}
}};

// Get {self.model_name}
const get{self.model_name} = async (id) => {{
  const response = await api.get(`/{self.plural_name}/${{id}}`);
  return response.data;
}};
```

### Python

#### Using requests
```python
import json

import requests

API_BASE = 'https://api.fastnext.com/v1'
token = 'YOUR_JWT_TOKEN'
headers = {{'Authorization': f'Bearer {{token}}'}}

# Create {self.model_name}
def create_{self.snake_name}(data):
    response = requests.post(
        f'{{API_BASE}}/{self.plural_name}',
        headers=headers,
        json=data
    )
    response.raise_for_status()
    return response.json()

# Get {self.model_name}
def get_{self.snake_name}(id):
    response = requests.get(
        f'{{API_BASE}}/{self.plural_name}/{{id}}',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

# List {self.plural_name}
def list_{self.plural_name}(**params):
    response = requests.get(
        f'{{API_BASE}}/{self.plural_name}',
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

# Example usage
new_{self.snake_name} = create_{self.snake_name}('''
{self._get_create_example_json()}
)
```

#### Using httpx (async)
```python
import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        # Create {self.model_name}
        response = await client.post(
            f'{{API_BASE}}/{self.plural_name}',
            headers=headers,
            json=data
        )
        response.raise_for_status()
        return response.json()

# Run async function
result = asyncio.run(main())
```

### PHP

```php
<?php

class {self.model_name}ApiClient {{
    private $baseUrl = 'https://api.fastnext.com/v1';
    private $token;

    public function __construct($token) {{
        $this->token = $token;
    }}

    private function makeRequest($method, $endpoint, $data = null) {{
        $curl = curl_init();

        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->token,
                'Content-Type: application/json'
            ]
        ]);

        if ($data) {{
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
        }}

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode >= 400) {{
            throw new Exception("HTTP Error: $httpCode");
        }}

        return json_decode($response, true);
    }}

    public function create{self.model_name}($data) {{
        return $this->makeRequest('POST', '/{self.plural_name}', $data);
    }}

    public function get{self.model_name}($id) {{
        return $this->makeRequest('GET', "/{self.plural_name}/$id");
    }}

    public function list{self.model_name}s($params = []) {{
        $query = http_build_query($params);
        return $this->makeRequest('GET', "/{self.plural_name}?$query");
    }}
}}

// Usage
$client = new {self.model_name}ApiClient('YOUR_JWT_TOKEN');
$new{self.model_name} = $client->create{self.model_name}('''
{self._get_create_example_json()}
);
?>
```

## Error Handling

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{{
  "error": "Validation Error",
  "message": "Invalid data provided",
  "details": [
    {{
      "field": "email",
      "message": "Invalid email format",
      "type": "format"
    }}
  ],
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

### Error Handling Examples

#### JavaScript
```javascript
try {{
  const result = await create{self.model_name}(data);
}} catch (error) {{
  if (error.response?.status === 422) {{
    console.error('Validation errors:', error.response.data.details);
  }} else if (error.response?.status === 401) {{
    console.error('Authentication required');
    // Redirect to login
  }} else {{
    console.error('Unexpected error:', error.message);
  }}
}}
```

#### Python
```python
try:
    result = create_{self.snake_name}(data)
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 422:
        print("Validation errors:", e.response.json()['details'])
    elif e.response.status_code == 401:
        print("Authentication required")
    else:
        print(f"HTTP Error: {{e.response.status_code}}")
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authenticated requests**: 1000 requests per hour per user
- **Bulk operations**: 100 requests per hour per user
- **Search requests**: 500 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## Best Practices

1. **Always handle errors appropriately**
2. **Use pagination for large datasets**
3. **Implement retry logic with exponential backoff**
4. **Cache responses when appropriate**
5. **Use bulk operations for multiple items**
6. **Include proper error handling**
7. **Respect rate limits**
8. **Use HTTPS for all requests**
9. **Keep API tokens secure**
10. **Validate data before sending requests**
'''

        self._write_file(f"docs/{self.snake_name}-usage.md", content)

    def _get_create_example_json(self, indent="") -> str:
        """Generate JSON example for create operations"""
        example = {}
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                example[field.name] = self._get_example_value(field)

        import json
        return json.dumps(example, indent=2 if not indent else None)

    def _get_update_example_json(self) -> str:
        """Generate JSON example for update operations"""
        # Just update a few fields as example
        example = {}
        count = 0
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at'] and count < 2:
                if field.type == FieldType.STRING:
                    example[field.name] = f"updated {field.name}"
                else:
                    example[field.name] = self._get_example_value(field)
                count += 1

        import json
        return json.dumps(example, indent=2)

    def generate_permission_docs(self):
        """Generate permission system documentation"""
        content = f'''# {self.model_name} Permission System

This document describes the permission system for {self.model_name} operations.

## Permission Overview

The {self.model_name} API uses a role-based access control (RBAC) system. Users must have appropriate permissions to perform operations.

## Required Permissions

### Basic CRUD Operations

| Operation | Permission Required | Description |
|-----------|-------------------|-------------|
| `GET /{self.plural_name}` | `read_{self.permission_category}` | List {self.plural_name} |
| `GET /{self.plural_name}/{{id}}` | `read_{self.permission_category}` | Get specific {self.model_name} |
| `POST /{self.plural_name}` | `create_{self.permission_category}` | Create new {self.model_name} |
| `PUT /{self.plural_name}/{{id}}` | `update_{self.permission_category}` | Update {self.model_name} |
| `DELETE /{self.plural_name}/{{id}}` | `delete_{self.permission_category}` | Delete {self.model_name} |

### Bulk Operations

| Operation | Permission Required | Description |
|-----------|-------------------|-------------|
| `POST /{self.plural_name}/bulk` | `bulk_create_{self.permission_category}` | Bulk create {self.plural_name} |
| `PUT /{self.plural_name}/bulk` | `bulk_update_{self.permission_category}` | Bulk update {self.plural_name} |
| `DELETE /{self.plural_name}/bulk` | `bulk_delete_{self.permission_category}` | Bulk delete {self.plural_name} |

### Administrative Operations

| Operation | Permission Required | Description |
|-----------|-------------------|-------------|
| Export data | `export_{self.permission_category}` | Export {self.model_name} data |
| Import data | `import_{self.permission_category}` | Import {self.model_name} data |
| Full access | `admin_{self.permission_category}` | Administrative access to all operations |

## Permission Hierarchy

```
admin_{self.permission_category}
├── All CRUD permissions
├── All bulk permissions
├── Export/import permissions
└── Field-level permissions
```

Users with `admin_{self.permission_category}` permission can perform all operations without additional permission checks.

## Access Control Models

### 1. Basic Permission Model
Users need explicit permissions for each operation type.

### 2. Ownership Model
'''

        if self.model_def.owner_field:
            content += f'''Users who own a {self.model_name} (via `{self.model_def.owner_field}` field) may have additional access rights:

- **Read**: Owners can always read their own {self.plural_name}
- **Update**: Owners can update their own {self.plural_name}
- **Delete**: Owners can delete their own {self.plural_name}

This provides a balance between security and usability.

'''

        if self.model_def.project_scoped:
            content += f'''### 3. Project-Based Model
{self.model_name} resources are scoped to projects. Users can only access resources within projects they are members of:

- **Project Members**: Can access {self.plural_name} within their projects
- **Project Admins**: Have full access to {self.plural_name} within their projects
- **System Admins**: Have access to {self.plural_name} across all projects

'''

        content += f'''## Field-Level Permissions

Some fields may require additional permissions to read or modify:

'''

        # Add sensitive fields documentation
        sensitive_fields = [f for f in self.model_def.fields
                           if f.name in ['password', 'secret', 'token', 'key'] or f.type == FieldType.EMAIL]

        if sensitive_fields:
            content += "### Sensitive Fields\n\n"
            content += "| Field | Read Permission | Write Permission |\n"
            content += "|-------|----------------|------------------|\n"

            for field in sensitive_fields:
                read_perm = f"`read_{self.permission_category}_{field.name}`"
                write_perm = f"`update_{self.permission_category}_{field.name}`"
                content += f"| `{field.name}` | {read_perm} | {write_perm} |\n"

            content += "\nWithout the appropriate field permissions, sensitive fields will be redacted in responses.\n\n"

        content += f'''## Permission Checking

### API Level
Permissions are checked at the API endpoint level before processing requests.

### Resource Level
For update and delete operations, additional checks verify the user can access the specific resource.

### Field Level
When returning data, field-level permissions determine which fields are included or redacted.

## Error Responses

### 401 Unauthorized
```json
{{
  "error": "Unauthorized",
  "message": "Authentication token required",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

### 403 Forbidden
```json
{{
  "error": "Forbidden",
  "message": "Permission 'read_{self.permission_category}' required",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

## Permission Management

### Granting Permissions
Permissions are typically managed through:
1. **Role Assignment**: Users are assigned roles that include relevant permissions
2. **Direct Permission Grant**: Specific permissions can be granted directly to users
3. **Group Membership**: Users inherit permissions from group memberships

### Checking User Permissions
To check what permissions a user has:

```bash
curl https://api.fastnext.com/v1/auth/permissions \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Common Permission Sets

#### {self.model_name} Reader
```json
[
  "read_{self.permission_category}"
]
```

#### {self.model_name} Editor
```json
[
  "read_{self.permission_category}",
  "create_{self.permission_category}",
  "update_{self.permission_category}"
]
```

#### {self.model_name} Manager
```json
[
  "read_{self.permission_category}",
  "create_{self.permission_category}",
  "update_{self.permission_category}",
  "delete_{self.permission_category}",
  "bulk_create_{self.permission_category}",
  "bulk_update_{self.permission_category}",
  "bulk_delete_{self.permission_category}"
]
```

#### {self.model_name} Administrator
```json
[
  "admin_{self.permission_category}"
]
```

## Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions needed
2. **Use Roles**: Group related permissions into roles
3. **Regular Audits**: Periodically review user permissions
4. **Logging**: Log permission-related actions for audit trails
5. **Documentation**: Keep permission documentation up to date
6. **Testing**: Test permission checks thoroughly
7. **Separation of Duties**: Separate read, write, and administrative permissions
8. **Temporary Access**: Use time-limited permissions when appropriate

## Troubleshooting

### Common Issues

1. **403 Forbidden Errors**: Check user has required permission
2. **Missing Data**: Check field-level permissions for sensitive fields
3. **Unexpected Access**: Verify ownership and project membership rules
4. **Permission Inheritance**: Check role and group assignments

### Debug Steps

1. Verify user authentication token
2. Check user's assigned permissions
3. Verify resource ownership (if applicable)
4. Check project membership (if applicable)
5. Review field-level permission requirements

### Support

For permission-related issues, contact the API support team with:
- User ID
- Attempted operation
- Error message received
- Expected behavior
'''

        self._write_file(f"docs/{self.snake_name}-permissions.md", content)

    def generate_error_docs(self):
        """Generate error handling documentation"""
        content = f'''# {self.model_name} API Error Handling

This document provides comprehensive information about error handling in the {self.model_name} API.

## Error Response Format

All API errors follow a consistent format:

```json
{{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": [
    {{
      "field": "field_name",
      "message": "Field-specific error message",
      "type": "validation_type"
    }}
  ],
  "timestamp": "2023-12-01T10:00:00Z",
  "request_id": "req_123456789"
}}
```

## HTTP Status Codes

### Success Codes (2xx)

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted successfully |

### Client Error Codes (4xx)

| Code | Status | Description | Common Causes |
|------|--------|-------------|---------------|
| 400 | Bad Request | Invalid request format | Malformed JSON, invalid parameters |
| 401 | Unauthorized | Authentication required | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions | Lack required permissions |
| 404 | Not Found | Resource not found | Invalid ID, deleted resource |
| 409 | Conflict | Resource conflict | Duplicate unique field |
| 422 | Unprocessable Entity | Validation errors | Invalid field values |
| 429 | Too Many Requests | Rate limit exceeded | Too many requests |

### Server Error Codes (5xx)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| 500 | Internal Server Error | Server error | Retry request, contact support |
| 502 | Bad Gateway | Gateway error | Retry request |
| 503 | Service Unavailable | Service temporarily unavailable | Retry with backoff |
| 504 | Gateway Timeout | Request timeout | Retry request |

## Detailed Error Types

### 400 Bad Request

**Cause**: Malformed request data or invalid parameters

**Example**:
```json
{{
  "error": "Bad Request",
  "message": "Invalid JSON format in request body",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Solutions**:
- Validate JSON format
- Check parameter types
- Review API documentation

### 401 Unauthorized

**Cause**: Missing or invalid authentication

**Example**:
```json
{{
  "error": "Unauthorized",
  "message": "Authentication token required",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Solutions**:
- Include `Authorization: Bearer <token>` header
- Verify token is valid and not expired
- Refresh authentication token

### 403 Forbidden

**Cause**: Insufficient permissions for the requested operation

**Example**:
```json
{{
  "error": "Forbidden",
  "message": "Permission 'create_{self.permission_category}' required",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Solutions**:
- Verify user has required permissions
- Check resource ownership rules
- Contact administrator for permission changes

### 404 Not Found

**Cause**: Requested resource does not exist

**Example**:
```json
{{
  "error": "Not Found",
  "message": "{self.model_name} with ID 123 not found",
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Solutions**:
- Verify resource ID is correct
- Check if resource was deleted
- Ensure user has access to resource

### 409 Conflict

**Cause**: Resource conflict, typically unique constraint violations

**Example**:
```json
{{
  "error": "Conflict",
  "message": "Resource already exists with this identifier",
  "details": [
    {{
      "field": "email",
      "message": "Email address already in use",
      "type": "unique_constraint"
    }}
  ],
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Solutions**:
- Use different values for unique fields
- Check if resource already exists
- Use update instead of create if appropriate

### 422 Unprocessable Entity

**Cause**: Request data fails validation rules

**Example**:
```json
{{
  "error": "Validation Error",
  "message": "Request contains invalid data",
  "details": [
'''

        # Add validation examples for each field type
        validation_examples = []
        for field in self.model_def.fields:
            if field.name in ['id', 'created_at', 'updated_at']:
                continue

            if field.type == FieldType.EMAIL:
                validation_examples.append(f'''    {{
      "field": "{field.name}",
      "message": "Invalid email format",
      "type": "format"
    }}''')
            elif field.required:
                validation_examples.append(f'''    {{
      "field": "{field.name}",
      "message": "Field is required",
      "type": "required"
    }}''')
            elif field.validation and field.validation.max_length:
                validation_examples.append(f'''    {{
      "field": "{field.name}",
      "message": "Exceeds maximum length of {field.validation.max_length}",
      "type": "max_length"
    }}''')

        # Take first few examples
        content += ',\n'.join(validation_examples[:3])

        content += f'''
  ],
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Common Validation Errors**:

| Field Type | Common Errors | Example |
|------------|---------------|---------|
| Email | Invalid format | "invalid-email" |
| URL | Invalid format | "not-a-url" |
| Integer | Not a number | "abc" |
| Required | Missing value | `null` or missing |
| Max Length | Too long | String exceeding limit |
| Min Length | Too short | String below minimum |
| Enum | Invalid value | Value not in allowed list |

**Solutions**:
- Validate input data before sending
- Check field requirements and constraints
- Review validation error details
- Use proper data types

### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Example**:
```json
{{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "retry_after": 60,
  "timestamp": "2023-12-01T10:00:00Z"
}}
```

**Rate Limits**:
- General API: 1000 requests/hour
- Bulk operations: 100 requests/hour
- Search operations: 500 requests/hour

**Solutions**:
- Implement exponential backoff
- Respect `Retry-After` header
- Cache responses when possible
- Use bulk operations for multiple items

## Error Handling Best Practices

### 1. Implement Proper Error Handling

#### JavaScript Example
```javascript
async function handle{self.model_name}Request(requestFn) {{
  try {{
    return await requestFn();
  }} catch (error) {{
    if (error.response) {{
      const {{ status, data }} = error.response;

      switch (status) {{
        case 400:
          console.error('Bad Request:', data.message);
          break;
        case 401:
          console.error('Unauthorized - redirecting to login');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Forbidden:', data.message);
          showPermissionError(data.message);
          break;
        case 404:
          console.error('Not Found:', data.message);
          break;
        case 422:
          console.error('Validation Errors:', data.details);
          showValidationErrors(data.details);
          break;
        case 429:
          console.error('Rate Limited - retrying after delay');
          await delay(data.retry_after * 1000);
          return handle{self.model_name}Request(requestFn);
        default:
          console.error('Unexpected error:', data.message);
      }}
    }} else {{
      console.error('Network error:', error.message);
    }}

    throw error;
  }}
}}
```

#### Python Example
```python
import requests
import time
from typing import Dict, Any

def handle_{self.snake_name}_request(request_func):
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            return request_func()
        except requests.exceptions.HTTPError as e:
            response = e.response
            status_code = response.status_code
            data = response.json() if response.content else {{}}

            if status_code == 401:
                print("Unauthorized - need to re-authenticate")
                raise
            elif status_code == 403:
                print(f"Forbidden: {{data.get('message')}}")
                raise
            elif status_code == 404:
                print(f"Not Found: {{data.get('message')}}")
                raise
            elif status_code == 422:
                print("Validation Errors:")
                for detail in data.get('details', []):
                    print(f"  {{detail['field']}}: {{detail['message']}}")
                raise
            elif status_code == 429:
                retry_after = data.get('retry_after', 60)
                print(f"Rate limited - waiting {{retry_after}} seconds")
                time.sleep(retry_after)
                retry_count += 1
                continue
            elif 500 <= status_code < 600:
                retry_count += 1
                if retry_count < max_retries:
                    delay = 2 ** retry_count  # Exponential backoff
                    print(f"Server error - retrying in {{delay}} seconds")
                    time.sleep(delay)
                    continue
                else:
                    print("Max retries exceeded")
                    raise
            else:
                print(f"Unexpected error: {{data.get('message')}}")
                raise
        except requests.exceptions.RequestException as e:
            print(f"Network error: {{e}}")
            raise

    raise Exception("Max retries exceeded")
```

### 2. Implement Retry Logic

#### Exponential Backoff
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {{
  for (let i = 0; i < maxRetries; i++) {{
    try {{
      return await fn();
    }} catch (error) {{
      if (error.response?.status >= 500 && i < maxRetries - 1) {{
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }}
      throw error;
    }}
  }}
}}
```

### 3. User-Friendly Error Messages

```javascript
function getUser{self.model_name}ErrorMessage(error) {{
  const status = error.response?.status;
  const data = error.response?.data;

  switch (status) {{
    case 400:
      return "Please check your input and try again.";
    case 401:
      return "Please log in to continue.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested {self.snake_name} was not found.";
    case 422:
      return `Please fix the following errors: ${{
        data.details?.map(d => d.message).join(', ') || 'Invalid data'
      }}`;
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Something went wrong on our end. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }}
}}
```

### 4. Logging and Monitoring

```javascript
function logError(error, context) {{
  const errorInfo = {{
    timestamp: new Date().toISOString(),
    url: context.url,
    method: context.method,
    status: error.response?.status,
    message: error.message,
    user_id: getCurrentUserId(),
    request_id: error.response?.headers['x-request-id']
  }};

  // Send to logging service
  console.error('API Error:', errorInfo);

  // Send to monitoring service (e.g., Sentry, DataDog)
  if (typeof captureException !== 'undefined') {{
    captureException(error, {{ extra: errorInfo }});
  }}
}}
```

## Testing Error Scenarios

### Unit Tests

```javascript
describe('{self.model_name} API Error Handling', () => {{
  test('handles 404 not found', async () => {{
    mockAxios.get.mockRejectedValue({{
      response: {{ status: 404, data: {{ message: '{self.model_name} not found' }} }}
    }});

    await expect(get{self.model_name}(999)).rejects.toThrow();
  }});

  test('handles validation errors', async () => {{
    const validationError = {{
      response: {{
        status: 422,
        data: {{
          details: [{{ field: 'email', message: 'Invalid email', type: 'format' }}]
        }}
      }}
    }};

    mockAxios.post.mockRejectedValue(validationError);

    await expect(create{self.model_name}({{}})).rejects.toThrow();
  }});
}});
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **Authentication Errors**
   - Verify token format and validity
   - Check token expiration
   - Ensure proper Authorization header

2. **Permission Errors**
   - Verify user has required permissions
   - Check resource ownership
   - Review role assignments

3. **Validation Errors**
   - Validate data types and formats
   - Check required fields
   - Review field constraints

4. **Rate Limiting**
   - Implement proper retry logic
   - Use bulk operations
   - Cache responses appropriately

5. **Server Errors**
   - Check system status page
   - Implement retry with backoff
   - Contact support if persistent

### Getting Help

1. Check error message and details
2. Review this documentation
3. Check system status page
4. Contact API support with:
   - Request ID (from error response)
   - Full error message
   - Steps to reproduce
   - Expected vs actual behavior
'''

        self._write_file(f"docs/{self.snake_name}-errors.md", content)

    def generate_integration_guides(self):
        """Generate integration guides for different platforms"""
        content = f'''# {self.model_name} API Integration Guide

This guide provides step-by-step instructions for integrating the {self.model_name} API into various platforms and frameworks.

## Frontend Integrations

### React Integration

#### 1. Setup
```bash
npm install axios react-query
```

#### 2. API Client Setup
```javascript
// src/api/{self.snake_name}Client.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const apiClient = axios.create({{
  baseURL: API_BASE,
  timeout: 10000,
}});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {{
  const token = localStorage.getItem('authToken');
  if (token) {{
    config.headers.Authorization = `Bearer ${{token}}`;
  }}
  return config;
}});

export const {self.snake_name}Api = {{
  getAll: (params) => apiClient.get('/{self.plural_name}', {{ params }}),
  getById: (id) => apiClient.get(`/{self.plural_name}/${{id}}`),
  create: (data) => apiClient.post('/{self.plural_name}', data),
  update: (id, data) => apiClient.put(`/{self.plural_name}/${{id}}`, data),
  delete: (id) => apiClient.delete(`/{self.plural_name}/${{id}}`)
}};
```

#### 3. React Query Hooks
```javascript
// src/hooks/use{self.model_name}.js
import {{ useQuery, useMutation, useQueryClient }} from 'react-query';
import {{ {self.snake_name}Api }} from '../api/{self.snake_name}Client';

export const use{self.model_name}s = (params) => {{
  return useQuery(
    ['{self.plural_name}', params],
    () => {self.snake_name}Api.getAll(params).then(res => res.data),
    {{ keepPreviousData: true }}
  );
}};

export const use{self.model_name} = (id) => {{
  return useQuery(
    ['{self.plural_name}', id],
    () => {self.snake_name}Api.getById(id).then(res => res.data),
    {{ enabled: !!id }}
  );
}};

export const useCreate{self.model_name} = () => {{
  const queryClient = useQueryClient();

  return useMutation(
    {self.snake_name}Api.create,
    {{
      onSuccess: () => {{
        queryClient.invalidateQueries('{self.plural_name}');
      }}
    }}
  );
}};

export const useUpdate{self.model_name} = () => {{
  const queryClient = useQueryClient();

  return useMutation(
    ({{ id, data }}) => {self.snake_name}Api.update(id, data),
    {{
      onSuccess: (data, {{ id }}) => {{
        queryClient.setQueryData(['{self.plural_name}', id], data.data);
        queryClient.invalidateQueries('{self.plural_name}');
      }}
    }}
  );
}};

export const useDelete{self.model_name} = () => {{
  const queryClient = useQueryClient();

  return useMutation(
    {self.snake_name}Api.delete,
    {{
      onSuccess: () => {{
        queryClient.invalidateQueries('{self.plural_name}');
      }}
    }}
  );
}};
```

#### 4. React Components
```jsx
// src/components/{self.model_name}List.jsx
import React from 'react';
import {{ use{self.model_name}s }} from '../hooks/use{self.model_name}';

const {self.model_name}List = () => {{
  const {{ data, isLoading, error }} = use{self.model_name}s();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {{error.message}}</div>;

  return (
    <div>
      <h2>{self.model_name}s</h2>
      <ul>
        {{data?.items?.map(item => (
          <li key={{item.id}}>
            {{/* Render {self.model_name} data */}}
            {{item.name || item.title || `{self.model_name} #${{item.id}}`}}
          </li>
        ))}}
      </ul>
    </div>
  );
}};

export default {self.model_name}List;
```

### Vue.js Integration

#### 1. Setup
```bash
npm install axios @vue/composition-api
```

#### 2. Composable
```javascript
// src/composables/use{self.model_name}.js
import {{ ref, reactive }} from 'vue';
import {{ {self.snake_name}Api }} from '../api/{self.snake_name}Client';

export function use{self.model_name}s() {{
  const {self.plural_name} = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetch{self.model_name}s = async (params = {{}}) => {{
    loading.value = true;
    error.value = null;

    try {{
      const response = await {self.snake_name}Api.getAll(params);
      {self.plural_name}.value = response.data.items;
    }} catch (err) {{
      error.value = err;
    }} finally {{
      loading.value = false;
    }}
  }};

  const create{self.model_name} = async (data) => {{
    try {{
      const response = await {self.snake_name}Api.create(data);
      {self.plural_name}.value.push(response.data);
      return response.data;
    }} catch (err) {{
      error.value = err;
      throw err;
    }}
  }};

  return {{
    {self.plural_name}: readonly({self.plural_name}),
    loading: readonly(loading),
    error: readonly(error),
    fetch{self.model_name}s,
    create{self.model_name}
  }};
}}
```

### Next.js Integration

#### 1. API Routes
```javascript
// pages/api/{self.plural_name}/[id].js
import {{ {self.snake_name}Api }} from '../../../lib/{self.snake_name}Api';

export default async function handler(req, res) {{
  const {{ id }} = req.query;

  try {{
    switch (req.method) {{
      case 'GET':
        const {self.snake_name} = await {self.snake_name}Api.getById(id);
        res.status(200).json({self.snake_name});
        break;

      case 'PUT':
        const updated = await {self.snake_name}Api.update(id, req.body);
        res.status(200).json(updated);
        break;

      case 'DELETE':
        await {self.snake_name}Api.delete(id);
        res.status(204).end();
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${{req.method}} Not Allowed`);
    }}
  }} catch (error) {{
    res.status(error.response?.status || 500).json({{
      error: error.message
    }});
  }}
}}
```

#### 2. SSR/SSG Pages
```javascript
// pages/{self.plural_name}/index.js
import {{ GetServerSideProps }} from 'next';
import {{ {self.snake_name}Api }} from '../../lib/{self.snake_name}Api';

export default function {self.model_name}sPage({{ {self.plural_name} }}) {{
  return (
    <div>
      <h1>{self.model_name}s</h1>
      <ul>
        {{{self.plural_name}.map(item => (
          <li key={{item.id}}>{{item.name}}</li>
        ))}}
      </ul>
    </div>
  );
}}

export const getServerSideProps = async () => {{
  try {{
    const response = await {self.snake_name}Api.getAll();
    return {{
      props: {{
        {self.plural_name}: response.data.items
      }}
    }};
  }} catch (error) {{
    return {{
      props: {{
        {self.plural_name}: []
      }}
    }};
  }}
}};
```

## Backend Integrations

### Node.js/Express Integration

#### 1. Setup
```bash
npm install express axios dotenv
```

#### 2. Express Routes
```javascript
// routes/{self.plural_name}.js
const express = require('express');
const {{ {self.snake_name}Api }} = require('../lib/{self.snake_name}Api');

const router = express.Router();

// Middleware for auth
const authenticate = (req, res, next) => {{
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {{
    return res.status(401).json({{ error: 'Authentication required' }});
  }}
  req.userToken = token;
  next();
}};

// Get all {self.plural_name}
router.get('/', authenticate, async (req, res) => {{
  try {{
    const response = await {self.snake_name}Api.getAll(req.query, req.userToken);
    res.json(response.data);
  }} catch (error) {{
    res.status(error.response?.status || 500).json({{
      error: error.message
    }});
  }}
}});

// Create {self.model_name}
router.post('/', authenticate, async (req, res) => {{
  try {{
    const response = await {self.snake_name}Api.create(req.body, req.userToken);
    res.status(201).json(response.data);
  }} catch (error) {{
    res.status(error.response?.status || 500).json({{
      error: error.message
    }});
  }}
}});

module.exports = router;
```

### Django Integration

#### 1. Setup
```python
# requirements.txt
requests==2.31.0
django-environ==0.11.2
```

#### 2. API Client
```python
# services/{self.snake_name}_service.py
import requests
from django.conf import settings
from typing import Dict, List, Optional

class {self.model_name}Service:
    def __init__(self, user_token: str):
        self.base_url = settings.FASTNEXT_API_BASE
        self.headers = {{
            'Authorization': f'Bearer {{user_token}}',
            'Content-Type': 'application/json'
        }}

    def get_all(self, params: Dict = None) -> Dict:
        response = requests.get(
            f'{{self.base_url}}/{self.plural_name}',
            headers=self.headers,
            params=params or {{}}
        )
        response.raise_for_status()
        return response.json()

    def get_by_id(self, id: int) -> Dict:
        response = requests.get(
            f'{{self.base_url}}/{self.plural_name}/{{id}}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def create(self, data: Dict) -> Dict:
        response = requests.post(
            f'{{self.base_url}}/{self.plural_name}',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
```

#### 3. Django Views
```python
# views/{self.snake_name}_views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .services.{self.snake_name}_service import {self.model_name}Service

@login_required
def {self.snake_name}_list(request):
    service = {self.model_name}Service(request.user.api_token)

    try:
        data = service.get_all(request.GET.dict())
        return render(request, '{self.plural_name}/list.html', {{
            '{self.plural_name}': data['items'],
            'total': data['total']
        }})
    except requests.exceptions.HTTPError as e:
        return JsonResponse({{
            'error': 'Failed to fetch {self.plural_name}'
        }}, status=500)

@login_required
def create_{self.snake_name}(request):
    if request.method == 'POST':
        service = {self.model_name}Service(request.user.api_token)

        try:
            data = service.create(request.POST.dict())
            return JsonResponse(data, status=201)
        except requests.exceptions.HTTPError as e:
            return JsonResponse({{
                'error': 'Failed to create {self.snake_name}'
            }}, status=e.response.status_code)

    return render(request, '{self.plural_name}/create.html')
```

### Laravel Integration

#### 1. Setup
```bash
composer require guzzlehttp/guzzle
```

#### 2. Service Class
```php
<?php
// app/Services/{self.model_name}Service.php

namespace App\\Services;

use GuzzleHttp\\Client;
use GuzzleHttp\\Exception\\RequestException;

class {self.model_name}Service
{{
    private $client;
    private $baseUrl;
    private $token;

    public function __construct($userToken)
    {{
        $this->baseUrl = config('services.fastnext.base_url');
        $this->token = $userToken;
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->token,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ]
        ]);
    }}

    public function getAll($params = [])
    {{
        try {{
            $response = $this->client->get('/{self.plural_name}', [
                'query' => $params
            ]);

            return json_decode($response->getBody(), true);
        }} catch (RequestException $e) {{
            throw new \\Exception('Failed to fetch {self.plural_name}: ' . $e->getMessage());
        }}
    }}

    public function create($data)
    {{
        try {{
            $response = $this->client->post('/{self.plural_name}', [
                'json' => $data
            ]);

            return json_decode($response->getBody(), true);
        }} catch (RequestException $e) {{
            throw new \\Exception('Failed to create {self.snake_name}: ' . $e->getMessage());
        }}
    }}
}}
```

#### 3. Controller
```php
<?php
// app/Http/Controllers/{self.model_name}Controller.php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use App\\Services\\{self.model_name}Service;

class {self.model_name}Controller extends Controller
{{
    public function index(Request $request)
    {{
        $service = new {self.model_name}Service(auth()->user()->api_token);

        try {{
            $data = $service->getAll($request->query());

            return view('{self.plural_name}.index', [
                '{self.plural_name}' => $data['items'],
                'pagination' => [
                    'total' => $data['total'],
                    'page' => $data['page'],
                    'limit' => $data['limit']
                ]
            ]);
        }} catch (\\Exception $e) {{
            return back()->withError('Failed to load {self.plural_name}');
        }}
    }}

    public function store(Request $request)
    {{
        $service = new {self.model_name}Service(auth()->user()->api_token);

        try {{
            ${self.snake_name} = $service->create($request->validated());

            return redirect()->route('{self.plural_name}.index')
                           ->with('success', '{self.model_name} created successfully');
        }} catch (\\Exception $e) {{
            return back()->withError('Failed to create {self.snake_name}')
                        ->withInput();
        }}
    }}
}}
```

## Mobile Integrations

### React Native

#### 1. Setup
```bash
npm install axios @react-native-async-storage/async-storage
```

#### 2. API Client
```javascript
// src/services/{self.snake_name}Service.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'https://api.fastnext.com/v1';

const apiClient = axios.create({{
  baseURL: API_BASE,
  timeout: 10000,
}});

// Add auth interceptor
apiClient.interceptors.request.use(async (config) => {{
  const token = await AsyncStorage.getItem('authToken');
  if (token) {{
    config.headers.Authorization = `Bearer ${{token}}`;
  }}
  return config;
}});

export const {self.snake_name}Service = {{
  async getAll(params) {{
    const response = await apiClient.get('/{self.plural_name}', {{ params }});
    return response.data;
  }},

  async getById(id) {{
    const response = await apiClient.get(`/{self.plural_name}/${{id}}`);
    return response.data;
  }},

  async create(data) {{
    const response = await apiClient.post('/{self.plural_name}', data);
    return response.data;
  }},

  async update(id, data) {{
    const response = await apiClient.put(`/{self.plural_name}/${{id}}`, data);
    return response.data;
  }},

  async delete(id) {{
    await apiClient.delete(`/{self.plural_name}/${{id}}`);
  }}
}};
```

### Flutter Integration

#### 1. Setup
```yaml
# pubspec.yaml
dependencies:
  http: ^1.1.0
  shared_preferences: ^2.2.2
```

#### 2. API Service
```dart
// lib/services/{self.snake_name}_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class {self.model_name}Service {{
  static const String baseUrl = 'https://api.fastnext.com/v1';

  Future<String?> _getToken() async {{
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('authToken');
  }}

  Future<Map<String, String>> _getHeaders() async {{
    final token = await _getToken();
    return {{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    }};
  }}

  Future<List<dynamic>> getAll({{Map<String, String>? params}}) async {{
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/{self.plural_name}');
    final finalUri = params != null ? uri.replace(queryParameters: params) : uri;

    final response = await http.get(finalUri, headers: headers);

    if (response.statusCode == 200) {{
      final data = json.decode(response.body);
      return data['items'];
    }} else {{
      throw Exception('Failed to load {self.plural_name}');
    }}
  }}

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {{
    final headers = await _getHeaders();

    final response = await http.post(
      Uri.parse('$baseUrl/{self.plural_name}'),
      headers: headers,
      body: json.encode(data),
    );

    if (response.statusCode == 201) {{
      return json.decode(response.body);
    }} else {{
      throw Exception('Failed to create {self.snake_name}');
    }}
  }}
}}
```

## Testing Integration

### Unit Tests
```javascript
// tests/{self.snake_name}Api.test.js
import {{ {self.snake_name}Api }} from '../src/api/{self.snake_name}Client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('{self.model_name} API', () => {{
  beforeEach(() => {{
    mockedAxios.create.mockReturnThis();
    mockedAxios.interceptors.request.use.mockReturnThis();
  }});

  test('getAll returns {self.plural_name}', async () => {{
    const mockData = {{ items: [{{ id: 1, name: 'Test' }}] }};
    mockedAxios.get.mockResolvedValue({{ data: mockData }});

    const result = await {self.snake_name}Api.getAll();

    expect(result.data).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith('/{self.plural_name}', {{ params: undefined }});
  }});

  test('create creates new {self.snake_name}', async () => {{
    const newData = {{ name: 'New {self.model_name}' }};
    const mockResponse = {{ id: 1, ...newData }};
    mockedAxios.post.mockResolvedValue({{ data: mockResponse }});

    const result = await {self.snake_name}Api.create(newData);

    expect(result.data).toEqual(mockResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith('/{self.plural_name}', newData);
  }});
}});
```

### Integration Tests
```javascript
// tests/integration/{self.snake_name}.test.js
import {{ render, screen, waitFor }} from '@testing-library/react';
import {{ rest }} from 'msw';
import {{ setupServer }} from 'msw/node';
import {self.model_name}List from '../src/components/{self.model_name}List';

const server = setupServer(
  rest.get('/{self.plural_name}', (req, res, ctx) => {{
    return res(
      ctx.json({{
        items: [{{ id: 1, name: 'Test {self.model_name}' }}],
        total: 1
      }})
    );
  }})
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders {self.snake_name} list', async () => {{
  render(<{self.model_name}List />);

  await waitFor(() => {{
    expect(screen.getByText('Test {self.model_name}')).toBeInTheDocument();
  }});
}});
```

## Security Best Practices

1. **Store tokens securely** (secure storage, not localStorage for sensitive apps)
2. **Implement token refresh** mechanisms
3. **Use HTTPS** for all requests
4. **Validate API responses** on client side
5. **Implement proper error handling**
6. **Use request timeouts**
7. **Implement retry logic** with backoff
8. **Log API interactions** for debugging
9. **Sanitize user inputs** before sending
10. **Implement offline handling** for mobile apps

## Performance Optimization

1. **Use caching** strategies (React Query, SWR, etc.)
2. **Implement pagination** for large datasets
3. **Use debouncing** for search inputs
4. **Implement virtual scrolling** for long lists
5. **Optimize bundle size** (tree shaking, code splitting)
6. **Use compression** (gzip/brotli)
7. **Implement request deduplication**
8. **Use efficient data structures**
9. **Minimize API calls** with bulk operations
10. **Implement offline-first** strategies where appropriate
"""

        self._write_file(f"docs/{self.snake_name}-integration.md", content)

    def _write_file(self, relative_path: str, content: str):
        """Write content to file, creating directories as needed"""
        file_path = self.base_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)
