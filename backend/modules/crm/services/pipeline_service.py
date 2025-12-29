"""
Pipeline Service

Business logic for CRM pipelines.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models.pipeline import Pipeline
from ..models.stage import Stage
from ..schemas.pipeline import PipelineCreate, PipelineUpdate

logger = logging.getLogger(__name__)


class PipelineService:
    """Service for managing CRM pipelines."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        is_active: Optional[bool] = None,
        company_id: Optional[int] = None,
    ) -> Tuple[List[Pipeline], int]:
        """Get all pipelines with pagination."""
        query = self.db.query(Pipeline)

        if is_active is not None:
            query = query.filter(Pipeline.is_active == is_active)

        if company_id is not None:
            query = query.filter(Pipeline.company_id == company_id)

        total = query.count()
        items = query.order_by(Pipeline.is_default.desc(), Pipeline.name).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, pipeline_id: int) -> Optional[Pipeline]:
        """Get a pipeline by ID."""
        return self.db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()

    def get_default(self, company_id: int) -> Optional[Pipeline]:
        """Get the default pipeline for a company."""
        return self.db.query(Pipeline).filter(
            Pipeline.company_id == company_id,
            Pipeline.is_default == True,
            Pipeline.is_active == True
        ).first()

    def create(
        self,
        data: PipelineCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Pipeline:
        """Create a new pipeline."""
        # If this is set as default, unset any existing default
        if data.is_default and company_id:
            self._unset_default(company_id)

        pipeline = Pipeline(
            name=data.name,
            description=data.description,
            is_default=data.is_default,
            is_active=data.is_active,
            company_id=company_id,
            created_by_id=user_id,
        )

        self.db.add(pipeline)
        self.db.commit()
        self.db.refresh(pipeline)

        logger.info(f"Created pipeline: {pipeline.name}")
        return pipeline

    def update(self, pipeline_id: int, data: PipelineUpdate, company_id: Optional[int] = None) -> Optional[Pipeline]:
        """Update a pipeline."""
        pipeline = self.get_by_id(pipeline_id)
        if not pipeline:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # If setting as default, unset existing default
        if update_data.get("is_default") and company_id:
            self._unset_default(company_id, exclude_id=pipeline_id)

        for field, value in update_data.items():
            setattr(pipeline, field, value)

        self.db.commit()
        self.db.refresh(pipeline)

        logger.info(f"Updated pipeline: {pipeline.name}")
        return pipeline

    def delete(self, pipeline_id: int) -> bool:
        """Delete a pipeline."""
        pipeline = self.get_by_id(pipeline_id)
        if not pipeline:
            return False

        # Check if pipeline has stages with records
        # For now, just delete (in production, add checks)
        name = pipeline.name
        self.db.delete(pipeline)
        self.db.commit()

        logger.info(f"Deleted pipeline: {name}")
        return True

    def _unset_default(self, company_id: int, exclude_id: Optional[int] = None) -> None:
        """Unset default flag for all pipelines in company."""
        query = self.db.query(Pipeline).filter(
            Pipeline.company_id == company_id,
            Pipeline.is_default == True
        )
        if exclude_id:
            query = query.filter(Pipeline.id != exclude_id)

        query.update({"is_default": False})

    def create_with_default_stages(
        self,
        data: PipelineCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Pipeline:
        """Create a pipeline with default stages."""
        pipeline = self.create(data, company_id, user_id)

        default_stages = [
            {"name": "New", "sequence": 10, "probability": 10, "color": "#3498db"},
            {"name": "Qualified", "sequence": 20, "probability": 25, "color": "#9b59b6"},
            {"name": "Proposal", "sequence": 30, "probability": 50, "color": "#f39c12"},
            {"name": "Negotiation", "sequence": 40, "probability": 75, "color": "#e67e22"},
            {"name": "Won", "sequence": 90, "probability": 100, "color": "#27ae60", "is_won": True},
            {"name": "Lost", "sequence": 100, "probability": 0, "color": "#e74c3c", "is_lost": True},
        ]

        for stage_data in default_stages:
            stage = Stage(
                pipeline_id=pipeline.id,
                company_id=company_id,
                created_by_id=user_id,
                **stage_data
            )
            self.db.add(stage)

        self.db.commit()
        self.db.refresh(pipeline)

        return pipeline
