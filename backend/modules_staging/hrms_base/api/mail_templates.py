"""
Mail Template API Routes

CRUD operations for mail templates, plus preview rendering.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.settings import MailTemplate
from ..schemas.settings import (
    MailTemplateCreate,
    MailTemplateUpdate,
    MailTemplateResponse,
)

router = APIRouter(prefix="/mail-templates", tags=["Mail Templates"])


class MailTemplatePreviewRequest(BaseModel):
    """Request body for template preview."""
    context: Dict[str, Any] = {}


class MailTemplatePreviewResponse(BaseModel):
    """Response for template preview."""
    subject: str
    body_html: str
    body_text: str


@router.get("/", response_model=None)
@router.get("", response_model=None, include_in_schema=False)
def list_mail_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    model_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List mail templates with optional filtering."""
    query = db.query(MailTemplate).filter(
        MailTemplate.company_id == current_user.current_company_id,
        MailTemplate.is_deleted == False,
    )

    if model_name is not None:
        query = query.filter(MailTemplate.model_name == model_name)
    if is_active is not None:
        query = query.filter(MailTemplate.is_active == is_active)

    total = query.count()
    items = query.order_by(MailTemplate.id).offset(skip).limit(limit).all()

    return {
        "items": [MailTemplateResponse.model_validate(item) for item in items],
        "total": total,
    }


@router.get("/{template_id}", response_model=MailTemplateResponse)
def get_mail_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a mail template by ID."""
    template = db.query(MailTemplate).filter(
        MailTemplate.id == template_id,
        MailTemplate.company_id == current_user.current_company_id,
        MailTemplate.is_deleted == False,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Mail template not found")
    return template


@router.post("/", response_model=MailTemplateResponse, status_code=201)
@router.post("", response_model=MailTemplateResponse, status_code=201, include_in_schema=False)
def create_mail_template(
    data: MailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new mail template."""
    template = MailTemplate(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}", response_model=MailTemplateResponse)
def update_mail_template(
    template_id: int,
    data: MailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a mail template."""
    template = db.query(MailTemplate).filter(
        MailTemplate.id == template_id,
        MailTemplate.company_id == current_user.current_company_id,
        MailTemplate.is_deleted == False,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Mail template not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    template.updated_by = current_user.id
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_mail_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a mail template (soft delete)."""
    template = db.query(MailTemplate).filter(
        MailTemplate.id == template_id,
        MailTemplate.company_id == current_user.current_company_id,
        MailTemplate.is_deleted == False,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Mail template not found")

    template.is_deleted = True
    template.deleted_at = datetime.utcnow()
    template.deleted_by = current_user.id
    db.commit()
    return None


@router.post("/{template_id}/preview", response_model=MailTemplatePreviewResponse)
def preview_mail_template(
    template_id: int,
    body: MailTemplatePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview a mail template with provided context variables."""
    template = db.query(MailTemplate).filter(
        MailTemplate.id == template_id,
        MailTemplate.company_id == current_user.current_company_id,
        MailTemplate.is_deleted == False,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Mail template not found")

    context = body.context or {}
    return MailTemplatePreviewResponse(
        subject=template.render_subject(context),
        body_html=template.render_body(context, html=True),
        body_text=template.render_body(context, html=False),
    )
