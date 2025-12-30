"""
Audit trail logging utilities.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.activity_log import ActivityCategory, ActivityLevel, ActivityLog


def log_audit_trail(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    description: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[List[str]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
    request_method: Optional[str] = None,
    request_path: Optional[str] = None,
) -> ActivityLog:
    """
    Log an audit trail entry for compliance and tracking.

    Args:
        db: Database session
        action: Action performed
        entity_type: Type of entity affected
        entity_id: ID of the entity
        user_id: ID of the user performing the action
        company_id: Company context
        description: Description of the change
        old_values: Previous values
        new_values: New values
        changed_fields: List of fields that changed
        ip_address: Client IP address
        user_agent: Client user agent
        request_id: Request correlation ID
        request_method: HTTP method
        request_path: Request path

    Returns:
        The created ActivityLog entry
    """
    return ActivityLog.log(
        db=db,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        company_id=company_id,
        category=ActivityCategory.DATA_MANAGEMENT,
        level=ActivityLevel.INFO,
        description=description,
        old_values=old_values,
        new_values=new_values,
        changed_fields=changed_fields,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
        request_method=request_method,
        request_path=request_path,
    )
