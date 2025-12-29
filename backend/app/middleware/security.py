"""
Security Middleware for FastVue Framework

Provides comprehensive security features:
- Security headers injection (CSP, HSTS, X-Frame-Options, etc.)
- Request ID generation for tracking
- Suspicious pattern detection
- Request size limiting
"""

import logging
import re
import time
import uuid
from typing import Callable, List, Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)


# Suspicious patterns for threat detection
SUSPICIOUS_PATTERNS = [
    r"<script[^>]*>",  # XSS attempts
    r"javascript:",  # JavaScript injection
    r"on\w+\s*=",  # Event handler injection
    r"union\s+select",  # SQL injection
    r";\s*drop\s+",  # SQL injection
    r"--\s*$",  # SQL comment injection
    r"\.\./",  # Path traversal
    r"\.\.\\",  # Windows path traversal
    r"%2e%2e",  # Encoded path traversal
    r"eval\s*\(",  # Code injection
    r"exec\s*\(",  # Code injection
]

COMPILED_PATTERNS = [re.compile(pattern, re.IGNORECASE) for pattern in SUSPICIOUS_PATTERNS]


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware that:
    - Adds security headers to all responses
    - Generates unique request IDs
    - Detects suspicious request patterns
    - Enforces request size limits
    """

    def __init__(
        self,
        app: ASGIApp,
        max_request_size: int = 10 * 1024 * 1024,  # 10MB default
        enable_threat_detection: bool = True,
        enable_csp: bool = True,
        enable_hsts: bool = True,
        excluded_paths: Optional[List[str]] = None,
    ):
        super().__init__(app)
        self.max_request_size = max_request_size
        self.enable_threat_detection = enable_threat_detection
        self.enable_csp = enable_csp
        self.enable_hsts = enable_hsts
        self.excluded_paths = set(excluded_paths or ["/health", "/", "/api/v1/docs", "/api/v1/redoc"])

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through security checks"""
        start_time = time.time()

        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Check if path is excluded
        if request.url.path in self.excluded_paths:
            response = await call_next(request)
            self._add_security_headers(response, request_id)
            return response

        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            logger.warning(
                f"Request too large: {content_length} bytes from {self._get_client_ip(request)}"
            )
            return JSONResponse(
                status_code=413,
                content={"detail": "Request entity too large"},
                headers={"X-Request-ID": request_id},
            )

        # Threat detection
        if self.enable_threat_detection:
            threat = await self._detect_threats(request)
            if threat:
                logger.warning(
                    f"Suspicious request detected: {threat} from {self._get_client_ip(request)} "
                    f"to {request.url.path}"
                )
                # Log but don't block by default - could be adjusted based on severity
                request.state.suspicious = True
                request.state.threat_type = threat

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Request processing error: {str(e)}")
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )

        # Calculate response time
        response_time = time.time() - start_time
        if response_time > 2.0:  # Log slow requests
            logger.warning(f"Slow request: {request.url.path} took {response_time:.2f}s")

        # Add security headers
        self._add_security_headers(response, request_id, response_time)

        return response

    async def _detect_threats(self, request: Request) -> Optional[str]:
        """Detect suspicious patterns in request"""
        # Check URL path
        path = request.url.path
        for pattern in COMPILED_PATTERNS:
            if pattern.search(path):
                return f"suspicious_path:{pattern.pattern}"

        # Check query parameters
        query_string = str(request.url.query)
        if query_string:
            for pattern in COMPILED_PATTERNS:
                if pattern.search(query_string):
                    return f"suspicious_query:{pattern.pattern}"

        # Check headers for suspicious content
        user_agent = request.headers.get("user-agent", "")
        if any(term in user_agent.lower() for term in ["sqlmap", "nikto", "nmap", "masscan"]):
            return "suspicious_user_agent"

        return None

    def _add_security_headers(
        self,
        response: Response,
        request_id: str,
        response_time: Optional[float] = None,
    ) -> None:
        """Add security headers to response"""
        # Request tracking
        response.headers["X-Request-ID"] = request_id

        # Performance tracking
        if response_time is not None:
            response.headers["X-Response-Time"] = f"{response_time:.3f}s"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking protection
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )

        # HSTS (only in production)
        if self.enable_hsts and settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Content Security Policy (customizable)
        if self.enable_csp:
            # Development-friendly CSP
            if settings.ENVIRONMENT == "development":
                csp = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: blob:; "
                    "font-src 'self' data:; "
                    "connect-src 'self' http://localhost:* ws://localhost:*"
                )
            else:
                # Stricter CSP for production
                csp = (
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self'; "
                    "connect-src 'self'"
                )
            response.headers["Content-Security-Policy"] = csp

        # Cache control for API responses
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address handling proxy headers"""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        if request.client:
            return request.client.host
        return "unknown"


class ThreatDetectionMiddleware(BaseHTTPMiddleware):
    """
    Advanced threat detection middleware with pattern matching and scoring.
    """

    def __init__(
        self,
        app: ASGIApp,
        block_threshold: int = 80,  # Block if risk score exceeds this
        log_threshold: int = 30,  # Log if risk score exceeds this
    ):
        super().__init__(app)
        self.block_threshold = block_threshold
        self.log_threshold = log_threshold

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Analyze request for threats"""
        risk_score = self._calculate_risk_score(request)
        request.state.risk_score = risk_score

        if risk_score >= self.block_threshold:
            logger.warning(
                f"High-risk request blocked (score: {risk_score}): "
                f"{request.method} {request.url.path} from {self._get_client_ip(request)}"
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Request blocked due to security policy"},
            )

        if risk_score >= self.log_threshold:
            logger.info(
                f"Suspicious request (score: {risk_score}): "
                f"{request.method} {request.url.path} from {self._get_client_ip(request)}"
            )

        return await call_next(request)

    def _calculate_risk_score(self, request: Request) -> int:
        """Calculate risk score based on various factors"""
        score = 0

        # Check for suspicious patterns in path
        path = request.url.path.lower()
        if any(p in path for p in [".php", ".asp", ".jsp", "wp-", "admin"]):
            score += 20

        # Check for path traversal
        if ".." in path:
            score += 40

        # Check query parameters
        query = str(request.url.query).lower()
        if any(p in query for p in ["script", "eval", "exec", "union", "select"]):
            score += 30

        # Check user agent
        user_agent = request.headers.get("user-agent", "").lower()
        if not user_agent:
            score += 15
        elif any(t in user_agent for t in ["curl", "wget", "python", "bot"]):
            score += 10

        # Check for missing common headers
        if not request.headers.get("accept"):
            score += 10

        return min(score, 100)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP"""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
