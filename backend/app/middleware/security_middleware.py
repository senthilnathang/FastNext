"""
Security Middleware - FastNext (Based on CodeSecAI)
Comprehensive security middleware for request validation and monitoring
"""

import time
import logging
from datetime import datetime
from typing import Callable, Dict, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.security_utils import (
    validate_request_security, get_client_ip_enhanced, 
    rate_limit_tracker, detect_suspicious_patterns
)

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware with threat detection"""
    
    def __init__(self, app, enable_rate_limiting: bool = True):
        super().__init__(app)
        self.enable_rate_limiting = enable_rate_limiting
        self.rate_limits = {
            "/api/v1/auth/login": {"limit": 5, "window": 300},  # 5 attempts per 5 minutes
            "/api/v1/auth/register": {"limit": 3, "window": 3600},  # 3 attempts per hour
            "default": {"limit": 100, "window": 60}  # 100 requests per minute default
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        client_ip = get_client_ip_enhanced(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Generate request ID for tracking
        request_id = f"req_{int(start_time * 1000000)}"
        request.state.request_id = request_id
        
        # Debug logging for CORS issues
        logger.info(f"SecurityMiddleware: {request.method} {request.url.path} from {client_ip}")
        
        try:
            # Skip security checks for OPTIONS requests (CORS preflight)
            if request.method == "OPTIONS":
                logger.info("Skipping security checks for OPTIONS request")
                response = await call_next(request)
            else:
                # Validate request security
                validate_request_security(request)
                
                # Rate limiting
                if self.enable_rate_limiting:
                    await self._check_rate_limit(request, client_ip)
                
                # Process request
                response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Log request
            process_time = time.time() - start_time
            self._log_request(request, response, client_ip, user_agent, process_time, request_id)
            
            return response
            
        except HTTPException as e:
            # Log security violations
            self._log_security_event(request, client_ip, user_agent, str(e.detail), request_id)
            raise
        except Exception as e:
            # Log unexpected errors
            logger.error(f"Unexpected error in security middleware: {e}", extra={
                "request_id": request_id,
                "ip_address": client_ip,
                "user_agent": user_agent,
                "endpoint": request.url.path
            })
            raise
    
    async def _check_rate_limit(self, request: Request, client_ip: str):
        """Check rate limiting for the request"""
        endpoint = request.url.path
        
        # Get rate limit config for endpoint
        rate_config = self.rate_limits.get(endpoint, self.rate_limits["default"])
        limit = rate_config["limit"]
        window = rate_config["window"]
        
        # Check rate limit
        identifier = f"{client_ip}:{endpoint}"
        allowed, remaining = rate_limit_tracker.is_allowed(identifier, limit, window)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + window)),
                    "Retry-After": str(window)
                }
            )
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
    
    def _log_request(self, request: Request, response: Response, client_ip: str, 
                    user_agent: str, process_time: float, request_id: str):
        """Log request details"""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "status_code": response.status_code,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "process_time": round(process_time, 4)
        }
        
        # Log slow requests
        if process_time > 2.0:
            logger.warning(f"Slow request detected", extra=log_data)
        else:
            logger.info(f"Request processed", extra=log_data)
    
    def _log_security_event(self, request: Request, client_ip: str, user_agent: str, 
                           detail: str, request_id: str):
        """Log security events"""
        security_data = {
            "event_type": "SECURITY_VIOLATION",
            "request_id": request_id,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "endpoint": request.url.path,
            "method": request.method,
            "detail": detail,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.warning(f"Security violation detected", extra=security_data)


class AutoLogoutMiddleware(BaseHTTPMiddleware):
    """Middleware to handle automatic logout scenarios"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            if e.status_code == 401:
                # Check if this is an auto-logout scenario
                auth_status = e.headers.get("X-Auth-Status") if e.headers else None
                
                if auth_status in ["timeout_verified", "expired", "user_not_found"]:
                    # Create auto-logout response
                    return JSONResponse(
                        status_code=401,
                        content={
                            "success": False,
                            "error": "authentication_required",
                            "message": e.detail,
                            "auth_status": auth_status,
                            "action": "auto_logout",
                            "redirect_to": "/login",
                            "timestamp": datetime.utcnow().isoformat()
                        },
                        headers={
                            "X-Auth-Status": auth_status,
                            "X-Redirect-To": "/login",
                            "X-Auto-Logout": "true",
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            "Pragma": "no-cache",
                            "Expires": "0"
                        }
                    )
            raise


class SessionExpirationMiddleware(BaseHTTPMiddleware):
    """Middleware to handle session expiration"""
    
    def __init__(self, app, session_timeout_minutes: int = 60):
        super().__init__(app)
        self.session_timeout_minutes = session_timeout_minutes
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check for session timeout headers
        if "authorization" in request.headers:
            auth_header = request.headers["authorization"]
            if auth_header.startswith("Bearer "):
                # Add session timeout info to request state
                request.state.session_timeout = self.session_timeout_minutes
        
        response = await call_next(request)
        
        # Add session timeout headers to response
        if hasattr(request.state, "session_timeout"):
            response.headers["X-Session-Timeout"] = str(self.session_timeout_minutes * 60)
            response.headers["X-Session-Warning"] = str((self.session_timeout_minutes - 5) * 60)
        
        return response


class ThreatDetectionMiddleware(BaseHTTPMiddleware):
    """Middleware for advanced threat detection"""
    
    def __init__(self, app):
        super().__init__(app)
        self.suspicious_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'union.*select',
            r'drop.*table',
            r'\.\./.*\.\.',
            r'exec\s*\(',
            r'eval\s*\('
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = get_client_ip_enhanced(request)
        
        # Analyze request content for threats
        suspicious_indicators = []
        
        # Check query parameters
        for key, value in request.query_params.items():
            indicators = detect_suspicious_patterns(value)
            suspicious_indicators.extend(indicators)
        
        # Check path for suspicious patterns
        path_indicators = detect_suspicious_patterns(str(request.url.path))
        suspicious_indicators.extend(path_indicators)
        
        # If threats detected, log and potentially block
        if suspicious_indicators:
            threat_data = {
                "client_ip": client_ip,
                "endpoint": request.url.path,
                "method": request.method,
                "suspicious_indicators": suspicious_indicators,
                "user_agent": request.headers.get("user-agent", ""),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.warning(f"Suspicious request detected", extra=threat_data)
            
            # For high-risk patterns, block the request
            high_risk_patterns = ["excessive_special_chars", "base64_payload", "suspicious_extensions"]
            if any(pattern in suspicious_indicators for pattern in high_risk_patterns):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Request blocked due to suspicious patterns"
                )
        
        return await call_next(request)


# Export middleware classes
__all__ = [
    "SecurityMiddleware",
    "AutoLogoutMiddleware", 
    "SessionExpirationMiddleware",
    "ThreatDetectionMiddleware"
]