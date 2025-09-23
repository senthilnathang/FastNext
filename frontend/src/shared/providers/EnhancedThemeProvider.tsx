"use client"

import * as React from "react"
import { ThemeProvider as NextThemeProvider, type ThemeProviderProps } from "next-themes"

import { cn } from "@/shared/utils"

// Enhanced theme types
export type Theme = 'light' | 'dark' | 'system'
export type ColorScheme = 'default' | 'emerald' | 'rose' | 'violet' | 'orange' | 'slate' | 'blue' | 'purple' | 'crimson'

export interface ColorSchemeConfig {
  id: ColorScheme
  name: string
  description: string
  colors: {
    light: Record<string, string>
    dark: Record<string, string>
  }
  preview: {
    light: string
    dark: string
  }
}

const colorSchemes: ColorSchemeConfig[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern default theme',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.523 0.214 259.815)',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.961 0 0)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.961 0 0)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0 0)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0 0)',
        input: 'oklch(0.898 0 0)',
        ring: 'oklch(0.523 0.214 259.815)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.646 0.222 259.815)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0 0)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0 0)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0 0)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0 0)',
        input: 'oklch(0.212 0 0)',
        ring: 'oklch(0.646 0.222 259.815)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#3b82f6', dark: '#60a5fa' }
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green theme for nature lovers',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.548 0.166 160.613)',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.961 0.021 160.613)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.941 0.041 160.613)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0.021 160.613)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0.021 160.613)',
        input: 'oklch(0.898 0.021 160.613)',
        ring: 'oklch(0.548 0.166 160.613)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.646 0.166 160.613)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0.021 160.613)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0.021 160.613)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0.021 160.613)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0.021 160.613)',
        input: 'oklch(0.212 0.021 160.613)',
        ring: 'oklch(0.646 0.166 160.613)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#059669', dark: '#34d399' }
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Elegant pink theme with warm tones',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.631 0.204 16.756)',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.961 0.021 16.756)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.941 0.041 16.756)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0.021 16.756)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0.021 16.756)',
        input: 'oklch(0.898 0.021 16.756)',
        ring: 'oklch(0.631 0.204 16.756)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.731 0.204 16.756)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0.021 16.756)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0.021 16.756)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0.021 16.756)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0.021 16.756)',
        input: 'oklch(0.212 0.021 16.756)',
        ring: 'oklch(0.731 0.204 16.756)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#e11d48', dark: '#fb7185' }
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Creative purple theme for artists',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.569 0.214 286.078)',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.961 0.021 286.078)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.941 0.041 286.078)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0.021 286.078)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0.021 286.078)',
        input: 'oklch(0.898 0.021 286.078)',
        ring: 'oklch(0.569 0.214 286.078)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.669 0.214 286.078)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0.021 286.078)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0.021 286.078)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0.021 286.078)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0.021 286.078)',
        input: 'oklch(0.212 0.021 286.078)',
        ring: 'oklch(0.669 0.214 286.078)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#7c3aed', dark: '#a855f7' }
  },
  {
    id: 'orange',
    name: 'Orange',
    description: 'Energetic orange theme for productivity',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.646 0.222 41.116)',
        'primary-foreground': 'oklch(1 0 0)',
        secondary: 'oklch(0.961 0.021 41.116)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.941 0.041 41.116)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0.021 41.116)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0.021 41.116)',
        input: 'oklch(0.898 0.021 41.116)',
        ring: 'oklch(0.646 0.222 41.116)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.746 0.222 41.116)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0.021 41.116)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0.021 41.116)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0.021 41.116)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0.021 41.116)',
        input: 'oklch(0.212 0.021 41.116)',
        ring: 'oklch(0.746 0.222 41.116)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#ea580c', dark: '#fb923c' }
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Professional gray theme for business',
    colors: {
      light: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.398 0.021 221.463)',
        'primary-foreground': 'oklch(0.961 0 0)',
        secondary: 'oklch(0.961 0.021 221.463)',
        'secondary-foreground': 'oklch(0.145 0 0)',
        accent: 'oklch(0.941 0.041 221.463)',
        'accent-foreground': 'oklch(0.145 0 0)',
        muted: 'oklch(0.961 0.021 221.463)',
        'muted-foreground': 'oklch(0.533 0 0)',
        border: 'oklch(0.898 0.021 221.463)',
        input: 'oklch(0.898 0.021 221.463)',
        ring: 'oklch(0.398 0.021 221.463)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(1 0 0)',
      },
      dark: {
        background: 'oklch(0.145 0 0)',
        foreground: 'oklch(0.961 0 0)',
        primary: 'oklch(0.648 0.021 221.463)',
        'primary-foreground': 'oklch(0.145 0 0)',
        secondary: 'oklch(0.212 0.021 221.463)',
        'secondary-foreground': 'oklch(0.961 0 0)',
        accent: 'oklch(0.212 0.021 221.463)',
        'accent-foreground': 'oklch(0.961 0 0)',
        muted: 'oklch(0.212 0.021 221.463)',
        'muted-foreground': 'oklch(0.635 0 0)',
        border: 'oklch(0.212 0.021 221.463)',
        input: 'oklch(0.212 0.021 221.463)',
        ring: 'oklch(0.648 0.021 221.463)',
        card: 'oklch(0.145 0 0)',
        'card-foreground': 'oklch(0.961 0 0)',
        popover: 'oklch(0.145 0 0)',
        'popover-foreground': 'oklch(0.961 0 0)',
        destructive: 'oklch(0.576 0.204 17.38)',
        'destructive-foreground': 'oklch(0.961 0 0)',
      }
    },
    preview: { light: '#334155', dark: '#64748b' }
  }
]

interface ColorSchemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  availableSchemes: ColorSchemeConfig[]
  applyColorScheme: (scheme: ColorScheme) => void
}

const ColorSchemeContext = React.createContext<ColorSchemeContextType | undefined>(undefined)

export function useColorScheme() {
  const context = React.useContext(ColorSchemeContext)
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider')
  }
  return context
}

interface ColorSchemeProviderProps {
  children: React.ReactNode
  defaultScheme?: ColorScheme
  storageKey?: string
}

function ColorSchemeProvider({ 
  children, 
  defaultScheme = 'default',
  storageKey = 'color-scheme'
}: ColorSchemeProviderProps) {
  const [colorScheme, setColorSchemeState] = React.useState<ColorScheme>(defaultScheme)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(storageKey) as ColorScheme
    if (stored && colorSchemes.find(s => s.id === stored)) {
      setColorSchemeState(stored)
    }
  }, [storageKey])

  const applyColorScheme = React.useCallback((scheme: ColorScheme) => {
    const schemeConfig = colorSchemes.find(s => s.id === scheme)
    if (!schemeConfig) return

    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    const colors = isDark ? schemeConfig.colors.dark : schemeConfig.colors.light

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }, [])

  const setColorScheme = React.useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    localStorage.setItem(storageKey, scheme)
    applyColorScheme(scheme)
  }, [storageKey, applyColorScheme])

  React.useEffect(() => {
    if (mounted) {
      applyColorScheme(colorScheme)
    }
  }, [mounted, colorScheme, applyColorScheme])

  // Listen for theme changes to reapply color scheme
  React.useEffect(() => {
    if (!mounted) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          applyColorScheme(colorScheme)
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [mounted, colorScheme, applyColorScheme])

  const value = React.useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      availableSchemes: colorSchemes,
      applyColorScheme
    }),
    [colorScheme, setColorScheme, applyColorScheme]
  )

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  )
}

interface EnhancedThemeProviderProps extends Omit<ThemeProviderProps, 'children'> {
  defaultColorScheme?: ColorScheme
  colorSchemeStorageKey?: string
  children: React.ReactNode
  className?: string
}

export function EnhancedThemeProvider({ 
  children,
  defaultColorScheme,
  colorSchemeStorageKey,
  className,
  ...props 
}: EnhancedThemeProviderProps) {
  return (
    <NextThemeProvider {...props}>
      <ColorSchemeProvider 
        defaultScheme={defaultColorScheme}
        storageKey={colorSchemeStorageKey}
      >
        <div className={cn("min-h-screen bg-background font-sans antialiased", className)}>
          {children}
        </div>
      </ColorSchemeProvider>
    </NextThemeProvider>
  )
}

export { colorSchemes }
export default EnhancedThemeProvider