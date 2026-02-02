"""
Document Models

Document-related models for recruitment: Resume, CandidateDocumentRequest, CandidateDocument.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Numeric, JSON, Table
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


# Association table for CandidateDocumentRequest candidates
document_request_candidates = Table(
    'recruitment_document_request_candidates',
    Base.metadata,
    Column('document_request_id', Integer, ForeignKey('recruitment_candidate_document_request.id'), primary_key=True),
    Column('candidate_id', Integer, ForeignKey('recruitment_candidate.id'), primary_key=True),
)


class Resume(Base, TimestampMixin):
    """Resume uploads for recruitment."""

    __tablename__ = "recruitment_resume"

    id = Column(Integer, primary_key=True, index=True)
    file = Column(String(500), nullable=True)  # FileField -> store path
    recruitment_id = Column(Integer, ForeignKey("recruitment_recruitment.id"), nullable=False)
    is_candidate = Column(Boolean, default=False)

    # Relationships
    recruitment = relationship("Recruitment", back_populates="resumes")


class CandidateDocumentRequest(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Request for documents from candidates."""

    __tablename__ = "recruitment_candidate_document_request"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)

    # Format: any, pdf, txt, docx, xlsx, jpg, png, jpeg
    format = Column(String(10), nullable=False)

    max_size = Column(Integer, nullable=True)  # Max size in MB
    description = Column(Text, nullable=True)

    # Relationships
    candidates = relationship("Candidate", secondary=document_request_candidates)
    documents = relationship("CandidateDocument", back_populates="document_request")


class CandidateDocument(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """Documents uploaded by or for candidates."""

    __tablename__ = "recruitment_candidate_document"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False)
    candidate_id = Column(Integer, ForeignKey("recruitment_candidate.id"), nullable=False)
    document_request_id = Column(Integer, ForeignKey("recruitment_candidate_document_request.id"), nullable=True)
    document = Column(String(500), nullable=True)  # FileField -> store path

    # Status: requested, approved, rejected
    status = Column(String(10), default="requested")

    reject_reason = Column(String(255), nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="documents")
    document_request = relationship("CandidateDocumentRequest", back_populates="documents")
