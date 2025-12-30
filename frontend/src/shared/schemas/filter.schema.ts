import { z } from "zod";
import { UuidSchema } from "./index";

// Filter operator enum
export const FilterOperatorSchema = z.enum([
  // Comparison operators
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equals",
  "less_than",
  "less_than_or_equals",
  // String operators
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "matches_regex",
  // Array operators
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  // Null operators
  "is_null",
  "is_not_null",
  // Boolean operators
  "is_true",
  "is_false",
  // Date operators
  "between",
  "not_between",
  "before",
  "after",
  "within_last",
  "within_next",
  // Relative date operators
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
]);

// Filter value type enum
export const FilterValueTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "array",
  "uuid",
  "null",
]);

// Filter logic operator enum
export const FilterLogicOperatorSchema = z.enum(["and", "or"]);

// Filter condition value schema
export const FilterConditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.object({
    start: z.union([z.string(), z.number()]),
    end: z.union([z.string(), z.number()]),
  }),
  z.object({
    value: z.number(),
    unit: z.enum(["minutes", "hours", "days", "weeks", "months", "years"]),
  }),
]);

// Filter condition schema
export const FilterConditionSchema = z.object({
  id: z.string().optional(),
  field: z.string().min(1, "Field is required").max(100),
  operator: FilterOperatorSchema,
  value: FilterConditionValueSchema.optional(),
  valueType: FilterValueTypeSchema.optional(),
  caseSensitive: z.boolean().default(false),
  negate: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Filter group schema (recursive)
export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    logic: FilterLogicOperatorSchema.default("and"),
    conditions: z.array(FilterConditionSchema).optional(),
    groups: z.array(FilterGroupSchema).optional(),
    negate: z.boolean().default(false),
  })
);

// Type for FilterGroup (needed for recursive definition)
export interface FilterGroup {
  id?: string;
  logic: z.infer<typeof FilterLogicOperatorSchema>;
  conditions?: z.infer<typeof FilterConditionSchema>[];
  groups?: FilterGroup[];
  negate?: boolean;
}

// Filter sort schema
export const FilterSortSchema = z.object({
  field: z.string().min(1, "Sort field is required").max(100),
  direction: z.enum(["asc", "desc"]).default("asc"),
  nullsFirst: z.boolean().default(false),
});

// Filter pagination schema
export const FilterPaginationSchema = z.object({
  limit: z.number().min(1).max(1000).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
  cursorDirection: z.enum(["forward", "backward"]).default("forward"),
});

// Full filter preset schema
export const FilterPresetSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Preset name is required").max(100),
  description: z.string().max(500).optional(),
  entityType: z.string().min(1, "Entity type is required").max(50),
  filter: FilterGroupSchema,
  sort: z.array(FilterSortSchema).max(5).optional(),
  columns: z.array(z.string().max(100)).optional(),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  isSystem: z.boolean().default(false),
  ownerId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  usageCount: z.number().min(0).default(0),
  lastUsedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create filter preset schema
export const CreateFilterPresetSchema = z.object({
  name: z.string().min(1, "Preset name is required").max(100),
  description: z.string().max(500).optional(),
  entityType: z.string().min(1, "Entity type is required").max(50),
  filter: FilterGroupSchema,
  sort: z.array(FilterSortSchema).max(5).optional(),
  columns: z.array(z.string().max(100)).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  projectId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
});

// Update filter preset schema
export const UpdateFilterPresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  filter: FilterGroupSchema.optional(),
  sort: z.array(FilterSortSchema).max(5).optional(),
  columns: z.array(z.string().max(100)).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

// Filter query schema (for API requests)
export const FilterQuerySchema = z.object({
  entityType: z.string().min(1, "Entity type is required").max(50),
  filter: FilterGroupSchema.optional(),
  sort: z.array(FilterSortSchema).max(5).optional(),
  pagination: FilterPaginationSchema.optional(),
  columns: z.array(z.string().max(100)).optional(),
  presetId: UuidSchema.optional(),
  includeCount: z.boolean().default(true),
  includeFacets: z.boolean().default(false),
  facetFields: z.array(z.string().max(100)).optional(),
});

// Filter field definition schema (for dynamic filter builders)
export const FilterFieldDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  type: FilterValueTypeSchema,
  operators: z.array(FilterOperatorSchema).min(1),
  options: z
    .array(
      z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
        label: z.string().max(100),
      })
    )
    .optional(),
  defaultOperator: FilterOperatorSchema.optional(),
  defaultValue: FilterConditionValueSchema.optional(),
  isRequired: z.boolean().default(false),
  isSortable: z.boolean().default(true),
  isFilterable: z.boolean().default(true),
  isSearchable: z.boolean().default(false),
  group: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Filter configuration schema
export const FilterConfigurationSchema = z.object({
  entityType: z.string().min(1).max(50),
  fields: z.array(FilterFieldDefinitionSchema).min(1),
  defaultSort: z.array(FilterSortSchema).optional(),
  defaultFilter: FilterGroupSchema.optional(),
  maxConditions: z.number().min(1).max(100).default(50),
  maxNestingDepth: z.number().min(1).max(10).default(5),
  allowCustomFields: z.boolean().default(false),
  allowRegex: z.boolean().default(false),
  searchableFields: z.array(z.string().max(100)).optional(),
});

// Saved search schema
export const SavedSearchSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Search name is required").max(100),
  query: z.string().max(500),
  entityType: z.string().min(1).max(50),
  filter: FilterGroupSchema.optional(),
  sort: z.array(FilterSortSchema).optional(),
  ownerId: UuidSchema,
  isPublic: z.boolean().default(false),
  usageCount: z.number().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Export type inference helpers
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;
export type FilterValueType = z.infer<typeof FilterValueTypeSchema>;
export type FilterLogicOperator = z.infer<typeof FilterLogicOperatorSchema>;
export type FilterConditionValue = z.infer<typeof FilterConditionValueSchema>;
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type FilterSort = z.infer<typeof FilterSortSchema>;
export type FilterPagination = z.infer<typeof FilterPaginationSchema>;
export type FilterPreset = z.infer<typeof FilterPresetSchema>;
export type CreateFilterPreset = z.infer<typeof CreateFilterPresetSchema>;
export type UpdateFilterPreset = z.infer<typeof UpdateFilterPresetSchema>;
export type FilterQuery = z.infer<typeof FilterQuerySchema>;
export type FilterFieldDefinition = z.infer<typeof FilterFieldDefinitionSchema>;
export type FilterConfiguration = z.infer<typeof FilterConfigurationSchema>;
export type SavedSearch = z.infer<typeof SavedSearchSchema>;
