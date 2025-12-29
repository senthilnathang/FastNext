"""WebSocket connection manager for real-time updates"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates

    Features:
    - Per-user connection tracking (multiple tabs/devices)
    - Heartbeat/ping-pong for connection health
    - Broadcast to specific users or all connected users
    - Automatic cleanup on disconnect
    """

    def __init__(self):
        # user_id -> list of active websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # websocket -> user_id (reverse mapping for quick lookup)
        self._websocket_to_user: Dict[WebSocket, int] = {}
        # websocket -> last activity timestamp
        self._last_activity: Dict[WebSocket, datetime] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """Accept a new WebSocket connection for a user"""
        await websocket.accept()

        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []

            self.active_connections[user_id].append(websocket)
            self._websocket_to_user[websocket] = user_id
            self._last_activity[websocket] = datetime.now(timezone.utc)

        logger.info(f"WebSocket connected: user_id={user_id}, total_connections={len(self.active_connections[user_id])}")

        # Send connection success message
        await self.send_personal_message(
            websocket,
            {
                "type": "connection:established",
                "data": {
                    "user_id": user_id,
                    "connected_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        )

    async def disconnect(self, websocket: WebSocket) -> Optional[int]:
        """Remove a WebSocket connection and return the user_id"""
        async with self._lock:
            user_id = self._websocket_to_user.pop(websocket, None)
            self._last_activity.pop(websocket, None)

            if user_id and user_id in self.active_connections:
                try:
                    self.active_connections[user_id].remove(websocket)
                except ValueError:
                    pass

                # Clean up empty user entries
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

                logger.info(f"WebSocket disconnected: user_id={user_id}")

            return user_id

    async def send_personal_message(self, websocket: WebSocket, message: dict) -> bool:
        """Send a message to a specific websocket connection"""
        try:
            await websocket.send_json(message)
            self._last_activity[websocket] = datetime.now(timezone.utc)
            return True
        except Exception as e:
            logger.warning(f"Failed to send message: {e}")
            return False

    async def broadcast_to_user(self, user_id: int, message: dict) -> int:
        """Broadcast a message to all connections of a specific user

        Returns the number of successful sends
        """
        if user_id not in self.active_connections:
            return 0

        success_count = 0
        failed_connections: List[WebSocket] = []

        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
                self._last_activity[websocket] = datetime.now(timezone.utc)
                success_count += 1
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                failed_connections.append(websocket)

        # Clean up failed connections
        for ws in failed_connections:
            await self.disconnect(ws)

        return success_count

    async def broadcast_to_users(self, user_ids: List[int], message: dict) -> Dict[int, int]:
        """Broadcast a message to multiple users

        Returns dict of user_id -> success_count
        """
        results = {}
        for user_id in user_ids:
            results[user_id] = await self.broadcast_to_user(user_id, message)
        return results

    async def broadcast_to_all(self, message: dict) -> int:
        """Broadcast a message to all connected users

        Returns total number of successful sends
        """
        total = 0
        for user_id in list(self.active_connections.keys()):
            total += await self.broadcast_to_user(user_id, message)
        return total

    def get_user_connection_count(self, user_id: int) -> int:
        """Get the number of active connections for a user"""
        return len(self.active_connections.get(user_id, []))

    def get_connected_user_ids(self) -> Set[int]:
        """Get all connected user IDs"""
        return set(self.active_connections.keys())

    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        return sum(len(conns) for conns in self.active_connections.values())

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user has at least one active connection"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def ping_connection(self, websocket: WebSocket) -> bool:
        """Send a ping to check if connection is alive"""
        try:
            await websocket.send_json({"type": "ping", "timestamp": datetime.now(timezone.utc).isoformat()})
            return True
        except Exception:
            return False

    async def cleanup_stale_connections(self, max_idle_seconds: int = 300) -> int:
        """Remove connections that haven't had activity in max_idle_seconds

        Returns the number of connections cleaned up
        """
        now = datetime.now(timezone.utc)
        stale_connections: List[WebSocket] = []

        async with self._lock:
            for websocket, last_activity in list(self._last_activity.items()):
                idle_time = (now - last_activity).total_seconds()
                if idle_time > max_idle_seconds:
                    stale_connections.append(websocket)

        cleaned_count = 0
        for ws in stale_connections:
            try:
                await ws.close(code=1000, reason="Connection timeout")
            except Exception:
                pass
            await self.disconnect(ws)
            cleaned_count += 1

        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} stale connections")

        return cleaned_count

    def get_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_users": len(self.active_connections),
            "total_connections": self.get_total_connections(),
            "users_online": list(self.active_connections.keys()),
        }


# Global connection manager instance
manager = ConnectionManager()
