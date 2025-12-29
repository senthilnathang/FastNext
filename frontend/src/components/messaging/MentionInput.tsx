import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { User } from 'lucide-react';

interface UserOption {
  id: number;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: number[]) => void;
  users: UserOption[];
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  insertMention: (user: UserOption) => void;
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  (
    {
      value,
      onChange,
      users,
      placeholder = 'Type @ to mention someone...',
      disabled = false,
      maxLength,
      rows = 3,
      className = '',
      onKeyDown,
    },
    ref
  ) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentions, setMentions] = useState<number[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter users based on query
    const filteredUsers = users.filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.full_name.toLowerCase().includes(query.toLowerCase())
    );

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      insertMention: (user: UserOption) => insertMention(user),
    }));

    // Reset selection when filtered list changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Close dropdown on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const insertMention = (user: UserOption) => {
      if (mentionStart === null || !textareaRef.current) return;

      const beforeMention = value.slice(0, mentionStart);
      const afterCursor = value.slice(textareaRef.current.selectionStart);
      const mentionText = `@${user.username} `;

      const newValue = beforeMention + mentionText + afterCursor;
      const newMentions = [...mentions, user.id];

      setMentions(newMentions);
      onChange(newValue, newMentions);
      setShowDropdown(false);
      setMentionStart(null);

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = mentionStart + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      // Detect @ trigger
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if we're still in a mention (no space after @)
        if (!textAfterAt.includes(' ') && textAfterAt.length < 25) {
          setMentionStart(lastAtIndex);
          setQuery(textAfterAt);
          setShowDropdown(true);
        } else {
          setShowDropdown(false);
          setMentionStart(null);
        }
      } else {
        setShowDropdown(false);
        setMentionStart(null);
      }

      // Update mentions list (remove if mention was deleted)
      const mentionPattern = /@(\w+)/g;
      const existingMentions = [...newValue.matchAll(mentionPattern)].map((m) => m[1]);
      const updatedMentions = mentions.filter((id) =>
        users.some((u) => u.id === id && existingMentions.includes(u.username))
      );

      setMentions(updatedMentions);
      onChange(newValue, updatedMentions);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showDropdown && filteredUsers.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < filteredUsers.length - 1 ? prev + 1 : prev
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            break;
          case 'Enter':
          case 'Tab':
            e.preventDefault();
            insertMention(filteredUsers[selectedIndex]);
            break;
          case 'Escape':
            e.preventDefault();
            setShowDropdown(false);
            break;
        }
      } else {
        onKeyDown?.(e);
      }
    };

    // Calculate dropdown position relative to @
    const getDropdownPosition = () => {
      if (!textareaRef.current || mentionStart === null) return { top: 0, left: 0 };

      // Simple position below textarea for now
      return { top: '100%', left: 0 };
    };

    return (
      <div className={`relative ${className}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
        />

        {/* Mention dropdown */}
        {showDropdown && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
            style={getDropdownPosition()}
          >
            {filteredUsers.slice(0, 10).map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center w-full px-3 py-2 text-left ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-8 h-8 object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    @{user.username}
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        {!showDropdown && value.length === 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            Type @ to mention
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = 'MentionInput';

export default MentionInput;
