/**
 * CursorOverlay component for displaying real-time collaborative cursors
 */

import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName?: string;
  color?: string;
  timestamp: number;
}

interface CursorOverlayProps {
  documentId: string;
  currentUserId: string;
  containerRef: React.RefObject<HTMLElement>;
  className?: string;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  documentId,
  currentUserId,
  containerRef,
  className = "",
}) => {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(
    new Map(),
  );

  // Generate consistent colors for users
  const getUserColor = useCallback((userId: string): string => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];
    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Clean up old cursors (inactive for more than 30 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const newCursors = new Map(prev);
        for (const [userId, cursor] of newCursors) {
          if (now - cursor.timestamp > 30000) {
            // 30 seconds
            newCursors.delete(userId);
          }
        }
        return newCursors;
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // WebSocket connection for cursor updates
  useEffect(() => {
    if (!documentId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/collaboration/documents/${documentId}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "cursor_update" && data.user_id !== currentUserId) {
          const cursor: CursorPosition = {
            x: data.position?.x || 0,
            y: data.position?.y || 0,
            userId: data.user_id,
            userName: data.user_name || `User ${data.user_id.slice(-4)}`,
            color: getUserColor(data.user_id),
            timestamp: Date.now(),
          };

          setCursors((prev) => new Map(prev.set(data.user_id, cursor)));
        }
      } catch (error) {
        console.error("Error parsing cursor update:", error);
      }
    };

    ws.onclose = () => {
      // Clear all cursors when connection is lost
      setCursors(new Map());
    };

    return () => {
      ws.close();
    };
  }, [documentId, currentUserId, getUserColor]);

  // Track current user's cursor position
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Send cursor position to server
      // For now, we'll use a simple approach - in production you'd maintain a persistent connection
      fetch(`/api/v1/collaboration/documents/${documentId}/cursor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: { x, y },
          timestamp: Date.now(),
        }),
      }).catch(console.error);
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [documentId, containerRef]);

  return (
    <div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
      <AnimatePresence>
        {Array.from(cursors.values()).map((cursor) => (
          <motion.div
            key={cursor.userId}
            className="absolute"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: "translate(-2px, -2px)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Cursor pointer */}
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: `12px solid ${cursor.color}`,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}
            />

            {/* User label */}
            <div
              className="absolute top-3 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{
                backgroundColor: cursor.color,
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {cursor.userName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CursorOverlay;
