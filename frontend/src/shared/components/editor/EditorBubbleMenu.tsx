'use client';

/**
 * Editor Bubble Menu Component
 *
 * A floating toolbar that appears when text is selected.
 * Provides quick access to formatting options.
 *
 * Note: Currently disabled as TipTap v3.x doesn't export BubbleMenu as a React component.
 * Can be re-enabled once a proper floating menu solution is implemented.
 */

import type { Editor } from '@tiptap/react';
import type React from 'react';

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

/**
 * Editor Bubble Menu Component
 *
 * Currently disabled - BubbleMenu from TipTap v3 is not a React component.
 * Use the editor toolbar for formatting instead.
 */
export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = () => {
  // BubbleMenu is disabled in TipTap v3 - use toolbar instead
  return null;
};

export default EditorBubbleMenu;
