from typing import Optional
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog, ActivityAction, ActivityLevel, EventCategory
import json


def log_activity(
    db: Session,
    user_id: Optional[int],
    action: ActivityAction,
    entity_type: str,
    entity_id: Optional[int],
    entity_name: Optional[str],
    description: str,
    level: ActivityLevel = ActivityLevel.INFO,
    category: EventCategory = EventCategory.USER_MANAGEMENT,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_method: Optional[str] = None,
    request_path: Optional[str] = None,
    status_code: Optional[int] = None,
    extra_data: Optional[dict] = None
) -> ActivityLog:
    """Log an activity to the activity log table"""
    
    activity_log = ActivityLog(
        user_id=user_id,
        category=category,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_name=entity_name,
        description=description,
        level=level,
        ip_address=ip_address,
        user_agent=user_agent,
        request_method=request_method,
        request_path=request_path,
        status_code=status_code,
        event_metadata=extra_data
    )
    
    try:
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        return activity_log
    except Exception as e:
        db.rollback()
        raise e


def log_user_login(
    db: Session,
    user_id: int,
    username: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True
) -> ActivityLog:
    """Log user login activity"""
    
    action = ActivityAction.LOGIN
    level = ActivityLevel.INFO if success else ActivityLevel.WARNING
    description = f"User {username} logged in successfully" if success else f"Failed login attempt for user {username}"
    
    return log_activity(
        db=db,
        user_id=user_id if success else None,
        action=action,
        entity_type="auth",
        entity_id=user_id,
        entity_name=username,
        description=description,
        level=level,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data={"success": success}
    )


def log_user_logout(
    db: Session,
    user_id: int,
    username: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> ActivityLog:
    """Log user logout activity"""
    
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActivityAction.LOGOUT,
        entity_type="auth",
        entity_id=user_id,
        entity_name=username,
        description=f"User {username} logged out",
        level=ActivityLevel.INFO,
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_permission_change(
    db: Session,
    user_id: int,
    target_user_id: int,
    target_username: str,
    permission_details: str,
    ip_address: Optional[str] = None
) -> ActivityLog:
    """Log permission change activity"""
    
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActivityAction.PERMISSION_CHANGE,
        entity_type="permission",
        entity_id=target_user_id,
        entity_name=target_username,
        description=f"Permission changed: {permission_details}",
        level=ActivityLevel.WARNING,
        ip_address=ip_address,
        extra_data={"permission_details": permission_details}
    )


def log_data_export(
    db: Session,
    user_id: int,
    export_type: str,
    entity_count: int,
    ip_address: Optional[str] = None
) -> ActivityLog:
    """Log data export activity"""
    
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActivityAction.EXPORT,
        entity_type="data",
        entity_id=user_id,
        entity_name=f"{export_type}_export",
        description=f"Exported {entity_count} {export_type} records",
        level=ActivityLevel.INFO,
        ip_address=ip_address,
        extra_data={
            "export_type": export_type,
            "entity_count": entity_count
        }
    )


def log_security_event(
    db: Session,
    user_id: Optional[int],
    event_type: str,
    description: str,
    level: ActivityLevel = ActivityLevel.WARNING,
    ip_address: Optional[str] = None,
    extra_data: Optional[dict] = None
) -> ActivityLog:
    """Log security-related events"""
    
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActivityAction.UPDATE,  # Generic action for security events
        entity_type="security",
        entity_id=user_id,
        entity_name=event_type,
        description=description,
        level=level,
        ip_address=ip_address,
        extra_data=extra_data
    )