"""
CRM Pipeline Model

Sales pipelines for organizing opportunities and leads through stages.
"""

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, CompanyScopedMixin


class Pipeline(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Sales Pipeline model.

    A pipeline represents a sales process with multiple stages.
    Examples: "Sales Pipeline", "Enterprise Deals", "Partner Channel"
    """
    __tablename__ = "crm_pipelines"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Status
    is_default = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)

    # Sequence for ordering
    sequence = Column(Integer, default=10)

    # Relationships
    stages = relationship(
        "Stage",
        back_populates="pipeline",
        cascade="all, delete-orphan",
        order_by="Stage.sequence"
    )

    leads = relationship(
        "Lead",
        back_populates="pipeline",
        foreign_keys="Lead.pipeline_id"
    )

    opportunities = relationship(
        "Opportunity",
        back_populates="pipeline",
        foreign_keys="Opportunity.pipeline_id"
    )

    def __repr__(self) -> str:
        return f"<Pipeline(id={self.id}, name='{self.name}')>"
