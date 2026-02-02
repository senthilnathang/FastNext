"""
Employee Notes API Routes
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import EmployeeNote, NoteFile
from ..schemas.notes import (
    EmployeeNoteCreate, EmployeeNoteUpdate, EmployeeNoteResponse,
    EmployeeNoteListResponse
)

router = APIRouter(tags=["Employee Notes"])


@router.get("/", response_model=EmployeeNoteListResponse)
def list_notes(
    employee_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List employee notes with pagination."""
    query = db.query(EmployeeNote).options(
        joinedload(EmployeeNote.note_files)
    ).filter(
        EmployeeNote.company_id == current_user.current_company_id
    )

    if employee_id:
        query = query.filter(EmployeeNote.employee_id == employee_id)

    total = query.count()
    skip = (page - 1) * page_size
    notes = query.order_by(EmployeeNote.created_at.desc()).offset(skip).limit(page_size).all()

    # Add updated_by_name from user
    results = []
    for note in notes:
        note_dict = {
            "id": note.id,
            "employee_id": note.employee_id,
            "description": note.description,
            "company_id": note.company_id,
            "created_by": note.created_by,
            "updated_by": note.updated_by,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
            "note_files": [
                {"id": f.id, "file_name": f.file_name, "file_path": f.file_path}
                for f in note.note_files
            ],
            "updated_by_name": None,  # TODO: Join with User to get name
        }
        results.append(EmployeeNoteResponse(**note_dict))

    return EmployeeNoteListResponse(results=results, count=total)


@router.post("/", response_model=EmployeeNoteResponse)
def create_note(
    data: EmployeeNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new employee note."""
    note = EmployeeNote(
        employee_id=data.employee_id,
        description=data.description,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}", response_model=EmployeeNoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific employee note."""
    note = db.query(EmployeeNote).options(
        joinedload(EmployeeNote.note_files)
    ).filter(
        EmployeeNote.id == note_id,
        EmployeeNote.company_id == current_user.current_company_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=EmployeeNoteResponse)
def update_note(
    note_id: int,
    data: EmployeeNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an employee note."""
    note = db.query(EmployeeNote).filter(
        EmployeeNote.id == note_id,
        EmployeeNote.company_id == current_user.current_company_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if data.description is not None:
        note.description = data.description
    note.updated_by = current_user.id

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an employee note."""
    note = db.query(EmployeeNote).filter(
        EmployeeNote.id == note_id,
        EmployeeNote.company_id == current_user.current_company_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}
