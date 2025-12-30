"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import {
  Filter,
  RotateCcw,
  Check,
  Share2,
  Copy,
  Link,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils";
import {
  FilterBuilderProps,
  FilterState,
  createEmptyFilterState,
  serializeFilter,
} from "./types";
import { useFilterBuilder } from "./useFilterBuilder";
import { FilterGroup } from "./FilterGroup";
import { FilterPresets } from "./FilterPresets";

// Default labels
const DEFAULT_LABELS = {
  addCondition: "Add condition",
  addGroup: "Add group",
  apply: "Apply filters",
  clear: "Clear all",
  savePreset: "Save preset",
  loadPreset: "Load preset",
  selectField: "Select field",
  selectOperator: "Select operator",
  enterValue: "Enter value",
};

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  config,
  value,
  onChange,
  onApply,
  onClear,
  urlParamName = "filter",
  syncToUrl = false,
  presets: externalPresets,
  onSavePreset,
  onDeletePreset,
  onLoadPreset,
  compact = false,
  showApplyButton = true,
  showClearButton = true,
  autoApply = false,
  className,
  labels: customLabels,
}) => {
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  // Initialize hook
  const {
    filter,
    setFilter,
    resetFilter,
    clearFilter,
    addCondition,
    updateCondition,
    removeCondition,
    duplicateCondition,
    toggleConditionDisabled,
    addGroup,
    updateGroupOperator,
    removeGroup,
    toggleGroupDisabled,
    presets: localPresets,
    activePresetId,
    savePreset,
    loadPreset,
    deletePreset,
    renamePreset,
    setDefaultPreset,
    syncedUrl,
    isValid,
    canAddCondition,
    canAddGroup,
    conditionCount,
    maxDepth,
    apply,
    hasChanges,
    getFieldDefinition,
    getOperatorsForField,
  } = useFilterBuilder({
    config,
    initialValue: value,
    syncToUrl,
    urlParamName,
    presetsStorageKey: config.presetsStorageKey,
    onChange,
    onApply: autoApply ? onApply : undefined,
  });

  // Use external presets if provided
  const presets = externalPresets || localPresets;

  // Sync external value changes
  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(filter)) {
      setFilter(value);
    }
  }, [value]);

  // Handle apply
  const handleApply = useCallback(() => {
    apply();
    onApply?.(filter);
  }, [apply, filter, onApply]);

  // Handle clear
  const handleClear = useCallback(() => {
    clearFilter();
    onClear?.();
    if (autoApply) {
      onApply?.(createEmptyFilterState());
    }
  }, [clearFilter, onClear, autoApply, onApply]);

  // Handle filter group change
  const handleGroupChange = useCallback(
    (updatedGroup: typeof filter.rootGroup) => {
      const newFilter: FilterState = { rootGroup: updatedGroup };
      setFilter(newFilter);
      if (autoApply) {
        onApply?.(newFilter);
      }
    },
    [setFilter, autoApply, onApply]
  );

  // Handle save preset
  const handleSavePreset = useCallback(
    async (name: string, description?: string) => {
      if (onSavePreset) {
        await onSavePreset({ name, description, filter });
      } else {
        savePreset(name, description);
      }
    },
    [filter, onSavePreset, savePreset]
  );

  // Handle load preset
  const handleLoadPreset = useCallback(
    (preset: typeof presets[0]) => {
      if (onLoadPreset) {
        onLoadPreset(preset);
      } else {
        loadPreset(preset);
      }
      if (autoApply) {
        onApply?.(preset.filter);
      }
    },
    [onLoadPreset, loadPreset, autoApply, onApply]
  );

  // Handle delete preset
  const handleDeletePreset = useCallback(
    async (presetId: string) => {
      if (onDeletePreset) {
        await onDeletePreset(presetId);
      } else {
        deletePreset(presetId);
      }
    },
    [onDeletePreset, deletePreset]
  );

  // Copy shareable URL
  const handleCopyUrl = useCallback(async () => {
    if (syncedUrl && typeof window !== "undefined") {
      const fullUrl = window.location.origin + window.location.pathname + syncedUrl;
      try {
        await navigator.clipboard.writeText(fullUrl);
        // Could show a toast here
      } catch (err) {
        console.error("Failed to copy URL:", err);
      }
    }
  }, [syncedUrl]);

  // Feature flags
  const features = {
    nestedGroups: config.features?.nestedGroups !== false,
    disableConditions: config.features?.disableConditions !== false,
    duplicateConditions: config.features?.duplicateConditions !== false,
    clearAll: config.features?.clearAll !== false,
    presetManagement: config.features?.presetManagement !== false && config.allowPresets !== false,
  };

  const hasConditions = conditionCount > 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={compact ? "p-4" : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className={compact ? "text-lg" : undefined}>
              Filter Builder
            </CardTitle>
            {hasConditions && (
              <Badge variant="secondary" className="ml-2">
                {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Validation status */}
            {hasConditions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      {isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isValid
                      ? "All conditions are valid"
                      : "Some conditions are incomplete"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Presets */}
            {features.presetManagement && (
              <FilterPresets
                presets={presets}
                activePresetId={activePresetId}
                onSelect={handleLoadPreset}
                onSave={handleSavePreset}
                onDelete={handleDeletePreset}
                onRename={renamePreset}
                onSetDefault={setDefaultPreset}
              />
            )}

            {/* Share URL button */}
            {syncToUrl && hasConditions && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon-sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Share Filter</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Copy the URL to share this filter configuration with others.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                        {syncedUrl || "No filter to share"}
                      </code>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={handleCopyUrl}
                        disabled={!syncedUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {config.fields.length > 0 && (
          <CardDescription>
            Build complex filter queries with {config.fields.length} available fields
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={compact ? "p-4 pt-0" : undefined}>
        {/* Filter group */}
        <FilterGroup
          group={filter.rootGroup}
          fields={config.fields}
          depth={0}
          maxDepth={config.maxDepth || 3}
          onChange={handleGroupChange}
          allowNestedGroups={features.nestedGroups}
          compact={compact}
        />
      </CardContent>

      {/* Footer with action buttons */}
      <CardFooter
        className={cn(
          "flex items-center justify-between gap-2 border-t",
          compact ? "p-4" : undefined
        )}
      >
        <div className="flex items-center gap-2">
          {/* Condition count info */}
          {hasConditions && (
            <span className="text-sm text-muted-foreground">
              {!canAddCondition && (
                <span className="text-yellow-600">
                  Maximum conditions reached ({config.maxConditions || 20})
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Clear button */}
          {showClearButton && features.clearAll && hasConditions && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              {labels.clear}
            </Button>
          )}

          {/* Reset button (if there are changes) */}
          {hasChanges && !autoApply && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilter}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}

          {/* Apply button */}
          {showApplyButton && !autoApply && (
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!isValid || !hasChanges}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              {labels.apply}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

// Compact inline filter bar variant
interface FilterBarProps {
  config: FilterBuilderProps["config"];
  value?: FilterState;
  onChange?: (filter: FilterState) => void;
  onApply?: (filter: FilterState) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  config,
  value,
  onChange,
  onApply,
  className,
}) => {
  const {
    filter,
    setFilter,
    clearFilter,
    conditionCount,
    isValid,
    apply,
    hasChanges,
  } = useFilterBuilder({
    config,
    initialValue: value,
    onChange,
    onApply,
  });

  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleApply = useCallback(() => {
    apply();
    onApply?.(filter);
    setIsExpanded(false);
  }, [apply, filter, onApply]);

  const handleClear = useCallback(() => {
    clearFilter();
  }, [clearFilter]);

  return (
    <div className={cn("relative", className)}>
      {/* Filter trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "gap-2",
          conditionCount > 0 && "border-primary text-primary"
        )}
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {conditionCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {conditionCount}
          </Badge>
        )}
      </Button>

      {/* Expanded filter panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[600px] max-w-[90vw]">
          <FilterBuilder
            config={config}
            value={filter}
            onChange={setFilter}
            onApply={(f) => {
              onApply?.(f);
              setIsExpanded(false);
            }}
            onClear={handleClear}
            compact
            className="shadow-lg"
          />
        </div>
      )}

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default FilterBuilder;
