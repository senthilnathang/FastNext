'use client';

/**
 * Editor Toolbar Component
 *
 * Customizable toolbar for the Rich Text Editor.
 * Supports formatting, headings, lists, links, images, tables, and more.
 */

import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Code2,
  FileImage,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Pilcrow,
  Quote,
  Redo,
  RemoveFormatting,
  Smile,
  Strikethrough,
  Table,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
export interface ToolbarItem {
  id: string;
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  action: () => void;
  isActive?: () => boolean;
  isDisabled?: () => boolean;
}

export interface ToolbarGroup {
  id: string;
  items: ToolbarItem[];
}

export interface EditorToolbarProps {
  editor: Editor | null;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Show word count */
  showWordCount?: boolean;
  /** Character limit */
  characterLimit?: number;
  /** Current character count */
  characterCount?: number;
  /** Current word count */
  wordCount?: number;
  /** Custom toolbar groups */
  customGroups?: ToolbarGroup[];
  /** Visible toolbar groups */
  visibleGroups?: (
    | 'history'
    | 'formatting'
    | 'headings'
    | 'lists'
    | 'links'
    | 'media'
    | 'table'
    | 'extras'
  )[];
  /** Callback for image upload */
  onImageUpload?: (file: File) => Promise<string>;
  /** Callback for file attachment */
  onFileAttach?: (file: File) => Promise<{ url: string; name: string }>;
  /** Additional class name */
  className?: string;
  /** Compact mode */
  compact?: boolean;
  /** Emoji data */
  emojiList?: string[];
}

// Common emoji list
const DEFAULT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🙄', '😬', '😮', '🤤', '😴', '🤒', '😎', '🤓', '🧐', '😕',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🙏',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '⭐', '✨', '💥', '💫', '🎉', '🎊', '🏆', '🥇', '🎯',
];

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  tooltip: string;
  shortcut?: string;
  children: React.ReactNode;
  compact?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  isDisabled = false,
  tooltip,
  shortcut,
  children,
  compact = false,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? 'secondary' : 'ghost'}
          size={compact ? 'icon-sm' : 'icon'}
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            compact ? 'h-7 w-7' : 'h-8 w-8',
            isActive && 'bg-accent text-accent-foreground'
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <span className="text-xs text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// Separator Component
const ToolbarSeparator = () => (
  <div className="w-px h-6 bg-border mx-1" />
);

/**
 * Editor Toolbar Component
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  showCharacterCount = false,
  showWordCount = false,
  characterLimit = 0,
  characterCount = 0,
  wordCount = 0,
  customGroups = [],
  visibleGroups = ['history', 'formatting', 'headings', 'lists', 'links', 'media', 'table', 'extras'],
  onImageUpload,
  onFileAttach,
  className,
  compact = false,
  emojiList = DEFAULT_EMOJIS,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload || !editor) return;

    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
    e.target.value = '';
  }, [editor, onImageUpload]);

  // Handle file attachment
  const handleFileAttach = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAttach || !editor) return;

    try {
      const result = await onFileAttach(file);
      editor.chain().focus().insertContent(
        `<a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.name}</a>`
      ).run();
    } catch (error) {
      console.error('Failed to attach file:', error);
    }
    e.target.value = '';
  }, [editor, onFileAttach]);

  // Handle link insertion
  const handleLinkInsert = useCallback(() => {
    if (!editor || !linkUrl) return;

    if (linkText) {
      editor.chain().focus().insertContent(
        `<a href="${linkUrl}">${linkText}</a>`
      ).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }

    setLinkUrl('');
    setLinkText('');
    setIsLinkPopoverOpen(false);
  }, [editor, linkUrl, linkText]);

  // Handle image URL insertion
  const handleImageUrlInsert = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    setIsImagePopoverOpen(false);
  }, [editor, imageUrl]);

  // Handle emoji insertion
  const handleEmojiInsert = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setIsEmojiPopoverOpen(false);
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn('flex items-center gap-1 p-2 border-b bg-muted/30', className)}>
        <div className="animate-pulse flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="w-8 h-8 rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const iconSize = compact ? 14 : 16;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        'flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30',
        className
      )}>
        {/* History Group */}
        {visibleGroups.includes('history') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              isDisabled={!editor.can().undo()}
              tooltip="Undo"
              shortcut="Ctrl+Z"
              compact={compact}
            >
              <Undo size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              isDisabled={!editor.can().redo()}
              tooltip="Redo"
              shortcut="Ctrl+Shift+Z"
              compact={compact}
            >
              <Redo size={iconSize} />
            </ToolbarButton>
            <ToolbarSeparator />
          </>
        )}

        {/* Formatting Group */}
        {visibleGroups.includes('formatting') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              tooltip="Bold"
              shortcut="Ctrl+B"
              compact={compact}
            >
              <Bold size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              tooltip="Italic"
              shortcut="Ctrl+I"
              compact={compact}
            >
              <Italic size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              tooltip="Underline"
              shortcut="Ctrl+U"
              compact={compact}
            >
              <UnderlineIcon size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              tooltip="Strikethrough"
              shortcut="Ctrl+Shift+X"
              compact={compact}
            >
              <Strikethrough size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              tooltip="Inline Code"
              shortcut="Ctrl+E"
              compact={compact}
            >
              <Code size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetAllMarks().run()}
              tooltip="Clear Formatting"
              compact={compact}
            >
              <RemoveFormatting size={iconSize} />
            </ToolbarButton>
            <ToolbarSeparator />
          </>
        )}

        {/* Headings Group */}
        {visibleGroups.includes('headings') && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={compact ? 'sm' : 'default'}
                  className={cn(
                    'gap-1',
                    compact ? 'h-7 px-2 text-xs' : 'h-8 px-2 text-sm'
                  )}
                >
                  <Pilcrow size={iconSize} />
                  <span className="hidden sm:inline">
                    {editor.isActive('heading', { level: 1 }) && 'H1'}
                    {editor.isActive('heading', { level: 2 }) && 'H2'}
                    {editor.isActive('heading', { level: 3 }) && 'H3'}
                    {editor.isActive('heading', { level: 4 }) && 'H4'}
                    {editor.isActive('heading', { level: 5 }) && 'H5'}
                    {editor.isActive('heading', { level: 6 }) && 'H6'}
                    {!editor.isActive('heading') && 'Paragraph'}
                  </span>
                  <ChevronDown size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={cn(editor.isActive('paragraph') && 'bg-accent')}
                >
                  <Pilcrow size={16} className="mr-2" />
                  Paragraph
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent')}
                >
                  <Heading1 size={16} className="mr-2" />
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent')}
                >
                  <Heading2 size={16} className="mr-2" />
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent')}
                >
                  <Heading3 size={16} className="mr-2" />
                  Heading 3
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                  className={cn(editor.isActive('heading', { level: 4 }) && 'bg-accent')}
                >
                  <Heading4 size={16} className="mr-2" />
                  Heading 4
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                  className={cn(editor.isActive('heading', { level: 5 }) && 'bg-accent')}
                >
                  <Heading5 size={16} className="mr-2" />
                  Heading 5
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                  className={cn(editor.isActive('heading', { level: 6 }) && 'bg-accent')}
                >
                  <Heading6 size={16} className="mr-2" />
                  Heading 6
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ToolbarSeparator />
          </>
        )}

        {/* Lists Group */}
        {visibleGroups.includes('lists') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              tooltip="Bullet List"
              compact={compact}
            >
              <List size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              tooltip="Numbered List"
              compact={compact}
            >
              <ListOrdered size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              tooltip="Blockquote"
              compact={compact}
            >
              <Quote size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              tooltip="Code Block"
              compact={compact}
            >
              <Code2 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Horizontal Rule"
              compact={compact}
            >
              <Minus size={iconSize} />
            </ToolbarButton>
            <ToolbarSeparator />
          </>
        )}

        {/* Links Group */}
        {visibleGroups.includes('links') && (
          <>
            <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={editor.isActive('link') ? 'secondary' : 'ghost'}
                  size={compact ? 'icon-sm' : 'icon'}
                  className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                >
                  <Link size={iconSize} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Insert Link</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Link text (optional)"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="url"
                      placeholder="URL"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLinkUrl('');
                        setLinkText('');
                        setIsLinkPopoverOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleLinkInsert}
                      disabled={!linkUrl}
                    >
                      Insert
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {editor.isActive('link') && (
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                tooltip="Remove Link"
                compact={compact}
              >
                <Unlink size={iconSize} />
              </ToolbarButton>
            )}
            <ToolbarSeparator />
          </>
        )}

        {/* Media Group */}
        {visibleGroups.includes('media') && (
          <>
            <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size={compact ? 'icon-sm' : 'icon'}
                  className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                >
                  <FileImage size={iconSize} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Insert Image</h4>
                  {onImageUpload && (
                    <div className="space-y-2">
                      <label className="block">
                        <span className="text-sm text-muted-foreground">Upload from computer</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="mt-1 block w-full text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                      </label>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-popover px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageUrl('');
                        setIsImagePopoverOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImageUrlInsert}
                      disabled={!imageUrl}
                    >
                      Insert
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {onFileAttach && (
              <label>
                <ToolbarButton
                  onClick={() => {}}
                  tooltip="Attach File"
                  compact={compact}
                >
                  <Paperclip size={iconSize} />
                </ToolbarButton>
                <input
                  type="file"
                  onChange={handleFileAttach}
                  className="hidden"
                />
              </label>
            )}
            <ToolbarSeparator />
          </>
        )}

        {/* Table Group */}
        {visibleGroups.includes('table') && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={editor.isActive('table') ? 'secondary' : 'ghost'}
                  size={compact ? 'icon-sm' : 'icon'}
                  className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                >
                  <Table size={iconSize} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  Insert Table (3x3)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}
                >
                  Insert Table (4x4)
                </DropdownMenuItem>
                {editor.isActive('table') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                      Add Column Before
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                      Add Column After
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                      Delete Column
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                      Add Row Before
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                      Add Row After
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                      Delete Row
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()}>
                      Merge Cells
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()}>
                      Split Cell
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().deleteTable().run()}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete Table
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <ToolbarSeparator />
          </>
        )}

        {/* Extras Group */}
        {visibleGroups.includes('extras') && (
          <>
            <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size={compact ? 'icon-sm' : 'icon'}
                  className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                >
                  <Smile size={iconSize} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Insert Emoji</h4>
                  <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                    {emojiList.map((emoji, index) => (
                      <button
                        key={`emoji-${index}`}
                        type="button"
                        onClick={() => handleEmojiInsert(emoji)}
                        className="w-6 h-6 text-lg hover:bg-accent rounded flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Custom Groups */}
        {customGroups.map((group) => (
          <div key={group.id} className="flex items-center gap-0.5">
            <ToolbarSeparator />
            {group.items.map((item) => (
              <ToolbarButton
                key={item.id}
                onClick={item.action}
                isActive={item.isActive?.()}
                isDisabled={item.isDisabled?.()}
                tooltip={item.label}
                shortcut={item.shortcut}
                compact={compact}
              >
                {item.icon}
              </ToolbarButton>
            ))}
          </div>
        ))}

        {/* Character/Word Count */}
        {(showCharacterCount || showWordCount) && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {showCharacterCount && (
              <span>
                {characterCount}
                {characterLimit > 0 && `/${characterLimit}`} chars
              </span>
            )}
            {showWordCount && (
              <span>{wordCount} words</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default EditorToolbar;
