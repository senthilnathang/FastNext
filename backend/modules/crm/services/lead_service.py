"""
Lead Service

Business logic for CRM leads.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from ..models.lead import Lead
from ..models.stage import Stage
from ..models.tag import Tag
from ..models.opportunity import Opportunity
from ..models.contact import Contact
from ..models.account import Account
from ..schemas.lead import (
    LeadCreate, LeadUpdate, LeadConvert, LeadConvertResult,
    LeadKanban, LeadKanbanColumn, LeadResponse
)

logger = logging.getLogger(__name__)


class LeadService:
    """Service for managing CRM leads."""

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
        is_converted: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        priority: Optional[str] = None,
        rating: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Lead], int]:
        """Get all leads with filters and pagination."""
        query = self.db.query(Lead).options(
            joinedload(Lead.stage),
            joinedload(Lead.user),
            joinedload(Lead.tags)
        )

        if company_id is not None:
            query = query.filter(Lead.company_id == company_id)

        if pipeline_id is not None:
            query = query.filter(Lead.pipeline_id == pipeline_id)

        if stage_id is not None:
            query = query.filter(Lead.stage_id == stage_id)

        if user_id is not None:
            query = query.filter(Lead.user_id == user_id)

        if is_converted is not None:
            query = query.filter(Lead.is_converted == is_converted)

        if is_lost is not None:
            query = query.filter(Lead.is_lost == is_lost)

        if priority is not None:
            query = query.filter(Lead.priority == priority)

        if rating is not None:
            query = query.filter(Lead.rating == rating)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Lead.name.ilike(search_term)) |
                (Lead.contact_name.ilike(search_term)) |
                (Lead.email.ilike(search_term)) |
                (Lead.company_name.ilike(search_term))
            )

        total = query.count()
        items = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()

        return items, total

    def get_by_id(self, lead_id: int) -> Optional[Lead]:
        """Get a lead by ID."""
        return self.db.query(Lead).options(
            joinedload(Lead.stage),
            joinedload(Lead.user),
            joinedload(Lead.tags)
        ).filter(Lead.id == lead_id).first()

    def create(
        self,
        data: LeadCreate,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Lead:
        """Create a new lead."""
        # Get tags if provided
        tags = []
        if data.tag_ids:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()

        lead_data = data.model_dump(exclude={"tag_ids"})

        lead = Lead(
            **lead_data,
            company_id=company_id,
            created_by_id=user_id,
        )

        if tags:
            lead.tags = tags

        # If no stage set, get first stage from pipeline
        if not lead.stage_id and lead.pipeline_id:
            first_stage = self.db.query(Stage).filter(
                Stage.pipeline_id == lead.pipeline_id,
                Stage.is_won == False,
                Stage.is_lost == False
            ).order_by(Stage.sequence).first()
            if first_stage:
                lead.stage_id = first_stage.id

        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)

        logger.info(f"Created lead: {lead.name}")
        return lead

    def update(self, lead_id: int, data: LeadUpdate, user_id: Optional[int] = None) -> Optional[Lead]:
        """Update a lead."""
        lead = self.get_by_id(lead_id)
        if not lead:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})

        # Update tags if provided
        if data.tag_ids is not None:
            tags = self.db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
            lead.tags = tags

        for field, value in update_data.items():
            setattr(lead, field, value)

        lead.updated_by_id = user_id
        lead.date_last_activity = datetime.utcnow()

        self.db.commit()
        self.db.refresh(lead)

        logger.info(f"Updated lead: {lead.name}")
        return lead

    def delete(self, lead_id: int) -> bool:
        """Delete a lead (soft delete)."""
        lead = self.get_by_id(lead_id)
        if not lead:
            return False

        lead.is_deleted = True
        lead.deleted_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Deleted lead: {lead.name}")
        return True

    def move_stage(self, lead_id: int, stage_id: int, user_id: Optional[int] = None) -> Optional[Lead]:
        """Move lead to a different stage."""
        lead = self.get_by_id(lead_id)
        if not lead:
            return None

        stage = self.db.query(Stage).filter(Stage.id == stage_id).first()
        if not stage:
            return None

        lead.stage_id = stage_id
        lead.probability = stage.probability
        lead.date_last_activity = datetime.utcnow()
        lead.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(lead)

        logger.info(f"Moved lead {lead.name} to stage {stage.name}")
        return lead

    def mark_lost(self, lead_id: int, reason: Optional[str] = None, user_id: Optional[int] = None) -> Optional[Lead]:
        """Mark lead as lost."""
        lead = self.get_by_id(lead_id)
        if not lead:
            return None

        lead.mark_lost(reason)
        lead.updated_by_id = user_id

        self.db.commit()
        self.db.refresh(lead)

        logger.info(f"Marked lead {lead.name} as lost")
        return lead

    def convert(
        self,
        lead_id: int,
        data: LeadConvert,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> LeadConvertResult:
        """Convert lead to opportunity, contact, and/or account."""
        lead = self.get_by_id(lead_id)
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        if not lead.can_convert():
            raise ValueError("Lead cannot be converted (already converted or lost)")

        result = LeadConvertResult(lead_id=lead_id, message="")

        # Create account if requested
        account_id = None
        if data.create_account and lead.company_name:
            account = Account(
                name=lead.company_name,
                website=lead.website,
                phone=lead.phone,
                industry=lead.industry,
                employees=lead.employees,
                street=lead.street,
                city=lead.city,
                state=lead.state,
                zip_code=lead.zip_code,
                country=lead.country,
                company_id=company_id,
                user_id=user_id,
                created_by_id=user_id,
            )
            self.db.add(account)
            self.db.flush()
            account_id = account.id
            result.account_id = account_id

        # Create contact if requested
        contact_id = None
        if data.create_contact and lead.contact_name:
            # Split contact name
            name_parts = lead.contact_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else None

            contact = Contact(
                first_name=first_name,
                last_name=last_name,
                email=lead.email,
                phone=lead.phone,
                mobile=lead.mobile,
                job_title=lead.job_title,
                account_id=account_id,
                street=lead.street,
                city=lead.city,
                state=lead.state,
                zip_code=lead.zip_code,
                country=lead.country,
                linkedin=lead.linkedin,
                twitter=lead.twitter,
                company_id=company_id,
                user_id=user_id,
                created_by_id=user_id,
            )
            self.db.add(contact)
            self.db.flush()
            contact_id = contact.id
            result.contact_id = contact_id

        # Create opportunity if requested
        opportunity_id = None
        if data.create_opportunity:
            opp_name = data.opportunity_name or lead.name
            opportunity = Opportunity(
                name=opp_name,
                account_id=account_id,
                contact_id=contact_id,
                lead_id=lead_id,
                pipeline_id=lead.pipeline_id,
                stage_id=lead.stage_id,
                amount=lead.expected_revenue or Decimal(0),
                probability=lead.probability,
                date_deadline=lead.date_deadline,
                description=lead.description,
                source=lead.source.value if lead.source else None,
                company_id=company_id,
                user_id=user_id,
                created_by_id=user_id,
            )
            self.db.add(opportunity)
            self.db.flush()
            opportunity_id = opportunity.id
            result.opportunity_id = opportunity_id

        # Mark lead as converted
        lead.is_converted = True
        lead.date_conversion = datetime.utcnow()
        lead.converted_opportunity_id = opportunity_id
        lead.converted_contact_id = contact_id
        lead.converted_account_id = account_id
        lead.updated_by_id = user_id

        self.db.commit()

        result.message = "Lead converted successfully"
        logger.info(f"Converted lead {lead.name}")
        return result

    def get_kanban(
        self,
        pipeline_id: int,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> LeadKanban:
        """Get leads grouped by stage for Kanban view."""
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
            # Get leads for this stage
            query = self.db.query(Lead).options(
                joinedload(Lead.stage),
                joinedload(Lead.user),
                joinedload(Lead.tags)
            ).filter(
                Lead.stage_id == stage.id,
                Lead.is_converted == False,
                Lead.is_lost == False
            )

            if company_id:
                query = query.filter(Lead.company_id == company_id)

            if user_id:
                query = query.filter(Lead.user_id == user_id)

            leads = query.order_by(Lead.created_at.desc()).all()

            total_revenue = sum(
                lead.expected_revenue or Decimal(0)
                for lead in leads
            )

            column = LeadKanbanColumn(
                stage_id=stage.id,
                stage_name=stage.name,
                stage_color=stage.color,
                sequence=stage.sequence,
                count=len(leads),
                total_revenue=total_revenue,
                leads=[LeadResponse.model_validate(lead) for lead in leads]
            )
            columns.append(column)

        return LeadKanban(
            columns=columns,
            pipeline_id=pipeline.id,
            pipeline_name=pipeline.name
        )
