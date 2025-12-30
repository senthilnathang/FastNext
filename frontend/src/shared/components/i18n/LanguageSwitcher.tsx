/**
 * Language Switcher Component
 *
 * Provides a dropdown for switching between available languages.
 * Includes flag icons and persists user preference.
 */

"use client";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/utils";
import type { LocaleCode } from "@/lib/i18n";

/**
 * Flag emoji mapping for locale codes
 */
const FLAG_EMOJIS: Record<string, string> = {
  us: "\u{1F1FA}\u{1F1F8}", // US flag
  gb: "\u{1F1EC}\u{1F1E7}", // GB flag
  es: "\u{1F1EA}\u{1F1F8}", // Spain flag
  fr: "\u{1F1EB}\u{1F1F7}", // France flag
  de: "\u{1F1E9}\u{1F1EA}", // Germany flag
  sa: "\u{1F1F8}\u{1F1E6}", // Saudi Arabia flag
  cn: "\u{1F1E8}\u{1F1F3}", // China flag
  jp: "\u{1F1EF}\u{1F1F5}", // Japan flag
  br: "\u{1F1E7}\u{1F1F7}", // Brazil flag
  it: "\u{1F1EE}\u{1F1F9}", // Italy flag
  pt: "\u{1F1F5}\u{1F1F9}", // Portugal flag
  ru: "\u{1F1F7}\u{1F1FA}", // Russia flag
  kr: "\u{1F1F0}\u{1F1F7}", // South Korea flag
  in: "\u{1F1EE}\u{1F1F3}", // India flag
  nl: "\u{1F1F3}\u{1F1F1}", // Netherlands flag
  pl: "\u{1F1F5}\u{1F1F1}", // Poland flag
  tr: "\u{1F1F9}\u{1F1F7}", // Turkey flag
};

/**
 * Get flag emoji for a locale
 */
function getFlag(flagCode: string): string {
  return FLAG_EMOJIS[flagCode.toLowerCase()] || "\u{1F310}"; // Globe emoji fallback
}

export interface LanguageSwitcherProps {
  /** Additional CSS classes */
  className?: string;
  /** Button variant */
  variant?: "default" | "ghost" | "outline";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show current language name */
  showLabel?: boolean;
  /** Alignment of dropdown */
  align?: "start" | "center" | "end";
  /** Side of dropdown */
  side?: "top" | "right" | "bottom" | "left";
  /** Callback when language changes */
  onLanguageChange?: (locale: LocaleCode) => void;
}

/**
 * Language Switcher Component
 *
 * Displays a dropdown menu for selecting the application language.
 * Shows flag icons and persists the user's preference to localStorage.
 */
export function LanguageSwitcher({
  className,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  align = "end",
  side = "bottom",
  onLanguageChange,
}: LanguageSwitcherProps) {
  const { locale, setLocale, supportedLocales, isCurrentLocale, t } =
    useTranslation();

  const currentLocale = React.useMemo(
    () => supportedLocales.find((l) => l.code === locale),
    [locale, supportedLocales]
  );

  const handleLocaleChange = React.useCallback(
    (newLocale: LocaleCode) => {
      setLocale(newLocale);
      onLanguageChange?.(newLocale);
    },
    [setLocale, onLanguageChange]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2", className)}
          aria-label={t("language.select")}
        >
          <span className="text-base" aria-hidden="true">
            {currentLocale ? getFlag(currentLocale.flag) : <Globe className="h-4 w-4" />}
          </span>
          {showLabel && currentLocale && (
            <span className="hidden sm:inline-block">{currentLocale.name}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-48">
        <DropdownMenuLabel>{t("language.select")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedLocales.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption.code}
            onClick={() => handleLocaleChange(localeOption.code)}
            className="cursor-pointer justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                {getFlag(localeOption.flag)}
              </span>
              <span>{localeOption.name}</span>
            </span>
            {isCurrentLocale(localeOption.code) && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact Language Switcher
 *
 * A smaller version that only shows the flag icon.
 */
export function LanguageSwitcherCompact({
  className,
  onLanguageChange,
}: Pick<LanguageSwitcherProps, "className" | "onLanguageChange">) {
  return (
    <LanguageSwitcher
      className={className}
      variant="ghost"
      size="sm"
      showLabel={false}
      onLanguageChange={onLanguageChange}
    />
  );
}

/**
 * Language Switcher with Label
 *
 * A version that shows both the flag and language name.
 */
export function LanguageSwitcherWithLabel({
  className,
  onLanguageChange,
}: Pick<LanguageSwitcherProps, "className" | "onLanguageChange">) {
  return (
    <LanguageSwitcher
      className={className}
      variant="outline"
      size="default"
      showLabel
      onLanguageChange={onLanguageChange}
    />
  );
}

/**
 * Inline Language Selector
 *
 * A non-dropdown version for settings pages.
 */
export function LanguageSelector({
  className,
  onLanguageChange,
}: Pick<LanguageSwitcherProps, "className" | "onLanguageChange">) {
  const { locale, setLocale, supportedLocales, t } = useTranslation();

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLocale = e.target.value as LocaleCode;
      setLocale(newLocale);
      onLanguageChange?.(newLocale);
    },
    [setLocale, onLanguageChange]
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={handleChange}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t("language.select")}
      >
        {supportedLocales.map((localeOption) => (
          <option key={localeOption.code} value={localeOption.code}>
            {getFlag(localeOption.flag)} {localeOption.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSwitcher;
