"""
Demo Service

Business logic for demo items.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from ..models.demo_item import DemoItem
from ..schemas.demo_item import DemoItemCreate, DemoItemUpdate

logger = logging.getLogger(__name__)


class DemoService:
    """
    Service for managing demo items.

    Provides CRUD operations and business logic for demo items.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        is_active: Optional[bool] = None,
        company_id: Optional[int] = None,
    ) -> tuple[List[DemoItem], int]:
        """
        Get all demo items with pagination.

        Args:
            skip: Number of items to skip
            limit: Maximum items to return
            is_active: Filter by active status
            company_id: Filter by company

        Returns:
            Tuple of (items, total_count)
        """
        query = self.db.query(DemoItem)

        if is_active is not None:
            query = query.filter(DemoItem.is_active == is_active)

        if company_id is not None:
            query = query.filter(DemoItem.company_id == company_id)

        total = query.count()
        items = query.order_by(DemoItem.priority.desc(), DemoItem.name).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, item_id: int) -> Optional[DemoItem]:
        """Get a demo item by ID."""
        return self.db.query(DemoItem).filter(DemoItem.id == item_id).first()

    def get_by_code(self, code: str) -> Optional[DemoItem]:
        """Get a demo item by code."""
        return self.db.query(DemoItem).filter(DemoItem.code == code.upper()).first()

    def create(
        self,
        data: DemoItemCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> DemoItem:
        """
        Create a new demo item.

        Args:
            data: Item creation data
            company_id: Company ID
            user_id: Creating user ID

        Returns:
            Created demo item
        """
        # Check for duplicate code
        existing = self.get_by_code(data.code)
        if existing:
            raise ValueError(f"Item with code '{data.code}' already exists")

        item = DemoItem(
            name=data.name,
            code=data.code.upper(),
            description=data.description,
            is_active=data.is_active,
            priority=data.priority,
            tags=data.tags,
            extra_data=data.extra_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)

        logger.info(f"Created demo item: {item.code}")
        return item

    def update(self, item_id: int, data: DemoItemUpdate) -> Optional[DemoItem]:
        """
        Update a demo item.

        Args:
            item_id: Item ID to update
            data: Update data

        Returns:
            Updated item or None if not found
        """
        item = self.get_by_id(item_id)
        if not item:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(item, field, value)

        self.db.commit()
        self.db.refresh(item)

        logger.info(f"Updated demo item: {item.code}")
        return item

    def delete(self, item_id: int) -> bool:
        """
        Delete a demo item.

        Args:
            item_id: Item ID to delete

        Returns:
            True if deleted, False if not found
        """
        item = self.get_by_id(item_id)
        if not item:
            return False

        code = item.code
        self.db.delete(item)
        self.db.commit()

        logger.info(f"Deleted demo item: {code}")
        return True

    def toggle_active(self, item_id: int) -> Optional[DemoItem]:
        """Toggle the active status of an item."""
        item = self.get_by_id(item_id)
        if not item:
            return None

        item.is_active = not item.is_active
        self.db.commit()
        self.db.refresh(item)

        return item
