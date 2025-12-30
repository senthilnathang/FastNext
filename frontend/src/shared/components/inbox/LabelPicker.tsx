"use client";

/**
 * LabelPicker Component
 *
 * A label selection component with color picker, create new label,
 * multi-select support, and search/filter functionality.
 */

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, Plus, Search, Tag, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/utils";

// Predefined label colors
export const LABEL_COLORS = [
  { name: "Red", value: "#ef4444", bg: "bg-red-500", text: "text-red-500" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500", text: "text-orange-500" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-500", text: "text-amber-500" },
  { name: "Yellow", value: "#eab308", bg: "bg-yellow-500", text: "text-yellow-500" },
  { name: "Lime", value: "#84cc16", bg: "bg-lime-500", text: "text-lime-500" },
  { name: "Green", value: "#22c55e", bg: "bg-green-500", text: "text-green-500" },
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-500", text: "text-emerald-500" },
  { name: "Teal", value: "#14b8a6", bg: "bg-teal-500", text: "text-teal-500" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-500", text: "text-cyan-500" },
  { name: "Sky", value: "#0ea5e9", bg: "bg-sky-500", text: "text-sky-500" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500", text: "text-blue-500" },
  { name: "Indigo", value: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-500" },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-500", text: "text-violet-500" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-500", text: "text-purple-500" },
  { name: "Fuchsia", value: "#d946ef", bg: "bg-fuchsia-500", text: "text-fuchsia-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500", text: "text-pink-500" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-500", text: "text-rose-500" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-500", text: "text-gray-500" },
] as const;

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface LabelPickerProps {
  /** Available labels to select from */
  labels: Label[];
  /** Currently selected label IDs */
  selectedIds?: string[];
  /** Whether multiple labels can be selected */
  multiSelect?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback when a new label is created */
  onCreateLabel?: (label: Omit<Label, "id">) => void;
  /** Whether to allow creating new labels */
  allowCreate?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Trigger element */
  trigger?: React.ReactNode;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Popover alignment */
  align?: "start" | "center" | "end";
  /** Popover side */
  side?: "top" | "right" | "bottom" | "left";
}

export function LabelPicker({
  labels,
  selectedIds = [],
  multiSelect = true,
  onSelectionChange,
  onCreateLabel,
  allowCreate = true,
  searchPlaceholder = "Search labels...",
  trigger,
  disabled = false,
  className,
  align = "start",
  side = "bottom",
}: LabelPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [newLabelName, setNewLabelName] = React.useState("");
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[10].value);

  // Filter labels based on search query
  const filteredLabels = React.useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter(
      (label) =>
        label.name.toLowerCase().includes(query) ||
        label.description?.toLowerCase().includes(query)
    );
  }, [labels, searchQuery]);

  // Check if a label is selected
  const isSelected = React.useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  // Handle label toggle
  const handleToggle = React.useCallback(
    (id: string) => {
      if (multiSelect) {
        const newSelection = isSelected(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id];
        onSelectionChange?.(newSelection);
      } else {
        onSelectionChange?.(isSelected(id) ? [] : [id]);
        setOpen(false);
      }
    },
    [multiSelect, isSelected, selectedIds, onSelectionChange]
  );

  // Handle create new label
  const handleCreateLabel = React.useCallback(() => {
    if (!newLabelName.trim()) return;

    onCreateLabel?.({
      name: newLabelName.trim(),
      color: newLabelColor,
    });

    setNewLabelName("");
    setNewLabelColor(LABEL_COLORS[10].value);
    setIsCreating(false);
  }, [newLabelName, newLabelColor, onCreateLabel]);

  // Reset state when popover closes
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      setIsCreating(false);
      setNewLabelName("");
    }
  }, []);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
            disabled={disabled}
          >
            <Tag className="h-4 w-4" />
            <span>Labels</span>
            {selectedIds.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {selectedIds.length}
              </span>
            )}
          </Button>
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={4}
          className={cn(
            "z-50 w-72 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* Search input */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>

          {/* Labels list */}
          <ScrollArea className="max-h-[250px]">
            <div className="p-2">
              {filteredLabels.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No labels found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLabels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => handleToggle(label.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected(label.id) && "bg-accent"
                      )}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 truncate text-left">{label.name}</span>
                      {isSelected(label.id) && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Create new label section */}
          {allowCreate && onCreateLabel && (
            <div className="border-t p-2">
              {isCreating ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-8"
                    autoFocus
                  />

                  {/* Color picker */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Choose a color</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewLabelColor(color.value)}
                          className={cn(
                            "h-5 w-5 rounded-full transition-transform hover:scale-110",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            newLabelColor === color.value &&
                              "ring-2 ring-ring ring-offset-2"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim()}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    "text-muted-foreground transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create new label</span>
                </button>
              )}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export default LabelPicker;
