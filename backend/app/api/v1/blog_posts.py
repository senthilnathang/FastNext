"""
Blog post management API endpoints.

Provides CRUD operations for blog post management with proper authentication,
authorization, input validation, and error handling.
"""

from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.blog_post import BlogPost
from app.models.user import User
from app.schemas.blog_post import (
    BlogPostCreate,
    BlogPostListResponse,
    BlogPostResponse,
    BlogPostUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Create CRUD controller
controller = BaseCRUDController[BlogPost, BlogPostCreate, BlogPostUpdate](
    model=BlogPost,
    resource_name="blog_post",
    owner_field="author_id",
    project_field=None,
)

# Create router
router = APIRouter()

# Error messages for consistency
ERROR_BLOG_POST_NOT_FOUND = "Blog post not found"
ERROR_INVALID_PARAMETERS = "Invalid parameters provided"
ERROR_DATABASE_OPERATION = "Database operation failed"


# List blog_posts
@router.get("/", response_model=BlogPostListResponse)
@require_permission("read", "blog_post")
def list_blog_posts(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=50, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve paginated list of blog posts with optional search filtering.

    Supports pagination and text search across blog post fields.
    Results are filtered based on user permissions.

    Args:
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return (1-50)
        search: Optional search term for filtering blog posts
        current_user: Authenticated user making the request

    Returns:
        Paginated list of blog post responses

    Raises:
        HTTPException: If parameters are invalid or database operation fails
    """
    try:
        filters = {"search": search} if search else {}
        return controller.get_list(
            db, current_user, skip=skip, limit=limit, filters=filters
        )
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error listing blog posts: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Get single blog_post
@router.get("/{id}", response_model=BlogPostResponse)
@require_permission("read", "blog_post")
def get_blog_post(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve a specific blog post by its unique identifier.

    Args:
        id: The unique identifier of the blog post to retrieve
        current_user: Authenticated user making the request

    Returns:
        Blog post response data

    Raises:
        HTTPException: If blog post not found or access denied
    """
    try:
        return controller.get_by_id(db, current_user, id)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error retrieving blog post {id}: {type(e).__name__}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_BLOG_POST_NOT_FOUND
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


# Create new blog_post
@router.post("/", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
@require_permission("create", "blog_post")
def create_blog_post(
    blog_post_in: BlogPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new blog_post"""
    return controller.create(db, current_user, blog_post_in)


# Update blog_post
@router.put("/{id}", response_model=BlogPostResponse)
@require_permission("update", "blog_post")
def update_blog_post(
    id: int,
    blog_post_in: BlogPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing blog_post"""
    return controller.update(db, current_user, id, blog_post_in)


# Delete blog_post
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission("delete", "blog_post")
def delete_blog_post(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a blog_post"""
    controller.delete(db, current_user, id)


# Search blog_posts
@router.get("/search", response_model=BlogPostListResponse)
@require_permission("read", "blog_post")
def search_blog_posts(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Perform advanced search for blog posts with pagination.

    Searches across blog post fields using the provided query string.

    Args:
        q: Search query string (required)
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return (1-50)
        current_user: Authenticated user performing the search

    Returns:
        Paginated list of matching blog post responses

    Raises:
        HTTPException: If search fails or parameters are invalid
    """
    try:
        # Advanced search logic implemented via controller
        filters = {"search": q}
        return controller.get_list(db, current_user, skip=skip, limit=limit, filters=filters)
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error searching blog posts: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )