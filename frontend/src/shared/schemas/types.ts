import type { z } from "zod";
import type * as schemas from "./index";

// Infer TypeScript types from schemas
export type User = z.infer<typeof schemas.UserCreateSchema>;
export type UserUpdate = z.infer<typeof schemas.UserUpdateSchema>;
export type Login = z.infer<typeof schemas.LoginSchema>;
export type Register = z.infer<typeof schemas.RegisterSchema>;
export type PasswordChange = z.infer<typeof schemas.PasswordChangeSchema>;
export type ForgotPassword = z.infer<typeof schemas.ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof schemas.ResetPasswordSchema>;

export type Role = z.infer<typeof schemas.RoleCreateSchema>;
export type RoleUpdate = z.infer<typeof schemas.RoleUpdateSchema>;
export type Permission = z.infer<typeof schemas.PermissionCreateSchema>;

export type Project = z.infer<typeof schemas.ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof schemas.ProjectUpdateSchema>;
export type ProjectMemberInvite = z.infer<
  typeof schemas.ProjectMemberInviteSchema
>;

export type Workflow = z.infer<typeof schemas.WorkflowCreateSchema>;
export type WorkflowUpdate = z.infer<typeof schemas.WorkflowUpdateSchema>;

export type ImportJob = z.infer<typeof schemas.ImportJobCreateSchema>;
export type ExportJob = z.infer<typeof schemas.ExportJobCreateSchema>;
export type FileValidationRequest = z.infer<
  typeof schemas.FileValidationRequestSchema
>;

// Re-export types from feature schemas
export type {
  // Company types
  CompanySize,
  CompanyIndustry,
  CompanyStatus,
  CompanyAddress,
  CompanySettings,
  CompanyBranding,
  Company,
  CreateCompany,
  UpdateCompany,
  CompanyMember,
  CompanyInvite,
  // Notification types
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationChannel,
  NotificationAction,
  NotificationMetadata,
  Notification,
  CreateNotification,
  NotificationPreferences,
  NotificationFilter,
  BulkNotificationAction,
  // Group types
  GroupType,
  GroupVisibility,
  GroupMemberRole,
  GroupMemberStatus,
  GroupSettings,
  GroupMetadata,
  Group,
  CreateGroup,
  UpdateGroup,
  GroupMember,
  AddGroupMember,
  UpdateGroupMember,
  GroupInvite,
  GroupFilter,
  // Label types
  LabelScope,
  LabelCategory,
  LabelStyle,
  Label,
  CreateLabel,
  UpdateLabel,
  LabelAssignment,
  BulkLabelAssignment,
  LabelFilter,
  LabelGroup,
  CreateLabelGroup,
  // Message types
  MessageType,
  MessageStatus,
  ConversationType,
  ConversationStatus,
  Mention,
  Reaction,
  AddReaction,
  MessageAttachment,
  MessageContent,
  Message,
  CreateMessage,
  UpdateMessage,
  ConversationParticipant,
  Conversation,
  CreateConversation,
  UpdateConversation,
  MessageFilter,
  // Filter types
  FilterOperator,
  FilterValueType,
  FilterLogicOperator,
  FilterConditionValue,
  FilterCondition,
  FilterGroup,
  FilterSort,
  FilterPagination,
  FilterPreset,
  CreateFilterPreset,
  UpdateFilterPreset,
  FilterQuery,
  FilterFieldDefinition,
  FilterConfiguration,
  SavedSearch,
} from "./index";
