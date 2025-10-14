from typing import Any, Dict, List, Optional

from app.models.blog_post import BlogPost
from app.models.user import User
from app.schemas.blog_post import BlogPostCreate, BlogPostUpdate
from app.services.permission_service import PermissionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload


class BlogPostService:
    """Business logic service for BlogPost"""

    def __init__(self, db: Session):
        self.db = db

    def get_blog_post_by_id(self, blog_post_id: int, user: User) -> BlogPost:
        """Get blog_post by ID with permission check"""
        blog_post = self.db.query(BlogPost).filter(BlogPost.id == blog_post_id).first()

        if not blog_post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="BlogPost not found"
            )

        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "blog_post", blog_post.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        return blog_post

    def create_blog_post(self, blog_post_data: BlogPostCreate, user: User) -> BlogPost:
        """Create new blog_post with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(
            self.db, user.id, "create", "blog_post"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create blog_post",
            )

        # Create the blog_post
        blog_post_dict = blog_post_data.model_dump()

        # Add owner information if applicable
        if hasattr(BlogPost, "author_id"):
            blog_post_dict["author_id"] = user.id

        blog_post = BlogPost(**blog_post_dict)
        self.db.add(blog_post)
        self.db.commit()
        self.db.refresh(blog_post)

        return blog_post

    def update_blog_post(
        self, blog_post_id: int, blog_post_data: BlogPostUpdate, user: User
    ) -> BlogPost:
        """Update blog_post with business logic"""
        blog_post = self.get_blog_post_by_id(blog_post_id, user)

        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "blog_post", blog_post.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this blog_post",
            )

        # Update fields
        update_data = blog_post_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(blog_post, field, value)

        self.db.commit()
        self.db.refresh(blog_post)

        return blog_post

    def delete_blog_post(self, blog_post_id: int, user: User) -> bool:
        """Delete blog_post with business logic"""
        blog_post = self.get_blog_post_by_id(blog_post_id, user)

        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "blog_post", blog_post.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this blog_post",
            )

        # Hard delete
        self.db.delete(blog_post)
        self.db.commit()

        return True

    def list_blog_posts(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        user: User = None,
    ) -> List[BlogPost]:
        """Get list of blog_posts with filtering"""
        query = self.db.query(BlogPost)

        # Apply soft delete filter if applicable

        # Apply search if provided
        if search:
            # TODO: Implement search across searchable fields
            query = query.filter(
                db.or_(
                    BlogPost.title.ilike(f"%{search}%"),
                    BlogPost.excerpt.ilike(f"%{search}%"),
                    BlogPost.content.ilike(f"%{search}%"),
                )
            )

        # Apply pagination
        blog_posts = query.offset(skip).limit(limit).all()

        return blog_posts
