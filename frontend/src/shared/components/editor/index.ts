/**
 * Rich Text Editor Components
 *
 * Comprehensive editor components built with TipTap.
 *
 * Usage:
 * ```tsx
 * import { RichTextEditor, EditorToolbar, EditorBubbleMenu } from '@/shared/components/editor';
 * import { useRichEditor } from '@/shared/hooks/useEditor';
 *
 * function MyEditor() {
 *   return (
 *     <RichTextEditor
 *       content="<p>Hello World</p>"
 *       onChange={(html) => console.log(html)}
 *     />
 *   );
 * }
 * ```
 */

// Main Editor Component
export { RichTextEditor, default as RichTextEditorDefault } from './RichTextEditor';
export type { RichTextEditorProps } from './RichTextEditor';

// Toolbar Component
export { EditorToolbar } from './EditorToolbar';
export type { EditorToolbarProps, ToolbarGroup, ToolbarItem } from './EditorToolbar';

// Bubble Menu Component
export { EditorBubbleMenu } from './EditorBubbleMenu';
export type { EditorBubbleMenuProps, BubbleMenuItem } from './EditorBubbleMenu';
