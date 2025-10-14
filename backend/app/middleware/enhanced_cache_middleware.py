"""
Enhanced Multi-Level Cache Middleware
Implements browser, CDN, and Redis caching with intelligent invalidation
"""

import hashlib
import json
import logging
import time
from typing import Any, Callable, Dict, Optional

from app.core.cache_optimization import (
    CacheLevel,
    CachePolicy,
    get_cache_control_headers,
)
from app.core.config import settings
from app.core.redis_config import cache
from fastapi import Request, Response
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class EnhancedCacheMiddleware:
    """
    Multi-level caching middleware with support for:
    - Browser caching (Cache-Control headers)
    - CDN caching (CDN-specific headers)
    - Redis caching (server-side)
    """

    def __init__(self, app: Callable, default_policy: Optional[CachePolicy] = None):
        self.app = app
        self.default_policy = default_policy or CachePolicy.redis_cache(ttl=300)

        # Path-specific cache policies
        self.path_policies: Dict[str, CachePolicy] = {
            # Static assets - CDN + Browser
            "/static": CachePolicy.cdn_cache(ttl=86400 * 7),  # 1 week
            "/assets": CachePolicy.cdn_cache(ttl=86400 * 7),
            # API responses - Redis + Browser
            "/api/v1/users": CachePolicy.redis_cache(ttl=600, tags={"table:users"}),
            "/api/v1/projects": CachePolicy.redis_cache(
                ttl=300, tags={"table:projects"}
            ),
            "/api/v1/activity-logs": CachePolicy.redis_cache(
                ttl=60, tags={"table:activity_logs"}
            ),
            # Dashboard data - Full cache
            "/api/v1/dashboard": CachePolicy.full_cache(ttl=300, tags={"dashboard"}),
            # Reports - CDN + Redis
            "/api/v1/reports": CachePolicy.full_cache(ttl=1800, tags={"reports"}),
        }

        # Non-cacheable paths
        self.non_cacheable_paths = {
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",
            "/auth/logout",
            "/auth/refresh",
            "/api/v1/data/import",
            "/api/v1/data/export",
            "/upload",
            "/download",
            "/api/v1/cache",  # Cache management endpoints
            "/api/v1/database/performance",  # Performance monitoring endpoints
        }

        # Cacheable HTTP methods
        self.cacheable_methods = {"GET", "HEAD"}

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip caching for non-cacheable requests
        if not self._should_cache_request(request):
            await self.app(scope, receive, send)
            return

        # Get cache policy for this path
        policy = self._get_cache_policy(request.url.path)

        # Generate cache key
        cache_key = self._generate_cache_key(request, policy)

        # Try to get from Redis cache (if enabled in policy)
        if CacheLevel.REDIS in policy.cache_levels and settings.CACHE_ENABLED:
            try:
                cached_response = await cache.get(cache_key)
                if cached_response:
                    logger.debug(f"🎯 Redis cache hit: {request.url.path}")
                    await self._send_cached_response(
                        scope, receive, send, cached_response, policy, cache_hit=True
                    )
                    return
            except Exception as e:
                logger.error(f"Redis cache retrieval error: {e}")

        # Cache miss - execute request and cache response
        await self._execute_and_cache(scope, receive, send, cache_key, policy)

    def _should_cache_request(self, request: Request) -> bool:
        """Determine if request should be cached"""
        # Only cache GET/HEAD requests
        if request.method not in self.cacheable_methods:
            return False

        # Skip non-cacheable paths
        path = request.url.path
        if any(
            path.startswith(non_cacheable) for non_cacheable in self.non_cacheable_paths
        ):
            return False

        # Skip if client says no-cache
        cache_control = request.headers.get("cache-control", "")
        if "no-cache" in cache_control or "no-store" in cache_control:
            return False

        return True

    def _get_cache_policy(self, path: str) -> CachePolicy:
        """Get cache policy for a specific path"""
        # Check exact match first
        if path in self.path_policies:
            return self.path_policies[path]

        # Check prefix match
        for prefix, policy in self.path_policies.items():
            if path.startswith(prefix):
                return policy

        # Return default policy
        return self.default_policy

    def _generate_cache_key(self, request: Request, policy: CachePolicy) -> str:
        """Generate cache key based on request and policy"""
        key_components = [
            request.method,
            str(request.url.path),
            str(request.url.query),
        ]

        # Add vary factors
        if "user" in policy.vary_by:
            auth = request.headers.get("authorization", "")
            key_components.append(auth[:30] if auth else "anon")

        if "role" in policy.vary_by:
            role = request.headers.get("x-user-role", "")
            key_components.append(role)

        # Add accept headers
        key_components.append(request.headers.get("accept", ""))
        key_components.append(request.headers.get("accept-encoding", ""))

        # Generate hash
        key_string = "|".join(key_components)
        hash_key = hashlib.sha256(key_string.encode()).hexdigest()

        return f"enhanced_cache:{hash_key}"

    async def _send_cached_response(
        self,
        scope: dict,
        receive: Callable,
        send: Callable,
        cached_data: dict,
        policy: CachePolicy,
        cache_hit: bool = True,
    ):
        """Send a cached response with appropriate headers"""
        # Reconstruct content
        content = cached_data.get("content", {})
        status_code = cached_data.get("status_code", 200)
        cached_headers = cached_data.get("headers", {})

        # Generate cache control headers
        cache_headers = get_cache_control_headers(policy)

        # Merge headers
        response_headers = {**cached_headers, **cache_headers}

        # Add cache status headers
        response_headers.update(
            {
                "X-Cache": "HIT" if cache_hit else "MISS",
                "X-Cache-Level": "REDIS" if cache_hit else "NONE",
                "Age": str(
                    int(time.time() - cached_data.get("cached_at", time.time()))
                ),
            }
        )

        # Handle binary content
        if isinstance(content, dict) and content.get("_binary_content"):
            import base64

            binary_data = base64.b64decode(content["_data"])
            response = Response(
                content=binary_data, status_code=status_code, headers=response_headers
            )
        else:
            response = JSONResponse(
                content=content, status_code=status_code, headers=response_headers
            )

        await response(scope, receive, send)

    async def _execute_and_cache(
        self,
        scope: dict,
        receive: Callable,
        send: Callable,
        cache_key: str,
        policy: CachePolicy,
    ):
        """Execute request and cache the response"""
        response_data = {}
        response_complete = False

        # Generate cache control headers
        cache_headers = get_cache_control_headers(policy)

        async def send_wrapper(message: dict) -> None:
            nonlocal response_data, response_complete

            if message["type"] == "http.response.start":
                response_data["status_code"] = message["status"]
                response_data["headers"] = message.get("headers", [])

                # Add cache headers
                cache_header_list = [
                    (k.lower().encode(), v.encode()) for k, v in cache_headers.items()
                ]

                message["headers"] = [
                    *message.get("headers", []),
                    *cache_header_list,
                    (b"x-cache", b"MISS"),
                    (b"x-cache-level", b"NONE"),
                ]

            elif message["type"] == "http.response.body":
                if "content" not in response_data:
                    response_data["content"] = b""
                response_data["content"] += message.get("body", b"")

                if not message.get("more_body", False):
                    response_complete = True
                    await self._cache_response(cache_key, response_data, policy)

            await send(message)

        await self.app(scope, receive, send_wrapper)

    async def _cache_response(
        self, cache_key: str, response_data: dict, policy: CachePolicy
    ):
        """Cache the response if appropriate"""
        try:
            status_code = response_data.get("status_code", 500)

            # Only cache successful responses
            if not (200 <= status_code < 300):
                return

            # Only cache if Redis is in the policy
            if CacheLevel.REDIS not in policy.cache_levels:
                return

            content = response_data.get("content", b"")

            # Parse content
            try:
                if content:
                    parsed_content = json.loads(content.decode())
                else:
                    parsed_content = None
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Handle binary content
                try:
                    parsed_content = content.decode() if content else ""
                except UnicodeDecodeError:
                    import base64

                    parsed_content = {
                        "_binary_content": True,
                        "_data": base64.b64encode(content).decode("utf-8"),
                    }

            # Convert headers
            headers_dict = {}
            headers_list = response_data.get("headers", [])

            if isinstance(headers_list, list):
                for header_tuple in headers_list:
                    if len(header_tuple) == 2:
                        k, v = header_tuple
                        key = k.decode("utf-8") if isinstance(k, bytes) else str(k)
                        value = v.decode("utf-8") if isinstance(v, bytes) else str(v)

                        # Skip cache-specific headers
                        if not key.lower().startswith(("x-cache", "age")):
                            headers_dict[key] = value

            # Prepare cache data
            cache_data = {
                "content": parsed_content,
                "status_code": status_code,
                "headers": headers_dict,
                "cached_at": time.time(),
                "cache_policy": {
                    "ttl": policy.ttl,
                    "levels": [level.value for level in policy.cache_levels],
                    "tags": list(policy.invalidation_tags),
                },
            }

            # Cache with TTL
            await cache.set(cache_key, cache_data, policy.ttl)

            # Register for tag-based invalidation
            if policy.invalidation_tags:
                from app.core.cache_optimization import invalidation_strategy

                await invalidation_strategy.register_cache_entry(
                    cache_key, policy.invalidation_tags
                )

            logger.debug(
                f"💾 Cached response: {cache_key[:16]}... "
                f"(TTL: {policy.ttl}s, Tags: {policy.invalidation_tags})"
            )

        except Exception as e:
            logger.error(f"Failed to cache response: {e}")


def cache_policy_decorator(policy: CachePolicy):
    """
    Decorator to apply cache policy to specific endpoints

    Usage:
        @router.get("/users")
        @cache_policy_decorator(CachePolicy.redis_cache(ttl=600, tags={'users'}))
        async def get_users():
            ...
    """

    def decorator(func):
        # Store policy as function attribute
        func.__cache_policy__ = policy
        return func

    return decorator
