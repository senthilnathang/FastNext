from typing import Dict, List, Any, Optional, Union, Callable
from fastapi import FastAPI, Request, Response
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field
import json
import yaml
from datetime import datetime
from pathlib import Path
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class APIDocumentationEnhancer:
    """Enhanced API documentation with comprehensive OpenAPI features"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.setup_enhanced_docs()
    
    def setup_enhanced_docs(self):
        """Setup enhanced documentation features"""
        
        # Custom OpenAPI schema
        def custom_openapi():
            if self.app.openapi_schema:
                return self.app.openapi_schema
            
            openapi_schema = get_openapi(
                title=self.app.title,
                version=self.app.version,
                description=self.app.description,
                routes=self.app.routes,
                servers=[
                    {"url": "http://localhost:8000", "description": "Development server"},
                    {"url": "https://api.yourdomain.com", "description": "Production server"},
                ]
            )
            
            # Enhanced OpenAPI schema
            openapi_schema = self._enhance_openapi_schema(openapi_schema)
            
            self.app.openapi_schema = openapi_schema
            return self.app.openapi_schema
        
        self.app.openapi = custom_openapi
        
        # Custom documentation routes
        self._setup_custom_docs_routes()
    
    def _enhance_openapi_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance OpenAPI schema with additional metadata"""
        
        # Add comprehensive info section
        schema["info"].update({
            "contact": {
                "name": "FastNext API Support",
                "url": "https://github.com/yourusername/fastnext",
                "email": "support@yourdomain.com"
            },
            "license": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT"
            },
            "termsOfService": "https://yourdomain.com/terms",
            "x-logo": {
                "url": "https://yourdomain.com/logo.png",
                "altText": "FastNext Framework"
            }
        })
        
        # Add security schemes
        schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT token authentication"
            },
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "API key authentication"
            },
            "OAuth2": {
                "type": "oauth2",
                "flows": {
                    "authorizationCode": {
                        "authorizationUrl": "/auth/authorize",
                        "tokenUrl": "/auth/token",
                        "scopes": {
                            "read": "Read access",
                            "write": "Write access",
                            "admin": "Administrative access"
                        }
                    }
                }
            }
        }
        
        # Add global security
        schema["security"] = [
            {"BearerAuth": []},
            {"ApiKeyAuth": []}
        ]
        
        # Add tags with descriptions
        schema["tags"] = [
            {
                "name": "Authentication",
                "description": "🔐 User authentication and session management",
                "externalDocs": {
                    "description": "Authentication Guide",
                    "url": "https://docs.yourdomain.com/auth"
                }
            },
            {
                "name": "Users",
                "description": "👥 User management operations",
                "externalDocs": {
                    "description": "User Management Guide",
                    "url": "https://docs.yourdomain.com/users"
                }
            },
            {
                "name": "Projects",
                "description": "📂 Project management and collaboration",
                "externalDocs": {
                    "description": "Project Guide",
                    "url": "https://docs.yourdomain.com/projects"
                }
            },
            {
                "name": "Workflows",
                "description": "⚡ Workflow automation and management",
                "externalDocs": {
                    "description": "Workflow Guide",
                    "url": "https://docs.yourdomain.com/workflows"
                }
            },
            {
                "name": "Analytics",
                "description": "📊 Analytics and reporting",
                "externalDocs": {
                    "description": "Analytics Guide",
                    "url": "https://docs.yourdomain.com/analytics"
                }
            },
            {
                "name": "Admin",
                "description": "⚙️ Administrative operations",
                "externalDocs": {
                    "description": "Admin Guide",
                    "url": "https://docs.yourdomain.com/admin"
                }
            }
        ]
        
        # Add external documentation
        schema["externalDocs"] = {
            "description": "Complete Documentation",
            "url": "https://docs.yourdomain.com"
        }
        
        # Add custom extensions
        schema["x-api-version"] = settings.VERSION
        schema["x-build-time"] = datetime.utcnow().isoformat()
        schema["x-environment"] = getattr(settings, 'ENVIRONMENT', 'development')
        
        # Enhance paths with examples and additional metadata
        self._enhance_paths(schema.get("paths", {}))
        
        return schema
    
    def _enhance_paths(self, paths: Dict[str, Any]):
        """Enhance API paths with examples and metadata"""
        
        for path, methods in paths.items():
            for method, operation in methods.items():
                if isinstance(operation, dict):
                    # Add operation ID if missing
                    if "operationId" not in operation:
                        operation["operationId"] = f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}"
                    
                    # Add examples to responses
                    if "responses" in operation:
                        self._add_response_examples(operation["responses"])
                    
                    # Add request body examples
                    if "requestBody" in operation:
                        self._add_request_examples(operation["requestBody"])
    
    def _add_response_examples(self, responses: Dict[str, Any]):
        """Add examples to response schemas"""
        
        for status_code, response in responses.items():
            if "content" in response:
                for media_type, content in response["content"].items():
                    if media_type == "application/json" and "schema" not in content:
                        continue
                    
                    # Add example based on status code
                    if status_code == "200":
                        content["example"] = {
                            "success": True,
                            "data": {},
                            "meta": {
                                "timestamp": "2024-01-01T00:00:00Z",
                                "request_id": "req_123456789"
                            }
                        }
                    elif status_code == "400":
                        content["example"] = {
                            "success": False,
                            "error": {
                                "code": "VALIDATION_ERROR",
                                "message": "Invalid input data",
                                "details": {}
                            }
                        }
                    elif status_code == "401":
                        content["example"] = {
                            "success": False,
                            "error": {
                                "code": "AUTHENTICATION_REQUIRED",
                                "message": "Authentication required",
                                "details": {}
                            }
                        }
    
    def _add_request_examples(self, request_body: Dict[str, Any]):
        """Add examples to request body schemas"""
        
        if "content" in request_body:
            for media_type, content in request_body["content"].items():
                if media_type == "application/json":
                    # Add generic example
                    content["example"] = {
                        "example_field": "example_value"
                    }
    
    def _setup_custom_docs_routes(self):
        """Setup custom documentation routes"""
        
        @self.app.get("/docs", include_in_schema=False)
        async def custom_swagger_ui_html():
            return get_swagger_ui_html(
                openapi_url=self.app.openapi_url,
                title=f"{self.app.title} - Interactive API Documentation",
                oauth2_redirect_url=self.app.swagger_ui_oauth2_redirect_url,
                swagger_js_url="/static/swagger-ui-bundle.js",
                swagger_css_url="/static/swagger-ui.css",
                swagger_ui_parameters={
                    "deepLinking": True,
                    "displayRequestDuration": True,
                    "docExpansion": "none",
                    "operationsSorter": "alpha",
                    "filter": True,
                    "showExtensions": True,
                    "showCommonExtensions": True,
                    "tryItOutEnabled": True,
                    "requestSnippetsEnabled": True,
                    "requestSnippets": {
                        "generators": {
                            "curl_bash": {
                                "title": "cURL (bash)",
                                "syntax": "bash"
                            },
                            "curl_powershell": {
                                "title": "cURL (PowerShell)",
                                "syntax": "powershell"
                            },
                            "curl_cmd": {
                                "title": "cURL (CMD)",
                                "syntax": "bash"
                            }
                        },
                        "defaultExpanded": True,
                        "languages": ["curl_bash", "curl_powershell", "curl_cmd"]
                    }
                }
            )
        
        @self.app.get("/redoc", include_in_schema=False)
        async def redoc_html():
            return get_redoc_html(
                openapi_url=self.app.openapi_url,
                title=f"{self.app.title} - API Documentation",
                redoc_js_url="/static/redoc.standalone.js",
            )
        
        @self.app.get("/openapi.json", include_in_schema=False)
        async def get_openapi_json():
            return JSONResponse(self.app.openapi())
        
        @self.app.get("/openapi.yaml", include_in_schema=False)
        async def get_openapi_yaml():
            openapi_data = self.app.openapi()
            yaml_content = yaml.dump(openapi_data, default_flow_style=False)
            return Response(
                content=yaml_content,
                media_type="application/x-yaml",
                headers={"Content-Disposition": "attachment; filename=openapi.yaml"}
            )
        
        @self.app.get("/api-docs/postman", include_in_schema=False)
        async def get_postman_collection():
            """Generate Postman collection from OpenAPI spec"""
            collection = self._generate_postman_collection()
            return JSONResponse(
                content=collection,
                headers={"Content-Disposition": "attachment; filename=fastnext-collection.json"}
            )
        
        @self.app.get("/api-docs/insomnia", include_in_schema=False)
        async def get_insomnia_collection():
            """Generate Insomnia collection from OpenAPI spec"""
            collection = self._generate_insomnia_collection()
            return JSONResponse(
                content=collection,
                headers={"Content-Disposition": "attachment; filename=fastnext-insomnia.json"}
            )
    
    def _generate_postman_collection(self) -> Dict[str, Any]:
        """Generate Postman collection from OpenAPI schema"""
        
        openapi_schema = self.app.openapi()
        
        collection = {
            "info": {
                "name": self.app.title,
                "description": self.app.description,
                "version": self.app.version,
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            "auth": {
                "type": "bearer",
                "bearer": [
                    {
                        "key": "token",
                        "value": "{{access_token}}",
                        "type": "string"
                    }
                ]
            },
            "variable": [
                {
                    "key": "base_url",
                    "value": "http://localhost:8000",
                    "type": "string"
                },
                {
                    "key": "access_token",
                    "value": "",
                    "type": "string"
                }
            ],
            "item": []
        }
        
        # Convert paths to Postman requests
        for path, methods in openapi_schema.get("paths", {}).items():
            folder = {
                "name": path,
                "item": []
            }
            
            for method, operation in methods.items():
                if isinstance(operation, dict):
                    request_item = {
                        "name": operation.get("summary", f"{method.upper()} {path}"),
                        "request": {
                            "method": method.upper(),
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "url": {
                                "raw": "{{base_url}}" + path,
                                "host": ["{{base_url}}"],
                                "path": path.strip("/").split("/") if path != "/" else []
                            }
                        }
                    }
                    
                    # Add request body if present
                    if "requestBody" in operation:
                        request_body = operation["requestBody"]
                        if "content" in request_body and "application/json" in request_body["content"]:
                            example = request_body["content"]["application/json"].get("example", {})
                            request_item["request"]["body"] = {
                                "mode": "raw",
                                "raw": json.dumps(example, indent=2)
                            }
                    
                    folder["item"].append(request_item)
            
            if folder["item"]:
                collection["item"].append(folder)
        
        return collection
    
    def _generate_insomnia_collection(self) -> Dict[str, Any]:
        """Generate Insomnia collection from OpenAPI schema"""
        
        openapi_schema = self.app.openapi()
        
        collection = {
            "_type": "export",
            "__export_format": 4,
            "__export_date": datetime.utcnow().isoformat(),
            "__export_source": "fastnext-api",
            "resources": [
                {
                    "_id": "wrk_base",
                    "_type": "workspace",
                    "name": self.app.title,
                    "description": self.app.description
                },
                {
                    "_id": "env_base",
                    "_type": "environment",
                    "name": "Base Environment",
                    "data": {
                        "base_url": "http://localhost:8000",
                        "access_token": ""
                    },
                    "parentId": "wrk_base"
                }
            ]
        }
        
        # Convert paths to Insomnia requests
        request_id = 1
        for path, methods in openapi_schema.get("paths", {}).items():
            for method, operation in methods.items():
                if isinstance(operation, dict):
                    request = {
                        "_id": f"req_{request_id}",
                        "_type": "request",
                        "parentId": "wrk_base",
                        "name": operation.get("summary", f"{method.upper()} {path}"),
                        "method": method.upper(),
                        "url": "{{ _.base_url }}" + path,
                        "headers": [
                            {
                                "name": "Content-Type",
                                "value": "application/json"
                            },
                            {
                                "name": "Authorization",
                                "value": "Bearer {{ _.access_token }}"
                            }
                        ]
                    }
                    
                    # Add request body if present
                    if "requestBody" in operation:
                        request_body = operation["requestBody"]
                        if "content" in request_body and "application/json" in request_body["content"]:
                            example = request_body["content"]["application/json"].get("example", {})
                            request["body"] = {
                                "mimeType": "application/json",
                                "text": json.dumps(example, indent=2)
                            }
                    
                    collection["resources"].append(request)
                    request_id += 1
        
        return collection

class APIChangelogGenerator:
    """Generate API changelog from OpenAPI schema changes"""
    
    def __init__(self):
        self.previous_schemas: Dict[str, Dict[str, Any]] = {}
    
    def generate_changelog(self, current_schema: Dict[str, Any], version: str) -> Dict[str, Any]:
        """Generate changelog between schema versions"""
        
        if version not in self.previous_schemas:
            return {
                "version": version,
                "changes": [],
                "summary": "Initial API version"
            }
        
        previous_schema = self.previous_schemas[version]
        changes = self._compare_schemas(previous_schema, current_schema)
        
        return {
            "version": version,
            "date": datetime.utcnow().isoformat(),
            "changes": changes,
            "summary": self._generate_summary(changes)
        }
    
    def _compare_schemas(self, old_schema: Dict[str, Any], new_schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Compare two OpenAPI schemas and find differences"""
        
        changes = []
        
        # Compare paths
        old_paths = set(old_schema.get("paths", {}).keys())
        new_paths = set(new_schema.get("paths", {}).keys())
        
        # New endpoints
        for path in new_paths - old_paths:
            changes.append({
                "type": "added",
                "category": "endpoint",
                "path": path,
                "description": f"New endpoint added: {path}"
            })
        
        # Removed endpoints
        for path in old_paths - new_paths:
            changes.append({
                "type": "removed",
                "category": "endpoint", 
                "path": path,
                "description": f"Endpoint removed: {path}",
                "breaking": True
            })
        
        # Modified endpoints
        for path in old_paths & new_paths:
            path_changes = self._compare_path(
                old_schema["paths"][path],
                new_schema["paths"][path],
                path
            )
            changes.extend(path_changes)
        
        return changes
    
    def _compare_path(self, old_path: Dict[str, Any], new_path: Dict[str, Any], path: str) -> List[Dict[str, Any]]:
        """Compare individual path definitions"""
        
        changes = []
        
        old_methods = set(old_path.keys())
        new_methods = set(new_path.keys())
        
        # New methods
        for method in new_methods - old_methods:
            changes.append({
                "type": "added",
                "category": "method",
                "path": path,
                "method": method,
                "description": f"New method {method.upper()} added to {path}"
            })
        
        # Removed methods
        for method in old_methods - new_methods:
            changes.append({
                "type": "removed",
                "category": "method",
                "path": path,
                "method": method,
                "description": f"Method {method.upper()} removed from {path}",
                "breaking": True
            })
        
        return changes
    
    def _generate_summary(self, changes: List[Dict[str, Any]]) -> str:
        """Generate a summary of changes"""
        
        added = len([c for c in changes if c["type"] == "added"])
        removed = len([c for c in changes if c["type"] == "removed"])
        modified = len([c for c in changes if c["type"] == "modified"])
        breaking = len([c for c in changes if c.get("breaking", False)])
        
        summary_parts = []
        
        if added > 0:
            summary_parts.append(f"{added} addition{'s' if added != 1 else ''}")
        
        if modified > 0:
            summary_parts.append(f"{modified} modification{'s' if modified != 1 else ''}")
        
        if removed > 0:
            summary_parts.append(f"{removed} removal{'s' if removed != 1 else ''}")
        
        if breaking > 0:
            summary_parts.append(f"{breaking} breaking change{'s' if breaking != 1 else ''}")
        
        if not summary_parts:
            return "No changes"
        
        return ", ".join(summary_parts)

class DocumentationExporter:
    """Export API documentation in various formats"""
    
    def __init__(self, app: FastAPI):
        self.app = app
    
    async def export_markdown(self) -> str:
        """Export API documentation as Markdown"""
        
        schema = self.app.openapi()
        markdown = []
        
        # Header
        markdown.append(f"# {schema['info']['title']}")
        markdown.append(f"\n{schema['info']['description']}\n")
        markdown.append(f"**Version:** {schema['info']['version']}")
        markdown.append(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Base URL
        if "servers" in schema:
            markdown.append("## Base URLs")
            for server in schema["servers"]:
                markdown.append(f"- `{server['url']}` - {server.get('description', '')}")
            markdown.append("")
        
        # Authentication
        if "components" in schema and "securitySchemes" in schema["components"]:
            markdown.append("## Authentication")
            for name, scheme in schema["components"]["securitySchemes"].items():
                markdown.append(f"### {name}")
                markdown.append(f"- **Type:** {scheme['type']}")
                if "description" in scheme:
                    markdown.append(f"- **Description:** {scheme['description']}")
                markdown.append("")
        
        # Endpoints
        markdown.append("## Endpoints")
        
        for path, methods in schema.get("paths", {}).items():
            markdown.append(f"### {path}")
            
            for method, operation in methods.items():
                if not isinstance(operation, dict):
                    continue
                
                markdown.append(f"#### {method.upper()}")
                
                if "summary" in operation:
                    markdown.append(f"**Summary:** {operation['summary']}")
                
                if "description" in operation:
                    markdown.append(f"**Description:** {operation['description']}")
                
                # Parameters
                if "parameters" in operation:
                    markdown.append("**Parameters:**")
                    for param in operation["parameters"]:
                        required = " (required)" if param.get("required", False) else ""
                        markdown.append(f"- `{param['name']}` ({param['in']}){required}: {param.get('description', '')}")
                
                # Request body
                if "requestBody" in operation:
                    markdown.append("**Request Body:**")
                    request_body = operation["requestBody"]
                    if "description" in request_body:
                        markdown.append(f"- {request_body['description']}")
                    
                    for media_type in request_body.get("content", {}):
                        markdown.append(f"- Content-Type: `{media_type}`")
                
                # Responses
                if "responses" in operation:
                    markdown.append("**Responses:**")
                    for status_code, response in operation["responses"].items():
                        description = response.get("description", "")
                        markdown.append(f"- `{status_code}`: {description}")
                
                markdown.append("")
        
        return "\n".join(markdown)
    
    async def export_html(self) -> str:
        """Export API documentation as HTML"""
        
        schema = self.app.openapi()
        html = []
        
        # HTML header
        html.append("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - API Documentation</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }}
        h1 {{ color: #333; border-bottom: 2px solid #333; }}
        h2 {{ color: #666; border-bottom: 1px solid #ccc; }}
        h3 {{ color: #999; }}
        code {{ background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
        pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
        .method {{ display: inline-block; padding: 4px 8px; border-radius: 3px; color: white; font-weight: bold; }}
        .get {{ background: #61affe; }}
        .post {{ background: #49cc90; }}
        .put {{ background: #fca130; }}
        .delete {{ background: #f93e3e; }}
        .patch {{ background: #50e3c2; }}
    </style>
</head>
<body>
        """.format(title=schema['info']['title']))
        
        # Content
        html.append(f"<h1>{schema['info']['title']}</h1>")
        html.append(f"<p>{schema['info']['description']}</p>")
        html.append(f"<p><strong>Version:</strong> {schema['info']['version']}</p>")
        
        # Endpoints
        html.append("<h2>Endpoints</h2>")
        
        for path, methods in schema.get("paths", {}).items():
            html.append(f"<h3>{path}</h3>")
            
            for method, operation in methods.items():
                if not isinstance(operation, dict):
                    continue
                
                html.append(f'<h4><span class="method {method}">{method.upper()}</span> {path}</h4>')
                
                if "summary" in operation:
                    html.append(f"<p><strong>Summary:</strong> {operation['summary']}</p>")
                
                if "description" in operation:
                    html.append(f"<p>{operation['description']}</p>")
        
        html.append("</body></html>")
        
        return "\n".join(html)

# Utility functions for documentation setup
def setup_api_documentation(app: FastAPI) -> APIDocumentationEnhancer:
    """Setup enhanced API documentation"""
    
    enhancer = APIDocumentationEnhancer(app)
    
    # Add documentation export endpoints
    exporter = DocumentationExporter(app)
    
    @app.get("/api-docs/markdown", include_in_schema=False)
    async def export_markdown_docs():
        markdown_content = await exporter.export_markdown()
        return Response(
            content=markdown_content,
            media_type="text/markdown",
            headers={"Content-Disposition": "attachment; filename=api-docs.md"}
        )
    
    @app.get("/api-docs/html", include_in_schema=False)
    async def export_html_docs():
        html_content = await exporter.export_html()
        return HTMLResponse(content=html_content)
    
    logger.info("Enhanced API documentation setup completed")
    return enhancer