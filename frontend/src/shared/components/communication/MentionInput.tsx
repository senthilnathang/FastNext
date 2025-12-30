"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";

import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

export interface MentionUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface MentionInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  users: MentionUser[];
  value: string;
  onChange: (value: string) => void;
  onMention?: (user: MentionUser) => void;
  mentionTrigger?: string;
  maxSuggestions?: number;
  renderMention?: (user: MentionUser) => React.ReactNode;
  inputType?: "textarea" | "input";
  className?: string;
  inputClassName?: string;
}

interface MentionPosition {
  start: number;
  end: number;
  query: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  users,
  value,
  onChange,
  onMention,
  mentionTrigger = "@",
  maxSuggestions = 5,
  renderMention,
  inputType = "textarea",
  className,
  inputClassName,
  ...textareaProps
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<MentionPosition | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter users based on mention query
  const filteredUsers = useMemo(() => {
    if (!mentionPosition) return [];

    const query = mentionPosition.query.toLowerCase();
    return users
      .filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query)
      )
      .slice(0, maxSuggestions);
  }, [users, mentionPosition, maxSuggestions]);

  // Detect mention trigger and position
  const detectMention = useCallback((
    text: string,
    cursorPosition: number
  ): MentionPosition | null => {
    // Look backwards from cursor to find mention trigger
    let start = cursorPosition - 1;
    while (start >= 0) {
      const char = text[start];
      if (char === mentionTrigger) {
        const query = text.slice(start + 1, cursorPosition);
        // Only valid if there's no space in query and trigger is at start or after space
        if (!/\s/.test(query) && (start === 0 || /\s/.test(text[start - 1]))) {
          return {
            start,
            end: cursorPosition,
            query,
          };
        }
        break;
      }
      if (/\s/.test(char)) {
        break;
      }
      start--;
    }
    return null;
  }, [mentionTrigger]);

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!inputRef.current || !containerRef.current) return;

    const input = inputRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Create a hidden span to measure text position
    const span = document.createElement("span");
    span.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font: ${getComputedStyle(input).font};
      padding: ${getComputedStyle(input).padding};
      width: ${input.clientWidth}px;
    `;

    const textBeforeCursor = value.slice(0, input.selectionStart || 0);
    span.textContent = textBeforeCursor;
    document.body.appendChild(span);

    const inputRect = input.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();

    document.body.removeChild(span);

    // Position dropdown below the cursor
    const top = inputRect.top - containerRect.top + 24;
    const left = Math.min(
      spanRect.width % input.clientWidth,
      input.clientWidth - 200
    );

    setDropdownPosition({ top, left });
  }, [value]);

  // Handle input change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    onChange(newValue);

    const mention = detectMention(newValue, cursorPosition);
    setMentionPosition(mention);
    setShowSuggestions(!!mention);
    setSelectedIndex(0);

    if (mention) {
      calculateDropdownPosition();
    }
  }, [onChange, detectMention, calculateDropdownPosition]);

  // Handle user selection
  const selectUser = useCallback((user: MentionUser) => {
    if (!mentionPosition || !inputRef.current) return;

    const before = value.slice(0, mentionPosition.start);
    const after = value.slice(mentionPosition.end);
    const mentionText = `${mentionTrigger}${user.username} `;
    const newValue = before + mentionText + after;

    onChange(newValue);
    onMention?.(user);
    setShowSuggestions(false);
    setMentionPosition(null);

    // Set cursor position after mention
    const newCursorPosition = mentionPosition.start + mentionText.length;
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }, [value, mentionPosition, mentionTrigger, onChange, onMention]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        break;
      case "Enter":
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
      case "Tab":
        if (filteredUsers.length > 0) {
          e.preventDefault();
          selectUser(filteredUsers[selectedIndex]);
        }
        break;
    }
  }, [showSuggestions, filteredUsers, selectedIndex, selectUser]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render styled value with highlighted mentions
  const renderStyledValue = () => {
    const mentionRegex = new RegExp(`${mentionTrigger}(\\w+)`, "g");
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(value.slice(lastIndex, match.index));
      }

      // Add styled mention
      const username = match[1];
      const user = users.find((u) => u.username === username);

      if (renderMention && user) {
        parts.push(
          <span key={match.index}>{renderMention(user)}</span>
        );
      } else {
        parts.push(
          <span
            key={match.index}
            className="bg-primary/10 text-primary rounded px-1"
          >
            {match[0]}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }

    return parts;
  };

  const InputComponent = inputType === "textarea" ? "textarea" : "input";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Styled overlay for mention highlighting (visual only) */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
          "text-transparent",
          inputClassName
        )}
        aria-hidden="true"
      >
        {renderStyledValue()}
      </div>

      {/* Actual input */}
      <InputComponent
        ref={inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          inputType === "textarea" && "min-h-[80px] resize-none",
          inputType === "input" && "h-10",
          inputClassName
        )}
        {...textareaProps}
      />

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredUsers.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-64 bg-popover border rounded-md shadow-lg overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <div className="py-1">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MentionInput;
