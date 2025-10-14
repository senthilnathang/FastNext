/**
 * Accessibility utilities for WCAG 2.1 AAA compliance
 */

import { RefObject } from 'react';

// Color contrast utilities
export const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

export const getLuminance = (color: string): number => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const [rLinear, gLinear, bLinear] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

// WCAG 2.1 AAA contrast requirements
export const WCAG_CONTRAST = {
  AA: {
    normal: 4.5,
    large: 3.0,
  },
  AAA: {
    normal: 7.0,
    large: 4.5,
  },
};

export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= WCAG_CONTRAST[level][size];
};

// Focus management utilities
export const focusableElements = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
];

export const getFocusableElements = (container?: Element): NodeListOf<Element> => {
  const context = container || document;
  return context.querySelectorAll(focusableElements.join(', '));
};

export const trapFocus = (container: Element, event: KeyboardEvent): void => {
  const focusable = getFocusableElements(container);
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }
};

export const manageFocus = {
  save: (): Element | null => document.activeElement,
  restore: (element: Element | null): void => {
    if (element && 'focus' in element) {
      (element as HTMLElement).focus();
    }
  },
  move: (element: HTMLElement): void => {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
};

// Screen reader utilities
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);
  announcement.textContent = message;

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const generateId = (prefix: string = 'a11y'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// ARIA utilities
export const getAriaLabel = (
  element: Element,
  fallback?: string
): string | null => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  const title = element.getAttribute('title');

  if (ariaLabel) return ariaLabel;
  if (ariaLabelledBy) {
    const labelledByElement = document.getElementById(ariaLabelledBy);
    return labelledByElement?.textContent || null;
  }
  if (title) return title;

  return fallback || null;
};

// Keyboard navigation utilities
export const isNavigationKey = (key: string): boolean => {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
};

export const isActivationKey = (key: string): boolean => {
  return ['Enter', ' '].includes(key);
};

// Motion preferences
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// High contrast mode detection
export const isHighContrastMode = (): boolean => {
  const testElement = document.createElement('div');
  testElement.style.color = 'rgb(31, 41, 55)'; // Tailwind gray-800
  testElement.style.backgroundColor = 'rgb(255, 255, 255)';
  document.body.appendChild(testElement);

  const computedStyle = window.getComputedStyle(testElement);
  const isHighContrast = computedStyle.color === computedStyle.backgroundColor;

  document.body.removeChild(testElement);
  return isHighContrast;
};

// Skip links
export const createSkipLink = (targetId: string, text: string): HTMLAnchorElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
    border-radius: 4px;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '6px';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  return skipLink;
};

// Form accessibility
export const validateFormAccessibility = (form: HTMLFormElement): string[] => {
  const issues: string[] = [];

  // Check for form labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      const label = form.querySelector(`label[for="${element.id}"]`);
      if (!label) {
        issues.push(`Input ${element.name || element.id} is missing a label`);
      }
    }
  });

  // Check for error messages
  const invalidInputs = form.querySelectorAll('input:invalid, select:invalid, textarea:invalid');
  invalidInputs.forEach((input) => {
    const element = input as HTMLInputElement;
    if (!element.getAttribute('aria-describedby')) {
      issues.push(`Invalid input ${element.name || element.id} is missing error message reference`);
    }
  });

  return issues;
};

// Heading structure validation
export const validateHeadingStructure = (container: Document | Element = document): string[] => {
  const issues: string[] = [];
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

  let lastLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (level - lastLevel > 1) {
      issues.push(`Heading level skipped: ${heading.textContent?.trim()}`);
    }
    lastLevel = level;
  });

  return issues;
};

// Color blindness simulation
export const simulateColorBlindness = (color: string, type: 'protanopia' | 'deuteranopia' | 'tritanopia'): string => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);

  // Apply color blindness transformation matrices
  switch (type) {
    case 'protanopia':
      r = r * 0.567 + g * 0.433 + b * 0;
      g = r * 0.558 + g * 0.442 + b * 0;
      b = r * 0 + g * 0.242 + b * 0.758;
      break;
    case 'deuteranopia':
      r = r * 0.625 + g * 0.375 + b * 0;
      g = r * 0.7 + g * 0.3 + b * 0;
      b = r * 0 + g * 0.3 + b * 0.7;
      break;
    case 'tritanopia':
      r = r * 0.95 + g * 0.05 + b * 0;
      g = r * 0 + g * 0.433 + b * 0.567;
      b = r * 0 + g * 0.475 + b * 0.525;
      break;
  }

  // Clamp values and convert back to hex
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};