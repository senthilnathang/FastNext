"""
Employee Note Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NoteFileBase(BaseModel):
    """Base schema for note file."""
    file_name: str = Field(..., max_length=255)
    file_path: str = Field(..., max_length=500)


class NoteFileResponse(NoteFileBase):
    """Schema for note file response."""
    id: int

    class Config:
        from_attributes = True


class EmployeeNoteBase(BaseModel):
    """Base schema for employee note."""
    employee_id: int
    description: str


class EmployeeNoteCreate(EmployeeNoteBase):
    """Schema for creating an employee note."""
    pass


class EmployeeNoteUpdate(BaseModel):
    """Schema for updating an employee note."""
    description: Optional[str] = None


class EmployeeNoteResponse(EmployeeNoteBase):
    """Schema for employee note response."""
    id: int
    company_id: int
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    note_files: List[NoteFileResponse] = []
    # Additional fields for frontend compatibility
    updated_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeNoteListResponse(BaseModel):
    """Schema for paginated employee note list."""
    results: List[EmployeeNoteResponse]
    count: int
