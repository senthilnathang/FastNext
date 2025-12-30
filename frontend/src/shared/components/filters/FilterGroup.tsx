"use client";

import React, { useCallback } from "react";
import {
  Plus,
  FolderPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils";
import {
  FilterGroupProps,
  FilterGroup as FilterGroupType,
  FilterCondition as FilterConditionType,
  LogicalOperator,
  isFilterGroup,
  createEmptyCondition,
  createEmptyGroup,
  generateFilterId,
} from "./types";
import { FilterCondition } from "./FilterCondition";

// Color scheme for different nesting depths
const DEPTH_COLORS = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-green-500",
  "border-l-orange-500",
  "border-l-pink-500",
];

export const FilterGroup: React.FC<FilterGroupProps> = ({
  group,
  fields,
  depth,
  maxDepth,
  onChange,
  onRemove,
  onToggleDisable,
  showRemove = true,
  showDisable = true,
  allowNestedGroups = true,
  compact = false,
  className,
}) => {
  const canAddNestedGroup = allowNestedGroups && depth < maxDepth;
  const depthColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  // Handle adding a new condition
  const handleAddCondition = useCallback(() => {
    const newCondition = createEmptyCondition();
    onChange({
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  }, [group, onChange]);

  // Handle adding a nested group
  const handleAddGroup = useCallback(() => {
    // Use opposite operator for nested group for variety
    const newOperator: LogicalOperator = group.operator === "AND" ? "OR" : "AND";
    const newGroup = createEmptyGroup(newOperator);
    onChange({
      ...group,
      conditions: [...group.conditions, newGroup],
    });
  }, [group, onChange]);

  // Handle updating a condition
  const handleUpdateCondition = useCallback(
    (conditionId: string, updates: FilterConditionType) => {
      onChange({
        ...group,
        conditions: group.conditions.map((item) =>
          item.id === conditionId ? updates : item
        ),
      });
    },
    [group, onChange]
  );

  // Handle removing a condition
  const handleRemoveCondition = useCallback(
    (conditionId: string) => {
      onChange({
        ...group,
        conditions: group.conditions.filter((item) => item.id !== conditionId),
      });
    },
    [group, onChange]
  );

  // Handle duplicating a condition
  const handleDuplicateCondition = useCallback(
    (conditionId: string) => {
      const conditionIndex = group.conditions.findIndex(
        (item) => item.id === conditionId
      );
      if (conditionIndex === -1) return;

      const condition = group.conditions[conditionIndex];
      if (isFilterGroup(condition)) return;

      const duplicate: FilterConditionType = {
        ...condition,
        id: generateFilterId(),
      };

      const newConditions = [...group.conditions];
      newConditions.splice(conditionIndex + 1, 0, duplicate);

      onChange({
        ...group,
        conditions: newConditions,
      });
    },
    [group, onChange]
  );

  // Handle toggling a condition's disabled state
  const handleToggleConditionDisabled = useCallback(
    (conditionId: string) => {
      onChange({
        ...group,
        conditions: group.conditions.map((item) =>
          item.id === conditionId ? { ...item, disabled: !item.disabled } : item
        ),
      });
    },
    [group, onChange]
  );

  // Handle updating a nested group
  const handleUpdateNestedGroup = useCallback(
    (groupId: string, updates: FilterGroupType) => {
      onChange({
        ...group,
        conditions: group.conditions.map((item) =>
          item.id === groupId ? updates : item
        ),
      });
    },
    [group, onChange]
  );

  // Handle removing a nested group
  const handleRemoveNestedGroup = useCallback(
    (groupId: string) => {
      onChange({
        ...group,
        conditions: group.conditions.filter((item) => item.id !== groupId),
      });
    },
    [group, onChange]
  );

  // Handle toggling operator
  const handleToggleOperator = useCallback(() => {
    const newOperator: LogicalOperator = group.operator === "AND" ? "OR" : "AND";
    onChange({
      ...group,
      operator: newOperator,
    });
  }, [group, onChange]);

  const isRootGroup = depth === 0;
  const hasConditions = group.conditions.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        depth > 0 && "border-l-4 bg-muted/30",
        depth > 0 && depthColor,
        group.disabled && "opacity-50",
        className
      )}
    >
      {/* Group header */}
      <div
        className={cn(
          "flex items-center gap-2 p-2",
          depth > 0 && "bg-muted/50 rounded-t-lg"
        )}
      >
        {/* Operator toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleOperator}
          className={cn(
            "font-semibold min-w-[60px]",
            group.operator === "AND" ? "text-blue-600" : "text-purple-600"
          )}
        >
          {group.operator}
        </Button>

        {/* Group description */}
        <span className="text-sm text-muted-foreground">
          {group.operator === "AND"
            ? "Match all conditions"
            : "Match any condition"}
        </span>

        {/* Condition count badge */}
        {hasConditions && (
          <Badge variant="secondary" className="text-xs">
            {group.conditions.length} {group.conditions.length === 1 ? "rule" : "rules"}
          </Badge>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Group actions */}
        <div className="flex items-center gap-1">
          {showDisable && onToggleDisable && !isRootGroup && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleDisable}
              className="text-muted-foreground hover:text-foreground"
              title={group.disabled ? "Enable group" : "Disable group"}
            >
              {group.disabled ? (
                <ToggleLeft className="h-4 w-4" />
              ) : (
                <ToggleRight className="h-4 w-4" />
              )}
            </Button>
          )}

          {showRemove && onRemove && !isRootGroup && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
              title="Remove group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conditions list */}
      <div className={cn("space-y-2", depth > 0 ? "p-3" : "p-2")}>
        {group.conditions.map((item, index) => (
          <React.Fragment key={item.id}>
            {/* Operator label between conditions */}
            {index > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span
                  className={cn(
                    "text-xs font-medium px-2",
                    group.operator === "AND" ? "text-blue-600" : "text-purple-600"
                  )}
                >
                  {group.operator}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Render condition or nested group */}
            {isFilterGroup(item) ? (
              <FilterGroup
                group={item}
                fields={fields}
                depth={depth + 1}
                maxDepth={maxDepth}
                onChange={(updated) => handleUpdateNestedGroup(item.id, updated)}
                onRemove={() => handleRemoveNestedGroup(item.id)}
                onToggleDisable={() =>
                  handleUpdateNestedGroup(item.id, {
                    ...item,
                    disabled: !item.disabled,
                  })
                }
                showRemove
                showDisable
                allowNestedGroups={allowNestedGroups}
                compact={compact}
              />
            ) : (
              <FilterCondition
                condition={item}
                fields={fields}
                onChange={(updated) => handleUpdateCondition(item.id, updated)}
                onRemove={() => handleRemoveCondition(item.id)}
                onDuplicate={() => handleDuplicateCondition(item.id)}
                onToggleDisable={() => handleToggleConditionDisabled(item.id)}
                showDuplicate
                showDisable
                compact={compact}
              />
            )}
          </React.Fragment>
        ))}

        {/* Empty state */}
        {!hasConditions && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm mb-2">No conditions added yet</p>
            <p className="text-xs">
              Click &quot;Add condition&quot; to start building your filter
            </p>
          </div>
        )}

        {/* Add buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add condition
          </Button>

          {canAddNestedGroup && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
              className="gap-1"
            >
              <FolderPlus className="h-4 w-4" />
              Add group
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterGroup;
