"""
Skill Zone Models

Skill zone and talent pool models for managing candidates: SkillZone, SkillZoneCandidate, CandidateRating.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Numeric, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class SkillZone(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Skill zone/talent pool for future recruitment."""

    __tablename__ = "recruitment_skill_zone"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)

    # Relationships
    skill_zone_candidates = relationship("SkillZoneCandidate", back_populates="skill_zone")


class SkillZoneCandidate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """Candidate saved in a skill zone for future recruitment."""

    __tablename__ = "recruitment_skill_zone_candidate"

    id = Column(Integer, primary_key=True, index=True)
    skill_zone_id = Column(Integer, ForeignKey("recruitment_skill_zone.id"), nullable=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=True)
    reason = Column(String(200), nullable=False)
    added_on = Column(Date, nullable=True)

    # Relationships
    skill_zone = relationship("SkillZone", back_populates="skill_zone_candidates")
    candidate = relationship("Candidate")


class CandidateSkill(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Skill associated with a candidate."""

    __tablename__ = "recruitment_candidate_skill"
    __table_args__ = (
        UniqueConstraint('candidate_id', 'skill_id', name='uq_candidate_skill_candidate_skill'),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("recruitment_skill.id"), nullable=True)
    skill_name = Column(String(100), nullable=True)  # For skills not in the system
    proficiency_level = Column(Integer, default=3)  # 1-5 scale
    years_experience = Column(Numeric(4, 1), nullable=True)
    is_verified = Column(Boolean, default=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="candidate_skills")
    skill = relationship("Skill")


class CandidateRating(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Rating given to a candidate by an employee."""

    __tablename__ = "recruitment_candidate_rating"
    __table_args__ = (
        UniqueConstraint('employee_id', 'candidate_id', name='uq_candidate_rating_employee_candidate'),
    )

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_employees.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 0-5 scale

    # Relationships
    employee = relationship("Employee")
    candidate = relationship("Candidate", back_populates="ratings")
