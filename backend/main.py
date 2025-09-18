from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler
from contextlib import asynccontextmanager
from datetime import datetime
import logging
import time

from app.core.config import settings
from app.api.main import api_router
from app.db.init_db import init_db
from app.middleware.security_middleware import (
    SecurityMiddleware, AutoLogoutMiddleware, SessionExpirationMiddleware
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down FastNext Framework...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
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

## Authentication Endpoints
- **POST /auth/login** - User authentication
- **POST /auth/register** - User registration  
- **POST /auth/refresh** - Token refresh
- **POST /auth/logout** - User logout
- **GET /auth/me** - Current user information
""",
        # Enhanced API documentation
        openapi_tags=[
            {"name": "Authentication", "description": "User authentication and session management"},
            {"name": "Users", "description": "User management operations"},
            {"name": "Projects", "description": "Project management"},
            {"name": "Security", "description": "Security and monitoring features"},
        ]
    )
    
    # Setup middleware
    _setup_middleware(app)
    
    # Setup exception handlers  
    _setup_exception_handlers(app)
    
    # Register routes
    app.include_router(api_router, prefix=settings.API_V1_STR)
    
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "version": settings.VERSION,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "FastNext Framework API"
        }
    
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
    
    # CORS middleware (must be first to handle preflight requests)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for debugging
        allow_credentials=False,  # Must be False when using allow_origins=["*"]
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
    
    # Security middleware (disabled for CORS debugging)
    # app.add_middleware(SecurityMiddleware, enable_rate_limiting=True)
    
    # Auto-logout middleware
    app.add_middleware(AutoLogoutMiddleware)
    
    # Session expiration middleware
    app.add_middleware(SessionExpirationMiddleware, session_timeout_minutes=60)
    
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
    """Setup custom exception handlers"""
    
    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        """Custom handler for HTTP exceptions with auto-logout support"""
        
        # Handle 401 Unauthorized errors specially
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            auth_status = exc.headers.get("X-Auth-Status", "expired") if exc.headers else "expired"
            redirect_to = exc.headers.get("X-Redirect-To", "/login") if exc.headers else "/login"
            
            # Create auto-logout response
            response_body = {
                "success": False,
                "error": "authentication_required",
                "message": exc.detail,
                "auth_status": auth_status,
                "action": "auto_logout",
                "redirect_to": redirect_to,
                "timestamp": datetime.utcnow().isoformat(),
                "request_path": str(request.url.path),
                "request_method": request.method
            }
            
            # Log the auto-logout
            logger.warning(
                f"Auto-logout triggered: {request.method} {request.url.path} - "
                f"Status: {auth_status}, Reason: {exc.detail}"
            )
            
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
        
        # For non-auth errors, use default handler
        return await http_exception_handler(request, exc)
    
    @app.exception_handler(Exception)
    async def custom_general_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions gracefully"""
        logger.error(f"Unexpected error on {request.method} {request.url.path}: {exc}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "internal_server_error",
                "message": "An unexpected error occurred",
                "timestamp": datetime.utcnow().isoformat(),
                "request_path": str(request.url.path)
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