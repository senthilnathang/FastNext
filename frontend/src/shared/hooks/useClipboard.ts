'use client';

/**
 * Clipboard Hook
 *
 * Provides clipboard read/write functionality with browser compatibility fallbacks.
 */

import { useCallback, useState } from 'react';

export interface UseClipboardOptions {
  /** Timeout for copied state in ms */
  timeout?: number;
  /** Callback when copy succeeds */
  onSuccess?: (text: string) => void;
  /** Callback when copy fails */
  onError?: (error: Error) => void;
}

export interface UseClipboardReturn {
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Read text from clipboard */
  read: () => Promise<string | null>;
  /** Whether text was recently copied */
  copied: boolean;
  /** Last copied text */
  copiedText: string | null;
  /** Whether clipboard API is supported */
  isSupported: boolean;
  /** Last error */
  error: Error | null;
}

/**
 * Clipboard hook for copying and reading text
 */
export function useClipboard(
  options: UseClipboardOptions = {},
): UseClipboardReturn {
  const { timeout = 2000, onSuccess, onError } = options;

  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' && 'clipboard' in navigator;

  /**
   * Copy text to clipboard
   */
  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      setError(null);

      try {
        if (isSupported) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          textArea.style.top = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        setCopied(true);
        setCopiedText(text);
        onSuccess?.(text);

        // Reset copied state after timeout
        setTimeout(() => {
          setCopied(false);
        }, timeout);

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Copy failed');
        setError(error);
        onError?.(error);
        return false;
      }
    },
    [isSupported, timeout, onSuccess, onError],
  );

  /**
   * Read text from clipboard
   */
  const read = useCallback(async (): Promise<string | null> => {
    setError(null);

    try {
      if (!isSupported) {
        throw new Error('Clipboard API not supported');
      }

      const text = await navigator.clipboard.readText();
      return text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Read failed');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [isSupported, onError]);

  return {
    copy,
    read,
    copied,
    copiedText,
    isSupported,
    error,
  };
}

export default useClipboard;
