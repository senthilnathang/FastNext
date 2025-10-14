"use client";

import {
  Check,
  Download,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/utils";

interface ColorScheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  preview: {
    light: string;
    dark: string;
  };
}

interface ThemeCustomizerProps {
  className?: string;
  compact?: boolean;
}

const predefinedSchemes: ColorScheme[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean and modern default theme",
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 98%)",
      accent: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(210, 40%, 96%)",
      border: "hsl(214, 32%, 91%)",
    },
    preview: { light: "#3b82f6", dark: "#1e40af" },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Fresh green theme for nature lovers",
    colors: {
      primary: "hsl(142, 76%, 36%)",
      secondary: "hsl(138, 76%, 97%)",
      accent: "hsl(138, 76%, 94%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(138, 76%, 94%)",
      border: "hsl(138, 62%, 85%)",
    },
    preview: { light: "#059669", dark: "#065f46" },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Elegant pink theme with warm tones",
    colors: {
      primary: "hsl(330, 81%, 60%)",
      secondary: "hsl(330, 81%, 98%)",
      accent: "hsl(330, 81%, 95%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(330, 81%, 95%)",
      border: "hsl(330, 67%, 87%)",
    },
    preview: { light: "#e11d48", dark: "#be123c" },
  },
  {
    id: "violet",
    name: "Violet",
    description: "Creative purple theme for artists",
    colors: {
      primary: "hsl(262, 83%, 58%)",
      secondary: "hsl(262, 83%, 98%)",
      accent: "hsl(262, 83%, 95%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(262, 83%, 95%)",
      border: "hsl(262, 69%, 87%)",
    },
    preview: { light: "#7c3aed", dark: "#5b21b6" },
  },
  {
    id: "orange",
    name: "Orange",
    description: "Energetic orange theme for productivity",
    colors: {
      primary: "hsl(24, 95%, 53%)",
      secondary: "hsl(24, 95%, 98%)",
      accent: "hsl(24, 95%, 95%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(24, 95%, 95%)",
      border: "hsl(24, 81%, 87%)",
    },
    preview: { light: "#ea580c", dark: "#c2410c" },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Professional gray theme for business",
    colors: {
      primary: "hsl(215, 28%, 17%)",
      secondary: "hsl(210, 40%, 98%)",
      accent: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 5%)",
      muted: "hsl(210, 40%, 96%)",
      border: "hsl(214, 32%, 91%)",
    },
    preview: { light: "#334155", dark: "#1e293b" },
  },
];

function ColorPreview({
  scheme,
  isSelected,
  onClick,
}: {
  scheme: ColorScheme;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const previewColor =
    theme === "dark" ? scheme.preview.dark : scheme.preview.light;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
      )}
    >
      <div
        className="w-12 h-12 rounded-full shadow-md border-2 border-white dark:border-gray-800"
        style={{ backgroundColor: previewColor }}
      />
      <div className="text-center">
        <p className="text-sm font-medium">{scheme.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {scheme.description}
        </p>
      </div>
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}
    </button>
  );
}

function ThemeModeSelector() {
  const { theme, setTheme } = useTheme();

  const modes = [
    { id: "light", name: "Light", icon: Sun },
    { id: "dark", name: "Dark", icon: Moon },
    { id: "system", name: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Appearance</Label>
      <div className="flex space-x-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = theme === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => setTheme(mode.id)}
              className={cn(
                "flex-1 flex flex-col items-center space-y-2 p-3 rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{mode.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeCustomizer({
  className,
  compact = false,
}: ThemeCustomizerProps) {
  const [selectedScheme, setSelectedScheme] = React.useState("default");
  const [customSchemes, setCustomSchemes] = React.useState<ColorScheme[]>([]);

  // Load saved custom schemes from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom-color-schemes");
      if (saved) {
        try {
          setCustomSchemes(JSON.parse(saved));
        } catch (error) {
          console.error("Failed to load custom color schemes:", error);
        }
      }

      const savedScheme = localStorage.getItem("selected-color-scheme");
      if (savedScheme) {
        setSelectedScheme(savedScheme);
      }
    }
  }, []);

  // Apply color scheme
  const applyColorScheme = React.useCallback((scheme: ColorScheme) => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      Object.entries(scheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      localStorage.setItem("selected-color-scheme", scheme.id);
      setSelectedScheme(scheme.id);
    }
  }, []);

  const exportSchemes = () => {
    const data = {
      predefined: predefinedSchemes,
      custom: customSchemes,
      selected: selectedScheme,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme-schemes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToDefault = () => {
    const defaultScheme = predefinedSchemes.find((s) => s.id === "default");
    if (defaultScheme) {
      applyColorScheme(defaultScheme);
    }
  };

  const allSchemes = [...predefinedSchemes, ...customSchemes];

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Theme</DialogTitle>
            <DialogDescription>
              Choose a color scheme and appearance mode for your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <ThemeModeSelector />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Color Schemes</Label>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={exportSchemes}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetToDefault}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {allSchemes.map((scheme) => (
                  <ColorPreview
                    key={scheme.id}
                    scheme={scheme}
                    isSelected={selectedScheme === scheme.id}
                    onClick={() => applyColorScheme(scheme)}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Palette className="h-5 w-5 mr-2" />
            Theme Customizer
          </CardTitle>
          <Badge variant="secondary">{allSchemes.length} schemes</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ThemeModeSelector />

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Color Schemes</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportSchemes}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Schemes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {allSchemes.map((scheme) => (
              <ColorPreview
                key={scheme.id}
                scheme={scheme}
                isSelected={selectedScheme === scheme.id}
                onClick={() => applyColorScheme(scheme)}
              />
            ))}
          </div>
        </div>

        {customSchemes.length > 0 && (
          <>
            <Separator />
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {customSchemes.length} custom scheme
                {customSchemes.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ThemeCustomizer;
