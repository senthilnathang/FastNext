"""
Sequence API Routes

Endpoints for managing sequences (auto-numbering).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.sequence import Sequence
from ..services.sequence_service import SequenceService

router = APIRouter(prefix="/sequences", tags=["Sequences"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class SequenceResponse(BaseModel):
    """Sequence information."""

    id: int
    code: str
    name: str
    prefix: str
    suffix: str
    padding: int
    number_next: int
    number_increment: int
    reset_period: Optional[str] = None
    company_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class SequenceCreate(BaseModel):
    """Create sequence request."""

    code: str
    name: str
    prefix: str = ""
    suffix: str = ""
    padding: int = 5
    number_increment: int = 1
    reset_period: Optional[str] = None
    company_id: Optional[int] = None
    module_name: Optional[str] = None


class SequenceUpdate(BaseModel):
    """Update sequence request."""

    name: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    padding: Optional[int] = None
    number_increment: Optional[int] = None
    reset_period: Optional[str] = None
    is_active: Optional[bool] = None


class SequenceNextResponse(BaseModel):
    """Next sequence number response."""

    code: str
    number: str


# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[SequenceResponse])
def list_sequences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    company_id: Optional[int] = Query(None),
) -> List[SequenceResponse]:
    """List all sequences."""
    query = db.query(Sequence).filter(Sequence.is_active == True)

    if company_id:
        query = query.filter(
            (Sequence.company_id == company_id) | (Sequence.company_id.is_(None))
        )

    sequences = query.all()
    return [SequenceResponse.model_validate(s) for s in sequences]


@router.get("/{code}", response_model=SequenceResponse)
def get_sequence(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    company_id: Optional[int] = Query(None),
) -> SequenceResponse:
    """Get a sequence by code."""
    service = SequenceService(db)
    sequence = service.get_sequence(code, company_id)

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence '{code}' not found",
        )

    return SequenceResponse.model_validate(sequence)


@router.post("/", response_model=SequenceResponse)
def create_sequence(
    data: SequenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> SequenceResponse:
    """Create a new sequence."""
    service = SequenceService(db)

    # Check for existing
    existing = service.get_sequence(data.code, data.company_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sequence with code '{data.code}' already exists",
        )

    sequence = service.create_sequence(
        code=data.code,
        name=data.name,
        prefix=data.prefix,
        suffix=data.suffix,
        padding=data.padding,
        company_id=data.company_id,
        module_name=data.module_name,
        reset_period=data.reset_period,
    )

    return SequenceResponse.model_validate(sequence)


@router.put("/{code}", response_model=SequenceResponse)
def update_sequence(
    code: str,
    data: SequenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    company_id: Optional[int] = Query(None),
) -> SequenceResponse:
    """Update a sequence."""
    service = SequenceService(db)
    sequence = service.get_sequence(code, company_id)

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence '{code}' not found",
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sequence, key, value)

    db.commit()
    db.refresh(sequence)

    return SequenceResponse.model_validate(sequence)


@router.delete("/{code}")
def delete_sequence(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    company_id: Optional[int] = Query(None),
) -> dict:
    """Delete a sequence."""
    service = SequenceService(db)
    sequence = service.get_sequence(code, company_id)

    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence '{code}' not found",
        )

    db.delete(sequence)
    db.commit()

    return {"status": "success", "message": f"Sequence '{code}' deleted"}


@router.post("/{code}/next", response_model=SequenceNextResponse)
def get_next_number(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    company_id: Optional[int] = Query(None),
) -> SequenceNextResponse:
    """Get the next number in a sequence."""
    service = SequenceService(db)
    number = service.next_by_code(code, company_id)

    if number is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence '{code}' not found",
        )

    return SequenceNextResponse(code=code, number=number)


@router.get("/{code}/preview", response_model=List[str])
def preview_sequence(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    company_id: Optional[int] = Query(None),
    count: int = Query(5, ge=1, le=20),
) -> List[str]:
    """Preview the next N sequence numbers without consuming them."""
    service = SequenceService(db)
    previews = service.preview_next(code, company_id, count)

    if not previews:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sequence '{code}' not found",
        )

    return previews
