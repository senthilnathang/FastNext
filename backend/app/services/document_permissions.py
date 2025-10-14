"""
Document permissions service for collaborative editing
"""

from typing import Optional, List
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.core.config import settings
from app.services.collaboration_state import document_locks


class PermissionLevel(Enum):
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class DocumentPermissions:
    """
    Service for managing document permissions in collaborative editing
    """

    @staticmethod
    def get_user_permission(document_id: str, user: User, db: Session) -> PermissionLevel:
        """
        Get the permission level for a user on a specific document
        """
        # For now, implement a simple permission system
        # In production, this would check a document_permissions table

        # Owner always has admin access
        # For demo purposes, allow all authenticated users to write
        if user:
            return PermissionLevel.WRITE

        return PermissionLevel.NONE

    @staticmethod
    def can_read(document_id: str, user: User, db: Session) -> bool:
        """Check if user can read the document"""
        permission = DocumentPermissions.get_user_permission(document_id, user, db)
        return permission in [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.ADMIN]

    @staticmethod
    def can_write(document_id: str, user: User, db: Session) -> bool:
        """Check if user can write to the document"""
        permission = DocumentPermissions.get_user_permission(document_id, user, db)
        return permission in [PermissionLevel.WRITE, PermissionLevel.ADMIN]

    @staticmethod
    def can_admin(document_id: str, user: User, db: Session) -> bool:
        """Check if user has admin access to the document"""
        permission = DocumentPermissions.get_user_permission(document_id, user, db)
        return permission == PermissionLevel.ADMIN

    @staticmethod
    def grant_permission(document_id: str, user_id: str, permission: PermissionLevel, granted_by: User, db: Session) -> bool:
        """
        Grant permission to a user for a document
        """
        # TODO: Implement permission granting logic
        # This would insert/update records in a document_permissions table
        return True

    @staticmethod
    def revoke_permission(document_id: str, user_id: str, revoked_by: User, db: Session) -> bool:
        """
        Revoke permission from a user for a document
        """
        # TODO: Implement permission revocation logic
        return True

    @staticmethod
    def get_document_users(document_id: str, db: Session) -> List[dict]:
        """
        Get all users with access to a document
        """
        # TODO: Implement user listing logic
        # This would query the document_permissions table
        return []

    @staticmethod
    def is_document_locked(document_id: str, db: Session) -> Optional[str]:
        """
        Check if document is locked and return the locking user ID
        """
        # Check in-memory lock (in production, use Redis or database)
        if document_id in document_locks:
            return document_locks[document_id]
        return None