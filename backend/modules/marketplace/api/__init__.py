"""
Marketplace API

All API endpoints for the FastVue Marketplace.
"""

from fastapi import APIRouter

from .modules import router as modules_router
from .licenses import router as licenses_router
from .reviews import router as reviews_router
from .analytics import router as analytics_router
from .security import router as security_router
from .payouts import router as payouts_router
from .subscriptions import router as subscriptions_router

# Combined router
router = APIRouter(prefix="/marketplace")
router.include_router(modules_router)
router.include_router(licenses_router)
router.include_router(reviews_router, tags=["Marketplace Reviews"])
router.include_router(analytics_router, prefix="/analytics", tags=["Marketplace Analytics"])
router.include_router(security_router)
router.include_router(payouts_router)
router.include_router(subscriptions_router)

__all__ = [
    "router",
    "modules_router",
    "licenses_router",
    "reviews_router",
    "analytics_router",
    "security_router",
    "payouts_router",
    "subscriptions_router",
]
