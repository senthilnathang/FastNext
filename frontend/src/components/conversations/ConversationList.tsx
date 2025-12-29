import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Users,
  Hash,
  Search,
  Plus,
  Archive,
  VolumeX,
  MoreHorizontal,
  User,
} from 'lucide-react';
import type { Conversation } from '@/lib/api/conversations';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: number;
  onSelect: (conversation: Conversation) => void;
  onCreate?: () => void;
  onArchive?: (id: number) => void;
  onMute?: (id: number) => void;
  loading?: boolean;
  showSearch?: boolean;
  showCreateButton?: boolean;
  className?: string;
}

const getConversationIcon = (type: Conversation['conversation_type']) => {
  switch (type) {
    case 'direct':
      return <MessageCircle className="w-4 h-4" />;
    case 'group':
      return <Users className="w-4 h-4" />;
    case 'channel':
      return <Hash className="w-4 h-4" />;
  }
};

const getConversationName = (conversation: Conversation): string => {
  if (conversation.name) return conversation.name;

  // For direct messages, show the other participant's name
  if (conversation.conversation_type === 'direct' && conversation.participants) {
    const otherParticipant = conversation.participants[0]?.user;
    return otherParticipant?.full_name || 'Direct Message';
  }

  return 'Conversation';
};

const getConversationAvatar = (conversation: Conversation): string | null => {
  if (conversation.avatar_url) return conversation.avatar_url;

  // For direct messages, show the other participant's avatar
  if (conversation.conversation_type === 'direct' && conversation.participants) {
    return conversation.participants[0]?.user?.avatar_url || null;
  }

  return null;
};

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onCreate,
  onArchive,
  onMute,
  loading = false,
  showSearch = true,
  showCreateButton = true,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className={`bg-white border-r h-full ${className}`}>
        <div className="p-4 border-b">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="p-2 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-r h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          {showCreateButton && onCreate && (
            <button
              onClick={onCreate}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedId === conversation.id;
              const avatar = getConversationAvatar(conversation);
              const name = getConversationName(conversation);

              return (
                <div
                  key={conversation.id}
                  className={`relative group ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => onSelect(conversation)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              className="w-10 h-10 object-cover"
                            />
                          ) : conversation.conversation_type === 'direct' ? (
                            <User className="w-5 h-5 text-gray-500" />
                          ) : (
                            getConversationIcon(conversation.conversation_type)
                          )}
                        </div>

                        {/* Unread indicator */}
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            {conversation.conversation_type !== 'direct' && (
                              <span className="text-gray-400">
                                {getConversationIcon(conversation.conversation_type)}
                              </span>
                            )}
                            <span
                              className={`font-medium truncate ${
                                conversation.unread_count && conversation.unread_count > 0
                                  ? 'text-gray-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {name}
                            </span>
                            {conversation.is_muted && (
                              <VolumeX className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {conversation.last_message_at
                              ? formatDistanceToNow(new Date(conversation.last_message_at), {
                                  addSuffix: false,
                                })
                              : ''}
                          </span>
                        </div>

                        {/* Last message preview */}
                        {conversation.last_message && (
                          <p
                            className={`text-sm truncate mt-0.5 ${
                              conversation.unread_count && conversation.unread_count > 0
                                ? 'text-gray-700 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            {conversation.last_message.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Actions menu */}
                  {(onArchive || onMute) && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === conversation.id ? null : conversation.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenu === conversation.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                          {onMute && (
                            <button
                              onClick={() => {
                                onMute(conversation.id);
                                setActiveMenu(null);
                              }}
                              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <VolumeX className="w-4 h-4 mr-2" />
                              {conversation.is_muted ? 'Unmute' : 'Mute'}
                            </button>
                          )}
                          {onArchive && (
                            <button
                              onClick={() => {
                                onArchive(conversation.id);
                                setActiveMenu(null);
                              }}
                              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              {conversation.is_archived ? 'Unarchive' : 'Archive'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
