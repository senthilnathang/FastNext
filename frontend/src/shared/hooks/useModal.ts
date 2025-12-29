'use client';

/**
 * Modal Hook
 *
 * Provides modal state management with open/close handlers.
 */

import { useCallback, useState } from 'react';

export interface UseModalOptions<T = unknown> {
  /** Initial open state */
  defaultOpen?: boolean;
  /** Initial data */
  defaultData?: T;
  /** Callback when modal opens */
  onOpen?: (data?: T) => void;
  /** Callback when modal closes */
  onClose?: () => void;
}

export interface UseModalReturn<T = unknown> {
  /** Whether modal is open */
  isOpen: boolean;
  /** Modal data */
  data: T | undefined;
  /** Open the modal */
  open: (data?: T) => void;
  /** Close the modal */
  close: () => void;
  /** Toggle the modal */
  toggle: () => void;
  /** Set modal data without opening */
  setData: (data: T) => void;
}

/**
 * Modal state management hook
 */
export function useModal<T = unknown>(
  options: UseModalOptions<T> = {},
): UseModalReturn<T> {
  const { defaultOpen = false, defaultData, onOpen, onClose } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState<T | undefined>(defaultData);

  const open = useCallback(
    (newData?: T) => {
      if (newData !== undefined) {
        setData(newData);
      }
      setIsOpen(true);
      onOpen?.(newData);
    },
    [onOpen],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData,
  };
}

/**
 * Hook for managing multiple modals
 */
export function useModals<K extends string>() {
  const [openModals, setOpenModals] = useState<Set<K>>(new Set());
  const [modalData, setModalData] = useState<Record<K, unknown>>(
    {} as Record<K, unknown>,
  );

  const open = useCallback((key: K, data?: unknown) => {
    setOpenModals((prev) => new Set(prev).add(key));
    if (data !== undefined) {
      setModalData((prev) => ({ ...prev, [key]: data }));
    }
  }, []);

  const close = useCallback((key: K) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isOpen = useCallback(
    (key: K) => {
      return openModals.has(key);
    },
    [openModals],
  );

  const getData = useCallback(
    <T = unknown>(key: K): T | undefined => {
      return modalData[key] as T | undefined;
    },
    [modalData],
  );

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  return {
    open,
    close,
    isOpen,
    getData,
    closeAll,
    openModals: Array.from(openModals),
  };
}

export default useModal;
