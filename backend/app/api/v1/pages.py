from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.page import Page
from app.models.project import Project
from app.models.user import User
from app.schemas.page import Page as PageSchema
from app.schemas.page import PageCreate, PageUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/project/{project_id}/pages", response_model=List[PageSchema])
def read_project_pages(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pages = (
        db.query(Page)
        .filter(Page.project_id == project_id)
        .order_by(Page.order_index)
        .all()
    )
    return pages


@router.post("", response_model=PageSchema)
@router.post("/", response_model=PageSchema)
def create_page(
    *,
    db: Session = Depends(get_db),
    page_in: PageCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    project = (
        db.query(Project)
        .filter(Project.id == page_in.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if slug already exists in project
    existing_page = (
        db.query(Page)
        .filter(Page.project_id == page_in.project_id, Page.slug == page_in.slug)
        .first()
    )
    if existing_page:
        raise HTTPException(
            status_code=400, detail="Page with this slug already exists"
        )

    page = Page(**page_in.dict())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.get("/{page_id}", response_model=PageSchema)
def read_page(
    *,
    db: Session = Depends(get_db),
    page_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    page = (
        db.query(Page)
        .join(Project)
        .filter(Page.id == page_id, Project.user_id == current_user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.put("/{page_id}", response_model=PageSchema)
def update_page(
    *,
    db: Session = Depends(get_db),
    page_id: int,
    page_in: PageUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    page = (
        db.query(Page)
        .join(Project)
        .filter(Page.id == page_id, Project.user_id == current_user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    page_data = page_in.dict(exclude_unset=True)
    for field, value in page_data.items():
        setattr(page, field, value)

    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}")
def delete_page(
    *,
    db: Session = Depends(get_db),
    page_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    page = (
        db.query(Page)
        .join(Project)
        .filter(Page.id == page_id, Project.user_id == current_user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    db.delete(page)
    db.commit()
    return {"message": "Page deleted successfully"}
