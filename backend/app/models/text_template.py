"""Text Template model for quick response templates"""

from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey, Index
from sqlalchemy.orm import relationship, Session

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company


class TextTemplate(BaseModel):
    """
    Text templates for quick responses.

    Allows users to create reusable message templates with shortcuts
    (e.g., "/approve" or "!thanks") for faster messaging.
    """

    __tablename__ = "text_templates"

    # Owner (null for system templates)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Owner user ID (null for system templates)",
    )

    # Company scope (null for personal templates)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Company ID (null for personal templates)",
    )

    # Template info
    name = Column(String(100), nullable=False)
    shortcut = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Trigger shortcut (e.g., /approve, !thanks)",
    )
    content = Column(Text, nullable=False)
    category = Column(
        String(50),
        nullable=True,
        default="general",
        index=True,
    )

    # Flags
    is_system = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="System template (available to all users)",
    )
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Usage tracking
    use_count = Column(Integer, default=0, nullable=False)

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        viewonly=True,
        lazy="select",
    )
    company = relationship(
        "Company",
        foreign_keys=[company_id],
        viewonly=True,
        lazy="select",
    )

    # Constraints and indexes
    __table_args__ = (
        Index("ix_templates_user_shortcut", "user_id", "shortcut"),
        Index("ix_templates_company_category", "company_id", "category"),
    )

    @classmethod
    def create(
        cls,
        db: Session,
        name: str,
        shortcut: str,
        content: str,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        category: str = "general",
        is_system: bool = False,
    ) -> "TextTemplate":
        """Create a new text template"""
        template = cls(
            name=name,
            shortcut=shortcut,
            content=content,
            user_id=user_id,
            company_id=company_id,
            category=category,
            is_system=is_system,
        )
        db.add(template)
        return template

    @classmethod
    def get_for_user(
        cls,
        db: Session,
        user_id: int,
        company_id: Optional[int] = None,
        category: Optional[str] = None,
        include_system: bool = True,
    ) -> List["TextTemplate"]:
        """Get templates available to a user"""
        from sqlalchemy import or_

        query = db.query(cls).filter(cls.is_active == True)

        # Build conditions for user access
        conditions = [cls.user_id == user_id]

        if company_id:
            conditions.append(
                (cls.company_id == company_id) & (cls.user_id == None)
            )

        if include_system:
            conditions.append(cls.is_system == True)

        query = query.filter(or_(*conditions))

        if category:
            query = query.filter(cls.category == category)

        return query.order_by(cls.use_count.desc(), cls.name).all()

    @classmethod
    def find_by_shortcut(
        cls,
        db: Session,
        shortcut: str,
        user_id: int,
        company_id: Optional[int] = None,
    ) -> Optional["TextTemplate"]:
        """Find a template by shortcut"""
        from sqlalchemy import or_

        query = db.query(cls).filter(
            cls.shortcut == shortcut,
            cls.is_active == True,
        )

        conditions = [cls.user_id == user_id]

        if company_id:
            conditions.append(
                (cls.company_id == company_id) & (cls.user_id == None)
            )

        conditions.append(cls.is_system == True)

        query = query.filter(or_(*conditions))

        # Prefer user's own template, then company, then system
        return query.order_by(
            (cls.user_id == user_id).desc(),
            (cls.company_id == company_id).desc() if company_id else cls.id,
        ).first()

    @classmethod
    def search(
        cls,
        db: Session,
        query_str: str,
        user_id: int,
        company_id: Optional[int] = None,
        limit: int = 10,
    ) -> List["TextTemplate"]:
        """Search templates by name or shortcut"""
        from sqlalchemy import or_

        search = f"%{query_str}%"

        query = db.query(cls).filter(
            cls.is_active == True,
            or_(
                cls.name.ilike(search),
                cls.shortcut.ilike(search),
            ),
        )

        conditions = [cls.user_id == user_id]

        if company_id:
            conditions.append(
                (cls.company_id == company_id) & (cls.user_id == None)
            )

        conditions.append(cls.is_system == True)

        query = query.filter(or_(*conditions))

        return query.order_by(cls.use_count.desc()).limit(limit).all()

    def increment_use_count(self) -> None:
        """Increment the use count"""
        self.use_count = (self.use_count or 0) + 1

    def __repr__(self) -> str:
        return f"<TextTemplate(id={self.id}, name='{self.name}', shortcut='{self.shortcut}')>"
