"""Label API endpoints for inbox label management"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.label import Label, InboxItemLabel
from app.models.inbox import InboxItem
from app.schemas.label import (
    LabelCreate,
    LabelUpdate,
    LabelResponse,
    LabelListResponse,
    AddLabelsRequest,
    BulkLabelRequest,
)
from app.services.realtime import realtime

router = APIRouter()


@router.get("/", response_model=LabelListResponse)
def get_labels(
    include_system: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all labels for the current user"""
    labels = Label.get_user_labels(db, current_user.id, include_system=include_system)
    return LabelListResponse(
        items=[LabelResponse.model_validate(label) for label in labels],
        total=len(labels),
    )


@router.post("/", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
async def create_label(
    label_in: LabelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new label"""
    # Check for duplicate name
    existing = db.query(Label).filter(
        Label.user_id == current_user.id,
        Label.name == label_in.name,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label with name '{label_in.name}' already exists",
        )

    label = Label(
        user_id=current_user.id,
        name=label_in.name,
        color=label_in.color,
        icon=label_in.icon,
        sort_order=label_in.sort_order,
        is_system=False,
    )
    db.add(label)
    db.commit()
    db.refresh(label)

    # Notify via WebSocket
    await realtime.notify_label_created(
        current_user.id,
        label.id,
        label.name,
        label.color,
    )

    return LabelResponse.model_validate(label)


@router.get("/{label_id}", response_model=LabelResponse)
def get_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific label"""
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.user_id == current_user.id,
    ).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Label not found",
        )
    return LabelResponse.model_validate(label)


@router.patch("/{label_id}", response_model=LabelResponse)
async def update_label(
    label_id: int,
    label_in: LabelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a label"""
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.user_id == current_user.id,
    ).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Label not found",
        )

    if label.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system labels",
        )

    # Check for duplicate name if changing
    if label_in.name and label_in.name != label.name:
        existing = db.query(Label).filter(
            Label.user_id == current_user.id,
            Label.name == label_in.name,
            Label.id != label_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Label with name '{label_in.name}' already exists",
            )

    update_data = label_in.model_dump(exclude_unset=True)
    changes = {}
    for field, value in update_data.items():
        if getattr(label, field) != value:
            changes[field] = value
            setattr(label, field, value)

    if changes:
        db.commit()
        db.refresh(label)

        # Notify via WebSocket
        await realtime.notify_label_updated(current_user.id, label.id, changes)

    return LabelResponse.model_validate(label)


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a label"""
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.user_id == current_user.id,
    ).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Label not found",
        )

    if label.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system labels",
        )

    db.delete(label)
    db.commit()

    # Notify via WebSocket
    await realtime.notify_label_deleted(current_user.id, label_id)

    return None


@router.post("/{label_id}/reorder", response_model=LabelResponse)
def reorder_label(
    label_id: int,
    new_order: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the sort order of a label"""
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.user_id == current_user.id,
    ).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Label not found",
        )

    label.sort_order = new_order
    db.commit()
    db.refresh(label)

    return LabelResponse.model_validate(label)


# Inbox label management endpoints (could be in inbox.py but keeping related here)

@router.post("/inbox/{inbox_item_id}/labels")
async def add_labels_to_inbox_item(
    inbox_item_id: int,
    request: AddLabelsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add labels to an inbox item"""
    inbox_item = db.query(InboxItem).filter(
        InboxItem.id == inbox_item_id,
        InboxItem.user_id == current_user.id,
    ).first()
    if not inbox_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    # Validate labels belong to user
    labels = db.query(Label).filter(
        Label.id.in_(request.label_ids),
        Label.user_id == current_user.id,
    ).all()
    if len(labels) != len(request.label_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more labels not found",
        )

    # Add labels that aren't already attached
    existing_label_ids = {l.id for l in inbox_item.labels}
    added = 0
    for label in labels:
        if label.id not in existing_label_ids:
            inbox_item.labels.append(label)
            added += 1

    db.commit()

    # Notify via WebSocket
    await realtime.notify_inbox_updated(
        current_user.id,
        inbox_item_id,
        {"labels_added": request.label_ids},
    )

    return {"message": f"Added {added} labels", "labels_added": added}


@router.delete("/inbox/{inbox_item_id}/labels/{label_id}")
async def remove_label_from_inbox_item(
    inbox_item_id: int,
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a label from an inbox item"""
    inbox_item = db.query(InboxItem).filter(
        InboxItem.id == inbox_item_id,
        InboxItem.user_id == current_user.id,
    ).first()
    if not inbox_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    label = db.query(Label).filter(
        Label.id == label_id,
        Label.user_id == current_user.id,
    ).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Label not found",
        )

    if label in inbox_item.labels:
        inbox_item.labels.remove(label)
        db.commit()

        # Notify via WebSocket
        await realtime.notify_inbox_updated(
            current_user.id,
            inbox_item_id,
            {"labels_removed": [label_id]},
        )

    return {"message": "Label removed"}


@router.post("/inbox/bulk-label")
async def bulk_label_inbox_items(
    request: BulkLabelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add or remove labels from multiple inbox items"""
    # Validate inbox items belong to user
    inbox_items = db.query(InboxItem).filter(
        InboxItem.id.in_(request.inbox_item_ids),
        InboxItem.user_id == current_user.id,
    ).all()

    if len(inbox_items) != len(request.inbox_item_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more inbox items not found",
        )

    # Validate labels
    add_labels = []
    remove_labels = []
    if request.add_label_ids:
        add_labels = db.query(Label).filter(
            Label.id.in_(request.add_label_ids),
            Label.user_id == current_user.id,
        ).all()
        if len(add_labels) != len(request.add_label_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more labels to add not found",
            )

    if request.remove_label_ids:
        remove_labels = db.query(Label).filter(
            Label.id.in_(request.remove_label_ids),
            Label.user_id == current_user.id,
        ).all()
        if len(remove_labels) != len(request.remove_label_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more labels to remove not found",
            )

    # Apply changes
    for inbox_item in inbox_items:
        existing_label_ids = {l.id for l in inbox_item.labels}

        for label in add_labels:
            if label.id not in existing_label_ids:
                inbox_item.labels.append(label)

        for label in remove_labels:
            if label in inbox_item.labels:
                inbox_item.labels.remove(label)

    db.commit()

    return {
        "message": f"Updated {len(inbox_items)} items",
        "items_updated": len(inbox_items),
        "labels_added": request.add_label_ids,
        "labels_removed": request.remove_label_ids,
    }
