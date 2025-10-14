"""
Real-time collaboration endpoints for FastNext Framework
"""

import json
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.core.config import settings
from app.services.operational_transform import OperationalTransform, Operation
from app.services.document_permissions import DocumentPermissions, PermissionLevel
from app.services.document_versioning import DocumentVersioning
from app.services.collaboration_state import document_locks

router = APIRouter()

# In-memory storage for active connections (in production, use Redis)
active_connections: Dict[str, Dict[str, WebSocket]] = {}
user_presence: Dict[str, Dict[str, dict]] = {}  # document_id -> {user_id: user_info}


class ConnectionManager:
    """Manage WebSocket connections for real-time collaboration"""

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, document_id: str, user_id: str, user_name: Optional[str] = None):
        await websocket.accept()

        if document_id not in self.active_connections:
            self.active_connections[document_id] = {}

        self.active_connections[document_id][user_id] = websocket

        # Broadcast user joined
        await self.broadcast_to_document(
            document_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "user_name": user_name or f"User {user_id[-4:]}",
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )

    def disconnect(self, document_id: str, user_id: str):
        if document_id in self.active_connections:
            if user_id in self.active_connections[document_id]:
                del self.active_connections[document_id][user_id]

            # Clean up empty document connections
            if not self.active_connections[document_id]:
                del self.active_connections[document_id]

    async def broadcast_to_document(self, document_id: str, message: dict, exclude_user: Optional[str] = None):
        """Broadcast message to all users in a document"""
        if document_id not in self.active_connections:
            return

        disconnected_users = []

        for user_id, websocket in self.active_connections[document_id].items():
            if user_id == exclude_user:
                continue

            try:
                await websocket.send_json(message)
            except Exception:
                # User disconnected
                disconnected_users.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(document_id, user_id)

    async def send_to_user(self, document_id: str, user_id: str, message: dict):
        """Send message to specific user in document"""
        if (document_id in self.active_connections and
            user_id in self.active_connections[document_id]):
            try:
                await self.active_connections[document_id][user_id].send_json(message)
            except Exception:
                self.disconnect(document_id, user_id)


manager = ConnectionManager()


@router.websocket("/documents/{document_id}")
async def document_collaboration(
    websocket: WebSocket,
    document_id: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time document collaboration
    """
    # Get current user (in production, validate JWT token)
    try:
        current_user = await get_current_user(token, db) if token else None
    except:
        current_user = None

    if not current_user:
        await websocket.close(code=4001, reason="Authentication required")
        return

    # Check read permissions
    if not DocumentPermissions.can_read(document_id, current_user, db):
        await websocket.close(code=4003, reason="Insufficient permissions")
        return

    user_id = str(current_user.id)
    user_name = current_user.email or f"User {user_id[-4:]}"

    await manager.connect(websocket, document_id, user_id, user_name)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "cursor_update":
                # Broadcast cursor position to other users
                await manager.broadcast_to_document(
                    document_id,
                    {
                        "type": "cursor_update",
                        "user_id": user_id,
                        "user_name": user_name,
                        "position": data.get("position"),
                        "selection": data.get("selection"),
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    exclude_user=user_id
                )

            elif message_type == "content_change":
                # Check write permissions
                if not DocumentPermissions.can_write(document_id, current_user, db):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Insufficient permissions to edit document"
                    })
                    continue

                # Handle operational transform
                operation_data = data.get("operation")
                if operation_data:
                    operation = Operation.from_dict(operation_data)

                    # For now, just broadcast the operation
                    # In a full implementation, we'd transform against concurrent operations
                    await manager.broadcast_to_document(
                        document_id,
                        {
                            "type": "content_change",
                            "user_id": user_id,
                            "user_name": user_name,
                            "operation": operation.to_dict(),
                            "timestamp": datetime.utcnow().isoformat()
                        },
                        exclude_user=user_id
                    )

            elif message_type == "ping":
                # Respond to ping
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(document_id, user_id)
        # Broadcast user left
        await manager.broadcast_to_document(
            document_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "user_name": user_name,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/documents/{document_id}/users")
async def get_active_users(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get list of active users in a document"""
    users = []
    if document_id in manager.active_connections:
        for user_id in manager.active_connections[document_id].keys():
            users.append({
                "user_id": user_id,
                "status": "active"
            })

    return {"users": users}


@router.post("/documents/{document_id}/lock")
async def acquire_document_lock(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acquire exclusive lock on document section"""
    # TODO: Implement proper locking mechanism
    return {"message": "Lock acquired"}


@router.delete("/documents/{document_id}/lock")
async def release_document_lock(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Release document lock"""
    # TODO: Implement proper unlocking
    return {"message": "Lock released"}


@router.post("/documents/{document_id}/cursor")
async def update_cursor_position(
    document_id: str,
    position: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cursor position for real-time collaboration"""
    # Check read permissions (cursor updates require read access)
    if not DocumentPermissions.can_read(document_id, current_user, db):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Broadcast cursor position to other users
    await manager.broadcast_to_document(
        document_id,
        {
            "type": "cursor_update",
            "user_id": str(current_user.id),
            "user_name": current_user.email,  # Use email as display name for now
            "position": position.get("position"),
            "timestamp": datetime.utcnow().isoformat()
        },
        exclude_user=str(current_user.id)
    )

    return {"message": "Cursor position updated"}


@router.post("/documents/{document_id}/content")
async def update_document_content(
    document_id: str,
    content_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update document content for real-time collaboration"""
    # Check write permissions
    if not DocumentPermissions.can_write(document_id, current_user, db):
        raise HTTPException(status_code=403, detail="Insufficient permissions to edit document")

    # For now, just broadcast the content change
    # In a real implementation, you'd apply operational transforms
    await manager.broadcast_to_document(
        document_id,
        {
            "type": "content_change",
            "user_id": str(current_user.id),
            "user_name": current_user.email,
            "content": content_data.get("content"),
            "timestamp": datetime.utcnow().isoformat()
        },
        exclude_user=str(current_user.id)
    )

    return {"message": "Content updated"}


@router.get("/documents/{document_id}/versions")
async def get_document_versions(
    document_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get version history for a document"""
    # Check read permissions
    if not DocumentPermissions.can_read(document_id, current_user, db):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    versions = DocumentVersioning.get_version_history(document_id, limit)

    return {
        "versions": [
            {
                "version_id": v.version_id,
                "created_by": v.created_by,
                "created_at": v.created_at.isoformat(),
                "parent_version": v.parent_version,
                "metadata": v.metadata
            }
            for v in versions
        ]
    }


@router.get("/documents/{document_id}/versions/{version_id}")
async def get_document_version(
    document_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific version of a document"""
    # Check read permissions
    if not DocumentPermissions.can_read(document_id, current_user, db):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    version = DocumentVersioning.get_version(version_id)
    if not version or version.document_id != document_id:
        raise HTTPException(status_code=404, detail="Version not found")

    return {
        "version_id": version.version_id,
        "document_id": version.document_id,
        "content": version.content,
        "created_by": version.created_by,
        "created_at": version.created_at.isoformat(),
        "parent_version": version.parent_version,
        "metadata": version.metadata
    }


@router.post("/documents/{document_id}/versions/{version_id}/revert")
async def revert_document_version(
    document_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revert document to a specific version"""
    # Check write permissions
    if not DocumentPermissions.can_write(document_id, current_user, db):
        raise HTTPException(status_code=403, detail="Insufficient permissions to edit document")

    new_content = DocumentVersioning.revert_to_version(document_id, version_id, current_user)
    if new_content is None:
        raise HTTPException(status_code=404, detail="Version not found")

    # Broadcast the revert
    await manager.broadcast_to_document(
        document_id,
        {
            "type": "document_reverted",
            "user_id": str(current_user.id),
            "user_name": current_user.email,
            "version_id": version_id,
            "new_content": new_content,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    return {"message": "Document reverted", "content": new_content}