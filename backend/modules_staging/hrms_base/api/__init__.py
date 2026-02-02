"""
HRMS Base Module API

Main router for all HRMS Base API endpoints.
"""

from fastapi import APIRouter

from .departments import router as departments_router
from .job_positions import router as job_positions_router
from .job_roles import router as job_roles_router
from .employee_types import router as employee_types_router
from .shifts import router as shifts_router
from .work_types import router as work_types_router
from .requests import router as requests_router
from .approvals import router as approvals_router
from .settings import router as settings_router
from .announcements import router as announcements_router
from .stage_definitions import router as stage_definitions_router
from .mail_templates import router as mail_templates_router
router = APIRouter(tags=["HRMS"])  # No prefix - module loader adds /api/v1/hrms_base

# Include all sub-routers
router.include_router(departments_router)
router.include_router(job_positions_router)
router.include_router(job_roles_router)
router.include_router(employee_types_router)
router.include_router(shifts_router)
router.include_router(work_types_router)
router.include_router(requests_router)
router.include_router(approvals_router)
router.include_router(settings_router)
router.include_router(announcements_router)
router.include_router(stage_definitions_router)
router.include_router(mail_templates_router)
