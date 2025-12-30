import { z } from "zod";
import { UuidSchema } from "./index";

// Message type enum
export const MessageTypeSchema = z.enum([
  "text",
  "image",
  "file",
  "audio",
  "video",
  "link",
  "code",
  "system",
  "reply",
  "forward",
]);

// Message status enum
export const MessageStatusSchema = z.enum([
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
  "deleted",
]);

// Conversation type enum
export const ConversationTypeSchema = z.enum([
  "direct",
  "group",
  "channel",
  "thread",
  "support",
]);

// Conversation status enum
export const ConversationStatusSchema = z.enum([
  "active",
  "archived",
  "closed",
  "muted",
]);

// Mention schema
export const MentionSchema = z.object({
  type: z.enum(["user", "group", "channel", "everyone", "here"]),
  id: UuidSchema.optional(),
  displayName: z.string().max(100),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
});

// Reaction schema
export const ReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
  userId: UuidSchema,
  messageId: UuidSchema,
  createdAt: z.string().datetime(),
});

// Add reaction schema
export const AddReactionSchema = z.object({
  emoji: z.string().min(1, "Emoji is required").max(8),
  messageId: UuidSchema,
});

// Message attachment schema
export const MessageAttachmentSchema = z.object({
  id: UuidSchema,
  type: z.enum(["image", "file", "audio", "video", "link"]),
  url: z.string().url(),
  name: z.string().max(255),
  size: z.number().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Message content schema
export const MessageContentSchema = z.object({
  text: z.string().max(10000).optional(),
  html: z.string().max(50000).optional(),
  markdown: z.string().max(20000).optional(),
  attachments: z.array(MessageAttachmentSchema).max(10).optional(),
  mentions: z.array(MentionSchema).max(50).optional(),
  linkPreviews: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
        imageUrl: z.string().url().optional(),
        siteName: z.string().max(100).optional(),
      })
    )
    .max(5)
    .optional(),
  codeBlock: z
    .object({
      language: z.string().max(50).optional(),
      code: z.string().max(50000),
    })
    .optional(),
});

// Full Message schema
export const MessageSchema = z.object({
  id: UuidSchema,
  conversationId: UuidSchema,
  senderId: UuidSchema,
  type: MessageTypeSchema.default("text"),
  status: MessageStatusSchema.default("sent"),
  content: MessageContentSchema,
  replyToId: UuidSchema.optional(),
  forwardedFromId: UuidSchema.optional(),
  threadId: UuidSchema.optional(),
  reactions: z.array(ReactionSchema).optional(),
  reactionCounts: z.record(z.string(), z.number()).optional(),
  readBy: z.array(UuidSchema).optional(),
  deliveredTo: z.array(UuidSchema).optional(),
  editedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isPinned: z.boolean().default(false),
  isEdited: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create message schema
export const CreateMessageSchema = z.object({
  conversationId: UuidSchema,
  type: MessageTypeSchema.optional(),
  content: z.object({
    text: z.string().min(1, "Message text is required").max(10000).optional(),
    html: z.string().max(50000).optional(),
    markdown: z.string().max(20000).optional(),
    attachments: z.array(MessageAttachmentSchema).max(10).optional(),
    mentions: z.array(MentionSchema).max(50).optional(),
    codeBlock: z
      .object({
        language: z.string().max(50).optional(),
        code: z.string().max(50000),
      })
      .optional(),
  }),
  replyToId: UuidSchema.optional(),
  threadId: UuidSchema.optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) =>
    data.content.text ||
    data.content.html ||
    data.content.markdown ||
    (data.content.attachments && data.content.attachments.length > 0) ||
    data.content.codeBlock,
  {
    message: "Message must have text, html, markdown, attachments, or code block",
    path: ["content"],
  }
);

// Update message schema
export const UpdateMessageSchema = z.object({
  content: z
    .object({
      text: z.string().max(10000).optional(),
      html: z.string().max(50000).optional(),
      markdown: z.string().max(20000).optional(),
    })
    .optional(),
  isPinned: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Conversation participant schema
export const ConversationParticipantSchema = z.object({
  userId: UuidSchema,
  role: z.enum(["owner", "admin", "member", "guest"]).default("member"),
  nickname: z.string().max(50).optional(),
  joinedAt: z.string().datetime(),
  lastReadAt: z.string().datetime().optional(),
  lastSeenAt: z.string().datetime().optional(),
  isMuted: z.boolean().default(false),
  mutedUntil: z.string().datetime().optional(),
  notificationPreference: z.enum(["all", "mentions", "none"]).default("all"),
});

// Full Conversation schema
export const ConversationSchema = z.object({
  id: UuidSchema,
  type: ConversationTypeSchema.default("direct"),
  status: ConversationStatusSchema.default("active"),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  participants: z.array(ConversationParticipantSchema).min(1),
  creatorId: UuidSchema,
  projectId: UuidSchema.optional(),
  groupId: UuidSchema.optional(),
  lastMessageId: UuidSchema.optional(),
  lastMessageAt: z.string().datetime().optional(),
  messageCount: z.number().min(0).default(0),
  unreadCount: z.number().min(0).default(0),
  pinnedMessageIds: z.array(UuidSchema).max(10).optional(),
  settings: z
    .object({
      isReadOnly: z.boolean().default(false),
      allowReactions: z.boolean().default(true),
      allowReplies: z.boolean().default(true),
      allowEditing: z.boolean().default(true),
      allowDeleting: z.boolean().default(true),
      messageRetentionDays: z.number().min(0).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create conversation schema
export const CreateConversationSchema = z.object({
  type: ConversationTypeSchema.optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  participantIds: z.array(UuidSchema).min(1, "At least one participant is required"),
  projectId: UuidSchema.optional(),
  groupId: UuidSchema.optional(),
  settings: z
    .object({
      isReadOnly: z.boolean().optional(),
      allowReactions: z.boolean().optional(),
      allowReplies: z.boolean().optional(),
      allowEditing: z.boolean().optional(),
      allowDeleting: z.boolean().optional(),
      messageRetentionDays: z.number().min(0).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  initialMessage: z.string().max(10000).optional(),
});

// Update conversation schema
export const UpdateConversationSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: ConversationStatusSchema.optional(),
  settings: z
    .object({
      isReadOnly: z.boolean().optional(),
      allowReactions: z.boolean().optional(),
      allowReplies: z.boolean().optional(),
      allowEditing: z.boolean().optional(),
      allowDeleting: z.boolean().optional(),
      messageRetentionDays: z.number().min(0).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Message filter schema
export const MessageFilterSchema = z.object({
  conversationId: UuidSchema.optional(),
  senderId: UuidSchema.optional(),
  types: z.array(MessageTypeSchema).optional(),
  statuses: z.array(MessageStatusSchema).optional(),
  threadId: UuidSchema.optional(),
  hasMentions: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  direction: z.enum(["before", "after", "around"]).default("before"),
});

// Export type inference helpers
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type ConversationType = z.infer<typeof ConversationTypeSchema>;
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;
export type Mention = z.infer<typeof MentionSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type AddReaction = z.infer<typeof AddReactionSchema>;
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;
export type MessageContent = z.infer<typeof MessageContentSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;
export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type CreateConversation = z.infer<typeof CreateConversationSchema>;
export type UpdateConversation = z.infer<typeof UpdateConversationSchema>;
export type MessageFilter = z.infer<typeof MessageFilterSchema>;
