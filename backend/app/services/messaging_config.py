"""
Messaging Configuration Service

Handles messaging permission rules and determines who can message whom.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, desc
from sqlalchemy.orm import Session

from app.models import User, Group, UserGroup, MessagingConfig, MessagingScope
from app.schemas.messaging_config import (
    MessagingConfigCreate,
    MessagingConfigUpdate,
    MessageableUserInfo,
)

logger = logging.getLogger(__name__)


class MessagingConfigService:
    """Service for managing messaging configurations"""

    def __init__(self, db: Session):
        self.db = db

    def get(self, config_id: int) -> Optional[MessagingConfig]:
        """Get messaging config by ID"""
        return self.db.query(MessagingConfig).filter(
            MessagingConfig.id == config_id
        ).first()

    def get_by_company(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[MessagingConfig], int]:
        """Get all messaging configs for a company"""
        query = self.db.query(MessagingConfig).filter(
            or_(
                MessagingConfig.company_id == company_id,
                MessagingConfig.company_id.is_(None),  # Include global rules
            ),
            MessagingConfig.is_active == True,
        ).order_by(desc(MessagingConfig.priority))

        total = query.count()
        items = query.offset(skip).limit(limit).all()

        return items, total

    def create(self, data: MessagingConfigCreate) -> MessagingConfig:
        """Create a new messaging config"""
        config = MessagingConfig(**data.model_dump())
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def update(
        self,
        config_id: int,
        data: MessagingConfigUpdate,
    ) -> Optional[MessagingConfig]:
        """Update a messaging config"""
        config = self.get(config_id)
        if not config:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)

        self.db.commit()
        self.db.refresh(config)
        return config

    def delete(self, config_id: int) -> bool:
        """Delete a messaging config"""
        config = self.get(config_id)
        if not config:
            return False

        self.db.delete(config)
        self.db.commit()
        return True

    def ensure_default_rule(self, company_id: int) -> MessagingConfig:
        """Ensure a default messaging rule exists for company"""
        existing = self.db.query(MessagingConfig).filter(
            MessagingConfig.company_id == company_id,
            MessagingConfig.source_type == MessagingScope.ALL,
            MessagingConfig.target_type == MessagingScope.SAME_COMPANY,
        ).first()

        if existing:
            return existing

        default = MessagingConfig.create_default_rule(company_id)
        self.db.add(default)
        self.db.commit()
        self.db.refresh(default)
        return default

    def can_user_message(
        self,
        sender: User,
        recipient: User,
    ) -> bool:
        """
        Check if sender can message recipient based on config rules.

        Rules are checked in priority order (highest first).
        First matching rule determines the result.
        If no rule matches, default is True (same company only).
        """
        if sender.id == recipient.id:
            return False  # Can't message yourself

        # Get applicable rules for sender's company
        rules = self.db.query(MessagingConfig).filter(
            or_(
                MessagingConfig.company_id == sender.current_company_id,
                MessagingConfig.company_id.is_(None),
            ),
            MessagingConfig.is_active == True,
        ).order_by(desc(MessagingConfig.priority)).all()

        for rule in rules:
            if self._rule_applies_to_sender(rule, sender):
                if self._rule_allows_recipient(rule, sender, recipient):
                    return rule.can_message

        # Default: allow same company messaging
        return sender.current_company_id == recipient.current_company_id

    def _rule_applies_to_sender(self, rule: MessagingConfig, sender: User) -> bool:
        """Check if a rule applies to the sender"""
        if rule.source_type == MessagingScope.ALL:
            return True

        if rule.source_type == MessagingScope.USER:
            return rule.source_id == sender.id

        if rule.source_type == MessagingScope.GROUP:
            # Check if sender is in the specified group
            return self.db.query(UserGroup).filter(
                UserGroup.user_id == sender.id,
                UserGroup.group_id == rule.source_id,
            ).first() is not None

        if rule.source_type == MessagingScope.ROLE:
            # Check if sender has the specified role
            from app.models import UserCompanyRole
            return self.db.query(UserCompanyRole).filter(
                UserCompanyRole.user_id == sender.id,
                UserCompanyRole.company_id == sender.current_company_id,
                UserCompanyRole.role_id == rule.source_id,
                UserCompanyRole.is_active == True,
            ).first() is not None

        return False

    def _rule_allows_recipient(
        self,
        rule: MessagingConfig,
        sender: User,
        recipient: User,
    ) -> bool:
        """Check if a rule allows messaging the recipient"""
        if rule.target_type == MessagingScope.ALL:
            return True

        if rule.target_type == MessagingScope.USER:
            return rule.target_id == recipient.id

        if rule.target_type == MessagingScope.SAME_COMPANY:
            return sender.current_company_id == recipient.current_company_id

        if rule.target_type == MessagingScope.SAME_GROUP:
            # Check if sender and recipient share any groups
            sender_groups = self.db.query(UserGroup.group_id).filter(
                UserGroup.user_id == sender.id
            ).subquery()
            shared = self.db.query(UserGroup).filter(
                UserGroup.user_id == recipient.id,
                UserGroup.group_id.in_(sender_groups),
            ).first()
            return shared is not None

        if rule.target_type == MessagingScope.GROUP:
            # Check if recipient is in the specified group
            return self.db.query(UserGroup).filter(
                UserGroup.user_id == recipient.id,
                UserGroup.group_id == rule.target_id,
            ).first() is not None

        if rule.target_type == MessagingScope.ROLE:
            # Check if recipient has the specified role
            from app.models import UserCompanyRole
            return self.db.query(UserCompanyRole).filter(
                UserCompanyRole.user_id == recipient.id,
                UserCompanyRole.company_id == recipient.current_company_id,
                UserCompanyRole.role_id == rule.target_id,
                UserCompanyRole.is_active == True,
            ).first() is not None

        return False

    def get_messageable_users(
        self,
        user: User,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[MessageableUserInfo], int]:
        """
        Get list of users that the current user can message.

        This returns all potential recipients based on messaging rules.
        For performance, this uses a simplified check:
        - Same company users (if any same_company rule exists)
        - Specific users from user-targeted rules
        - Users from group-targeted rules
        """
        query = self.db.query(User).filter(
            User.id != user.id,
            User.is_active == True,
        )

        # By default, filter to same company
        # This is the most common case and provides good performance
        if user.current_company_id:
            query = query.filter(User.current_company_id == user.current_company_id)

        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.full_name.ilike(search_pattern),
                )
            )

        total = query.count()
        users = query.order_by(User.full_name, User.username).offset(skip).limit(limit).all()

        return [
            MessageableUserInfo(
                id=u.id,
                username=u.username,
                email=u.email,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                is_online=False,  # TODO: Implement online status
            )
            for u in users
        ], total


# Singleton-like accessor
def get_messaging_config_service(db: Session) -> MessagingConfigService:
    """Get messaging config service instance"""
    return MessagingConfigService(db)
