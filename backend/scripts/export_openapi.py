#!/usr/bin/env python3
"""
Export OpenAPI documentation to YAML format for FastNext Framework

This script exports the OpenAPI/Swagger documentation to YAML format,
making it easier to import into external tools like Postman, Insomnia,
or other API testing platforms.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

import yaml

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from main import create_app


def export_openapi_json(output_file: str = "openapi.json") -> Dict[str, Any]:
    """Export OpenAPI schema to JSON format"""
    app = create_app()
    openapi_schema = app.openapi()

    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write JSON file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)

    print(f"✅ OpenAPI JSON exported to: {output_path.absolute()}")
    return openapi_schema


def export_openapi_yaml(output_file: str = "openapi.yaml") -> Dict[str, Any]:
    """Export OpenAPI schema to YAML format"""
    app = create_app()
    openapi_schema = app.openapi()

    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write YAML file with custom formatting
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(
            openapi_schema,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2,
            width=120,
        )

    print(f"✅ OpenAPI YAML exported to: {output_path.absolute()}")
    return openapi_schema


def create_postman_collection(
    openapi_schema: Dict[str, Any],
    output_file: str = "fastnext-postman-collection.json",
):
    """Convert OpenAPI schema to Postman collection format"""

    # Basic Postman collection structure
    collection = {
        "info": {
            "name": f"{openapi_schema.get('info', {}).get('title', 'FastNext Framework')} API",
            "description": openapi_schema.get("info", {}).get("description", ""),
            "version": openapi_schema.get("info", {}).get("version", "1.0.0"),
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
    paths = openapi_schema.get("paths", {})
    tag_groups = {}

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "delete", "patch"]:
                tags = details.get("tags", ["Other"])
                tag = tags[0] if tags else "Other"

                if tag not in tag_groups:
                    tag_groups[tag] = {"name": tag, "item": []}

                # Create Postman request
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
                    "response": [],
                }

                # Add authentication for protected endpoints
                if "security" in details or any(
                    resp_code.startswith("401")
                    for resp_code in details.get("responses", {})
                ):
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
                if method.lower() in ["post", "put", "patch"]:
                    request_body = details.get("requestBody", {})
                    if request_body:
                        content = request_body.get("content", {})
                        if "application/json" in content:
                            schema = content["application/json"].get("schema", {})
                            # Create example based on schema
                            example = create_example_from_schema(
                                schema, openapi_schema.get("components", {})
                            )
                            if example:
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
                            "value": param.get("example", ""),
                            "description": param.get("description", ""),
                            "disabled": not param.get("required", False),
                        }
                        for param in query_params
                    ]

                # Add path parameters
                path_params = [p for p in parameters if p.get("in") == "path"]
                if path_params:
                    for param in path_params:
                        path_placeholder = "{" + param["name"] + "}"
                        if path_placeholder in request["request"]["url"]["raw"]:
                            request["request"]["url"]["raw"] = request["request"][
                                "url"
                            ]["raw"].replace(
                                path_placeholder, f"{{{{ {param['name']} }}}}"
                            )

                # Add example responses
                responses = details.get("responses", {})
                for status_code, response_details in responses.items():
                    response_example = {
                        "name": f"{status_code} Example",
                        "originalRequest": request["request"].copy(),
                        "status": response_details.get("description", ""),
                        "code": int(status_code) if status_code.isdigit() else 200,
                        "_postman_previewlanguage": "json",
                    }

                    # Add response body example
                    content = response_details.get("content", {})
                    if "application/json" in content:
                        schema = content["application/json"].get("schema", {})
                        example = create_example_from_schema(
                            schema, openapi_schema.get("components", {})
                        )
                        if example:
                            response_example["body"] = json.dumps(example, indent=2)

                    request["response"].append(response_example)

                tag_groups[tag]["item"].append(request)

    # Add folders to collection
    collection["item"] = list(tag_groups.values())

    # Add pre-request script for authentication
    collection["event"] = [
        {
            "listen": "prerequest",
            "script": {
                "type": "text/javascript",
                "exec": [
                    "// Auto-refresh token if needed",
                    "const token = pm.collectionVariables.get('access_token');",
                    "if (!token) {",
                    "    console.log('No access token found. Please authenticate first.');",
                    "}",
                ],
            },
        },
        {
            "listen": "test",
            "script": {
                "type": "text/javascript",
                "exec": [
                    "// Auto-save new token from login response",
                    "if (pm.response.code === 200 && pm.request.url.toString().includes('/auth/login')) {",
                    "    const responseJson = pm.response.json();",
                    "    if (responseJson.access_token) {",
                    "        pm.collectionVariables.set('access_token', responseJson.access_token);",
                    "        console.log('Access token saved automatically');",
                    "    }",
                    "}",
                ],
            },
        },
    ]

    # Export collection
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)

    print(f"✅ Postman collection exported to: {output_path.absolute()}")
    return collection


def create_example_from_schema(
    schema: Dict[str, Any], components: Dict[str, Any]
) -> Any:
    """Create example data from OpenAPI schema"""
    if not schema:
        return None

    # Handle references
    if "$ref" in schema:
        ref_path = schema["$ref"].replace("#/", "").split("/")
        ref_schema = components
        for part in ref_path:
            ref_schema = ref_schema.get(part, {})
        return create_example_from_schema(ref_schema, components)

    schema_type = schema.get("type", "object")

    if schema_type == "object":
        properties = schema.get("properties", {})
        example = {}
        for prop_name, prop_schema in properties.items():
            example[prop_name] = create_example_from_schema(prop_schema, components)
        return example

    elif schema_type == "array":
        items_schema = schema.get("items", {})
        item_example = create_example_from_schema(items_schema, components)
        return [item_example] if item_example is not None else []

    elif schema_type == "string":
        if "enum" in schema:
            return schema["enum"][0]
        elif schema.get("format") == "email":
            return "user@example.com"
        elif schema.get("format") == "date-time":
            return "2024-01-01T00:00:00Z"
        elif schema.get("format") == "date":
            return "2024-01-01"
        else:
            return schema.get("example", "string")

    elif schema_type == "integer":
        return schema.get("example", 1)

    elif schema_type == "number":
        return schema.get("example", 1.0)

    elif schema_type == "boolean":
        return schema.get("example", True)

    return None


def create_insomnia_collection(
    openapi_schema: Dict[str, Any],
    output_file: str = "fastnext-insomnia-collection.json",
):
    """Convert OpenAPI schema to Insomnia collection format"""

    import uuid
    from datetime import datetime

    collection = {
        "_type": "export",
        "__export_format": 4,
        "__export_date": datetime.now().isoformat(),
        "__export_source": "fastnext-framework",
        "resources": [
            {
                "_id": "wrk_" + str(uuid.uuid4()).replace("-", ""),
                "_type": "workspace",
                "name": f"{openapi_schema.get('info', {}).get('title', 'FastNext Framework')} API",
                "description": openapi_schema.get("info", {}).get("description", ""),
                "parentId": None,
            },
            {
                "_id": "env_" + str(uuid.uuid4()).replace("-", ""),
                "_type": "environment",
                "name": "Base Environment",
                "data": {"base_url": "http://localhost:8000", "access_token": ""},
                "dataPropertyOrder": {"base_url": 0, "access_token": 1},
                "color": None,
                "isPrivate": False,
                "parentId": "wrk_" + str(uuid.uuid4()).replace("-", ""),
            },
        ],
    }

    # Add requests
    workspace_id = collection["resources"][0]["_id"]
    paths = openapi_schema.get("paths", {})

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "delete", "patch"]:
                request = {
                    "_id": "req_" + str(uuid.uuid4()).replace("-", ""),
                    "_type": "request",
                    "name": details.get("summary", f"{method.upper()} {path}"),
                    "description": details.get("description", ""),
                    "url": "{{ _.base_url }}" + path,
                    "method": method.upper(),
                    "headers": [{"name": "Content-Type", "value": "application/json"}],
                    "authentication": {
                        "type": "bearer",
                        "token": "{{ _.access_token }}",
                    },
                    "body": {},
                    "parameters": [],
                    "parentId": workspace_id,
                }

                # Add request body for POST/PUT/PATCH
                if method.lower() in ["post", "put", "patch"]:
                    request_body = details.get("requestBody", {})
                    if request_body:
                        content = request_body.get("content", {})
                        if "application/json" in content:
                            schema = content["application/json"].get("schema", {})
                            example = create_example_from_schema(
                                schema, openapi_schema.get("components", {})
                            )
                            if example:
                                request["body"] = {
                                    "mimeType": "application/json",
                                    "text": json.dumps(example, indent=2),
                                }

                # Add query parameters
                parameters = details.get("parameters", [])
                query_params = [p for p in parameters if p.get("in") == "query"]
                if query_params:
                    request["parameters"] = [
                        {
                            "name": param["name"],
                            "value": param.get("example", ""),
                            "description": param.get("description", ""),
                            "disabled": not param.get("required", False),
                        }
                        for param in query_params
                    ]

                collection["resources"].append(request)

    # Export collection
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)

    print(f"✅ Insomnia collection exported to: {output_path.absolute()}")
    return collection


def main():
    """Main function to export all formats"""
    print("🚀 Exporting FastNext Framework API Documentation...")
    print(f"📍 Backend directory: {backend_dir}")

    # Create exports directory
    exports_dir = backend_dir / "exports"
    exports_dir.mkdir(exist_ok=True)

    try:
        # Export OpenAPI JSON
        openapi_schema = export_openapi_json(str(exports_dir / "openapi.json"))

        # Export OpenAPI YAML
        export_openapi_yaml(str(exports_dir / "openapi.yaml"))

        # Create Postman collection
        create_postman_collection(
            openapi_schema, str(exports_dir / "fastnext-postman-collection.json")
        )

        # Create Insomnia collection
        create_insomnia_collection(
            openapi_schema, str(exports_dir / "fastnext-insomnia-collection.json")
        )

        print("\n✅ All exports completed successfully!")
        print(f"📁 Files exported to: {exports_dir.absolute()}")
        print("\n📋 Available files:")
        print("   • openapi.json - OpenAPI specification in JSON format")
        print("   • openapi.yaml - OpenAPI specification in YAML format")
        print("   • fastnext-postman-collection.json - Postman collection")
        print("   • fastnext-insomnia-collection.json - Insomnia collection")

        print("\n🔧 Usage Instructions:")
        print("   📮 Postman: Import the JSON collection file")
        print("   🌙 Insomnia: Import the JSON collection file")
        print("   🔗 Other tools: Use the openapi.yaml or openapi.json file")

        print("\n🔐 Authentication Setup:")
        print("   1. Use the login endpoint to get an access token")
        print("   2. Set the 'access_token' variable in your API client")
        print("   3. All authenticated endpoints will use the token automatically")

    except Exception as e:
        print(f"❌ Export failed: {e}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
