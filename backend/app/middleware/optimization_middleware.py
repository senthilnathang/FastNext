"""
Response optimization middleware for FastAPI applications.
Includes compression, caching, minification, and response optimization.
"""

import asyncio
import gzip
import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

import brotli
from app.core.cache import CacheConfig, cache_manager
from app.core.config import settings
from fastapi import HTTPException, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class CompressionLevel(Enum):
    """Compression levels for responses"""

    NONE = 0
    LOW = 1
    MEDIUM = 6
    HIGH = 9


class OptimizationStrategy(Enum):
    """Response optimization strategies"""

    DISABLED = "disabled"
    BASIC = "basic"
    AGGRESSIVE = "aggressive"
    CUSTOM = "custom"


@dataclass
class OptimizationConfig:
    """Configuration for response optimization"""

    enable_compression: bool = True
    compression_level: CompressionLevel = CompressionLevel.MEDIUM
    min_compression_size: int = 1024  # Only compress responses larger than 1KB
    enable_response_caching: bool = True
    cache_ttl: int = 300  # 5 minutes
    enable_minification: bool = True
    enable_etag: bool = True
    enable_content_optimization: bool = True
    optimization_strategy: OptimizationStrategy = OptimizationStrategy.BASIC
    excluded_paths: List[str] = None

    def __post_init__(self):
        if self.excluded_paths is None:
            self.excluded_paths = ["/docs", "/redoc", "/openapi.json", "/health"]


class ResponseOptimizer:
    """Core response optimization engine"""

    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.cache = cache_manager.get_cache("api_responses")
        if self.cache is None:
            cache_config = CacheConfig(
                default_ttl=config.cache_ttl, max_size=2000, key_prefix="response"
            )
            self.cache = cache_manager.create_cache("api_responses", cache_config)

    async def optimize_response(
        self, request: Request, response: Response, content: bytes
    ) -> tuple[Response, bytes]:
        """Apply comprehensive response optimization"""

        # Skip optimization for excluded paths
        if any(path in str(request.url.path) for path in self.config.excluded_paths):
            return response, content

        optimized_content = content

        # Apply content optimization
        if self.config.enable_content_optimization:
            optimized_content = await self._optimize_content(
                optimized_content, response.headers.get("content-type", "")
            )

        # Apply compression
        if self.config.enable_compression:
            optimized_content, compression_type = await self._apply_compression(
                request, optimized_content
            )
            if compression_type:
                response.headers["content-encoding"] = compression_type

        # Apply caching headers
        if self.config.enable_response_caching:
            await self._apply_caching_headers(request, response, optimized_content)

        # Apply ETag
        if self.config.enable_etag:
            etag = self._generate_etag(optimized_content)
            response.headers["etag"] = etag

            # Check if client has cached version
            if request.headers.get("if-none-match") == etag:
                response.status_code = 304
                return response, b""

        # Update content length
        response.headers["content-length"] = str(len(optimized_content))

        return response, optimized_content

    async def _optimize_content(self, content: bytes, content_type: str) -> bytes:
        """Optimize content based on type"""
        if not content or len(content) == 0:
            return content

        try:
            if "application/json" in content_type:
                return await self._optimize_json(content)
            elif "text/html" in content_type:
                return await self._optimize_html(content)
            elif "text/css" in content_type:
                return await self._optimize_css(content)
            elif (
                "application/javascript" in content_type
                or "text/javascript" in content_type
            ):
                return await self._optimize_javascript(content)

            return content
        except Exception as e:
            logger.warning(f"Content optimization failed: {e}")
            return content

    async def _optimize_json(self, content: bytes) -> bytes:
        """Optimize JSON content"""
        if not self.config.enable_minification:
            return content

        try:
            # Parse and reserialize JSON without whitespace
            data = json.loads(content.decode("utf-8"))
            optimized = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
            return optimized.encode("utf-8")
        except Exception:
            return content

    async def _optimize_html(self, content: bytes) -> bytes:
        """Optimize HTML content"""
        if not self.config.enable_minification:
            return content

        try:
            html = content.decode("utf-8")

            # Remove comments
            html = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)

            # Remove extra whitespace
            html = re.sub(r"\s+", " ", html)
            html = re.sub(r">\s+<", "><", html)

            # Remove whitespace around tags
            html = html.strip()

            return html.encode("utf-8")
        except Exception:
            return content

    async def _optimize_css(self, content: bytes) -> bytes:
        """Optimize CSS content"""
        if not self.config.enable_minification:
            return content

        try:
            css = content.decode("utf-8")

            # Remove comments
            css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)

            # Remove extra whitespace
            css = re.sub(r"\s+", " ", css)
            css = re.sub(r";\s*}", "}", css)
            css = re.sub(r"{\s*", "{", css)
            css = re.sub(r";\s*", ";", css)

            return css.strip().encode("utf-8")
        except Exception:
            return content

    async def _optimize_javascript(self, content: bytes) -> bytes:
        """Optimize JavaScript content"""
        if not self.config.enable_minification:
            return content

        try:
            js = content.decode("utf-8")

            # Basic minification (remove comments and extra whitespace)
            # Note: For production, consider using a proper JS minifier
            js = re.sub(r"//.*?\n", "\n", js)
            js = re.sub(r"/\*.*?\*/", "", js, flags=re.DOTALL)
            js = re.sub(r"\s+", " ", js)

            return js.strip().encode("utf-8")
        except Exception:
            return content

    async def _apply_compression(
        self, request: Request, content: bytes
    ) -> tuple[bytes, Optional[str]]:
        """Apply compression to response content"""
        if len(content) < self.config.min_compression_size:
            return content, None

        accept_encoding = request.headers.get("accept-encoding", "")

        try:
            # Prefer Brotli compression if supported
            if "br" in accept_encoding:
                compressed = brotli.compress(
                    content, quality=self.config.compression_level.value
                )
                return compressed, "br"

            # Fall back to Gzip
            elif "gzip" in accept_encoding:
                compressed = gzip.compress(
                    content, compresslevel=self.config.compression_level.value
                )
                return compressed, "gzip"

            return content, None

        except Exception as e:
            logger.warning(f"Compression failed: {e}")
            return content, None

    async def _apply_caching_headers(
        self, request: Request, response: Response, content: bytes
    ):
        """Apply appropriate caching headers"""
        path = str(request.url.path)

        # Different caching strategies based on content type and path
        if path.startswith("/api/"):
            # API responses - short cache
            response.headers["cache-control"] = (
                f"public, max-age={self.config.cache_ttl}"
            )
        elif path.startswith("/static/"):
            # Static assets - long cache with versioning
            response.headers["cache-control"] = "public, max-age=31536000, immutable"
        else:
            # Default caching
            response.headers["cache-control"] = (
                f"public, max-age={self.config.cache_ttl}"
            )

        # Add cache validation headers
        response.headers["vary"] = "Accept-Encoding, Accept"

        # Add last-modified header
        response.headers["last-modified"] = datetime.utcnow().strftime(
            "%a, %d %b %Y %H:%M:%S GMT"
        )

    def _generate_etag(self, content: bytes) -> str:
        """Generate ETag for content"""
        return f'"{hashlib.md5(content).hexdigest()}"'


class ResponseCachingMiddleware:
    """Middleware for caching API responses"""

    def __init__(self, cache_ttl: int = 300):
        self.cache_ttl = cache_ttl
        self.cache = cache_manager.get_cache("api_responses")
        if self.cache is None:
            cache_config = CacheConfig(
                default_ttl=cache_ttl, max_size=2000, key_prefix="response_cache"
            )
            self.cache = cache_manager.create_cache("api_responses", cache_config)

    async def process_request(self, request: Request) -> Optional[Response]:
        """Check if we have a cached response"""
        if request.method != "GET":
            return None

        cache_key = self._generate_cache_key(request)
        cached_response = await self.cache.get(cache_key)

        if cached_response:
            logger.debug(f"Response cache hit: {cache_key}")
            return JSONResponse(
                content=cached_response["content"],
                status_code=cached_response["status_code"],
                headers=cached_response["headers"],
            )

        return None

    async def cache_response(self, request: Request, response: Response, content: Any):
        """Cache the response for future requests"""
        if request.method != "GET" or response.status_code != 200:
            return

        cache_key = self._generate_cache_key(request)

        # Prepare response data for caching
        cache_data = {
            "content": content,
            "status_code": response.status_code,
            "headers": dict(response.headers),
        }

        await self.cache.set(cache_key, cache_data, self.cache_ttl)
        logger.debug(f"Response cached: {cache_key}")

    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key from request"""
        key_parts = [
            request.method,
            str(request.url.path),
            str(request.url.query),
            request.headers.get("accept", ""),
            request.headers.get("accept-language", ""),
        ]

        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()


class OptimizationMiddleware(BaseHTTPMiddleware):
    """Main optimization middleware that orchestrates all optimizations"""

    def __init__(self, app: ASGIApp, config: Optional[OptimizationConfig] = None):
        super().__init__(app)
        self.config = config or OptimizationConfig()
        self.optimizer = ResponseOptimizer(self.config)
        self.cache_middleware = ResponseCachingMiddleware(self.config.cache_ttl)
        self.performance_metrics = {
            "total_requests": 0,
            "optimized_requests": 0,
            "compression_ratio": 0.0,
            "cache_hits": 0,
            "cache_misses": 0,
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through optimization pipeline"""
        start_time = time.time()

        # Check for cached response first
        cached_response = await self.cache_middleware.process_request(request)
        if cached_response:
            self.performance_metrics["cache_hits"] += 1
            self.performance_metrics["total_requests"] += 1
            return cached_response

        self.performance_metrics["cache_misses"] += 1

        # Process request normally
        response = await call_next(request)

        # Extract response content
        content = b""
        if hasattr(response, "body"):
            content = response.body
        elif isinstance(response, StreamingResponse):
            # Handle streaming responses
            content_chunks = []
            async for chunk in response.body_iterator:
                content_chunks.append(chunk)
            content = b"".join(content_chunks)

            # Create new response with optimized content
            response = Response(
                content=content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        original_size = len(content)

        # Apply optimizations
        if self.config.optimization_strategy != OptimizationStrategy.DISABLED:
            response, content = await self.optimizer.optimize_response(
                request, response, content
            )

            # Update performance metrics
            optimized_size = len(content)
            if optimized_size < original_size:
                compression_ratio = (original_size - optimized_size) / original_size
                self.performance_metrics["compression_ratio"] = (
                    self.performance_metrics["compression_ratio"]
                    * self.performance_metrics["optimized_requests"]
                    + compression_ratio
                ) / (self.performance_metrics["optimized_requests"] + 1)
                self.performance_metrics["optimized_requests"] += 1

        # Cache the response
        if self.config.enable_response_caching:
            try:
                # For JSON responses, parse content for caching
                if response.headers.get("content-type", "").startswith(
                    "application/json"
                ):
                    json_content = json.loads(content.decode("utf-8"))
                    await self.cache_middleware.cache_response(
                        request, response, json_content
                    )
                else:
                    await self.cache_middleware.cache_response(
                        request, response, content.decode("utf-8")
                    )
            except Exception as e:
                logger.debug(f"Response caching failed: {e}")

        # Update response body
        if content != response.body:
            response = Response(
                content=content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        # Add performance headers
        processing_time = time.time() - start_time
        response.headers["x-processing-time"] = f"{processing_time:.4f}"
        response.headers["x-optimized"] = (
            "true" if self.performance_metrics["optimized_requests"] > 0 else "false"
        )

        self.performance_metrics["total_requests"] += 1

        return response

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get optimization performance metrics"""
        total_requests = self.performance_metrics["total_requests"]

        return {
            **self.performance_metrics,
            "cache_hit_rate": (
                self.performance_metrics["cache_hits"] / total_requests
                if total_requests > 0
                else 0
            ),
            "optimization_rate": (
                self.performance_metrics["optimized_requests"] / total_requests
                if total_requests > 0
                else 0
            ),
        }


class ConditionalOptimizationMiddleware(OptimizationMiddleware):
    """Optimization middleware with conditional optimization based on request characteristics"""

    def __init__(
        self,
        app: ASGIApp,
        config: Optional[OptimizationConfig] = None,
        optimization_rules: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(app, config)
        self.optimization_rules = (
            optimization_rules or self._default_optimization_rules()
        )

    def _default_optimization_rules(self) -> Dict[str, Any]:
        """Default optimization rules based on request patterns"""
        return {
            "mobile_user_agents": ["Mobile", "Android", "iPhone", "iPad", "BlackBerry"],
            "slow_connection_indicators": ["2G", "slow", "save-data"],
            "priority_paths": ["/api/users", "/api/dashboard", "/api/analytics"],
            "aggressive_optimization_paths": ["/api/reports", "/api/export"],
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply conditional optimization based on request characteristics"""

        # Adjust optimization strategy based on request
        original_strategy = self.config.optimization_strategy

        try:
            # Check for mobile users
            user_agent = request.headers.get("user-agent", "")
            is_mobile = any(
                mobile in user_agent
                for mobile in self.optimization_rules["mobile_user_agents"]
            )

            # Check for slow connections
            connection_type = request.headers.get("connection", "")
            save_data = request.headers.get("save-data", "") == "on"
            is_slow_connection = save_data or any(
                indicator in connection_type.lower()
                for indicator in self.optimization_rules["slow_connection_indicators"]
            )

            # Check path priority
            path = str(request.url.path)
            is_priority_path = any(
                priority_path in path
                for priority_path in self.optimization_rules["priority_paths"]
            )

            is_aggressive_path = any(
                aggressive_path in path
                for aggressive_path in self.optimization_rules[
                    "aggressive_optimization_paths"
                ]
            )

            # Adjust optimization strategy
            if is_aggressive_path or (is_mobile and is_slow_connection):
                self.config.optimization_strategy = OptimizationStrategy.AGGRESSIVE
                self.config.compression_level = CompressionLevel.HIGH
                self.config.enable_minification = True
            elif is_mobile or is_slow_connection or is_priority_path:
                self.config.optimization_strategy = OptimizationStrategy.BASIC
                self.config.compression_level = CompressionLevel.MEDIUM

            # Process request with adjusted configuration
            return await super().dispatch(request, call_next)

        finally:
            # Restore original configuration
            self.config.optimization_strategy = original_strategy


# Global optimization middleware instance
optimization_middleware = None


def setup_optimization_middleware(
    app, config: Optional[OptimizationConfig] = None, conditional: bool = True
) -> OptimizationMiddleware:
    """Setup and configure optimization middleware"""
    global optimization_middleware

    config = config or OptimizationConfig()

    if conditional:
        optimization_middleware = ConditionalOptimizationMiddleware(app, config)
    else:
        optimization_middleware = OptimizationMiddleware(app, config)

    logger.info(
        f"Optimization middleware configured with strategy: {config.optimization_strategy.value}"
    )

    return optimization_middleware


def get_optimization_metrics() -> Dict[str, Any]:
    """Get current optimization metrics"""
    if optimization_middleware:
        return optimization_middleware.get_performance_metrics()
    return {}
