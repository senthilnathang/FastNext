from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.base import AuditMixin, Base, TimestampMixin
from app.models.enums import PostStatus
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class BlogPost(Base, TimestampMixin, AuditMixin):
    """
    Blog post content management model
    """

    __tablename__ = "blog_posts"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Blog post title
    title: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    # URL slug for the blog post
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    # Short excerpt or summary
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=False)
    # Full blog post content
    content: Mapped[str] = mapped_column(Text)
    # Post publication status
    status: Mapped[PostStatus] = mapped_column(Enum(PostStatus), default="draft")
    # Publication date and time
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Number of views
    view_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=False, default=0
    )
    # Post tags as JSON array
    tags: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Post author
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    # Relationships
    # author = relationship("User", back_populates="blog_posts")

    def __repr__(self) -> str:
        return f"<BlogPost(id={self.id})>"
