"""
Authentication verification utilities for API endpoints
"""

from typing import List, Optional, Dict, Any
from functools import wraps
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import logging

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.user import User
from app.services.permission_service import PermissionService

logger = logging.getLogger(__name__)

# Define route permissions mapping
ROUTE_PERMISSIONS: Dict[str, Dict[str, Any]] = {
    # Admin routes - require admin role
    "/api/v1/admin": {
        "requires_admin": True,
        "permissions": ["admin.access"]
    },
    "/api/v1/users": {
        "requires_admin": True,
        "permissions": ["user.manage"]
    },
    "/api/v1/roles": {
        "requires_admin": True,
        "permissions": ["role.manage"]
    },
    "/api/v1/permissions": {
        "requires_admin": True,
        "permissions": ["permission.manage"]
    },
    
    # Data management routes
    "/api/v1/data/import": {
        "permissions": ["data.import"]
    },
    "/api/v1/data/export": {
        "permissions": ["data.export"]
    },
    
    # Configuration routes
    "/api/v1/config": {
        "permissions": ["config.manage"]
    },
    
    # Project routes - basic access
    "/api/v1/projects": {
        "permissions": ["project.read"]
    },
    
    # Workflow routes
    "/api/v1/workflows": {
        "permissions": ["workflow.read"]
    },
    
    # Profile routes - self-access
    "/api/v1/profile": {
        "permissions": ["profile.edit"]
    },
    
    # System monitoring
    "/api/v1/system": {
        "requires_admin": True,
        "permissions": ["system.monitor"]
    },
    
    # Audit and security
    "/api/v1/audit": {
        "requires_admin": True,
        "permissions": ["audit.read"]
    },
    "/api/v1/security": {
        "requires_admin": True,
        "permissions": ["security.manage"]
    }
}

# Public endpoints that don't require authentication
PUBLIC_ENDPOINTS = [
    "/api/v1/auth/login",
    "/api/v1/auth/register", 
    "/api/v1/auth/refresh",
    "/api/v1/health",
    "/api/v1/docs",
    "/api/v1/openapi.json",
    "/api/v1/redoc"
]


def is_public_endpoint(path: str) -> bool:
    """Check if an endpoint is public (doesn't require authentication)"""
    return any(path.startswith(endpoint) for endpoint in PUBLIC_ENDPOINTS)


def get_route_permissions(path: str) -> Dict[str, Any]:
    """Get permission requirements for a specific route"""
    # Check for exact match first
    if path in ROUTE_PERMISSIONS:
        return ROUTE_PERMISSIONS[path]
    
    # Check for prefix matches (longest first)
    sorted_routes = sorted(ROUTE_PERMISSIONS.keys(), key=len, reverse=True)
    for route in sorted_routes:
        if path.startswith(route):
            return ROUTE_PERMISSIONS[route]
    
    # Default: require authentication but no specific permissions
    return {"permissions": []}


def verify_route_access(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Verify user has access to the requested route
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        User: Current user if access is granted
        
    Raises:
        HTTPException: If access is denied
    """
    path = request.url.path
    
    # Skip verification for public endpoints
    if is_public_endpoint(path):
        return current_user
    
    # Get route permission requirements
    route_perms = get_route_permissions(path)
    
    logger.info(f"🔒 Verifying access for user {current_user.id} to {path}")
    
    # Check admin requirement
    if route_perms.get("requires_admin", False):
        if not current_user.is_superuser:
            if not PermissionService.check_permission(db, current_user.id, "manage", "system"):
                logger.warning(f"❌ Admin access denied for user {current_user.id} to {path}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Administrative privileges required"
                )
    
    # Check specific permissions
    required_permissions = route_perms.get("permissions", [])
    if required_permissions:
        for permission in required_permissions:
            # Split permission into action.category format
            if "." in permission:
                action, category = permission.split(".", 1)
                if not PermissionService.check_permission(db, current_user.id, action, category):
                    logger.warning(f"❌ Permission denied for user {current_user.id}: {permission}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required permission: {permission}"
                    )
            else:
                logger.warning(f"⚠️ Invalid permission format: {permission}")
    
    logger.info(f"✅ Access granted for user {current_user.id} to {path}")
    return current_user


def require_permissions(*permissions: str):
    """
    Decorator to require specific permissions for an endpoint
    
    Usage:
        @require_permissions("user.manage", "role.edit")
        async def my_endpoint():
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user and db from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing authentication dependencies"
                )
            
            # Check each permission
            for permission in permissions:
                if "." in permission:
                    action, category = permission.split(".", 1)
                    if not PermissionService.check_permission(db, current_user.id, action, category):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Missing required permission: {permission}"
                        )
                else:
                    logger.warning(f"Invalid permission format: {permission}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def audit_route_access(
    request: Request,
    current_user: User,
    success: bool = True,
    error_detail: Optional[str] = None
):
    """
    Audit route access attempts
    
    Args:
        request: FastAPI request object
        current_user: User who attempted access
        success: Whether access was granted
        error_detail: Error details if access was denied
    """
    log_data = {
        "user_id": current_user.id if current_user else None,
        "username": current_user.username if current_user else "anonymous",
        "path": request.url.path,
        "method": request.method,
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown"),
        "success": success,
        "error_detail": error_detail
    }
    
    if success:
        logger.info(f"✅ Route access granted: {log_data}")
    else:
        logger.warning(f"❌ Route access denied: {log_data}")


class AuthenticationMiddleware:
    """
    Middleware to automatically verify authentication for all protected routes
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Only process HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        path = request.url.path
        
        # Skip authentication for public endpoints
        if is_public_endpoint(path):
            await self.app(scope, receive, send)
            return
        
        # For protected routes, authentication will be handled by FastAPI dependencies
        # This middleware just logs access attempts
        logger.debug(f"🔍 Processing protected route: {path}")
        
        await self.app(scope, receive, send)


def create_auth_dependencies():
    """
    Create FastAPI dependencies for different authentication levels
    
    Returns:
        Dict with auth dependency functions
    """
    return {
        "require_auth": get_current_active_user,
        "require_admin": require_admin,
        "verify_route_access": verify_route_access,
    }


# Authentication summary for API documentation
AUTH_SUMMARY = {
    "authentication_required": "Most API endpoints require authentication via Bearer token",
    "public_endpoints": PUBLIC_ENDPOINTS,
    "admin_endpoints": [route for route, perms in ROUTE_PERMISSIONS.items() if perms.get("requires_admin")],
    "permission_system": "Role-based access control with granular permissions",
    "token_format": "JWT Bearer token in Authorization header",
    "token_expiry": "Tokens expire and must be refreshed",
    "error_codes": {
        "401": "Authentication required or token invalid",
        "403": "Insufficient permissions",
        "422": "Invalid token format"
    }
}