'use client';

/**
 * Confirm Dialog Hook
 *
 * Provides confirmation dialog functionality with promise-based API.
 */

import { useCallback, useState } from 'react';

export interface ConfirmOptions {
  /** Dialog title */
  title?: string;
  /** Dialog message/description */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: 'default' | 'destructive' | 'outline';
  /** Whether the action is destructive (shows warning styling) */
  destructive?: boolean;
}

export interface ConfirmState extends ConfirmOptions {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Resolve function for the promise */
  resolve: ((value: boolean) => void) | null;
}

export interface UseConfirmReturn {
  /** Confirm state for rendering the dialog */
  state: ConfirmState;
  /** Show confirmation dialog and wait for response */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Handle user confirmation */
  handleConfirm: () => void;
  /** Handle user cancellation */
  handleCancel: () => void;
  /** Close dialog without resolving (escape/backdrop click) */
  close: () => void;
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: 'Confirm',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmVariant: 'default',
  destructive: false,
  resolve: null,
};

/**
 * Confirmation dialog hook with promise-based API
 */
export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title ?? 'Confirm',
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        confirmVariant: options.destructive
          ? 'destructive'
          : options.confirmVariant ?? 'default',
        destructive: options.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(defaultState);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(defaultState);
  }, [state.resolve]);

  const close = useCallback(() => {
    state.resolve?.(false);
    setState(defaultState);
  }, [state.resolve]);

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel,
    close,
  };
}

/**
 * Shorthand for delete confirmations
 */
export function useDeleteConfirm() {
  const { confirm, ...rest } = useConfirm();

  const confirmDelete = useCallback(
    (itemName?: string) => {
      return confirm({
        title: 'Delete Confirmation',
        message: itemName
          ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
          : 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true,
      });
    },
    [confirm],
  );

  return {
    confirmDelete,
    confirm,
    ...rest,
  };
}

export default useConfirm;
