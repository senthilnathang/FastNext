"""
API Dependencies Module
Common dependencies for FastAPI endpoints
"""
from .database import get_db, get_db_session
from .auth import get_current_user, get_current_active_user, require_permissions
from .pagination import get_pagination_params, PaginationParams

__all__ = [
    "get_db",
    "get_db_session", 
    "get_current_user",
    "get_current_active_user",
    "require_permissions",
    "get_pagination_params",
    "PaginationParams"
]