"use client";

import * as React from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

export interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface TypingIndicatorProps {
  users: TypingUser[];
  maxVisibleUsers?: number;
  showAvatars?: boolean;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: {
    dot: "h-1 w-1",
    avatar: "h-5 w-5",
    text: "text-xs",
    container: "gap-1.5 py-1 px-2",
    dotGap: "gap-0.5",
  },
  md: {
    dot: "h-1.5 w-1.5",
    avatar: "h-6 w-6",
    text: "text-sm",
    container: "gap-2 py-1.5 px-3",
    dotGap: "gap-1",
  },
  lg: {
    dot: "h-2 w-2",
    avatar: "h-8 w-8",
    text: "text-base",
    container: "gap-2.5 py-2 px-4",
    dotGap: "gap-1",
  },
};

// Animated dot component
const AnimatedDot: React.FC<{
  delay: number;
  className?: string;
}> = ({ delay, className }) => (
  <motion.span
    className={cn("rounded-full bg-muted-foreground", className)}
    initial={{ opacity: 0.4 }}
    animate={{
      opacity: [0.4, 1, 0.4],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration: 1.2,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  />
);

// Dots animation component
const TypingDots: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const styles = sizeStyles[size];

  return (
    <div className={cn("flex items-center", styles.dotGap, className)}>
      <AnimatedDot delay={0} className={styles.dot} />
      <AnimatedDot delay={0.2} className={styles.dot} />
      <AnimatedDot delay={0.4} className={styles.dot} />
    </div>
  );
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  maxVisibleUsers = 3,
  showAvatars = true,
  showText = true,
  size = "md",
  className,
}) => {
  const styles = sizeStyles[size];

  // Format typing text
  const typingText = useMemo(() => {
    if (users.length === 0) return "";
    if (users.length === 1) return `${users[0].name} is typing`;
    if (users.length === 2) return `${users[0].name} and ${users[1].name} are typing`;
    if (users.length === 3) {
      return `${users[0].name}, ${users[1].name}, and ${users[2].name} are typing`;
    }
    const othersCount = users.length - 2;
    return `${users[0].name}, ${users[1].name}, and ${othersCount} others are typing`;
  }, [users]);

  // Visible users for avatars
  const visibleUsers = users.slice(0, maxVisibleUsers);
  const remainingCount = users.length - maxVisibleUsers;

  if (users.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center rounded-full bg-muted/50",
          styles.container,
          className
        )}
      >
        {/* Avatars */}
        {showAvatars && (
          <div className="flex -space-x-1">
            {visibleUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <Avatar className={cn(styles.avatar, "border-2 border-background")}>
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="text-[8px]">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
            {remainingCount > 0 && (
              <div
                className={cn(
                  styles.avatar,
                  "flex items-center justify-center rounded-full bg-muted border-2 border-background"
                )}
              >
                <span className="text-[8px] font-medium text-muted-foreground">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Typing dots */}
        <TypingDots size={size} />

        {/* Text */}
        {showText && (
          <span className={cn(styles.text, "text-muted-foreground")}>
            {typingText}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Simple inline typing indicator (just dots)
export interface InlineTypingDotsProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const InlineTypingDots: React.FC<InlineTypingDotsProps> = ({
  size = "md",
  className,
}) => {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <TypingDots size={size} />
    </span>
  );
};

// Typing indicator for chat bubble
export interface TypingBubbleProps {
  user?: TypingUser;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const TypingBubble: React.FC<TypingBubbleProps> = ({
  user,
  showAvatar = true,
  size = "md",
  className,
}) => {
  const styles = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("flex items-end gap-2", className)}
    >
      {showAvatar && user && (
        <Avatar className={styles.avatar}>
          {user.avatar ? (
            <AvatarImage src={user.avatar} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-[8px]">
            {user.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-2xl bg-muted py-3 px-4",
          "rounded-bl-md"
        )}
      >
        <TypingDots size={size} />
      </div>
    </motion.div>
  );
};

// Multiple users typing summary (for footer/status bar)
export interface TypingSummaryProps {
  users: TypingUser[];
  className?: string;
}

export const TypingSummary: React.FC<TypingSummaryProps> = ({
  users,
  className,
}) => {
  const text = useMemo(() => {
    if (users.length === 0) return "";
    if (users.length === 1) return `${users[0].name} is typing...`;
    if (users.length === 2) return `${users[0].name} and ${users[1].name} are typing...`;
    return `${users.length} people are typing...`;
  }, [users]);

  if (users.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className
        )}
      >
        <InlineTypingDots size="sm" />
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypingIndicator;
