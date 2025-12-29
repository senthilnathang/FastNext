"""
Messaging Configuration Model

Defines who can message whom based on user, group, or role context.
Supports company-scoped messaging rules.
"""

from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, TimestampMixin


class MessagingScope(str, Enum):
    """Scope type for messaging rules"""
    USER = "user"           # Specific user
    GROUP = "group"         # Members of a group
    ROLE = "role"           # Users with a specific role
    ALL = "all"             # All users in company
    SAME_COMPANY = "same_company"  # Anyone in same company
    SAME_GROUP = "same_group"      # Anyone in same groups as source


class MessagingConfig(BaseModel, TimestampMixin):
    """
    Messaging configuration rules.

    Defines who can message whom within a company context.

    Examples:
    - User A can message all users: source_type=user, source_id=A, target_type=all
    - Group "Sales" can message Group "Support": source_type=group, source_id=Sales, target_type=group, target_id=Support
    - Role "Manager" can message everyone: source_type=role, source_id=Manager, target_type=all
    - Everyone can message same company: source_type=all, target_type=same_company (default rule)
    """
    __tablename__ = "messaging_configs"

    id = Column(Integer, primary_key=True, index=True)

    # Company scope (null = global/system rule)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)

    # Source (who is sending)
    source_type = Column(SQLEnum(MessagingScope), nullable=False, default=MessagingScope.ALL)
    source_id = Column(Integer, nullable=True)  # user_id, group_id, or role_id based on source_type

    # Target (who can be messaged)
    target_type = Column(SQLEnum(MessagingScope), nullable=False, default=MessagingScope.SAME_COMPANY)
    target_id = Column(Integer, nullable=True)  # user_id, group_id, or role_id based on target_type

    # Permissions
    can_message = Column(Boolean, default=True, nullable=False)
    can_see_online = Column(Boolean, default=True, nullable=False)
    can_see_typing = Column(Boolean, default=True, nullable=False)

    # Priority (higher = more specific, checked first)
    priority = Column(Integer, default=0, nullable=False)

    # Rule name for admin UI
    name = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)

    # Is this rule active?
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    company = relationship("Company", backref="messaging_configs")

    __table_args__ = (
        UniqueConstraint(
            'company_id', 'source_type', 'source_id', 'target_type', 'target_id',
            name='uq_messaging_config_rule'
        ),
    )

    def __repr__(self):
        return f"<MessagingConfig {self.source_type}:{self.source_id} -> {self.target_type}:{self.target_id}>"

    @classmethod
    def create_default_rule(cls, company_id: int):
        """Create a default rule allowing all users in a company to message each other"""
        return cls(
            company_id=company_id,
            name="Default - Same Company",
            description="Allow all users in the same company to message each other",
            source_type=MessagingScope.ALL,
            source_id=None,
            target_type=MessagingScope.SAME_COMPANY,
            target_id=None,
            can_message=True,
            can_see_online=True,
            can_see_typing=True,
            priority=0,
            is_active=True,
        )
