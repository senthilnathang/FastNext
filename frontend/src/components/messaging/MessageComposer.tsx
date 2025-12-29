import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  AtSign,
  Bold,
  Italic,
  Link2,
  List,
  X,
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface MessageComposerProps {
  onSend: (data: {
    body: string;
    body_html?: string;
    parent_id?: number;
    mention_user_ids?: number[];
    attachments?: File[];
  }) => void;
  onCancel?: () => void;
  replyTo?: { id: number; author: string; preview: string } | null;
  placeholder?: string;
  users?: User[];
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  showToolbar?: boolean;
  allowAttachments?: boolean;
  className?: string;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onCancel,
  replyTo,
  placeholder = 'Write a message...',
  users = [],
  disabled = false,
  autoFocus = false,
  maxLength = 10000,
  showToolbar = true,
  allowAttachments = true,
  className = '',
}) => {
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<number[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [body]);

  // Focus on mount if autoFocus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on mention query
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBody(value);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show mentions if there's no space after @
      if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);

        // Calculate dropdown position
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = body.slice(0, cursorPos);
    const textAfterCursor = body.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    const newText =
      textBeforeCursor.slice(0, lastAtIndex) +
      `@${user.username} ` +
      textAfterCursor;

    setBody(newText);
    setMentions([...mentions, user.id]);
    setShowMentions(false);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Cancel on Escape
    if (e.key === 'Escape') {
      if (showMentions) {
        setShowMentions(false);
      } else if (onCancel) {
        onCancel();
      }
    }
  };

  const handleSend = useCallback(async () => {
    if (!body.trim() || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSend({
        body: body.trim(),
        parent_id: replyTo?.id,
        mention_user_ids: mentions,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Clear form
      setBody('');
      setMentions([]);
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  }, [body, disabled, isSending, mentions, attachments, replyTo, onSend]);

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = body.slice(start, end);

    const newText =
      body.slice(0, start) + prefix + selectedText + suffix + body.slice(end);
    setBody(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + prefix.length + selectedText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b rounded-t-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Replying to {replyTo.author}:</span>
            <span className="ml-2 text-gray-500 truncate">
              {replyTo.preview.slice(0, 50)}
              {replyTo.preview.length > 50 ? '...' : ''}
            </span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-1 px-3 py-2 border-b">
          <button
            type="button"
            onClick={() => insertFormatting('**')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('_')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('[', '](url)')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('\n- ', '')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => {
              if (textareaRef.current) {
                const cursorPos = textareaRef.current.selectionStart;
                const newText = body.slice(0, cursorPos) + '@' + body.slice(cursorPos);
                setBody(newText);
                setShowMentions(true);
                setMentionQuery('');
                textareaRef.current.focus();
              }
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Mention someone"
          >
            <AtSign className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          maxLength={maxLength}
          rows={1}
          className="w-full px-3 py-3 text-sm resize-none focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          style={{ minHeight: '44px', maxHeight: '200px' }}
        />

        {/* Mentions dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div
            ref={mentionsRef}
            className="absolute left-0 right-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20"
          >
            {filteredUsers.slice(0, 10).map((user) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-500">
                      {user.full_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.full_name}
                  </div>
                  <div className="text-xs text-gray-500">@{user.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center px-2 py-1 bg-gray-100 rounded text-sm"
              >
                <Paperclip className="w-3 h-3 mr-1 text-gray-500" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t">
        <div className="flex items-center gap-2">
          {allowAttachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleAttachment}
                disabled={disabled || isSending}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </>
          )}
          <span className="text-xs text-gray-400">
            {body.length}/{maxLength}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSending}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || disabled || isSending}
            className="flex items-center px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;
