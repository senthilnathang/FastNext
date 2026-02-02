"""
Recruitment API Routes
"""

from fastapi import APIRouter

from .recruitment import router as recruitment_router
from .candidate import router as candidate_router
from .interview import router as interview_router
from .talent_pool import router as talent_pool_router
from .job_offer import router as job_offer_router
from .linkedin import router as linkedin_router
from .dei import router as dei_router
from .analytics import router as analytics_router
from .alerts import router as alerts_router
from .automation import router as automation_router
from .scoring import router as scoring_router

router = APIRouter(tags=["Recruitment"])  # No prefix - module loader adds /api/v1/recruitment

# Include all routers with their prefixes
router.include_router(recruitment_router)
router.include_router(candidate_router, prefix="/candidates", tags=["Candidates"])
router.include_router(interview_router, prefix="/interviews", tags=["Interviews"])
router.include_router(talent_pool_router, prefix="/talent-pools", tags=["Talent Pool"])
router.include_router(job_offer_router, prefix="/offers", tags=["Job Offers"])
router.include_router(linkedin_router, prefix="/linkedin", tags=["Recruitment - LinkedIn"])
router.include_router(dei_router, prefix="/dei", tags=["Recruitment - DEI"])
router.include_router(analytics_router, prefix="/analytics", tags=["Recruitment - Analytics"])
router.include_router(alerts_router, prefix="/job-alerts", tags=["Recruitment - Job Alerts"])
router.include_router(automation_router, prefix="/automation", tags=["Recruitment - Automation"])
router.include_router(scoring_router, prefix="/scoring", tags=["Recruitment - Scoring"])
