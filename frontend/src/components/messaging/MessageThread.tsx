import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Pin,
  Star,
  MoreHorizontal,
  Reply,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import type { Message } from '@/lib/api/messages';
import MessageReactions from './MessageReactions';

interface MessageThreadProps {
  messages: Message[];
  currentUserId: number;
  onReply?: (messageId: number) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
  onToggleStar?: (messageId: number) => void;
  onTogglePin?: (messageId: number) => void;
  onAddReaction?: (messageId: number, emoji: string) => void;
  onRemoveReaction?: (messageId: number, emoji: string) => void;
  onMarkRead?: (messageId: number) => void;
  loading?: boolean;
  showReplies?: boolean;
  className?: string;
}

interface MessageItemProps {
  message: Message;
  currentUserId: number;
  depth?: number;
  onReply?: (messageId: number) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
  onToggleStar?: (messageId: number) => void;
  onTogglePin?: (messageId: number) => void;
  onAddReaction?: (messageId: number, emoji: string) => void;
  onRemoveReaction?: (messageId: number, emoji: string) => void;
  showReplies?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
  onToggleStar,
  onTogglePin,
  onAddReaction,
  onRemoveReaction,
  showReplies = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = message.author_id === currentUserId;
  const hasReplies = message.replies && message.replies.length > 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMessageTypeStyles = () => {
    switch (message.message_type) {
      case 'system':
        return 'bg-gray-50 border-gray-200';
      case 'notification':
        return message.level === 'error'
          ? 'bg-red-50 border-red-200'
          : message.level === 'warning'
          ? 'bg-yellow-50 border-yellow-200'
          : message.level === 'success'
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div
        className={`rounded-lg border p-4 ${getMessageTypeStyles()} ${
          !message.is_read ? 'ring-2 ring-blue-100' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {message.author?.avatar_url ? (
                <img
                  src={message.author.avatar_url}
                  alt={message.author.full_name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {message.author?.full_name || 'Unknown User'}
                </span>
                {message.is_pinned && (
                  <Pin className="w-3 h-3 text-blue-500" />
                )}
                {message.starred && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                <div className="py-1">
                  {onReply && (
                    <button
                      onClick={() => {
                        onReply(message.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </button>
                  )}
                  {onToggleStar && (
                    <button
                      onClick={() => {
                        onToggleStar(message.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Star className={`w-4 h-4 mr-2 ${message.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      {message.starred ? 'Unstar' : 'Star'}
                    </button>
                  )}
                  {onTogglePin && (
                    <button
                      onClick={() => {
                        onTogglePin(message.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pin className={`w-4 h-4 mr-2 ${message.is_pinned ? 'text-blue-500' : ''}`} />
                      {message.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  {isOwner && onEdit && (
                    <button
                      onClick={() => {
                        onEdit(message);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                  {isOwner && onDelete && (
                    <button
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        {message.subject && (
          <h4 className="font-medium text-gray-900 mt-2">{message.subject}</h4>
        )}

        {/* Body */}
        <div className="mt-2 text-sm text-gray-700">
          {message.body_html ? (
            <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
          ) : (
            <p className="whitespace-pre-wrap">{message.body}</p>
          )}
        </div>

        {/* Reactions */}
        {(message.reactions && message.reactions.length > 0) || onAddReaction ? (
          <div className="mt-3">
            <MessageReactions
              reactions={message.reactions || []}
              currentUserId={currentUserId}
              onAdd={onAddReaction ? (emoji) => onAddReaction(message.id, emoji) : undefined}
              onRemove={onRemoveReaction ? (emoji) => onRemoveReaction(message.id, emoji) : undefined}
            />
          </div>
        ) : null}

        {/* Reply count */}
        {hasReplies && showReplies && (
          <button
            onClick={() => setRepliesExpanded(!repliesExpanded)}
            className="flex items-center mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            {repliesExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )}
            {message.replies!.length} {message.replies!.length === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Replies */}
      {hasReplies && showReplies && repliesExpanded && (
        <div className="mt-3 space-y-3">
          {message.replies!.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStar={onToggleStar}
              onTogglePin={onTogglePin}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              showReplies={showReplies}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onToggleStar,
  onTogglePin,
  onAddReaction,
  onRemoveReaction,
  onMarkRead,
  loading = false,
  showReplies = true,
  className = '',
}) => {
  // Mark messages as read when they're viewed
  useEffect(() => {
    if (onMarkRead) {
      messages.forEach((msg) => {
        if (!msg.is_read) {
          onMarkRead(msg.id);
        }
      });
    }
  }, [messages, onMarkRead]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/6" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No messages yet</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
          onTogglePin={onTogglePin}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
          showReplies={showReplies}
        />
      ))}
    </div>
  );
};

export default MessageThread;
