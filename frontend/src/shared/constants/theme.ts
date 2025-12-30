/**
 * Theme constants migrated from FastVue
 * Provides centralized theme configuration for the application
 */

// FastVue Professional Blue as primary
export const THEME_COLORS = {
  primary: {
    hsl: 'hsl(212 100% 45%)',
    hex: '#0066E6',
    rgb: 'rgb(0, 102, 230)',
  },
  success: {
    hsl: 'hsl(142 76% 36%)',
    hex: '#16A34A',
    rgb: 'rgb(22, 163, 74)',
  },
  warning: {
    hsl: 'hsl(45 93% 47%)',
    hex: '#EAB308',
    rgb: 'rgb(234, 179, 8)',
  },
  error: {
    hsl: 'hsl(0 84% 60%)',
    hex: '#EF4444',
    rgb: 'rgb(239, 68, 68)',
  },
  info: {
    hsl: 'hsl(212 100% 45%)',
    hex: '#0066E6',
    rgb: 'rgb(0, 102, 230)',
  },
} as const;

// Chart color palette
export const CHART_COLORS = {
  1: 'oklch(0.646 0.222 41.116)',  // Orange
  2: 'oklch(0.548 0.166 160.613)', // Teal
  3: 'oklch(0.631 0.204 16.756)',  // Red
  4: 'oklch(0.569 0.214 286.078)', // Purple
  5: 'oklch(0.398 0.021 221.463)', // Gray-blue
} as const;

// Label colors for categorization
export const LABEL_COLORS = [
  { name: 'red', bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
  { name: 'orange', bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
  { name: 'yellow', bg: '#FEF3C7', text: '#A16207', border: '#FDE68A' },
  { name: 'green', bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
  { name: 'teal', bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' },
  { name: 'blue', bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
  { name: 'indigo', bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' },
  { name: 'purple', bg: '#F3E8FF', text: '#7C3AED', border: '#E9D5FF' },
  { name: 'pink', bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' },
  { name: 'gray', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
] as const;

// Dark mode label colors
export const LABEL_COLORS_DARK = [
  { name: 'red', bg: '#450A0A', text: '#FCA5A5', border: '#7F1D1D' },
  { name: 'orange', bg: '#431407', text: '#FDBA74', border: '#7C2D12' },
  { name: 'yellow', bg: '#422006', text: '#FDE047', border: '#713F12' },
  { name: 'green', bg: '#052E16', text: '#86EFAC', border: '#14532D' },
  { name: 'teal', bg: '#042F2E', text: '#5EEAD4', border: '#134E4A' },
  { name: 'blue', bg: '#172554', text: '#93C5FD', border: '#1E3A8A' },
  { name: 'indigo', bg: '#1E1B4B', text: '#A5B4FC', border: '#312E81' },
  { name: 'purple', bg: '#2E1065', text: '#C4B5FD', border: '#4C1D95' },
  { name: 'pink', bg: '#500724', text: '#F9A8D4', border: '#831843' },
  { name: 'gray', bg: '#1F2937', text: '#D1D5DB', border: '#374151' },
] as const;

// Spacing scale (matching Tailwind)
export const SPACING = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

// Border radius scale
export const RADIUS = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
  '2xl': 'calc(var(--radius) + 8px)',
  full: '9999px',
} as const;

// Typography scale
export const TYPOGRAPHY = {
  xs: { size: '0.75rem', lineHeight: '1rem' },
  sm: { size: '0.875rem', lineHeight: '1.25rem' },
  base: { size: '1rem', lineHeight: '1.5rem' },
  lg: { size: '1.125rem', lineHeight: '1.75rem' },
  xl: { size: '1.25rem', lineHeight: '1.75rem' },
  '2xl': { size: '1.5rem', lineHeight: '2rem' },
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
  '5xl': { size: '3rem', lineHeight: '1' },
  '6xl': { size: '3.75rem', lineHeight: '1' },
} as const;

// Breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Z-index scale
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// Animation durations
export const ANIMATION = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Shadow presets
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// Common emoji categories for EmojiPicker
export const EMOJI_CATEGORIES = [
  { id: 'recent', name: 'Recent', icon: '🕐' },
  { id: 'smileys', name: 'Smileys & Emotion', icon: '😀' },
  { id: 'people', name: 'People & Body', icon: '👋' },
  { id: 'animals', name: 'Animals & Nature', icon: '🐱' },
  { id: 'food', name: 'Food & Drink', icon: '🍎' },
  { id: 'travel', name: 'Travel & Places', icon: '✈️' },
  { id: 'activities', name: 'Activities', icon: '⚽' },
  { id: 'objects', name: 'Objects', icon: '💡' },
  { id: 'symbols', name: 'Symbols', icon: '❤️' },
  { id: 'flags', name: 'Flags', icon: '🏁' },
] as const;

// Common reaction emojis
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🤔'] as const;

// Status variants for StatusTag component
export const STATUS_VARIANTS = {
  active: { label: 'Active', color: 'green' },
  inactive: { label: 'Inactive', color: 'gray' },
  pending: { label: 'Pending', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  draft: { label: 'Draft', color: 'gray' },
  published: { label: 'Published', color: 'blue' },
  archived: { label: 'Archived', color: 'gray' },
  processing: { label: 'Processing', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
} as const;

export type StatusVariant = keyof typeof STATUS_VARIANTS;
export type LabelColor = (typeof LABEL_COLORS)[number]['name'];
export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number]['id'];
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
