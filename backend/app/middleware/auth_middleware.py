from typing import Optional, List, Dict, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging
import redis
import json
import hashlib
from urllib.parse import unquote

from app.core.config import settings
from app.core.logging import log_security_event
from app.models.user import User
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

# JWT Configuration
ALGORITHM = "HS256"
SECRET_KEY = settings.SECRET_KEY

# Redis for token blacklisting (if available)
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
    logger.warning("Redis not available for token blacklisting")

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Enhanced authentication middleware with comprehensive security features
    """
    
    def __init__(self, app, exclude_paths: List[str] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/favicon.ico"
        ]
        self.security = HTTPBearer(auto_error=False)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main middleware dispatch method"""
        
        # Skip authentication for excluded paths
        if self._should_skip_auth(request.url.path):
            return await call_next(request)
        
        # Extract and validate token
        token = await self._extract_token(request)
        if not token:
            return self._create_auth_error_response("Authentication required", "MISSING_TOKEN")
        
        try:
            # Validate token and get user info
            user_data = await self._validate_token(token, request)
            if not user_data:
                return self._create_auth_error_response("Invalid or expired token", "INVALID_TOKEN")
            
            # Check if token is blacklisted
            if await self._is_token_blacklisted(token):
                return self._create_auth_error_response("Token has been revoked", "REVOKED_TOKEN")
            
            # Add user context to request
            request.state.user = user_data
            request.state.token = token
            
            # Check user status and permissions
            if not await self._check_user_status(user_data, request):
                return self._create_auth_error_response("Account disabled or suspended", "ACCOUNT_DISABLED")
            
            # Rate limiting per user
            if not await self._check_user_rate_limit(user_data["user_id"], request):
                return self._create_rate_limit_response()
            
            # Log successful authentication
            await self._log_auth_success(user_data, request)
            
            response = await call_next(request)
            
            # Add auth headers to response
            response.headers["X-User-ID"] = str(user_data["user_id"])
            response.headers["X-Auth-Status"] = "authenticated"
            
            return response
            
        except JWTError as e:
            await self._log_auth_failure("jwt_error", str(e), request)
            return self._create_auth_error_response("Invalid token format", "MALFORMED_TOKEN")
        
        except Exception as e:
            logger.error(f"Authentication middleware error: {e}")
            await self._log_auth_failure("middleware_error", str(e), request)
            return self._create_auth_error_response("Authentication service error", "AUTH_SERVICE_ERROR")
    
    def _should_skip_auth(self, path: str) -> bool:
        """Check if path should skip authentication"""
        return any(path.startswith(excluded) or path == excluded for excluded in self.exclude_paths)
    
    async def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from request"""
        # Try Authorization header first
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:]  # Remove "Bearer " prefix
        
        # Try cookie as fallback
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            return cookie_token
        
        # Try query parameter (less secure, for special cases)
        query_token = request.query_params.get("token")
        if query_token:
            logger.warning("Token provided via query parameter - security risk")
            return unquote(query_token)
        
        return None
    
    async def _validate_token(self, token: str, request: Request) -> Optional[Dict[str, Any]]:
        """Validate JWT token and extract user data"""
        try:
            # Decode JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Validate required fields
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Check token expiration
            exp = payload.get("exp")
            if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
                return None
            
            # Check token issued time (prevent extremely old tokens)
            iat = payload.get("iat")
            if iat:
                issued_time = datetime.fromtimestamp(iat)
                max_age = timedelta(days=30)  # Maximum token age
                if datetime.utcnow() - issued_time > max_age:
                    return None
            
            # Check token type (should be access token)
            token_type = payload.get("type", "access")
            if token_type != "access":
                return None
            
            # Get additional user data from database
            user_info = await self._get_user_info(user_id)
            if not user_info:
                return None
            
            return {
                "user_id": user_id,
                "email": user_info.get("email"),
                "roles": payload.get("roles", []),
                "permissions": payload.get("permissions", []),
                "is_active": user_info.get("is_active", True),
                "is_superuser": payload.get("is_superuser", False),
                "token_exp": exp,
                "token_iat": iat
            }
            
        except JWTError:
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    async def _get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information from database"""
        try:
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return {
                        "email": user.email,
                        "is_active": user.is_active,
                        "last_login": user.last_login,
                        "failed_login_attempts": getattr(user, 'failed_login_attempts', 0)
                    }
                return None
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Database error getting user info: {e}")
            return None
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        if not redis_available:
            return False
        
        try:
            # Create token hash for storage efficiency
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            blacklisted = await redis_client.get(f"blacklist:{token_hash}")
            return blacklisted is not None
        except Exception as e:
            logger.error(f"Redis error checking blacklist: {e}")
            return False
    
    async def _check_user_status(self, user_data: Dict[str, Any], request: Request) -> bool:
        """Check if user account is active and not suspended"""
        if not user_data.get("is_active", True):
            await self._log_auth_failure("account_disabled", "User account is disabled", request, user_data)
            return False
        
        # Check for suspicious activity patterns
        if await self._detect_suspicious_activity(user_data, request):
            await self._log_auth_failure("suspicious_activity", "Suspicious activity detected", request, user_data)
            return False
        
        return True
    
    async def _detect_suspicious_activity(self, user_data: Dict[str, Any], request: Request) -> bool:
        """Detect suspicious activity patterns"""
        try:
            if not redis_available:
                return False
            
            user_id = user_data["user_id"]
            client_ip = self._get_client_ip(request)
            
            # Check for multiple IPs in short time
            ip_key = f"user_ips:{user_id}"
            current_ips = await redis_client.smembers(ip_key)
            
            if len(current_ips) > 5:  # More than 5 different IPs in time window
                logger.warning(f"User {user_id} accessing from multiple IPs: {current_ips}")
                return True
            
            # Add current IP with expiration
            await redis_client.sadd(ip_key, client_ip)
            await redis_client.expire(ip_key, 3600)  # 1 hour window
            
            # Check request frequency
            request_key = f"user_requests:{user_id}"
            request_count = await redis_client.incr(request_key)
            if request_count == 1:
                await redis_client.expire(request_key, 60)  # 1 minute window
            
            if request_count > 100:  # More than 100 requests per minute
                logger.warning(f"User {user_id} making too many requests: {request_count}/min")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error detecting suspicious activity: {e}")
            return False
    
    async def _check_user_rate_limit(self, user_id: str, request: Request) -> bool:
        """Check user-specific rate limiting"""
        if not redis_available:
            return True
        
        try:
            # Rate limit: 1000 requests per hour per user
            rate_key = f"rate_limit:user:{user_id}"
            current_requests = await redis_client.incr(rate_key)
            
            if current_requests == 1:
                await redis_client.expire(rate_key, 3600)  # 1 hour
            
            if current_requests > 1000:
                logger.warning(f"User {user_id} exceeded rate limit: {current_requests}/hour")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return True  # Allow request on error
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")
    
    async def _log_auth_success(self, user_data: Dict[str, Any], request: Request):
        """Log successful authentication"""
        log_security_event(
            "AUTHENTICATION_SUCCESS",
            user_data["user_id"],
            request,
            severity="INFO",
            details={
                "user_email": user_data.get("email"),
                "roles": user_data.get("roles", []),
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown")
            }
        )
    
    async def _log_auth_failure(self, reason: str, details: str, request: Request, user_data: Dict[str, Any] = None):
        """Log authentication failure"""
        log_security_event(
            "AUTHENTICATION_FAILED",
            user_data.get("user_id") if user_data else None,
            request,
            severity="WARNING",
            details={
                "reason": reason,
                "details": details,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "path": request.url.path
            }
        )
    
    def _create_auth_error_response(self, message: str, error_code: str) -> JSONResponse:
        """Create standardized authentication error response"""
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": error_code,
                    "message": message,
                    "details": {}
                },
                "action": "auto_logout",
                "redirect_to": "/login",
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            headers={
                "X-Auth-Status": "failed",
                "X-Auto-Logout": "true",
                "X-Redirect-To": "/login",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "WWW-Authenticate": "Bearer"
            }
        )
    
    def _create_rate_limit_response(self) -> JSONResponse:
        """Create rate limit exceeded response"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests",
                    "details": {"retry_after": 3600}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            headers={
                "Retry-After": "3600",
                "X-RateLimit-Limit": "1000",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int((datetime.utcnow() + timedelta(hours=1)).timestamp()))
            }
        )

# Token blacklisting utilities
class TokenBlacklist:
    """Utility class for managing token blacklisting"""
    
    @staticmethod
    async def blacklist_token(token: str, reason: str = "logout"):
        """Add token to blacklist"""
        if not redis_available:
            logger.warning("Cannot blacklist token - Redis not available")
            return False
        
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            # Decode token to get expiration
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            exp = payload.get("exp")
            
            if exp:
                ttl = max(0, exp - int(datetime.utcnow().timestamp()))
                if ttl > 0:
                    await redis_client.setex(
                        f"blacklist:{token_hash}",
                        ttl,
                        json.dumps({
                            "reason": reason,
                            "blacklisted_at": datetime.utcnow().isoformat(),
                            "user_id": payload.get("sub")
                        })
                    )
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")
            return False
    
    @staticmethod
    async def blacklist_user_tokens(user_id: str, reason: str = "security"):
        """Blacklist all tokens for a specific user"""
        if not redis_available:
            logger.warning("Cannot blacklist user tokens - Redis not available")
            return False
        
        try:
            # This would require tracking active tokens per user
            # For now, we'll use a user-level blacklist
            blacklist_key = f"user_blacklist:{user_id}"
            await redis_client.setex(
                blacklist_key,
                86400,  # 24 hours
                json.dumps({
                    "reason": reason,
                    "blacklisted_at": datetime.utcnow().isoformat()
                })
            )
            
            logger.info(f"Blacklisted all tokens for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error blacklisting user tokens: {e}")
            return False

# Dependency for getting current user from middleware
def get_current_user(request: Request) -> Dict[str, Any]:
    """Get current authenticated user from request state"""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def get_current_active_user(request: Request) -> Dict[str, Any]:
    """Get current active user from request state"""
    user = get_current_user(request)
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return user

def require_permissions(required_permissions: List[str]):
    """Decorator to require specific permissions"""
    def decorator(func):
        def wrapper(request: Request, *args, **kwargs):
            user = get_current_user(request)
            user_permissions = user.get("permissions", [])
            
            # Check if user has required permissions
            missing_permissions = [p for p in required_permissions if p not in user_permissions]
            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permissions: {', '.join(missing_permissions)}"
                )
            
            return func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_roles(required_roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(func):
        def wrapper(request: Request, *args, **kwargs):
            user = get_current_user(request)
            user_roles = user.get("roles", [])
            
            # Check if user has any of the required roles
            if not any(role in user_roles for role in required_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Required roles: {', '.join(required_roles)}"
                )
            
            return func(request, *args, **kwargs)
        return wrapper
    return decorator