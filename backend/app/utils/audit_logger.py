import json
from typing import Optional

from app.models.audit_trail import AuditTrail
from sqlalchemy.orm import Session


def log_audit_trail(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    entity_name: Optional[str],
    operation: str,
    old_values: Optional[str] = None,
    new_values: Optional[str] = None,
    changed_fields: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    session_id: Optional[str] = None,
    reason: Optional[str] = None,
    extra_data: Optional[dict] = None,
) -> AuditTrail:
    """Log an audit trail entry"""

    audit_entry = AuditTrail(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        operation=operation,
        old_values=old_values,
        new_values=new_values,
        changed_fields=changed_fields,
        ip_address=ip_address,
        user_agent=user_agent,
        session_id=session_id,
        reason=reason,
        extra_data=json.dumps(extra_data) if extra_data else None,
    )

    try:
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        db.rollback()
        raise e


def log_create_audit(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    entity_name: Optional[str],
    new_values: dict,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
) -> AuditTrail:
    """Log audit trail for entity creation"""

    return log_audit_trail(
        db=db,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        operation="INSERT",
        new_values=json.dumps(new_values),
        ip_address=ip_address,
        reason=reason,
    )


def log_update_audit(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    entity_name: Optional[str],
    old_values: dict,
    new_values: dict,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
) -> AuditTrail:
    """Log audit trail for entity updates"""

    # Determine changed fields
    changed_fields = []
    for key in new_values:
        if key in old_values and old_values[key] != new_values[key]:
            changed_fields.append(key)
        elif key not in old_values:
            changed_fields.append(key)

    return log_audit_trail(
        db=db,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        operation="UPDATE",
        old_values=json.dumps(old_values),
        new_values=json.dumps(new_values),
        changed_fields=json.dumps(changed_fields),
        ip_address=ip_address,
        reason=reason,
    )


def log_delete_audit(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    entity_name: Optional[str],
    old_values: dict,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
) -> AuditTrail:
    """Log audit trail for entity deletion"""

    return log_audit_trail(
        db=db,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        operation="DELETE",
        old_values=json.dumps(old_values),
        ip_address=ip_address,
        reason=reason,
    )


def compare_values(old_data: dict, new_data: dict) -> tuple[dict, list[str]]:
    """
    Compare old and new data dictionaries and return changes

    Returns:
        tuple: (changes_dict, changed_fields_list)
    """
    changes = {}
    changed_fields = []

    # Check for modified and added fields
    for key, new_value in new_data.items():
        old_value = old_data.get(key)
        if old_value != new_value:
            changes[key] = {
                "old": old_value,
                "new": new_value,
                "action": "modified" if key in old_data else "added",
            }
            changed_fields.append(key)

    # Check for removed fields
    for key, old_value in old_data.items():
        if key not in new_data:
            changes[key] = {"old": old_value, "new": None, "action": "removed"}
            changed_fields.append(key)

    return changes, changed_fields


def log_bulk_operation_audit(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    operation: str,
    entity_ids: list[int],
    summary: str,
    ip_address: Optional[str] = None,
    extra_data: Optional[dict] = None,
) -> AuditTrail:
    """Log audit trail for bulk operations"""

    bulk_extra_data = {
        "entity_ids": entity_ids,
        "entity_count": len(entity_ids),
        "summary": summary,
    }

    if extra_data:
        bulk_extra_data.update(extra_data)

    return log_audit_trail(
        db=db,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=0,  # Use 0 for bulk operations
        entity_name=f"bulk_{operation.lower()}",
        operation=f"BULK_{operation.upper()}",
        ip_address=ip_address,
        extra_data=bulk_extra_data,
    )
