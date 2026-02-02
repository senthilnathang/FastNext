"""
Employee General Settings API Routes
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import EmployeeGeneralSetting
from ..schemas.settings import (
    EmployeeGeneralSettingUpdate, EmployeeGeneralSettingResponse
)

router = APIRouter(tags=["Employee Settings"])


@router.get("/", response_model=EmployeeGeneralSettingResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get employee general settings for the current company."""
    settings = db.query(EmployeeGeneralSetting).filter(
        EmployeeGeneralSetting.company_id == current_user.current_company_id
    ).first()

    if not settings:
        # Create default settings
        settings = EmployeeGeneralSetting(
            badge_id_prefix="EMP-",
            company_id=current_user.current_company_id,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/", response_model=EmployeeGeneralSettingResponse)
def update_settings(
    data: EmployeeGeneralSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update employee general settings."""
    settings = db.query(EmployeeGeneralSetting).filter(
        EmployeeGeneralSetting.company_id == current_user.current_company_id
    ).first()

    if not settings:
        # Create settings
        settings = EmployeeGeneralSetting(
            badge_id_prefix=data.badge_id_prefix or "EMP-",
            company_id=current_user.current_company_id,
        )
        db.add(settings)
    else:
        if data.badge_id_prefix is not None:
            settings.badge_id_prefix = data.badge_id_prefix

    db.commit()
    db.refresh(settings)
    return settings
