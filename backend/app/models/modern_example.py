"""
Modern SQLAlchemy 2.x example with type annotations and Mapped syntax
This demonstrates the recommended patterns for SQLAlchemy 2.x
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ModernUser(Base):
    """Example of modern SQLAlchemy 2.x model with type annotations"""
    __tablename__ = "modern_users"
    
    # Primary key with type annotation
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Required fields
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    
    # Optional fields with proper type annotations
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Boolean fields with defaults
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamp fields with server defaults
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        onupdate=func.now(),
        nullable=True
    )
    
    # Relationships using modern syntax
    posts: Mapped[list["ModernPost"]] = relationship(
        "ModernPost", 
        back_populates="author",
        cascade="all, delete-orphan"
    )


class ModernPost(Base):
    """Example of a related model with foreign keys"""
    __tablename__ = "modern_posts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), index=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Foreign key with proper type annotation
    author_id: Mapped[int] = mapped_column(ForeignKey("modern_users.id"))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        onupdate=func.now(),
        nullable=True
    )
    
    # Relationship back reference
    author: Mapped["ModernUser"] = relationship(
        "ModernUser", 
        back_populates="posts"
    )


# Example of using the new async patterns (if needed)
"""
For async usage, you would configure your engine like this:

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async_engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost/db",
    echo=True
)

AsyncSessionLocal = sessionmaker(
    async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
"""