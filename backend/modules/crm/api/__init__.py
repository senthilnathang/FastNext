"""
CRM Module API

Main router for all CRM API endpoints.
"""

from fastapi import APIRouter

from .pipelines import router as pipelines_router
from .stages import router as stages_router
from .leads import router as leads_router
from .opportunities import router as opportunities_router
from .contacts import router as contacts_router
from .accounts import router as accounts_router
from .activities import router as activities_router

router = APIRouter(prefix="/crm", tags=["CRM"])

# Include all sub-routers
router.include_router(pipelines_router)
router.include_router(stages_router)
router.include_router(leads_router)
router.include_router(opportunities_router)
router.include_router(contacts_router)
router.include_router(accounts_router)
router.include_router(activities_router)
