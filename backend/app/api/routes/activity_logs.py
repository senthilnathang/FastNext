from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog, ActivityAction, ActivityLevel
from app.schemas.activity_log import (
    ActivityLogResponse, ActivityLogCreate, ActivityLogUpdate, 
    ActivityLogFilter, ActivityLogStats
)
from app.utils.activity_logger import log_activity
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/", response_model=List[ActivityLogResponse])
def get_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records to return"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[ActivityAction] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    level: Optional[ActivityLevel] = Query(None, description="Filter by level"),
    start_date: Optional[datetime] = Query(None, description="Filter from date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="Filter to date (ISO format)"),
    search: Optional[str] = Query(None, description="Search in description"),
) -> Any:
    """Get activity logs with filtering"""
    
    # Base query - users can only see their own activity logs unless they're admin
    query = db.query(ActivityLog)
    
    # For non-admin users, restrict to their own activities
    if not current_user.is_superuser:
        query = query.filter(ActivityLog.user_id == current_user.id)
    elif user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)
    
    # Apply filters
    if action is not None:
        query = query.filter(ActivityLog.action == action)
    
    if entity_type is not None:
        query = query.filter(ActivityLog.entity_type == entity_type)
    
    if entity_id is not None:
        query = query.filter(ActivityLog.entity_id == entity_id)
    
    if level is not None:
        query = query.filter(ActivityLog.level == level)
    
    if start_date is not None:
        query = query.filter(ActivityLog.created_at >= start_date)
    
    if end_date is not None:
        query = query.filter(ActivityLog.created_at <= end_date)
    
    if search is not None:
        query = query.filter(
            or_(
                ActivityLog.description.ilike(f"%{search}%"),
                ActivityLog.entity_name.ilike(f"%{search}%")
            )
        )
    
    # Order by most recent first
    query = query.order_by(desc(ActivityLog.created_at))
    
    # Apply pagination
    activities = query.offset(skip).limit(limit).all()
    
    # Log this activity (viewing logs)
    log_activity(
        db=db,
        user_id=current_user.id,
        action=ActivityAction.READ,
        entity_type="activity_log",
        entity_id=None,
        entity_name="activity_logs",
        description=f"Viewed activity logs (skip={skip}, limit={limit})",
        level=ActivityLevel.INFO
    )
    
    return activities


@router.get("/me", response_model=List[ActivityLogResponse])
def get_my_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
) -> Any:
    """Get current user's activity logs for the specified number of days"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    activities = db.query(ActivityLog).filter(
        and_(
            ActivityLog.user_id == current_user.id,
            ActivityLog.created_at >= start_date
        )
    ).order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit).all()
    
    return activities


@router.get("/{activity_id}", response_model=ActivityLogResponse)
def get_activity_log(
    *,
    db: Session = Depends(get_db),
    activity_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a specific activity log by ID"""
    
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity log not found"
        )
    
    # Users can only see their own activity logs unless they're admin
    if not current_user.is_superuser and activity.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return activity


@router.post("/", response_model=ActivityLogResponse)
def create_activity_log(
    *,
    db: Session = Depends(get_db),
    activity_in: ActivityLogCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a new activity log entry"""
    
    # Only admins can create activity logs manually
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create activity logs"
        )
    
    try:
        activity_log = ActivityLog(**activity_in.dict())
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        
        return activity_log
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create activity log: {str(e)}"
        )


@router.put("/{activity_id}", response_model=ActivityLogResponse)
def update_activity_log(
    *,
    db: Session = Depends(get_db),
    activity_id: int,
    activity_in: ActivityLogUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update an activity log entry"""
    
    # Only admins can update activity logs
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update activity logs"
        )
    
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity log not found"
        )
    
    try:
        update_data = activity_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(activity, field, value)
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        return activity
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update activity log: {str(e)}"
        )


@router.delete("/{activity_id}")
def delete_activity_log(
    *,
    db: Session = Depends(get_db),
    activity_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete an activity log entry"""
    
    # Only admins can delete activity logs
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete activity logs"
        )
    
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity log not found"
        )
    
    try:
        db.delete(activity)
        db.commit()
        
        return {"message": "Activity log deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete activity log: {str(e)}"
        )


@router.get("/stats/summary", response_model=ActivityLogStats)
def get_activity_log_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    user_id: Optional[int] = Query(None, description="Filter by user ID (admin only)"),
) -> Any:
    """Get activity log statistics"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    query = db.query(ActivityLog).filter(ActivityLog.created_at >= start_date)
    
    # Apply user filter
    if not current_user.is_superuser:
        query = query.filter(ActivityLog.user_id == current_user.id)
    elif user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)
    
    activities = query.all()
    
    # Calculate statistics
    total_activities = len(activities)
    
    activities_by_action = {}
    activities_by_level = {}
    activities_by_entity_type = {}
    unique_users = set()
    earliest_date = None
    latest_date = None
    
    for activity in activities:
        # Count by action
        action_key = activity.action.value if activity.action else "unknown"
        activities_by_action[action_key] = activities_by_action.get(action_key, 0) + 1
        
        # Count by level
        level_key = activity.level.value if activity.level else "unknown"
        activities_by_level[level_key] = activities_by_level.get(level_key, 0) + 1
        
        # Count by entity type
        entity_key = activity.entity_type or "unknown"
        activities_by_entity_type[entity_key] = activities_by_entity_type.get(entity_key, 0) + 1
        
        # Track unique users
        if activity.user_id:
            unique_users.add(activity.user_id)
        
        # Track date range
        if activity.created_at:
            if earliest_date is None or activity.created_at < earliest_date:
                earliest_date = activity.created_at
            if latest_date is None or activity.created_at > latest_date:
                latest_date = activity.created_at
    
    return ActivityLogStats(
        total_activities=total_activities,
        activities_by_action=activities_by_action,
        activities_by_level=activities_by_level,
        activities_by_entity_type=activities_by_entity_type,
        unique_users=len(unique_users),
        date_range={
            "earliest": earliest_date,
            "latest": latest_date
        }
    )


@router.delete("/bulk")
def bulk_delete_activity_logs(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    older_than_days: int = Query(..., ge=1, description="Delete logs older than this many days"),
    level: Optional[ActivityLevel] = Query(None, description="Only delete logs of this level"),
    entity_type: Optional[str] = Query(None, description="Only delete logs of this entity type"),
) -> Any:
    """Bulk delete activity logs based on criteria"""
    
    # Only admins can bulk delete
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for bulk operations"
        )
    
    cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
    
    # Build delete query
    query = db.query(ActivityLog).filter(ActivityLog.created_at < cutoff_date)
    
    if level is not None:
        query = query.filter(ActivityLog.level == level)
    
    if entity_type is not None:
        query = query.filter(ActivityLog.entity_type == entity_type)
    
    try:
        # Count records to be deleted
        count = query.count()
        
        # Delete the records
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        
        # Log this bulk operation
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.DELETE,
            entity_type="activity_log",
            entity_id=None,
            entity_name="bulk_delete",
            description=f"Bulk deleted {deleted_count} activity logs older than {older_than_days} days",
            level=ActivityLevel.WARNING
        )
        
        return {"message": f"Successfully deleted {deleted_count} activity logs"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk delete activity logs: {str(e)}"
        )