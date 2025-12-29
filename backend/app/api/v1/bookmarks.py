"""Bookmark API endpoints"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.bookmark import Bookmark, BookmarkType
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkUpdate,
    BookmarkResponse,
    BookmarkToggleRequest,
    BookmarkToggleResponse,
    BookmarkListResponse,
    BookmarkCheckRequest,
    BookmarkCheckResponse,
)

router = APIRouter()


def _parse_bookmark_type(type_str: str) -> BookmarkType:
    """Parse bookmark type string to enum"""
    try:
        return BookmarkType(type_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bookmark type: {type_str}. Must be one of: {[t.value for t in BookmarkType]}",
        )


@router.get("/", response_model=BookmarkListResponse)
def list_bookmarks(
    bookmark_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List user's bookmarks"""
    bm_type = _parse_bookmark_type(bookmark_type) if bookmark_type else None

    bookmarks = Bookmark.get_by_user(
        db=db,
        user_id=current_user.id,
        bookmark_type=bm_type,
        limit=limit,
        offset=offset,
    )

    total = Bookmark.count_by_user(
        db=db,
        user_id=current_user.id,
        bookmark_type=bm_type,
    )

    return BookmarkListResponse(
        items=[
            BookmarkResponse(
                id=b.id,
                user_id=b.user_id,
                bookmark_type=b.bookmark_type.value,
                reference_id=b.reference_id,
                note=b.note,
                created_at=b.created_at,
                updated_at=b.updated_at,
            )
            for b in bookmarks
        ],
        total=total,
    )


@router.post("/", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    data: BookmarkCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new bookmark"""
    bm_type = _parse_bookmark_type(data.bookmark_type)

    # Check if already exists
    existing = Bookmark.find(
        db=db,
        user_id=current_user.id,
        bookmark_type=bm_type,
        reference_id=data.reference_id,
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bookmark already exists",
        )

    bookmark = Bookmark.create(
        db=db,
        user_id=current_user.id,
        bookmark_type=bm_type,
        reference_id=data.reference_id,
        note=data.note,
    )

    db.commit()
    db.refresh(bookmark)

    return BookmarkResponse(
        id=bookmark.id,
        user_id=bookmark.user_id,
        bookmark_type=bookmark.bookmark_type.value,
        reference_id=bookmark.reference_id,
        note=bookmark.note,
        created_at=bookmark.created_at,
        updated_at=bookmark.updated_at,
    )


@router.post("/toggle", response_model=BookmarkToggleResponse)
def toggle_bookmark(
    data: BookmarkToggleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Toggle a bookmark (add if not exists, remove if exists)"""
    bm_type = _parse_bookmark_type(data.bookmark_type)

    bookmark, action = Bookmark.toggle(
        db=db,
        user_id=current_user.id,
        bookmark_type=bm_type,
        reference_id=data.reference_id,
        note=data.note,
    )

    db.commit()

    response = BookmarkToggleResponse(
        action=action,
        bookmark_type=data.bookmark_type,
        reference_id=data.reference_id,
    )

    if bookmark:
        db.refresh(bookmark)
        response.bookmark = BookmarkResponse(
            id=bookmark.id,
            user_id=bookmark.user_id,
            bookmark_type=bookmark.bookmark_type.value,
            reference_id=bookmark.reference_id,
            note=bookmark.note,
            created_at=bookmark.created_at,
            updated_at=bookmark.updated_at,
        )

    return response


@router.post("/check", response_model=BookmarkCheckResponse)
def check_bookmarks(
    data: BookmarkCheckRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Check if multiple items are bookmarked"""
    bm_type = _parse_bookmark_type(data.bookmark_type)

    # Get all bookmarks for the given type and reference IDs
    bookmarks = (
        db.query(Bookmark)
        .filter(
            Bookmark.user_id == current_user.id,
            Bookmark.bookmark_type == bm_type,
            Bookmark.reference_id.in_(data.reference_ids),
        )
        .all()
    )

    bookmarked_ids = {b.reference_id for b in bookmarks}

    return BookmarkCheckResponse(
        bookmarked={
            str(ref_id): ref_id in bookmarked_ids
            for ref_id in data.reference_ids
        }
    )


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific bookmark"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found",
        )

    if bookmark.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return BookmarkResponse(
        id=bookmark.id,
        user_id=bookmark.user_id,
        bookmark_type=bookmark.bookmark_type.value,
        reference_id=bookmark.reference_id,
        note=bookmark.note,
        created_at=bookmark.created_at,
        updated_at=bookmark.updated_at,
    )


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: int,
    data: BookmarkUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a bookmark (note only)"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found",
        )

    if bookmark.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if data.note is not None:
        bookmark.note = data.note

    db.commit()
    db.refresh(bookmark)

    return BookmarkResponse(
        id=bookmark.id,
        user_id=bookmark.user_id,
        bookmark_type=bookmark.bookmark_type.value,
        reference_id=bookmark.reference_id,
        note=bookmark.note,
        created_at=bookmark.created_at,
        updated_at=bookmark.updated_at,
    )


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a bookmark"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found",
        )

    if bookmark.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    db.delete(bookmark)
    db.commit()
