"""WebSocket endpoint for real-time updates"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.security import decode_token
from app.core.websocket import manager
from app.services.realtime import realtime

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


async def authenticate_websocket(token: str) -> Optional[int]:
    """Authenticate a WebSocket connection using JWT token

    Returns user_id if valid, None otherwise
    """
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    if payload.get("type") != "access":
        return None

    try:
        user_id = int(payload.get("sub"))
        return user_id
    except (TypeError, ValueError):
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """WebSocket endpoint for real-time updates

    Connect with: ws://host/api/v1/ws?token=<jwt_access_token>

    Message Types (client -> server):
    - ping: Heartbeat (server responds with pong)
    - typing:start: User started typing {recipient_id: int, context?: string}
    - typing:stop: User stopped typing {recipient_id: int}
    - presence:update: Update presence status {status: "online" | "away" | "busy"}

    Message Types (server -> client):
    - connection:established: Connection successful
    - pong: Heartbeat response
    - inbox:new: New inbox item received
    - inbox:updated: Inbox item status changed
    - message:new: New message received
    - message:reaction: Reaction added/removed
    - typing:start: Someone started typing
    - typing:stop: Someone stopped typing
    - read:receipt: Message was read
    - user:online: User came online
    - user:offline: User went offline
    - error: Error message
    """
    # Authenticate before accepting connection
    user_id = await authenticate_websocket(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Accept and register connection
    await manager.connect(websocket, user_id)

    # Notify others that user is online (optional - can be enabled per requirements)
    # await realtime.notify_user_online(user_id, "User")  # Would need user name

    try:
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat_loop(websocket, user_id))

        while True:
            try:
                # Wait for incoming messages
                data = await websocket.receive_json()
                await handle_client_message(websocket, user_id, data)
            except ValueError:
                # Invalid JSON
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON"}
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        # Cancel heartbeat task
        if 'heartbeat_task' in locals():
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        # Disconnect and cleanup
        await manager.disconnect(websocket)

        # Notify others that user is offline (if they have no more connections)
        if not manager.is_user_online(user_id):
            pass  # await realtime.notify_user_offline(user_id)


async def heartbeat_loop(websocket: WebSocket, user_id: int, interval: int = 30):
    """Send periodic heartbeats to keep connection alive"""
    while True:
        try:
            await asyncio.sleep(interval)
            await websocket.send_json({"type": "heartbeat"})
        except Exception:
            break


async def handle_client_message(websocket: WebSocket, user_id: int, data: dict):
    """Handle incoming messages from WebSocket clients"""
    message_type = data.get("type")

    if message_type == "ping":
        # Respond to ping with pong
        await websocket.send_json({"type": "pong"})

    elif message_type == "typing:start":
        # User started typing - notify recipient
        recipient_id = data.get("data", {}).get("recipient_id")
        context = data.get("data", {}).get("context")
        if recipient_id:
            # Get user name from database in production
            await realtime.notify_typing_start(
                recipient_id=recipient_id,
                sender_id=user_id,
                sender_name=f"User {user_id}",  # Replace with actual name lookup
                context=context,
            )

    elif message_type == "typing:stop":
        # User stopped typing - notify recipient
        recipient_id = data.get("data", {}).get("recipient_id")
        if recipient_id:
            await realtime.notify_typing_stop(
                recipient_id=recipient_id,
                sender_id=user_id,
            )

    elif message_type == "presence:update":
        # Handle presence updates (online, away, busy)
        status = data.get("data", {}).get("status", "online")
        logger.info(f"User {user_id} presence update: {status}")
        # Could broadcast to relevant users or update database

    else:
        # Unknown message type
        await websocket.send_json({
            "type": "error",
            "data": {"message": f"Unknown message type: {message_type}"}
        })


@router.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics (admin only)"""
    return manager.get_stats()


@router.get("/ws/online/{user_id}")
async def check_user_online(user_id: int):
    """Check if a specific user is online"""
    return {"user_id": user_id, "online": manager.is_user_online(user_id)}
