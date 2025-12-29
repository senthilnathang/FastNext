import React, { useState, useRef, useEffect } from 'react';
import { Smile, Plus } from 'lucide-react';
import type { MessageReaction } from '@/lib/api/messages';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: number;
  onAdd?: (emoji: string) => void;
  onRemove?: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

// Common emoji reactions
const QUICK_EMOJIS = ['👍', '👎', '❤️', '😄', '😢', '🎉', '🚀', '👀'];

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'],
  'Celebration': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🚀', '⭐', '✨', '💫', '🔥'],
  'Objects': ['💡', '📌', '📎', '🔗', '📝', '✅', '❌', '⚠️', '❓', '❗', '👀', '💬'],
};

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onAdd,
  onRemove,
  disabled = false,
  className = '',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        users: [],
        hasCurrentUser: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user?.full_name || 'Unknown');
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; hasCurrentUser: boolean }>);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (emoji: string) => {
    if (disabled) return;

    const group = groupedReactions[emoji];
    if (group?.hasCurrentUser && onRemove) {
      onRemove(emoji);
    } else if (!group?.hasCurrentUser && onAdd) {
      onAdd(emoji);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    if (onAdd && !disabled) {
      onAdd(emoji);
      setShowPicker(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          disabled={disabled}
          className={`inline-flex items-center px-2 py-1 text-sm rounded-full border transition-colors ${
            data.hasCurrentUser
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          title={data.users.join(', ')}
        >
          <span className="mr-1">{emoji}</span>
          <span className="font-medium">{data.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {onAdd && !disabled && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center px-2 py-1 text-sm rounded-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-colors"
          >
            <Smile className="w-4 h-4 mr-1" />
            <Plus className="w-3 h-3" />
          </button>

          {/* Emoji Picker */}
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-lg border z-20">
              {/* Quick reactions */}
              <div className="p-2 border-b">
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex border-b overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
                      activeCategory === category
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
