"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  FilterState,
  FilterGroup,
  FilterCondition,
  FilterPreset,
  FilterBuilderConfig,
  LogicalOperator,
  createEmptyFilterState,
  createEmptyCondition,
  createEmptyGroup,
  generateFilterId,
  isFilterGroup,
  countConditions,
  getMaxDepth,
  serializeFilter,
  deserializeFilter,
  OPERATORS_BY_TYPE,
  FilterFieldDefinition,
} from "./types";

interface UseFilterBuilderOptions {
  config: FilterBuilderConfig;
  initialValue?: FilterState;
  // URL sync options
  syncToUrl?: boolean;
  urlParamName?: string;
  // Preset options
  presetsStorageKey?: string;
  // Callbacks
  onChange?: (filter: FilterState) => void;
  onApply?: (filter: FilterState) => void;
}

interface UseFilterBuilderReturn {
  // Filter state
  filter: FilterState;
  setFilter: (filter: FilterState) => void;
  resetFilter: () => void;
  clearFilter: () => void;

  // Condition operations
  addCondition: (groupId: string, field?: string) => void;
  updateCondition: (conditionId: string, updates: Partial<FilterCondition>) => void;
  removeCondition: (conditionId: string) => void;
  duplicateCondition: (conditionId: string) => void;
  toggleConditionDisabled: (conditionId: string) => void;

  // Group operations
  addGroup: (parentGroupId: string, operator?: LogicalOperator) => void;
  updateGroupOperator: (groupId: string, operator: LogicalOperator) => void;
  removeGroup: (groupId: string) => void;
  toggleGroupDisabled: (groupId: string) => void;

  // Preset operations
  presets: FilterPreset[];
  activePresetId: string | null;
  savePreset: (name: string, description?: string) => FilterPreset;
  loadPreset: (preset: FilterPreset) => void;
  deletePreset: (presetId: string) => void;
  renamePreset: (presetId: string, newName: string) => void;
  setDefaultPreset: (presetId: string) => void;

  // URL sync
  syncedUrl: string | null;
  applyFromUrl: () => boolean;

  // Validation
  isValid: boolean;
  canAddCondition: boolean;
  canAddGroup: (depth: number) => boolean;
  conditionCount: number;
  maxDepth: number;

  // Apply
  apply: () => void;
  hasChanges: boolean;

  // Utility
  getFieldDefinition: (fieldKey: string) => FilterFieldDefinition | undefined;
  getOperatorsForField: (fieldKey: string) => string[];
}

export function useFilterBuilder({
  config,
  initialValue,
  syncToUrl = false,
  urlParamName = "filter",
  presetsStorageKey,
  onChange,
  onApply,
}: UseFilterBuilderOptions): UseFilterBuilderReturn {
  // Initialize filter state
  const [filter, setFilterState] = useState<FilterState>(() => {
    // Try to restore from URL first if sync is enabled
    if (syncToUrl && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFilter = urlParams.get(urlParamName);
      if (urlFilter) {
        const deserialized = deserializeFilter(urlFilter);
        if (deserialized) {
          return deserialized;
        }
      }
    }
    return initialValue || createEmptyFilterState();
  });

  // Applied filter (for detecting changes)
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(filter);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (presetsStorageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(presetsStorageKey);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save presets to localStorage
  useEffect(() => {
    if (presetsStorageKey && typeof window !== "undefined") {
      localStorage.setItem(presetsStorageKey, JSON.stringify(presets));
    }
  }, [presets, presetsStorageKey]);

  // URL sync
  const syncedUrl = useMemo(() => {
    if (!syncToUrl) return null;
    const serialized = serializeFilter(filter);
    return serialized ? `?${urlParamName}=${serialized}` : null;
  }, [filter, syncToUrl, urlParamName]);

  // Sync to URL when filter changes
  useEffect(() => {
    if (syncToUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const serialized = serializeFilter(filter);
      if (serialized && filter.rootGroup.conditions.length > 0) {
        url.searchParams.set(urlParamName, serialized);
      } else {
        url.searchParams.delete(urlParamName);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [filter, syncToUrl, urlParamName]);

  // Set filter with change callback
  const setFilter = useCallback(
    (newFilter: FilterState) => {
      setFilterState(newFilter);
      onChange?.(newFilter);
    },
    [onChange]
  );

  // Reset to initial value
  const resetFilter = useCallback(() => {
    const initial = initialValue || createEmptyFilterState();
    setFilter(initial);
    setActivePresetId(null);
  }, [initialValue, setFilter]);

  // Clear all conditions
  const clearFilter = useCallback(() => {
    setFilter(createEmptyFilterState());
    setActivePresetId(null);
  }, [setFilter]);

  // Helper to find and update item in nested structure
  const updateNestedItem = useCallback(
    (
      group: FilterGroup,
      targetId: string,
      updater: (
        item: FilterCondition | FilterGroup,
        parent: FilterGroup,
        index: number
      ) => FilterCondition | FilterGroup | null
    ): FilterGroup => {
      const newConditions = group.conditions
        .map((item, index) => {
          if (item.id === targetId) {
            return updater(item, group, index);
          }
          if (isFilterGroup(item)) {
            return updateNestedItem(item, targetId, updater);
          }
          return item;
        })
        .filter((item): item is FilterCondition | FilterGroup => item !== null);

      return { ...group, conditions: newConditions };
    },
    []
  );

  // Add condition to a group
  const addCondition = useCallback(
    (groupId: string, field?: string) => {
      const newCondition = createEmptyCondition(field);

      // Set default operator based on field type
      if (field) {
        const fieldDef = config.fields.find((f) => f.key === field);
        if (fieldDef) {
          const operators = fieldDef.operators || OPERATORS_BY_TYPE[fieldDef.type];
          if (operators.length > 0) {
            newCondition.operator = operators[0];
          }
        }
      }

      setFilter({
        rootGroup: updateNestedItem(
          filter.rootGroup,
          groupId,
          (item) => {
            if (isFilterGroup(item)) {
              return {
                ...item,
                conditions: [...item.conditions, newCondition],
              };
            }
            return item;
          }
        ),
      });
    },
    [filter, setFilter, updateNestedItem, config.fields]
  );

  // Update a condition
  const updateCondition = useCallback(
    (conditionId: string, updates: Partial<FilterCondition>) => {
      setFilter({
        rootGroup: updateNestedItem(
          filter.rootGroup,
          conditionId,
          (item) => {
            if (!isFilterGroup(item)) {
              return { ...item, ...updates };
            }
            return item;
          }
        ),
      });
    },
    [filter, setFilter, updateNestedItem]
  );

  // Remove a condition
  const removeCondition = useCallback(
    (conditionId: string) => {
      setFilter({
        rootGroup: updateNestedItem(filter.rootGroup, conditionId, () => null),
      });
    },
    [filter, setFilter, updateNestedItem]
  );

  // Duplicate a condition
  const duplicateCondition = useCallback(
    (conditionId: string) => {
      const findAndDuplicate = (group: FilterGroup): FilterGroup => {
        const newConditions: (FilterCondition | FilterGroup)[] = [];

        for (const item of group.conditions) {
          newConditions.push(item);
          if (!isFilterGroup(item) && item.id === conditionId) {
            newConditions.push({
              ...item,
              id: generateFilterId(),
            });
          } else if (isFilterGroup(item)) {
            // Replace with recursively processed group
            newConditions[newConditions.length - 1] = findAndDuplicate(item);
          }
        }

        return { ...group, conditions: newConditions };
      };

      setFilter({
        rootGroup: findAndDuplicate(filter.rootGroup),
      });
    },
    [filter, setFilter]
  );

  // Toggle condition disabled state
  const toggleConditionDisabled = useCallback(
    (conditionId: string) => {
      setFilter({
        rootGroup: updateNestedItem(
          filter.rootGroup,
          conditionId,
          (item) => {
            if (!isFilterGroup(item)) {
              return { ...item, disabled: !item.disabled };
            }
            return item;
          }
        ),
      });
    },
    [filter, setFilter, updateNestedItem]
  );

  // Add nested group
  const addGroup = useCallback(
    (parentGroupId: string, operator: LogicalOperator = "AND") => {
      const newGroup = createEmptyGroup(operator);

      setFilter({
        rootGroup: updateNestedItem(
          filter.rootGroup,
          parentGroupId,
          (item) => {
            if (isFilterGroup(item)) {
              return {
                ...item,
                conditions: [...item.conditions, newGroup],
              };
            }
            return item;
          }
        ),
      });
    },
    [filter, setFilter, updateNestedItem]
  );

  // Update group operator
  const updateGroupOperator = useCallback(
    (groupId: string, operator: LogicalOperator) => {
      if (groupId === filter.rootGroup.id) {
        setFilter({
          rootGroup: { ...filter.rootGroup, operator },
        });
      } else {
        setFilter({
          rootGroup: updateNestedItem(
            filter.rootGroup,
            groupId,
            (item) => {
              if (isFilterGroup(item)) {
                return { ...item, operator };
              }
              return item;
            }
          ),
        });
      }
    },
    [filter, setFilter, updateNestedItem]
  );

  // Remove a group
  const removeGroup = useCallback(
    (groupId: string) => {
      setFilter({
        rootGroup: updateNestedItem(filter.rootGroup, groupId, () => null),
      });
    },
    [filter, setFilter, updateNestedItem]
  );

  // Toggle group disabled state
  const toggleGroupDisabled = useCallback(
    (groupId: string) => {
      if (groupId === filter.rootGroup.id) {
        setFilter({
          rootGroup: { ...filter.rootGroup, disabled: !filter.rootGroup.disabled },
        });
      } else {
        setFilter({
          rootGroup: updateNestedItem(
            filter.rootGroup,
            groupId,
            (item) => {
              if (isFilterGroup(item)) {
                return { ...item, disabled: !item.disabled };
              }
              return item;
            }
          ),
        });
      }
    },
    [filter, setFilter, updateNestedItem]
  );

  // Preset operations
  const savePreset = useCallback(
    (name: string, description?: string): FilterPreset => {
      const now = new Date().toISOString();
      const preset: FilterPreset = {
        id: generateFilterId(),
        name,
        description,
        filter: JSON.parse(JSON.stringify(filter)),
        createdAt: now,
        updatedAt: now,
      };

      setPresets((prev) => [preset, ...prev]);
      setActivePresetId(preset.id);
      return preset;
    },
    [filter]
  );

  const loadPreset = useCallback(
    (preset: FilterPreset) => {
      setFilter(JSON.parse(JSON.stringify(preset.filter)));
      setActivePresetId(preset.id);
    },
    [setFilter]
  );

  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  }, [activePresetId]);

  const renamePreset = useCallback((presetId: string, newName: string) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === presetId
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const setDefaultPreset = useCallback((presetId: string) => {
    setPresets((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === presetId,
        updatedAt: p.id === presetId ? new Date().toISOString() : p.updatedAt,
      }))
    );
  }, []);

  // Apply from URL
  const applyFromUrl = useCallback(() => {
    if (typeof window === "undefined") return false;

    const urlParams = new URLSearchParams(window.location.search);
    const urlFilter = urlParams.get(urlParamName);

    if (urlFilter) {
      const deserialized = deserializeFilter(urlFilter);
      if (deserialized) {
        setFilter(deserialized);
        return true;
      }
    }
    return false;
  }, [urlParamName, setFilter]);

  // Validation and limits
  const conditionCount = useMemo(() => countConditions(filter.rootGroup), [filter]);
  const maxDepthValue = useMemo(() => getMaxDepth(filter.rootGroup), [filter]);

  const canAddCondition = useMemo(() => {
    const maxConditions = config.maxConditions || 20;
    return conditionCount < maxConditions;
  }, [conditionCount, config.maxConditions]);

  const canAddGroup = useCallback(
    (currentDepth: number) => {
      const maxDepth = config.maxDepth || 3;
      return currentDepth < maxDepth;
    },
    [config.maxDepth]
  );

  const isValid = useMemo(() => {
    // Filter is valid if all conditions have field, operator, and value (where required)
    const validateGroup = (group: FilterGroup): boolean => {
      for (const item of group.conditions) {
        if (item.disabled) continue;

        if (isFilterGroup(item)) {
          if (!validateGroup(item)) return false;
        } else {
          if (!item.field || !item.operator) return false;
          // Some operators don't require values
          const valueRequired = !['is_empty', 'is_not_empty', 'is_true', 'is_false', 'is_today', 'is_this_week', 'is_this_month', 'is_this_year'].includes(item.operator);
          if (valueRequired && (item.value === undefined || item.value === null || item.value === '')) {
            return false;
          }
        }
      }
      return true;
    };

    return validateGroup(filter.rootGroup);
  }, [filter]);

  // Has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(filter) !== JSON.stringify(appliedFilter);
  }, [filter, appliedFilter]);

  // Apply filter
  const apply = useCallback(() => {
    setAppliedFilter(filter);
    onApply?.(filter);
  }, [filter, onApply]);

  // Get field definition
  const getFieldDefinition = useCallback(
    (fieldKey: string) => {
      return config.fields.find((f) => f.key === fieldKey);
    },
    [config.fields]
  );

  // Get operators for field
  const getOperatorsForField = useCallback(
    (fieldKey: string) => {
      const fieldDef = getFieldDefinition(fieldKey);
      if (!fieldDef) return [];
      return fieldDef.operators || OPERATORS_BY_TYPE[fieldDef.type] || [];
    },
    [getFieldDefinition]
  );

  return {
    // Filter state
    filter,
    setFilter,
    resetFilter,
    clearFilter,

    // Condition operations
    addCondition,
    updateCondition,
    removeCondition,
    duplicateCondition,
    toggleConditionDisabled,

    // Group operations
    addGroup,
    updateGroupOperator,
    removeGroup,
    toggleGroupDisabled,

    // Preset operations
    presets,
    activePresetId,
    savePreset,
    loadPreset,
    deletePreset,
    renamePreset,
    setDefaultPreset,

    // URL sync
    syncedUrl,
    applyFromUrl,

    // Validation
    isValid,
    canAddCondition,
    canAddGroup,
    conditionCount,
    maxDepth: maxDepthValue,

    // Apply
    apply,
    hasChanges,

    // Utility
    getFieldDefinition,
    getOperatorsForField,
  };
}

export default useFilterBuilder;
