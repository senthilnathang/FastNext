from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.models.enums import PostStatus
from app.schemas.base import BaseResponseModel
from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator


class BlogPostBase(BaseModel):
    """Base schema for BlogPost"""

    title: str = Field(
        ...,
        description="Blog post title",
        example="How to Build Amazing Products",
        min_length=5,
        max_length=300,
    )
    slug: str = Field(
        ...,
        description="URL slug for the blog post",
        example="how-to-build-amazing-products",
        pattern=r"^[a-z0-9-]+$",
    )
    excerpt: Optional[str] = Field(None, description="Short excerpt or summary")
    content: str = Field(..., description="Full blog post content")
    status: PostStatus = Field("draft", description="Post publication status")
    published_at: Optional[datetime] = Field(
        None, description="Publication date and time"
    )
    view_count: Optional[int] = Field(0, description="Number of views")
    tags: Optional[Dict[str, Any]] = Field(
        None,
        description="Post tags as JSON array",
        example=["technology", "tutorial", "python"],
    )
    author_id: int = Field(..., description="Post author")


class BlogPostCreate(BlogPostBase):
    """Schema for creating BlogPost"""

    title: str = Field(
        ...,
        description="Blog post title",
        example="How to Build Amazing Products",
        min_length=5,
        max_length=300,
    )
    slug: str = Field(
        ...,
        description="URL slug for the blog post",
        example="how-to-build-amazing-products",
        pattern=r"^[a-z0-9-]+$",
    )
    excerpt: Optional[str] = Field(None, description="Short excerpt or summary")
    content: str = Field(..., description="Full blog post content")
    status: PostStatus = Field("draft", description="Post publication status")
    published_at: Optional[datetime] = Field(
        None, description="Publication date and time"
    )
    view_count: Optional[int] = Field(0, description="Number of views")
    tags: Optional[Dict[str, Any]] = Field(
        None,
        description="Post tags as JSON array",
        example=["technology", "tutorial", "python"],
    )
    author_id: int = Field(..., description="Post author")


class BlogPostUpdate(BaseModel):
    """Schema for updating BlogPost"""

    title: Optional[str] = Field(
        None,
        description="Blog post title",
        example="How to Build Amazing Products",
        min_length=5,
        max_length=300,
    )
    slug: Optional[str] = Field(
        None,
        description="URL slug for the blog post",
        example="how-to-build-amazing-products",
        pattern=r"^[a-z0-9-]+$",
    )
    excerpt: Optional[str] = Field(None, description="Short excerpt or summary")
    content: Optional[str] = Field(None, description="Full blog post content")
    status: Optional[PostStatus] = Field(None, description="Post publication status")
    published_at: Optional[datetime] = Field(
        None, description="Publication date and time"
    )
    view_count: Optional[int] = Field(None, description="Number of views")
    tags: Optional[Dict[str, Any]] = Field(
        None,
        description="Post tags as JSON array",
        example=["technology", "tutorial", "python"],
    )
    author_id: Optional[int] = Field(None, description="Post author")


class BlogPostResponse(BlogPostBase, BaseResponseModel):
    """Schema for BlogPost responses"""

    id: int
    title: str = Field(
        ...,
        description="Blog post title",
        example="How to Build Amazing Products",
        min_length=5,
        max_length=300,
    )
    slug: str = Field(
        ...,
        description="URL slug for the blog post",
        example="how-to-build-amazing-products",
        pattern=r"^[a-z0-9-]+$",
    )
    excerpt: str = Field(None, description="Short excerpt or summary")
    content: str = Field(..., description="Full blog post content")
    status: PostStatus = Field("draft", description="Post publication status")
    published_at: datetime = Field(None, description="Publication date and time")
    view_count: int = Field(0, description="Number of views")
    tags: Dict[str, Any] = Field(
        None,
        description="Post tags as JSON array",
        example=["technology", "tutorial", "python"],
    )
    author_id: int = Field(..., description="Post author")
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BlogPostListResponse(BaseModel):
    """Schema for BlogPost list responses"""

    items: List[BlogPostResponse]
    total: int
    skip: int
    limit: int
