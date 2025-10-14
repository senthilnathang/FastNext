"""
Cache middleware for FastNext Framework
"""

import hashlib
import json
import logging
import time
from typing import Any, Callable, Dict, Optional

from app.core.config import settings
from app.core.redis_config import CacheStrategy, cache
from fastapi import Request, Response
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class CacheMiddleware:
    """Middleware for HTTP response caching"""

    def __init__(
        self,
        app: Callable,
        default_ttl: int = CacheStrategy.API_RESPONSE_TTL,
        cache_key_prefix: str = "http_cache",
    ):
        self.app = app
        self.default_ttl = default_ttl
        self.cache_key_prefix = cache_key_prefix
        self.cacheable_methods = {"GET", "HEAD"}
        self.non_cacheable_paths = {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",
            "/auth/logout",
            "/auth/refresh",
            "/api/v1/data/import/upload",
            "/api/v1/data/export/create",
            "/upload",
            "/download",
        }

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip caching for non-cacheable requests
        if not self._should_cache_request(request):
            await self.app(scope, receive, send)
            return

        # Generate cache key
        cache_key = self._generate_cache_key(request)

        # Try to get cached response
        if settings.CACHE_ENABLED:
            try:
                cached_response = await cache.get(cache_key)
                if cached_response:
                    logger.debug(f"🎯 Cache hit for: {request.url.path}")

                    # Handle binary content reconstruction
                    content = cached_response["content"]

                    # Prepare headers for response (ensure all values are strings)
                    response_headers = {}
                    cached_headers = cached_response.get("headers", {})
                    if isinstance(cached_headers, dict):
                        for k, v in cached_headers.items():
                            # Ensure header values are strings, not bytes
                            key = str(k)
                            value = str(v)
                            response_headers[key] = value

                    # Add cache headers
                    response_headers.update(
                        {"X-Cache": "HIT", "X-Cache-Key": cache_key[:16] + "..."}
                    )

                    if isinstance(content, dict) and content.get("_binary_content"):
                        import base64

                        from fastapi import Response

                        binary_data = base64.b64decode(content["_data"])
                        response = Response(
                            content=binary_data,
                            status_code=cached_response["status_code"],
                            headers=response_headers,
                        )
                    else:
                        response = JSONResponse(
                            content=content,
                            status_code=cached_response["status_code"],
                            headers=response_headers,
                        )
                    await response(scope, receive, send)
                    return
            except Exception as e:
                logger.error(f"❌ Cache retrieval error: {e}")
                # Continue without cache on error

        # Cache miss - execute request and cache response
        response_data = {}
        response_complete = False

        async def send_wrapper(message: dict) -> None:
            nonlocal response_data, response_complete

            if message["type"] == "http.response.start":
                response_data["status_code"] = message["status"]
                # Store headers as tuples for proper processing
                response_data["headers"] = message.get("headers", [])

                # Add cache headers safely
                try:
                    message["headers"] = [
                        *message.get("headers", []),
                        (b"x-cache", b"MISS"),
                        (b"x-cache-key", cache_key[:16].encode() + b"..."),
                    ]
                except Exception as e:
                    logger.error(f"❌ Error adding cache headers: {e}")

            elif message["type"] == "http.response.body":
                if "content" not in response_data:
                    response_data["content"] = b""
                response_data["content"] += message.get("body", b"")

                if not message.get("more_body", False):
                    response_complete = True
                    try:
                        await self._cache_response(cache_key, response_data)
                    except Exception as e:
                        logger.error(f"❌ Cache storage error: {e}")

            await send(message)

        await self.app(scope, receive, send_wrapper)

    def _should_cache_request(self, request: Request) -> bool:
        """Determine if request should be cached"""
        # Only cache GET requests
        if request.method not in self.cacheable_methods:
            return False

        # Skip certain paths
        path = request.url.path
        if any(
            path.startswith(non_cacheable) for non_cacheable in self.non_cacheable_paths
        ):
            return False

        # Skip if cache-control header says no-cache
        cache_control = request.headers.get("cache-control", "")
        if "no-cache" in cache_control:
            return False

        return True

    def _generate_cache_key(self, request: Request) -> str:
        """Generate a unique cache key for the request"""
        # Include method, path, query params, and relevant headers
        key_components = [
            request.method,
            str(request.url.path),
            str(request.url.query),
            request.headers.get("accept", ""),
            request.headers.get("accept-encoding", ""),
            (
                request.headers.get("authorization", "")[:20]
                if request.headers.get("authorization")
                else ""
            ),  # Only first 20 chars for security
        ]

        key_string = "|".join(key_components)
        hash_key = hashlib.md5(key_string.encode()).hexdigest()

        return f"{self.cache_key_prefix}:{hash_key}"

    async def _cache_response(self, cache_key: str, response_data: dict) -> None:
        """Cache the response if appropriate"""
        try:
            status_code = response_data.get("status_code", 500)

            # Only cache successful responses
            if 200 <= status_code < 300:
                content = response_data.get("content", b"")

                # Parse JSON content if possible
                try:
                    if content:
                        parsed_content = json.loads(content.decode())
                    else:
                        parsed_content = None
                except (json.JSONDecodeError, UnicodeDecodeError):
                    # Handle binary content that can't be decoded as text
                    try:
                        parsed_content = content.decode() if content else ""
                    except UnicodeDecodeError:
                        # For binary content, encode as base64 for JSON serialization
                        import base64

                        parsed_content = {
                            "_binary_content": True,
                            "_data": base64.b64encode(content).decode("utf-8"),
                        }

                # Convert headers to string format for caching
                headers_dict = {}
                headers_list = response_data.get("headers", [])

                # Handle both list of tuples and dict formats
                if isinstance(headers_list, list):
                    for header_tuple in headers_list:
                        if len(header_tuple) == 2:
                            k, v = header_tuple
                            # Convert bytes to string if needed
                            key = k.decode("utf-8") if isinstance(k, bytes) else str(k)
                            value = (
                                v.decode("utf-8") if isinstance(v, bytes) else str(v)
                            )

                            # Skip cache headers
                            if not key.lower().startswith("x-cache"):
                                headers_dict[key] = value
                elif isinstance(headers_list, dict):
                    for k, v in headers_list.items():
                        # Convert bytes to string if needed
                        key = k.decode("utf-8") if isinstance(k, bytes) else str(k)
                        value = v.decode("utf-8") if isinstance(v, bytes) else str(v)

                        # Skip cache headers
                        if not key.lower().startswith("x-cache"):
                            headers_dict[key] = value

                cache_data = {
                    "content": parsed_content,
                    "status_code": status_code,
                    "headers": headers_dict,
                    "cached_at": time.time(),
                }

                await cache.set(cache_key, cache_data, self.default_ttl)
                logger.debug(f"💾 Cached response for key: {cache_key[:16]}...")

        except Exception as e:
            logger.error(f"❌ Failed to cache response: {e}")


class RateLimitMiddleware:
    """Rate limiting middleware using Redis"""

    def __init__(
        self,
        app: Callable,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
    ):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Check rate limits
        minute_limit = await self._check_rate_limit(
            client_id, "minute", self.requests_per_minute, 60
        )
        hour_limit = await self._check_rate_limit(
            client_id, "hour", self.requests_per_hour, 3600
        )

        if not minute_limit["allowed"] or not hour_limit["allowed"]:
            # Rate limit exceeded
            response = JSONResponse(
                content={
                    "detail": "Rate limit exceeded",
                    "minute_limit": minute_limit,
                    "hour_limit": hour_limit,
                },
                status_code=429,
                headers={
                    "X-RateLimit-Limit-Minute": str(self.requests_per_minute),
                    "X-RateLimit-Remaining-Minute": str(minute_limit["remaining"]),
                    "X-RateLimit-Reset-Minute": str(int(minute_limit["reset_time"])),
                    "X-RateLimit-Limit-Hour": str(self.requests_per_hour),
                    "X-RateLimit-Remaining-Hour": str(hour_limit["remaining"]),
                    "X-RateLimit-Reset-Hour": str(int(hour_limit["reset_time"])),
                    "Retry-After": str(
                        int(
                            min(minute_limit["reset_time"], hour_limit["reset_time"])
                            - time.time()
                        )
                    ),
                },
            )
            await response(scope, receive, send)
            return

        # Add rate limit headers to response
        async def send_wrapper(message: dict) -> None:
            if message["type"] == "http.response.start":
                message["headers"] = [
                    *message.get("headers", []),
                    (
                        b"x-ratelimit-limit-minute",
                        str(self.requests_per_minute).encode(),
                    ),
                    (
                        b"x-ratelimit-remaining-minute",
                        str(minute_limit["remaining"]).encode(),
                    ),
                    (b"x-ratelimit-limit-hour", str(self.requests_per_hour).encode()),
                    (
                        b"x-ratelimit-remaining-hour",
                        str(hour_limit["remaining"]).encode(),
                    ),
                ]
            await send(message)

        await self.app(scope, receive, send_wrapper)

    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier for rate limiting"""
        # Try to get user ID from JWT token first
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Extract user info from token (simplified)
            return f"user:{auth_header[7:27]}"  # Use part of token as ID

        # Fallback to IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"ip:{client_ip}"

    async def _check_rate_limit(
        self, client_id: str, window_type: str, limit: int, window_seconds: int
    ) -> Dict[str, Any]:
        """Check rate limit for client"""
        from app.core.redis_config import rate_limiter

        rate_limit_key = f"{client_id}:{window_type}"
        return await rate_limiter.check_rate_limit(
            rate_limit_key, limit, window_seconds
        )


def cache_response(
    ttl: int = CacheStrategy.API_RESPONSE_TTL,
    key_prefix: str = "endpoint",
    vary_on_user: bool = False,
):
    """
    Decorator for caching endpoint responses

    Args:
        ttl: Cache time-to-live in seconds
        key_prefix: Prefix for cache keys
        vary_on_user: Include user ID in cache key
    """

    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            if not settings.CACHE_ENABLED:
                return await func(request, *args, **kwargs)

            # Build cache key
            path_params = "_".join(str(v) for v in kwargs.values())
            query_params = str(request.url.query) if request.url.query else ""
            user_part = ""

            if vary_on_user:
                # Extract user ID from request (simplified)
                auth_header = request.headers.get("authorization", "")
                if auth_header.startswith("Bearer "):
                    user_part = f"_user_{auth_header[7:27]}"

            cache_key = (
                f"{key_prefix}_{func.__name__}_{path_params}_{query_params}{user_part}"
            )
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()

            # Try cache first
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"🎯 Cache hit for endpoint: {func.__name__}")
                return cached_result

            # Execute function and cache result
            result = await func(request, *args, **kwargs)

            # Only cache successful responses
            if hasattr(result, "status_code") and 200 <= result.status_code < 300:
                await cache.set(cache_key, result, ttl)
                logger.debug(f"💾 Cached endpoint result: {func.__name__}")

            return result

        return wrapper

    return decorator
