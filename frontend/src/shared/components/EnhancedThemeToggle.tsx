'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react';
import { Button } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/shared/components/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn } from '@/shared/utils';

const themes = [
  {
    name: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Light and clean interface',
    preview: 'bg-white border-gray-200'
  },
  {
    name: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Dark mode for low-light environments',
    preview: 'bg-gray-900 border-gray-700'
  },
  {
    name: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Adapts to your system preference',
    preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400'
  }
] as const;

interface ThemePreviewProps {
  theme: typeof themes[number];
  isActive: boolean;
  onClick: () => void;
}

function ThemePreview({ theme, isActive, onClick }: ThemePreviewProps) {
  const Icon = theme.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full p-3 rounded-lg border-2 transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20',
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      <div className="flex items-center space-x-3">
        <div className={cn(
          'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
          theme.preview
        )}>
          <Icon className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'
          )} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between">
            <span className={cn(
              'font-medium transition-colors',
              isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
            )}>
              {theme.label}
            </span>
            {isActive && (
              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {theme.description}
          </p>
        </div>
      </div>
    </button>
  );
}

export function EnhancedThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
        <div className="h-[1.2rem] w-[1.2rem] rounded-full bg-gray-200 animate-pulse" />
      </Button>
    );
  }

  const currentTheme = themes.find(t => t.name === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 w-8 px-0 transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "focus:ring-2 focus:ring-blue-500/20"
          )}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="flex items-center space-x-2 px-2 py-1.5">
          <Palette className="h-4 w-4" />
          <span>Choose Theme</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="space-y-1">
          {themes.map((themeOption) => (
            <ThemePreview
              key={themeOption.name}
              theme={themeOption}
              isActive={theme === themeOption.name}
              onClick={() => setTheme(themeOption.name)}
            />
          ))}
        </div>

        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current: <span className="font-medium">{currentTheme.label}</span>
            {theme === 'system' && resolvedTheme && (
              <span className="ml-1">({resolvedTheme})</span>
            )}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CompactThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
      </Button>
    );
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-5 w-5" />;
    }
    return resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  const getTooltip = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return theme === 'dark' ? 'Dark mode' : 'Light mode';
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      title={getTooltip()}
      className={cn(
        "transition-all duration-200 hover:scale-110",
        "focus:ring-2 focus:ring-blue-500/20"
      )}
    >
      <div className="transition-transform duration-300 hover:rotate-12">
        {getIcon()}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// Inline theme indicator for status bars
export function ThemeIndicator() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = themes.find(t => t.name === theme) || themes[0];
  const Icon = currentTheme.icon;

  return (
    <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
      <Icon className="h-3 w-3" />
      <span className="capitalize">
        {theme === 'system' ? `System (${resolvedTheme})` : theme}
      </span>
    </div>
  );
}