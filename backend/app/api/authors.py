from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.author import Author
from app.models.user import User
from app.schemas.author import (
    AuthorCreate,
    AuthorListResponse,
    AuthorResponse,
    AuthorUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Create CRUD controller
controller = BaseCRUDController[Author, AuthorCreate, AuthorUpdate](
    model=Author,
    resource_name="author",
    owner_field="user_id" if True else None,
    project_field="project_id" if False else None,
)

# Create router
router = APIRouter()


# List authors
@router.get("/", response_model=AuthorListResponse)
@require_permission("read", "author")
async def list_authors(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(25, ge=1, le=1000, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of authors with pagination and search"""
    return await controller.get_list(
        db, current_user, skip=skip, limit=limit, search=search
    )


# Get single author
@router.get("/{id}", response_model=AuthorResponse)
@require_permission("read", "author")
async def get_author(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific author by ID"""
    return await controller.get_by_id(db, current_user, id)


# Create new author
@router.post("/", response_model=AuthorResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "author")
async def create_author(
    author_in: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new author"""
    return await controller.create(db, current_user, author_in)


# Update author
@router.put("/{id}", response_model=AuthorResponse)
@require_permission("update", "author")
async def update_author(
    id: int,
    author_in: AuthorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing author"""
    return await controller.update(db, current_user, id, author_in)


# Delete author
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "author")
async def delete_author(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a author"""
    await controller.delete(db, current_user, id)


# Search authors
@router.get("/search", response_model=AuthorListResponse)
@require_permission("read", "author")
async def search_authors(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Advanced search for authors"""
    # TODO: Implement advanced search logic
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=q)
