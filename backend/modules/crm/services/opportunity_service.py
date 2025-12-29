"""
Opportunity Service

Business logic for CRM opportunities.
"""

import logging
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract

from ..models.opportunity import Opportunity
from ..models.stage import Stage
from ..models.tag import Tag
from ..schemas.opportunity import (
    OpportunityCreate, OpportunityUpdate,
    OpportunityKanban, OpportunityKanbanColumn, OpportunityResponse,
    OpportunityForecast
)

logger = logging.getLogger(__name__)


class OpportunityService:
    """Service for managing CRM opportunities."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        company_id: Optional[int] = None,
        pipeline_id: Optional[int] = None,
        stage_id: Optional[int] = None,
        user_id: Optional[int] = None,
        account_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Opportunity], int]:
        """Get all opportunities with filters and pagination."""
        query = self.db.query(Opportunity).options(
            joinedload(Opportunity.stage),
            joinedload(Opportunity.user),
            joinedload(Opportunity.account),
            joinedload(Opportunity.contact),
            joinedload(Opportunity.tags)
        )

        if company_id is not None:
            query = query.filter(Opportunity.company_id == company_id)

        if pipeline_id is not None:
            query = query.filter(Opportunity.pipeline_id == pipeline_id)

        if stage_id is not None:
            query = query.filter(Opportunity.stage_id == stage_id)

        if user_id is not None:
            query = query.filter(Opportunity.user_id == user_id)

        if account_id is not None:
            query = query.filter(Opportunity.account_id == account_id)

        if is_won is not None:
            query = query.filter(Opportunity.is_won == is_won)

        if is_lost is not None:
            query = query.filter(Opportunity.is_lost == is_lost)

        if priority is not None:
            query = query.filter(Opportunity.priority == priority)

        if search:
            search_term = f"%{search}%"
            query = query.filter(Opportunity.name.ilike(search_term))

        total = query.count()
        items = query.order_by(Opportunity.created_at.desc()).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, opportunity_id: int) -> Optional[Opportunity]:
        """Get an opportunity by ID."""
        return self.db.query(Opportunity).options(
            joinedload(Opportunity.stage),
            joinedload(Opportunity.user),
            joinedload(Opportunity.account),
            joinedload(Opportunity.contact),
            joinedload(Opportunity.tags)
        ).filter(Opportunity.id == opportunity_id).first()

    def create(
        self,
        data: OpportunityCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Opportunity:
        """Create a new opportunity."""
        # Get tags if provided
        tags = []
        if data.tag_ids:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()

        opp_data = data.model_dump(exclude={"tag_ids"})

        opportunity = Opportunity(
            **opp_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        if tags:
            opportunity.tags = tags

        # Calculate expected revenue
        opportunity.update_expected_revenue()

        # If no stage set, get first stage from pipeline
        if not opportunity.stage_id and opportunity.pipeline_id:
            first_stage = self.db.query(Stage).filter(
                Stage.pipeline_id == opportunity.pipeline_id,
                Stage.is_won == False,
                Stage.is_lost == False
            ).order_by(Stage.sequence).first()
            if first_stage:
                opportunity.stage_id = first_stage.id

        self.db.add(opportunity)
        self.db.commit()
        self.db.refresh(opportunity)

        logger.info(f"Created opportunity: {opportunity.name}")
        return opportunity

    def update(self, opportunity_id: int, data: OpportunityUpdate, user_id: Optional[int] = None) -> Optional[Opportunity]:
        """Update an opportunity."""
        opportunity = self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})

        # Update tags if provided
        if data.tag_ids is not None:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
            opportunity.tags = tags

        for field, value in update_data.items():
            setattr(opportunity, field, value)

        opportunity.updated_by_id = user_id
        opportunity.date_last_activity = datetime.utcnow()
        opportunity.update_expected_revenue()

        self.db.commit()
        self.db.refresh(opportunity)

        logger.info(f"Updated opportunity: {opportunity.name}")
        return opportunity

    def delete(self, opportunity_id: int) -> bool:
        """Delete an opportunity (soft delete)."""
        opportunity = self.get_by_id(opportunity_id)
        if not opportunity:
            return False

        opportunity.is_deleted = True
        opportunity.deleted_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Deleted opportunity: {opportunity.name}")
        return True

    def move_stage(self, opportunity_id: int, stage_id: int, user_id: Optional[int] = None) -> Optional[Opportunity]:
        """Move opportunity to a different stage."""
        opportunity = self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        stage = self.db.query(Stage).filter(Stage.id == stage_id).first()
        if not stage:
            return None

        opportunity.stage_id = stage_id
        opportunity.probability = stage.probability
        opportunity.date_last_activity = datetime.utcnow()
        opportunity.updated_by_id = user_id
        opportunity.update_expected_revenue()

        # Auto-mark as won/lost based on stage
        if stage.is_won:
            opportunity.mark_won()
        elif stage.is_lost:
            opportunity.is_lost = True
            opportunity.date_closed = date.today()

        self.db.commit()
        self.db.refresh(opportunity)

        logger.info(f"Moved opportunity {opportunity.name} to stage {stage.name}")
        return opportunity

    def mark_won(self, opportunity_id: int, user_id: Optional[int] = None) -> Optional[Opportunity]:
        """Mark opportunity as won."""
        opportunity = self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        opportunity.mark_won()
        opportunity.updated_by_id = user_id

        # Move to won stage if exists
        from ..services.stage_service import StageService
        stage_service = StageService(self.db)
        won_stage = stage_service.get_won_stage(opportunity.pipeline_id)
        if won_stage:
            opportunity.stage_id = won_stage.id

        self.db.commit()
        self.db.refresh(opportunity)

        logger.info(f"Marked opportunity {opportunity.name} as won")
        return opportunity

    def mark_lost(
        self,
        opportunity_id: int,
        reason: Optional[str] = None,
        competitor: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Optional[Opportunity]:
        """Mark opportunity as lost."""
        opportunity = self.get_by_id(opportunity_id)
        if not opportunity:
            return None

        opportunity.mark_lost(reason, competitor)
        opportunity.updated_by_id = user_id

        # Move to lost stage if exists
        from ..services.stage_service import StageService
        stage_service = StageService(self.db)
        lost_stage = stage_service.get_lost_stage(opportunity.pipeline_id)
        if lost_stage:
            opportunity.stage_id = lost_stage.id

        self.db.commit()
        self.db.refresh(opportunity)

        logger.info(f"Marked opportunity {opportunity.name} as lost")
        return opportunity

    def get_kanban(
        self,
        pipeline_id: int,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> OpportunityKanban:
        """Get opportunities grouped by stage for Kanban view."""
        from ..services.pipeline_service import PipelineService
        from ..services.stage_service import StageService

        pipeline_service = PipelineService(self.db)
        stage_service = StageService(self.db)

        pipeline = pipeline_service.get_by_id(pipeline_id)
        if not pipeline:
            raise ValueError(f"Pipeline {pipeline_id} not found")

        stages = stage_service.get_by_pipeline(pipeline_id)

        columns = []
        for stage in stages:
            query = self.db.query(Opportunity).options(
                joinedload(Opportunity.stage),
                joinedload(Opportunity.user),
                joinedload(Opportunity.account),
                joinedload(Opportunity.contact),
                joinedload(Opportunity.tags)
            ).filter(Opportunity.stage_id == stage.id)

            if company_id:
                query = query.filter(Opportunity.company_id == company_id)

            if user_id:
                query = query.filter(Opportunity.user_id == user_id)

            opportunities = query.order_by(Opportunity.created_at.desc()).all()

            total_amount = sum(opp.amount or Decimal(0) for opp in opportunities)
            weighted_amount = sum(opp.weighted_amount for opp in opportunities)

            column = OpportunityKanbanColumn(
                stage_id=stage.id,
                stage_name=stage.name,
                stage_color=stage.color,
                sequence=stage.sequence,
                count=len(opportunities),
                total_amount=total_amount,
                weighted_amount=weighted_amount,
                opportunities=[OpportunityResponse.model_validate(opp) for opp in opportunities]
            )
            columns.append(column)

        return OpportunityKanban(
            columns=columns,
            pipeline_id=pipeline.id,
            pipeline_name=pipeline.name
        )

    def get_forecast(
        self,
        company_id: int,
        year: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> List[OpportunityForecast]:
        """Get revenue forecast by month."""
        if year is None:
            year = date.today().year

        forecasts = []

        for month in range(1, 13):
            query = self.db.query(Opportunity).filter(
                Opportunity.company_id == company_id,
                extract('year', Opportunity.date_deadline) == year,
                extract('month', Opportunity.date_deadline) == month
            )

            if user_id:
                query = query.filter(Opportunity.user_id == user_id)

            opportunities = query.all()

            expected = sum(opp.amount or Decimal(0) for opp in opportunities if opp.is_open)
            weighted = sum(opp.weighted_amount for opp in opportunities if opp.is_open)
            won = [opp for opp in opportunities if opp.is_won]
            won_revenue = sum(opp.amount or Decimal(0) for opp in won)

            forecast = OpportunityForecast(
                period=f"{year}-{month:02d}",
                expected_revenue=expected,
                weighted_revenue=weighted,
                opportunity_count=len([o for o in opportunities if o.is_open]),
                won_count=len(won),
                won_revenue=won_revenue
            )
            forecasts.append(forecast)

        return forecasts
