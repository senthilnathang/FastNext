"""
Request context middleware for activity tracking.
Sets the current user and request info in thread-local context.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.context import RequestContext, set_request_context, clear_request_context
from app.core.security import decode_token


class ContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to set request context for activity tracking.
    Extracts user info from JWT token and sets it in context variables.
    """

    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())

        # Extract user info from Authorization header
        user_id = None
        company_id = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = decode_token(token)
                if payload:
                    user_id = int(payload.get("sub")) if payload.get("sub") else None
                    company_id = payload.get("company_id")
            except Exception:
                pass  # Invalid token, user_id remains None

        # Get client IP
        ip_address = request.client.host if request.client else None
        # Check for forwarded IP
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()

        # Get user agent
        user_agent = request.headers.get("User-Agent", "")[:500]

        # Set request context
        context = RequestContext(
            user_id=user_id,
            company_id=company_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
        set_request_context(context)

        try:
            response = await call_next(request)
            return response
        finally:
            # Clear context after request
            clear_request_context()
