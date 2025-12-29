"""Attachments API endpoints for file uploads"""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.attachment import Attachment
from app.services.storage import storage_service

router = APIRouter()


# Schemas
class AttachmentResponse(BaseModel):
    """Attachment response schema"""
    id: int
    filename: str
    original_filename: str
    mime_type: str
    size: int
    human_size: str
    is_image: bool
    is_video: bool
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[int] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    """Response after successful upload"""
    attachment: AttachmentResponse
    message: str = "File uploaded successfully"


class BulkDeleteResponse(BaseModel):
    """Response for bulk delete operation"""
    deleted_count: int
    message: str


# Endpoints
@router.post("/upload", response_model=AttachmentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    attachable_type: str = Form(...),
    attachable_id: int = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upload a file attachment"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    try:
        # Upload to storage
        storage_result = await storage_service.upload_file(
            file=file.file,
            filename=file.filename,
            path=f"{attachable_type}/{attachable_id}",
            content_type=file.content_type,
        )

        # Create attachment record
        attachment = Attachment.create_for_entity(
            db=db,
            attachable_type=attachable_type,
            attachable_id=attachable_id,
            storage_result=storage_result,
            user_id=current_user.id,
            company_id=current_user.current_company_id,
        )

        db.commit()

        # Get URL for response
        url = await storage_service.get_file_url(attachment.storage_key)

        return AttachmentUploadResponse(
            attachment=AttachmentResponse(
                id=attachment.id,
                filename=attachment.filename,
                original_filename=attachment.original_filename,
                mime_type=attachment.mime_type,
                size=attachment.size,
                human_size=attachment.human_size,
                is_image=attachment.is_image,
                is_video=attachment.is_video,
                width=attachment.width,
                height=attachment.height,
                duration=attachment.duration,
                url=url,
                thumbnail_url=None,
                created_at=attachment.created_at.isoformat(),
            ),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.get("/", response_model=List[AttachmentResponse])
async def list_attachments(
    attachable_type: str,
    attachable_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List attachments for an entity"""
    attachments = Attachment.get_for_entity(db, attachable_type, attachable_id)

    result = []
    for att in attachments:
        url = await storage_service.get_file_url(att.storage_key)
        thumbnail_url = None
        if att.thumbnail_key:
            thumbnail_url = await storage_service.get_file_url(att.thumbnail_key)

        result.append(AttachmentResponse(
            id=att.id,
            filename=att.filename,
            original_filename=att.original_filename,
            mime_type=att.mime_type,
            size=att.size,
            human_size=att.human_size,
            is_image=att.is_image,
            is_video=att.is_video,
            width=att.width,
            height=att.height,
            duration=att.duration,
            url=url,
            thumbnail_url=thumbnail_url,
            created_at=att.created_at.isoformat(),
        ))

    return result


@router.get("/{attachment_id}", response_model=AttachmentResponse)
async def get_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific attachment"""
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False,
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    url = await storage_service.get_file_url(attachment.storage_key)
    thumbnail_url = None
    if attachment.thumbnail_key:
        thumbnail_url = await storage_service.get_file_url(attachment.thumbnail_key)

    return AttachmentResponse(
        id=attachment.id,
        filename=attachment.filename,
        original_filename=attachment.original_filename,
        mime_type=attachment.mime_type,
        size=attachment.size,
        human_size=attachment.human_size,
        is_image=attachment.is_image,
        is_video=attachment.is_video,
        width=attachment.width,
        height=attachment.height,
        duration=attachment.duration,
        url=url,
        thumbnail_url=thumbnail_url,
        created_at=attachment.created_at.isoformat(),
    )


@router.get("/{attachment_id}/download")
async def get_download_url(
    attachment_id: int,
    expires_in: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a presigned download URL for an attachment"""
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False,
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    url = await storage_service.get_file_url(attachment.storage_key, expires_in)

    return {
        "url": url,
        "expires_in": expires_in,
        "filename": attachment.original_filename,
    }


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int,
    hard_delete: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete an attachment"""
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False,
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    # Only owner or superuser can delete
    if attachment.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete this attachment",
        )

    if hard_delete:
        # Delete from storage
        await storage_service.delete_file(attachment.storage_key)
        if attachment.thumbnail_key:
            await storage_service.delete_file(attachment.thumbnail_key)
        db.delete(attachment)
    else:
        # Soft delete
        attachment.soft_delete(db)

    db.commit()


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_attachments(
    attachment_ids: List[int],
    hard_delete: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Bulk delete attachments"""
    attachments = db.query(Attachment).filter(
        Attachment.id.in_(attachment_ids),
        Attachment.is_deleted == False,
    ).all()

    deleted_count = 0
    for attachment in attachments:
        # Only delete if owner or superuser
        if attachment.user_id == current_user.id or current_user.is_superuser:
            if hard_delete:
                await storage_service.delete_file(attachment.storage_key)
                if attachment.thumbnail_key:
                    await storage_service.delete_file(attachment.thumbnail_key)
                db.delete(attachment)
            else:
                attachment.soft_delete(db)
            deleted_count += 1

    db.commit()

    return BulkDeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted {deleted_count} attachment(s)",
    )
