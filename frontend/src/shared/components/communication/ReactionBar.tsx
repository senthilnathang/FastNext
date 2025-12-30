"use client";

import * as React from "react";
import { useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { EmojiPicker } from "./EmojiPicker";

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface ReactionBarProps {
  reactions: Reaction[];
  onReactionAdd: (emoji: string) => void;
  onReactionRemove: (emoji: string) => void;
  onReactionToggle?: (emoji: string, hasReacted: boolean) => void;
  currentUserId?: string;
  maxVisibleReactions?: number;
  showAddButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

const sizeStyles = {
  sm: {
    button: "h-6 px-1.5 text-xs gap-1",
    emoji: "text-sm",
    count: "text-xs",
    addButton: "h-6 w-6",
    addIcon: "h-3 w-3",
  },
  md: {
    button: "h-7 px-2 text-sm gap-1.5",
    emoji: "text-base",
    count: "text-xs",
    addButton: "h-7 w-7",
    addIcon: "h-3.5 w-3.5",
  },
  lg: {
    button: "h-8 px-2.5 text-sm gap-2",
    emoji: "text-lg",
    count: "text-sm",
    addButton: "h-8 w-8",
    addIcon: "h-4 w-4",
  },
};

export const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  onReactionAdd,
  onReactionRemove,
  onReactionToggle,
  currentUserId,
  maxVisibleReactions = 10,
  showAddButton = true,
  size = "md",
  className,
  disabled = false,
}) => {
  const styles = sizeStyles[size];

  // Sort reactions by count (descending) and limit visible
  const sortedReactions = useMemo(() => {
    return [...reactions]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxVisibleReactions);
  }, [reactions, maxVisibleReactions]);

  // Handle reaction click
  const handleReactionClick = useCallback((reaction: Reaction) => {
    if (disabled) return;

    if (onReactionToggle) {
      onReactionToggle(reaction.emoji, reaction.hasReacted);
    } else if (reaction.hasReacted) {
      onReactionRemove(reaction.emoji);
    } else {
      onReactionAdd(reaction.emoji);
    }
  }, [disabled, onReactionToggle, onReactionAdd, onReactionRemove]);

  // Handle new emoji from picker
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (disabled) return;
    onReactionAdd(emoji);
  }, [disabled, onReactionAdd]);

  // Format user list for tooltip
  const formatUserList = useCallback((users: string[], hasReacted: boolean) => {
    const displayUsers = [...users];

    // Show current user as "You" if they reacted
    if (hasReacted && currentUserId) {
      const userIndex = displayUsers.indexOf(currentUserId);
      if (userIndex !== -1) {
        displayUsers.splice(userIndex, 1);
        displayUsers.unshift("You");
      }
    }

    if (displayUsers.length <= 3) {
      return displayUsers.join(", ");
    }

    const visible = displayUsers.slice(0, 2);
    const remaining = displayUsers.length - 2;
    return `${visible.join(", ")} and ${remaining} others`;
  }, [currentUserId]);

  if (reactions.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        <AnimatePresence mode="popLayout">
          {sortedReactions.map((reaction) => (
            <motion.div
              key={reaction.emoji}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={reaction.hasReacted ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleReactionClick(reaction)}
                    disabled={disabled}
                    className={cn(
                      styles.button,
                      "rounded-full transition-all",
                      reaction.hasReacted && "ring-2 ring-primary/30"
                    )}
                  >
                    <span className={styles.emoji}>{reaction.emoji}</span>
                    <span
                      className={cn(
                        styles.count,
                        "font-medium",
                        reaction.hasReacted
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {reaction.count}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">
                    {formatUserList(reaction.users, reaction.hasReacted)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>

        {showAddButton && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            disabled={disabled}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  styles.addButton,
                  "rounded-full hover:bg-muted"
                )}
              >
                <Plus className={styles.addIcon} />
              </Button>
            }
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default ReactionBar;
