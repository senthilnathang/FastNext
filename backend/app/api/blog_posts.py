from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.dependencies import get_current_active_user, require_permission
from app.db.session import get_db
from app.models.blog_post import BlogPost
from app.models.user import User
from app.schemas.blog_post import (
    BlogPostCreate,
    BlogPostUpdate, 
    BlogPostResponse,
    BlogPostListResponse
)

# Create CRUD controller
controller = BaseCRUDController[BlogPost, BlogPostCreate, BlogPostUpdate](
    model=BlogPost,
    resource_name="blog_post",
    owner_field="author_id" if self.model_def.owner_field else None,
    project_field="project_id" if self.model_def.project_scoped else None
)

# Create router
router = APIRouter()

# List blog_posts
@router.get("/", response_model=BlogPostListResponse)
@require_permission("read", "blog_post")
async def list_blog_posts(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=50, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of blog_posts with pagination and search"""
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=search)

# Get single blog_post
@router.get("/{id}", response_model=BlogPostResponse)
@require_permission("read", "blog_post")
async def get_blog_post(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific blog_post by ID"""
    return await controller.get_by_id(db, current_user, id)

# Create new blog_post
@router.post("/", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "blog_post")
async def create_blog_post(
    blog_post_in: BlogPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new blog_post"""
    return await controller.create(db, current_user, blog_post_in)

# Update blog_post
@router.put("/{id}", response_model=BlogPostResponse)
@require_permission("update", "blog_post")
async def update_blog_post(
    id: int,
    blog_post_in: BlogPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing blog_post"""
    return await controller.update(db, current_user, id, blog_post_in)

# Delete blog_post
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "blog_post")
async def delete_blog_post(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a blog_post"""
    await controller.delete(db, current_user, id)


# Search blog_posts
@router.get("/search", response_model=BlogPostListResponse)
@require_permission("read", "blog_post")
async def search_blog_posts(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Advanced search for blog_posts"""
    # TODO: Implement advanced search logic
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=q)
