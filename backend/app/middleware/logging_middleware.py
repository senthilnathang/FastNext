from typing import Dict, Any, Optional, List, Set, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import json
import uuid
import asyncio
from datetime import datetime
from urllib.parse import unquote
import hashlib
import re

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class RequestResponseLoggingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive request/response logging middleware with security features
    """
    
    def __init__(
        self,
        app,
        log_requests: bool = True,
        log_responses: bool = True,
        log_request_body: bool = False,
        log_response_body: bool = False,
        max_body_size: int = 1024 * 10,  # 10KB
        sensitive_headers: Set[str] = None,
        sensitive_fields: Set[str] = None,
        exclude_paths: Set[str] = None,
        log_level: str = "INFO"
    ):
        super().__init__(app)
        self.log_requests = log_requests
        self.log_responses = log_responses
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.max_body_size = max_body_size
        self.log_level = getattr(logging, log_level.upper())
        
        # Security: Sensitive data that should never be logged
        self.sensitive_headers = sensitive_headers or {
            'authorization', 'cookie', 'set-cookie', 'x-api-key', 
            'x-auth-token', 'x-csrf-token', 'x-access-token'
        }
        
        self.sensitive_fields = sensitive_fields or {
            'password', 'passwd', 'secret', 'token', 'key', 'authorization',
            'auth', 'credential', 'credentials', 'private_key', 'api_key',
            'access_token', 'refresh_token', 'session_id', 'ssn', 'social_security',
            'credit_card', 'card_number', 'cvv', 'pin', 'otp'
        }
        
        # Paths to exclude from logging
        self.exclude_paths = exclude_paths or {
            '/health', '/metrics', '/favicon.ico', '/static/', '/_next/',
            '/docs', '/redoc', '/openapi.json'
        }
        
        # Performance tracking
        self.performance_tracker = PerformanceTracker()
        
        # Request correlation
        self.correlation_tracker = CorrelationTracker()
        
        # Setup log formatters
        self.setup_formatters()
    
    def setup_formatters(self):
        """Setup log formatters for different log types"""
        
        # Request log format
        self.request_format = {
            "type": "request",
            "timestamp": None,
            "request_id": None,
            "method": None,
            "path": None,
            "query_params": None,
            "headers": None,
            "client_ip": None,
            "user_agent": None,
            "content_length": None,
            "user_id": None,
            "session_id": None,
            "correlation_id": None
        }
        
        # Response log format
        self.response_format = {
            "type": "response",
            "timestamp": None,
            "request_id": None,
            "status_code": None,
            "response_size": None,
            "processing_time": None,
            "headers": None,
            "cache_status": None
        }
        
        # Performance log format
        self.performance_format = {
            "type": "performance",
            "timestamp": None,
            "request_id": None,
            "endpoint": None,
            "method": None,
            "processing_time": None,
            "database_time": None,
            "external_service_time": None,
            "cache_hits": None,
            "cache_misses": None,
            "memory_usage": None
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main logging dispatcher"""
        
        # Skip excluded paths
        if self._should_skip_logging(request.url.path):
            return await call_next(request)
        
        # Generate request ID if not exists
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Log request
        if self.log_requests:
            await self._log_request(request, request_id)
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Log response
        if self.log_responses:
            await self._log_response(response, request, request_id, processing_time)
        
        # Log performance metrics
        await self._log_performance(request, response, request_id, processing_time)
        
        # Track correlation data
        await self.correlation_tracker.track_request(request, response, processing_time)
        
        return response
    
    def _should_skip_logging(self, path: str) -> bool:
        """Check if path should be excluded from logging"""
        return any(path.startswith(excluded) for excluded in self.exclude_paths)
    
    async def _log_request(self, request: Request, request_id: str):
        """Log incoming request details"""
        
        try:
            # Build request log data
            log_data = self.request_format.copy()
            log_data.update({
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "query_params": self._sanitize_query_params(dict(request.query_params)),
                "headers": self._sanitize_headers(dict(request.headers)),
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "content_length": request.headers.get("Content-Length"),
                "user_id": self._get_user_id(request),
                "session_id": self._get_session_id(request),
                "correlation_id": self._get_correlation_id(request)
            })
            
            # Add request body if enabled and appropriate
            if self.log_request_body and self._should_log_body(request):
                body = await self._get_request_body(request)
                if body:
                    log_data["body"] = self._sanitize_body(body)
            
            # Log with appropriate level
            self._log_with_level("Request", log_data)
            
        except Exception as e:
            logger.error(f"Failed to log request: {e}")
    
    async def _log_response(self, response: Response, request: Request, request_id: str, processing_time: float):
        """Log outgoing response details"""
        
        try:
            # Build response log data
            log_data = self.response_format.copy()
            log_data.update({
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request_id,
                "status_code": response.status_code,
                "response_size": self._get_response_size(response),
                "processing_time": round(processing_time * 1000, 2),  # Convert to milliseconds
                "headers": self._sanitize_headers(dict(response.headers)),
                "cache_status": response.headers.get("X-Cache-Status", "unknown")
            })
            
            # Add response body if enabled and appropriate
            if self.log_response_body and self._should_log_response_body(response):
                body = await self._get_response_body(response)
                if body:
                    log_data["body"] = self._sanitize_body(body)
            
            # Determine log level based on status code
            log_level = self._get_response_log_level(response.status_code)
            self._log_with_level("Response", log_data, log_level)
            
        except Exception as e:
            logger.error(f"Failed to log response: {e}")
    
    async def _log_performance(self, request: Request, response: Response, request_id: str, processing_time: float):
        """Log performance metrics"""
        
        try:
            # Get performance data from request state
            perf_data = getattr(request.state, 'performance_data', {})
            
            log_data = self.performance_format.copy()
            log_data.update({
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request_id,
                "endpoint": self._normalize_endpoint(request.url.path),
                "method": request.method,
                "processing_time": round(processing_time * 1000, 2),
                "database_time": perf_data.get('database_time', 0),
                "external_service_time": perf_data.get('external_service_time', 0),
                "cache_hits": perf_data.get('cache_hits', 0),
                "cache_misses": perf_data.get('cache_misses', 0),
                "memory_usage": perf_data.get('memory_usage', 0)
            })
            
            # Track performance for analytics
            await self.performance_tracker.track(log_data)
            
            # Log performance data
            self._log_with_level("Performance", log_data)
            
        except Exception as e:
            logger.error(f"Failed to log performance: {e}")
    
    def _sanitize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize headers to remove sensitive information"""
        
        sanitized = {}
        for key, value in headers.items():
            key_lower = key.lower()
            
            if key_lower in self.sensitive_headers:
                sanitized[key] = "[REDACTED]"
            elif key_lower == 'authorization' and value.startswith('Bearer '):
                # Partially redact tokens
                sanitized[key] = f"Bearer {value[7:15]}***"
            elif key_lower == 'cookie':
                sanitized[key] = self._sanitize_cookies(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _sanitize_cookies(self, cookie_value: str) -> str:
        """Sanitize cookie values"""
        
        # Split cookies and redact sensitive ones
        cookies = cookie_value.split(';')
        sanitized_cookies = []
        
        for cookie in cookies:
            if '=' in cookie:
                name, value = cookie.split('=', 1)
                name = name.strip().lower()
                
                if any(sensitive in name for sensitive in ['session', 'auth', 'token', 'login']):
                    sanitized_cookies.append(f"{name}=[REDACTED]")
                else:
                    sanitized_cookies.append(cookie)
            else:
                sanitized_cookies.append(cookie)
        
        return '; '.join(sanitized_cookies)
    
    def _sanitize_query_params(self, params: Dict[str, str]) -> Dict[str, str]:
        """Sanitize query parameters"""
        
        sanitized = {}
        for key, value in params.items():
            key_lower = key.lower()
            
            if any(sensitive in key_lower for sensitive in self.sensitive_fields):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _sanitize_body(self, body: str) -> str:
        """Sanitize request/response body"""
        
        if not body:
            return body
        
        try:
            # Try to parse as JSON
            data = json.loads(body)
            sanitized = self._sanitize_json_data(data)
            return json.dumps(sanitized)
        except json.JSONDecodeError:
            # If not JSON, apply basic sanitization
            return self._sanitize_text_body(body)
    
    def _sanitize_json_data(self, data: Any) -> Any:
        """Recursively sanitize JSON data"""
        
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                key_lower = key.lower()
                
                if any(sensitive in key_lower for sensitive in self.sensitive_fields):
                    sanitized[key] = "[REDACTED]"
                else:
                    sanitized[key] = self._sanitize_json_data(value)
            return sanitized
        
        elif isinstance(data, list):
            return [self._sanitize_json_data(item) for item in data]
        
        else:
            return data
    
    def _sanitize_text_body(self, body: str) -> str:
        """Sanitize plain text body"""
        
        # Apply regex patterns to redact sensitive data
        patterns = [
            (r'password["\']?\s*[:=]\s*["\']?([^"\'&\n\r]+)', r'password="[REDACTED]"'),
            (r'token["\']?\s*[:=]\s*["\']?([^"\'&\n\r]+)', r'token="[REDACTED]"'),
            (r'key["\']?\s*[:=]\s*["\']?([^"\'&\n\r]+)', r'key="[REDACTED]"'),
            (r'secret["\']?\s*[:=]\s*["\']?([^"\'&\n\r]+)', r'secret="[REDACTED]"'),
        ]
        
        sanitized = body
        for pattern, replacement in patterns:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    async def _get_request_body(self, request: Request) -> Optional[str]:
        """Get request body if within size limits"""
        
        try:
            content_length = int(request.headers.get("Content-Length", "0"))
            
            if content_length > self.max_body_size:
                return f"[BODY TOO LARGE: {content_length} bytes]"
            
            body = await request.body()
            return body.decode('utf-8', errors='ignore')[:self.max_body_size]
            
        except Exception as e:
            return f"[ERROR READING BODY: {e}]"
    
    async def _get_response_body(self, response: Response) -> Optional[str]:
        """Get response body if within size limits"""
        
        try:
            # This is tricky as response body might be consumed
            # In practice, you'd need to wrap the response or use a different approach
            return "[RESPONSE BODY LOGGING NOT IMPLEMENTED]"
            
        except Exception as e:
            return f"[ERROR READING RESPONSE BODY: {e}]"
    
    def _should_log_body(self, request: Request) -> bool:
        """Determine if request body should be logged"""
        
        content_type = request.headers.get("Content-Type", "")
        
        # Only log JSON and form data
        return any(ct in content_type for ct in [
            "application/json",
            "application/x-www-form-urlencoded",
            "text/plain"
        ])
    
    def _should_log_response_body(self, response: Response) -> bool:
        """Determine if response body should be logged"""
        
        content_type = response.headers.get("Content-Type", "")
        
        # Only log JSON responses
        return "application/json" in content_type
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _get_user_id(self, request: Request) -> Optional[str]:
        """Get user ID from request state"""
        
        user = getattr(request.state, 'user', None)
        return user.get('user_id') if user else None
    
    def _get_session_id(self, request: Request) -> Optional[str]:
        """Get session ID from request"""
        
        # Try to extract from cookie or header
        session_cookie = request.cookies.get('session_id')
        if session_cookie:
            return hashlib.sha256(session_cookie.encode()).hexdigest()[:16]
        
        session_header = request.headers.get('X-Session-ID')
        if session_header:
            return hashlib.sha256(session_header.encode()).hexdigest()[:16]
        
        return None
    
    def _get_correlation_id(self, request: Request) -> str:
        """Get or generate correlation ID"""
        
        # Check for existing correlation ID
        correlation_id = request.headers.get('X-Correlation-ID')
        if correlation_id:
            return correlation_id
        
        # Generate new one
        return str(uuid.uuid4())[:8]
    
    def _get_response_size(self, response: Response) -> Optional[int]:
        """Get response size from headers"""
        
        content_length = response.headers.get("Content-Length")
        return int(content_length) if content_length else None
    
    def _normalize_endpoint(self, path: str) -> str:
        """Normalize endpoint path for analytics"""
        
        # Replace IDs with placeholders
        import re
        
        # Replace UUIDs
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{uuid}', path)
        
        # Replace numeric IDs
        path = re.sub(r'/\d+(?=/|$)', '/{id}', path)
        
        return path
    
    def _get_response_log_level(self, status_code: int) -> str:
        """Get appropriate log level for response status"""
        
        if status_code >= 500:
            return "ERROR"
        elif status_code >= 400:
            return "WARNING"
        else:
            return "INFO"
    
    def _log_with_level(self, log_type: str, data: Dict[str, Any], level: str = None):
        """Log with appropriate level"""
        
        level = level or "INFO"
        message = f"{log_type}: {data.get('method', '')} {data.get('path', '')} - {data.get('status_code', '')}"
        
        if level == "ERROR":
            logger.error(message, extra=data)
        elif level == "WARNING":
            logger.warning(message, extra=data)
        else:
            logger.info(message, extra=data)

class PerformanceTracker:
    """Track and analyze performance metrics"""
    
    def __init__(self):
        self.metrics = {}
        self.slow_queries = []
        self.alert_thresholds = {
            "response_time": 2000,  # 2 seconds
            "database_time": 1000,  # 1 second
            "error_rate": 0.05      # 5%
        }
    
    async def track(self, performance_data: Dict[str, Any]):
        """Track performance metrics"""
        
        endpoint = performance_data.get('endpoint')
        processing_time = performance_data.get('processing_time', 0)
        
        if endpoint:
            # Initialize metrics for endpoint if not exists
            if endpoint not in self.metrics:
                self.metrics[endpoint] = {
                    "total_requests": 0,
                    "total_time": 0,
                    "max_time": 0,
                    "min_time": float('inf'),
                    "error_count": 0
                }
            
            # Update metrics
            metrics = self.metrics[endpoint]
            metrics["total_requests"] += 1
            metrics["total_time"] += processing_time
            metrics["max_time"] = max(metrics["max_time"], processing_time)
            metrics["min_time"] = min(metrics["min_time"], processing_time)
            
            # Check for performance alerts
            await self._check_performance_alerts(endpoint, processing_time)
    
    async def _check_performance_alerts(self, endpoint: str, processing_time: float):
        """Check if performance metrics exceed thresholds"""
        
        if processing_time > self.alert_thresholds["response_time"]:
            logger.warning(
                f"Slow response detected: {endpoint} took {processing_time}ms",
                extra={
                    "endpoint": endpoint,
                    "processing_time": processing_time,
                    "threshold": self.alert_thresholds["response_time"],
                    "alert_type": "slow_response"
                }
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        
        summary = {}
        for endpoint, metrics in self.metrics.items():
            avg_time = metrics["total_time"] / metrics["total_requests"] if metrics["total_requests"] > 0 else 0
            
            summary[endpoint] = {
                "total_requests": metrics["total_requests"],
                "average_time": round(avg_time, 2),
                "max_time": metrics["max_time"],
                "min_time": metrics["min_time"] if metrics["min_time"] != float('inf') else 0,
                "error_rate": metrics["error_count"] / metrics["total_requests"] if metrics["total_requests"] > 0 else 0
            }
        
        return summary

class CorrelationTracker:
    """Track request correlation across services"""
    
    def __init__(self):
        self.request_chains = {}
        self.max_chain_length = 100
    
    async def track_request(self, request: Request, response: Response, processing_time: float):
        """Track request in correlation chain"""
        
        correlation_id = request.headers.get('X-Correlation-ID')
        if not correlation_id:
            return
        
        request_data = {
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "processing_time": processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add to correlation chain
        if correlation_id not in self.request_chains:
            self.request_chains[correlation_id] = []
        
        chain = self.request_chains[correlation_id]
        chain.append(request_data)
        
        # Limit chain length to prevent memory issues
        if len(chain) > self.max_chain_length:
            chain.pop(0)
    
    def get_correlation_chain(self, correlation_id: str) -> List[Dict[str, Any]]:
        """Get request chain for correlation ID"""
        
        return self.request_chains.get(correlation_id, [])

# Structured logging helpers
class StructuredLogger:
    """Helper for structured logging"""
    
    @staticmethod
    def log_api_call(
        method: str,
        endpoint: str,
        status_code: int,
        processing_time: float,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """Log API call with structured format"""
        
        log_data = {
            "event_type": "api_call",
            "method": method,
            "endpoint": endpoint,
            "status_code": status_code,
            "processing_time": processing_time,
            "user_id": user_id,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
            **(extra_data or {})
        }
        
        level = "ERROR" if status_code >= 500 else "WARNING" if status_code >= 400 else "INFO"
        
        if level == "ERROR":
            logger.error("API call completed", extra=log_data)
        elif level == "WARNING":
            logger.warning("API call completed", extra=log_data)
        else:
            logger.info("API call completed", extra=log_data)
    
    @staticmethod
    def log_business_event(
        event_type: str,
        entity_type: str,
        entity_id: str,
        action: str,
        user_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """Log business event with structured format"""
        
        log_data = {
            "event_type": "business_event",
            "business_event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            **(extra_data or {})
        }
        
        logger.info("Business event", extra=log_data)

# Log aggregation and analysis
class LogAnalyzer:
    """Analyze logs for patterns and insights"""
    
    def __init__(self):
        self.request_patterns = {}
        self.error_patterns = {}
        self.performance_trends = {}
    
    def analyze_request_patterns(self, log_data: Dict[str, Any]):
        """Analyze request patterns for insights"""
        
        endpoint = log_data.get('endpoint')
        if not endpoint:
            return
        
        if endpoint not in self.request_patterns:
            self.request_patterns[endpoint] = {
                "request_count": 0,
                "unique_users": set(),
                "common_user_agents": {},
                "geographic_distribution": {}
            }
        
        pattern = self.request_patterns[endpoint]
        pattern["request_count"] += 1
        
        user_id = log_data.get('user_id')
        if user_id:
            pattern["unique_users"].add(user_id)
        
        user_agent = log_data.get('user_agent')
        if user_agent:
            pattern["common_user_agents"][user_agent] = pattern["common_user_agents"].get(user_agent, 0) + 1
    
    def get_insights(self) -> Dict[str, Any]:
        """Get insights from log analysis"""
        
        insights = {
            "most_popular_endpoints": [],
            "endpoints_with_high_error_rates": [],
            "slowest_endpoints": [],
            "suspicious_patterns": []
        }
        
        # Analyze request patterns
        for endpoint, pattern in self.request_patterns.items():
            insights["most_popular_endpoints"].append({
                "endpoint": endpoint,
                "request_count": pattern["request_count"],
                "unique_users": len(pattern["unique_users"])
            })
        
        # Sort by request count
        insights["most_popular_endpoints"].sort(key=lambda x: x["request_count"], reverse=True)
        
        return insights