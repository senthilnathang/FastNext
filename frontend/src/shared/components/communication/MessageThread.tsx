"use client";

import * as React from "react";
import { useCallback, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, MessageCircle, MoreHorizontal } from "lucide-react";

import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";

export interface ThreadMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  isEdited?: boolean;
}

export interface MessageThreadProps {
  parentMessage: ThreadMessage;
  replies: ThreadMessage[];
  onReply?: (parentId: string) => void;
  onMessageClick?: (messageId: string) => void;
  renderMessage?: (message: ThreadMessage, isParent: boolean) => React.ReactNode;
  defaultExpanded?: boolean;
  maxVisibleReplies?: number;
  showReplyButton?: boolean;
  className?: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  parentMessage,
  replies,
  onReply,
  onMessageClick,
  renderMessage,
  defaultExpanded = true,
  maxVisibleReplies = 5,
  showReplyButton = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAllReplies, setShowAllReplies] = useState(false);

  // Calculate visible replies
  const visibleReplies = useMemo(() => {
    if (showAllReplies || replies.length <= maxVisibleReplies) {
      return replies;
    }
    return replies.slice(0, maxVisibleReplies);
  }, [replies, showAllReplies, maxVisibleReplies]);

  const hiddenCount = replies.length - visibleReplies.length;

  // Format timestamp
  const formatTime = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, []);

  // Default message renderer
  const defaultRenderMessage = useCallback(
    (message: ThreadMessage, isParent: boolean) => (
      <div
        className={cn(
          "group flex gap-3",
          !isParent && "pl-0"
        )}
      >
        <Avatar className={cn(isParent ? "h-10 w-10" : "h-8 w-8")}>
          {message.author.avatar ? (
            <AvatarImage
              src={message.author.avatar}
              alt={message.author.name}
            />
          ) : null}
          <AvatarFallback
            className={cn(
              isParent ? "text-sm" : "text-xs"
            )}
          >
            {message.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "font-medium",
                isParent ? "text-sm" : "text-xs"
              )}
            >
              {message.author.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(new Date(message.timestamp))}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-foreground whitespace-pre-wrap break-words",
              isParent ? "text-sm" : "text-xs"
            )}
          >
            {message.content}
          </p>
        </div>
      </div>
    ),
    [formatTime]
  );

  const messageRenderer = renderMessage || defaultRenderMessage;

  return (
    <div className={cn("", className)}>
      {/* Parent message */}
      <div
        className={cn(
          "cursor-pointer hover:bg-muted/50 rounded-lg p-3 transition-colors",
          onMessageClick && "cursor-pointer"
        )}
        onClick={() => onMessageClick?.(parentMessage.id)}
      >
        {messageRenderer(parentMessage, true)}

        {/* Reply stats and actions */}
        {replies.length > 0 && (
          <div className="mt-3 flex items-center gap-4 ml-13">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1.5 text-primary hover:text-primary/80"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                  </span>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            {showReplyButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(parentMessage.id);
                }}
              >
                Reply
              </Button>
            )}
          </div>
        )}

        {/* No replies, show reply button */}
        {replies.length === 0 && showReplyButton && (
          <div className="mt-3 ml-13">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onReply?.(parentMessage.id);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              Reply
            </Button>
          </div>
        )}
      </div>

      {/* Thread replies */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <AnimatePresence mode="popLayout">
            {visibleReplies.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative ml-5 mt-1"
              >
                {/* Thread line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-1">
                  {visibleReplies.map((reply, index) => (
                    <motion.div
                      key={reply.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "relative pl-8 py-2 hover:bg-muted/30 rounded-lg transition-colors",
                        onMessageClick && "cursor-pointer"
                      )}
                      onClick={() => onMessageClick?.(reply.id)}
                    >
                      {/* Horizontal connector line */}
                      <div className="absolute left-5 top-6 w-3 h-px bg-border" />
                      {messageRenderer(reply, false)}
                    </motion.div>
                  ))}

                  {/* Show more replies button */}
                  {hiddenCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative pl-8"
                    >
                      <div className="absolute left-5 top-3 w-3 h-px bg-border" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllReplies(true)}
                        className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        Show {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Thread preview component (for showing in message list)
export interface ThreadPreviewProps {
  replyCount: number;
  latestReply?: {
    author: {
      name: string;
      avatar?: string;
    };
    timestamp: Date;
  };
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  onClick?: () => void;
  className?: string;
}

export const ThreadPreview: React.FC<ThreadPreviewProps> = ({
  replyCount,
  latestReply,
  participants = [],
  onClick,
  className,
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-left py-1 px-2 rounded",
        "text-primary hover:bg-primary/10 transition-colors",
        className
      )}
    >
      {/* Participant avatars */}
      {participants.length > 0 && (
        <div className="flex -space-x-1.5">
          {participants.slice(0, 3).map((participant) => (
            <Avatar key={participant.id} className="h-5 w-5 border border-background">
              {participant.avatar ? (
                <AvatarImage src={participant.avatar} alt={participant.name} />
              ) : null}
              <AvatarFallback className="text-[8px]">
                {participant.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs">
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="font-medium">
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>
        {latestReply && (
          <span className="text-muted-foreground">
            Last reply {formatTime(new Date(latestReply.timestamp))}
          </span>
        )}
      </div>
    </button>
  );
};

export default MessageThread;
