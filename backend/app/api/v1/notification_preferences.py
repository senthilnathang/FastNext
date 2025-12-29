"""Notification preferences API endpoints"""

from datetime import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.notification_preference import NotificationPreference, DigestFrequency

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class NotificationPreferencesResponse(BaseModel):
    """Full notification preferences response"""
    id: int
    user_id: int

    # In-app
    inbox_enabled: bool
    inbox_sound: bool
    inbox_desktop: bool

    # Push
    push_enabled: bool
    push_messages: bool
    push_mentions: bool
    push_replies: bool
    push_reactions: bool
    push_activity: bool

    # Email
    email_enabled: bool
    email_messages: bool
    email_mentions: bool
    email_digest: str

    # DND
    dnd_enabled: bool
    dnd_start_time: Optional[str]
    dnd_end_time: Optional[str]
    dnd_weekends: bool

    # Overrides
    type_overrides: Dict

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences request"""
    # In-app
    inbox_enabled: Optional[bool] = None
    inbox_sound: Optional[bool] = None
    inbox_desktop: Optional[bool] = None

    # Push
    push_enabled: Optional[bool] = None
    push_messages: Optional[bool] = None
    push_mentions: Optional[bool] = None
    push_replies: Optional[bool] = None
    push_reactions: Optional[bool] = None
    push_activity: Optional[bool] = None

    # Email
    email_enabled: Optional[bool] = None
    email_messages: Optional[bool] = None
    email_mentions: Optional[bool] = None
    email_digest: Optional[str] = None

    # DND
    dnd_enabled: Optional[bool] = None
    dnd_start_time: Optional[str] = None  # HH:MM format
    dnd_end_time: Optional[str] = None  # HH:MM format
    dnd_weekends: Optional[bool] = None

    # Overrides
    type_overrides: Optional[Dict] = None


class DNDEnableRequest(BaseModel):
    """Enable Do Not Disturb request"""
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    weekends: bool = False


class DNDStatusResponse(BaseModel):
    """DND status response"""
    enabled: bool
    active: bool
    start_time: Optional[str]
    end_time: Optional[str]
    weekends: bool


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def parse_time_string(time_str: str) -> Optional[time]:
    """Parse HH:MM string to time object"""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


def prefs_to_response(prefs: NotificationPreference) -> NotificationPreferencesResponse:
    """Convert preference model to response"""
    return NotificationPreferencesResponse(
        id=prefs.id,
        user_id=prefs.user_id,
        inbox_enabled=prefs.inbox_enabled,
        inbox_sound=prefs.inbox_sound,
        inbox_desktop=prefs.inbox_desktop,
        push_enabled=prefs.push_enabled,
        push_messages=prefs.push_messages,
        push_mentions=prefs.push_mentions,
        push_replies=prefs.push_replies,
        push_reactions=prefs.push_reactions,
        push_activity=prefs.push_activity,
        email_enabled=prefs.email_enabled,
        email_messages=prefs.email_messages,
        email_mentions=prefs.email_mentions,
        email_digest=prefs.email_digest.value if prefs.email_digest else "none",
        dnd_enabled=prefs.dnd_enabled,
        dnd_start_time=prefs.dnd_start_time.isoformat() if prefs.dnd_start_time else None,
        dnd_end_time=prefs.dnd_end_time.isoformat() if prefs.dnd_end_time else None,
        dnd_weekends=prefs.dnd_weekends,
        type_overrides=prefs.get_type_overrides(),
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get current user's notification preferences.

    Creates default preferences if none exist.
    """
    prefs = NotificationPreference.get_or_create(db, current_user.id)
    db.commit()
    return prefs_to_response(prefs)


@router.put("/", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update current user's notification preferences.
    """
    prefs = NotificationPreference.get_or_create(db, current_user.id)

    # Update in-app settings
    if data.inbox_enabled is not None:
        prefs.inbox_enabled = data.inbox_enabled
    if data.inbox_sound is not None:
        prefs.inbox_sound = data.inbox_sound
    if data.inbox_desktop is not None:
        prefs.inbox_desktop = data.inbox_desktop

    # Update push settings
    if data.push_enabled is not None:
        prefs.push_enabled = data.push_enabled
    if data.push_messages is not None:
        prefs.push_messages = data.push_messages
    if data.push_mentions is not None:
        prefs.push_mentions = data.push_mentions
    if data.push_replies is not None:
        prefs.push_replies = data.push_replies
    if data.push_reactions is not None:
        prefs.push_reactions = data.push_reactions
    if data.push_activity is not None:
        prefs.push_activity = data.push_activity

    # Update email settings
    if data.email_enabled is not None:
        prefs.email_enabled = data.email_enabled
    if data.email_messages is not None:
        prefs.email_messages = data.email_messages
    if data.email_mentions is not None:
        prefs.email_mentions = data.email_mentions
    if data.email_digest is not None:
        try:
            prefs.email_digest = DigestFrequency(data.email_digest)
        except ValueError:
            pass

    # Update DND settings
    if data.dnd_enabled is not None:
        prefs.dnd_enabled = data.dnd_enabled
    if data.dnd_start_time is not None:
        prefs.dnd_start_time = parse_time_string(data.dnd_start_time)
    if data.dnd_end_time is not None:
        prefs.dnd_end_time = parse_time_string(data.dnd_end_time)
    if data.dnd_weekends is not None:
        prefs.dnd_weekends = data.dnd_weekends

    # Update type overrides
    if data.type_overrides is not None:
        prefs.set_type_overrides(data.type_overrides)

    db.commit()
    db.refresh(prefs)
    return prefs_to_response(prefs)


@router.get("/dnd", response_model=DNDStatusResponse)
def get_dnd_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get current Do Not Disturb status.
    """
    prefs = NotificationPreference.get_or_create(db, current_user.id)
    db.commit()

    return DNDStatusResponse(
        enabled=prefs.dnd_enabled,
        active=prefs.is_dnd_active(),
        start_time=prefs.dnd_start_time.isoformat() if prefs.dnd_start_time else None,
        end_time=prefs.dnd_end_time.isoformat() if prefs.dnd_end_time else None,
        weekends=prefs.dnd_weekends,
    )


@router.post("/dnd/enable", response_model=DNDStatusResponse)
def enable_dnd(
    data: DNDEnableRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Enable Do Not Disturb mode.
    """
    prefs = NotificationPreference.get_or_create(db, current_user.id)

    prefs.dnd_enabled = True
    if data.start_time:
        prefs.dnd_start_time = parse_time_string(data.start_time)
    if data.end_time:
        prefs.dnd_end_time = parse_time_string(data.end_time)
    prefs.dnd_weekends = data.weekends

    db.commit()
    db.refresh(prefs)

    return DNDStatusResponse(
        enabled=prefs.dnd_enabled,
        active=prefs.is_dnd_active(),
        start_time=prefs.dnd_start_time.isoformat() if prefs.dnd_start_time else None,
        end_time=prefs.dnd_end_time.isoformat() if prefs.dnd_end_time else None,
        weekends=prefs.dnd_weekends,
    )


@router.post("/dnd/disable", response_model=DNDStatusResponse)
def disable_dnd(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Disable Do Not Disturb mode.
    """
    prefs = NotificationPreference.get_or_create(db, current_user.id)
    prefs.dnd_enabled = False
    db.commit()
    db.refresh(prefs)

    return DNDStatusResponse(
        enabled=prefs.dnd_enabled,
        active=False,
        start_time=prefs.dnd_start_time.isoformat() if prefs.dnd_start_time else None,
        end_time=prefs.dnd_end_time.isoformat() if prefs.dnd_end_time else None,
        weekends=prefs.dnd_weekends,
    )


@router.post("/reset")
def reset_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Reset notification preferences to defaults.
    """
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if prefs:
        db.delete(prefs)
        db.commit()

    # Create new with defaults
    new_prefs = NotificationPreference.get_or_create(db, current_user.id)
    db.commit()

    return {"message": "Preferences reset to defaults"}
