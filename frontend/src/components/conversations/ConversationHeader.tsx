import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Users,
  Settings,
  Bell,
  BellOff,
  Archive,
  Trash2,
  LogOut,
  Edit2,
  User,
  Hash,
} from 'lucide-react';
import type { Conversation, ConversationParticipant } from '@/lib/api/conversations';

interface ConversationHeaderProps {
  conversation: Conversation;
  currentUserId: number;
  onEdit?: () => void;
  onMute?: () => void;
  onArchive?: () => void;
  onLeave?: () => void;
  onDelete?: () => void;
  onManageParticipants?: () => void;
  onShowParticipants?: () => void;
  className?: string;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  currentUserId,
  onEdit,
  onMute,
  onArchive,
  onLeave,
  onDelete,
  onManageParticipants,
  onShowParticipants,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = conversation.created_by_id === currentUserId;
  const isAdmin = conversation.participants?.some(
    (p) => p.user_id === currentUserId && (p.role === 'owner' || p.role === 'admin')
  );
  const canManage = isOwner || isAdmin;

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getConversationName = (): string => {
    if (conversation.name) return conversation.name;
    if (conversation.conversation_type === 'direct' && conversation.participants) {
      const other = conversation.participants.find((p) => p.user_id !== currentUserId);
      return other?.user?.full_name || 'Direct Message';
    }
    return 'Conversation';
  };

  const getConversationAvatar = (): string | null => {
    if (conversation.avatar_url) return conversation.avatar_url;
    if (conversation.conversation_type === 'direct' && conversation.participants) {
      const other = conversation.participants.find((p) => p.user_id !== currentUserId);
      return other?.user?.avatar_url || null;
    }
    return null;
  };

  const getParticipantCount = (): number => {
    return conversation.participants?.length || 0;
  };

  const getOnlineCount = (): number => {
    return conversation.participants?.filter((p) => p.user?.is_online).length || 0;
  };

  const avatar = getConversationAvatar();

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b bg-white ${className}`}>
      {/* Left side - Avatar and info */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={getConversationName()} className="w-10 h-10 object-cover" />
            ) : conversation.conversation_type === 'direct' ? (
              <User className="w-5 h-5 text-gray-500" />
            ) : conversation.conversation_type === 'group' ? (
              <Users className="w-5 h-5 text-gray-500" />
            ) : (
              <Hash className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {conversation.conversation_type === 'direct' && (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                conversation.participants?.some(
                  (p) => p.user_id !== currentUserId && p.user?.is_online
                )
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          )}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900">{getConversationName()}</h3>
          <p className="text-xs text-gray-500">
            {conversation.conversation_type === 'direct' ? (
              conversation.participants?.some(
                (p) => p.user_id !== currentUserId && p.user?.is_online
              ) ? (
                <span className="text-green-600">Online</span>
              ) : (
                'Offline'
              )
            ) : (
              <>
                {getParticipantCount()} members
                {getOnlineCount() > 0 && (
                  <span className="text-green-600 ml-2">{getOnlineCount()} online</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        {/* Participants button (for groups) */}
        {conversation.conversation_type !== 'direct' && onShowParticipants && (
          <button
            onClick={onShowParticipants}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="View participants"
          >
            <Users className="w-5 h-5" />
          </button>
        )}

        {/* More options menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20">
              <div className="py-1">
                {/* Edit (for admins) */}
                {canManage && onEdit && conversation.conversation_type !== 'direct' && (
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4 mr-3" />
                    Edit conversation
                  </button>
                )}

                {/* Manage participants (for admins) */}
                {canManage && onManageParticipants && conversation.conversation_type !== 'direct' && (
                  <button
                    onClick={() => {
                      onManageParticipants();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Users className="w-4 h-4 mr-3" />
                    Manage participants
                  </button>
                )}

                {/* Mute/Unmute */}
                {onMute && (
                  <button
                    onClick={() => {
                      onMute();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {conversation.is_muted ? (
                      <>
                        <Bell className="w-4 h-4 mr-3" />
                        Unmute notifications
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4 mr-3" />
                        Mute notifications
                      </>
                    )}
                  </button>
                )}

                {/* Archive */}
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Archive className="w-4 h-4 mr-3" />
                    {conversation.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                )}

                <div className="border-t my-1" />

                {/* Leave (for groups) */}
                {onLeave && conversation.conversation_type !== 'direct' && !isOwner && (
                  <button
                    onClick={() => {
                      onLeave();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Leave conversation
                  </button>
                )}

                {/* Delete (for owners) */}
                {isOwner && onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Delete conversation
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHeader;
