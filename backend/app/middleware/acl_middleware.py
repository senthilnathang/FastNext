"""
ACL Middleware for automatic permission checking on API requests

This middleware automatically checks ACL permissions for incoming requests
based on the entity type, operation, and user context.
"""

import logging
from typing import Callable, Optional
from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.deps import get_current_user_optional
from app.db.session import get_db
from app.models.user import User
from app.services.acl_service import ACLService

logger = logging.getLogger(__name__)


class ACLMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically checks ACL permissions for API requests

    This middleware intercepts requests and checks if the authenticated user
    has the required permissions based on ACL rules.
    """

    def __init__(self, app: Callable, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/security/health",
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip ACL checking for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        # Only check API v1 endpoints
        if not request.url.path.startswith("/api/v1/"):
            return await call_next(request)

        try:
            # Get database session
            db = next(get_db())

            # Try to get current user (may be None for unauthenticated requests)
            try:
                user = await get_current_user_optional(request, db)
            except Exception:
                user = None

            # Extract entity information from request
            entity_info = self._extract_entity_info(request)

            if entity_info:
                # Check ACL permissions
                has_access, reason = self._check_request_permissions(
                    db, user, request, entity_info
                )

                if not has_access:
                    logger.warning(
                        f"ACL access denied: {request.method} {request.url.path} "
                        f"for user {user.id if user else 'anonymous'}: {reason}"
                    )

                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Access denied",
                            "reason": reason,
                            "path": request.url.path,
                            "method": request.method,
                        },
                    )

            # Continue with the request
            response = await call_next(request)
            return response

        except Exception as e:
            logger.error(f"ACL middleware error: {str(e)}")
            # Don't block requests due to middleware errors
            return await call_next(request)

    def _extract_entity_info(self, request: Request) -> Optional[dict]:
        """
        Extract entity type, ID, and operation from the request path and method

        Returns dict with keys: entity_type, entity_id, operation, field_name
        """
        path = request.url.path
        method = request.method

        # Parse API path to extract entity information
        # Expected patterns:
        # /api/v1/{entity_type}
        # /api/v1/{entity_type}/{entity_id}
        # /api/v1/{entity_type}/{entity_id}/{field_name}

        path_parts = path.split("/")
        if len(path_parts) < 4 or path_parts[1] != "api" or path_parts[2] != "v1":
            return None

        entity_type = path_parts[3] if len(path_parts) > 3 else None
        entity_id = path_parts[4] if len(path_parts) > 4 else None
        field_name = path_parts[5] if len(path_parts) > 5 else None

        # Skip certain entity types that don't need ACL checking
        skip_types = {
            "auth", "users", "roles", "permissions", "acls", "profile",
            "security", "cache", "database", "scaling", "notifications",
            "activity-logs", "audit-trails", "events", "collaboration"
        }

        if entity_type in skip_types:
            return None

        # Map HTTP methods to operations
        operation_map = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }

        operation = operation_map.get(method)
        if not operation:
            return None

        # For list operations (GET without ID), use empty string as entity_id
        if operation == "read" and not entity_id:
            entity_id = ""

        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "operation": operation,
            "field_name": field_name,
        }

    def _check_request_permissions(
        self, db: Session, user: Optional[User], request: Request, entity_info: dict
    ) -> tuple[bool, str]:
        """
        Check if the user has permission for the requested operation

        Returns (has_access, reason)
        """
        entity_type = entity_info["entity_type"]
        entity_id = entity_info["entity_id"]
        operation = entity_info["operation"]
        field_name = entity_info.get("field_name")

        # If no user, deny access for operations that require authentication
        if not user and operation in ["create", "update", "delete"]:
            return False, "Authentication required for this operation"

        # If no user, allow read operations (public access)
        if not user and operation == "read":
            return True, "Public read access allowed"

        # For authenticated users, check ACL permissions
        try:
            if field_name:
                # Field-level permission check
                has_access, reason = ACLService.check_field_access(
                    db=db,
                    user=user,
                    entity_type=entity_type,
                    field_name=field_name,
                    operation=operation,
                )
            else:
                # Record-level permission check
                has_access, reason = ACLService.check_record_access(
                    db=db,
                    user=user,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    operation=operation,
                )

            return has_access, reason

        except Exception as e:
            logger.error(f"ACL permission check failed: {str(e)}")
            # On ACL errors, deny access for safety
            return False, f"Permission check failed: {str(e)}"


# Utility functions for manual ACL checking in route handlers
def check_acl_access(
    db: Session,
    user: User,
    entity_type: str,
    entity_id: str = "",
    operation: str = "read",
    field_name: Optional[str] = None,
    entity_data: Optional[dict] = None,
) -> None:
    """
    Utility function to manually check ACL permissions in route handlers

    Raises HTTPException if access is denied
    """
    try:
        if field_name:
            has_access, reason = ACLService.check_field_access(
                db=db,
                user=user,
                entity_type=entity_type,
                field_name=field_name,
                operation=operation,
                entity_data=entity_data,
            )
        else:
            has_access, reason = ACLService.check_record_access(
                db=db,
                user=user,
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                entity_data=entity_data,
            )

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {reason}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ACL check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Permission check failed",
        )


def require_acl_permission(
    entity_type: str,
    operation: str = "read",
    field_name: Optional[str] = None,
):
    """
    Decorator factory for requiring ACL permissions on route handlers

    Usage:
        @require_acl_permission("order", "update")
        def update_order(order_id: str, ...):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and user from kwargs (FastAPI dependency injection)
            request = kwargs.get("request")
            current_user = kwargs.get("current_user")
            db = kwargs.get("db")

            if not all([request, current_user, db]):
                # Try to extract from args or raise error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies for ACL check",
                )

            # Extract entity_id from path parameters or request
            entity_id = kwargs.get("entity_id") or getattr(request, "path_params", {}).get("entity_id", "")

            check_acl_access(
                db=db,
                user=current_user,
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                field_name=field_name,
            )

            return await func(*args, **kwargs)

        return wrapper
    return decorator