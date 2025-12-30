"use client";

import React, { useState, useCallback } from "react";
import {
  Save,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Star,
  StarOff,
  Edit2,
  Check,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils";
import { FilterPresetsProps, FilterPreset } from "./types";

interface PresetItemProps {
  preset: FilterPreset;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
  onSetDefault?: () => void;
}

const PresetItem: React.FC<PresetItemProps> = ({
  preset,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onSetDefault,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(preset.name);
  }, [preset.name]);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim() && editName !== preset.name) {
      onRename?.(editName.trim());
    }
    setIsEditing(false);
  }, [editName, preset.name, onRename]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditName(preset.name);
  }, [preset.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete]
  );

  const handleSetDefault = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSetDefault?.();
    },
    [onSetDefault]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted"
      )}
      onClick={onSelect}
    >
      {/* Active indicator */}
      {isActive ? (
        <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-primary" />
      ) : (
        <Bookmark className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}

      {/* Name (editable) */}
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSaveEdit}
            className="h-7 w-7"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCancelEdit}
            className="h-7 w-7"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium truncate">{preset.name}</span>
              {preset.isDefault && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            {preset.description && (
              <p className="text-xs text-muted-foreground truncate">
                {preset.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSetDefault && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSetDefault}
                className="h-7 w-7"
                title={preset.isDefault ? "Remove default" : "Set as default"}
              >
                {preset.isDefault ? (
                  <StarOff className="h-3 w-3" />
                ) : (
                  <Star className="h-3 w-3" />
                )}
              </Button>
            )}
            {onRename && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleStartEdit}
                className="h-7 w-7"
                title="Rename"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="h-7 w-7 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  presets,
  activePresetId,
  onSelect,
  onSave,
  onDelete,
  onRename,
  onSetDefault,
  saving = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get active preset
  const activePreset = presets.find((p) => p.id === activePresetId);

  // Handle save
  const handleSave = useCallback(() => {
    if (newPresetName.trim()) {
      onSave(newPresetName.trim(), newPresetDescription.trim() || undefined);
      setNewPresetName("");
      setNewPresetDescription("");
      setShowSaveDialog(false);
    }
  }, [newPresetName, newPresetDescription, onSave]);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDelete]);

  // Handle preset selection
  const handleSelect = useCallback(
    (preset: FilterPreset) => {
      onSelect(preset);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Presets dropdown */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">
                {activePreset ? activePreset.name : "Presets"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm font-semibold">Saved Filters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSaveDialog(true);
                    setIsOpen(false);
                  }}
                  className="h-7 gap-1"
                >
                  <Save className="h-3 w-3" />
                  Save current
                </Button>
              </div>

              {/* Presets list */}
              {presets.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {presets.map((preset) => (
                    <div key={preset.id} className="group">
                      <PresetItem
                        preset={preset}
                        isActive={preset.id === activePresetId}
                        onSelect={() => handleSelect(preset)}
                        onDelete={() => setDeleteConfirmId(preset.id)}
                        onRename={onRename ? (name) => onRename(preset.id, name) : undefined}
                        onSetDefault={onSetDefault ? () => onSetDefault(preset.id) : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved filters</p>
                  <p className="text-xs">
                    Save your current filter configuration for quick access
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick save button (when there are changes) */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setShowSaveDialog(true)}
          title="Save filter preset"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filter configuration for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="preset-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="preset-name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My filter preset"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preset-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="preset-description"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Brief description of this filter"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newPresetName.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Preset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this filter preset? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilterPresets;
