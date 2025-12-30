import { z } from "zod";
import { UuidSchema, SlugSchema, ColorSchema } from "./index";

// Label scope enum
export const LabelScopeSchema = z.enum([
  "global",
  "project",
  "company",
  "user",
]);

// Label category enum
export const LabelCategorySchema = z.enum([
  "status",
  "priority",
  "type",
  "component",
  "environment",
  "custom",
]);

// Label style schema
export const LabelStyleSchema = z.object({
  backgroundColor: ColorSchema,
  textColor: ColorSchema.optional(),
  borderColor: ColorSchema.optional(),
  icon: z.string().max(50).optional(),
  emoji: z.string().max(4).optional(),
});

// Full Label schema
export const LabelSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Label name is required").max(50),
  slug: SlugSchema,
  description: z.string().max(200).optional(),
  scope: LabelScopeSchema.default("project"),
  category: LabelCategorySchema.optional(),
  style: LabelStyleSchema,
  parentLabelId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  createdBy: UuidSchema,
  isSystem: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  sortOrder: z.number().min(0).default(0),
  usageCount: z.number().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create label schema
export const CreateLabelSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50),
  slug: SlugSchema.optional(),
  description: z.string().max(200).optional(),
  scope: LabelScopeSchema.optional(),
  category: LabelCategorySchema.optional(),
  style: z.object({
    backgroundColor: ColorSchema,
    textColor: ColorSchema.optional(),
    borderColor: ColorSchema.optional(),
    icon: z.string().max(50).optional(),
    emoji: z.string().max(4).optional(),
  }),
  parentLabelId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  sortOrder: z.number().min(0).optional(),
});

// Update label schema
export const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(200).optional(),
  scope: LabelScopeSchema.optional(),
  category: LabelCategorySchema.optional(),
  style: z
    .object({
      backgroundColor: ColorSchema.optional(),
      textColor: ColorSchema.optional(),
      borderColor: ColorSchema.optional(),
      icon: z.string().max(50).optional(),
      emoji: z.string().max(4).optional(),
    })
    .optional(),
  parentLabelId: UuidSchema.nullable().optional(),
  sortOrder: z.number().min(0).optional(),
  isArchived: z.boolean().optional(),
});

// Label assignment schema
export const LabelAssignmentSchema = z.object({
  labelId: UuidSchema,
  entityType: z.string().min(1, "Entity type is required").max(50),
  entityId: UuidSchema,
  assignedBy: UuidSchema.optional(),
  assignedAt: z.string().datetime().optional(),
});

// Bulk label assignment schema
export const BulkLabelAssignmentSchema = z.object({
  labelIds: z.array(UuidSchema).min(1, "At least one label is required"),
  entityType: z.string().min(1, "Entity type is required").max(50),
  entityIds: z.array(UuidSchema).min(1, "At least one entity is required"),
  action: z.enum(["add", "remove", "set"]),
});

// Label filter schema
export const LabelFilterSchema = z.object({
  scopes: z.array(LabelScopeSchema).optional(),
  categories: z.array(LabelCategorySchema).optional(),
  projectId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  parentLabelId: UuidSchema.optional(),
  createdBy: UuidSchema.optional(),
  isSystem: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["name", "sortOrder", "usageCount", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Label group schema (for organizing labels)
export const LabelGroupSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Group name is required").max(50),
  description: z.string().max(200).optional(),
  color: ColorSchema.optional(),
  labelIds: z.array(UuidSchema),
  isExclusive: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  projectId: UuidSchema.optional(),
  sortOrder: z.number().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create label group schema
export const CreateLabelGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50),
  description: z.string().max(200).optional(),
  color: ColorSchema.optional(),
  labelIds: z.array(UuidSchema).optional(),
  isExclusive: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  projectId: UuidSchema.optional(),
  sortOrder: z.number().min(0).optional(),
});

// Export type inference helpers
export type LabelScope = z.infer<typeof LabelScopeSchema>;
export type LabelCategory = z.infer<typeof LabelCategorySchema>;
export type LabelStyle = z.infer<typeof LabelStyleSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type CreateLabel = z.infer<typeof CreateLabelSchema>;
export type UpdateLabel = z.infer<typeof UpdateLabelSchema>;
export type LabelAssignment = z.infer<typeof LabelAssignmentSchema>;
export type BulkLabelAssignment = z.infer<typeof BulkLabelAssignmentSchema>;
export type LabelFilter = z.infer<typeof LabelFilterSchema>;
export type LabelGroup = z.infer<typeof LabelGroupSchema>;
export type CreateLabelGroup = z.infer<typeof CreateLabelGroupSchema>;
