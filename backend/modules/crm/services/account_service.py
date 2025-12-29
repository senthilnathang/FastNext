"""
Account Service

Business logic for CRM accounts.
"""

import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from ..models.account import Account
from ..models.tag import Tag
from ..schemas.account import AccountCreate, AccountUpdate

logger = logging.getLogger(__name__)


class AccountService:
    """Service for managing CRM accounts."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
        account_type: Optional[str] = None,
        industry: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Account], int]:
        """Get all accounts with filters and pagination."""
        query = self.db.query(Account).options(
            joinedload(Account.user),
            joinedload(Account.parent),
            joinedload(Account.tags)
        )

        if company_id is not None:
            query = query.filter(Account.company_id == company_id)

        if user_id is not None:
            query = query.filter(Account.user_id == user_id)

        if account_type is not None:
            query = query.filter(Account.account_type == account_type)

        if industry is not None:
            query = query.filter(Account.industry == industry)

        if is_active is not None:
            query = query.filter(Account.is_active == is_active)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Account.name.ilike(search_term)) |
                (Account.website.ilike(search_term)) |
                (Account.phone.ilike(search_term))
            )

        total = query.count()
        items = query.order_by(Account.name).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, account_id: int) -> Optional[Account]:
        """Get an account by ID."""
        return self.db.query(Account).options(
            joinedload(Account.user),
            joinedload(Account.parent),
            joinedload(Account.tags),
            joinedload(Account.contacts),
            joinedload(Account.opportunities)
        ).filter(Account.id == account_id).first()

    def get_by_name(self, name: str, company_id: int) -> Optional[Account]:
        """Get an account by name within a company."""
        return self.db.query(Account).filter(
            Account.name == name,
            Account.company_id == company_id
        ).first()

    def create(
        self,
        data: AccountCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Account:
        """Create a new account."""
        # Get tags if provided
        tags = []
        if data.tag_ids:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()

        account_data = data.model_dump(exclude={"tag_ids"})

        account = Account(
            **account_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        if tags:
            account.tags = tags

        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)

        logger.info(f"Created account: {account.name}")
        return account

    def update(self, account_id: int, data: AccountUpdate, user_id: Optional[int] = None) -> Optional[Account]:
        """Update an account."""
        account = self.get_by_id(account_id)
        if not account:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})

        # Update tags if provided
        if data.tag_ids is not None:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
            account.tags = tags

        for field, value in update_data.items():
            setattr(account, field, value)

        account.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(account)

        logger.info(f"Updated account: {account.name}")
        return account

    def delete(self, account_id: int) -> bool:
        """Delete an account (soft delete)."""
        account = self.get_by_id(account_id)
        if not account:
            return False

        account.is_deleted = True
        account.deleted_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Deleted account: {account.name}")
        return True

    def get_subsidiaries(self, account_id: int) -> List[Account]:
        """Get all subsidiary accounts."""
        return self.db.query(Account).filter(
            Account.parent_id == account_id,
            Account.is_deleted == False
        ).all()

    def get_hierarchy(self, account_id: int) -> List[Account]:
        """Get account hierarchy (parent chain)."""
        hierarchy = []
        account = self.get_by_id(account_id)

        while account and account.parent_id:
            parent = self.get_by_id(account.parent_id)
            if parent:
                hierarchy.append(parent)
                account = parent
            else:
                break

        return hierarchy
