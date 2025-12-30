'use client';

/**
 * Rich Text Editor Hook
 *
 * Custom hook for managing TipTap editor state and configuration.
 * Provides a unified interface for editor operations.
 *
 * Usage:
 * ```tsx
 * import { useRichEditor } from '@/shared/hooks/useEditor';
 *
 * const { editor, characterCount, wordCount, isReady } = useRichEditor({
 *   content: '<p>Hello World</p>',
 *   placeholder: 'Start typing...',
 *   editable: true,
 *   onUpdate: (html, json) => console.log(html),
 * });
 * ```
 */

import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Underline from '@tiptap/extension-underline';
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Types
export interface MentionItem {
  id: string;
  label: string;
  avatar?: string;
}

export interface EditorConfig {
  /** Initial HTML content */
  content?: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether editor is editable */
  editable?: boolean;
  /** Character limit (0 = no limit) */
  characterLimit?: number;
  /** Callback when content changes */
  onUpdate?: (html: string, json: Record<string, unknown>) => void;
  /** Callback when focus changes */
  onFocus?: () => void;
  /** Callback when blur occurs */
  onBlur?: () => void;
  /** Mention suggestion items */
  mentionItems?: MentionItem[];
  /** Callback to fetch mention suggestions */
  onMentionQuery?: (query: string) => Promise<MentionItem[]> | MentionItem[];
  /** Enable markdown shortcuts */
  enableMarkdown?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom extensions */
  extensions?: unknown[];
}

export interface EditorState {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Current character count */
  characterCount: number;
  /** Current word count */
  wordCount: number;
  /** Whether editor is ready */
  isReady: boolean;
  /** Whether editor has content */
  hasContent: boolean;
  /** Whether editor is focused */
  isFocused: boolean;
  /** Current selection exists */
  hasSelection: boolean;
  /** Get HTML content */
  getHTML: () => string;
  /** Get JSON content */
  getJSON: () => Record<string, unknown>;
  /** Get plain text */
  getText: () => string;
  /** Set content */
  setContent: (content: string) => void;
  /** Clear content */
  clearContent: () => void;
  /** Focus editor */
  focus: () => void;
  /** Blur editor */
  blur: () => void;
  /** Execute editor command */
  executeCommand: (command: EditorCommand) => void;
  /** Check if mark is active */
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
  /** Check if command can be executed */
  canExecute: (command: EditorCommand) => boolean;
  /** Insert image */
  insertImage: (url: string, alt?: string) => void;
  /** Insert link */
  insertLink: (url: string, text?: string) => void;
  /** Insert table */
  insertTable: (rows?: number, cols?: number) => void;
  /** Insert mention */
  insertMention: (item: MentionItem) => void;
  /** Insert emoji */
  insertEmoji: (emoji: string) => void;
}

export type EditorCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'codeBlock'
  | 'blockquote'
  | 'bulletList'
  | 'orderedList'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'paragraph'
  | 'horizontalRule'
  | 'hardBreak'
  | 'undo'
  | 'redo'
  | 'clearMarks'
  | 'unsetAllMarks'
  | 'toggleLink'
  | 'unsetLink'
  | 'liftListItem'
  | 'sinkListItem';

/**
 * Create mention suggestion configuration
 */
const createMentionSuggestion = (
  mentionItems: MentionItem[],
  onMentionQuery?: (query: string) => Promise<MentionItem[]> | MentionItem[]
) => ({
  items: async ({ query }: { query: string }) => {
    if (onMentionQuery) {
      return await onMentionQuery(query);
    }
    return mentionItems.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  },
  render: () => {
    let component: HTMLDivElement | null = null;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: (props: {
        items: MentionItem[];
        clientRect: (() => DOMRect) | null;
        command: (item: { id: string; label: string }) => void;
      }) => {
        component = document.createElement('div');
        component.className = 'mention-suggestions';

        popup = document.createElement('div');
        popup.className = 'fixed z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[200px]';

        if (props.clientRect) {
          const rect = props.clientRect();
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 4}px`;
        }

        popup.innerHTML = props.items.map((item) => `
          <div
            class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
            data-id="${item.id}"
            data-label="${item.label}"
          >
            ${item.avatar ? `<img src="${item.avatar}" class="w-5 h-5 rounded-full" />` : ''}
            <span>${item.label}</span>
          </div>
        `).join('');

        // Add click handlers
        popup.querySelectorAll('[data-id]').forEach((el) => {
          el.addEventListener('click', () => {
            const id = el.getAttribute('data-id') || '';
            const label = el.getAttribute('data-label') || '';
            props.command({ id, label });
          });
        });

        document.body.appendChild(popup);
      },
      onUpdate: (props: {
        items: MentionItem[];
        clientRect: (() => DOMRect) | null;
        command: (item: { id: string; label: string }) => void;
      }) => {
        if (!popup) return;

        if (props.clientRect) {
          const rect = props.clientRect();
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 4}px`;
        }

        popup.innerHTML = props.items.map((item) => `
          <div
            class="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
            data-id="${item.id}"
            data-label="${item.label}"
          >
            ${item.avatar ? `<img src="${item.avatar}" class="w-5 h-5 rounded-full" />` : ''}
            <span>${item.label}</span>
          </div>
        `).join('');

        popup.querySelectorAll('[data-id]').forEach((el) => {
          el.addEventListener('click', () => {
            const id = el.getAttribute('data-id') || '';
            const label = el.getAttribute('data-label') || '';
            props.command({ id, label });
          });
        });
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          if (popup) {
            popup.remove();
            popup = null;
          }
          return true;
        }
        return false;
      },
      onExit: () => {
        if (popup) {
          popup.remove();
          popup = null;
        }
        component = null;
      },
    };
  },
});

/**
 * Rich Text Editor Hook
 */
export function useRichEditor(config: EditorConfig = {}): EditorState {
  const {
    content = '',
    placeholder = 'Write something...',
    editable = true,
    characterLimit = 0,
    onUpdate,
    onFocus,
    onBlur,
    mentionItems = [],
    onMentionQuery,
    enableMarkdown = true,
    autoFocus = false,
    extensions: customExtensions = [],
  } = config;

  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Configure extensions
  const extensions = useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'hljs',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border bg-muted px-4 py-2 text-left font-bold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border px-4 py-2',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: characterLimit > 0 ? characterLimit : undefined,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-primary/10 text-primary px-1 py-0.5 rounded font-medium',
        },
        suggestion: createMentionSuggestion(mentionItems, onMentionQuery),
      }),
      ...customExtensions,
    ];

    return baseExtensions;
  }, [placeholder, characterLimit, mentionItems, onMentionQuery, customExtensions]);

  // Initialize editor
  const editor = useEditor({
    extensions,
    content,
    editable,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML(), editor.getJSON() as Record<string, unknown>);
      }
    },
    onFocus: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      setIsFocused(false);
      onBlur?.();
    },
    onCreate: () => {
      setIsReady(true);
    },
  });

  // Update editable state when it changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Computed values
  const characterCount = editor?.storage.characterCount?.characters() || 0;
  const wordCount = editor?.storage.characterCount?.words() || 0;
  const hasContent = editor ? !editor.isEmpty : false;
  const hasSelection = editor ? !editor.state.selection.empty : false;

  // Helper functions
  const getHTML = useCallback(() => {
    return editor?.getHTML() || '';
  }, [editor]);

  const getJSON = useCallback(() => {
    return (editor?.getJSON() as Record<string, unknown>) || {};
  }, [editor]);

  const getText = useCallback(() => {
    return editor?.getText() || '';
  }, [editor]);

  const setContent = useCallback((newContent: string) => {
    editor?.commands.setContent(newContent);
  }, [editor]);

  const clearContent = useCallback(() => {
    editor?.commands.clearContent();
  }, [editor]);

  const focus = useCallback(() => {
    editor?.commands.focus('end');
  }, [editor]);

  const blur = useCallback(() => {
    editor?.commands.blur();
  }, [editor]);

  const isActive = useCallback((name: string, attributes?: Record<string, unknown>) => {
    return editor?.isActive(name, attributes) || false;
  }, [editor]);

  // Command execution
  const executeCommand = useCallback((command: EditorCommand) => {
    if (!editor) return;

    const commands: Record<EditorCommand, () => void> = {
      bold: () => editor.chain().focus().toggleBold().run(),
      italic: () => editor.chain().focus().toggleItalic().run(),
      underline: () => editor.chain().focus().toggleUnderline().run(),
      strike: () => editor.chain().focus().toggleStrike().run(),
      code: () => editor.chain().focus().toggleCode().run(),
      codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      blockquote: () => editor.chain().focus().toggleBlockquote().run(),
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      orderedList: () => editor.chain().focus().toggleOrderedList().run(),
      heading1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      heading2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      heading3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      heading4: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
      heading5: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
      heading6: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
      paragraph: () => editor.chain().focus().setParagraph().run(),
      horizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
      hardBreak: () => editor.chain().focus().setHardBreak().run(),
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      clearMarks: () => editor.chain().focus().unsetAllMarks().run(),
      unsetAllMarks: () => editor.chain().focus().unsetAllMarks().run(),
      toggleLink: () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
      },
      unsetLink: () => editor.chain().focus().unsetLink().run(),
      liftListItem: () => editor.chain().focus().liftListItem('listItem').run(),
      sinkListItem: () => editor.chain().focus().sinkListItem('listItem').run(),
    };

    commands[command]?.();
  }, [editor]);

  const canExecute = useCallback((command: EditorCommand): boolean => {
    if (!editor) return false;

    const checks: Partial<Record<EditorCommand, () => boolean>> = {
      undo: () => editor.can().undo(),
      redo: () => editor.can().redo(),
      liftListItem: () => editor.can().liftListItem('listItem'),
      sinkListItem: () => editor.can().sinkListItem('listItem'),
    };

    return checks[command]?.() ?? true;
  }, [editor]);

  const insertImage = useCallback((url: string, alt?: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
  }, [editor]);

  const insertLink = useCallback((url: string, text?: string) => {
    if (!editor) return;
    if (text) {
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback((rows: number = 3, cols: number = 3) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  }, [editor]);

  const insertMention = useCallback((item: MentionItem) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'mention',
      attrs: {
        id: item.id,
        label: item.label,
      },
    }).run();
  }, [editor]);

  const insertEmoji = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
  }, [editor]);

  return {
    editor,
    characterCount,
    wordCount,
    isReady,
    hasContent,
    isFocused,
    hasSelection,
    getHTML,
    getJSON,
    getText,
    setContent,
    clearContent,
    focus,
    blur,
    executeCommand,
    isActive,
    canExecute,
    insertImage,
    insertLink,
    insertTable,
    insertMention,
    insertEmoji,
  };
}

export default useRichEditor;
