"""
Recruitment Automation API Routes

CRUD operations for automation rules and workflow management.
"""

from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import (
    RecruitmentAutomationRule, AutomationLog, RecruitmentScheduledAction,
    CommunicationTemplate
)
from ..models.recruitment import Recruitment, Candidate
from ..schemas.advanced import (
    AutomationRuleCreate,
    AutomationRuleUpdate,
    AutomationRuleResponse,
    AutomationRuleList,
    CommunicationTemplateCreate,
    CommunicationTemplateUpdate,
    CommunicationTemplateResponse,
    CommunicationTemplateList,
)

router = APIRouter(tags=["Recruitment - Automation"])


# =============================================================================
# Automation Rules
# =============================================================================

@router.get("/rules", response_model=AutomationRuleList)
def list_automation_rules(
    trigger_type: Optional[str] = None,
    action_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List automation rules."""
    query = select(RecruitmentAutomationRule).where(
        RecruitmentAutomationRule.company_id == current_user.current_company_id,
        RecruitmentAutomationRule.deleted_at.is_(None),
    )

    if trigger_type:
        query = query.where(RecruitmentAutomationRule.trigger_type == trigger_type)
    if action_type:
        query = query.where(RecruitmentAutomationRule.action_type == action_type)
    if is_active is not None:
        query = query.where(RecruitmentAutomationRule.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items
    query = query.order_by(RecruitmentAutomationRule.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    return AutomationRuleList(
        items=[AutomationRuleResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/rules/{rule_id}", response_model=AutomationRuleResponse)
def get_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get an automation rule by ID."""
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
            RecruitmentAutomationRule.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    return AutomationRuleResponse.model_validate(rule)


@router.post("/rules", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
def create_automation_rule(
    data: AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new automation rule."""
    rule = RecruitmentAutomationRule(
        name=data.name,
        description=data.description,
        trigger_type=data.trigger_type,
        trigger_conditions=data.trigger_conditions,
        action_type=data.action_type,
        action_config=data.action_config,
        delay_minutes=data.delay_minutes,
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
        is_active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    # Handle recruitment and department associations if provided
    if data.recruitment_ids:
        recruitments = db.execute(
            select(Recruitment).where(
                Recruitment.id.in_(data.recruitment_ids),
                Recruitment.company_id == current_user.current_company_id,
            )
        ).scalars().all()
        rule.recruitments = recruitments
        db.commit()
        db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.put("/rules/{rule_id}", response_model=AutomationRuleResponse)
def update_automation_rule(
    rule_id: int,
    data: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an automation rule."""
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
            RecruitmentAutomationRule.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    update_data = data.model_dump(exclude_unset=True, exclude={"recruitment_ids", "department_ids"})
    for field, value in update_data.items():
        setattr(rule, field, value)

    # Handle recruitment associations
    if data.recruitment_ids is not None:
        recruitments = db.execute(
            select(Recruitment).where(
                Recruitment.id.in_(data.recruitment_ids),
                Recruitment.company_id == current_user.current_company_id,
            )
        ).scalars().all()
        rule.recruitments = recruitments

    rule.updated_by_id = current_user.id
    db.commit()
    db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an automation rule (soft delete)."""
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
            RecruitmentAutomationRule.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    rule.deleted_at = datetime.utcnow()
    rule.deleted_by_id = current_user.id
    db.commit()


@router.post("/rules/{rule_id}/toggle")
def toggle_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle an automation rule active status."""
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
            RecruitmentAutomationRule.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    rule.is_active = not rule.is_active
    rule.updated_by_id = current_user.id
    db.commit()

    return {
        "id": rule.id,
        "is_active": rule.is_active,
        "message": f"Automation rule {'enabled' if rule.is_active else 'disabled'}"
    }


@router.post("/rules/{rule_id}/test")
def test_automation_rule(
    rule_id: int,
    candidate_id: Optional[int] = Query(None, description="Test with specific candidate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Test an automation rule without executing actions."""
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
            RecruitmentAutomationRule.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    # Simulate trigger evaluation
    test_result = {
        "rule_id": rule.id,
        "rule_name": rule.name,
        "trigger_type": rule.trigger_type,
        "action_type": rule.action_type,
        "would_trigger": False,
        "conditions_met": [],
        "conditions_not_met": [],
        "action_preview": None,
    }

    # If candidate provided, check conditions against it
    if candidate_id:
        candidate = db.execute(
            select(Candidate).where(
                Candidate.id == candidate_id,
                Candidate.company_id == current_user.current_company_id,
            )
        ).scalar_one_or_none()

        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        # Check trigger conditions
        conditions = rule.trigger_conditions or {}

        # Example condition checks
        if "stage_id" in conditions:
            if candidate.stage_id == conditions["stage_id"]:
                test_result["conditions_met"].append(f"Stage matches (ID: {conditions['stage_id']})")
            else:
                test_result["conditions_not_met"].append(f"Stage does not match (expected: {conditions['stage_id']}, actual: {candidate.stage_id})")

        if "recruitment_id" in conditions:
            if candidate.recruitment_id == conditions["recruitment_id"]:
                test_result["conditions_met"].append(f"Recruitment matches (ID: {conditions['recruitment_id']})")
            else:
                test_result["conditions_not_met"].append(f"Recruitment does not match")

        # Determine if would trigger
        test_result["would_trigger"] = len(test_result["conditions_not_met"]) == 0 and len(test_result["conditions_met"]) > 0

        # Action preview
        if test_result["would_trigger"]:
            test_result["action_preview"] = {
                "action_type": rule.action_type,
                "action_config": rule.action_config,
                "delay_minutes": rule.delay_minutes,
                "target_candidate": candidate.name,
            }

    return test_result


# =============================================================================
# Automation Logs
# =============================================================================

@router.get("/rules/{rule_id}/logs")
def get_automation_rule_logs(
    rule_id: int,
    status_filter: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get execution logs for an automation rule."""
    # Verify rule exists and belongs to company
    rule = db.execute(
        select(RecruitmentAutomationRule).where(
            RecruitmentAutomationRule.id == rule_id,
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
        )
    ).scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    query = select(AutomationLog).where(AutomationLog.rule_id == rule_id)

    if status_filter:
        query = query.where(AutomationLog.status == status_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get logs
    query = query.order_by(AutomationLog.created_at.desc()).offset(skip).limit(limit)
    logs = db.execute(query).scalars().all()

    return {
        "rule_id": rule_id,
        "total": total,
        "logs": [
            {
                "id": log.id,
                "candidate_id": log.candidate_id,
                "recruitment_id": log.recruitment_id,
                "triggered_at": log.triggered_at.isoformat() if log.triggered_at else None,
                "executed_at": log.executed_at.isoformat() if log.executed_at else None,
                "status": log.status,
                "details": log.details,
                "error_message": log.error_message,
            }
            for log in logs
        ],
    }


@router.get("/logs")
def get_all_automation_logs(
    rule_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all automation logs for the company."""
    # Get all rules for the company
    rule_ids = db.execute(
        select(RecruitmentAutomationRule.id).where(
            RecruitmentAutomationRule.company_id == current_user.current_company_id,
        )
    ).scalars().all()

    if not rule_ids:
        return {"total": 0, "logs": []}

    query = select(AutomationLog).where(AutomationLog.rule_id.in_(rule_ids))

    if rule_id:
        query = query.where(AutomationLog.rule_id == rule_id)
    if status_filter:
        query = query.where(AutomationLog.status == status_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get logs
    query = query.order_by(AutomationLog.created_at.desc()).offset(skip).limit(limit)
    logs = db.execute(query).scalars().all()

    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "rule_id": log.rule_id,
                "candidate_id": log.candidate_id,
                "recruitment_id": log.recruitment_id,
                "triggered_at": log.triggered_at.isoformat() if log.triggered_at else None,
                "executed_at": log.executed_at.isoformat() if log.executed_at else None,
                "status": log.status,
                "details": log.details,
                "error_message": log.error_message,
            }
            for log in logs
        ],
    }


# =============================================================================
# Communication Templates
# =============================================================================

@router.get("/templates", response_model=CommunicationTemplateList)
def list_communication_templates(
    template_type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List communication templates."""
    query = select(CommunicationTemplate).where(
        CommunicationTemplate.company_id == current_user.current_company_id,
        CommunicationTemplate.deleted_at.is_(None),
    )

    if template_type:
        query = query.where(CommunicationTemplate.template_type == template_type)
    if category:
        query = query.where(CommunicationTemplate.category == category)
    if is_active is not None:
        query = query.where(CommunicationTemplate.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items
    query = query.order_by(CommunicationTemplate.name).offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    return CommunicationTemplateList(
        items=[CommunicationTemplateResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/templates/{template_id}", response_model=CommunicationTemplateResponse)
def get_communication_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a communication template by ID."""
    template = db.execute(
        select(CommunicationTemplate).where(
            CommunicationTemplate.id == template_id,
            CommunicationTemplate.company_id == current_user.current_company_id,
            CommunicationTemplate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication template not found"
        )

    return CommunicationTemplateResponse.model_validate(template)


@router.post("/templates", response_model=CommunicationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_communication_template(
    data: CommunicationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new communication template."""
    template = CommunicationTemplate(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return CommunicationTemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=CommunicationTemplateResponse)
def update_communication_template(
    template_id: int,
    data: CommunicationTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a communication template."""
    template = db.execute(
        select(CommunicationTemplate).where(
            CommunicationTemplate.id == template_id,
            CommunicationTemplate.company_id == current_user.current_company_id,
            CommunicationTemplate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication template not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    template.updated_by_id = current_user.id
    db.commit()
    db.refresh(template)

    return CommunicationTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_communication_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a communication template (soft delete)."""
    template = db.execute(
        select(CommunicationTemplate).where(
            CommunicationTemplate.id == template_id,
            CommunicationTemplate.company_id == current_user.current_company_id,
            CommunicationTemplate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication template not found"
        )

    template.deleted_at = datetime.utcnow()
    template.deleted_by_id = current_user.id
    db.commit()


@router.post("/templates/{template_id}/preview")
def preview_communication_template(
    template_id: int,
    candidate_id: Optional[int] = Query(None, description="Candidate ID for variable replacement"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview a communication template with variable substitution."""
    template = db.execute(
        select(CommunicationTemplate).where(
            CommunicationTemplate.id == template_id,
            CommunicationTemplate.company_id == current_user.current_company_id,
            CommunicationTemplate.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication template not found"
        )

    # Default variable values
    variables = {
        "candidate_name": "John Doe",
        "candidate_email": "john.doe@example.com",
        "job_title": "Software Engineer",
        "company_name": "Your Company",
        "interview_date": "January 15, 2026",
        "interview_time": "10:00 AM",
        "interviewer_name": "Jane Smith",
    }

    # If candidate provided, use their actual data
    if candidate_id:
        candidate = db.execute(
            select(Candidate).where(
                Candidate.id == candidate_id,
                Candidate.company_id == current_user.current_company_id,
            )
        ).scalar_one_or_none()

        if candidate:
            variables["candidate_name"] = candidate.name
            variables["candidate_email"] = candidate.email
            if candidate.recruitment:
                variables["job_title"] = candidate.recruitment.title

    # Replace variables in subject and body
    subject = template.subject or ""
    body = template.body or ""

    for var_name, var_value in variables.items():
        placeholder = "{{" + var_name + "}}"
        subject = subject.replace(placeholder, var_value)
        body = body.replace(placeholder, var_value)

    return {
        "template_id": template.id,
        "template_name": template.name,
        "preview": {
            "subject": subject,
            "body": body,
        },
        "variables_used": variables,
        "available_variables": template.variables or [],
    }


# =============================================================================
# Trigger Types Reference
# =============================================================================

@router.get("/trigger-types")
def get_trigger_types(
    current_user: User = Depends(get_current_user),
):
    """Get available automation trigger types."""
    return {
        "trigger_types": [
            {"value": "stage_change", "label": "Stage Change", "description": "When candidate moves to a different stage"},
            {"value": "application_received", "label": "Application Received", "description": "When new application is submitted"},
            {"value": "interview_scheduled", "label": "Interview Scheduled", "description": "When interview is scheduled"},
            {"value": "interview_completed", "label": "Interview Completed", "description": "When interview is marked complete"},
            {"value": "interview_feedback_submitted", "label": "Feedback Submitted", "description": "When interview feedback is submitted"},
            {"value": "offer_sent", "label": "Offer Sent", "description": "When job offer is sent to candidate"},
            {"value": "offer_accepted", "label": "Offer Accepted", "description": "When candidate accepts the offer"},
            {"value": "offer_rejected", "label": "Offer Rejected", "description": "When candidate rejects the offer"},
            {"value": "time_in_stage", "label": "Time in Stage", "description": "When candidate has been in a stage for X days"},
            {"value": "rating_received", "label": "Rating Received", "description": "When candidate receives a rating"},
            {"value": "document_uploaded", "label": "Document Uploaded", "description": "When candidate uploads a document"},
            {"value": "candidate_tagged", "label": "Candidate Tagged", "description": "When specific tag is applied to candidate"},
            {"value": "schedule", "label": "Scheduled", "description": "Run at specific time/interval"},
        ],
        "action_types": [
            {"value": "send_email", "label": "Send Email", "description": "Send email to candidate"},
            {"value": "send_sms", "label": "Send SMS", "description": "Send SMS to candidate"},
            {"value": "move_stage", "label": "Move Stage", "description": "Move candidate to different stage"},
            {"value": "assign_task", "label": "Assign Task", "description": "Create task for team member"},
            {"value": "add_tag", "label": "Add Tag", "description": "Add tag to candidate"},
            {"value": "remove_tag", "label": "Remove Tag", "description": "Remove tag from candidate"},
            {"value": "notify_user", "label": "Notify User", "description": "Send in-app notification"},
            {"value": "notify_slack", "label": "Notify Slack", "description": "Send Slack notification"},
            {"value": "webhook", "label": "Webhook", "description": "Call external webhook"},
            {"value": "add_to_talent_pool", "label": "Add to Talent Pool", "description": "Add candidate to talent pool"},
            {"value": "schedule_reminder", "label": "Schedule Reminder", "description": "Schedule a reminder"},
            {"value": "update_field", "label": "Update Field", "description": "Update candidate field"},
        ],
    }
