"""
Activity Service

Business logic for CRM activities.
"""

import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from ..models.activity import CRMActivity, ActivityStatus
from ..schemas.activity import ActivityCreate, ActivityUpdate

logger = logging.getLogger(__name__)


class ActivityService:
    """Service for managing CRM activities."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        company_id: Optional[int] = None,
        res_model: Optional[str] = None,
        res_id: Optional[int] = None,
        user_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
        activity_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[CRMActivity], int]:
        """Get all activities with filters and pagination."""
        query = self.db.query(CRMActivity).options(
            joinedload(CRMActivity.user),
            joinedload(CRMActivity.assigned_to),
            joinedload(CRMActivity.completed_by)
        )

        if company_id is not None:
            query = query.filter(CRMActivity.company_id == company_id)

        if res_model is not None:
            query = query.filter(CRMActivity.res_model == res_model)

        if res_id is not None:
            query = query.filter(CRMActivity.res_id == res_id)

        if user_id is not None:
            query = query.filter(CRMActivity.user_id == user_id)

        if assigned_to_id is not None:
            query = query.filter(CRMActivity.assigned_to_id == assigned_to_id)

        if activity_type is not None:
            query = query.filter(CRMActivity.activity_type == activity_type)

        if status is not None:
            query = query.filter(CRMActivity.status == status)

        total = query.count()
        items = query.order_by(CRMActivity.date_start.desc().nullsfirst(), CRMActivity.created_at.desc()).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, activity_id: int) -> Optional[CRMActivity]:
        """Get an activity by ID."""
        return self.db.query(CRMActivity).options(
            joinedload(CRMActivity.user),
            joinedload(CRMActivity.assigned_to),
            joinedload(CRMActivity.completed_by)
        ).filter(CRMActivity.id == activity_id).first()

    def get_for_record(self, res_model: str, res_id: int) -> List[CRMActivity]:
        """Get all activities for a specific record."""
        return self.db.query(CRMActivity).options(
            joinedload(CRMActivity.user),
            joinedload(CRMActivity.assigned_to)
        ).filter(
            CRMActivity.res_model == res_model,
            CRMActivity.res_id == res_id
        ).order_by(CRMActivity.created_at.desc()).all()

    def get_upcoming(
        self,
        company_id: int,
        user_id: Optional[int] = None,
        days: int = 7
    ) -> List[CRMActivity]:
        """Get upcoming activities for the next N days."""
        from datetime import timedelta

        end_date = datetime.utcnow() + timedelta(days=days)

        query = self.db.query(CRMActivity).filter(
            CRMActivity.company_id == company_id,
            CRMActivity.status.in_([ActivityStatus.PLANNED, ActivityStatus.IN_PROGRESS]),
            CRMActivity.date_start <= end_date
        )

        if user_id:
            query = query.filter(
                (CRMActivity.user_id == user_id) |
                (CRMActivity.assigned_to_id == user_id)
            )

        return query.order_by(CRMActivity.date_start).all()

    def get_overdue(
        self,
        company_id: int,
        user_id: Optional[int] = None,
    ) -> List[CRMActivity]:
        """Get overdue activities."""
        now = datetime.utcnow()

        query = self.db.query(CRMActivity).filter(
            CRMActivity.company_id == company_id,
            CRMActivity.status.in_([ActivityStatus.PLANNED, ActivityStatus.IN_PROGRESS]),
            (
                (CRMActivity.date_due < now.date()) |
                (CRMActivity.date_start < now)
            )
        )

        if user_id:
            query = query.filter(
                (CRMActivity.user_id == user_id) |
                (CRMActivity.assigned_to_id == user_id)
            )

        return query.order_by(CRMActivity.date_start).all()

    def create(
        self,
        data: ActivityCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> CRMActivity:
        """Create a new activity."""
        activity_data = data.model_dump()

        # Set user_id if not provided
        if not activity_data.get("user_id"):
            activity_data["user_id"] = user_id

        activity = CRMActivity(
            **activity_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)

        # Update activity count on related record
        self._update_record_activity_count(activity.res_model, activity.res_id)

        logger.info(f"Created activity: {activity.subject}")
        return activity

    def update(self, activity_id: int, data: ActivityUpdate, user_id: Optional[int] = None) -> Optional[CRMActivity]:
        """Update an activity."""
        activity = self.get_by_id(activity_id)
        if not activity:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(activity, field, value)

        activity.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(activity)

        logger.info(f"Updated activity: {activity.subject}")
        return activity

    def delete(self, activity_id: int) -> bool:
        """Delete an activity."""
        activity = self.get_by_id(activity_id)
        if not activity:
            return False

        res_model = activity.res_model
        res_id = activity.res_id
        subject = activity.subject

        self.db.delete(activity)
        self.db.commit()

        # Update activity count on related record
        self._update_record_activity_count(res_model, res_id)

        logger.info(f"Deleted activity: {subject}")
        return True

    def complete(
        self,
        activity_id: int,
        user_id: int,
        outcome: Optional[str] = None
    ) -> Optional[CRMActivity]:
        """Mark activity as completed."""
        activity = self.get_by_id(activity_id)
        if not activity:
            return None

        activity.mark_complete(user_id, outcome)
        activity.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(activity)

        # Update last activity date on related record
        self._update_record_last_activity(activity.res_model, activity.res_id)

        logger.info(f"Completed activity: {activity.subject}")
        return activity

    def cancel(self, activity_id: int, user_id: Optional[int] = None) -> Optional[CRMActivity]:
        """Cancel an activity."""
        activity = self.get_by_id(activity_id)
        if not activity:
            return None

        activity.mark_cancelled()
        activity.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(activity)

        logger.info(f"Cancelled activity: {activity.subject}")
        return activity

    def _update_record_activity_count(self, res_model: str, res_id: int) -> None:
        """Update activity count on related record."""
        count = self.db.query(CRMActivity).filter(
            CRMActivity.res_model == res_model,
            CRMActivity.res_id == res_id
        ).count()

        # Import models dynamically to avoid circular imports
        if res_model == "lead":
            from ..models.lead import Lead
            self.db.query(Lead).filter(Lead.id == res_id).update({"activity_count": count})
        elif res_model == "opportunity":
            from ..models.opportunity import Opportunity
            self.db.query(Opportunity).filter(Opportunity.id == res_id).update({"activity_count": count})

    def _update_record_last_activity(self, res_model: str, res_id: int) -> None:
        """Update last activity date on related record."""
        now = datetime.utcnow()

        if res_model == "lead":
            from ..models.lead import Lead
            self.db.query(Lead).filter(Lead.id == res_id).update({"date_last_activity": now})
        elif res_model == "opportunity":
            from ..models.opportunity import Opportunity
            self.db.query(Opportunity).filter(Opportunity.id == res_id).update({"date_last_activity": now})
