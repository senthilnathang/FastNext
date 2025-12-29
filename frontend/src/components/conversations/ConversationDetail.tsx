import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Search,
  User,
  Users,
  Hash,
  Check,
  CheckCheck,
} from 'lucide-react';
import type { Conversation, ConversationMessage } from '@/lib/api/conversations';
import type { Message } from '@/lib/api/messages';
import MessageComposer from '../messaging/MessageComposer';
import MessageReactions from '../messaging/MessageReactions';

interface ConversationDetailProps {
  conversation: Conversation;
  messages: ConversationMessage[];
  currentUserId: number;
  users?: { id: number; username: string; full_name: string; avatar_url?: string }[];
  onSendMessage: (data: { body: string; body_html?: string; parent_id?: number; mention_user_ids?: number[] }) => void;
  onLoadMore?: () => void;
  onBack?: () => void;
  onShowInfo?: () => void;
  onAddReaction?: (messageId: number, emoji: string) => void;
  onRemoveReaction?: (messageId: number, emoji: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  className?: string;
}

const formatMessageDate = (date: Date): string => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

const formatDateDivider = (date: Date): string => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
  messages,
  currentUserId,
  users = [],
  onSendMessage,
  onLoadMore,
  onBack,
  onShowInfo,
  onAddReaction,
  onRemoveReaction,
  loading = false,
  hasMore = false,
  className = '',
}) => {
  const [replyTo, setReplyTo] = useState<{ id: number; author: string; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);

    // Load more when scrolled to top
    if (scrollTop < 100 && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore, loading]);

  const getConversationName = (): string => {
    if (conversation.name) return conversation.name;
    if (conversation.conversation_type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId
      );
      return otherParticipant?.user?.full_name || 'Direct Message';
    }
    return 'Conversation';
  };

  const getConversationSubtitle = (): string => {
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants?.find(
        (p) => p.user_id !== currentUserId
      );
      return otherParticipant?.user?.is_online ? 'Online' : 'Offline';
    }
    const count = conversation.participants?.length || 0;
    return `${count} member${count !== 1 ? 's' : ''}`;
  };

  const renderMessage = (convMessage: ConversationMessage, index: number) => {
    const message = convMessage.message;
    if (!message) return null;

    const isOwn = message.author_id === currentUserId;
    const showDateDivider =
      index === 0 ||
      !isSameDay(
        new Date(convMessage.created_at),
        new Date(messages[index - 1]?.created_at || convMessage.created_at)
      );

    // Check if this message is from the same author as the previous one (within 5 minutes)
    const prevMessage = messages[index - 1]?.message;
    const isGrouped =
      prevMessage &&
      prevMessage.author_id === message.author_id &&
      new Date(convMessage.created_at).getTime() -
        new Date(messages[index - 1]?.created_at || 0).getTime() <
        5 * 60 * 1000;

    return (
      <React.Fragment key={convMessage.id}>
        {showDateDivider && (
          <div className="flex items-center justify-center my-4">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
              {formatDateDivider(new Date(convMessage.created_at))}
            </div>
          </div>
        )}

        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
          <div className={`flex max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {!isOwn && !isGrouped && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mr-2 overflow-hidden">
                {message.author?.avatar_url ? (
                  <img
                    src={message.author.avatar_url}
                    alt={message.author.full_name}
                    className="w-8 h-8 object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
            )}
            {!isOwn && isGrouped && <div className="w-8 mr-2" />}

            <div className={isOwn ? 'ml-2' : ''}>
              {/* Author name (for group chats, first message in group) */}
              {!isOwn && !isGrouped && conversation.conversation_type !== 'direct' && (
                <div className="text-xs text-gray-500 mb-1">
                  {message.author?.full_name || 'Unknown'}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`px-4 py-2 rounded-2xl ${
                  isOwn
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {message.body_html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: message.body_html }}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                )}
              </div>

              {/* Reactions */}
              {(message.reactions && message.reactions.length > 0) && (
                <div className={`mt-1 ${isOwn ? 'text-right' : ''}`}>
                  <MessageReactions
                    reactions={message.reactions}
                    currentUserId={currentUserId}
                    onAdd={onAddReaction ? (emoji) => onAddReaction(message.id, emoji) : undefined}
                    onRemove={onRemoveReaction ? (emoji) => onRemoveReaction(message.id, emoji) : undefined}
                  />
                </div>
              )}

              {/* Time and read status */}
              <div
                className={`flex items-center mt-1 text-xs text-gray-400 ${
                  isOwn ? 'justify-end' : ''
                }`}
              >
                <span>{formatMessageDate(new Date(convMessage.created_at))}</span>
                {isOwn && (
                  <span className="ml-1">
                    {message.is_read ? (
                      <CheckCheck className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {conversation.avatar_url ? (
              <img
                src={conversation.avatar_url}
                alt={getConversationName()}
                className="w-10 h-10 object-cover"
              />
            ) : conversation.conversation_type === 'direct' ? (
              <User className="w-5 h-5 text-gray-500" />
            ) : conversation.conversation_type === 'group' ? (
              <Users className="w-5 h-5 text-gray-500" />
            ) : (
              <Hash className="w-5 h-5 text-gray-500" />
            )}
          </div>

          <div>
            <h3 className="font-medium text-gray-900">{getConversationName()}</h3>
            <p className="text-xs text-gray-500">{getConversationSubtitle()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Search className="w-5 h-5" />
          </button>
          {onShowInfo && (
            <button
              onClick={onShowInfo}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loading && messages.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="animate-pulse flex items-start space-x-2">
                  {i % 2 === 0 && <div className="w-8 h-8 bg-gray-200 rounded-full" />}
                  <div className="space-y-1">
                    <div className={`h-10 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-blue-100'} rounded-2xl w-48`} />
                    <div className="h-3 bg-gray-100 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              {conversation.conversation_type === 'direct' ? (
                <User className="w-8 h-8 text-gray-400" />
              ) : (
                <Users className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <p className="text-center">
              No messages yet.
              <br />
              Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        <MessageComposer
          onSend={onSendMessage}
          onCancel={replyTo ? () => setReplyTo(null) : undefined}
          replyTo={replyTo}
          users={users}
          placeholder={`Message ${getConversationName()}`}
          showToolbar={false}
        />
      </div>
    </div>
  );
};

export default ConversationDetail;
