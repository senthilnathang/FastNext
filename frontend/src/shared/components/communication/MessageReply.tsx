"use client";

import * as React from "react";
import { useCallback, useRef, useEffect, useState } from "react";
import { X, Reply, Send, CornerUpLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

export interface QuotedMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
}

export interface MessageReplyProps {
  quotedMessage: QuotedMessage;
  onCancel: () => void;
  onSubmit: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  className?: string;
  showQuotedContent?: boolean;
  maxQuotedLines?: number;
}

export const MessageReply: React.FC<MessageReplyProps> = ({
  quotedMessage,
  onCancel,
  onSubmit,
  placeholder = "Write a reply...",
  maxLength = 2000,
  isSubmitting = false,
  autoFocus = true,
  className,
  showQuotedContent = true,
  maxQuotedLines = 2,
}) => {
  const [replyContent, setReplyContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (replyContent.trim() && !isSubmitting) {
      onSubmit(replyContent.trim());
      setReplyContent("");
    }
  }, [replyContent, isSubmitting, onSubmit]);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  // Truncate quoted content
  const truncatedContent = React.useMemo(() => {
    const lines = quotedMessage.content.split("\n");
    if (lines.length > maxQuotedLines) {
      return lines.slice(0, maxQuotedLines).join("\n") + "...";
    }
    return quotedMessage.content;
  }, [quotedMessage.content, maxQuotedLines]);

  // Format timestamp
  const formattedTime = React.useMemo(() => {
    const date = new Date(quotedMessage.timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [quotedMessage.timestamp]);

  const remainingChars = maxLength - replyContent.length;
  const isOverLimit = remainingChars < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "border rounded-lg bg-background shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Reply indicator bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CornerUpLeft className="h-4 w-4" />
          <span>
            Replying to{" "}
            <span className="font-medium text-foreground">
              {quotedMessage.author.name}
            </span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quoted message */}
      {showQuotedContent && (
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="flex items-start gap-2">
            <div className="w-0.5 h-full min-h-[2rem] bg-primary/50 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5">
                  {quotedMessage.author.avatar ? (
                    <AvatarImage
                      src={quotedMessage.author.avatar}
                      alt={quotedMessage.author.name}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {quotedMessage.author.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {quotedMessage.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formattedTime}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {truncatedContent}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reply input */}
      <div className="p-3">
        <Textarea
          ref={textareaRef}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength + 100} // Allow slight overflow for UX
          disabled={isSubmitting}
          className={cn(
            "min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 bg-transparent",
            isOverLimit && "text-destructive"
          )}
        />

        {/* Footer with character count and submit */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">
            {remainingChars <= 100 && (
              <span
                className={cn(
                  isOverLimit && "text-destructive font-medium"
                )}
              >
                {remainingChars} characters remaining
              </span>
            )}
            <span className="ml-2 opacity-60">Ctrl+Enter to send</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!replyContent.trim() || isOverLimit || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Reply
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Compact reply quote indicator (for displaying in message list)
export interface ReplyQuoteProps {
  quotedMessage: Pick<QuotedMessage, "id" | "content" | "author">;
  onClick?: () => void;
  className?: string;
}

export const ReplyQuote: React.FC<ReplyQuoteProps> = ({
  quotedMessage,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 text-left mb-2 group",
        onClick && "cursor-pointer hover:bg-muted/50 rounded transition-colors",
        className
      )}
    >
      <div className="w-0.5 h-full min-h-[1.5rem] bg-primary/40 group-hover:bg-primary/60 rounded-full transition-colors" />
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1 mb-0.5">
          <Reply className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-primary">
            {quotedMessage.author.name}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {quotedMessage.content}
        </p>
      </div>
    </button>
  );
};

export default MessageReply;
