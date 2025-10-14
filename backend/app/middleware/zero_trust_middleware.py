"""
Zero-Trust Security Middleware for FastAPI
"""

from typing import Callable, Optional
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
import json

from app.services.zero_trust_security import ZeroTrustSecurity, SecurityContext, TrustLevel
from app.core.config import settings


class ZeroTrustMiddleware(BaseHTTPMiddleware):
    """
    Zero-Trust Security Middleware
    """

    def __init__(self, app: Callable, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/auth/login"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip zero-trust checks for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        try:
            # Extract security context from request
            security_context = await self._extract_security_context(request)

            if not security_context:
                # No valid security context - deny access
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required"}
                )

            # Perform continuous authentication check
            if not ZeroTrustSecurity.continuous_authentication_check(security_context):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Session expired or invalid"}
                )

            # Evaluate trust level
            trust_level = ZeroTrustSecurity.evaluate_trust_level(security_context, None)  # TODO: Pass db session

            # Apply security policies
            policies_applied = ZeroTrustSecurity.apply_security_policies(security_context, None)  # TODO: Pass db session

            # Check micro-segmentation
            network_segment = self._get_network_segment(request)
            if not ZeroTrustSecurity.enforce_micro_segmentation(
                security_context, request.url.path, network_segment
            ):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access denied by network policy"}
                )

            # Add security headers to response
            start_time = time.time()
            response = await call_next(request)
            response_time = time.time() - start_time

            # Add security headers
            response.headers.update(self._get_security_headers())

            # Log security event
            await self._log_security_event(
                request, response, security_context, trust_level, response_time, policies_applied
            )

            # Handle step-up authentication requirements
            if "step_up_authentication" in policies_applied:
                response.headers["X-Step-Up-Auth"] = "required"

            return response

        except Exception as e:
            # Log security error
            await self._log_security_error(request, str(e))
            return JSONResponse(
                status_code=500,
                content={"detail": "Security validation error"}
            )

    async def _extract_security_context(self, request: Request) -> Optional[SecurityContext]:
        """
        Extract security context from request
        """
        # Get user from request state (set by auth middleware)
        user = getattr(request.state, 'user', None)
        if not user:
            return None

        # Get session ID from cookies or headers
        session_id = request.cookies.get("session_id") or request.headers.get("X-Session-ID")
        if not session_id:
            # Generate temporary session ID for this request
            session_id = f"temp_{hash(str(time.time()))}"

        # Extract client information
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "Unknown")

        # Get device fingerprint (if available)
        device_fingerprint = request.headers.get("X-Device-Fingerprint")

        # Get location information (if available)
        location = await self._get_location_info(ip_address)

        # Create or get existing security context
        context = ZeroTrustSecurity.create_security_context(
            user=user,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            location=location
        )

        return context

    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address from request
        """
        # Check for forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in case of multiple
            return forwarded_for.split(",")[0].strip()

        # Check for other proxy headers
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"

    async def _get_location_info(self, ip_address: str) -> Optional[dict]:
        """
        Get location information for IP address
        """
        # In production, use a geolocation service
        # For now, return basic info
        if ip_address == "unknown":
            return None

        # Mock location data - in production, call geolocation API
        return {
            "country": "US",
            "region": "CA",
            "city": "San Francisco",
            "coordinates": {"lat": 37.7749, "lon": -122.4194}
        }

    def _get_network_segment(self, request: Request) -> str:
        """
        Determine network segment for request
        """
        ip = self._get_client_ip(request)

        # Simple network segmentation logic
        if ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172."):
            return "internal"
        elif ip in ["127.0.0.1", "::1"]:
            return "localhost"
        else:
            return "external"

    def _get_security_headers(self) -> dict:
        """
        Get security headers for response
        """
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "X-Zero-Trust": "enabled"
        }

    async def _log_security_event(
        self,
        request: Request,
        response: Response,
        context: SecurityContext,
        trust_level: TrustLevel,
        response_time: float,
        policies_applied: list
    ):
        """
        Log security events for monitoring
        """
        event = {
            "timestamp": time.time(),
            "event_type": "api_access",
            "user_id": context.user_id,
            "session_id": context.session_id,
            "ip_address": context.ip_address,
            "user_agent": context.user_agent,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "response_time": response_time,
            "trust_level": trust_level.value,
            "risk_score": context.risk_score,
            "policies_applied": policies_applied,
            "location": context.location
        }

        # In production, send to security monitoring system
        # For now, just print for debugging
        print(f"Security Event: {json.dumps(event, default=str)}")

    async def _log_security_error(self, request: Request, error: str):
        """
        Log security errors
        """
        event = {
            "timestamp": time.time(),
            "event_type": "security_error",
            "method": request.method,
            "path": request.url.path,
            "ip_address": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", "Unknown"),
            "error": error
        }

        # In production, send to security monitoring system
        print(f"Security Error: {json.dumps(event, default=str)}")