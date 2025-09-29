from typing import Dict, Any, Optional, List, Union, Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging
import traceback
import uuid
import time
from datetime import datetime
import json
import asyncio
from contextlib import asynccontextmanager

from app.core.exceptions import (
    FastNextException, SecurityError, ValidationError, 
    AuthenticationError, AuthorizationError, ConflictError, 
    NotFoundError, DatabaseError, ExternalServiceError,
    ConfigurationError, BusinessLogicError, RateLimitExceeded,
    SuspiciousActivity, AccountLocked, TokenExpired
)
from app.core.logging import log_security_event, get_logger
from app.core.config import settings

logger = get_logger(__name__)

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive error handling middleware with security features
    """
    
    def __init__(
        self,
        app,
        include_stack_trace: bool = False,
        log_all_errors: bool = True,
        sanitize_errors: bool = True,
        error_tracking_enabled: bool = True
    ):
        super().__init__(app)
        self.include_stack_trace = include_stack_trace
        self.log_all_errors = log_all_errors
        self.sanitize_errors = sanitize_errors
        self.error_tracking_enabled = error_tracking_enabled
        
        # Error categorization
        self.error_categories = self._setup_error_categories()
        
        # Error rate tracking for security
        self.error_rate_tracker = ErrorRateTracker()
        
        # Setup error recovery strategies
        self.recovery_strategies = self._setup_recovery_strategies()
        
        # Circuit breaker for external services
        self.circuit_breakers = {}
    
    def _setup_error_categories(self) -> Dict[str, Dict[str, Any]]:
        """Setup error categorization for proper handling"""
        return {
            "security": {
                "exceptions": [SecurityError, SuspiciousActivity, RateLimitExceeded],
                "log_level": "WARNING",
                "status_code": status.HTTP_403_FORBIDDEN,
                "expose_details": False,
                "alert_required": True
            },
            "authentication": {
                "exceptions": [AuthenticationError, TokenExpired, AccountLocked],
                "log_level": "INFO",
                "status_code": status.HTTP_401_UNAUTHORIZED,
                "expose_details": True,
                "alert_required": False
            },
            "authorization": {
                "exceptions": [AuthorizationError],
                "log_level": "INFO", 
                "status_code": status.HTTP_403_FORBIDDEN,
                "expose_details": True,
                "alert_required": False
            },
            "validation": {
                "exceptions": [ValidationError],
                "log_level": "INFO",
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "expose_details": True,
                "alert_required": False
            },
            "client": {
                "exceptions": [ConflictError, NotFoundError],
                "log_level": "INFO",
                "status_code": status.HTTP_400_BAD_REQUEST,
                "expose_details": True,
                "alert_required": False
            },
            "server": {
                "exceptions": [DatabaseError, ExternalServiceError, ConfigurationError],
                "log_level": "ERROR",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "expose_details": False,
                "alert_required": True
            },
            "business": {
                "exceptions": [BusinessLogicError],
                "log_level": "WARNING",
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "expose_details": True,
                "alert_required": False
            }
        }
    
    def _setup_recovery_strategies(self) -> Dict[str, Callable]:
        """Setup error recovery strategies"""
        return {
            "database_error": self._recover_database_error,
            "external_service_error": self._recover_external_service_error,
            "rate_limit_error": self._recover_rate_limit_error,
            "authentication_error": self._recover_authentication_error
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main error handling dispatcher"""
        
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()
        
        try:
            # Track request for error rate monitoring
            await self.error_rate_tracker.track_request(request)
            
            # Process request with timeout protection
            response = await self._process_with_timeout(request, call_next)
            
            # Track successful request
            await self.error_rate_tracker.track_success(request)
            
            return response
            
        except asyncio.TimeoutError:
            # Handle request timeout
            await self._log_error("REQUEST_TIMEOUT", None, request, {
                "timeout": "Request processing timeout",
                "processing_time": time.time() - start_time
            })
            
            return self._create_error_response(
                "Request timeout",
                "REQUEST_TIMEOUT",
                status.HTTP_408_REQUEST_TIMEOUT,
                request_id
            )
        
        except Exception as e:
            # Track error for rate monitoring
            await self.error_rate_tracker.track_error(request, e)
            
            # Handle the error
            return await self._handle_error(e, request, request_id, start_time)
    
    async def _process_with_timeout(self, request: Request, call_next, timeout: int = 30) -> Response:
        """Process request with timeout protection"""
        try:
            return await asyncio.wait_for(call_next(request), timeout=timeout)
        except asyncio.TimeoutError:
            logger.error(f"Request timeout after {timeout}s: {request.method} {request.url.path}")
            raise
    
    async def _handle_error(self, exception: Exception, request: Request, request_id: str, start_time: float) -> JSONResponse:
        """Main error handler"""
        
        processing_time = time.time() - start_time
        
        # Categorize the error
        category = self._categorize_error(exception)
        category_config = self.error_categories.get(category, self.error_categories["server"])
        
        # Determine if this is a security-related error
        is_security_error = category in ["security", "authentication", "authorization"]
        
        # Log the error
        await self._log_error(category.upper(), exception, request, {
            "processing_time": processing_time,
            "error_category": category,
            "is_security_error": is_security_error
        }, category_config["log_level"])
        
        # Try recovery if applicable
        recovery_attempted = False
        if category in self.recovery_strategies:
            try:
                recovery_result = await self.recovery_strategies[category](exception, request)
                if recovery_result.get("recovered"):
                    recovery_attempted = True
                    logger.info(f"Error recovery successful for {category}: {recovery_result}")
            except Exception as recovery_error:
                logger.error(f"Error recovery failed for {category}: {recovery_error}")
        
        # Create appropriate response
        if isinstance(exception, HTTPException):
            return await self._handle_http_exception(exception, request, request_id)
        elif isinstance(exception, FastNextException):
            return await self._handle_fastnext_exception(exception, request, request_id, category_config)
        else:
            return await self._handle_unexpected_exception(exception, request, request_id, category_config)
    
    def _categorize_error(self, exception: Exception) -> str:
        """Categorize error type"""
        
        for category, config in self.error_categories.items():
            if any(isinstance(exception, exc_type) for exc_type in config["exceptions"]):
                return category
        
        # Check for HTTP exceptions
        if isinstance(exception, HTTPException):
            if exception.status_code < 500:
                return "client"
            else:
                return "server"
        
        # Default to server error
        return "server"
    
    async def _handle_http_exception(self, exception: HTTPException, request: Request, request_id: str) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        
        # Enhance 401 responses with auto-logout functionality
        if exception.status_code == status.HTTP_401_UNAUTHORIZED:
            headers = {
                "X-Auth-Status": "expired",
                "X-Auto-Logout": "true",
                "X-Redirect-To": "/login",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        else:
            headers = {}
        
        headers["X-Request-ID"] = request_id
        
        return JSONResponse(
            status_code=exception.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exception.status_code}",
                    "message": str(exception.detail),
                    "details": {}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": request_id
                }
            },
            headers=headers
        )
    
    async def _handle_fastnext_exception(self, exception: FastNextException, request: Request, request_id: str, category_config: Dict[str, Any]) -> JSONResponse:
        """Handle custom FastNext exceptions"""
        
        # Determine what details to expose
        details = {}
        if category_config.get("expose_details", False):
            details = exception.details
        elif self.include_stack_trace and not category_config.get("sanitize", True):
            details = {"stack_trace": traceback.format_exc()}
        
        # Add specific headers for certain error types
        headers = {"X-Request-ID": request_id}
        
        if isinstance(exception, (AuthenticationError, TokenExpired)):
            headers.update({
                "X-Auth-Status": "failed",
                "X-Auto-Logout": "true",
                "X-Redirect-To": "/login"
            })
        elif isinstance(exception, RateLimitExceeded):
            headers.update({
                "Retry-After": "60",
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0"
            })
        
        return JSONResponse(
            status_code=category_config["status_code"],
            content={
                "success": False,
                "error": {
                    "code": exception.error_code,
                    "message": exception.message,
                    "details": details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": request_id
                }
            },
            headers=headers
        )
    
    async def _handle_unexpected_exception(self, exception: Exception, request: Request, request_id: str, category_config: Dict[str, Any]) -> JSONResponse:
        """Handle unexpected exceptions"""
        
        # Sanitize error message for security
        if self.sanitize_errors:
            error_message = "An unexpected error occurred"
            details = {}
        else:
            error_message = str(exception)
            details = {"exception_type": exception.__class__.__name__}
            
            if self.include_stack_trace:
                details["stack_trace"] = traceback.format_exc()
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": error_message,
                    "details": details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": request_id
                }
            },
            headers={"X-Request-ID": request_id}
        )
    
    async def _log_error(self, error_type: str, exception: Optional[Exception], request: Request, extra_details: Dict[str, Any], log_level: str = "ERROR"):
        """Log error with appropriate level and details"""
        
        error_details = {
            "error_type": error_type,
            "path": request.url.path,
            "method": request.method,
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            **extra_details
        }
        
        if exception:
            error_details.update({
                "exception_class": exception.__class__.__name__,
                "exception_message": str(exception)
            })
            
            if isinstance(exception, FastNextException):
                error_details["error_code"] = exception.error_code
                error_details["exception_details"] = exception.details
        
        # Log with appropriate level
        if log_level.upper() == "ERROR":
            logger.error(f"Error occurred: {error_type}", extra=error_details)
        elif log_level.upper() == "WARNING":
            logger.warning(f"Warning: {error_type}", extra=error_details)
        else:
            logger.info(f"Info: {error_type}", extra=error_details)
        
        # Log security events
        if error_type in ["SECURITY", "AUTHENTICATION", "AUTHORIZATION", "SUSPICIOUS_ACTIVITY"]:
            log_security_event(
                error_type,
                getattr(request.state, 'user', {}).get('user_id'),
                request,
                severity="HIGH" if error_type == "SECURITY" else "MEDIUM",
                details=error_details
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")
    
    def _create_error_response(self, message: str, error_code: str, status_code: int, request_id: str) -> JSONResponse:
        """Create standardized error response"""
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": error_code,
                    "message": message,
                    "details": {}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": request_id
                }
            },
            headers={"X-Request-ID": request_id}
        )
    
    # Recovery strategies
    async def _recover_database_error(self, exception: Exception, request: Request) -> Dict[str, Any]:
        """Attempt to recover from database errors"""
        try:
            # Implement database connection retry logic
            # This would typically involve retrying the operation
            # or switching to a read replica
            return {"recovered": False, "reason": "Database recovery not implemented"}
        except Exception as e:
            return {"recovered": False, "error": str(e)}
    
    async def _recover_external_service_error(self, exception: Exception, request: Request) -> Dict[str, Any]:
        """Attempt to recover from external service errors"""
        try:
            # Implement circuit breaker logic
            # This would typically involve using cached data
            # or falling back to alternative services
            return {"recovered": False, "reason": "External service recovery not implemented"}
        except Exception as e:
            return {"recovered": False, "error": str(e)}
    
    async def _recover_rate_limit_error(self, exception: Exception, request: Request) -> Dict[str, Any]:
        """Attempt to recover from rate limit errors"""
        try:
            # Implement rate limit recovery
            # This might involve queuing the request
            # or providing alternative response
            return {"recovered": False, "reason": "Rate limit recovery not implemented"}
        except Exception as e:
            return {"recovered": False, "error": str(e)}
    
    async def _recover_authentication_error(self, exception: Exception, request: Request) -> Dict[str, Any]:
        """Attempt to recover from authentication errors"""
        try:
            # Implement auth recovery (e.g., token refresh)
            return {"recovered": False, "reason": "Auth recovery not implemented"}
        except Exception as e:
            return {"recovered": False, "error": str(e)}

class ErrorRateTracker:
    """Track error rates for security monitoring"""
    
    def __init__(self):
        self.error_counts = {}
        self.request_counts = {}
        self.time_windows = [60, 300, 3600]  # 1 min, 5 min, 1 hour
    
    async def track_request(self, request: Request):
        """Track incoming request"""
        client_ip = self._get_client_ip(request)
        current_time = int(time.time())
        
        for window in self.time_windows:
            key = f"requests:{client_ip}:{window}:{current_time // window}"
            self.request_counts[key] = self.request_counts.get(key, 0) + 1
    
    async def track_error(self, request: Request, exception: Exception):
        """Track error occurrence"""
        client_ip = self._get_client_ip(request)
        current_time = int(time.time())
        error_type = exception.__class__.__name__
        
        for window in self.time_windows:
            key = f"errors:{client_ip}:{error_type}:{window}:{current_time // window}"
            self.error_counts[key] = self.error_counts.get(key, 0) + 1
        
        # Check if error rate is suspicious
        await self._check_error_rate(client_ip, error_type, current_time)
    
    async def track_success(self, request: Request):
        """Track successful request"""
        # This could be used for calculating success rates
        pass
    
    async def _check_error_rate(self, client_ip: str, error_type: str, current_time: int):
        """Check if error rate indicates suspicious activity"""
        
        # Check 5-minute window for high error rates
        window = 300
        key = f"errors:{client_ip}:{error_type}:{window}:{current_time // window}"
        error_count = self.error_counts.get(key, 0)
        
        # Alert thresholds
        thresholds = {
            "ValidationError": 50,      # 50 validation errors in 5 minutes
            "AuthenticationError": 10,  # 10 auth errors in 5 minutes
            "SecurityError": 5,         # 5 security errors in 5 minutes
            "HTTPException": 100        # 100 HTTP errors in 5 minutes
        }
        
        threshold = thresholds.get(error_type, 20)
        
        if error_count >= threshold:
            logger.warning(
                f"High error rate detected: {error_count} {error_type} errors "
                f"from {client_ip} in 5 minutes"
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")

class CircuitBreaker:
    """Circuit breaker for external service calls"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    @asynccontextmanager
    async def call(self):
        """Context manager for circuit breaker calls"""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time < self.recovery_timeout:
                raise ExternalServiceError("Circuit breaker is OPEN")
            else:
                self.state = "HALF_OPEN"
        
        try:
            yield
            # Success - reset failure count
            self.failure_count = 0
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            
            raise e

# Error reporting utilities
class ErrorReporter:
    """Report errors to external monitoring services"""
    
    def __init__(self):
        self.enabled = settings.get("ERROR_REPORTING_ENABLED", False)
        self.service_url = settings.get("ERROR_REPORTING_URL")
        self.api_key = settings.get("ERROR_REPORTING_API_KEY")
    
    async def report_error(self, error_data: Dict[str, Any]):
        """Report error to external service"""
        if not self.enabled or not self.service_url:
            return
        
        try:
            # Implementation would send error data to external service
            # like Sentry, Rollbar, Bugsnag, etc.
            logger.info(f"Error reported to monitoring service: {error_data.get('error_type')}")
        except Exception as e:
            logger.error(f"Failed to report error to monitoring service: {e}")

# Health check for error handling system
class ErrorHandlingHealthCheck:
    """Health check for error handling system"""
    
    def __init__(self, error_middleware: ErrorHandlingMiddleware):
        self.error_middleware = error_middleware
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of error handling system"""
        return {
            "error_handling": {
                "status": "healthy",
                "middleware_enabled": True,
                "error_tracking_enabled": self.error_middleware.error_tracking_enabled,
                "sanitization_enabled": self.error_middleware.sanitize_errors,
                "circuit_breakers": len(self.error_middleware.circuit_breakers)
            }
        }