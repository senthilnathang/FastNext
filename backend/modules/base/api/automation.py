"""
Server Actions and Automation API Routes

Endpoints for managing server actions and automation rules.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.server_action import ServerAction, AutomationRule, ActionType, ActionTrigger
from ..services.automation_service import AutomationService

router = APIRouter(prefix="/automation", tags=["Automation"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class ServerActionResponse(BaseModel):
    """Server action information."""

    id: int
    name: str
    code: str
    model_name: str
    module_name: Optional[str] = None
    action_type: str
    sequence: int
    is_active: bool

    class Config:
        from_attributes = True


class ServerActionCreate(BaseModel):
    """Create server action request."""

    code: str
    name: str
    model_name: str
    action_type: str = "python_code"
    module_name: Optional[str] = None
    python_code: Optional[str] = None
    method_name: Optional[str] = None
    method_args: List[Any] = []
    update_values: Dict[str, Any] = {}
    webhook_url: Optional[str] = None
    webhook_method: str = "POST"
    webhook_payload: Dict[str, Any] = {}
    sequence: int = 10


class AutomationRuleResponse(BaseModel):
    """Automation rule information."""

    id: int
    name: str
    code: str
    model_name: str
    module_name: Optional[str] = None
    trigger: str
    domain: List[Dict[str, Any]]
    action_id: Optional[int] = None
    action_code: Optional[str] = None
    sequence: int
    is_active: bool

    class Config:
        from_attributes = True


class AutomationRuleCreate(BaseModel):
    """Create automation rule request."""

    code: str
    name: str
    model_name: str
    trigger: str = "on_create"
    domain: List[Dict[str, Any]] = []
    action_id: Optional[int] = None
    action_code: Optional[str] = None
    python_code: Optional[str] = None
    module_name: Optional[str] = None
    time_field: Optional[str] = None
    time_delta: int = 0
    sequence: int = 10


class AutomationRuleUpdate(BaseModel):
    """Update automation rule request."""

    name: Optional[str] = None
    trigger: Optional[str] = None
    domain: Optional[List[Dict[str, Any]]] = None
    action_id: Optional[int] = None
    action_code: Optional[str] = None
    python_code: Optional[str] = None
    time_field: Optional[str] = None
    time_delta: Optional[int] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None


class TriggerResult(BaseModel):
    """Result of triggering automation."""

    rule: str
    status: str
    records_count: int = 0
    error: Optional[str] = None


# -------------------------------------------------------------------------
# Server Action Endpoints
# -------------------------------------------------------------------------


@router.get("/actions/", response_model=List[ServerActionResponse])
def list_server_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    model_name: Optional[str] = Query(None),
    active_only: bool = Query(True),
) -> List[ServerActionResponse]:
    """List all server actions."""
    query = db.query(ServerAction)

    if active_only:
        query = query.filter(ServerAction.is_active == True)

    if model_name:
        query = query.filter(ServerAction.model_name == model_name)

    actions = query.order_by(ServerAction.model_name, ServerAction.sequence).all()
    return [ServerActionResponse.model_validate(a) for a in actions]


@router.get("/actions/{code}", response_model=ServerActionResponse)
def get_server_action(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ServerActionResponse:
    """Get a server action by code."""
    action = db.query(ServerAction).filter(ServerAction.code == code).first()

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Server action '{code}' not found",
        )

    return ServerActionResponse.model_validate(action)


@router.post("/actions/", response_model=ServerActionResponse)
def create_server_action(
    data: ServerActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ServerActionResponse:
    """Create a new server action."""
    # Check for existing
    existing = db.query(ServerAction).filter(ServerAction.code == data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Server action with code '{data.code}' already exists",
        )

    action = ServerAction(
        code=data.code,
        name=data.name,
        model_name=data.model_name,
        action_type=data.action_type,
        module_name=data.module_name,
        python_code=data.python_code,
        method_name=data.method_name,
        method_args=data.method_args,
        update_values=data.update_values,
        webhook_url=data.webhook_url,
        webhook_method=data.webhook_method,
        webhook_payload=data.webhook_payload,
        sequence=data.sequence,
        is_active=True,
    )

    db.add(action)
    db.commit()
    db.refresh(action)

    return ServerActionResponse.model_validate(action)


@router.delete("/actions/{code}")
def delete_server_action(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> dict:
    """Delete a server action."""
    action = db.query(ServerAction).filter(ServerAction.code == code).first()

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Server action '{code}' not found",
        )

    db.delete(action)
    db.commit()

    return {"status": "success", "message": f"Server action '{code}' deleted"}


# -------------------------------------------------------------------------
# Automation Rule Endpoints
# -------------------------------------------------------------------------


@router.get("/rules/", response_model=List[AutomationRuleResponse])
def list_automation_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    model_name: Optional[str] = Query(None),
    trigger: Optional[str] = Query(None),
    active_only: bool = Query(True),
) -> List[AutomationRuleResponse]:
    """List all automation rules."""
    query = db.query(AutomationRule)

    if active_only:
        query = query.filter(AutomationRule.is_active == True)

    if model_name:
        query = query.filter(AutomationRule.model_name == model_name)

    if trigger:
        query = query.filter(AutomationRule.trigger == trigger)

    rules = query.order_by(AutomationRule.model_name, AutomationRule.sequence).all()
    return [AutomationRuleResponse.model_validate(r) for r in rules]


@router.get("/rules/{code}", response_model=AutomationRuleResponse)
def get_automation_rule(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AutomationRuleResponse:
    """Get an automation rule by code."""
    rule = db.query(AutomationRule).filter(AutomationRule.code == code).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation rule '{code}' not found",
        )

    return AutomationRuleResponse.model_validate(rule)


@router.post("/rules/", response_model=AutomationRuleResponse)
def create_automation_rule(
    data: AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> AutomationRuleResponse:
    """Create a new automation rule."""
    # Check for existing
    existing = db.query(AutomationRule).filter(AutomationRule.code == data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Automation rule with code '{data.code}' already exists",
        )

    rule = AutomationRule(
        code=data.code,
        name=data.name,
        model_name=data.model_name,
        trigger=data.trigger,
        domain=data.domain,
        action_id=data.action_id,
        action_code=data.action_code,
        python_code=data.python_code,
        module_name=data.module_name,
        time_field=data.time_field,
        time_delta=data.time_delta,
        sequence=data.sequence,
        is_active=True,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.put("/rules/{code}", response_model=AutomationRuleResponse)
def update_automation_rule(
    code: str,
    data: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> AutomationRuleResponse:
    """Update an automation rule."""
    rule = db.query(AutomationRule).filter(AutomationRule.code == code).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation rule '{code}' not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)

    db.commit()
    db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.delete("/rules/{code}")
def delete_automation_rule(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> dict:
    """Delete an automation rule."""
    rule = db.query(AutomationRule).filter(AutomationRule.code == code).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation rule '{code}' not found",
        )

    db.delete(rule)
    db.commit()

    return {"status": "success", "message": f"Automation rule '{code}' deleted"}


# -------------------------------------------------------------------------
# Trigger Endpoints
# -------------------------------------------------------------------------


@router.post("/trigger/time-based", response_model=List[TriggerResult])
def trigger_time_based_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> List[TriggerResult]:
    """
    Manually trigger all time-based automation rules.

    This is usually called by a cron job but can be triggered manually.
    """
    service = AutomationService(db)
    results = service.trigger_time_based()

    return [
        TriggerResult(
            rule=r.get("rule", "unknown"),
            status=r.get("status", "unknown"),
            records_count=r.get("records_count", 0),
            error=r.get("error"),
        )
        for r in results
    ]
