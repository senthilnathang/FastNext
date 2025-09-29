from typing import Dict, Optional, List, Tuple, Any
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
import hashlib
import logging
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict, deque
import redis
import json

from app.core.config import settings
from app.core.logging import log_security_event

logger = logging.getLogger(__name__)

# Redis for distributed rate limiting
try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    redis_available = True
except Exception:
    redis_client = None
    redis_available = False
    logger.warning("Redis not available for distributed rate limiting, using in-memory fallback")

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting middleware with multiple algorithms and policies
    """
    
    def __init__(self, app, config: Optional[Dict[str, Any]] = None):
        super().__init__(app)
        self.config = config or {}
        self.setup_rate_limits()
        
        # In-memory storage for when Redis is not available
        self.memory_store = defaultdict(dict)
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def setup_rate_limits(self):
        """Setup rate limiting rules and policies"""
        
        # Default rate limits (requests per time window)
        self.default_limits = {
            "per_second": 10,
            "per_minute": 100,
            "per_hour": 1000,
            "per_day": 10000
        }
        
        # Endpoint-specific rate limits
        self.endpoint_limits = {
            "/api/v1/auth/login": {
                "per_minute": 5,
                "per_hour": 20,
                "per_day": 100
            },
            "/api/v1/auth/register": {
                "per_minute": 2,
                "per_hour": 10,
                "per_day": 50
            },
            "/api/v1/auth/reset-password": {
                "per_minute": 1,
                "per_hour": 5,
                "per_day": 20
            },
            "/api/v1/users": {
                "per_second": 5,
                "per_minute": 50,
                "per_hour": 500
            },
            "/api/v1/projects": {
                "per_second": 20,
                "per_minute": 200,
                "per_hour": 2000
            },
            # File upload endpoints
            "/api/v1/upload": {
                "per_minute": 10,
                "per_hour": 100
            },
            # Search endpoints
            "/api/v1/search": {
                "per_second": 5,
                "per_minute": 100,
                "per_hour": 1000
            }
        }
        
        # User role-based limits
        self.role_multipliers = {
            "admin": 5.0,      # Admins get 5x normal limits
            "premium": 2.0,    # Premium users get 2x normal limits
            "user": 1.0,       # Regular users get normal limits
            "free": 0.5,       # Free users get half normal limits
            "anonymous": 0.2   # Anonymous users get very limited access
        }
        
        # IP-based rate limits for security
        self.security_limits = {
            "failed_auth_attempts": {
                "per_minute": 5,
                "per_hour": 20,
                "per_day": 100
            },
            "malicious_requests": {
                "per_minute": 1,
                "per_hour": 5,
                "per_day": 10
            },
            "suspicious_activity": {
                "per_hour": 10,
                "per_day": 50
            }
        }
        
        # Burst allowance (temporary higher limits)
        self.burst_config = {
            "enabled": True,
            "multiplier": 2.0,  # Allow 2x normal rate for short bursts
            "duration": 60,     # Burst duration in seconds
            "cooldown": 300     # Cooldown before next burst (5 minutes)
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main rate limiting dispatcher"""
        
        try:
            # Skip rate limiting for certain paths
            if self._should_skip_rate_limiting(request.url.path):
                return await call_next(request)
            
            # Get client identifier
            client_id = self._get_client_identifier(request)
            endpoint = self._normalize_endpoint(request.url.path)
            user_info = self._get_user_info(request)
            
            # Check rate limits
            limit_result = await self._check_rate_limits(client_id, endpoint, user_info, request)
            
            if not limit_result.allowed:
                await self._log_rate_limit_exceeded(client_id, endpoint, limit_result, request)
                return self._create_rate_limit_response(limit_result)
            
            # Process request
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Update rate limit counters
            await self._update_counters(client_id, endpoint, user_info, process_time)
            
            # Add rate limit headers
            self._add_rate_limit_headers(response, limit_result)
            
            # Cleanup old entries periodically
            await self._periodic_cleanup()
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting middleware error: {e}")
            # On error, allow the request but log the issue
            return await call_next(request)
    
    def _should_skip_rate_limiting(self, path: str) -> bool:
        """Check if path should skip rate limiting"""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/static/",
            "/_next/"
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier for rate limiting"""
        # Priority order: User ID > API Key > IP Address
        
        # Check for authenticated user
        user = getattr(request.state, 'user', None)
        if user and user.get('user_id'):
            return f"user:{user['user_id']}"
        
        # Check for API key
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"apikey:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
        
        # Fall back to IP address
        client_ip = self._get_client_ip(request)
        return f"ip:{client_ip}"
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")
    
    def _normalize_endpoint(self, path: str) -> str:
        """Normalize endpoint path for consistent rate limiting"""
        # Remove query parameters
        path = path.split('?')[0]
        
        # Normalize path parameters (e.g., /users/123 -> /users/{id})
        import re
        
        # Replace UUIDs with {uuid}
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{uuid}', path)
        
        # Replace numeric IDs with {id}
        path = re.sub(r'/\d+(?=/|$)', '/{id}', path)
        
        return path
    
    def _get_user_info(self, request: Request) -> Dict[str, Any]:
        """Get user information for role-based rate limiting"""
        user = getattr(request.state, 'user', None)
        if user:
            return {
                "user_id": user.get('user_id'),
                "roles": user.get('roles', ['user']),
                "is_premium": 'premium' in user.get('roles', []),
                "is_admin": 'admin' in user.get('roles', [])
            }
        
        return {
            "user_id": None,
            "roles": ['anonymous'],
            "is_premium": False,
            "is_admin": False
        }
    
    async def _check_rate_limits(self, client_id: str, endpoint: str, user_info: Dict[str, Any], request: Request) -> 'RateLimitResult':
        """Check if request is within rate limits"""
        
        # Get applicable limits
        limits = self._get_applicable_limits(endpoint, user_info)
        
        # Check each time window
        for window, limit in limits.items():
            # Check current usage
            current_usage = await self._get_current_usage(client_id, endpoint, window)
            
            # Check if limit exceeded
            if current_usage >= limit:
                # Check for burst allowance
                if self.burst_config["enabled"]:
                    burst_usage = await self._get_burst_usage(client_id, endpoint, window)
                    burst_limit = int(limit * self.burst_config["multiplier"])
                    
                    if burst_usage < burst_limit:
                        # Allow burst, but track it
                        await self._track_burst_usage(client_id, endpoint, window)
                        continue
                
                # Rate limit exceeded
                retry_after = self._calculate_retry_after(window)
                reset_time = self._calculate_reset_time(window)
                
                return RateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=retry_after,
                    window=window
                )
        
        # All limits passed
        remaining = min(limit - await self._get_current_usage(client_id, endpoint, window) 
                       for window, limit in limits.items())
        
        return RateLimitResult(
            allowed=True,
            limit=max(limits.values()),
            remaining=max(0, remaining),
            reset_time=self._calculate_reset_time("per_hour"),  # Use hour as default
            retry_after=0,
            window="allowed"
        )
    
    def _get_applicable_limits(self, endpoint: str, user_info: Dict[str, Any]) -> Dict[str, int]:
        """Get rate limits applicable to this endpoint and user"""
        
        # Start with default limits
        limits = self.default_limits.copy()
        
        # Apply endpoint-specific limits
        if endpoint in self.endpoint_limits:
            limits.update(self.endpoint_limits[endpoint])
        
        # Apply role-based multipliers
        primary_role = self._get_primary_role(user_info["roles"])
        multiplier = self.role_multipliers.get(primary_role, 1.0)
        
        # Apply multiplier to all limits
        limits = {window: int(limit * multiplier) for window, limit in limits.items()}
        
        return limits
    
    def _get_primary_role(self, roles: List[str]) -> str:
        """Get primary role for rate limiting"""
        role_priority = ["admin", "premium", "user", "free", "anonymous"]
        
        for role in role_priority:
            if role in roles:
                return role
        
        return "anonymous"
    
    async def _get_current_usage(self, client_id: str, endpoint: str, window: str) -> int:
        """Get current usage count for the time window"""
        
        if redis_available:
            return await self._get_redis_usage(client_id, endpoint, window)
        else:
            return self._get_memory_usage(client_id, endpoint, window)
    
    async def _get_redis_usage(self, client_id: str, endpoint: str, window: str) -> int:
        """Get usage from Redis"""
        try:
            key = f"rate_limit:{client_id}:{endpoint}:{window}"
            usage = await redis_client.get(key)
            return int(usage) if usage else 0
        except Exception as e:
            logger.error(f"Redis rate limit check error: {e}")
            return 0
    
    def _get_memory_usage(self, client_id: str, endpoint: str, window: str) -> int:
        """Get usage from memory store"""
        try:
            key = f"{client_id}:{endpoint}:{window}"
            window_data = self.memory_store.get(key, {})
            
            # Clean old entries
            current_time = time.time()
            window_seconds = self._get_window_seconds(window)
            cutoff_time = current_time - window_seconds
            
            # Count recent requests
            timestamps = window_data.get('timestamps', deque())
            
            # Remove old timestamps
            while timestamps and timestamps[0] < cutoff_time:
                timestamps.popleft()
            
            return len(timestamps)
            
        except Exception as e:
            logger.error(f"Memory rate limit check error: {e}")
            return 0
    
    async def _get_burst_usage(self, client_id: str, endpoint: str, window: str) -> int:
        """Get burst usage count"""
        key = f"burst:{client_id}:{endpoint}:{window}"
        
        if redis_available:
            try:
                usage = await redis_client.get(key)
                return int(usage) if usage else 0
            except Exception:
                return 0
        else:
            # Use memory store for burst tracking
            burst_data = self.memory_store.get(key, {})
            return burst_data.get('count', 0)
    
    async def _track_burst_usage(self, client_id: str, endpoint: str, window: str):
        """Track burst usage"""
        key = f"burst:{client_id}:{endpoint}:{window}"
        
        if redis_available:
            try:
                await redis_client.incr(key)
                await redis_client.expire(key, self.burst_config["duration"])
            except Exception as e:
                logger.error(f"Redis burst tracking error: {e}")
        else:
            # Use memory store
            current_time = time.time()
            self.memory_store[key] = {
                'count': self.memory_store.get(key, {}).get('count', 0) + 1,
                'timestamp': current_time
            }
    
    async def _update_counters(self, client_id: str, endpoint: str, user_info: Dict[str, Any], process_time: float):
        """Update rate limit counters after successful request"""
        
        current_time = time.time()
        
        for window in ["per_second", "per_minute", "per_hour", "per_day"]:
            if redis_available:
                await self._update_redis_counter(client_id, endpoint, window, current_time)
            else:
                self._update_memory_counter(client_id, endpoint, window, current_time)
        
        # Track performance metrics
        await self._track_performance_metrics(client_id, endpoint, process_time)
    
    async def _update_redis_counter(self, client_id: str, endpoint: str, window: str, timestamp: float):
        """Update Redis counter"""
        try:
            key = f"rate_limit:{client_id}:{endpoint}:{window}"
            
            # Use pipeline for atomic operations
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, self._get_window_seconds(window))
            await pipe.execute()
            
        except Exception as e:
            logger.error(f"Redis counter update error: {e}")
    
    def _update_memory_counter(self, client_id: str, endpoint: str, window: str, timestamp: float):
        """Update memory counter"""
        try:
            key = f"{client_id}:{endpoint}:{window}"
            
            if key not in self.memory_store:
                self.memory_store[key] = {'timestamps': deque()}
            
            self.memory_store[key]['timestamps'].append(timestamp)
            
        except Exception as e:
            logger.error(f"Memory counter update error: {e}")
    
    async def _track_performance_metrics(self, client_id: str, endpoint: str, process_time: float):
        """Track performance metrics for adaptive rate limiting"""
        try:
            if redis_available:
                # Track average response time
                metrics_key = f"metrics:{endpoint}:response_time"
                pipe = redis_client.pipeline()
                pipe.lpush(metrics_key, process_time)
                pipe.ltrim(metrics_key, 0, 99)  # Keep last 100 measurements
                pipe.expire(metrics_key, 3600)  # 1 hour
                await pipe.execute()
                
        except Exception as e:
            logger.error(f"Performance metrics tracking error: {e}")
    
    def _get_window_seconds(self, window: str) -> int:
        """Get time window in seconds"""
        window_map = {
            "per_second": 1,
            "per_minute": 60,
            "per_hour": 3600,
            "per_day": 86400
        }
        return window_map.get(window, 3600)
    
    def _calculate_retry_after(self, window: str) -> int:
        """Calculate retry-after header value"""
        return self._get_window_seconds(window)
    
    def _calculate_reset_time(self, window: str) -> int:
        """Calculate reset time timestamp"""
        window_seconds = self._get_window_seconds(window)
        return int(time.time() + window_seconds)
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of old entries"""
        current_time = time.time()
        
        if current_time - self.last_cleanup > self.cleanup_interval:
            self.last_cleanup = current_time
            
            if not redis_available:
                # Clean memory store
                keys_to_remove = []
                for key, data in self.memory_store.items():
                    if 'timestamps' in data:
                        # Remove old timestamps
                        timestamps = data['timestamps']
                        cutoff_time = current_time - 86400  # Keep 1 day of data
                        
                        while timestamps and timestamps[0] < cutoff_time:
                            timestamps.popleft()
                        
                        # Remove empty entries
                        if not timestamps:
                            keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    del self.memory_store[key]
    
    async def _log_rate_limit_exceeded(self, client_id: str, endpoint: str, limit_result: 'RateLimitResult', request: Request):
        """Log rate limit exceeded events"""
        log_security_event(
            "RATE_LIMIT_EXCEEDED",
            client_id.split(':', 1)[1] if ':' in client_id else None,
            request,
            severity="WARNING",
            details={
                "client_id": client_id,
                "endpoint": endpoint,
                "limit": limit_result.limit,
                "window": limit_result.window,
                "retry_after": limit_result.retry_after,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown")
            }
        )
    
    def _add_rate_limit_headers(self, response: Response, limit_result: 'RateLimitResult'):
        """Add rate limit headers to response"""
        response.headers["X-RateLimit-Limit"] = str(limit_result.limit)
        response.headers["X-RateLimit-Remaining"] = str(limit_result.remaining)
        response.headers["X-RateLimit-Reset"] = str(limit_result.reset_time)
        
        if not limit_result.allowed:
            response.headers["Retry-After"] = str(limit_result.retry_after)
    
    def _create_rate_limit_response(self, limit_result: 'RateLimitResult') -> JSONResponse:
        """Create rate limit exceeded response"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded for {limit_result.window}",
                    "details": {
                        "limit": limit_result.limit,
                        "retry_after": limit_result.retry_after,
                        "reset_time": limit_result.reset_time
                    }
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            headers={
                "X-RateLimit-Limit": str(limit_result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(limit_result.reset_time),
                "Retry-After": str(limit_result.retry_after)
            }
        )

class RateLimitResult:
    """Result of rate limit check"""
    
    def __init__(self, allowed: bool, limit: int, remaining: int, reset_time: int, retry_after: int, window: str):
        self.allowed = allowed
        self.limit = limit
        self.remaining = remaining
        self.reset_time = reset_time
        self.retry_after = retry_after
        self.window = window

# Decorator for endpoint-specific rate limiting
def rate_limit(requests_per_minute: int = 60, requests_per_hour: int = 1000):
    """Decorator for endpoint-specific rate limiting"""
    def decorator(func):
        # Store rate limit info in function metadata
        func._rate_limit_config = {
            "per_minute": requests_per_minute,
            "per_hour": requests_per_hour
        }
        return func
    return decorator

# Adaptive rate limiting based on system load
class AdaptiveRateLimiter:
    """Adaptive rate limiter that adjusts limits based on system performance"""
    
    def __init__(self):
        self.base_limits = {}
        self.current_multiplier = 1.0
        self.performance_threshold = 2.0  # 2 seconds response time threshold
        self.adjustment_interval = 300  # 5 minutes
        self.last_adjustment = time.time()
    
    async def adjust_limits(self, endpoint: str):
        """Adjust rate limits based on performance metrics"""
        try:
            if not redis_available:
                return
            
            current_time = time.time()
            if current_time - self.last_adjustment < self.adjustment_interval:
                return
            
            # Get average response time
            metrics_key = f"metrics:{endpoint}:response_time"
            response_times = await redis_client.lrange(metrics_key, 0, -1)
            
            if response_times:
                avg_response_time = sum(float(rt) for rt in response_times) / len(response_times)
                
                if avg_response_time > self.performance_threshold:
                    # Decrease limits if system is slow
                    self.current_multiplier = max(0.5, self.current_multiplier * 0.9)
                    logger.warning(f"Reducing rate limits due to high response time: {avg_response_time:.2f}s")
                elif avg_response_time < self.performance_threshold * 0.5:
                    # Increase limits if system is fast
                    self.current_multiplier = min(2.0, self.current_multiplier * 1.1)
                    logger.info(f"Increasing rate limits due to good performance: {avg_response_time:.2f}s")
            
            self.last_adjustment = current_time
            
        except Exception as e:
            logger.error(f"Adaptive rate limiting adjustment error: {e}")

# Security-focused rate limiting
class SecurityRateLimiter:
    """Security-focused rate limiter for protecting against attacks"""
    
    @staticmethod
    async def check_security_limits(client_ip: str, event_type: str) -> bool:
        """Check security-specific rate limits"""
        try:
            if not redis_available:
                return True  # Allow if Redis not available
            
            key = f"security_limit:{client_ip}:{event_type}"
            current_count = await redis_client.get(key) or 0
            current_count = int(current_count)
            
            # Security limits (very restrictive)
            limits = {
                "failed_login": 5,      # 5 failed logins per hour
                "malicious_request": 3,  # 3 malicious requests per day
                "suspicious_activity": 10  # 10 suspicious activities per day
            }
            
            limit = limits.get(event_type, 100)
            
            if current_count >= limit:
                return False
            
            # Increment counter
            pipe = redis_client.pipeline()
            pipe.incr(key)
            
            # Set expiration based on event type
            expiry = 3600 if event_type == "failed_login" else 86400  # 1 hour or 1 day
            pipe.expire(key, expiry)
            
            await pipe.execute()
            return True
            
        except Exception as e:
            logger.error(f"Security rate limit check error: {e}")
            return True  # Allow on error
    
    @staticmethod
    async def record_security_event(client_ip: str, event_type: str):
        """Record security event for rate limiting"""
        try:
            if redis_available:
                key = f"security_event:{client_ip}:{event_type}"
                pipe = redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, 86400)  # 24 hours
                await pipe.execute()
                
        except Exception as e:
            logger.error(f"Security event recording error: {e}")