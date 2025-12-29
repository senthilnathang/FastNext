"""
CRM Stage Model

Pipeline stages for leads and opportunities.
"""

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, CompanyScopedMixin


class Stage(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Pipeline Stage model.

    Represents a stage in a sales pipeline (e.g., New, Qualified, Proposal, Won, Lost).
    Used for both Leads and Opportunities Kanban views.
    """
    __tablename__ = "crm_stages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Pipeline relationship
    pipeline_id = Column(Integer, ForeignKey("crm_pipelines.id"), nullable=False, index=True)

    # Ordering
    sequence = Column(Integer, default=10, index=True)

    # Probability (0-100%)
    probability = Column(Integer, default=10)

    # Stage type flags
    is_won = Column(Boolean, default=False)
    is_lost = Column(Boolean, default=False)

    # Kanban display
    color = Column(String(20), default="#3498db")  # Hex color for Kanban column
    fold = Column(Boolean, default=False)  # Fold in Kanban view (collapse)

    # Stage requirements (fields that must be filled to enter this stage)
    requirements = Column(JSONB, default=list)
    # Example: ["email", "phone", "expected_revenue"]

    # Automation
    on_enter_actions = Column(JSONB, default=list)  # Actions when entering stage
    on_exit_actions = Column(JSONB, default=list)   # Actions when leaving stage

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    pipeline = relationship("Pipeline", back_populates="stages")

    leads = relationship(
        "Lead",
        back_populates="stage",
        foreign_keys="Lead.stage_id"
    )

    opportunities = relationship(
        "Opportunity",
        back_populates="stage",
        foreign_keys="Opportunity.stage_id"
    )

    def __repr__(self) -> str:
        return f"<Stage(id={self.id}, name='{self.name}', pipeline_id={self.pipeline_id})>"

    @property
    def is_closing_stage(self) -> bool:
        """Check if this is a closing stage (won or lost)."""
        return self.is_won or self.is_lost
