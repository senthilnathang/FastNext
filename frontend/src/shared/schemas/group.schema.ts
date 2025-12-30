import { z } from "zod";
import { UuidSchema, SlugSchema, ColorSchema } from "./index";

// Group type enum
export const GroupTypeSchema = z.enum([
  "team",
  "department",
  "project",
  "organization",
  "custom",
]);

// Group visibility enum
export const GroupVisibilitySchema = z.enum([
  "public",
  "private",
  "hidden",
]);

// Group member role enum
export const GroupMemberRoleSchema = z.enum([
  "owner",
  "admin",
  "moderator",
  "member",
  "guest",
]);

// Group member status enum
export const GroupMemberStatusSchema = z.enum([
  "active",
  "pending",
  "suspended",
  "removed",
]);

// Group settings schema
export const GroupSettingsSchema = z.object({
  allowMemberInvites: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  allowMemberPosts: z.boolean().default(true),
  notifyOnMemberJoin: z.boolean().default(true),
  notifyOnMemberLeave: z.boolean().default(false),
  defaultMemberRole: GroupMemberRoleSchema.default("member"),
  maxMembers: z.number().min(1).max(10000).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

// Group metadata schema
export const GroupMetadataSchema = z.object({
  icon: z.string().max(50).optional(),
  color: ColorSchema.optional(),
  coverImageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// Full Group schema
export const GroupSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, "Group name is required").max(100),
  slug: SlugSchema,
  description: z.string().max(1000).optional(),
  type: GroupTypeSchema.default("custom"),
  visibility: GroupVisibilitySchema.default("private"),
  parentGroupId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  ownerId: UuidSchema,
  settings: GroupSettingsSchema.optional(),
  metadata: GroupMetadataSchema.optional(),
  memberCount: z.number().min(0).default(0),
  isArchived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create group schema
export const CreateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  slug: SlugSchema.optional(),
  description: z.string().max(1000).optional(),
  type: GroupTypeSchema.optional(),
  visibility: GroupVisibilitySchema.optional(),
  parentGroupId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  settings: GroupSettingsSchema.optional(),
  metadata: GroupMetadataSchema.optional(),
  initialMembers: z.array(UuidSchema).max(100).optional(),
});

// Update group schema
export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(1000).optional(),
  type: GroupTypeSchema.optional(),
  visibility: GroupVisibilitySchema.optional(),
  parentGroupId: UuidSchema.nullable().optional(),
  settings: GroupSettingsSchema.partial().optional(),
  metadata: GroupMetadataSchema.partial().optional(),
  isArchived: z.boolean().optional(),
});

// Group member schema
export const GroupMemberSchema = z.object({
  id: UuidSchema,
  groupId: UuidSchema,
  userId: UuidSchema,
  role: GroupMemberRoleSchema.default("member"),
  status: GroupMemberStatusSchema.default("active"),
  nickname: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  permissions: z.array(z.string()).optional(),
  joinedAt: z.string().datetime(),
  invitedBy: UuidSchema.optional(),
  approvedBy: UuidSchema.optional(),
  approvedAt: z.string().datetime().optional(),
});

// Add group member schema
export const AddGroupMemberSchema = z.object({
  userId: UuidSchema,
  role: GroupMemberRoleSchema.optional(),
  nickname: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  skipApproval: z.boolean().default(false),
});

// Update group member schema
export const UpdateGroupMemberSchema = z.object({
  role: GroupMemberRoleSchema.optional(),
  status: GroupMemberStatusSchema.optional(),
  nickname: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  permissions: z.array(z.string()).optional(),
});

// Group invite schema
export const GroupInviteSchema = z.object({
  groupId: UuidSchema,
  email: z.string().email("Invalid email format").optional(),
  userId: UuidSchema.optional(),
  role: GroupMemberRoleSchema.optional(),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
}).refine((data) => data.email || data.userId, {
  message: "Either email or userId is required",
  path: ["email"],
});

// Group filter schema
export const GroupFilterSchema = z.object({
  types: z.array(GroupTypeSchema).optional(),
  visibility: z.array(GroupVisibilitySchema).optional(),
  parentGroupId: UuidSchema.optional(),
  companyId: UuidSchema.optional(),
  ownerId: UuidSchema.optional(),
  isArchived: z.boolean().optional(),
  isMember: z.boolean().optional(),
  search: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["name", "memberCount", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Export type inference helpers
export type GroupType = z.infer<typeof GroupTypeSchema>;
export type GroupVisibility = z.infer<typeof GroupVisibilitySchema>;
export type GroupMemberRole = z.infer<typeof GroupMemberRoleSchema>;
export type GroupMemberStatus = z.infer<typeof GroupMemberStatusSchema>;
export type GroupSettings = z.infer<typeof GroupSettingsSchema>;
export type GroupMetadata = z.infer<typeof GroupMetadataSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;
export type GroupMember = z.infer<typeof GroupMemberSchema>;
export type AddGroupMember = z.infer<typeof AddGroupMemberSchema>;
export type UpdateGroupMember = z.infer<typeof UpdateGroupMemberSchema>;
export type GroupInvite = z.infer<typeof GroupInviteSchema>;
export type GroupFilter = z.infer<typeof GroupFilterSchema>;
