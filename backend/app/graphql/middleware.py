"""
GraphQL Middleware Integration
Adds GraphQL capabilities to all existing REST API endpoints
"""

import json
import re
from typing import Any, Callable, Dict, Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class GraphQLMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds GraphQL-like query capabilities to existing REST endpoints
    """

    def __init__(self, app, enable_graphql_queries: bool = True):
        super().__init__(app)
        self.enable_graphql_queries = enable_graphql_queries

        # Map REST endpoints to GraphQL-like operations
        self.endpoint_mapping = {
            "/api/v1/auth/me": "me",
            "/api/v1/users": "users",
            "/api/v1/projects": "projects",
            "/api/v1/pages": "pages",
            "/api/v1/components": "components",
            "/api/v1/activity-logs": "activityLogs",
            "/api/v1/audit-trails": "auditTrails",
            "/api/v1/roles": "roles",
            "/api/v1/permissions": "permissions",
            "/api/v1/project-members": "projectMembers",
            "/api/v1/assets": "assets",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add GraphQL capabilities"""

        # Check if GraphQL queries are enabled
        if not self.enable_graphql_queries:
            return await call_next(request)

        # Check for GraphQL query parameters in REST requests
        if request.method == "GET" and "gql" in request.query_params:
            return await self.handle_graphql_query(request, call_next)

        # Check for GraphQL selection in headers
        if "X-GraphQL-Query" in request.headers:
            return await self.handle_graphql_header(request, call_next)

        # Process normal request
        response = await call_next(request)

        # Add GraphQL metadata to responses
        if hasattr(response, "headers"):
            response.headers["X-GraphQL-Enabled"] = "true"
            response.headers["X-GraphQL-Endpoint"] = "/api/v1/graphql"

        return response

    async def handle_graphql_query(
        self, request: Request, call_next: Callable
    ) -> Response:
        """Handle GraphQL query parameter in REST request"""

        gql_query = request.query_params.get("gql", "")

        # Parse GraphQL-like selection
        selected_fields = self.parse_field_selection(gql_query)

        # Process the original request
        response = await call_next(request)

        # Filter response based on GraphQL selection
        if response.status_code == 200 and selected_fields:
            try:
                # Get response content
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                # Parse JSON response
                response_data = json.loads(response_body.decode())

                # Apply field selection
                filtered_data = self.apply_field_selection(
                    response_data, selected_fields
                )

                # Return filtered response
                return JSONResponse(
                    content=filtered_data,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )
            except Exception as e:
                # If filtering fails, return original response
                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )

        return response

    async def handle_graphql_header(
        self, request: Request, call_next: Callable
    ) -> Response:
        """Handle GraphQL query in headers"""

        gql_query = request.headers.get("X-GraphQL-Query", "")

        # Parse the GraphQL query
        selected_fields = self.parse_field_selection(gql_query)

        # Process the original request
        response = await call_next(request)

        # Apply GraphQL selection to response
        return await self.apply_graphql_response(response, selected_fields)

    def parse_field_selection(self, gql_query: str) -> Dict[str, Any]:
        """Parse GraphQL-like field selection"""

        if not gql_query:
            return {}

        # Remove whitespace and braces
        gql_query = gql_query.strip().strip("{}")

        # Simple field parsing (for basic selections)
        fields = {}

        # Split by commas and parse each field
        for field in gql_query.split(","):
            field = field.strip()

            # Handle nested fields (simplified)
            if "{" in field and "}" in field:
                # Parse nested selection
                field_name = field.split("{")[0].strip()
                nested_fields = field.split("{")[1].split("}")[0]
                fields[field_name] = self.parse_field_selection(nested_fields)
            else:
                # Simple field
                fields[field] = True

        return fields

    def apply_field_selection(self, data: Any, selected_fields: Dict[str, Any]) -> Any:
        """Apply GraphQL field selection to response data"""

        if not selected_fields:
            return data

        if isinstance(data, dict):
            # Filter dictionary fields
            filtered = {}
            for key, value in data.items():
                if key in selected_fields:
                    if isinstance(selected_fields[key], dict):
                        # Recursive selection
                        filtered[key] = self.apply_field_selection(
                            value, selected_fields[key]
                        )
                    else:
                        # Include field
                        filtered[key] = value
            return filtered

        elif isinstance(data, list):
            # Apply selection to each item in list
            return [self.apply_field_selection(item, selected_fields) for item in data]

        else:
            # Return primitive values as-is
            return data

    async def apply_graphql_response(
        self, response: Response, selected_fields: Dict[str, Any]
    ) -> Response:
        """Apply GraphQL selection to HTTP response"""

        if response.status_code != 200 or not selected_fields:
            return response

        try:
            # Read response body
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk

            # Parse and filter JSON
            response_data = json.loads(response_body.decode())
            filtered_data = self.apply_field_selection(response_data, selected_fields)

            # Create new response with filtered data
            return JSONResponse(
                content=filtered_data,
                status_code=response.status_code,
                headers={**dict(response.headers), "X-GraphQL-Filtered": "true"},
            )

        except Exception:
            # Return original response if filtering fails
            return response


class GraphQLQueryEnhancer:
    """
    Enhances existing API endpoints with GraphQL-like capabilities
    """

    @staticmethod
    def add_graphql_info_to_response(
        response_data: Dict[str, Any], endpoint: str
    ) -> Dict[str, Any]:
        """Add GraphQL metadata to API responses"""

        if not isinstance(response_data, dict):
            return response_data

        # Add GraphQL metadata
        graphql_info = {
            "graphql": {
                "endpoint": "/api/v1/graphql",
                "equivalent_query": GraphQLQueryEnhancer.get_equivalent_graphql_query(
                    endpoint
                ),
                "available_fields": GraphQLQueryEnhancer.get_available_fields(endpoint),
                "docs": f"Use GraphQL endpoint for more flexible queries: /api/v1/graphql",
            }
        }

        # Add metadata without modifying original response structure
        if "_meta" not in response_data:
            response_data["_meta"] = {}

        response_data["_meta"].update(graphql_info)

        return response_data

    @staticmethod
    def get_equivalent_graphql_query(endpoint: str) -> str:
        """Generate equivalent GraphQL query for REST endpoint"""

        endpoint_mapping = {
            "/api/v1/auth/me": "query { me { id username email fullName } }",
            "/api/v1/users": "query { users { edges { id username email } pageInfo { hasNextPage } } }",
            "/api/v1/projects": "query { projects { edges { id name description owner { username } } } }",
            "/api/v1/pages": "query { pages { edges { id title path project { name } } } }",
            "/api/v1/components": "query { components { id name componentType project { name } } }",
            "/api/v1/activity-logs": "query { activityLogs { id action user { username } createdAt } }",
            "/api/v1/audit-trails": "query { auditTrails { id action resourceType user { username } } }",
            "/api/v1/roles": "query { roles { id name description permissions } }",
            "/api/v1/permissions": "query { permissions { id name description resource action } }",
        }

        return endpoint_mapping.get(endpoint, f"query {{ {endpoint.split('/')[-1]} }}")

    @staticmethod
    def get_available_fields(endpoint: str) -> Dict[str, Any]:
        """Get available fields for GraphQL queries"""

        field_mapping = {
            "/api/v1/auth/me": {
                "id": "Int",
                "username": "String",
                "email": "String",
                "fullName": "String",
                "isActive": "Boolean",
                "isVerified": "Boolean",
                "isSuperuser": "Boolean",
                "avatarUrl": "String",
                "bio": "String",
                "location": "String",
                "website": "String",
                "createdAt": "DateTime",
                "updatedAt": "DateTime",
                "lastLoginAt": "DateTime",
            },
            "/api/v1/users": {
                "edges": ["UserType"],
                "pageInfo": {
                    "hasNextPage": "Boolean",
                    "hasPreviousPage": "Boolean",
                    "startCursor": "String",
                    "endCursor": "String",
                },
                "totalCount": "Int",
            },
            "/api/v1/projects": {
                "edges": ["ProjectType"],
                "pageInfo": {"hasNextPage": "Boolean", "hasPreviousPage": "Boolean"},
                "totalCount": "Int",
            },
        }

        return field_mapping.get(endpoint, {})


def create_graphql_enhanced_response(data: Any, request: Request) -> Dict[str, Any]:
    """Create GraphQL-enhanced API response"""

    if isinstance(data, dict):
        # Add GraphQL metadata
        enhanced_data = data.copy()

        # Add GraphQL information
        graphql_info = GraphQLQueryEnhancer.add_graphql_info_to_response(
            enhanced_data, str(request.url.path)
        )

        return graphql_info

    return data
