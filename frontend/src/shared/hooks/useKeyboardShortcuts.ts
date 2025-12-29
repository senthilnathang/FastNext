'use client';

/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling with modifier key support.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface ShortcutOptions {
  /** Key to listen for */
  key: string;
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Require Meta key (Cmd on Mac) */
  meta?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Only trigger when focused on specific element */
  target?: HTMLElement | null;
  /** Disable the shortcut */
  disabled?: boolean;
}

export interface Shortcut extends ShortcutOptions {
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
}

/**
 * Check if event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutOptions): boolean {
  const key = shortcut.key.toLowerCase();
  const eventKey = event.key.toLowerCase();

  // Check key match
  if (eventKey !== key) return false;

  // Check modifier keys
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;
  if (shortcut.meta && !event.metaKey) return false;

  // If no modifiers required but some are pressed, it's not a match
  // (unless specifically those modifiers are required)
  if (!shortcut.ctrl && event.ctrlKey && !shortcut.meta) return false;
  if (!shortcut.alt && event.altKey) return false;
  // Allow shift with non-modifier keys (for capital letters)
  if (!shortcut.meta && event.metaKey && !shortcut.ctrl) return false;

  return true;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutOptions): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Win');
  }

  // Format the key
  let keyDisplay = shortcut.key.toUpperCase();
  if (keyDisplay === ' ') keyDisplay = 'Space';
  if (keyDisplay === 'ARROWUP') keyDisplay = '↑';
  if (keyDisplay === 'ARROWDOWN') keyDisplay = '↓';
  if (keyDisplay === 'ARROWLEFT') keyDisplay = '←';
  if (keyDisplay === 'ARROWRIGHT') keyDisplay = '→';
  if (keyDisplay === 'ESCAPE') keyDisplay = 'Esc';
  if (keyDisplay === 'ENTER') keyDisplay = '↵';
  if (keyDisplay === 'BACKSPACE') keyDisplay = '⌫';
  if (keyDisplay === 'DELETE') keyDisplay = 'Del';
  if (keyDisplay === 'TAB') keyDisplay = '⇥';

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

/**
 * Single keyboard shortcut hook
 */
export function useKeyboardShortcut(
  options: ShortcutOptions,
  handler: (event: KeyboardEvent) => void,
  deps: React.DependencyList = [],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (options.disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should only listen on a specific target
      if (options.target && event.target !== options.target) {
        return;
      }

      // Don't trigger on input/textarea unless specifically targeted
      if (
        !options.target &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          (event.target instanceof HTMLElement && event.target.isContentEditable))
      ) {
        return;
      }

      if (matchesShortcut(event, options)) {
        if (options.preventDefault) {
          event.preventDefault();
        }
        if (options.stopPropagation) {
          event.stopPropagation();
        }
        handlerRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.key,
    options.ctrl,
    options.shift,
    options.alt,
    options.meta,
    options.preventDefault,
    options.stopPropagation,
    options.target,
    options.disabled,
    ...deps,
  ]);
}

/**
 * Multiple keyboard shortcuts hook
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  deps: React.DependencyList = [],
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger on input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) continue;

        if (shortcut.target && event.target !== shortcut.target) {
          continue;
        }

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          shortcut.handler(event);
          break; // Only trigger first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useKeyboardShortcut;
