from typing import List, Dict, Optional, Union, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse
import logging
import re
from urllib.parse import urlparse

from app.core.config import settings
from app.core.logging import log_security_event

logger = logging.getLogger(__name__)

class SecurityCORSMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS middleware with comprehensive security features
    """
    
    def __init__(
        self,
        app,
        allow_origins: List[str] = None,
        allow_methods: List[str] = None,
        allow_headers: List[str] = None,
        allow_credentials: bool = True,
        expose_headers: List[str] = None,
        max_age: int = 3600,
        security_config: Optional[Dict] = None
    ):
        super().__init__(app)
        
        # Default secure configuration
        self.allow_origins = allow_origins or settings.BACKEND_CORS_ORIGINS
        self.allow_methods = allow_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
        self.allow_headers = allow_headers or [
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "X-Request-ID",
            "Cache-Control",
            "Pragma"
        ]
        self.allow_credentials = allow_credentials
        self.expose_headers = expose_headers or [
            "X-Process-Time",
            "X-Request-ID",
            "X-Auth-Status",
            "X-Rate-Limit-Limit",
            "X-Rate-Limit-Remaining",
            "X-Rate-Limit-Reset"
        ]
        self.max_age = max_age
        
        # Security configuration
        self.security_config = security_config or {}
        self.setup_security_policies()
        
        # Precompute origin patterns for performance
        self.origin_patterns = self._compile_origin_patterns()
        
        # Security logging
        self.log_blocked_origins = self.security_config.get("log_blocked_origins", True)
        self.strict_origin_validation = self.security_config.get("strict_origin_validation", True)
        self.validate_referer = self.security_config.get("validate_referer", True)
    
    def setup_security_policies(self):
        """Setup security policies for CORS"""
        
        # Blocked origins (known malicious or suspicious patterns)
        self.blocked_origins = self.security_config.get("blocked_origins", [
            "null",
            "file://",
            "data:",
            "javascript:",
            "vbscript:",
            "about:",
            "chrome:",
            "chrome-extension:",
            "moz-extension:",
            "safari-extension:",
            "ms-browser-extension:"
        ])
        
        # Suspicious patterns in origins
        self.suspicious_patterns = [
            r'.*\.tk$',           # .tk domains (often used for malicious purposes)
            r'.*\.ml$',           # .ml domains
            r'.*\.ga$',           # .ga domains
            r'.*\.cf$',           # .cf domains
            r'.*localhost:\d{5,}$',  # High port numbers on localhost
            r'.*127\.0\.0\.1:\d{5,}$',  # High port numbers on 127.0.0.1
            r'.*192\.168\..*:\d{5,}$',  # High port numbers on private networks
            r'.*10\..*:\d{5,}$',       # High port numbers on private networks
            r'.*172\.1[6-9]\..*:\d{5,}$',  # High port numbers on private networks
            r'.*172\.2[0-9]\..*:\d{5,}$',  # High port numbers on private networks
            r'.*172\.3[0-1]\..*:\d{5,}$',  # High port numbers on private networks
            r'.*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:\d{5,}$',  # IP addresses with high ports
        ]
        
        # Environment-specific policies
        if settings.API_V1_STR.startswith("/api"):
            # Production-like environment
            self.enforce_https = self.security_config.get("enforce_https", True)
            self.allow_wildcard_origins = False
        else:
            # Development environment
            self.enforce_https = False
            self.allow_wildcard_origins = True
    
    def _compile_origin_patterns(self) -> List[re.Pattern]:
        """Compile origin patterns for efficient matching"""
        patterns = []
        
        for origin in self.allow_origins:
            if origin == "*":
                # Wildcard - matches anything (use with caution)
                patterns.append(re.compile(r'.*'))
            elif origin.startswith("*."):
                # Subdomain wildcard
                domain = origin[2:]  # Remove "*."
                escaped_domain = re.escape(domain)
                pattern = rf"^https?://([a-zA-Z0-9-]+\.)*{escaped_domain}(:\d+)?$"
                patterns.append(re.compile(pattern, re.IGNORECASE))
            else:
                # Exact match
                escaped_origin = re.escape(origin)
                patterns.append(re.compile(f"^{escaped_origin}$", re.IGNORECASE))
        
        return patterns
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main CORS handling"""
        
        origin = request.headers.get("Origin")
        
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            return await self._handle_preflight(request, origin)
        
        # Process actual request
        response = await call_next(request)
        
        # Add CORS headers to response
        await self._add_cors_headers(response, request, origin)
        
        return response
    
    async def _handle_preflight(self, request: Request, origin: Optional[str]) -> Response:
        """Handle CORS preflight OPTIONS requests"""
        
        # Validate origin
        if not await self._is_origin_allowed(origin, request):
            await self._log_blocked_request(origin, "preflight", request)
            return PlainTextResponse(
                "CORS preflight blocked",
                status_code=403,
                headers={"Access-Control-Allow-Origin": "null"}
            )
        
        # Validate requested method
        requested_method = request.headers.get("Access-Control-Request-Method")
        if requested_method and requested_method not in self.allow_methods:
            await self._log_blocked_request(origin, "invalid_method", request, {
                "requested_method": requested_method
            })
            return PlainTextResponse(
                "Method not allowed",
                status_code=405
            )
        
        # Validate requested headers
        requested_headers = request.headers.get("Access-Control-Request-Headers")
        if requested_headers:
            headers_list = [h.strip() for h in requested_headers.split(",")]
            invalid_headers = [h for h in headers_list if not self._is_header_allowed(h)]
            
            if invalid_headers:
                await self._log_blocked_request(origin, "invalid_headers", request, {
                    "invalid_headers": invalid_headers
                })
                return PlainTextResponse(
                    "Headers not allowed",
                    status_code=400
                )
        
        # Create successful preflight response
        headers = {
            "Access-Control-Allow-Origin": origin or "*",
            "Access-Control-Allow-Methods": ", ".join(self.allow_methods),
            "Access-Control-Allow-Headers": ", ".join(self.allow_headers),
            "Access-Control-Max-Age": str(self.max_age),
            "Vary": "Origin"
        }
        
        if self.allow_credentials:
            headers["Access-Control-Allow-Credentials"] = "true"
        
        if self.expose_headers:
            headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
        
        return PlainTextResponse(
            "OK",
            status_code=200,
            headers=headers
        )
    
    async def _add_cors_headers(self, response: Response, request: Request, origin: Optional[str]):
        """Add CORS headers to actual response"""
        
        # Validate origin for actual requests
        if not await self._is_origin_allowed(origin, request):
            await self._log_blocked_request(origin, "actual_request", request)
            response.headers["Access-Control-Allow-Origin"] = "null"
            return
        
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Vary"] = "Origin"
        
        if self.allow_credentials:
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        if self.expose_headers:
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
        
        # Add security headers
        response.headers.update(self._get_security_headers(request))
    
    async def _is_origin_allowed(self, origin: Optional[str], request: Request) -> bool:
        """Check if origin is allowed"""
        
        if not origin:
            # No origin header - could be same-origin request or direct access
            return True
        
        # Check blocked origins first
        if self._is_origin_blocked(origin):
            return False
        
        # Check against allowed origins
        if self._matches_allowed_origins(origin):
            # Additional security checks
            return await self._perform_security_checks(origin, request)
        
        return False
    
    def _is_origin_blocked(self, origin: str) -> bool:
        """Check if origin is explicitly blocked"""
        
        origin_lower = origin.lower()
        
        # Check explicit blocked origins
        for blocked in self.blocked_origins:
            if blocked in origin_lower:
                return True
        
        # Check suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, origin_lower):
                return True
        
        return False
    
    def _matches_allowed_origins(self, origin: str) -> bool:
        """Check if origin matches allowed patterns"""
        
        # Handle wildcard
        if "*" in self.allow_origins:
            return True
        
        # Check compiled patterns
        for pattern in self.origin_patterns:
            if pattern.match(origin):
                return True
        
        return False
    
    async def _perform_security_checks(self, origin: str, request: Request) -> bool:
        """Perform additional security checks on origin"""
        
        try:
            parsed = urlparse(origin)
            
            # HTTPS enforcement in production
            if self.enforce_https and parsed.scheme != "https":
                # Allow HTTP only for localhost in development
                if not (parsed.hostname in ["localhost", "127.0.0.1"] and 
                       not self.strict_origin_validation):
                    return False
            
            # Port validation
            if parsed.port:
                # Check for suspicious high ports
                if parsed.port > 65535:
                    return False
                
                # In production, be more restrictive about ports
                if self.strict_origin_validation and parsed.port > 10000:
                    # Allow only common development ports
                    allowed_high_ports = [3000, 3001, 8080, 8081, 8000, 8001, 9000, 9001]
                    if parsed.port not in allowed_high_ports:
                        return False
            
            # Validate referer if present
            if self.validate_referer:
                referer = request.headers.get("Referer")
                if referer and not self._is_referer_valid(origin, referer):
                    return False
            
            # Check for localhost/private IP restrictions
            if self.strict_origin_validation:
                if self._is_private_origin(parsed.hostname):
                    # In production, restrict private origins
                    return not self.enforce_https
            
            return True
            
        except Exception as e:
            logger.error(f"Origin security check error: {e}")
            return False
    
    def _is_referer_valid(self, origin: str, referer: str) -> bool:
        """Validate that referer matches origin"""
        try:
            origin_parsed = urlparse(origin)
            referer_parsed = urlparse(referer)
            
            # Check if referer origin matches request origin
            origin_base = f"{origin_parsed.scheme}://{origin_parsed.netloc}"
            referer_origin = f"{referer_parsed.scheme}://{referer_parsed.netloc}"
            
            return origin_base == referer_origin
            
        except Exception:
            return True  # Allow if parsing fails
    
    def _is_private_origin(self, hostname: Optional[str]) -> bool:
        """Check if hostname is a private/local address"""
        if not hostname:
            return False
        
        private_patterns = [
            r'^localhost$',
            r'^127\.',
            r'^10\.',
            r'^192\.168\.',
            r'^172\.(1[6-9]|2[0-9]|3[0-1])\.'
        ]
        
        for pattern in private_patterns:
            if re.match(pattern, hostname):
                return True
        
        return False
    
    def _is_header_allowed(self, header: str) -> bool:
        """Check if header is allowed"""
        header_lower = header.lower()
        allowed_lower = [h.lower() for h in self.allow_headers]
        
        # Check exact matches
        if header_lower in allowed_lower:
            return True
        
        # Allow certain standard headers
        standard_headers = [
            "accept",
            "accept-language",
            "content-language",
            "content-type"
        ]
        
        if header_lower in standard_headers:
            return True
        
        return False
    
    def _get_security_headers(self, request: Request) -> Dict[str, str]:
        """Get additional security headers"""
        
        headers = {}
        
        # Add CSP for CORS contexts
        if self.security_config.get("add_csp", True):
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "font-src 'self'; "
                "object-src 'none'; "
                "media-src 'self'; "
                "form-action 'self';"
            )
        
        # Add other security headers
        headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        })
        
        # Add HSTS for HTTPS requests
        if request.url.scheme == "https":
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        return headers
    
    async def _log_blocked_request(self, origin: Optional[str], reason: str, request: Request, details: Optional[Dict] = None):
        """Log blocked CORS requests"""
        
        if not self.log_blocked_origins:
            return
        
        log_security_event(
            "CORS_REQUEST_BLOCKED",
            None,
            request,
            severity="WARNING",
            details={
                "origin": origin,
                "reason": reason,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "referer": request.headers.get("Referer"),
                "method": request.method,
                "path": request.url.path,
                **(details or {})
            }
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")

# CORS configuration presets
class CORSPresets:
    """Predefined CORS configuration presets for different environments"""
    
    @staticmethod
    def development() -> Dict:
        """Development CORS configuration - permissive but logged"""
        return {
            "allow_origins": [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://localhost:8080",
                "http://127.0.0.1:8080"
            ],
            "allow_credentials": True,
            "security_config": {
                "enforce_https": False,
                "strict_origin_validation": False,
                "log_blocked_origins": True,
                "validate_referer": False
            }
        }
    
    @staticmethod
    def production() -> Dict:
        """Production CORS configuration - strict security"""
        return {
            "allow_origins": [
                "https://yourdomain.com",
                "https://www.yourdomain.com",
                "https://app.yourdomain.com"
            ],
            "allow_credentials": True,
            "security_config": {
                "enforce_https": True,
                "strict_origin_validation": True,
                "log_blocked_origins": True,
                "validate_referer": True,
                "add_csp": True,
                "blocked_origins": [
                    "null",
                    "file://",
                    "data:",
                    "javascript:",
                    "vbscript:"
                ]
            }
        }
    
    @staticmethod
    def api_only() -> Dict:
        """API-only CORS configuration - for backend APIs"""
        return {
            "allow_origins": ["*"],  # Be cautious with this
            "allow_credentials": False,  # Disable credentials for public APIs
            "allow_headers": [
                "Accept",
                "Content-Type",
                "Authorization",
                "X-API-Key",
                "X-Request-ID"
            ],
            "expose_headers": [
                "X-Request-ID",
                "X-Rate-Limit-Limit",
                "X-Rate-Limit-Remaining"
            ],
            "security_config": {
                "enforce_https": True,
                "strict_origin_validation": False,
                "log_blocked_origins": True,
                "validate_referer": False
            }
        }
    
    @staticmethod
    def microservice() -> Dict:
        """Microservice CORS configuration - for internal services"""
        return {
            "allow_origins": [
                "https://*.yourdomain.com",
                "https://internal-*.yourdomain.com"
            ],
            "allow_credentials": True,
            "security_config": {
                "enforce_https": True,
                "strict_origin_validation": True,
                "log_blocked_origins": True,
                "validate_referer": True
            }
        }

# Utility function to create CORS middleware with preset
def create_cors_middleware(preset: str = "development", custom_config: Optional[Dict] = None):
    """Create CORS middleware with preset configuration"""
    
    presets = {
        "development": CORSPresets.development(),
        "production": CORSPresets.production(),
        "api_only": CORSPresets.api_only(),
        "microservice": CORSPresets.microservice()
    }
    
    config = presets.get(preset, CORSPresets.development())
    
    if custom_config:
        # Merge custom configuration
        config.update(custom_config)
        if "security_config" in custom_config and "security_config" in config:
            config["security_config"].update(custom_config["security_config"])
    
    return SecurityCORSMiddleware(**config)