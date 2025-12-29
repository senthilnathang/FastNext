"""
Record Rule API Routes

Endpoints for managing record rules (row-level security).
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.record_rule import RecordRule, RuleScope, RuleOperation
from ..services.record_rule_service import RecordRuleService

router = APIRouter(prefix="/record-rules", tags=["Record Rules"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class RecordRuleResponse(BaseModel):
    """Record rule information."""

    id: int
    name: str
    model_name: str
    module_name: Optional[str] = None
    scope: str
    domain: List[Dict[str, Any]]
    apply_read: bool
    apply_write: bool
    apply_create: bool
    apply_delete: bool
    role_id: Optional[int] = None
    sequence: int
    is_active: bool

    class Config:
        from_attributes = True


class RecordRuleCreate(BaseModel):
    """Create record rule request."""

    name: str
    model_name: str
    scope: str = "user"
    domain: List[Dict[str, Any]] = []
    apply_read: bool = True
    apply_write: bool = True
    apply_create: bool = True
    apply_delete: bool = True
    role_id: Optional[int] = None
    module_name: Optional[str] = None
    sequence: int = 10


class RecordRuleUpdate(BaseModel):
    """Update record rule request."""

    name: Optional[str] = None
    scope: Optional[str] = None
    domain: Optional[List[Dict[str, Any]]] = None
    apply_read: Optional[bool] = None
    apply_write: Optional[bool] = None
    apply_create: Optional[bool] = None
    apply_delete: Optional[bool] = None
    role_id: Optional[int] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None


class AccessCheckRequest(BaseModel):
    """Request to check access for a record."""

    model_name: str
    record_id: int
    operation: str = "read"


class AccessCheckResponse(BaseModel):
    """Access check result."""

    allowed: bool
    matching_rules: List[str]
    reason: Optional[str] = None


# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[RecordRuleResponse])
def list_record_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    model_name: Optional[str] = Query(None),
    active_only: bool = Query(True),
) -> List[RecordRuleResponse]:
    """List all record rules."""
    query = db.query(RecordRule)

    if active_only:
        query = query.filter(RecordRule.is_active == True)

    if model_name:
        query = query.filter(RecordRule.model_name == model_name)

    rules = query.order_by(RecordRule.model_name, RecordRule.sequence).all()
    return [RecordRuleResponse.model_validate(r) for r in rules]


@router.get("/for-model/{model_name}", response_model=List[RecordRuleResponse])
def get_rules_for_model(
    model_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    operation: Optional[str] = Query(None),
) -> List[RecordRuleResponse]:
    """Get all record rules for a specific model."""
    service = RecordRuleService(db)

    if operation:
        rules = service.get_rules_for_model(
            model_name=model_name,
            operation=operation,
            user=current_user,
        )
    else:
        rules = service.get_rules_for_model(
            model_name=model_name,
            user=current_user,
        )

    return [RecordRuleResponse.model_validate(r) for r in rules]


@router.get("/{rule_id}", response_model=RecordRuleResponse)
def get_record_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RecordRuleResponse:
    """Get a record rule by ID."""
    rule = db.query(RecordRule).filter(RecordRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record rule with ID {rule_id} not found",
        )

    return RecordRuleResponse.model_validate(rule)


@router.post("/", response_model=RecordRuleResponse)
def create_record_rule(
    data: RecordRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> RecordRuleResponse:
    """Create a new record rule."""
    rule = RecordRule(
        name=data.name,
        model_name=data.model_name,
        scope=data.scope,
        domain=data.domain,
        apply_read=data.apply_read,
        apply_write=data.apply_write,
        apply_create=data.apply_create,
        apply_delete=data.apply_delete,
        role_id=data.role_id,
        module_name=data.module_name,
        sequence=data.sequence,
        is_active=True,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return RecordRuleResponse.model_validate(rule)


@router.put("/{rule_id}", response_model=RecordRuleResponse)
def update_record_rule(
    rule_id: int,
    data: RecordRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> RecordRuleResponse:
    """Update a record rule."""
    rule = db.query(RecordRule).filter(RecordRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record rule with ID {rule_id} not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(rule, key, value)

    db.commit()
    db.refresh(rule)

    return RecordRuleResponse.model_validate(rule)


@router.delete("/{rule_id}")
def delete_record_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> dict:
    """Delete a record rule."""
    rule = db.query(RecordRule).filter(RecordRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record rule with ID {rule_id} not found",
        )

    db.delete(rule)
    db.commit()

    return {"status": "success", "message": f"Record rule with ID {rule_id} deleted"}


@router.post("/check-access", response_model=AccessCheckResponse)
def check_record_access(
    data: AccessCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AccessCheckResponse:
    """Check if the current user has access to a specific record."""
    service = RecordRuleService(db)

    try:
        allowed = service.check_access(
            model_name=data.model_name,
            record_id=data.record_id,
            operation=data.operation,
            user=current_user,
        )

        # Get matching rules for reporting
        rules = service.get_rules_for_model(
            model_name=data.model_name,
            operation=data.operation,
            user=current_user,
        )

        return AccessCheckResponse(
            allowed=allowed,
            matching_rules=[r.code for r in rules],
            reason="Access granted" if allowed else "Access denied by record rules",
        )

    except Exception as e:
        return AccessCheckResponse(
            allowed=False,
            matching_rules=[],
            reason=str(e),
        )
