"""
Employee API Routes
"""

from fastapi import APIRouter

from .employees import router as employees_router
from .tags import router as tags_router
from .notes import router as notes_router
from .bonus_points import router as bonus_points_router
from .disciplinary import router as disciplinary_router
from .policies import router as policies_router
from .settings import router as settings_router

router = APIRouter(tags=["Employee"])  # No prefix - module loader adds /api/v1/employee

# Main employee routes
router.include_router(employees_router)

# Feature routes
router.include_router(tags_router, prefix="/tags")
router.include_router(notes_router, prefix="/notes")
router.include_router(bonus_points_router, prefix="/bonus-points")
router.include_router(disciplinary_router, prefix="/disciplinary-actions")
router.include_router(policies_router, prefix="/policies")
router.include_router(settings_router, prefix="/settings")
