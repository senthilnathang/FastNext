"""Base module API."""

from .routes import router as modules_router
from .sequences import router as sequences_router
from .scheduled_actions import router as scheduled_actions_router
from .record_rules import router as record_rules_router
from .automation import router as automation_router
from .module_technical import router as module_technical_router
from .schema import router as schema_router
from .config import router as config_router
from .translations import router as translations_router
from .workflows import router as workflows_router
from .remote_modules import router as remote_modules_router
from .reports import router as reports_router
from .exports import router as exports_router

# Combined router that includes all sub-routers
from fastapi import APIRouter

router = APIRouter()
router.include_router(modules_router)
router.include_router(sequences_router)
router.include_router(scheduled_actions_router)
router.include_router(record_rules_router)
router.include_router(automation_router)
router.include_router(module_technical_router)
router.include_router(schema_router)
router.include_router(config_router)
router.include_router(translations_router)
router.include_router(workflows_router)
router.include_router(remote_modules_router)
router.include_router(reports_router)
router.include_router(exports_router)

__all__ = [
    "router",
    "modules_router",
    "sequences_router",
    "scheduled_actions_router",
    "record_rules_router",
    "automation_router",
    "module_technical_router",
    "schema_router",
    "config_router",
    "translations_router",
    "workflows_router",
    "remote_modules_router",
    "reports_router",
    "exports_router",
]
