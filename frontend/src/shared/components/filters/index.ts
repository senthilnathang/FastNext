/**
 * Filter Builder Components
 *
 * A comprehensive dynamic filter builder with support for:
 * - Multiple field types (text, number, date, select, boolean)
 * - Operators per field type (equals, contains, greater than, etc.)
 * - AND/OR logic groups
 * - Nested conditions
 * - Save filter presets
 * - Load saved filters
 * - Clear all filters
 * - Visual query builder UI
 * - URL state sync for shareable filters
 *
 * @example
 * ```tsx
 * import { FilterBuilder, useFilterBuilder } from '@/shared/components/filters';
 *
 * const config = {
 *   fields: [
 *     { key: 'name', label: 'Name', type: 'text' },
 *     { key: 'age', label: 'Age', type: 'number' },
 *     { key: 'status', label: 'Status', type: 'select', options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' },
 *     ]},
 *     { key: 'createdAt', label: 'Created Date', type: 'date' },
 *     { key: 'isVerified', label: 'Verified', type: 'boolean' },
 *   ],
 *   allowPresets: true,
 *   allowUrlSync: true,
 *   presetsStorageKey: 'my-filters',
 * };
 *
 * function MyComponent() {
 *   return (
 *     <FilterBuilder
 *       config={config}
 *       onApply={(filter) => console.log('Applied filter:', filter)}
 *       syncToUrl
 *     />
 *   );
 * }
 * ```
 */

// Main components
export { FilterBuilder, FilterBar } from './FilterBuilder';
export { FilterCondition } from './FilterCondition';
export { FilterGroup } from './FilterGroup';
export { FilterPresets } from './FilterPresets';

// Hook
export { useFilterBuilder } from './useFilterBuilder';

// Types
export type {
  // Core types
  FilterFieldType,
  FilterOperator,
  LogicalOperator,
  SelectOption,
  FilterFieldDefinition,
  FilterCondition as FilterConditionType,
  FilterGroup as FilterGroupType,
  FilterState,
  FilterPreset,
  FilterBuilderConfig,

  // Operator types
  TextOperator,
  NumberOperator,
  DateOperator,
  SelectOperator,
  BooleanOperator,
  MultiselectOperator,

  // Component props
  FilterBuilderProps,
  FilterConditionProps,
  FilterGroupProps,
  FilterPresetsProps,
} from './types';

// Utilities and constants
export {
  // Operator configurations
  OPERATORS_BY_TYPE,
  DEFAULT_OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
  RANGE_OPERATORS,
  MULTI_VALUE_OPERATORS,

  // Type guards
  isFilterGroup,
  isFilterCondition,

  // Factory functions
  generateFilterId,
  createEmptyFilterState,
  createEmptyCondition,
  createEmptyGroup,

  // Utility functions
  countConditions,
  getMaxDepth,
  serializeFilter,
  deserializeFilter,
} from './types';
