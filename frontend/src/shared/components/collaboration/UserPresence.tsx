/**
 * UserPresence component for displaying active collaborators
 */

import { AnimatePresence, motion } from "framer-motion";
import { User, Users } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface UserPresenceInfo {
  userId: string;
  userName?: string;
  avatar?: string;
  color: string;
  lastActive: number;
  status: "active" | "idle" | "away";
}

interface UserPresenceProps {
  documentId: string;
  currentUserId: string;
  className?: string;
  showAvatars?: boolean;
  compact?: boolean;
}

// Helper to safely get avatar URL
const getAvatarUrl = (user: UserPresenceInfo): string => {
  return user.avatar || "";
};

// Safe Image component wrapper using Next.js Image
const SafeImage: React.FC<{
  src: string | undefined;
  alt: string | undefined;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ src, alt, ...props }) => {
  // Only render if src is a valid string
  if (!src || typeof src !== "string") {
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt || "User avatar"}
      width={props.width}
      height={props.height}
      className={props.className}
      style={props.style}
    />
  );
};

export const UserPresence: React.FC<UserPresenceProps> = ({
  documentId,
  currentUserId,
  className = "",
  showAvatars = true,
  compact = false,
}) => {
  const [users, setUsers] = useState<Map<string, UserPresenceInfo>>(new Map());

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

  // Clean up inactive users
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setUsers((prev) => {
        const newUsers = new Map(prev);
        for (const [userId, user] of newUsers) {
          // Remove users inactive for more than 5 minutes
          if (now - user.lastActive > 300000) {
            newUsers.delete(userId);
          } else if (now - user.lastActive > 60000) {
            // 1 minute idle
            newUsers.set(userId, { ...user, status: "idle" });
          }
        }
        return newUsers;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  // WebSocket connection for user presence
  useEffect(() => {
    if (!documentId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/collaboration/documents/${documentId}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "user_joined" && data.user_id !== currentUserId) {
          const userInfo: UserPresenceInfo = {
            userId: data.user_id,
            userName: data.user_name || `User ${data.user_id.slice(-4)}`,
            avatar: data.avatar,
            color: getUserColor(data.user_id),
            lastActive: Date.now(),
            status: "active",
          };

          setUsers((prev) => new Map(prev.set(data.user_id, userInfo)));
        } else if (data.type === "user_left") {
          setUsers((prev) => {
            const newUsers = new Map(prev);
            newUsers.delete(data.user_id);
            return newUsers;
          });
        } else if (
          data.type === "cursor_update" &&
          data.user_id !== currentUserId
        ) {
          // Update last active time on cursor movement
          setUsers((prev) => {
            const newUsers = new Map(prev);
            const existingUser = newUsers.get(data.user_id);
            if (existingUser) {
              newUsers.set(data.user_id, {
                ...existingUser,
                lastActive: Date.now(),
                status: "active",
              });
            }
            return newUsers;
          });
        }
      } catch (error) {
        console.error("Error parsing user presence update:", error);
      }
    };

    ws.onclose = () => {
      // Clear all users when connection is lost
      setUsers(new Map());
    };

    return () => {
      ws.close();
    };
  }, [documentId, currentUserId, getUserColor]);

  const activeUsers = Array.from(users.values()).filter(
    (user) => user.status === "active",
  );
  const idleUsers = Array.from(users.values()).filter(
    (user) => user.status === "idle",
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex -space-x-2">
          <AnimatePresence>
            {activeUsers.slice(0, 3).map((user) => (
              <motion.div
                key={user.userId}
                className="relative"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                {(() => {
                  const avatarUrl = getAvatarUrl(user);
                  return showAvatars && avatarUrl ? (
                    <SafeImage
                      src={avatarUrl}
                      alt={user.userName}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ borderColor: user.color }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: user.color }}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </AnimatePresence>

          {activeUsers.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                +{activeUsers.length - 3}
              </span>
            </div>
          )}
        </div>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          {activeUsers.length + idleUsers.length} online
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm ${className}`}
    >
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Active Collaborators ({activeUsers.length + idleUsers.length})
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {activeUsers.map((user) => (
            <motion.div
              key={user.userId}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                {(() => {
                  const avatarUrl = getAvatarUrl(user);
                  return showAvatars && avatarUrl ? (
                    <SafeImage
                      src={avatarUrl}
                      alt={user.userName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 shadow-sm"
                      style={{ borderColor: user.color }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full border-2 shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: user.color }}
                    >
                      <User className="w-5 h-5 text-white" />
                    </div>
                  );
                })()}
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: user.color }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.userName}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Active now
                </p>
              </div>
            </motion.div>
          ))}

          {idleUsers.map((user) => (
            <motion.div
              key={user.userId}
              className="flex items-center gap-3 opacity-60"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.6, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                {(() => {
                  const avatarUrl = getAvatarUrl(user);
                  return showAvatars && avatarUrl ? (
                    <SafeImage
                      src={avatarUrl}
                      alt={user.userName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 shadow-sm grayscale"
                      style={{ borderColor: user.color }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full border-2 shadow-sm flex items-center justify-center grayscale"
                      style={{ backgroundColor: user.color }}
                    >
                      <User className="w-5 h-5 text-white" />
                    </div>
                  );
                })()}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-gray-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Idle</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeUsers.length === 0 && idleUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No other collaborators online
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPresence;
