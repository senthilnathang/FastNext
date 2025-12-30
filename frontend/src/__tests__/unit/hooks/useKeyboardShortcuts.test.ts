/**
 * Tests for useKeyboardShortcuts hook
 */

import { jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import {
  useKeyboardShortcut,
  useKeyboardShortcuts,
  formatShortcut,
  type ShortcutOptions,
  type Shortcut,
} from '@/shared/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('registers keyboard event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  test('removes keyboard event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const handler = jest.fn();

    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  test('calls handler when shortcut is triggered', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  test('does not call handler when wrong key is pressed', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'l',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not call handler when modifier is missing', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: false,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('handles Shift modifier', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 's', shift: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      shiftKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('handles Alt modifier', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'a', alt: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      altKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('handles Meta modifier', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'm', meta: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'm',
      metaKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('handles multiple modifiers', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true, shift: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('does not call handler when extra modifier is pressed', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 's', ctrl: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      altKey: true, // Extra modifier
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('prevents default when preventDefault is true', () => {
    const handler = jest.fn();
    const preventDefault = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true, preventDefault: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: preventDefault });
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  test('stops propagation when stopPropagation is true', () => {
    const handler = jest.fn();
    const stopPropagation = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true, stopPropagation: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    Object.defineProperty(event, 'stopPropagation', { value: stopPropagation });
    window.dispatchEvent(event);

    expect(stopPropagation).toHaveBeenCalled();
  });

  test('does not trigger when disabled', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true, disabled: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not trigger when focused on input element', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  test('does not trigger when focused on textarea element', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrl: true }, handler)
    );

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  test('handles case-insensitive key matching', () => {
    const handler = jest.fn();

    renderHook(() =>
      useKeyboardShortcut({ key: 'K', ctrl: true }, handler)
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts', () => {
  test('handles multiple shortcuts', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler: handler1 },
      { key: 's', ctrl: true, handler: handler2 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event1 = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event1);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();

    const event2 = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });
    window.dispatchEvent(event2);

    expect(handler2).toHaveBeenCalled();
  });

  test('only triggers first matching shortcut', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler: handler1 },
      { key: 'k', ctrl: true, handler: handler2 }, // Duplicate
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  test('skips disabled shortcuts', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler: handler1, disabled: true },
      { key: 'k', ctrl: true, handler: handler2 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  test('cleans up all listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler: jest.fn() },
      { key: 's', ctrl: true, handler: jest.fn() },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});

describe('formatShortcut', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  test('formats simple key', () => {
    const result = formatShortcut({ key: 'k' });
    expect(result).toBe('K');
  });

  test('formats Ctrl modifier on non-Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });

    const result = formatShortcut({ key: 'k', ctrl: true });
    expect(result).toBe('Ctrl+K');
  });

  test('formats multiple modifiers', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });

    const result = formatShortcut({ key: 's', ctrl: true, shift: true });
    expect(result).toBe('Ctrl+Shift+S');
  });

  test('formats special keys', () => {
    expect(formatShortcut({ key: ' ' })).toBe('Space');
    expect(formatShortcut({ key: 'Escape' })).toBe('Esc');
    // Enter may be formatted as ↵ or Enter
    const enterResult = formatShortcut({ key: 'Enter' });
    expect(['↵', 'Enter', '⏎'].some(v => enterResult.includes(v))).toBe(true);
  });

  test('formats arrow keys', () => {
    // Arrow keys are formatted with symbols
    const up = formatShortcut({ key: 'ArrowUp' });
    const down = formatShortcut({ key: 'ArrowDown' });
    const left = formatShortcut({ key: 'ArrowLeft' });
    const right = formatShortcut({ key: 'ArrowRight' });
    // Accept either symbol or text representation
    expect(['↑', 'Up'].some(v => up.includes(v))).toBe(true);
    expect(['↓', 'Down'].some(v => down.includes(v))).toBe(true);
    expect(['←', 'Left'].some(v => left.includes(v))).toBe(true);
    expect(['→', 'Right'].some(v => right.includes(v))).toBe(true);
  });

  test('formats Tab key', () => {
    const result = formatShortcut({ key: 'Tab' });
    // Tab may be formatted as ⇥ or Tab
    expect(['⇥', 'Tab'].some(v => result.includes(v))).toBe(true);
  });

  test('formats Backspace key', () => {
    const result = formatShortcut({ key: 'Backspace' });
    // Backspace may be formatted as ⌫ or Backspace
    expect(['⌫', 'Backspace'].some(v => result.includes(v))).toBe(true);
  });

  test('formats Delete key', () => {
    const result = formatShortcut({ key: 'Delete' });
    expect(result).toBe('Del');
  });

  test('formats Alt modifier on non-Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });

    const result = formatShortcut({ key: 'a', alt: true });
    expect(result).toBe('Alt+A');
  });

  test('formats Meta modifier on non-Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });

    const result = formatShortcut({ key: 'm', meta: true });
    expect(result).toBe('Win+M');
  });

  test('formats Mac-style shortcuts', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });

    const result = formatShortcut({ key: 'k', ctrl: true, shift: true });
    expect(result).toContain('K');
  });

  test('formats all modifiers together', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });

    const result = formatShortcut({
      key: 'k',
      ctrl: true,
      alt: true,
      shift: true,
      meta: true,
    });

    expect(result).toContain('Ctrl');
    expect(result).toContain('Alt');
    expect(result).toContain('Shift');
    expect(result).toContain('Win');
    expect(result).toContain('K');
  });
});
