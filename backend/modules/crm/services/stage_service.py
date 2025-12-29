"""
Stage Service

Business logic for CRM pipeline stages.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models.stage import Stage
from ..schemas.stage import StageCreate, StageUpdate

logger = logging.getLogger(__name__)


class StageService:
    """Service for managing CRM pipeline stages."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        pipeline_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> Tuple[List[Stage], int]:
        """Get all stages with pagination."""
        query = self.db.query(Stage)

        if pipeline_id is not None:
            query = query.filter(Stage.pipeline_id == pipeline_id)

        if company_id is not None:
            query = query.filter(Stage.company_id == company_id)

        total = query.count()
        items = query.order_by(Stage.sequence).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, stage_id: int) -> Optional[Stage]:
        """Get a stage by ID."""
        return self.db.query(Stage).filter(Stage.id == stage_id).first()

    def get_by_pipeline(self, pipeline_id: int) -> List[Stage]:
        """Get all stages for a pipeline, ordered by sequence."""
        return self.db.query(Stage).filter(
            Stage.pipeline_id == pipeline_id
        ).order_by(Stage.sequence).all()

    def get_first_stage(self, pipeline_id: int) -> Optional[Stage]:
        """Get the first (lowest sequence) stage in a pipeline."""
        return self.db.query(Stage).filter(
            Stage.pipeline_id == pipeline_id,
            Stage.is_won == False,
            Stage.is_lost == False
        ).order_by(Stage.sequence).first()

    def get_won_stage(self, pipeline_id: int) -> Optional[Stage]:
        """Get the won stage for a pipeline."""
        return self.db.query(Stage).filter(
            Stage.pipeline_id == pipeline_id,
            Stage.is_won == True
        ).first()

    def get_lost_stage(self, pipeline_id: int) -> Optional[Stage]:
        """Get the lost stage for a pipeline."""
        return self.db.query(Stage).filter(
            Stage.pipeline_id == pipeline_id,
            Stage.is_lost == True
        ).first()

    def create(
        self,
        data: StageCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Stage:
        """Create a new stage."""
        stage = Stage(
            name=data.name,
            pipeline_id=data.pipeline_id,
            sequence=data.sequence,
            description=data.description,
            probability=data.probability,
            color=data.color,
            is_won=data.is_won,
            is_lost=data.is_lost,
            fold=data.fold,
            company_id=company_id,
            created_by_id=user_id,
        )

        self.db.add(stage)
        self.db.commit()
        self.db.refresh(stage)

        logger.info(f"Created stage: {stage.name}")
        return stage

    def update(self, stage_id: int, data: StageUpdate) -> Optional[Stage]:
        """Update a stage."""
        stage = self.get_by_id(stage_id)
        if not stage:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(stage, field, value)

        self.db.commit()
        self.db.refresh(stage)

        logger.info(f"Updated stage: {stage.name}")
        return stage

    def delete(self, stage_id: int) -> bool:
        """Delete a stage."""
        stage = self.get_by_id(stage_id)
        if not stage:
            return False

        # Check if stage has records (leads/opportunities)
        # For now, just delete
        name = stage.name
        self.db.delete(stage)
        self.db.commit()

        logger.info(f"Deleted stage: {name}")
        return True

    def reorder(self, pipeline_id: int, stage_ids: List[int]) -> List[Stage]:
        """Reorder stages in a pipeline."""
        stages = self.get_by_pipeline(pipeline_id)
        stage_map = {s.id: s for s in stages}

        for idx, stage_id in enumerate(stage_ids):
            if stage_id in stage_map:
                stage_map[stage_id].sequence = (idx + 1) * 10

        self.db.commit()

        return self.get_by_pipeline(pipeline_id)
