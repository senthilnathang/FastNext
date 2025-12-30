"use client";

import React, { useMemo, useCallback } from "react";
import {
  Trash2,
  Copy,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils";
import {
  FilterConditionProps,
  FilterCondition as FilterConditionType,
  FilterFieldDefinition,
  FilterOperator,
  OPERATORS_BY_TYPE,
  DEFAULT_OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
  RANGE_OPERATORS,
  MULTI_VALUE_OPERATORS,
} from "./types";

// Value input component based on field type
interface ValueInputProps {
  field: FilterFieldDefinition;
  operator: FilterOperator;
  value: any;
  valueTo?: any;
  onChange: (value: any, valueTo?: any) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ValueInput: React.FC<ValueInputProps> = ({
  field,
  operator,
  value,
  valueTo,
  onChange,
  disabled,
  compact,
}) => {
  const isValueLess = VALUE_LESS_OPERATORS.includes(operator);
  const isRange = RANGE_OPERATORS.includes(operator);
  const isMultiValue = MULTI_VALUE_OPERATORS.includes(operator);

  // No value input needed for valueless operators
  if (isValueLess) {
    return null;
  }

  const inputClassName = cn(
    "flex-1 min-w-[120px]",
    compact && "h-8 text-sm"
  );

  // Render based on field type
  switch (field.type) {
    case "text":
      return (
        <Input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Enter value..."}
          disabled={disabled}
          className={inputClassName}
        />
      );

    case "number":
      if (isRange) {
        return (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "", valueTo)}
              placeholder="From"
              disabled={disabled}
              className={cn(inputClassName, "min-w-[80px]")}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            <span className="text-muted-foreground text-sm">and</span>
            <Input
              type="number"
              value={valueTo ?? ""}
              onChange={(e) => onChange(value, e.target.value ? Number(e.target.value) : "")}
              placeholder="To"
              disabled={disabled}
              className={cn(inputClassName, "min-w-[80px]")}
              min={field.validation?.min}
              max={field.validation?.max}
            />
          </div>
        );
      }
      return (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
          placeholder={field.placeholder || "Enter number..."}
          disabled={disabled}
          className={inputClassName}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case "date":
    case "datetime":
      if (isRange) {
        return (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[120px]">
              <Input
                type={field.type === "datetime" ? "datetime-local" : "date"}
                value={value || ""}
                onChange={(e) => onChange(e.target.value, valueTo)}
                disabled={disabled}
                className={cn(inputClassName, "pr-8")}
                min={field.validation?.minDate}
                max={field.validation?.maxDate}
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <span className="text-muted-foreground text-sm">and</span>
            <div className="relative flex-1 min-w-[120px]">
              <Input
                type={field.type === "datetime" ? "datetime-local" : "date"}
                value={valueTo || ""}
                onChange={(e) => onChange(value, e.target.value)}
                disabled={disabled}
                className={cn(inputClassName, "pr-8")}
                min={field.validation?.minDate}
                max={field.validation?.maxDate}
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        );
      }
      return (
        <div className="relative flex-1 min-w-[120px]">
          <Input
            type={field.type === "datetime" ? "datetime-local" : "date"}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(inputClassName, "pr-8")}
            min={field.validation?.minDate}
            max={field.validation?.maxDate}
          />
          <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      );

    case "select":
      if (isMultiValue && field.options) {
        // Multi-select for 'in' and 'not_in' operators
        const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
        return (
          <div className="flex flex-wrap gap-1 flex-1 min-w-[150px] p-2 border rounded-md bg-background">
            {field.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v: string) => v !== option.value));
                    } else {
                      onChange([...selectedValues, option.value]);
                    }
                  }}
                  disabled={disabled}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full border transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                  )}
                  style={option.color && isSelected ? { backgroundColor: option.color, borderColor: option.color } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <Select
          value={value || ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className={cn(inputClassName, compact && "h-8")}>
            <SelectValue placeholder={field.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect":
      const multiSelectedValues = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <div className="flex flex-wrap gap-1 flex-1 min-w-[150px] p-2 border rounded-md bg-background">
          {field.options?.map((option) => {
            const isSelected = multiSelectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onChange(multiSelectedValues.filter((v: string) => v !== option.value));
                  } else {
                    onChange([...multiSelectedValues, option.value]);
                  }
                }}
                disabled={disabled}
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full border transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-input"
                )}
                style={option.color && isSelected ? { backgroundColor: option.color, borderColor: option.color } : undefined}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );

    case "boolean":
      // Boolean operators don't need value input
      return null;

    default:
      return (
        <Input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value..."
          disabled={disabled}
          className={inputClassName}
        />
      );
  }
};

export const FilterCondition: React.FC<FilterConditionProps> = ({
  condition,
  fields,
  onChange,
  onRemove,
  onDuplicate,
  onToggleDisable,
  showDuplicate = true,
  showDisable = true,
  compact = false,
  className,
}) => {
  // Get current field definition
  const currentField = useMemo(
    () => fields.find((f) => f.key === condition.field),
    [fields, condition.field]
  );

  // Get available operators for current field
  const availableOperators = useMemo(() => {
    if (!currentField) return [];
    return currentField.operators || OPERATORS_BY_TYPE[currentField.type] || [];
  }, [currentField]);

  // Get operator label
  const getOperatorLabel = useCallback((op: FilterOperator) => {
    return DEFAULT_OPERATOR_LABELS[op] || op;
  }, []);

  // Handle field change
  const handleFieldChange = useCallback(
    (fieldKey: string) => {
      const newField = fields.find((f) => f.key === fieldKey);
      if (newField) {
        const operators = newField.operators || OPERATORS_BY_TYPE[newField.type];
        const newOperator = operators.includes(condition.operator)
          ? condition.operator
          : operators[0] || "equals";

        onChange({
          ...condition,
          field: fieldKey,
          operator: newOperator,
          value: newField.defaultValue ?? "",
          valueTo: undefined,
        });
      }
    },
    [condition, fields, onChange]
  );

  // Handle operator change
  const handleOperatorChange = useCallback(
    (operator: string) => {
      const newCondition: FilterConditionType = {
        ...condition,
        operator: operator as FilterOperator,
      };

      // Clear value for valueless operators
      if (VALUE_LESS_OPERATORS.includes(operator as FilterOperator)) {
        newCondition.value = undefined;
        newCondition.valueTo = undefined;
      }

      // Initialize array for multi-value operators
      if (MULTI_VALUE_OPERATORS.includes(operator as FilterOperator)) {
        if (!Array.isArray(condition.value)) {
          newCondition.value = condition.value ? [condition.value] : [];
        }
      }

      // Initialize range values
      if (RANGE_OPERATORS.includes(operator as FilterOperator)) {
        if (typeof condition.value !== "number" && typeof condition.value !== "string") {
          newCondition.value = "";
        }
        if (condition.valueTo === undefined) {
          newCondition.valueTo = "";
        }
      }

      onChange(newCondition);
    },
    [condition, onChange]
  );

  // Handle value change
  const handleValueChange = useCallback(
    (value: any, valueTo?: any) => {
      onChange({
        ...condition,
        value,
        valueTo,
      });
    },
    [condition, onChange]
  );

  // Group fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, FilterFieldDefinition[]> = {};
    const uncategorized: FilterFieldDefinition[] = [];

    fields.forEach((field) => {
      if (field.category) {
        if (!groups[field.category]) {
          groups[field.category] = [];
        }
        groups[field.category].push(field);
      } else {
        uncategorized.push(field);
      }
    });

    return { groups, uncategorized };
  }, [fields]);

  const buttonSize = compact ? "icon-sm" : "icon";
  const selectHeight = compact ? "h-8" : "h-10";

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-card transition-colors",
        condition.disabled && "opacity-50 bg-muted",
        className
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Field selector */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className={cn("min-w-[150px] flex-shrink-0", selectHeight)}>
          <SelectValue placeholder="Select field..." />
        </SelectTrigger>
        <SelectContent>
          {/* Uncategorized fields */}
          {groupedFields.uncategorized.map((field) => (
            <SelectItem key={field.key} value={field.key}>
              {field.label}
            </SelectItem>
          ))}

          {/* Categorized fields */}
          {Object.entries(groupedFields.groups).map(([category, categoryFields]) => (
            <React.Fragment key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {category}
              </div>
              {categoryFields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      {currentField && (
        <Select
          value={condition.operator}
          onValueChange={handleOperatorChange}
          disabled={!condition.field}
        >
          <SelectTrigger className={cn("min-w-[140px] flex-shrink-0", selectHeight)}>
            <SelectValue placeholder="Select operator..." />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op} value={op}>
                {getOperatorLabel(op)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Value input */}
      {currentField && (
        <ValueInput
          field={currentField}
          operator={condition.operator}
          value={condition.value}
          valueTo={condition.valueTo}
          onChange={handleValueChange}
          disabled={condition.disabled}
          compact={compact}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showDisable && onToggleDisable && (
          <Button
            variant="ghost"
            size={buttonSize}
            onClick={onToggleDisable}
            className="text-muted-foreground hover:text-foreground"
            title={condition.disabled ? "Enable condition" : "Disable condition"}
          >
            {condition.disabled ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {showDuplicate && onDuplicate && (
          <Button
            variant="ghost"
            size={buttonSize}
            onClick={onDuplicate}
            className="text-muted-foreground hover:text-foreground"
            title="Duplicate condition"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          title="Remove condition"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FilterCondition;
