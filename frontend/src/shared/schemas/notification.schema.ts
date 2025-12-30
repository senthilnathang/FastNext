import { z } from "zod";
import { UuidSchema } from "./index";

// Notification type enum
export const NotificationTypeSchema = z.enum([
  "info",
  "success",
  "warning",
  "error",
  "mention",
  "assignment",
  "comment",
  "update",
  "reminder",
  "system",
]);

// Notification priority enum
export const NotificationPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

// Notification status enum
export const NotificationStatusSchema = z.enum([
  "unread",
  "read",
  "archived",
  "dismissed",
]);

// Notification channel enum
export const NotificationChannelSchema = z.enum([
  "in_app",
  "email",
  "push",
  "sms",
  "slack",
  "webhook",
]);

// Notification action schema
export const NotificationActionSchema = z.object({
  label: z.string().min(1, "Action label is required").max(50),
  url: z.string().optional(),
  action: z.string().optional(),
  primary: z.boolean().default(false),
});

// Notification metadata schema
export const NotificationMetadataSchema = z.object({
  entityType: z.string().optional(),
  entityId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  link: z.string().optional(),
  imageUrl: z.string().url().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

// Full Notification schema
export const NotificationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default("normal"),
  status: NotificationStatusSchema.default("unread"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().max(1000).optional(),
  metadata: NotificationMetadataSchema.optional(),
  actions: z.array(NotificationActionSchema).max(3).optional(),
  channels: z.array(NotificationChannelSchema).default(["in_app"]),
  senderId: UuidSchema.optional(),
  groupKey: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create notification schema
export const CreateNotificationSchema = z.object({
  userId: UuidSchema,
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.optional(),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().max(1000).optional(),
  metadata: NotificationMetadataSchema.optional(),
  actions: z.array(NotificationActionSchema).max(3).optional(),
  channels: z.array(NotificationChannelSchema).optional(),
  groupKey: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  userId: UuidSchema.optional(),
  channels: z.object({
    in_app: z.boolean().default(true),
    email: z.boolean().default(true),
    push: z.boolean().default(false),
    sms: z.boolean().default(false),
    slack: z.boolean().default(false),
    webhook: z.boolean().default(false),
  }),
  types: z.object({
    info: z.boolean().default(true),
    success: z.boolean().default(true),
    warning: z.boolean().default(true),
    error: z.boolean().default(true),
    mention: z.boolean().default(true),
    assignment: z.boolean().default(true),
    comment: z.boolean().default(true),
    update: z.boolean().default(true),
    reminder: z.boolean().default(true),
    system: z.boolean().default(true),
  }),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
      timezone: z.string().default("UTC"),
    })
    .optional(),
  digest: z
    .object({
      enabled: z.boolean().default(false),
      frequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    })
    .optional(),
  mutedUntil: z.string().datetime().optional(),
});

// Notification filter schema
export const NotificationFilterSchema = z.object({
  types: z.array(NotificationTypeSchema).optional(),
  priorities: z.array(NotificationPrioritySchema).optional(),
  statuses: z.array(NotificationStatusSchema).optional(),
  channels: z.array(NotificationChannelSchema).optional(),
  senderId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  groupKey: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Bulk notification action schema
export const BulkNotificationActionSchema = z.object({
  ids: z.array(UuidSchema).min(1, "At least one notification ID is required"),
  action: z.enum(["mark_read", "mark_unread", "archive", "dismiss", "delete"]),
});

// Export type inference helpers
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationAction = z.infer<typeof NotificationActionSchema>;
export type NotificationMetadata = z.infer<typeof NotificationMetadataSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;
export type BulkNotificationAction = z.infer<typeof BulkNotificationActionSchema>;
