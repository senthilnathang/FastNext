"""
Rate Limiting Middleware for FastVue Framework

Provides multi-level rate limiting:
- Per-IP rate limiting
- Per-user rate limiting
- Endpoint-specific limits
- Sliding window algorithm
"""

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests: int  # Number of requests allowed
    window: int  # Time window in seconds
    burst: int = 0  # Additional burst allowance


# Default rate limit configurations
DEFAULT_LIMITS: Dict[str, RateLimitConfig] = {
    "default": RateLimitConfig(requests=100, window=60, burst=20),  # 100/min
    "auth": RateLimitConfig(requests=10, window=60, burst=5),  # 10/min for auth
    "login": RateLimitConfig(requests=5, window=300, burst=0),  # 5/5min for login
    "register": RateLimitConfig(requests=3, window=3600, burst=0),  # 3/hour for register
    "password_reset": RateLimitConfig(requests=3, window=3600, burst=0),  # 3/hour
    "api": RateLimitConfig(requests=1000, window=3600, burst=100),  # 1000/hour
    "upload": RateLimitConfig(requests=10, window=60, burst=5),  # 10/min for uploads
}

# Endpoint to limit type mapping
ENDPOINT_LIMITS: Dict[str, str] = {
    "/api/v1/auth/login": "login",
    "/api/v1/auth/register": "register",
    "/api/v1/auth/password-reset": "password_reset",
    "/api/v1/auth/refresh": "auth",
    "/api/v1/users/upload": "upload",
}


class SlidingWindowCounter:
    """Thread-safe sliding window rate limiter using in-memory storage"""

    def __init__(self):
        self._windows: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def is_allowed(
        self,
        key: str,
        limit: int,
        window: int,
        burst: int = 0,
    ) -> tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.

        Returns:
            Tuple of (allowed, remaining, reset_time)
        """
        async with self._lock:
            now = time.time()
            window_start = now - window

            # Clean old entries
            self._windows[key] = [
                ts for ts in self._windows[key]
                if ts > window_start
            ]

            # Count requests in window
            count = len(self._windows[key])
            effective_limit = limit + burst

            if count < effective_limit:
                self._windows[key].append(now)
                remaining = effective_limit - count - 1
                reset_time = int(window_start + window)
                return True, max(0, remaining), reset_time
            else:
                # Find when oldest request will expire
                oldest = min(self._windows[key]) if self._windows[key] else now
                reset_time = int(oldest + window)
                return False, 0, reset_time

    async def cleanup(self):
        """Remove old entries to prevent memory growth"""
        async with self._lock:
            now = time.time()
            max_window = 3600  # 1 hour max
            cutoff = now - max_window

            keys_to_remove = []
            for key, timestamps in self._windows.items():
                self._windows[key] = [ts for ts in timestamps if ts > cutoff]
                if not self._windows[key]:
                    keys_to_remove.append(key)

            for key in keys_to_remove:
                del self._windows[key]


# Global rate limiter instance
_rate_limiter = SlidingWindowCounter()


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with multiple strategies.
    """

    def __init__(
        self,
        app: ASGIApp,
        default_limit: Optional[RateLimitConfig] = None,
        limits: Optional[Dict[str, RateLimitConfig]] = None,
        endpoint_limits: Optional[Dict[str, str]] = None,
        excluded_paths: Optional[List[str]] = None,
        enable_user_limits: bool = True,
    ):
        super().__init__(app)
        self.default_limit = default_limit or DEFAULT_LIMITS["default"]
        self.limits = {**DEFAULT_LIMITS, **(limits or {})}
        self.endpoint_limits = {**ENDPOINT_LIMITS, **(endpoint_limits or {})}
        self.excluded_paths = set(excluded_paths or ["/health", "/", "/api/v1/docs"])
        self.enable_user_limits = enable_user_limits

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting to requests"""
        # Skip excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)

        # Determine rate limit config for this endpoint
        limit_type = self.endpoint_limits.get(request.url.path, "default")
        config = self.limits.get(limit_type, self.default_limit)

        # Get client identifier (IP or user ID)
        client_id = self._get_client_id(request)
        rate_key = f"{limit_type}:{client_id}"

        # Check rate limit
        allowed, remaining, reset_time = await _rate_limiter.is_allowed(
            key=rate_key,
            limit=config.requests,
            window=config.window,
            burst=config.burst,
        )

        if not allowed:
            logger.warning(
                f"Rate limit exceeded for {client_id} on {request.url.path} "
                f"(limit: {config.requests}/{config.window}s)"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests",
                    "retry_after": reset_time - int(time.time()),
                },
                headers={
                    "Retry-After": str(reset_time - int(time.time())),
                    "X-RateLimit-Limit": str(config.requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(config.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response

    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        # Try to get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if user_id and self.enable_user_limits:
            return f"user:{user_id}"

        # Fall back to IP address
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return f"ip:{real_ip}"

        return f"ip:{request.client.host if request.client else 'unknown'}"


async def cleanup_rate_limiter():
    """Periodic cleanup task for rate limiter"""
    while True:
        await asyncio.sleep(300)  # Every 5 minutes
        await _rate_limiter.cleanup()
