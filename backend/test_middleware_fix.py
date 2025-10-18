#!/usr/bin/env python3
"""
Simple test to verify that ValidationMiddleware doesn't consume request body for API routes.
"""

import asyncio
import json
from unittest.mock import Mock

from app.middleware.validation_middleware import ValidationMiddleware
from fastapi import Request
from starlette.responses import JSONResponse


async def test_middleware_body_consumption():
    """Test that middleware doesn't consume body for API routes"""

    # Create a mock app
    mock_app = Mock()
    mock_app.return_value = JSONResponse({"test": "ok"})

    # Create middleware
    middleware = ValidationMiddleware(mock_app)

    # Create a mock request for API route with JSON body
    mock_request = Mock()
    mock_request.method = "POST"
    mock_request.url.path = "/api/v1/products"
    mock_request.headers = {
        "Content-Type": "application/json",
        "Content-Length": "25"
    }
    mock_request.query_params = {}
    mock_request.client = Mock()
    mock_request.client.host = "127.0.0.1"

    # Mock the body method to track if it's called
    body_called = False
    original_body = {"name": "Test Product", "price": 10.99}

    async def mock_body():
        nonlocal body_called
        body_called = True
        return json.dumps(original_body).encode('utf-8')

    mock_request.body = mock_body

    # Mock _should_skip_validation to return False so we test the body validation
    middleware._should_skip_validation = Mock(return_value=False)

    # Mock other validation methods
    middleware._validate_headers = Mock(return_value=Mock(is_valid=True))
    middleware._validate_query_params = Mock(return_value=Mock(is_valid=True))
    middleware._has_file_upload = Mock(return_value=False)

    # Call the middleware
    response = await middleware.dispatch(mock_request, Mock())

    # Check that body was NOT consumed for API route
    print(f"Body consumed: {body_called}")
    print(f"Response status: {response.status_code}")

    # For API routes, body should NOT be consumed
    assert not body_called, "Middleware should not consume body for API routes"

    print("✅ Test passed: Middleware does not consume body for API routes")


if __name__ == "__main__":
    asyncio.run(test_middleware_body_consumption())