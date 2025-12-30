'use client';

/**
 * Rich Text Editor Component
 *
 * A comprehensive, feature-rich text editor built with TipTap.
 * Supports formatting, headings, lists, links, images, tables, mentions, emoji, and more.
 *
 * Usage:
 * ```tsx
 * import { RichTextEditor } from '@/shared/components/editor';
 *
 * <RichTextEditor
 *   content="<p>Hello World</p>"
 *   placeholder="Start typing..."
 *   onChange={(html, json) => console.log(html)}
 *   showToolbar={true}
 *   showBubbleMenu={true}
 * />
 * ```
 */

import { EditorContent } from '@tiptap/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Maximize2,
  Minimize2,
  Settings,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

import { cn } from '@/shared/utils';
import { useRichEditor, type EditorConfig, type MentionItem } from '../../hooks/useEditor';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { EditorToolbar, type ToolbarGroup } from './EditorToolbar';

// Types
export interface RichTextEditorProps extends Omit<EditorConfig, 'onUpdate'> {
  /** Callback when content changes */
  onChange?: (html: string, json: Record<string, unknown>) => void;
  /** Show the toolbar */
  showToolbar?: boolean;
  /** Show the bubble menu on text selection */
  showBubbleMenu?: boolean;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Show word count */
  showWordCount?: boolean;
  /** Enable read-only mode */
  readOnly?: boolean;
  /** Minimum height */
  minHeight?: string;
  /** Maximum height */
  maxHeight?: string;
  /** Enable fullscreen mode toggle */
  enableFullscreen?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional class name */
  className?: string;
  /** Toolbar class name */
  toolbarClassName?: string;
  /** Content area class name */
  contentClassName?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom toolbar groups */
  customToolbarGroups?: ToolbarGroup[];
  /** Visible toolbar groups */
  visibleToolbarGroups?: (
    | 'history'
    | 'formatting'
    | 'headings'
    | 'lists'
    | 'links'
    | 'media'
    | 'table'
    | 'extras'
  )[];
  /** Image upload handler */
  onImageUpload?: (file: File) => Promise<string>;
  /** File attachment handler */
  onFileAttach?: (file: File) => Promise<{ url: string; name: string }>;
  /** Emoji list for picker */
  emojiList?: string[];
  /** Show settings dropdown */
  showSettings?: boolean;
  /** Export content handler */
  onExport?: (html: string, json: Record<string, unknown>) => void;
  /** Import content handler */
  onImport?: () => Promise<string>;
  /** Label for accessibility */
  label?: string;
  /** ID for form association */
  id?: string;
  /** Name for form association */
  name?: string;
  /** Required field indicator */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// Editor styles - inline CSS for the editor content
const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: inherit;
    max-height: inherit;
    overflow-y: auto;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
  .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
  .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; }
  .ProseMirror h4 { font-size: 1em; font-weight: bold; margin: 1.33em 0; }
  .ProseMirror h5 { font-size: 0.83em; font-weight: bold; margin: 1.67em 0; }
  .ProseMirror h6 { font-size: 0.67em; font-weight: bold; margin: 2.33em 0; }

  .ProseMirror p { margin: 0.5em 0; }

  .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
  .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
  .ProseMirror li { margin: 0.25em 0; }

  .ProseMirror blockquote {
    border-left: 3px solid var(--border);
    padding-left: 1em;
    margin: 0.5em 0;
    color: var(--muted-foreground);
  }

  .ProseMirror pre {
    background: var(--muted);
    border-radius: 0.375rem;
    padding: 1em;
    overflow-x: auto;
    margin: 0.5em 0;
    font-family: monospace;
  }

  .ProseMirror code {
    background: var(--muted);
    border-radius: 0.25rem;
    padding: 0.125em 0.25em;
    font-family: monospace;
    font-size: 0.875em;
  }

  .ProseMirror pre code {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  .ProseMirror hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1em 0;
  }

  .ProseMirror table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
  }

  .ProseMirror th, .ProseMirror td {
    border: 1px solid var(--border);
    padding: 0.5em;
    text-align: left;
  }

  .ProseMirror th {
    background: var(--muted);
    font-weight: bold;
  }

  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
    margin: 0.5em 0;
  }

  .ProseMirror a {
    color: var(--primary);
    text-decoration: underline;
  }

  .ProseMirror mark {
    background-color: var(--primary);
    color: var(--primary-foreground);
    padding: 0.125em 0.25em;
    border-radius: 0.125rem;
  }

  .ProseMirror .mention {
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 500;
  }

  /* Table selection styles */
  .ProseMirror .selectedCell {
    background: hsl(var(--primary) / 0.1);
  }

  /* Focus visible for keyboard navigation */
  .ProseMirror:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;

/**
 * Rich Text Editor Component
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  placeholder = 'Start typing...',
  editable = true,
  characterLimit = 0,
  onChange,
  onFocus,
  onBlur,
  mentionItems = [],
  onMentionQuery,
  enableMarkdown = true,
  autoFocus = false,
  showToolbar = true,
  showBubbleMenu = true,
  showCharacterCount = true,
  showWordCount = true,
  readOnly = false,
  minHeight = '200px',
  maxHeight = '600px',
  enableFullscreen = true,
  error,
  className,
  toolbarClassName,
  contentClassName,
  compact = false,
  customToolbarGroups = [],
  visibleToolbarGroups = ['history', 'formatting', 'headings', 'lists', 'links', 'media', 'table', 'extras'],
  onImageUpload,
  onFileAttach,
  emojiList,
  showSettings = false,
  onExport,
  onImport,
  label,
  id,
  name,
  required = false,
  disabled = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    spellCheck: true,
    showToolbar: showToolbar,
    showBubbleMenu: showBubbleMenu,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  // Initialize editor
  const {
    editor,
    characterCount,
    wordCount,
    isReady,
    hasContent,
    isFocused,
    getHTML,
    getJSON,
    setContent,
    focus,
  } = useRichEditor({
    content,
    placeholder,
    editable: editable && !readOnly && !disabled,
    characterLimit,
    onUpdate: onChange,
    onFocus,
    onBlur,
    mentionItems,
    onMentionQuery,
    enableMarkdown,
    autoFocus,
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== getHTML()) {
      setContent(content);
    }
  }, [content, editor]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isFullscreen]);

  // Handle export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(getHTML(), getJSON());
    }
  }, [onExport, getHTML, getJSON]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (onImport) {
      const importedContent = await onImport();
      setContent(importedContent);
    }
  }, [onImport, setContent]);

  // Handle source view toggle
  const toggleSourceView = useCallback(() => {
    if (!showSource && sourceRef.current) {
      sourceRef.current.value = getHTML();
    }
    setShowSource((prev) => !prev);
  }, [showSource, getHTML]);

  // Apply source changes
  const applySourceChanges = useCallback(() => {
    if (sourceRef.current) {
      setContent(sourceRef.current.value);
      setShowSource(false);
    }
  }, [setContent]);

  // Keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
      if (e.key === 'F11' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Clean up fullscreen on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Inject editor styles */}
      <style dangerouslySetInnerHTML={{ __html: editorStyles }} />

      <div
        ref={containerRef}
        className={cn(
          'relative',
          isFullscreen && 'fixed inset-0 z-50 bg-background p-4',
          className
        )}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium mb-1.5',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}

        <Card
          className={cn(
            'overflow-hidden transition-shadow',
            isFocused && 'ring-2 ring-ring ring-offset-2',
            error && 'border-destructive',
            disabled && 'opacity-50 pointer-events-none',
            isFullscreen && 'h-full flex flex-col'
          )}
        >
          {/* Toolbar */}
          {localSettings.showToolbar && !showSource && (
            <div className={cn('flex items-center justify-between', toolbarClassName)}>
              <EditorToolbar
                editor={editor}
                showCharacterCount={showCharacterCount}
                showWordCount={showWordCount}
                characterLimit={characterLimit}
                characterCount={characterCount}
                wordCount={wordCount}
                customGroups={customToolbarGroups}
                visibleGroups={visibleToolbarGroups}
                onImageUpload={onImageUpload}
                onFileAttach={onFileAttach}
                compact={compact}
                emojiList={emojiList}
                className="flex-1"
              />

              {/* Additional toolbar actions */}
              <div className="flex items-center gap-1 px-2 border-b bg-muted/30">
                <TooltipProvider delayDuration={300}>
                  {/* Fullscreen toggle */}
                  {enableFullscreen && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size={compact ? 'icon-sm' : 'icon'}
                          onClick={toggleFullscreen}
                          className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                        >
                          {isFullscreen ? (
                            <Minimize2 size={compact ? 14 : 16} />
                          ) : (
                            <Maximize2 size={compact ? 14 : 16} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F11)'}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Source view toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={showSource ? 'secondary' : 'ghost'}
                        size={compact ? 'icon-sm' : 'icon'}
                        onClick={toggleSourceView}
                        className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                      >
                        {showSource ? (
                          <EyeOff size={compact ? 14 : 16} />
                        ) : (
                          <Eye size={compact ? 14 : 16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {showSource ? 'Hide Source' : 'View Source'}
                    </TooltipContent>
                  </Tooltip>

                  {/* Export/Import */}
                  {(onExport || onImport) && (
                    <>
                      {onExport && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size={compact ? 'icon-sm' : 'icon'}
                              onClick={handleExport}
                              className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                            >
                              <FileDown size={compact ? 14 : 16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Export Content</TooltipContent>
                        </Tooltip>
                      )}
                      {onImport && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size={compact ? 'icon-sm' : 'icon'}
                              onClick={handleImport}
                              className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                            >
                              <FileUp size={compact ? 14 : 16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Import Content</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}

                  {/* Settings */}
                  {showSettings && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size={compact ? 'icon-sm' : 'icon'}
                          className={cn(compact ? 'h-7 w-7' : 'h-8 w-8')}
                        >
                          <Settings size={compact ? 14 : 16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Editor Settings</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={localSettings.spellCheck}
                          onCheckedChange={(checked) =>
                            setLocalSettings((s) => ({ ...s, spellCheck: checked }))
                          }
                        >
                          Spell Check
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={localSettings.showToolbar}
                          onCheckedChange={(checked) =>
                            setLocalSettings((s) => ({ ...s, showToolbar: checked }))
                          }
                        >
                          Show Toolbar
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={localSettings.showBubbleMenu}
                          onCheckedChange={(checked) =>
                            setLocalSettings((s) => ({ ...s, showBubbleMenu: checked }))
                          }
                        >
                          Show Bubble Menu
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Bubble Menu */}
          {localSettings.showBubbleMenu && editor && !showSource && (
            <EditorBubbleMenu editor={editor} />
          )}

          {/* Content Area */}
          <div
            className={cn(
              'p-4',
              isFullscreen && 'flex-1 overflow-hidden',
              contentClassName
            )}
            style={{
              minHeight: isFullscreen ? undefined : minHeight,
              maxHeight: isFullscreen ? undefined : maxHeight,
            }}
          >
            {showSource ? (
              // Source view
              <div className="space-y-2 h-full">
                <textarea
                  ref={sourceRef}
                  defaultValue={getHTML()}
                  className={cn(
                    'w-full h-full font-mono text-sm p-2 border rounded-md resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                  style={{
                    minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
                  }}
                  spellCheck={false}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSourceView}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applySourceChanges}
                  >
                    Apply Changes
                  </Button>
                </div>
              </div>
            ) : (
              // Editor content
              <EditorContent
                id={id}
                editor={editor}
                className={cn(
                  'prose prose-sm dark:prose-invert max-w-none',
                  isFullscreen && 'h-full'
                )}
                style={{
                  minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
                  maxHeight: isFullscreen ? 'calc(100vh - 200px)' : maxHeight,
                  overflow: 'auto',
                }}
                spellCheck={localSettings.spellCheck}
              />
            )}
          </div>

          {/* Hidden input for form association */}
          {name && (
            <input
              type="hidden"
              name={name}
              value={getHTML()}
            />
          )}
        </Card>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-destructive">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Character limit warning */}
        {characterLimit > 0 && characterCount > characterLimit * 0.9 && (
          <div
            className={cn(
              'text-xs mt-1.5',
              characterCount >= characterLimit
                ? 'text-destructive'
                : 'text-warning'
            )}
          >
            {characterCount >= characterLimit
              ? `Character limit reached (${characterCount}/${characterLimit})`
              : `Approaching character limit (${characterCount}/${characterLimit})`}
          </div>
        )}
      </div>
    </>
  );
};

export default RichTextEditor;
