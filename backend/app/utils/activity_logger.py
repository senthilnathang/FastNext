"""
Activity logging utilities for security and audit purposes.
"""

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.activity_log import ActivityCategory, ActivityLevel, ActivityLog


def log_activity(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    entity_name: Optional[str] = None,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    description: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    level: ActivityLevel = ActivityLevel.INFO,
    category: ActivityCategory = ActivityCategory.DATA_MANAGEMENT,
) -> ActivityLog:
    """
    Log an activity entry.

    Args:
        db: Database session
        action: Action performed (e.g., "create", "update", "delete")
        entity_type: Type of entity affected
        entity_id: ID of the entity
        entity_name: Name of the entity
        user_id: ID of the user performing the action
        company_id: ID of the company context
        description: Description of the activity
        old_values: Previous values (for updates)
        new_values: New values (for updates)
        ip_address: Client IP address
        user_agent: Client user agent
        extra_data: Additional metadata
        level: Activity level (INFO, WARNING, etc.)
        category: Activity category

    Returns:
        The created ActivityLog entry
    """
    return ActivityLog.log(
        db=db,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        user_id=user_id,
        company_id=company_id,
        category=category,
        level=level,
        description=description,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data=extra_data,
    )


def log_security_event(
    db: Session,
    user_id: Optional[int],
    event_type: str,
    description: str,
    level: ActivityLevel = ActivityLevel.INFO,
    extra_data: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    company_id: Optional[int] = None,
) -> ActivityLog:
    """
    Log a security-related event.

    Args:
        db: Database session
        user_id: ID of the user involved (if any)
        event_type: Type of security event
        description: Description of the event
        level: Severity level
        extra_data: Additional event details
        ip_address: Client IP address
        user_agent: Client user agent
        company_id: Company context (if any)

    Returns:
        The created ActivityLog entry
    """
    return ActivityLog.log(
        db=db,
        action=event_type,
        entity_type="security",
        user_id=user_id,
        company_id=company_id,
        category=ActivityCategory.SECURITY,
        level=level,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data=extra_data,
    )
