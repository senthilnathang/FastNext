"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Separator } from "@/shared/components/ui/separator";
import {
  type ColorScheme,
  useColorScheme,
} from "@/shared/providers/EnhancedThemeProvider";
import { cn } from "@/shared/utils";

const themes = [
  {
    name: "light",
    label: "Light",
    icon: Sun,
    description: "Clean and bright interface",
  },
  {
    name: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes",
  },
  {
    name: "system",
    label: "System",
    icon: Monitor,
    description: "Follow system preference",
  },
] as const;

interface ThemeSwitcherProps {
  variant?: "dropdown" | "inline" | "compact";
  showColorSchemes?: boolean;
  className?: string;
}

interface ColorSchemePreviewProps {
  scheme: ColorScheme;
  isSelected: boolean;
  onClick: () => void;
  currentTheme: string | undefined;
}

function ColorSchemePreview({
  scheme,
  isSelected,
  onClick,
  currentTheme,
}: ColorSchemePreviewProps) {
  const { availableSchemes } = useColorScheme();
  const schemeConfig = availableSchemes.find((s) => s.id === scheme);

  if (!schemeConfig) return null;

  const previewColor =
    currentTheme === "dark"
      ? schemeConfig.preview.dark
      : schemeConfig.preview.light;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all duration-200",
        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/60",
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className="w-10 h-10 rounded-full shadow-sm border-2 border-background"
        style={{ backgroundColor: previewColor }}
      />
      <div className="text-center">
        <p className="text-xs font-medium">{schemeConfig.name}</p>
      </div>
      {isSelected && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
        >
          <Check className="w-3 h-3" />
        </motion.div>
      )}
    </motion.button>
  );
}

function InlineThemeSwitcher({
  showColorSchemes = true,
  className,
}: {
  showColorSchemes?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme, availableSchemes } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="h-12 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  const isDarkMode = theme === "dark";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Theme Mode Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Appearance</h4>
          <Badge variant="secondary" className="text-xs">
            {theme}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.name;

            return (
              <motion.button
                key={themeOption.name}
                onClick={() => setTheme(themeOption.name)}
                className={cn(
                  "flex flex-col items-center space-y-2 p-3 rounded-lg border transition-all duration-200",
                  "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-border/60",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{themeOption.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {showColorSchemes && (
        <>
          <Separator />

          {/* Color Scheme Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Color Scheme</h4>
              {!isDarkMode ? (
                <Badge variant="secondary" className="text-xs">
                  {availableSchemes.find((s) => s.id === colorScheme)?.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Disabled
                </Badge>
              )}
            </div>

            {!isDarkMode ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSchemes.map((scheme) => (
                  <ColorSchemePreview
                    key={scheme.id}
                    scheme={scheme.id}
                    isSelected={colorScheme === scheme.id}
                    onClick={() => setColorScheme(scheme.id)}
                    currentTheme={theme}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-border">
                <p className="text-xs text-muted-foreground text-center">
                  🌙 Color schemes are only available in light mode.
                  <br />
                  Dark mode uses a consistent default palette.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownThemeSwitcher({
  showColorSchemes = true,
  className,
}: {
  showColorSchemes?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme, availableSchemes } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-8 h-8 p-0", className)}
      >
        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
      </Button>
    );
  }

  const currentTheme = themes.find((t) => t.name === theme);
  const Icon = currentTheme?.icon || Monitor;
  const isDarkMode = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 px-2 gap-1", className)}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Appearance</DropdownMenuLabel>
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.name;

          return (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => setTheme(themeOption.name)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{themeOption.label}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {themeOption.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}

        {showColorSchemes && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
              Color Scheme
            </DropdownMenuLabel>
            <div className="p-2">
              {!isDarkMode ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSchemes.slice(0, 6).map((scheme) => (
                      <ColorSchemePreview
                        key={scheme.id}
                        scheme={scheme.id}
                        isSelected={colorScheme === scheme.id}
                        onClick={() => setColorScheme(scheme.id)}
                        currentTheme={theme}
                      />
                    ))}
                  </div>
                  {availableSchemes.length > 6 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        +{availableSchemes.length - 6} more schemes
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    🌙 Color schemes only work in light mode
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CompactThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-8 h-8 p-0", className)}
      >
        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
      </Button>
    );
  }

  const currentTheme = themes.find((t) => t.name === theme);
  const Icon = currentTheme?.icon || Monitor;

  const handleToggle = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={cn("h-8 w-8 p-0", className)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeSwitcher({
  variant = "dropdown",
  showColorSchemes = true,
  className,
}: ThemeSwitcherProps) {
  switch (variant) {
    case "inline":
      return (
        <InlineThemeSwitcher
          showColorSchemes={showColorSchemes}
          className={className}
        />
      );
    case "compact":
      return <CompactThemeSwitcher className={className} />;
    default:
      return (
        <DropdownThemeSwitcher
          showColorSchemes={showColorSchemes}
          className={className}
        />
      );
  }
}

export default ThemeSwitcher;
