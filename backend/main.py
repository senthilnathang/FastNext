from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler
from contextlib import asynccontextmanager
from datetime import datetime
import logging
import time
import traceback

from app.core.config import settings
from app.core.exceptions import (
    FastNextException, SecurityError, ValidationError, 
    AuthenticationError, ConflictError, NotFoundError
)
from app.core.logging import setup_logging, log_security_event, get_logger
from app.core.swagger_config import customize_swagger_ui, setup_swagger_auth_config
from app.api.main import api_router
from app.db.init_db import init_db
from app.middleware.security_middleware import (
    SecurityMiddleware, AutoLogoutMiddleware, SessionExpirationMiddleware
)
from app.middleware.enhanced_logging_middleware import (
    create_enhanced_logging_middleware, create_auth_event_middleware
)

# Setup comprehensive logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Starting FastNext Framework...")
    
    # Initialize database
    try:
        init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    # Initialize Redis
    try:
        from app.core.redis_config import startup_redis
        await startup_redis()
        logger.info("✅ Redis initialized")
    except Exception as e:
        logger.error(f"⚠️ Redis initialization failed: {e}")
        logger.warning("Continuing without Redis caching...")
    
    yield
    
    # Cleanup
    try:
        from app.core.redis_config import shutdown_redis
        await shutdown_redis()
        logger.info("✅ Redis connections closed")
    except Exception as e:
        logger.error(f"❌ Redis cleanup failed: {e}")
    
    logger.info("🛑 Shutting down FastNext Framework...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        redirect_slashes=False,
        lifespan=lifespan,
        description="""
# FastNext Framework - Enhanced Authentication System

🔐 **Comprehensive Security** - Advanced authentication with JWT tokens and refresh tokens
🛡️ **Enhanced Protection** - Rate limiting, threat detection, and security monitoring  
🔍 **Session Management** - Automatic logout, session timeout, and device tracking
📊 **Audit Logging** - Complete security event logging and monitoring

## Key Features
- JWT-based authentication with automatic token refresh
- Enhanced security middleware with threat detection
- Role-based access control (RBAC) support
- Comprehensive password security and validation
- Session management with automatic timeout handling

## Authentication
Use the **Authorize** button below to authenticate with your JWT token:
1. Login through `/auth/login` to get your access token
2. Click the **Authorize** button 
3. Enter your token in the format: `Bearer your_jwt_token_here`
4. Test protected endpoints directly from this interface

## Authentication Endpoints
- **POST /auth/login** - User authentication
- **POST /auth/register** - User registration  
- **POST /auth/refresh** - Token refresh
- **POST /auth/logout** - User logout
- **GET /auth/me** - Current user information
""",
        # Enhanced API documentation with security schemes
        openapi_tags=[
            {"name": "Authentication", "description": "🔐 User authentication and session management"},
            {"name": "Users", "description": "👥 User management operations"},
            {"name": "Profile", "description": "👤 User profile management"},
            {"name": "Security", "description": "🛡️ Security settings and monitoring"},
            {"name": "Projects", "description": "📂 Project management"},
            {"name": "Pages", "description": "📄 Page management"},
            {"name": "Components", "description": "🧩 Component management"},
            {"name": "Roles", "description": "🔑 Role-based access control"},
            {"name": "Permissions", "description": "🔒 Permission management"},
            {"name": "Activity Logs", "description": "📊 Activity tracking and monitoring"},
            {"name": "Audit Trails", "description": "📋 Change history and audit logs"},
            {"name": "Assets", "description": "🖼️ File and asset management"},
        ],
        swagger_ui_parameters={
            "deepLinking": True,
            "displayRequestDuration": True,
            "docExpansion": "none",
            "operationsSorter": "alpha",
            "filter": True,
            "showExtensions": True,
            "showCommonExtensions": True,
            "tryItOutEnabled": True,
        }
    )
    
    # Setup middleware
    _setup_middleware(app)
    
    # Setup exception handlers  
    _setup_exception_handlers(app)
    
    # Register routes
    app.include_router(api_router, prefix=settings.API_V1_STR)
    
    # Setup custom Swagger UI
    customize_swagger_ui(app)
    
    # Configure OpenAPI schema with authentication
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        
        from fastapi.openapi.utils import get_openapi
        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Add security schemes
        auth_config = setup_swagger_auth_config()
        openapi_schema.update(auth_config)
        
        app.openapi_schema = openapi_schema
        return app.openapi_schema
    
    app.openapi = custom_openapi
    
    # Debug endpoints
    @app.get("/debug")
    async def debug_endpoint():
        """Simple debug endpoint to test basic functionality"""
        return {"status": "ok", "message": "Debug endpoint working"}
    
    @app.get("/debug/headers")
    async def debug_headers(request: Request):
        """Debug endpoint to check headers"""
        try:
            return {
                "headers": dict(request.headers),
                "method": request.method,
                "url": str(request.url),
                "status": "ok"
            }
        except Exception as e:
            return {"error": str(e), "status": "error"}
    
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint with system status"""
        health_data = {
            "status": "healthy",
            "version": settings.VERSION,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "FastNext Framework API",
            "components": {
                "database": "unknown",
                "redis": "unknown",
                "cache": "disabled" if not settings.CACHE_ENABLED else "unknown"
            }
        }
        
        # Check database connection
        try:
            from app.db.session import get_db
            async for db in get_db():
                await db.execute("SELECT 1")
                health_data["components"]["database"] = "healthy"
                break
        except Exception as e:
            health_data["components"]["database"] = f"unhealthy: {str(e)}"
            health_data["status"] = "degraded"
        
        # Check Redis connection
        if settings.CACHE_ENABLED:
            try:
                from app.core.redis_config import redis_manager, cache
                if redis_manager.is_connected:
                    # Test Redis with a simple operation
                    test_key = "health_check_test"
                    await cache.set(test_key, "test_value", 10)
                    test_result = await cache.get(test_key)
                    await cache.delete(test_key)
                    
                    if test_result == "test_value":
                        health_data["components"]["redis"] = "healthy"
                        health_data["components"]["cache"] = "healthy"
                        
                        # Add cache stats
                        cache_stats = await cache.get_stats()
                        health_data["cache_stats"] = cache_stats
                    else:
                        health_data["components"]["redis"] = "unhealthy: test failed"
                        health_data["components"]["cache"] = "unhealthy"
                        health_data["status"] = "degraded"
                else:
                    health_data["components"]["redis"] = "disconnected"
                    health_data["components"]["cache"] = "unavailable"
                    health_data["status"] = "degraded"
            except Exception as e:
                health_data["components"]["redis"] = f"unhealthy: {str(e)}"
                health_data["components"]["cache"] = "unhealthy"
                health_data["status"] = "degraded"
        
        return health_data
    
    @app.get("/")
    async def root():
        """Root endpoint with API information"""
        return {
            "message": "FastNext Framework - Enhanced Authentication System",
            "version": settings.VERSION,
            "description": "Secure web application framework with comprehensive authentication",
            "features": {
                "authentication": "JWT with refresh tokens",
                "security": "Enhanced threat detection and monitoring",
                "session_management": "Automatic timeout and device tracking",
                "audit_logging": "Comprehensive security event logging"
            },
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "redoc": "/redoc",
                "api": settings.API_V1_STR
            }
        }
    
    return app


def _setup_middleware(app: FastAPI):
    """Setup application middleware"""
    
    # Import middleware
    from app.middleware.cache_middleware import CacheMiddleware, RateLimitMiddleware
    
    # Enhanced Event Logging Middleware
    # Add authentication event tracking
    app.add_middleware(create_auth_event_middleware())
    
    # Add comprehensive event logging
    app.add_middleware(
        create_enhanced_logging_middleware(
            enable_enhanced_logging=True,
            log_all_requests=False,  # Only log sensitive endpoints and errors
            exclude_paths={
                '/health', '/metrics', '/favicon.ico', '/static/', '/_next/',
                '/docs', '/redoc', '/openapi.json', '/ping', '/version', '/debug'
            }
        )
    )
    
    # Temporarily disable cache and rate limiting middleware to fix encoding issues
    # TODO: Re-enable after fixing header encoding problems
    
    # Rate limiting middleware (disabled temporarily)
    # if settings.CACHE_ENABLED:
    #     app.add_middleware(
    #         RateLimitMiddleware,
    #         requests_per_minute=60,
    #         requests_per_hour=1000
    #     )
    
    # Cache middleware for HTTP responses (disabled temporarily)
    # if settings.CACHE_ENABLED:
    #     app.add_middleware(
    #         CacheMiddleware,
    #         default_ttl=settings.CACHE_DEFAULT_TTL
    #     )
    
    # CORS middleware (simplified to fix encoding issues)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Simplified for debugging
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[],  # Temporarily empty to avoid encoding issues
        max_age=3600,
    )
    
    # Security middleware (disabled for debugging)
    # app.add_middleware(SecurityMiddleware, enable_rate_limiting=True)
    
    # Auto-logout middleware (disabled temporarily to fix encoding issues)
    # app.add_middleware(AutoLogoutMiddleware)
    
    # Session expiration middleware (disabled temporarily to fix encoding issues)
    # app.add_middleware(SessionExpirationMiddleware, session_timeout_minutes=60)
    
    # Compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Performance monitoring middleware
    @app.middleware("http")
    async def performance_monitoring(request: Request, call_next):
        start_time = time.time()
        request_id = f"req_{int(start_time * 1000000)}"
        
        # Add request ID for tracing
        request.state.request_id = request_id
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        response.headers["X-Request-ID"] = request_id
        
        # Log slow requests for optimization
        if process_time > 2.0:
            logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
        
        return response


def _setup_exception_handlers(app: FastAPI):
    """Setup comprehensive exception handlers following coding standards"""
    
    @app.exception_handler(SecurityError)
    async def security_error_handler(request: Request, exc: SecurityError):
        """Handle security-related exceptions"""
        # Log security event
        log_security_event(
            "SECURITY_VIOLATION",
            None,
            request,
            severity="HIGH",
            details={
                "error_type": exc.__class__.__name__,
                "error_message": exc.message,
                "error_details": exc.details
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        """Handle validation errors"""
        logger.warning(f"Validation error: {exc.message} - Details: {exc.details}")
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(AuthenticationError)
    async def authentication_error_handler(request: Request, exc: AuthenticationError):
        """Handle authentication errors with auto-logout support"""
        # Log authentication failure
        log_security_event(
            "AUTHENTICATION_FAILED",
            None,
            request,
            severity="MEDIUM",
            details={
                "error_message": exc.message,
                "error_details": exc.details
            }
        )
        
        response_body = {
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            },
            "action": "auto_logout",
            "redirect_to": "/login",
            "meta": {
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": getattr(request.state, 'request_id', 'unknown')
            }
        }
        
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=response_body,
            headers={
                "X-Auto-Logout": "true",
                "X-Redirect-To": "/login",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    
    @app.exception_handler(ConflictError)
    async def conflict_error_handler(request: Request, exc: ConflictError):
        """Handle conflict errors (e.g., duplicate resources)"""
        logger.info(f"Conflict error: {exc.message}")
        
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(NotFoundError)
    async def not_found_error_handler(request: Request, exc: NotFoundError):
        """Handle not found errors"""
        logger.info(f"Not found error: {exc.message}")
        
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(FastNextException)
    async def fastnext_exception_handler(request: Request, exc: FastNextException):
        """Handle all FastNext custom exceptions"""
        logger.error(f"FastNext exception: {exc.message} - Details: {exc.details}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        """Handle FastAPI HTTP exceptions with consistent format"""
        # Handle 401 Unauthorized errors specially for backward compatibility
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            auth_status = exc.headers.get("X-Auth-Status", "expired") if exc.headers else "expired"
            redirect_to = exc.headers.get("X-Redirect-To", "/login") if exc.headers else "/login"
            
            response_body = {
                "success": False,
                "error": {
                    "code": "AUTHENTICATION_REQUIRED",
                    "message": exc.detail,
                    "details": {"auth_status": auth_status}
                },
                "action": "auto_logout",
                "redirect_to": redirect_to,
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
            
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content=response_body,
                headers={
                    "X-Auth-Status": auth_status,
                    "X-Redirect-To": redirect_to,
                    "X-Auto-Logout": "true",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        
        # For other HTTP exceptions, return consistent format
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "details": {}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def custom_general_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions gracefully"""
        # Log the full stack trace for debugging
        logger.error(
            f"Unexpected error on {request.method} {request.url.path}: {exc}",
            extra={
                "traceback": traceback.format_exc(),
                "request_id": getattr(request.state, 'request_id', 'unknown')
            }
        )
        
        # Log as security event if it might be an attack
        if any(keyword in str(exc).lower() for keyword in ['sql', 'injection', 'script', 'xss']):
            log_security_event(
                "POTENTIAL_ATTACK",
                None,
                request,
                severity="CRITICAL",
                details={
                    "error": str(exc),
                    "error_type": exc.__class__.__name__
                }
            )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                    "details": {}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            }
        )


# Create the application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment variables
    api_host = "0.0.0.0"
    api_port = 8000
    
    logger.info(f"Starting FastNext Framework on {api_host}:{api_port}")
    
    uvicorn.run(
        "main:app", 
        host=api_host, 
        port=api_port, 
        reload=True,
        timeout_keep_alive=1800,  # 30 minutes
        timeout_graceful_shutdown=1800,  # 30 minutes
        limit_max_requests=10000,
        limit_concurrency=1000,
        access_log=True
    )