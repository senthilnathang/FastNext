"""
FastNext Services Module
Business logic services following coding standards
"""

from app.services.storage import StorageService, storage_service
from app.services.email import EmailService, email_service
from app.services.push import PushService, push_service
from app.services.realtime import RealtimeService, realtime, EventType

__all__ = [
    # Storage
    "StorageService",
    "storage_service",
    # Email
    "EmailService",
    "email_service",
    # Push Notifications
    "PushService",
    "push_service",
    # Realtime/WebSocket
    "RealtimeService",
    "realtime",
    "EventType",
]
