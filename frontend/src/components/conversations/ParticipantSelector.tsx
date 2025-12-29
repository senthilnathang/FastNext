import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Check } from 'lucide-react';

interface UserOption {
  id: number;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_online?: boolean;
}

interface ParticipantSelectorProps {
  users: UserOption[];
  selected: number[];
  onChange: (selected: number[]) => void;
  excludeIds?: number[];
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
  users,
  selected,
  onChange,
  excludeIds = [],
  placeholder = 'Search users...',
  maxSelections,
  disabled = false,
  loading = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter users based on query and exclusions
  const availableUsers = users.filter(
    (user) =>
      !excludeIds.includes(user.id) &&
      (user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.full_name.toLowerCase().includes(query.toLowerCase()))
  );

  // Get selected user objects
  const selectedUsers = users.filter((user) => selected.includes(user.id));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleUser = (userId: number) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else if (!maxSelections || selected.length < maxSelections) {
      onChange([...selected, userId]);
    }
  };

  const removeUser = (userId: number) => {
    onChange(selected.filter((id) => id !== userId));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-5 h-5 object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium">{user.full_name.charAt(0)}</span>
                )}
              </div>
              <span className="max-w-[120px] truncate">{user.full_name}</span>
              {!disabled && (
                <button
                  onClick={() => removeUser(user.id)}
                  className="p-0.5 hover:bg-blue-200 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled || (maxSelections && selected.length >= maxSelections)}
          className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {query ? 'No users found' : 'No users available'}
            </div>
          ) : (
            <div className="py-1">
              {availableUsers.map((user) => {
                const isSelected = selected.includes(user.id);
                const isDisabled = !isSelected && maxSelections && selected.length >= maxSelections;

                return (
                  <button
                    key={user.id}
                    onClick={() => !isDisabled && toggleUser(user.id)}
                    disabled={isDisabled}
                    className={`flex items-center w-full px-3 py-2 text-left ${
                      isSelected
                        ? 'bg-blue-50'
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
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
                      {user.is_online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Max selections hint */}
      {maxSelections && (
        <div className="mt-1 text-xs text-gray-500">
          {selected.length}/{maxSelections} selected
        </div>
      )}
    </div>
  );
};

export default ParticipantSelector;
