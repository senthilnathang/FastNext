/**
 * Filter Builder Types and Interfaces
 *
 * Comprehensive type definitions for the dynamic filter builder component
 */

// Field types supported by the filter builder
export type FilterFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'datetime' | 'multiselect';

// Operators available for each field type
export type TextOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
export type NumberOperator = 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equals' | 'less_than' | 'less_than_or_equals' | 'between' | 'not_between' | 'is_empty' | 'is_not_empty';
export type DateOperator = 'equals' | 'not_equals' | 'before' | 'after' | 'between' | 'not_between' | 'is_today' | 'is_this_week' | 'is_this_month' | 'is_this_year' | 'is_empty' | 'is_not_empty';
export type SelectOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
export type BooleanOperator = 'is_true' | 'is_false';
export type MultiselectOperator = 'contains_any' | 'contains_all' | 'not_contains_any' | 'is_empty' | 'is_not_empty';

export type FilterOperator =
  | TextOperator
  | NumberOperator
  | DateOperator
  | SelectOperator
  | BooleanOperator
  | MultiselectOperator;

// Logical operators for combining conditions
export type LogicalOperator = 'AND' | 'OR';

// Option for select/multiselect fields
export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

// Field definition for filter configuration
export interface FilterFieldDefinition {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: SelectOption[];
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    minDate?: string;
    maxDate?: string;
    pattern?: RegExp;
    message?: string;
  };
  category?: string;
  // Custom operators override (if not provided, defaults based on type)
  operators?: FilterOperator[];
}

// Single filter condition
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  // For 'between' operators
  valueTo?: any;
  // Disabled conditions are stored but not applied
  disabled?: boolean;
}

// Group of filter conditions with logical operator
export interface FilterGroup {
  id: string;
  operator: LogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
  // Disabled groups are stored but not applied
  disabled?: boolean;
}

// Root filter state
export interface FilterState {
  rootGroup: FilterGroup;
}

// Saved filter preset
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: FilterState;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  isShared?: boolean;
  createdBy?: string;
  tags?: string[];
}

// Filter builder configuration
export interface FilterBuilderConfig {
  fields: FilterFieldDefinition[];
  // Maximum nesting depth for groups (default: 3)
  maxDepth?: number;
  // Maximum number of conditions (default: 20)
  maxConditions?: number;
  // Allow saving presets
  allowPresets?: boolean;
  // Allow sharing filters via URL
  allowUrlSync?: boolean;
  // Storage key for presets (localStorage)
  presetsStorageKey?: string;
  // Default operator for new conditions
  defaultOperator?: FilterOperator;
  // Default logical operator for new groups
  defaultLogicalOperator?: LogicalOperator;
  // Custom labels for operators
  operatorLabels?: Partial<Record<FilterOperator, string>>;
  // Enable/disable specific features
  features?: {
    nestedGroups?: boolean;
    disableConditions?: boolean;
    duplicateConditions?: boolean;
    clearAll?: boolean;
    presetManagement?: boolean;
  };
}

// Props for the main FilterBuilder component
export interface FilterBuilderProps {
  config: FilterBuilderConfig;
  value?: FilterState;
  onChange?: (filter: FilterState) => void;
  onApply?: (filter: FilterState) => void;
  onClear?: () => void;
  // URL sync options
  urlParamName?: string;
  syncToUrl?: boolean;
  // Preset options
  presets?: FilterPreset[];
  onSavePreset?: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FilterPreset>;
  onDeletePreset?: (presetId: string) => Promise<void>;
  onLoadPreset?: (preset: FilterPreset) => void;
  // UI options
  compact?: boolean;
  showApplyButton?: boolean;
  showClearButton?: boolean;
  autoApply?: boolean;
  className?: string;
  // Labels
  labels?: {
    addCondition?: string;
    addGroup?: string;
    apply?: string;
    clear?: string;
    savePreset?: string;
    loadPreset?: string;
    selectField?: string;
    selectOperator?: string;
    enterValue?: string;
  };
}

// Props for FilterCondition component
export interface FilterConditionProps {
  condition: FilterCondition;
  fields: FilterFieldDefinition[];
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onToggleDisable?: () => void;
  showDuplicate?: boolean;
  showDisable?: boolean;
  compact?: boolean;
  className?: string;
}

// Props for FilterGroup component
export interface FilterGroupProps {
  group: FilterGroup;
  fields: FilterFieldDefinition[];
  depth: number;
  maxDepth: number;
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
  onToggleDisable?: () => void;
  showRemove?: boolean;
  showDisable?: boolean;
  allowNestedGroups?: boolean;
  compact?: boolean;
  className?: string;
}

// Props for FilterPresets component
export interface FilterPresetsProps {
  presets: FilterPreset[];
  activePresetId?: string;
  onSelect: (preset: FilterPreset) => void;
  onSave: (name: string, description?: string) => void;
  onDelete: (presetId: string) => void;
  onRename?: (presetId: string, newName: string) => void;
  onSetDefault?: (presetId: string) => void;
  saving?: boolean;
  className?: string;
}

// Operator configuration for each field type
export const OPERATORS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equals', 'less_than', 'less_than_or_equals', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  date: ['equals', 'not_equals', 'before', 'after', 'between', 'not_between', 'is_today', 'is_this_week', 'is_this_month', 'is_this_year', 'is_empty', 'is_not_empty'],
  datetime: ['equals', 'not_equals', 'before', 'after', 'between', 'not_between', 'is_today', 'is_this_week', 'is_this_month', 'is_this_year', 'is_empty', 'is_not_empty'],
  select: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
  boolean: ['is_true', 'is_false'],
  multiselect: ['contains_any', 'contains_all', 'not_contains_any', 'is_empty', 'is_not_empty'],
};

// Default operator labels
export const DEFAULT_OPERATOR_LABELS: Record<FilterOperator, string> = {
  // Text operators
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  // Number operators
  greater_than: 'greater than',
  greater_than_or_equals: 'greater than or equals',
  less_than: 'less than',
  less_than_or_equals: 'less than or equals',
  between: 'is between',
  not_between: 'is not between',
  // Date operators
  before: 'is before',
  after: 'is after',
  is_today: 'is today',
  is_this_week: 'is this week',
  is_this_month: 'is this month',
  is_this_year: 'is this year',
  // Select operators
  in: 'is any of',
  not_in: 'is none of',
  // Boolean operators
  is_true: 'is true',
  is_false: 'is false',
  // Multiselect operators
  contains_any: 'contains any of',
  contains_all: 'contains all of',
  not_contains_any: 'does not contain any of',
};

// Operators that don't require a value
export const VALUE_LESS_OPERATORS: FilterOperator[] = [
  'is_empty',
  'is_not_empty',
  'is_true',
  'is_false',
  'is_today',
  'is_this_week',
  'is_this_month',
  'is_this_year',
];

// Operators that require a second value (range)
export const RANGE_OPERATORS: FilterOperator[] = ['between', 'not_between'];

// Operators that accept multiple values (arrays)
export const MULTI_VALUE_OPERATORS: FilterOperator[] = ['in', 'not_in', 'contains_any', 'contains_all', 'not_contains_any'];

// Utility type guards
export function isFilterGroup(item: FilterCondition | FilterGroup): item is FilterGroup {
  return 'conditions' in item && 'operator' in item && Array.isArray(item.conditions);
}

export function isFilterCondition(item: FilterCondition | FilterGroup): item is FilterCondition {
  return 'field' in item && 'value' in item;
}

// Utility to generate unique IDs
export function generateFilterId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty filter state
export function createEmptyFilterState(): FilterState {
  return {
    rootGroup: {
      id: generateFilterId(),
      operator: 'AND',
      conditions: [],
    },
  };
}

// Create empty condition
export function createEmptyCondition(field?: string): FilterCondition {
  return {
    id: generateFilterId(),
    field: field || '',
    operator: 'equals',
    value: '',
  };
}

// Create empty group
export function createEmptyGroup(operator: LogicalOperator = 'AND'): FilterGroup {
  return {
    id: generateFilterId(),
    operator,
    conditions: [],
  };
}

// Count total conditions in filter state
export function countConditions(group: FilterGroup): number {
  let count = 0;
  for (const item of group.conditions) {
    if (isFilterGroup(item)) {
      count += countConditions(item);
    } else {
      count += 1;
    }
  }
  return count;
}

// Get maximum depth of nested groups
export function getMaxDepth(group: FilterGroup, currentDepth: number = 0): number {
  let maxDepth = currentDepth;
  for (const item of group.conditions) {
    if (isFilterGroup(item)) {
      const depth = getMaxDepth(item, currentDepth + 1);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }
  }
  return maxDepth;
}

// Serialize filter state to URL-safe string
export function serializeFilter(filter: FilterState): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(filter)));
  } catch {
    return '';
  }
}

// Deserialize filter state from URL string
export function deserializeFilter(encoded: string): FilterState | null {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded) as FilterState;
  } catch {
    return null;
  }
}
