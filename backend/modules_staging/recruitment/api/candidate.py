"""
Candidate API Routes

CRUD operations for candidate management.
"""

from datetime import date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.candidate_service import CandidateService


router = APIRouter(tags=["Candidates"])


def get_service(db: Session = Depends(get_db)) -> CandidateService:
    return CandidateService(db)


# =============================================================================
# Pydantic Schemas
# =============================================================================

class CandidateBase(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    mobile: Optional[str] = None
    gender: Optional[str] = "male"
    dob: Optional[date] = None
    profile: Optional[str] = None
    resume: Optional[str] = None
    portfolio: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    source: Optional[str] = "application"
    source_channel_id: Optional[int] = None


class CandidateCreate(CandidateBase):
    recruitment_id: Optional[int] = None
    job_position_id: Optional[int] = None
    stage_id: Optional[int] = None
    referral_id: Optional[int] = None


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    profile: Optional[str] = None
    resume: Optional[str] = None
    portfolio: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    job_position_id: Optional[int] = None
    source: Optional[str] = None
    source_channel_id: Optional[int] = None
    is_active: Optional[bool] = None


class CandidateResponse(CandidateBase):
    id: int
    recruitment_id: Optional[int] = None
    job_position_id: Optional[int] = None
    stage_id: Optional[int] = None
    referral_id: Optional[int] = None
    hired: bool = False
    canceled: bool = False
    converted: bool = False
    joining_date: Optional[date] = None
    hired_date: Optional[date] = None
    offer_letter_status: str = "not_sent"
    is_active: bool = True

    class Config:
        from_attributes = True


class CandidateList(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    page_size: int


class MoveStageRequest(BaseModel):
    stage_id: int
    notes: Optional[str] = None


class HireCandidateRequest(BaseModel):
    joining_date: Optional[date] = None
    probation_end: Optional[date] = None


class RejectCandidateRequest(BaseModel):
    reason_ids: List[int]
    description: str


class RatingRequest(BaseModel):
    rating: int = Field(..., ge=0, le=5)


class RatingResponse(BaseModel):
    id: int
    candidate_id: int
    employee_id: int
    rating: int

    class Config:
        from_attributes = True


class StageNoteCreate(BaseModel):
    stage_id: int
    description: str
    candidate_can_view: bool = False


class StageNoteResponse(BaseModel):
    id: int
    candidate_id: int
    stage_id: int
    description: str
    updated_by_id: Optional[int] = None
    candidate_can_view: bool = False

    class Config:
        from_attributes = True


class TagBase(BaseModel):
    name: str
    color: str = "#1890ff"
    description: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class AddTagsRequest(BaseModel):
    tag_ids: List[int]


class RejectReasonBase(BaseModel):
    title: str
    description: Optional[str] = None


class RejectReasonCreate(RejectReasonBase):
    pass


class RejectReasonResponse(RejectReasonBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class SourceChannelBase(BaseModel):
    name: str
    channel_type: str = "other"
    description: Optional[str] = None
    url: Optional[str] = None


class SourceChannelCreate(SourceChannelBase):
    pass


class SourceChannelResponse(SourceChannelBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    title: str
    document_path: str
    document_request_id: Optional[int] = None


class DocumentResponse(BaseModel):
    id: int
    candidate_id: int
    title: str
    document: Optional[str] = None
    document_request_id: Optional[int] = None
    status: str = "requested"
    reject_reason: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentStatusUpdate(BaseModel):
    status: str
    reject_reason: Optional[str] = None


class BulkMoveRequest(BaseModel):
    candidate_ids: List[int]
    stage_id: int


class BulkTagRequest(BaseModel):
    candidate_ids: List[int]
    tag_ids: List[int]


# =============================================================================
# Candidate List Endpoints (MUST be first)
# =============================================================================

@router.get("/", response_model=CandidateList)
@router.get("/list", response_model=CandidateList)
def list_candidates(
    recruitment_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    source: Optional[str] = None,
    is_hired: Optional[bool] = None,
    is_canceled: Optional[bool] = None,
    search: Optional[str] = None,
    tag_ids: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List candidates with filters."""
    tag_id_list = None
    if tag_ids:
        tag_id_list = [int(t) for t in tag_ids.split(",")]

    candidates, total = service.list_candidates(
        company_id=current_user.current_company_id,
        recruitment_id=recruitment_id,
        stage_id=stage_id,
        source=source,
        is_hired=is_hired,
        is_canceled=is_canceled,
        search=search,
        tag_ids=tag_id_list,
        skip=skip,
        limit=limit,
    )
    return CandidateList(
        items=candidates,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/", response_model=CandidateResponse, status_code=201)
def create_candidate(
    data: CandidateCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new candidate."""
    return service.create_candidate(
        data.model_dump(),
        current_user.current_company_id,
        current_user.id
    )


# =============================================================================
# Tags Endpoints
# =============================================================================

@router.get("/tags", response_model=List[TagResponse])
def list_tags(
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List all candidate tags."""
    return service.list_tags(current_user.current_company_id)


@router.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(
    data: TagCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a candidate tag."""
    return service.create_tag(
        name=data.name,
        color=data.color,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        description=data.description
    )


# =============================================================================
# Reject Reasons Endpoints
# =============================================================================

@router.get("/reject-reasons", response_model=List[RejectReasonResponse])
def list_reject_reasons(
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List all rejection reasons."""
    return service.list_reject_reasons(current_user.current_company_id)


@router.post("/reject-reasons", response_model=RejectReasonResponse, status_code=201)
def create_reject_reason(
    data: RejectReasonCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a rejection reason."""
    return service.create_reject_reason(
        title=data.title,
        description=data.description,
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )


# =============================================================================
# Source Channels Endpoints
# =============================================================================

@router.get("/source-channels", response_model=List[SourceChannelResponse])
def list_source_channels(
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List all source channels."""
    return service.list_source_channels(current_user.current_company_id)


@router.post("/source-channels", response_model=SourceChannelResponse, status_code=201)
def create_source_channel(
    data: SourceChannelCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a source channel."""
    return service.create_source_channel(
        name=data.name,
        channel_type=data.channel_type,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        description=data.description,
        url=data.url
    )


# =============================================================================
# Bulk Operations Endpoints
# =============================================================================

@router.post("/bulk/move-stage")
def bulk_move_to_stage(
    data: BulkMoveRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Move multiple candidates to a stage."""
    count = service.bulk_move_to_stage(
        candidate_ids=data.candidate_ids,
        stage_id=data.stage_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id
    )
    return {"moved_count": count}


@router.post("/bulk/add-tags")
def bulk_add_tags(
    data: BulkTagRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add tags to multiple candidates."""
    count = service.bulk_add_tags(
        candidate_ids=data.candidate_ids,
        tag_ids=data.tag_ids,
        company_id=current_user.current_company_id
    )
    return {"updated_count": count}


# =============================================================================
# Single Candidate Endpoints (with {candidate_id} - MUST be last)
# =============================================================================

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get candidate by ID."""
    candidate = service.get_candidate(candidate_id, current_user.current_company_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a candidate."""
    candidate = service.update_candidate(
        candidate_id,
        data.model_dump(exclude_unset=True),
        current_user.current_company_id,
        current_user.id
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a candidate."""
    success = service.delete_candidate(
        candidate_id,
        current_user.current_company_id,
        current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return None


@router.post("/{candidate_id}/move-stage", response_model=CandidateResponse)
def move_candidate_to_stage(
    candidate_id: int,
    data: MoveStageRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Move candidate to a different stage."""
    candidate = service.move_to_stage(
        candidate_id=candidate_id,
        stage_id=data.stage_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        notes=data.notes
    )
    if not candidate:
        raise HTTPException(status_code=400, detail="Cannot move candidate to stage")
    return candidate


@router.post("/{candidate_id}/hire", response_model=CandidateResponse)
def hire_candidate(
    candidate_id: int,
    data: HireCandidateRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Mark candidate as hired."""
    candidate = service.hire_candidate(
        candidate_id=candidate_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        joining_date=data.joining_date,
        probation_end=data.probation_end
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/{candidate_id}/cancel", response_model=CandidateResponse)
def cancel_candidate(
    candidate_id: int,
    reason: Optional[str] = None,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Cancel/withdraw a candidate."""
    candidate = service.cancel_candidate(
        candidate_id=candidate_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        reason=reason
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/{candidate_id}/reject")
def reject_candidate(
    candidate_id: int,
    data: RejectCandidateRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Reject a candidate with reasons."""
    rejected = service.reject_candidate(
        candidate_id=candidate_id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        reason_ids=data.reason_ids,
        description=data.description
    )
    if not rejected:
        raise HTTPException(status_code=400, detail="Cannot reject candidate")
    return {"status": "rejected", "id": rejected.id}


# =============================================================================
# Ratings Endpoints
# =============================================================================

@router.get("/{candidate_id}/ratings", response_model=List[RatingResponse])
def get_candidate_ratings(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get all ratings for a candidate."""
    return service.get_candidate_ratings(candidate_id, current_user.current_company_id)


@router.post("/{candidate_id}/ratings", response_model=RatingResponse, status_code=201)
def add_candidate_rating(
    candidate_id: int,
    data: RatingRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add or update rating for a candidate."""
    # Get employee_id from current user
    # Assuming current_user has an associated employee
    from modules.employee.models.employee import Employee
    employee = service.db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    if not employee:
        raise HTTPException(status_code=400, detail="User is not an employee")

    return service.add_rating(
        candidate_id=candidate_id,
        rating=data.rating,
        employee_id=employee.id,
        company_id=current_user.current_company_id
    )


@router.get("/{candidate_id}/average-rating")
def get_candidate_average_rating(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get average rating for a candidate."""
    avg = service.get_average_rating(candidate_id)
    return {"average_rating": float(avg) if avg else None}


# =============================================================================
# Stage Notes Endpoints
# =============================================================================

@router.get("/{candidate_id}/notes", response_model=List[StageNoteResponse])
def get_candidate_notes(
    candidate_id: int,
    stage_id: Optional[int] = None,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get stage notes for a candidate."""
    return service.get_stage_notes(
        candidate_id=candidate_id,
        company_id=current_user.current_company_id,
        stage_id=stage_id
    )


@router.post("/{candidate_id}/notes", response_model=StageNoteResponse, status_code=201)
def add_candidate_note(
    candidate_id: int,
    data: StageNoteCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add a stage note for a candidate."""
    return service.add_stage_note(
        candidate_id=candidate_id,
        stage_id=data.stage_id,
        description=data.description,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        candidate_can_view=data.candidate_can_view
    )


# =============================================================================
# Tags on Candidate Endpoints
# =============================================================================

@router.post("/{candidate_id}/tags", response_model=CandidateResponse)
def add_tags_to_candidate(
    candidate_id: int,
    data: AddTagsRequest,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add tags to a candidate."""
    candidate = service.add_tags_to_candidate(
        candidate_id=candidate_id,
        tag_ids=data.tag_ids,
        company_id=current_user.current_company_id
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.delete("/{candidate_id}/tags/{tag_id}", response_model=CandidateResponse)
def remove_tag_from_candidate(
    candidate_id: int,
    tag_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Remove a tag from a candidate."""
    candidate = service.remove_tag_from_candidate(
        candidate_id=candidate_id,
        tag_id=tag_id,
        company_id=current_user.current_company_id
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


# =============================================================================
# Documents Endpoints
# =============================================================================

@router.get("/{candidate_id}/documents", response_model=List[DocumentResponse])
def get_candidate_documents(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get documents for a candidate."""
    return service.list_candidate_documents(
        candidate_id=candidate_id,
        company_id=current_user.current_company_id
    )


@router.post("/{candidate_id}/documents", response_model=DocumentResponse, status_code=201)
def add_candidate_document(
    candidate_id: int,
    data: DocumentCreate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add a document for a candidate."""
    return service.add_candidate_document(
        candidate_id=candidate_id,
        title=data.title,
        document_path=data.document_path,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        document_request_id=data.document_request_id
    )


@router.patch("/{candidate_id}/documents/{document_id}/status", response_model=DocumentResponse)
def update_document_status(
    candidate_id: int,
    document_id: int,
    data: DocumentStatusUpdate,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update document status (approve/reject)."""
    doc = service.update_document_status(
        document_id=document_id,
        status=data.status,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
        reject_reason=data.reject_reason
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# =============================================================================
# Scores Endpoints
# =============================================================================

@router.get("/{candidate_id}/scores")
def get_candidate_scores(
    candidate_id: int,
    service: CandidateService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get all scores for a candidate."""
    scores = service.get_candidate_scores(candidate_id, current_user.current_company_id)
    scorecard = service.get_candidate_scorecard(candidate_id, current_user.current_company_id)
    return {
        "scores": scores,
        "scorecard": scorecard
    }
