from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.audit_trail import AuditTrail
from app.schemas.audit_trail import (
    AuditTrailResponse, AuditTrailCreate, AuditTrailUpdate, 
    AuditTrailFilter, AuditTrailStats, AuditTrailComparison
)
from app.utils.activity_logger import log_activity
from app.models.activity_log import ActivityAction, ActivityLevel
from datetime import datetime, timedelta
import json

router = APIRouter()


@router.get("", response_model=List[AuditTrailResponse])
@router.get("/", response_model=List[AuditTrailResponse])
def get_audit_trails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records to return"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    operation: Optional[str] = Query(None, description="Filter by operation (INSERT, UPDATE, DELETE)"),
    start_date: Optional[datetime] = Query(None, description="Filter from date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="Filter to date (ISO format)"),
    changed_fields_contain: Optional[str] = Query(None, description="Filter by field name in changed fields"),
) -> Any:
    """Get audit trails with filtering"""
    
    # Only admins can view audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trails"
        )
    
    # Base query
    query = db.query(AuditTrail)
    
    # Apply filters
    if user_id is not None:
        query = query.filter(AuditTrail.user_id == user_id)
    
    if entity_type is not None:
        query = query.filter(AuditTrail.entity_type == entity_type)
    
    if entity_id is not None:
        query = query.filter(AuditTrail.entity_id == entity_id)
    
    if operation is not None:
        query = query.filter(AuditTrail.operation == operation.upper())
    
    if start_date is not None:
        query = query.filter(AuditTrail.created_at >= start_date)
    
    if end_date is not None:
        query = query.filter(AuditTrail.created_at <= end_date)
    
    if changed_fields_contain is not None:
        query = query.filter(AuditTrail.changed_fields.ilike(f"%{changed_fields_contain}%"))
    
    # Order by most recent first
    query = query.order_by(desc(AuditTrail.created_at))
    
    # Apply pagination
    audit_trails = query.offset(skip).limit(limit).all()
    
    # Log this activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action=ActivityAction.READ,
        entity_type="audit_trail",
        entity_id=None,
        entity_name="audit_trails",
        description=f"Viewed audit trails (skip={skip}, limit={limit})",
        level=ActivityLevel.INFO
    )
    
    return audit_trails


@router.get("/entity/{entity_type}/{entity_id}", response_model=List[AuditTrailResponse])
def get_entity_audit_history(
    *,
    db: Session = Depends(get_db),
    entity_type: str,
    entity_id: int,
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
) -> Any:
    """Get audit history for a specific entity"""
    
    # Only admins can view audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trails"
        )
    
    audit_trails = db.query(AuditTrail).filter(
        and_(
            AuditTrail.entity_type == entity_type,
            AuditTrail.entity_id == entity_id
        )
    ).order_by(desc(AuditTrail.created_at)).offset(skip).limit(limit).all()
    
    return audit_trails


@router.get("/{audit_id}", response_model=AuditTrailResponse)
def get_audit_trail(
    *,
    db: Session = Depends(get_db),
    audit_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a specific audit trail by ID"""
    
    # Only admins can view audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trails"
        )
    
    audit_trail = db.query(AuditTrail).filter(AuditTrail.id == audit_id).first()
    
    if not audit_trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit trail not found"
        )
    
    return audit_trail


@router.get("/{audit_id}/comparison", response_model=List[AuditTrailComparison])
def get_audit_trail_comparison(
    *,
    db: Session = Depends(get_db),
    audit_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a structured comparison of old vs new values for an audit trail"""
    
    # Only admins can view audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trails"
        )
    
    audit_trail = db.query(AuditTrail).filter(AuditTrail.id == audit_id).first()
    
    if not audit_trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit trail not found"
        )
    
    comparisons = []
    
    try:
        old_values = json.loads(audit_trail.old_values) if audit_trail.old_values else {}
        new_values = json.loads(audit_trail.new_values) if audit_trail.new_values else {}
        changed_fields = json.loads(audit_trail.changed_fields) if audit_trail.changed_fields else []
        
        for field in changed_fields:
            old_value = old_values.get(field)
            new_value = new_values.get(field)
            
            # Determine change type
            change_type = "modified"
            if field not in old_values:
                change_type = "added"
            elif field not in new_values:
                change_type = "removed"
            
            comparisons.append(AuditTrailComparison(
                field_name=field,
                old_value=old_value,
                new_value=new_value,
                change_type=change_type
            ))
        
        return comparisons
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse audit trail data"
        )


@router.post("", response_model=AuditTrailResponse)
@router.post("/", response_model=AuditTrailResponse)
def create_audit_trail(
    *,
    db: Session = Depends(get_db),
    audit_in: AuditTrailCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a new audit trail entry"""
    
    # Only admins can create audit trails manually
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create audit trails"
        )
    
    try:
        audit_trail = AuditTrail(**audit_in.dict())
        db.add(audit_trail)
        db.commit()
        db.refresh(audit_trail)
        
        return audit_trail
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create audit trail: {str(e)}"
        )


@router.put("/{audit_id}", response_model=AuditTrailResponse)
def update_audit_trail(
    *,
    db: Session = Depends(get_db),
    audit_id: int,
    audit_in: AuditTrailUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update an audit trail entry (limited fields only)"""
    
    # Only admins can update audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update audit trails"
        )
    
    audit_trail = db.query(AuditTrail).filter(AuditTrail.id == audit_id).first()
    
    if not audit_trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit trail not found"
        )
    
    try:
        # Only allow updating reason and metadata for compliance purposes
        update_data = audit_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in ['reason', 'metadata']:  # Only these fields can be updated
                setattr(audit_trail, field, value)
        
        db.add(audit_trail)
        db.commit()
        db.refresh(audit_trail)
        
        return audit_trail
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update audit trail: {str(e)}"
        )


@router.get("/stats/summary", response_model=AuditTrailStats)
def get_audit_trail_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
) -> Any:
    """Get audit trail statistics"""
    
    # Only admins can view audit trail stats
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trail statistics"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    query = db.query(AuditTrail).filter(AuditTrail.created_at >= start_date)
    
    if entity_type is not None:
        query = query.filter(AuditTrail.entity_type == entity_type)
    
    audit_trails = query.all()
    
    # Calculate statistics
    total_changes = len(audit_trails)
    
    changes_by_operation = {}
    changes_by_entity_type = {}
    changes_by_user = {}
    unique_entities = set()
    earliest_date = None
    latest_date = None
    
    for audit in audit_trails:
        # Count by operation
        op_key = audit.operation or "unknown"
        changes_by_operation[op_key] = changes_by_operation.get(op_key, 0) + 1
        
        # Count by entity type
        entity_key = audit.entity_type or "unknown"
        changes_by_entity_type[entity_key] = changes_by_entity_type.get(entity_key, 0) + 1
        
        # Count by user (use username if available)
        user_key = f"user_{audit.user_id}" if audit.user_id else "system"
        changes_by_user[user_key] = changes_by_user.get(user_key, 0) + 1
        
        # Track unique entities
        if audit.entity_id and audit.entity_type:
            unique_entities.add(f"{audit.entity_type}:{audit.entity_id}")
        
        # Track date range
        if audit.created_at:
            if earliest_date is None or audit.created_at < earliest_date:
                earliest_date = audit.created_at
            if latest_date is None or audit.created_at > latest_date:
                latest_date = audit.created_at
    
    return AuditTrailStats(
        total_changes=total_changes,
        changes_by_operation=changes_by_operation,
        changes_by_entity_type=changes_by_entity_type,
        changes_by_user=changes_by_user,
        unique_entities=len(unique_entities),
        date_range={
            "earliest": earliest_date,
            "latest": latest_date
        }
    )


@router.delete("/bulk")
def bulk_delete_audit_trails(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    older_than_days: int = Query(..., ge=1, description="Delete audit trails older than this many days"),
    entity_type: Optional[str] = Query(None, description="Only delete audit trails of this entity type"),
    operation: Optional[str] = Query(None, description="Only delete audit trails of this operation"),
) -> Any:
    """Bulk delete audit trails based on criteria"""
    
    # Only admins can bulk delete
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for bulk operations"
        )
    
    cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
    
    # Build delete query
    query = db.query(AuditTrail).filter(AuditTrail.created_at < cutoff_date)
    
    if entity_type is not None:
        query = query.filter(AuditTrail.entity_type == entity_type)
    
    if operation is not None:
        query = query.filter(AuditTrail.operation == operation.upper())
    
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
            entity_type="audit_trail",
            entity_id=None,
            entity_name="bulk_delete",
            description=f"Bulk deleted {deleted_count} audit trails older than {older_than_days} days",
            level=ActivityLevel.WARNING
        )
        
        return {"message": f"Successfully deleted {deleted_count} audit trails"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk delete audit trails: {str(e)}"
        )


@router.get("/export/{format}")
def export_audit_trails(
    *,
    db: Session = Depends(get_db),
    format: str,
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to export"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
) -> Any:
    """Export audit trails in various formats (CSV, JSON)"""
    
    # Only admins can export audit trails
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to export audit trails"
        )
    
    if format.lower() not in ['csv', 'json']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats: csv, json"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get audit trails
    query = db.query(AuditTrail).filter(AuditTrail.created_at >= start_date)
    
    if entity_type is not None:
        query = query.filter(AuditTrail.entity_type == entity_type)
    
    audit_trails = query.order_by(desc(AuditTrail.created_at)).all()
    
    # Convert to dictionaries
    data = [audit.to_dict() for audit in audit_trails]
    
    # Log export activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action=ActivityAction.EXPORT,
        entity_type="audit_trail",
        entity_id=None,
        entity_name=f"audit_trails_{format}",
        description=f"Exported {len(data)} audit trails in {format.upper()} format",
        level=ActivityLevel.INFO
    )
    
    if format.lower() == 'json':
        return {"data": data, "count": len(data), "format": "json"}
    
    # For CSV format, you would typically return a file response
    # This is a simplified version that returns the data structure
    return {
        "message": f"CSV export prepared with {len(data)} records",
        "data": data,
        "format": "csv"
    }