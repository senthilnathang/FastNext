"""
Job Alerts API Routes

CRUD operations for job alert subscriptions and notifications.
"""

import secrets
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import JobAlert, SavedJob
from ..models.recruitment import Recruitment
from ..schemas.advanced import (
    JobAlertCreate,
    JobAlertUpdate,
    JobAlertResponse,
    JobAlertList,
    SavedJobCreate,
    SavedJobUpdate,
    SavedJobResponse,
    SavedJobList,
)

router = APIRouter(tags=["Recruitment - Job Alerts"])


# =============================================================================
# Job Alerts
# =============================================================================

@router.get("/alerts", response_model=JobAlertList)
def list_job_alerts(
    is_active: Optional[bool] = None,
    verified: Optional[bool] = None,
    frequency: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all job alert subscriptions (admin view)."""
    query = select(JobAlert)

    if is_active is not None:
        query = query.where(JobAlert.is_active == is_active)
    if verified is not None:
        query = query.where(JobAlert.verified == verified)
    if frequency:
        query = query.where(JobAlert.frequency == frequency)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items with pagination
    query = query.order_by(JobAlert.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    return JobAlertList(
        items=[JobAlertResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/alerts/{alert_id}", response_model=JobAlertResponse)
def get_job_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a job alert by ID."""
    alert = db.execute(
        select(JobAlert).where(JobAlert.id == alert_id)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job alert not found"
        )

    return JobAlertResponse.model_validate(alert)


@router.post("/alerts", response_model=JobAlertResponse, status_code=status.HTTP_201_CREATED)
def create_job_alert(
    data: JobAlertCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new job alert subscription.

    This endpoint is public - candidates can subscribe without authentication.
    """
    # Check if email already has an active subscription
    existing = db.execute(
        select(JobAlert).where(
            JobAlert.email == data.email,
            JobAlert.is_active == True,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active job alert subscription already exists for this email"
        )

    # Generate verification and unsubscribe tokens
    verification_token = secrets.token_urlsafe(32)
    unsubscribe_token = secrets.token_urlsafe(32)

    alert = JobAlert(
        email=data.email,
        name=data.name,
        employment_types=data.employment_types,
        locations=data.locations,
        keywords=data.keywords,
        remote_only=data.remote_only,
        min_salary=data.min_salary,
        experience_level=data.experience_level,
        frequency=data.frequency,
        verification_token=verification_token,
        unsubscribe_token=unsubscribe_token,
        verified=False,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # TODO: Send verification email with verification_token

    return JobAlertResponse.model_validate(alert)


@router.put("/alerts/{alert_id}", response_model=JobAlertResponse)
def update_job_alert(
    alert_id: int,
    data: JobAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a job alert subscription."""
    alert = db.execute(
        select(JobAlert).where(JobAlert.id == alert_id)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job alert not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)

    db.commit()
    db.refresh(alert)

    return JobAlertResponse.model_validate(alert)


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a job alert subscription (hard delete)."""
    alert = db.execute(
        select(JobAlert).where(JobAlert.id == alert_id)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job alert not found"
        )

    db.delete(alert)
    db.commit()


@router.post("/alerts/verify/{token}")
def verify_job_alert(
    token: str,
    db: Session = Depends(get_db),
):
    """Verify a job alert subscription using the verification token."""
    alert = db.execute(
        select(JobAlert).where(
            JobAlert.verification_token == token,
            JobAlert.is_active == True,
        )
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired verification token"
        )

    if alert.verified:
        return {"message": "Email already verified", "verified": True}

    alert.verified = True
    alert.verification_token = None  # Clear token after verification
    db.commit()

    return {"message": "Email verified successfully", "verified": True}


@router.post("/alerts/unsubscribe/{token}")
def unsubscribe_job_alert(
    token: str,
    db: Session = Depends(get_db),
):
    """Unsubscribe from job alerts using the unsubscribe token."""
    alert = db.execute(
        select(JobAlert).where(
            JobAlert.unsubscribe_token == token,
        )
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid unsubscribe token"
        )

    alert.is_active = False
    db.commit()

    return {"message": "Successfully unsubscribed from job alerts", "unsubscribed": True}


@router.get("/alerts/by-email/{email}", response_model=JobAlertResponse)
def get_alert_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a job alert by email address (admin view)."""
    alert = db.execute(
        select(JobAlert).where(JobAlert.email == email)
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No job alert found for this email"
        )

    return JobAlertResponse.model_validate(alert)


@router.post("/alerts/{alert_id}/resend-verification")
def resend_verification(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resend verification email for a job alert."""
    alert = db.execute(
        select(JobAlert).where(
            JobAlert.id == alert_id,
            JobAlert.is_active == True,
        )
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job alert not found"
        )

    if alert.verified:
        return {"message": "Email already verified", "sent": False}

    # Generate new verification token
    alert.verification_token = secrets.token_urlsafe(32)
    db.commit()

    # TODO: Send verification email

    return {"message": "Verification email sent", "sent": True, "email": alert.email}


# =============================================================================
# Saved Jobs
# =============================================================================

@router.get("/saved-jobs", response_model=SavedJobList)
def list_saved_jobs(
    email: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved jobs (admin view or filtered by email)."""
    query = select(SavedJob)

    if email:
        query = query.where(SavedJob.email == email)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items
    query = query.order_by(SavedJob.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    # Enrich with recruitment data
    response_items = []
    for item in items:
        item_response = SavedJobResponse.model_validate(item)
        if item.recruitment:
            item_response.recruitment_title = item.recruitment.title
        response_items.append(item_response)

    return SavedJobList(
        items=response_items,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/saved-jobs/by-email/{email}", response_model=SavedJobList)
def get_saved_jobs_by_email(
    email: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get saved jobs for a specific email.

    This endpoint can be public for candidates to view their saved jobs.
    """
    query = select(SavedJob).where(SavedJob.email == email)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items
    query = query.order_by(SavedJob.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    # Enrich with recruitment data
    response_items = []
    for item in items:
        item_response = SavedJobResponse.model_validate(item)
        if item.recruitment:
            item_response.recruitment_title = item.recruitment.title
        response_items.append(item_response)

    return SavedJobList(
        items=response_items,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.post("/saved-jobs", response_model=SavedJobResponse, status_code=status.HTTP_201_CREATED)
def save_job(
    data: SavedJobCreate,
    db: Session = Depends(get_db),
):
    """
    Save a job for later (bookmark).

    This endpoint is public - candidates can save jobs without authentication.
    """
    # Check if already saved
    existing = db.execute(
        select(SavedJob).where(
            SavedJob.email == data.email,
            SavedJob.recruitment_id == data.recruitment_id,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is already saved"
        )

    # Verify recruitment exists
    recruitment = db.execute(
        select(Recruitment).where(
            Recruitment.id == data.recruitment_id,
            Recruitment.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    saved_job = SavedJob(
        email=data.email,
        recruitment_id=data.recruitment_id,
        notes=data.notes,
    )
    db.add(saved_job)
    db.commit()
    db.refresh(saved_job)

    response = SavedJobResponse.model_validate(saved_job)
    response.recruitment_title = recruitment.title

    return response


@router.put("/saved-jobs/{saved_job_id}", response_model=SavedJobResponse)
def update_saved_job(
    saved_job_id: int,
    data: SavedJobUpdate,
    db: Session = Depends(get_db),
):
    """Update notes on a saved job."""
    saved_job = db.execute(
        select(SavedJob).where(SavedJob.id == saved_job_id)
    ).scalar_one_or_none()

    if not saved_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved job not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(saved_job, field, value)

    db.commit()
    db.refresh(saved_job)

    response = SavedJobResponse.model_validate(saved_job)
    if saved_job.recruitment:
        response.recruitment_title = saved_job.recruitment.title

    return response


@router.delete("/saved-jobs/{saved_job_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_job(
    saved_job_id: int,
    db: Session = Depends(get_db),
):
    """Remove a saved job (un-bookmark)."""
    saved_job = db.execute(
        select(SavedJob).where(SavedJob.id == saved_job_id)
    ).scalar_one_or_none()

    if not saved_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved job not found"
        )

    db.delete(saved_job)
    db.commit()


@router.delete("/saved-jobs/by-email-job")
def unsave_job_by_email(
    email: str = Query(..., description="Email address"),
    recruitment_id: int = Query(..., description="Recruitment ID"),
    db: Session = Depends(get_db),
):
    """Remove a saved job by email and recruitment ID."""
    saved_job = db.execute(
        select(SavedJob).where(
            SavedJob.email == email,
            SavedJob.recruitment_id == recruitment_id,
        )
    ).scalar_one_or_none()

    if not saved_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved job not found"
        )

    db.delete(saved_job)
    db.commit()

    return {"message": "Job removed from saved list", "removed": True}
