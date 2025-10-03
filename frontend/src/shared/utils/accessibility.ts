/**
 * Accessibility utilities for improving user experience
 */

/**
 * Manages focus restoration when dialogs/modals close
 */
export class FocusManager {
  private lastFocusedElement: HTMLElement | null = null;

  /**
   * Save the currently focused element before opening a modal
   */
  saveFocus(): void {
    this.lastFocusedElement = document.activeElement as HTMLElement;
  }

  /**
   * Restore focus to the previously focused element
   */
  restoreFocus(): void {
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  /**
   * Move focus to the first focusable element in a container
   */
  focusFirst(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }
}

/**
 * Announce text to screen readers using aria-live regions
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after a short delay
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if an element has sufficient color contrast
 * This is a simplified check - for production use a proper contrast checking library
 */
export function hasGoodContrast(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  const bgColor = styles.backgroundColor;
  const textColor = styles.color;
  
  // This is a simplified check - in production you'd want to use a proper contrast ratio calculation
  // For now, just check if colors are explicitly set
  return bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)';
}

/**
 * Create a keyboard event handler for common patterns
 */
export function createKeyboardHandler(callbacks: {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}) {
  return (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        if (callbacks.onEnter) {
          event.preventDefault();
          callbacks.onEnter();
        }
        break;
      case ' ':
        if (callbacks.onSpace) {
          event.preventDefault();
          callbacks.onSpace();
        }
        break;
      case 'Escape':
        if (callbacks.onEscape) {
          event.preventDefault();
          callbacks.onEscape();
        }
        break;
      case 'ArrowUp':
        if (callbacks.onArrowUp) {
          event.preventDefault();
          callbacks.onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (callbacks.onArrowDown) {
          event.preventDefault();
          callbacks.onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (callbacks.onArrowLeft) {
          event.preventDefault();
          callbacks.onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (callbacks.onArrowRight) {
          event.preventDefault();
          callbacks.onArrowRight();
        }
        break;
    }
  };
}

/**
 * React hook for managing focus within a component
 */
export function useFocusManagement() {
  const focusManager = new FocusManager();
  
  return {
    saveFocus: focusManager.saveFocus.bind(focusManager),
    restoreFocus: focusManager.restoreFocus.bind(focusManager),
    focusFirst: focusManager.focusFirst.bind(focusManager),
  };
}

/**
 * Generate a unique ID for accessibility attributes
 */
export function generateId(prefix: string = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common ARIA attributes for different component types
 */
export const ARIA_PATTERNS = {
  button: {
    role: 'button',
    tabIndex: 0,
  },
  link: {
    role: 'link',
    tabIndex: 0,
  },
  dialog: {
    role: 'dialog',
    'aria-modal': true,
  },
  navigation: {
    role: 'navigation',
  },
  main: {
    role: 'main',
  },
  banner: {
    role: 'banner',
  },
  contentinfo: {
    role: 'contentinfo',
  },
  search: {
    role: 'search',
  },
  table: {
    role: 'table',
  },
  grid: {
    role: 'grid',
  },
  listbox: {
    role: 'listbox',
  },
  menu: {
    role: 'menu',
  },
  menuitem: {
    role: 'menuitem',
  },
  tab: {
    role: 'tab',
  },
  tabpanel: {
    role: 'tabpanel',
  },
} as const;