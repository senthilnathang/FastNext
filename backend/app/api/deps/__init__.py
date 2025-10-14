"""
API Dependencies Module
Common dependencies for FastAPI endpoints
"""

from .auth import get_current_active_user, get_current_user, require_permissions
from .database import get_db, get_db_session
from .pagination import PaginationParams, get_pagination_params

__all__ = [
    "get_db",
    "get_db_session",
    "get_current_user",
    "get_current_active_user",
    "require_permissions",
    "get_pagination_params",
    "PaginationParams",
]
