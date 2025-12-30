"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Clock, Smile } from "lucide-react";

import { cn } from "@/shared/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

// Emoji categories with common emojis
const EMOJI_CATEGORIES = {
  smileys: {
    name: "Smileys & Emotion",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
      "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸",
      "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳",
      "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖",
      "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬",
    ],
  },
  gestures: {
    name: "Gestures & People",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "👍", "👎",
      "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
      "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀",
      "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸", "👶",
    ],
  },
  animals: {
    name: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
      "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒",
      "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇",
      "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜",
      "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲",
    ],
  },
  food: {
    name: "Food & Drink",
    icon: "🍔",
    emojis: [
      "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏",
      "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑",
      "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄",
      "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆",
      "🍜", "🍝", "🍣", "🍤", "🍩", "🍪", "🎂", "🍰", "🧁", "☕",
    ],
  },
  activities: {
    name: "Activities",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
      "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
      "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷",
      "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️",
      "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️", "🎫", "🎟️", "🎪",
    ],
  },
  objects: {
    name: "Objects",
    icon: "💡",
    emojis: [
      "💡", "🔦", "🏮", "🪔", "📱", "💻", "🖥️", "🖨️", "⌨️", "🖱️",
      "💽", "💾", "💿", "📀", "🧮", "🎥", "🎬", "📺", "📷", "📸",
      "📹", "📼", "🔍", "🔎", "🕯️", "💰", "💳", "💎", "⚖️", "🔧",
      "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🗜️", "⚗️", "🧪", "🧫",
      "📝", "📁", "📂", "🗂️", "📅", "📆", "📇", "📈", "📉", "📊",
    ],
  },
  symbols: {
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️",
      "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐",
      "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐",
      "✅", "❌", "❓", "❗", "💯", "🔴", "🟠", "🟡", "🟢", "🔵",
    ],
  },
  flags: {
    name: "Flags",
    icon: "🏳️",
    emojis: [
      "🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🇺🇳", "🇦🇫", "🇦🇱", "🇩🇿",
      "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺",
      "🇦🇹", "🇦🇿", "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯",
      "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦", "🇧🇼", "🇧🇷", "🇮🇴", "🇻🇬", "🇧🇳", "🇧🇬",
      "🇧🇫", "🇧🇮", "🇰🇭", "🇨🇲", "🇨🇦", "🇮🇨", "🇨🇻", "🇧🇶", "🇰🇾", "🇨🇫",
    ],
  },
} as const;

type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

const RECENT_EMOJIS_KEY = "fastnext-recent-emojis";
const MAX_RECENT_EMOJIS = 24;

export interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  trigger,
  className,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EmojiCategory | "recent">("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent emojis to localStorage
  const addRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
      try {
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Get current emojis based on category and search
  const currentEmojis = useMemo(() => {
    if (searchQuery) {
      // Search across all categories
      const allEmojis = Object.values(EMOJI_CATEGORIES).flatMap((cat) => cat.emojis);
      // Simple search - in production, you'd want emoji names/keywords
      return allEmojis.filter((emoji) => emoji.includes(searchQuery));
    }

    if (selectedCategory === "recent") {
      return recentEmojis;
    }

    return EMOJI_CATEGORIES[selectedCategory].emojis;
  }, [searchQuery, selectedCategory, recentEmojis]);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emoji: string) => {
    addRecentEmoji(emoji);
    onEmojiSelect(emoji);
    setOpen(false);
    setSearchQuery("");
  }, [addRecentEmoji, onEmojiSelect, setOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const cols = 8; // Grid columns
    const totalEmojis = currentEmojis.length;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalEmojis);
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalEmojis) % totalEmojis);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + cols, totalEmojis - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - cols, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (currentEmojis[focusedIndex]) {
          handleEmojiClick(currentEmojis[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [currentEmojis, focusedIndex, handleEmojiClick, setOpen]);

  // Reset focused index when emojis change
  useEffect(() => {
    setFocusedIndex(0);
  }, [currentEmojis]);

  const categories = Object.entries(EMOJI_CATEGORIES) as [EmojiCategory, typeof EMOJI_CATEGORIES[EmojiCategory]][];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger || (
          <Button variant="ghost" size="icon-sm" className={className}>
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-80 p-0", className)}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex border-b overflow-x-auto p-1 gap-1">
            {recentEmojis.length > 0 && (
              <Button
                variant={selectedCategory === "recent" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setSelectedCategory("recent")}
                title="Recent"
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
            {categories.map(([key, category]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setSelectedCategory(key)}
                title={category.name}
              >
                <span className="text-base">{category.icon}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Emoji grid */}
        <div className="p-2 max-h-64 overflow-y-auto">
          {!searchQuery && selectedCategory !== "recent" && (
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              {EMOJI_CATEGORIES[selectedCategory].name}
            </h3>
          )}
          {!searchQuery && selectedCategory === "recent" && recentEmojis.length > 0 && (
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Recently Used
            </h3>
          )}
          {currentEmojis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No emojis found" : "No recent emojis"}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {currentEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center text-xl rounded hover:bg-accent transition-colors",
                    focusedIndex === index && "ring-2 ring-ring ring-offset-1"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
