"""
Offboarding API Routes
"""

from fastapi import APIRouter

from .offboarding import router as offboarding_router

router = APIRouter(tags=["Offboarding"])  # No prefix - module loader adds /api/v1/offboarding

router.include_router(offboarding_router)
