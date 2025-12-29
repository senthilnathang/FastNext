"""
Request Logging Middleware for FastVue Framework

Provides comprehensive request/response logging with:
- Request metadata capture
- Response time tracking
- Error logging
- Sensitive data masking
- Performance metrics
"""

import json
import logging
import re
import time
import uuid
from typing import Callable, List, Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")


# Patterns for sensitive data masking
SENSITIVE_FIELDS = {
    "password", "passwd", "pwd", "secret", "token", "api_key", "apikey",
    "authorization", "auth", "credit_card", "creditcard", "card_number",
    "cvv", "ssn", "social_security", "private_key", "privatekey",
}

SENSITIVE_PATTERN = re.compile(
    r'("(?:' + "|".join(SENSITIVE_FIELDS) + r')"\s*:\s*)"[^"]*"',
    re.IGNORECASE,
)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive request/response logging middleware.
    """

    # Performance thresholds
    SLOW_REQUEST_THRESHOLD = 2.0  # seconds
    VERY_SLOW_REQUEST_THRESHOLD = 5.0  # seconds

    def __init__(
        self,
        app: ASGIApp,
        log_request_body: bool = False,
        log_response_body: bool = False,
        log_headers: bool = False,
        excluded_paths: Optional[List[str]] = None,
        max_body_length: int = 1000,
    ):
        super().__init__(app)
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.log_headers = log_headers
        self.excluded_paths = set(excluded_paths or [
            "/health", "/", "/api/v1/docs", "/api/v1/redoc", "/api/v1/openapi.json"
        ])
        self.max_body_length = max_body_length

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log request and response details"""
        # Skip excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)

        # Generate or get request ID
        request_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
        start_time = time.time()

        # Extract request data
        request_data = await self._extract_request_data(request)

        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"[{request_id}] from {request_data['client_ip']}"
        )

        # Process request
        response = None
        error = None
        try:
            response = await call_next(request)
        except Exception as e:
            error = e
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"[{request_id}] - {str(e)}"
            )
            raise

        # Calculate metrics
        response_time = time.time() - start_time
        status_code = response.status_code if response else 500

        # Determine log level based on response
        log_level = self._get_log_level(status_code, response_time)

        # Log response
        log_message = (
            f"Response: {request.method} {request.url.path} "
            f"[{request_id}] {status_code} in {response_time:.3f}s"
        )

        if log_level == logging.WARNING:
            logger.warning(log_message)
        elif log_level == logging.ERROR:
            logger.error(log_message)
        else:
            logger.info(log_message)

        # Log security events for certain status codes
        if status_code in (401, 403, 429):
            security_logger.warning(
                f"Security event: {status_code} on {request.method} {request.url.path} "
                f"from {request_data['client_ip']} [User-Agent: {request_data['user_agent']}]"
            )

        return response

    async def _extract_request_data(self, request: Request) -> dict:
        """Extract relevant request data"""
        data = {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query) if request.url.query else None,
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "content_type": request.headers.get("content-type", ""),
            "content_length": request.headers.get("content-length", 0),
        }

        # Add headers if enabled
        if self.log_headers:
            data["headers"] = self._mask_sensitive_headers(dict(request.headers))

        # Add body if enabled (for non-GET requests)
        if self.log_request_body and request.method not in ("GET", "HEAD", "OPTIONS"):
            try:
                body = await request.body()
                if body:
                    body_str = body.decode("utf-8", errors="replace")
                    # Mask sensitive data
                    body_str = self._mask_sensitive_data(body_str)
                    # Truncate if too long
                    if len(body_str) > self.max_body_length:
                        body_str = body_str[:self.max_body_length] + "...[truncated]"
                    data["body"] = body_str
            except Exception:
                pass

        return data

    def _mask_sensitive_data(self, data: str) -> str:
        """Mask sensitive data in string"""
        return SENSITIVE_PATTERN.sub(r'\1"***MASKED***"', data)

    def _mask_sensitive_headers(self, headers: dict) -> dict:
        """Mask sensitive headers"""
        masked = {}
        for key, value in headers.items():
            if any(s in key.lower() for s in SENSITIVE_FIELDS):
                masked[key] = "***MASKED***"
            else:
                masked[key] = value
        return masked

    def _get_log_level(self, status_code: int, response_time: float) -> int:
        """Determine log level based on status and response time"""
        if status_code >= 500:
            return logging.ERROR
        if status_code >= 400:
            return logging.WARNING
        if response_time >= self.VERY_SLOW_REQUEST_THRESHOLD:
            return logging.WARNING
        if response_time >= self.SLOW_REQUEST_THRESHOLD:
            return logging.WARNING
        return logging.INFO

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        return request.client.host if request.client else "unknown"


def log_security_event(
    event_type: str,
    user_id: Optional[int],
    request: Request,
    severity: str = "MEDIUM",
    details: Optional[dict] = None,
):
    """
    Log a security event for audit purposes.

    Args:
        event_type: Type of security event (e.g., "auth_failure", "permission_denied")
        user_id: ID of the user involved (if any)
        request: The request object
        severity: LOW, MEDIUM, HIGH, CRITICAL
        details: Additional event details
    """
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.client.host if request.client else "unknown"

    event = {
        "event_type": event_type,
        "severity": severity,
        "user_id": user_id,
        "ip_address": client_ip,
        "user_agent": request.headers.get("user-agent", ""),
        "path": request.url.path,
        "method": request.method,
        "details": details or {},
    }

    if severity in ("HIGH", "CRITICAL"):
        security_logger.error(f"Security Event: {json.dumps(event)}")
    elif severity == "MEDIUM":
        security_logger.warning(f"Security Event: {json.dumps(event)}")
    else:
        security_logger.info(f"Security Event: {json.dumps(event)}")
