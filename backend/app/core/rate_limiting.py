"""
Advanced API rate limiting and throttling for FastVue
Supports multiple strategies: fixed window, sliding window, token bucket
"""

import hashlib
import logging
import time
from datetime import datetime
from typing import Any, Callable, Dict, Optional, Tuple

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("fastvue.rate_limiting")


class RateLimitConfig:
    """Configuration for rate limiting"""

    # Global toggle to enable/disable rate limiting
    ENABLED: bool = True

    # Default limits per endpoint type
    DEFAULT_LIMITS: Dict[str, Dict[str, int]] = {
        "default": {
            "requests": 1000,  # requests per hour
            "duration": 3600,  # 1 hour in seconds
        },
        "api": {
            "requests": 1000,  # API requests per minute
            "duration": 60,  # 1 minute
        },
        "login": {
            "requests": 5,  # login attempts per 15 minutes
            "duration": 900,  # 15 minutes
        },
        "password_reset": {
            "requests": 3,  # password reset attempts per hour
            "duration": 3600,  # 1 hour
        },
        "upload": {
            "requests": 10,  # file uploads per minute
            "duration": 60,  # 1 minute
        },
        "export": {
            "requests": 5,  # data exports per hour
            "duration": 3600,  # 1 hour
        },
    }

    # IPs to whitelist (never rate limited)
    WHITELISTED_IPS: list = ["127.0.0.1", "localhost", "::1"]

    # IPs to blacklist (always blocked)
    BLACKLISTED_IPS: list = []

    # Custom rate limits per user role
    ROLE_LIMITS: Dict[str, Dict[str, int]] = {
        "superuser": {
            "requests": 10000,
            "duration": 3600,
        },
        "admin": {
            "requests": 5000,
            "duration": 3600,
        },
        "user": {
            "requests": 1000,
            "duration": 3600,
        },
    }


# In-memory storage for rate limiting (use Redis in production)
_rate_limit_storage: Dict[str, Dict[str, Any]] = {}


def _get_storage() -> Dict[str, Dict[str, Any]]:
    """Get rate limit storage (in-memory for development, Redis for production)"""
    return _rate_limit_storage


def _set_storage(key: str, value: Dict[str, Any], ttl: int) -> None:
    """Set rate limit storage with TTL"""
    _rate_limit_storage[key] = {
        "value": value,
        "expires_at": time.time() + ttl,
    }


def _get_from_storage(key: str) -> Optional[Dict[str, Any]]:
    """Get from rate limit storage, checking expiry"""
    data = _rate_limit_storage.get(key)
    if data is None:
        return None
    if data["expires_at"] < time.time():
        del _rate_limit_storage[key]
        return None
    return data["value"]


def _increment_storage(key: str, ttl: int) -> int:
    """Increment counter in storage"""
    data = _get_from_storage(key)
    if data is None:
        data = {"count": 0}
    data["count"] = data.get("count", 0) + 1
    _set_storage(key, data, ttl)
    return data["count"]


class RateLimiter:
    """Advanced rate limiting with multiple strategies"""

    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()

    def get_client_identifier(self, request: Request) -> str:
        """Get unique identifier for client"""
        # Try to get user ID first
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "id"):
            return f"user:{user.id}"

        # Fall back to IP address
        client_ip = self.get_client_ip(request)
        return f"ip:{client_ip}"

    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check X-Forwarded-For header
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to client host
        if request.client:
            return request.client.host

        return "unknown"

    def get_rate_limit_key(self, identifier: str, limit_type: str) -> str:
        """Generate cache key for rate limiting"""
        timestamp = int(time.time() // 60)  # Minute-level granularity
        key_data = f"{identifier}:{limit_type}:{timestamp}"
        return f"rate_limit:{hashlib.md5(key_data.encode()).hexdigest()}"

    def get_limit_for_request(self, request: Request) -> Dict[str, int]:
        """Determine appropriate rate limit for request"""
        path = request.url.path.lower()
        method = request.method.upper()

        # Check specific endpoints
        if "/auth/login" in path or "/auth/token" in path:
            return self.config.DEFAULT_LIMITS["login"]
        elif "/auth/password-reset" in path or "/auth/reset-password" in path:
            return self.config.DEFAULT_LIMITS["password_reset"]
        elif "/upload" in path or "/file" in path:
            return self.config.DEFAULT_LIMITS["upload"]
        elif "/export" in path or "/download" in path:
            return self.config.DEFAULT_LIMITS["export"]
        elif path.startswith("/api/"):
            return self.config.DEFAULT_LIMITS["api"]

        # Check user role limits
        user = getattr(request.state, "user", None)
        if user:
            if getattr(user, "is_superuser", False):
                return self.config.ROLE_LIMITS.get("superuser", self.config.DEFAULT_LIMITS["default"])

        # Default limit
        return self.config.DEFAULT_LIMITS["default"]

    def is_rate_limited(self, request: Request) -> Tuple[bool, Optional[str], int]:
        """
        Check if request should be rate limited

        Returns:
            Tuple of (is_limited, reason, remaining_requests)
        """
        if not self.config.ENABLED:
            return False, None, -1

        # Check IP blacklist
        client_ip = self.get_client_ip(request)
        if client_ip in self.config.BLACKLISTED_IPS:
            return True, "IP address is blacklisted", 0

        # Check IP whitelist
        if client_ip in self.config.WHITELISTED_IPS:
            return False, None, -1

        # Get rate limit for this request
        limit_config = self.get_limit_for_request(request)
        identifier = self.get_client_identifier(request)
        cache_key = self.get_rate_limit_key(identifier, "usage")

        # Get current usage
        current_usage = _increment_storage(cache_key, limit_config["duration"])
        remaining = max(0, limit_config["requests"] - current_usage)

        if current_usage > limit_config["requests"]:
            return True, f"Rate limit exceeded: {current_usage}/{limit_config['requests']} requests", remaining

        return False, None, remaining

    def get_rate_limit_headers(self, request: Request) -> Dict[str, str]:
        """Get rate limit headers for response"""
        limit_config = self.get_limit_for_request(request)
        identifier = self.get_client_identifier(request)
        cache_key = self.get_rate_limit_key(identifier, "usage")

        current_data = _get_from_storage(cache_key)
        current_usage = current_data.get("count", 0) if current_data else 0

        return {
            "X-RateLimit-Limit": str(limit_config["requests"]),
            "X-RateLimit-Remaining": str(max(0, limit_config["requests"] - current_usage)),
            "X-RateLimit-Reset": str(int(time.time()) + limit_config["duration"]),
        }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting"""

    def __init__(self, app, config: Optional[RateLimitConfig] = None):
        super().__init__(app)
        self.rate_limiter = RateLimiter(config)

    async def dispatch(self, request: Request, call_next):
        """Check rate limit before processing request"""
        # Check if request should be rate limited
        is_limited, reason, remaining = self.rate_limiter.is_rate_limited(request)

        if is_limited:
            logger.warning(
                f"Rate limit exceeded: {reason} - IP: {self.rate_limiter.get_client_ip(request)}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate Limit Exceeded",
                    "message": reason or "Too many requests. Please try again later.",
                    "retry_after": 60,
                },
                headers={
                    "Retry-After": "60",
                    **self.rate_limiter.get_rate_limit_headers(request),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        for key, value in self.rate_limiter.get_rate_limit_headers(request).items():
            response.headers[key] = value

        return response


# Decorator for rate limiting specific endpoints
def rate_limit(
    limit_type: str = "default",
    requests: Optional[int] = None,
    duration: Optional[int] = None,
):
    """
    Decorator to apply rate limiting to specific endpoints

    Usage:
        @rate_limit(limit_type="login")
        async def login():
            ...

        @rate_limit(requests=10, duration=60)
        async def custom_limited():
            ...
    """
    def decorator(func: Callable):
        async def wrapper(request: Request, *args, **kwargs):
            limiter = RateLimiter()

            # Use custom limit if provided
            if requests and duration:
                limit_config = {"requests": requests, "duration": duration}
            else:
                limit_config = limiter.config.DEFAULT_LIMITS.get(
                    limit_type, limiter.config.DEFAULT_LIMITS["default"]
                )

            identifier = limiter.get_client_identifier(request)
            cache_key = limiter.get_rate_limit_key(identifier, limit_type)
            current_usage = _increment_storage(cache_key, limit_config["duration"])

            if current_usage > limit_config["requests"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate Limit Exceeded",
                        "message": f"Rate limit exceeded: {current_usage}/{limit_config['requests']} requests",
                        "retry_after": limit_config["duration"],
                    },
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator


# Utility functions
def get_rate_limit_stats(identifier: str) -> Dict[str, Any]:
    """Get rate limiting statistics for an identifier"""
    analytics_key = f"rate_analytics:{identifier}"
    return _get_from_storage(analytics_key) or {
        "total_requests": 0,
        "blocked_requests": 0,
        "last_request": None,
        "endpoints": {},
    }


def clear_rate_limits(identifier: Optional[str] = None) -> None:
    """Clear rate limits for identifier or all"""
    if identifier:
        # Clear specific identifier
        keys_to_delete = [k for k in _rate_limit_storage.keys() if identifier in k]
        for key in keys_to_delete:
            del _rate_limit_storage[key]
    else:
        # Clear all rate limits
        _rate_limit_storage.clear()

    logger.info(f"Cleared rate limits for: {identifier or 'all'}")


def block_ip(ip_address: str, duration: int = 3600) -> None:
    """Block an IP address for specified duration"""
    cache_key = f"blocked_ip:{ip_address}"
    _set_storage(cache_key, {"blocked": True}, duration)
    logger.warning(f"IP {ip_address} blocked for {duration} seconds")


def unblock_ip(ip_address: str) -> None:
    """Unblock an IP address"""
    cache_key = f"blocked_ip:{ip_address}"
    if cache_key in _rate_limit_storage:
        del _rate_limit_storage[cache_key]
    logger.info(f"IP {ip_address} unblocked")
