/**
 * Toast Hook
 * Simple toast notification hook
 */

import { useCallback } from "react";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    // Log to console for now - can be replaced with a proper toast library
    if (options.variant === "destructive") {
      console.error(`[Toast Error] ${options.title}`, options.description || "");
    } else {
      console.log(`[Toast] ${options.title}`, options.description || "");
    }

    // Could integrate with a toast library like sonner, react-hot-toast, etc.
  }, []);

  return { toast };
}

export default useToast;
