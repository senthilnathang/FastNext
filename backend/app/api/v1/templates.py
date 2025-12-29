"""Text Template API endpoints"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.text_template import TextTemplate
from app.schemas.text_template import (
    TextTemplateCreate,
    TextTemplateUpdate,
    TextTemplateResponse,
    TextTemplateListResponse,
    TemplateExpandRequest,
    TemplateExpandResponse,
)

router = APIRouter()


@router.get("/", response_model=TextTemplateListResponse)
def list_templates(
    category: Optional[str] = None,
    include_system: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all templates available to the current user"""
    templates = TextTemplate.get_for_user(
        db=db,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
        category=category,
        include_system=include_system,
    )

    return TextTemplateListResponse(
        items=[TextTemplateResponse.model_validate(t) for t in templates],
        total=len(templates),
    )


@router.get("/search")
def search_templates(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[TextTemplateResponse]:
    """Search templates by name or shortcut"""
    templates = TextTemplate.search(
        db=db,
        query_str=q,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
        limit=limit,
    )

    return [TextTemplateResponse.model_validate(t) for t in templates]


@router.post("/expand", response_model=TemplateExpandResponse)
def expand_template(
    data: TemplateExpandRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Expand a template shortcut to its content.

    This endpoint finds a template by shortcut and returns its content.
    Also increments the use count for analytics.
    """
    template = TextTemplate.find_by_shortcut(
        db=db,
        shortcut=data.shortcut,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
    )

    if not template:
        return TemplateExpandResponse(
            found=False,
            shortcut=data.shortcut,
        )

    # Increment use count
    template.increment_use_count()
    db.commit()

    return TemplateExpandResponse(
        found=True,
        shortcut=data.shortcut,
        content=template.content,
        template=TextTemplateResponse.model_validate(template),
    )


@router.get("/{template_id}", response_model=TextTemplateResponse)
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific template by ID"""
    template = db.query(TextTemplate).filter(TextTemplate.id == template_id).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check access: user owns it, it's a company template, or it's a system template
    has_access = (
        template.user_id == current_user.id
        or template.is_system
        or (
            template.company_id == current_user.current_company_id
            and template.user_id is None
        )
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return TextTemplateResponse.model_validate(template)


@router.post("/", response_model=TextTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    data: TextTemplateCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new text template"""
    # Only superusers can create system templates
    if data.is_system and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can create system templates",
        )

    template = TextTemplate.create(
        db=db,
        name=data.name,
        shortcut=data.shortcut,
        content=data.content,
        category=data.category,
        user_id=None if data.is_system else current_user.id,
        company_id=current_user.current_company_id if not data.is_system else None,
        is_system=data.is_system,
    )

    db.commit()
    db.refresh(template)

    return TextTemplateResponse.model_validate(template)


@router.put("/{template_id}", response_model=TextTemplateResponse)
def update_template(
    template_id: int,
    data: TextTemplateUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a text template"""
    template = db.query(TextTemplate).filter(TextTemplate.id == template_id).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check ownership or superuser
    if template.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update this template",
        )

    # Apply updates
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)

    return TextTemplateResponse.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a text template"""
    template = db.query(TextTemplate).filter(TextTemplate.id == template_id).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check ownership or superuser
    if template.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete this template",
        )

    db.delete(template)
    db.commit()


@router.get("/categories/list")
def list_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[str]:
    """Get list of template categories"""
    from sqlalchemy import distinct, or_

    query = db.query(distinct(TextTemplate.category)).filter(
        TextTemplate.is_active == True,
        TextTemplate.category != None,
        or_(
            TextTemplate.user_id == current_user.id,
            TextTemplate.is_system == True,
            (TextTemplate.company_id == current_user.current_company_id)
            & (TextTemplate.user_id == None),
        ),
    )

    return [cat[0] for cat in query.all() if cat[0]]
