'use client';

/**
 * Editor Bubble Menu Component
 *
 * A floating toolbar that appears when text is selected.
 * Provides quick access to formatting options.
 */

import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react';
import {
  Bold,
  Code,
  Italic,
  Link,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
  Unlink,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';

import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

import { cn } from '@/shared/utils';

// Types
export interface BubbleMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: () => boolean;
  isDisabled?: () => boolean;
}

export interface EditorBubbleMenuProps {
  editor: Editor | null;
  /** Show link options */
  showLinkOptions?: boolean;
  /** Custom items */
  customItems?: BubbleMenuItem[];
  /** Position alignment */
  alignment?: 'start' | 'center' | 'end';
  /** Visible items */
  visibleItems?: ('bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'quote')[];
  /** Additional class name */
  className?: string;
}

// Bubble Button Component
interface BubbleButtonProps {
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

const BubbleButton: React.FC<BubbleButtonProps> = ({
  onClick,
  isActive = false,
  isDisabled = false,
  tooltip,
  children,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            'h-7 w-7',
            isActive && 'bg-accent text-accent-foreground'
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// Separator Component
const BubbleSeparator = () => (
  <div className="w-px h-4 bg-border mx-0.5" />
);

/**
 * Editor Bubble Menu Component
 */
export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({
  editor,
  showLinkOptions = true,
  customItems = [],
  alignment = 'center',
  visibleItems = ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'quote'],
  className,
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  // Handle link insertion
  const handleLinkInsert = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setIsLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  // Handle link removal
  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 150,
        placement: 'top',
        animation: 'shift-toward-subtle',
      }}
      className={cn(
        'flex items-center gap-0.5 p-1 bg-popover border rounded-lg shadow-lg',
        className
      )}
    >
      <TooltipProvider delayDuration={200}>
        {/* Bold */}
        {visibleItems.includes('bold') && (
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </BubbleButton>
        )}

        {/* Italic */}
        {visibleItems.includes('italic') && (
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </BubbleButton>
        )}

        {/* Underline */}
        {visibleItems.includes('underline') && (
          <BubbleButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </BubbleButton>
        )}

        {/* Strike */}
        {visibleItems.includes('strike') && (
          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <Strikethrough size={14} />
          </BubbleButton>
        )}

        {/* Code */}
        {visibleItems.includes('code') && (
          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            tooltip="Inline Code (Ctrl+E)"
          >
            <Code size={14} />
          </BubbleButton>
        )}

        {/* Link Options */}
        {showLinkOptions && visibleItems.includes('link') && (
          <>
            <BubbleSeparator />
            {editor.isActive('link') ? (
              <BubbleButton
                onClick={handleLinkRemove}
                tooltip="Remove Link"
              >
                <Unlink size={14} />
              </BubbleButton>
            ) : (
              <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Link size={14} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" side="top" align={alignment}>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Add Link</h4>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLinkInsert();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleLinkInsert}
                        disabled={!linkUrl}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </>
        )}

        {/* Quote */}
        {visibleItems.includes('quote') && (
          <>
            <BubbleSeparator />
            <BubbleButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              tooltip="Quote"
            >
              <Quote size={14} />
            </BubbleButton>
          </>
        )}

        {/* Custom Items */}
        {customItems.length > 0 && (
          <>
            <BubbleSeparator />
            {customItems.map((item) => (
              <BubbleButton
                key={item.id}
                onClick={item.action}
                isActive={item.isActive?.()}
                isDisabled={item.isDisabled?.()}
                tooltip={item.label}
              >
                {item.icon}
              </BubbleButton>
            ))}
          </>
        )}
      </TooltipProvider>
    </BubbleMenu>
  );
};

export default EditorBubbleMenu;
