'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { useTheme } from 'next-themes';
import { cn } from '@/shared/utils/utils';

const themeToggleVariants = cva(
  "relative inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "",
        compact: "",
        pill: "rounded-full",
      },
      size: {
        sm: "h-8 w-8",
        default: "h-9 w-9", 
        lg: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ThemeToggleProps 
  extends Omit<React.ComponentProps<typeof Button>, 'size' | 'variant'>,
    VariantProps<typeof themeToggleVariants> {
  showLabels?: boolean;
  align?: 'start' | 'center' | 'end';
}

export function ThemeToggle({ 
  className, 
  variant = "default", 
  size = "default", 
  showLabels = true,
  align = "end",
  ...props 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(themeToggleVariants({ variant, size }), "px-0", className)}
          data-slot="theme-toggle"
          {...props}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} data-slot="theme-toggle-content">
        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
          <Sun className="mr-2 h-4 w-4" />
          {showLabels && <span>Light</span>}
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
          <Moon className="mr-2 h-4 w-4" />
          {showLabels && <span>Dark</span>}
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
          <Monitor className="mr-2 h-4 w-4" />
          {showLabels && <span>System</span>}
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface SimpleThemeToggleProps 
  extends Omit<React.ComponentProps<typeof Button>, 'onClick' | 'size' | 'variant'>,
    VariantProps<typeof themeToggleVariants> {
  cycle?: 'light-dark' | 'light-dark-system';
}

export function SimpleThemeToggle({ 
  className,
  variant = "default", 
  size = "default",
  cycle = 'light-dark-system',
  ...props 
}: SimpleThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (cycle === 'light-dark') {
      setTheme(theme === 'light' ? 'dark' : 'light');
    } else {
      if (theme === 'light') {
        setTheme('dark');
      } else if (theme === 'dark') {
        setTheme('system');
      } else {
        setTheme('light');
      }
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
      className={cn(themeToggleVariants({ variant, size }), className)}
      data-slot="simple-theme-toggle"
      {...props}
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}