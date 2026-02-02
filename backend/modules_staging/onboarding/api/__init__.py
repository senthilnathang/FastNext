"""
Onboarding API Routes
"""

from fastapi import APIRouter

from .onboarding import router as onboarding_router

router = APIRouter(tags=["Onboarding"])  # No prefix - module loader adds /api/v1/onboarding

router.include_router(onboarding_router)
