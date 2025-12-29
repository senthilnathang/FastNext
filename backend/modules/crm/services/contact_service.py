"""
Contact Service

Business logic for CRM contacts.
"""

import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from ..models.contact import Contact
from ..models.tag import Tag
from ..schemas.contact import ContactCreate, ContactUpdate

logger = logging.getLogger(__name__)


class ContactService:
    """Service for managing CRM contacts."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        company_id: Optional[int] = None,
        account_id: Optional[int] = None,
        user_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Contact], int]:
        """Get all contacts with filters and pagination."""
        query = self.db.query(Contact).options(
            joinedload(Contact.account),
            joinedload(Contact.user),
            joinedload(Contact.tags)
        )

        if company_id is not None:
            query = query.filter(Contact.company_id == company_id)

        if account_id is not None:
            query = query.filter(Contact.account_id == account_id)

        if user_id is not None:
            query = query.filter(Contact.user_id == user_id)

        if is_active is not None:
            query = query.filter(Contact.is_active == is_active)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Contact.first_name.ilike(search_term)) |
                (Contact.last_name.ilike(search_term)) |
                (Contact.email.ilike(search_term)) |
                (Contact.phone.ilike(search_term))
            )

        total = query.count()
        items = query.order_by(Contact.first_name, Contact.last_name).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, contact_id: int) -> Optional[Contact]:
        """Get a contact by ID."""
        return self.db.query(Contact).options(
            joinedload(Contact.account),
            joinedload(Contact.user),
            joinedload(Contact.tags)
        ).filter(Contact.id == contact_id).first()

    def get_by_email(self, email: str, company_id: int) -> Optional[Contact]:
        """Get a contact by email within a company."""
        return self.db.query(Contact).filter(
            Contact.email == email,
            Contact.company_id == company_id
        ).first()

    def create(
        self,
        data: ContactCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Contact:
        """Create a new contact."""
        # Get tags if provided
        tags = []
        if data.tag_ids:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()

        contact_data = data.model_dump(exclude={"tag_ids"})

        contact = Contact(
            **contact_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        if tags:
            contact.tags = tags

        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)

        logger.info(f"Created contact: {contact.full_name}")
        return contact

    def update(self, contact_id: int, data: ContactUpdate, user_id: Optional[int] = None) -> Optional[Contact]:
        """Update a contact."""
        contact = self.get_by_id(contact_id)
        if not contact:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})

        # Update tags if provided
        if data.tag_ids is not None:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
            contact.tags = tags

        for field, value in update_data.items():
            setattr(contact, field, value)

        contact.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(contact)

        logger.info(f"Updated contact: {contact.full_name}")
        return contact

    def delete(self, contact_id: int) -> bool:
        """Delete a contact (soft delete)."""
        contact = self.get_by_id(contact_id)
        if not contact:
            return False

        contact.is_deleted = True
        contact.deleted_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Deleted contact: {contact.full_name}")
        return True

    def set_primary(self, contact_id: int, user_id: Optional[int] = None) -> Optional[Contact]:
        """Set contact as primary for its account."""
        contact = self.get_by_id(contact_id)
        if not contact or not contact.account_id:
            return None

        # Unset other primary contacts for this account
        self.db.query(Contact).filter(
            Contact.account_id == contact.account_id,
            Contact.id != contact_id
        ).update({"is_primary": False})

        contact.is_primary = True
        contact.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(contact)

        logger.info(f"Set {contact.full_name} as primary contact")
        return contact
