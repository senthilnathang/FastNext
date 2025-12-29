"""
Attachment model for file uploads.
Polymorphic association allows attaching files to any model.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Attachment(Base):
    """
    Attachment model for file uploads.
    Uses polymorphic association to attach to any entity.
    """

    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # File info
    filename = Column(String(255), nullable=False)  # Stored filename (unique)
    original_filename = Column(String(255), nullable=False)  # Original upload name
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)  # Size in bytes
    hash = Column(String(64), nullable=True)  # SHA256 hash

    # Storage info
    storage_key = Column(String(500), nullable=False, unique=True)
    storage_backend = Column(String(20), nullable=False, default="local")

    # Polymorphic association - can attach to any model
    attachable_type = Column(String(100), nullable=False, index=True)  # e.g., "messages", "inbox_items"
    attachable_id = Column(Integer, nullable=False, index=True)

    # Image/video specific metadata
    width = Column(Integer, nullable=True)  # For images/videos
    height = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)  # For audio/video (seconds)
    thumbnail_key = Column(String(500), nullable=True)  # Thumbnail storage key

    # Status
    is_public = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # Ownership
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], viewonly=True)

    # Indexes
    __table_args__ = (
        Index("ix_attachments_attachable", "attachable_type", "attachable_id"),
        Index("ix_attachments_user_company", "user_id", "company_id"),
    )

    def __repr__(self):
        return f"<Attachment(id={self.id}, filename='{self.original_filename}', type='{self.attachable_type}')>"

    @property
    def is_image(self) -> bool:
        """Check if attachment is an image"""
        return self.mime_type.startswith("image/") if self.mime_type else False

    @property
    def is_video(self) -> bool:
        """Check if attachment is a video"""
        return self.mime_type.startswith("video/") if self.mime_type else False

    @property
    def is_audio(self) -> bool:
        """Check if attachment is audio"""
        return self.mime_type.startswith("audio/") if self.mime_type else False

    @property
    def is_document(self) -> bool:
        """Check if attachment is a document"""
        doc_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument",
            "text/",
        ]
        if not self.mime_type:
            return False
        return any(self.mime_type.startswith(t) for t in doc_types)

    @property
    def file_extension(self) -> str:
        """Get file extension"""
        if "." in self.original_filename:
            return self.original_filename.rsplit(".", 1)[1].lower()
        return ""

    @property
    def human_size(self) -> str:
        """Get human-readable file size"""
        size = self.size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "size": self.size,
            "human_size": self.human_size,
            "is_image": self.is_image,
            "is_video": self.is_video,
            "width": self.width,
            "height": self.height,
            "duration": self.duration,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def create_for_entity(
        cls,
        db,
        attachable_type: str,
        attachable_id: int,
        storage_result: dict,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
        duration: Optional[int] = None,
        thumbnail_key: Optional[str] = None,
    ) -> "Attachment":
        """Create attachment from storage upload result"""
        attachment = cls(
            filename=storage_result["filename"],
            original_filename=storage_result["original_filename"],
            mime_type=storage_result["mime_type"],
            size=storage_result["size"],
            hash=storage_result.get("hash"),
            storage_key=storage_result["storage_key"],
            storage_backend=storage_result["storage_backend"],
            attachable_type=attachable_type,
            attachable_id=attachable_id,
            user_id=user_id,
            company_id=company_id,
            width=width,
            height=height,
            duration=duration,
            thumbnail_key=thumbnail_key,
        )
        db.add(attachment)
        db.flush()
        return attachment

    @classmethod
    def get_for_entity(
        cls,
        db,
        attachable_type: str,
        attachable_id: int,
        include_deleted: bool = False,
    ) -> list["Attachment"]:
        """Get all attachments for an entity"""
        query = db.query(cls).filter(
            cls.attachable_type == attachable_type,
            cls.attachable_id == attachable_id,
        )
        if not include_deleted:
            query = query.filter(cls.is_deleted == False)
        return query.order_by(cls.created_at.asc()).all()

    def soft_delete(self, db) -> None:
        """Soft delete the attachment"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        db.flush()
