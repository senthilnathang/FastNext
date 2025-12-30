"use client";

import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

// Storage key for persisting company selection
const COMPANY_STORAGE_KEY = "fastnext_selected_company";

// Custom event name for company changes
const COMPANY_CHANGE_EVENT = "companySwitched";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CompanySwitcherProps {
  companies: Company[];
  defaultCompanyId?: string;
  onCompanyChange?: (company: Company) => void;
  onAddCompany?: () => void;
  showAddButton?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Get initials from company name
 */
function getCompanyInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get the currently selected company ID from localStorage
 */
export function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COMPANY_STORAGE_KEY);
}

/**
 * Emit a custom event when company changes
 */
function emitCompanyChangeEvent(company: Company): void {
  if (typeof window === "undefined") return;
  const event = new CustomEvent(COMPANY_CHANGE_EVENT, {
    detail: { company },
    bubbles: true,
  });
  window.dispatchEvent(event);
}

/**
 * Hook to subscribe to company change events
 */
export function useCompanyChange(
  callback: (company: Company) => void
): void {
  useEffect(() => {
    const handler = (event: CustomEvent<{ company: Company }>) => {
      callback(event.detail.company);
    };

    window.addEventListener(
      COMPANY_CHANGE_EVENT,
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        COMPANY_CHANGE_EVENT,
        handler as EventListener
      );
    };
  }, [callback]);
}

const sizeVariants = {
  sm: {
    trigger: "h-8 px-2 text-sm",
    avatar: "h-5 w-5",
    content: "w-56",
    item: "h-9",
    itemAvatar: "h-6 w-6",
  },
  md: {
    trigger: "h-10 px-3 text-sm",
    avatar: "h-6 w-6",
    content: "w-64",
    item: "h-10",
    itemAvatar: "h-7 w-7",
  },
  lg: {
    trigger: "h-12 px-4 text-base",
    avatar: "h-8 w-8",
    content: "w-72",
    item: "h-12",
    itemAvatar: "h-8 w-8",
  },
};

export function CompanySwitcher({
  companies,
  defaultCompanyId,
  onCompanyChange,
  onAddCompany,
  showAddButton = false,
  disabled = false,
  className,
  size = "md",
}: CompanySwitcherProps) {
  const [open, setOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const sizeClasses = sizeVariants[size];

  // Initialize selected company from localStorage or default
  useEffect(() => {
    const storedId = getStoredCompanyId();
    const initialCompanyId = storedId || defaultCompanyId;

    if (initialCompanyId) {
      const company = companies.find((c) => c.id === initialCompanyId);
      if (company) {
        setSelectedCompany(company);
        return;
      }
    }

    // Fall back to first company or default company
    const defaultCompany =
      companies.find((c) => c.isDefault) || companies[0];
    if (defaultCompany) {
      setSelectedCompany(defaultCompany);
      localStorage.setItem(COMPANY_STORAGE_KEY, defaultCompany.id);
    }
  }, [companies, defaultCompanyId]);

  const handleSelect = useCallback(
    (company: Company) => {
      setSelectedCompany(company);
      setOpen(false);

      // Persist to localStorage
      localStorage.setItem(COMPANY_STORAGE_KEY, company.id);

      // Emit custom event
      emitCompanyChangeEvent(company);

      // Call callback if provided
      onCompanyChange?.(company);
    },
    [onCompanyChange]
  );

  const handleAddCompany = useCallback(() => {
    setOpen(false);
    onAddCompany?.();
  }, [onAddCompany]);

  if (companies.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select company"
          disabled={disabled}
          className={cn(
            "justify-between gap-2 font-normal",
            sizeClasses.trigger,
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedCompany ? (
              <>
                <Avatar className={cn("shrink-0", sizeClasses.avatar)}>
                  {selectedCompany.logo ? (
                    <AvatarImage
                      src={selectedCompany.logo}
                      alt={selectedCompany.name}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getCompanyInitials(selectedCompany.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedCompany.name}</span>
              </>
            ) : (
              <>
                <Building2
                  className={cn("shrink-0 opacity-50", sizeClasses.avatar)}
                />
                <span className="text-muted-foreground">Select company</span>
              </>
            )}
          </div>
          <ChevronDown
            className={cn(
              "shrink-0 opacity-50 transition-transform duration-200",
              open && "rotate-180"
            )}
            size={16}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", sizeClasses.content)}
        align="start"
        sideOffset={4}
      >
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium">Switch Company</p>
          <p className="text-xs text-muted-foreground">
            Select the company to work with
          </p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelect(company)}
                className={cn(
                  "flex items-center gap-3 w-full px-2 rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:bg-accent focus:text-accent-foreground",
                  selectedCompany?.id === company.id && "bg-accent",
                  sizeClasses.item
                )}
              >
                <Avatar className={cn("shrink-0", sizeClasses.itemAvatar)}>
                  {company.logo ? (
                    <AvatarImage src={company.logo} alt={company.name} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getCompanyInitials(company.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{company.name}</p>
                  {company.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {company.description}
                    </p>
                  )}
                </div>
                {selectedCompany?.id === company.id && (
                  <Check className="shrink-0 h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        {showAddButton && onAddCompany && (
          <>
            <Separator />
            <div className="p-1">
              <button
                onClick={handleAddCompany}
                className={cn(
                  "flex items-center gap-2 w-full px-2 rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:bg-accent focus:text-accent-foreground",
                  "text-muted-foreground",
                  sizeClasses.item
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add new company</span>
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default CompanySwitcher;
