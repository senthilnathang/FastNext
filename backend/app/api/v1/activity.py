"""Activity Log API endpoints"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.api.deps.auth import PermissionChecker
from app.models import User
from app.models.activity_log import ActivityLog, ActivityCategory, ActivityLevel

router = APIRouter()


# Schemas
class ActivityLogResponse(BaseModel):
    """Activity log response schema"""
    id: int
    event_id: str
    action: str
    category: Optional[str] = None
    level: Optional[str] = None
    entity_type: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    ip_address: Optional[str] = None
    success: bool
    created_at: str
    user: Optional[dict] = None

    class Config:
        from_attributes = True


class ActivityLogList(BaseModel):
    """Paginated activity log list"""
    total: int
    items: List[ActivityLogResponse]
    page: int = 1
    page_size: int = 20


# Endpoints
@router.get("/", response_model=ActivityLogList)
def list_activity_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    category: Optional[str] = None,
    level: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List activity logs with filters"""
    query = db.query(ActivityLog)

    # Apply filters
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(ActivityLog.entity_id == entity_id)
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if action:
        query = query.filter(ActivityLog.action == action)
    if category:
        query = query.filter(ActivityLog.category == category)
    if level:
        query = query.filter(ActivityLog.level == level)

    # Non-superusers can only see activities in their company
    if not current_user.is_superuser:
        query = query.filter(ActivityLog.company_id == current_user.current_company_id)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(page_size).all()

    # Format response
    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "event_id": log.event_id,
            "action": log.action,
            "category": log.category.value if log.category else None,
            "level": log.level.value if log.level else None,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "description": log.description,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "ip_address": log.ip_address,
            "success": log.success,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "user": None,
        }

        # Add user info if available
        if log.user:
            log_dict["user"] = {
                "id": log.user.id,
                "full_name": log.user.full_name,
                "avatar_url": log.user.avatar_url,
            }

        items.append(ActivityLogResponse(**log_dict))

    return ActivityLogList(
        total=total,
        items=items,
        page=page,
        page_size=page_size,
    )


@router.get("/{activity_id}", response_model=ActivityLogResponse)
def get_activity_log(
    activity_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific activity log entry"""
    log = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity log not found",
        )

    # Check access
    if not current_user.is_superuser and log.company_id != current_user.current_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    log_dict = {
        "id": log.id,
        "event_id": log.event_id,
        "action": log.action,
        "category": log.category.value if log.category else None,
        "level": log.level.value if log.level else None,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "entity_name": log.entity_name,
        "description": log.description,
        "user_id": log.user_id,
        "company_id": log.company_id,
        "ip_address": log.ip_address,
        "success": log.success,
        "created_at": log.created_at.isoformat() if log.created_at else None,
        "user": None,
    }

    if log.user:
        log_dict["user"] = {
            "id": log.user.id,
            "full_name": log.user.full_name,
            "avatar_url": log.user.avatar_url,
        }

    return ActivityLogResponse(**log_dict)


@router.get("/entity/{entity_type}/{entity_id}", response_model=List[ActivityLogResponse])
def get_entity_activities(
    entity_type: str,
    entity_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all activities for a specific entity"""
    logs = ActivityLog.get_entity_activities(db, entity_type, entity_id, limit)

    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "event_id": log.event_id,
            "action": log.action,
            "category": log.category.value if log.category else None,
            "level": log.level.value if log.level else None,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "description": log.description,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "ip_address": log.ip_address,
            "success": log.success,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "user": None,
        }

        if log.user:
            log_dict["user"] = {
                "id": log.user.id,
                "full_name": log.user.full_name,
                "avatar_url": log.user.avatar_url,
            }

        items.append(ActivityLogResponse(**log_dict))

    return items


@router.get("/user/{user_id}", response_model=List[ActivityLogResponse])
def get_user_activities(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all activities for a specific user"""
    # Users can only view their own activities unless superuser
    if not current_user.is_superuser and user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other users' activities",
        )

    logs = ActivityLog.get_user_activities(db, user_id, limit, action=action)

    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "event_id": log.event_id,
            "action": log.action,
            "category": log.category.value if log.category else None,
            "level": log.level.value if log.level else None,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "description": log.description,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "ip_address": log.ip_address,
            "success": log.success,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "user": None,
        }

        if log.user:
            log_dict["user"] = {
                "id": log.user.id,
                "full_name": log.user.full_name,
                "avatar_url": log.user.avatar_url,
            }

        items.append(ActivityLogResponse(**log_dict))

    return items
