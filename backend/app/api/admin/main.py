"""
Admin API Router
Central router for all admin API endpoints
"""

from fastapi import APIRouter

# Import admin route modules
from . import system_configuration

# Create admin router
admin_router = APIRouter()

# System Configuration (moved from v1)
admin_router.include_router(
    system_configuration.router, prefix="/config", tags=["admin-configuration"]
)