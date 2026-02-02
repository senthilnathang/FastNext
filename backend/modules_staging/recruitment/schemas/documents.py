"""
Document Schemas

Pydantic schemas for document-related models: Resume, CandidateDocumentRequest, CandidateDocument.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# =============================================================================
# Resume Schemas
# =============================================================================

class ResumeBase(BaseModel):
    """Base schema for resumes."""
    file: Optional[str] = Field(None, max_length=500, description="Resume file path")
    is_candidate: bool = Field(False, description="Is from a candidate application")


class ResumeCreate(ResumeBase):
    """Schema for creating a resume."""
    recruitment_id: int = Field(..., description="Recruitment ID")


class ResumeUpdate(BaseModel):
    """Schema for updating a resume."""
    file: Optional[str] = Field(None, max_length=500)
    is_candidate: Optional[bool] = None


class ResumeResponse(ResumeBase):
    """Schema for resume response."""
    id: int
    recruitment_id: int
    # Computed/joined fields
    recruitment_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResumeList(BaseModel):
    """Paginated list of resumes."""
    items: List[ResumeResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Document Request Schemas
# =============================================================================

class CandidateDocumentRequestBase(BaseModel):
    """Base schema for candidate document requests."""
    title: str = Field(..., min_length=1, max_length=100, description="Document request title")
    format: str = Field(
        ...,
        description="Document format: any, pdf, txt, docx, xlsx, jpg, png, jpeg"
    )
    max_size: Optional[int] = Field(None, ge=1, description="Maximum size in MB")
    description: Optional[str] = Field(None, description="Request description")


class CandidateDocumentRequestCreate(CandidateDocumentRequestBase):
    """Schema for creating a candidate document request."""
    candidate_ids: List[int] = Field(default_factory=list, description="Candidate IDs to request from")


class CandidateDocumentRequestUpdate(BaseModel):
    """Schema for updating a candidate document request."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    format: Optional[str] = None
    max_size: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None
    candidate_ids: Optional[List[int]] = None


class CandidateDocumentRequestResponse(CandidateDocumentRequestBase):
    """Schema for candidate document request response."""
    id: int
    candidate_ids: List[int] = Field(default_factory=list)
    document_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateDocumentRequestList(BaseModel):
    """Paginated list of candidate document requests."""
    items: List[CandidateDocumentRequestResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Document Schemas
# =============================================================================

class CandidateDocumentBase(BaseModel):
    """Base schema for candidate documents."""
    title: str = Field(..., min_length=1, max_length=250, description="Document title")
    document: Optional[str] = Field(None, max_length=500, description="Document file path")
    status: str = Field("requested", description="Status: requested, approved, rejected")
    reject_reason: Optional[str] = Field(None, max_length=255, description="Reason for rejection")


class CandidateDocumentCreate(CandidateDocumentBase):
    """Schema for creating a candidate document."""
    candidate_id: int = Field(..., description="Candidate ID")
    document_request_id: Optional[int] = Field(None, description="Document request ID")


class CandidateDocumentUpdate(BaseModel):
    """Schema for updating a candidate document."""
    title: Optional[str] = Field(None, min_length=1, max_length=250)
    document: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = None
    reject_reason: Optional[str] = Field(None, max_length=255)


class CandidateDocumentResponse(CandidateDocumentBase):
    """Schema for candidate document response."""
    id: int
    candidate_id: int
    document_request_id: Optional[int] = None
    # Computed/joined fields
    candidate_name: Optional[str] = None
    document_request_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateDocumentList(BaseModel):
    """Paginated list of candidate documents."""
    items: List[CandidateDocumentResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Document Approval Schemas
# =============================================================================

class DocumentApprove(BaseModel):
    """Schema for approving a document."""
    document_id: int = Field(..., description="Document ID")


class DocumentReject(BaseModel):
    """Schema for rejecting a document."""
    document_id: int = Field(..., description="Document ID")
    reject_reason: str = Field(..., min_length=1, max_length=255, description="Reason for rejection")


class BulkDocumentRequest(BaseModel):
    """Schema for bulk document requests."""
    title: str = Field(..., min_length=1, max_length=100, description="Document request title")
    format: str = Field(..., description="Document format")
    candidate_ids: List[int] = Field(..., description="List of candidate IDs")
    description: Optional[str] = Field(None, description="Request description")
    max_size: Optional[int] = Field(None, ge=1, description="Maximum size in MB")


class DocumentUpload(BaseModel):
    """Schema for document upload metadata."""
    title: str = Field(..., min_length=1, max_length=250, description="Document title")
    candidate_id: int = Field(..., description="Candidate ID")
    document_request_id: Optional[int] = Field(None, description="Document request ID")
