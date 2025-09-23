/**
 * Theme utilities for color manipulation and management
 * Inspired by achromatic-pro patterns with OKLCH color space support
 */

export type ColorFormat = 'oklch' | 'hsl' | 'rgb' | 'hex'

export interface OklchColor {
  l: number // lightness (0-1)
  c: number // chroma (0-0.4)
  h: number // hue (0-360)
  alpha?: number // alpha (0-1)
}

export interface ColorToken {
  name: string
  value: string
  description?: string
}

/**
 * Parse OKLCH color string to components
 */
export function parseOklch(oklchString: string): OklchColor | null {
  const match = oklchString.match(/oklch\(([^)]+)\)/)
  if (!match) return null

  const values = match[1].split(/\s+/)
  if (values.length < 3) return null

  return {
    l: parseFloat(values[0]),
    c: parseFloat(values[1]),
    h: parseFloat(values[2]),
    alpha: values[3] ? parseFloat(values[3]) : undefined
  }
}

/**
 * Create OKLCH color string from components
 */
export function createOklch(color: OklchColor): string {
  const { l, c, h, alpha } = color
  if (alpha !== undefined) {
    return `oklch(${l} ${c} ${h} / ${alpha})`
  }
  return `oklch(${l} ${c} ${h})`
}

/**
 * Adjust lightness of an OKLCH color
 */
export function adjustLightness(oklchString: string, adjustment: number): string {
  const color = parseOklch(oklchString)
  if (!color) return oklchString

  const newLightness = Math.max(0, Math.min(1, color.l + adjustment))
  return createOklch({ ...color, l: newLightness })
}

/**
 * Adjust chroma (saturation) of an OKLCH color
 */
export function adjustChroma(oklchString: string, adjustment: number): string {
  const color = parseOklch(oklchString)
  if (!color) return oklchString

  const newChroma = Math.max(0, Math.min(0.4, color.c + adjustment))
  return createOklch({ ...color, c: newChroma })
}

/**
 * Adjust hue of an OKLCH color
 */
export function adjustHue(oklchString: string, adjustment: number): string {
  const color = parseOklch(oklchString)
  if (!color) return oklchString

  let newHue = (color.h + adjustment) % 360
  if (newHue < 0) newHue += 360
  return createOklch({ ...color, h: newHue })
}

/**
 * Create a color variant with opacity
 */
export function withOpacity(oklchString: string, opacity: number): string {
  const color = parseOklch(oklchString)
  if (!color) return oklchString

  return createOklch({ ...color, alpha: Math.max(0, Math.min(1, opacity)) })
}

/**
 * Generate color variants for a given base color
 */
export function generateColorVariants(baseColor: string): Record<string, string> {
  return {
    50: adjustLightness(baseColor, 0.45),
    100: adjustLightness(baseColor, 0.35),
    200: adjustLightness(baseColor, 0.25),
    300: adjustLightness(baseColor, 0.15),
    400: adjustLightness(baseColor, 0.05),
    500: baseColor,
    600: adjustLightness(baseColor, -0.05),
    700: adjustLightness(baseColor, -0.15),
    800: adjustLightness(baseColor, -0.25),
    900: adjustLightness(baseColor, -0.35),
    950: adjustLightness(baseColor, -0.45),
  }
}

/**
 * Get appropriate foreground color for a background
 */
export function getForegroundColor(backgroundColor: string, lightForeground = 'oklch(0.961 0 0)', darkForeground = 'oklch(0.145 0 0)'): string {
  const color = parseOklch(backgroundColor)
  if (!color) return darkForeground

  // Use lightness to determine if we need light or dark foreground
  return color.l > 0.5 ? darkForeground : lightForeground
}

/**
 * Create complementary color (opposite on color wheel)
 */
export function getComplementaryColor(oklchString: string): string {
  const color = parseOklch(oklchString)
  if (!color) return oklchString

  const complementaryHue = (color.h + 180) % 360
  return createOklch({ ...color, h: complementaryHue })
}

/**
 * Create triadic colors (120 degrees apart)
 */
export function getTriadicColors(oklchString: string): [string, string] {
  const color = parseOklch(oklchString)
  if (!color) return [oklchString, oklchString]

  const triad1 = createOklch({ ...color, h: (color.h + 120) % 360 })
  const triad2 = createOklch({ ...color, h: (color.h + 240) % 360 })
  
  return [triad1, triad2]
}

/**
 * Create analogous colors (adjacent on color wheel)
 */
export function getAnalogousColors(oklchString: string, spread = 30): [string, string] {
  const color = parseOklch(oklchString)
  if (!color) return [oklchString, oklchString]

  const analogous1 = createOklch({ ...color, h: (color.h + spread) % 360 })
  const analogous2 = createOklch({ ...color, h: (color.h - spread + 360) % 360 })
  
  return [analogous1, analogous2]
}

/**
 * Apply theme colors to CSS custom properties
 */
export function applyThemeColors(colors: Record<string, string>, root: HTMLElement = document.documentElement): void {
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

/**
 * Remove theme colors from CSS custom properties
 */
export function removeThemeColors(colorKeys: string[], root: HTMLElement = document.documentElement): void {
  colorKeys.forEach(key => {
    root.style.removeProperty(`--${key}`)
  })
}

/**
 * Get computed CSS custom property value
 */
export function getCssVariable(variableName: string, root: HTMLElement = document.documentElement): string {
  return getComputedStyle(root).getPropertyValue(`--${variableName}`).trim()
}

/**
 * Convert hex to OKLCH (approximate conversion)
 */
export function hexToOklch(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255
  
  // Simple approximation to OKLCH
  // This is a basic conversion - for production use, consider a proper color conversion library
  const l = (r + g + b) / 3
  const c = Math.sqrt((r - l) ** 2 + (g - l) ** 2 + (b - l) ** 2) / Math.sqrt(3)
  const h = Math.atan2(g - b, r - g) * 180 / Math.PI
  
  return createOklch({
    l: Math.max(0, Math.min(1, l)),
    c: Math.max(0, Math.min(0.4, c)),
    h: h < 0 ? h + 360 : h
  })
}

/**
 * Predefined semantic color tokens for consistency
 */
export const semanticColorTokens = {
  // Core tokens
  background: '--background',
  foreground: '--foreground',
  
  // Brand tokens
  primary: '--primary',
  'primary-foreground': '--primary-foreground',
  secondary: '--secondary',
  'secondary-foreground': '--secondary-foreground',
  
  // UI tokens
  accent: '--accent',
  'accent-foreground': '--accent-foreground',
  muted: '--muted',
  'muted-foreground': '--muted-foreground',
  
  // Border and input tokens
  border: '--border',
  input: '--input',
  ring: '--ring',
  
  // Surface tokens
  card: '--card',
  'card-foreground': '--card-foreground',
  popover: '--popover',
  'popover-foreground': '--popover-foreground',
  
  // Status tokens
  destructive: '--destructive',
  'destructive-foreground': '--destructive-foreground',
  
  // Component-specific tokens
  sidebar: '--sidebar',
  'sidebar-foreground': '--sidebar-foreground',
  'sidebar-primary': '--sidebar-primary',
  'sidebar-accent': '--sidebar-accent',
  
  // Chart tokens
  'chart-1': '--chart-1',
  'chart-2': '--chart-2',
  'chart-3': '--chart-3',
  'chart-4': '--chart-4',
  'chart-5': '--chart-5',
} as const

/**
 * Helper to get semantic token value
 */
export function getSemanticColor(token: keyof typeof semanticColorTokens): string {
  return getCssVariable(semanticColorTokens[token].replace('--', ''))
}

/**
 * Create a complete theme object from a primary color
 */
export function createThemeFromPrimary(primaryColor: string): Record<string, string> {
  const variants = generateColorVariants(primaryColor)
  const complementary = getComplementaryColor(primaryColor)
  const [analogous1] = getAnalogousColors(primaryColor)
  
  return {
    // Core colors
    primary: variants[500],
    'primary-foreground': getForegroundColor(variants[500]),
    
    // Secondary from complementary
    secondary: adjustLightness(complementary, 0.4),
    'secondary-foreground': getForegroundColor(adjustLightness(complementary, 0.4)),
    
    // Accent from analogous
    accent: adjustLightness(analogous1, 0.3),
    'accent-foreground': getForegroundColor(adjustLightness(analogous1, 0.3)),
    
    // Muted from desaturated primary
    muted: adjustChroma(adjustLightness(primaryColor, 0.4), -0.1),
    'muted-foreground': getForegroundColor(adjustChroma(adjustLightness(primaryColor, 0.4), -0.1)),
    
    // UI elements
    border: adjustLightness(primaryColor, 0.5),
    input: adjustLightness(primaryColor, 0.5),
    ring: variants[500],
    
    // Status colors
    destructive: 'oklch(0.576 0.204 17.38)',
    'destructive-foreground': 'oklch(1 0 0)',
  }
}