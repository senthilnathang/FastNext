"""
Announcement Service

Business logic for announcement operations.
"""

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.settings import Announcement, AnnouncementView, AnnouncementTarget
from ..schemas.settings import AnnouncementCreate, AnnouncementUpdate


class AnnouncementService:
    """Service class for announcement operations."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, announcement_id: int, company_id: int) -> Optional[Announcement]:
        """Get an announcement by ID."""
        return self.db.query(Announcement).filter(
            Announcement.id == announcement_id,
            Announcement.company_id == company_id,
            Announcement.is_deleted == False
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        is_published: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Announcement], int]:
        """List announcements with filtering."""
        query = self.db.query(Announcement).filter(
            Announcement.company_id == company_id,
            Announcement.is_deleted == False
        )

        if is_active is not None:
            query = query.filter(Announcement.is_active == is_active)

        if is_published:
            now = datetime.utcnow()
            query = query.filter(
                Announcement.publish_date <= now,
                or_(
                    Announcement.expire_date.is_(None),
                    Announcement.expire_date >= now
                )
            )

        total = query.count()
        announcements = query.order_by(
            Announcement.is_pinned.desc(),
            Announcement.publish_date.desc()
        ).offset(skip).limit(limit).all()

        return announcements, total

    def list_for_user(
        self,
        user_id: int,
        company_id: int,
        department_id: Optional[int] = None,
        role_ids: Optional[List[int]] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Announcement], int]:
        """List announcements visible to a specific user."""
        now = datetime.utcnow()

        query = self.db.query(Announcement).filter(
            Announcement.company_id == company_id,
            Announcement.is_deleted == False,
            Announcement.is_active == True,
            Announcement.publish_date <= now,
            or_(
                Announcement.expire_date.is_(None),
                Announcement.expire_date >= now
            )
        )

        # Filter by target audience
        target_filters = [Announcement.target == AnnouncementTarget.ALL]

        if department_id:
            target_filters.append(
                (Announcement.target == AnnouncementTarget.DEPARTMENT) &
                (Announcement.target_ids.contains([department_id]))
            )

        if role_ids:
            for role_id in role_ids:
                target_filters.append(
                    (Announcement.target == AnnouncementTarget.ROLE) &
                    (Announcement.target_ids.contains([role_id]))
                )

        target_filters.append(
            (Announcement.target == AnnouncementTarget.SPECIFIC) &
            (Announcement.target_ids.contains([user_id]))
        )

        query = query.filter(or_(*target_filters))

        total = query.count()
        announcements = query.order_by(
            Announcement.is_pinned.desc(),
            Announcement.publish_date.desc()
        ).offset(skip).limit(limit).all()

        return announcements, total

    def create(self, data: AnnouncementCreate, author_id: int, company_id: int, user_id: int) -> Announcement:
        """Create a new announcement."""
        announcement = Announcement(
            **data.model_dump(),
            author_id=author_id,
            company_id=company_id,
            created_by=user_id
        )

        if not announcement.publish_date:
            announcement.publish_date = datetime.utcnow()

        self.db.add(announcement)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def update(
        self,
        announcement_id: int,
        data: AnnouncementUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[Announcement]:
        """Update an announcement."""
        announcement = self.get(announcement_id, company_id)
        if not announcement:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(announcement, field, value)

        announcement.updated_by = user_id
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def delete(self, announcement_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete an announcement."""
        announcement = self.get(announcement_id, company_id)
        if not announcement:
            return False

        announcement.soft_delete(user_id)
        self.db.commit()
        return True

    def mark_as_viewed(self, announcement_id: int, user_id: int, company_id: int) -> AnnouncementView:
        """Mark an announcement as viewed by a user."""
        # Check if already viewed
        view = self.db.query(AnnouncementView).filter(
            AnnouncementView.announcement_id == announcement_id,
            AnnouncementView.user_id == user_id
        ).first()

        if view:
            return view

        view = AnnouncementView(
            announcement_id=announcement_id,
            user_id=user_id,
            company_id=company_id
        )
        self.db.add(view)
        self.db.commit()
        self.db.refresh(view)
        return view

    def acknowledge(self, announcement_id: int, user_id: int, company_id: int) -> Optional[AnnouncementView]:
        """Acknowledge an announcement."""
        view = self.db.query(AnnouncementView).filter(
            AnnouncementView.announcement_id == announcement_id,
            AnnouncementView.user_id == user_id
        ).first()

        if not view:
            view = AnnouncementView(
                announcement_id=announcement_id,
                user_id=user_id,
                company_id=company_id
            )
            self.db.add(view)

        view.acknowledge()
        self.db.commit()
        self.db.refresh(view)
        return view

    def get_view_stats(self, announcement_id: int, company_id: int) -> dict:
        """Get view and acknowledgment statistics for an announcement."""
        views = self.db.query(AnnouncementView).filter(
            AnnouncementView.announcement_id == announcement_id,
            AnnouncementView.company_id == company_id
        ).all()

        return {
            "view_count": len(views),
            "acknowledgment_count": sum(1 for v in views if v.acknowledged_at is not None)
        }
