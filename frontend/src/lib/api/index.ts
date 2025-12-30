/**
 * API Client Exports
 * Central export for all API clients
 */

// Base client
export { apiClient } from "./client";

// Feature clients
export { messagesApi, type Message, type MessageReaction, type Mention, type Attachment } from "./messages";
export type { MessageType, MessageLevel, MessageListParams, CreateMessageData, UpdateMessageData, PaginatedMessages } from "./messages";

export { conversationsApi, type Conversation, type ConversationParticipant, type ConversationMessage } from "./conversations";
export type { ConversationType, ConversationListParams, CreateConversationData, UpdateConversationData, SendMessageData, PaginatedConversations, PaginatedConversationMessages } from "./conversations";

export { inboxApi, type InboxItem, type InboxLabel, type InboxStats, type BulkActionResult as InboxBulkActionResult } from "./inbox";
export type { InboxItemType, InboxPriority, InboxStatus, InboxListParams, CreateInboxItemData, UpdateInboxItemData, PaginatedInboxItems } from "./inbox";

export { modulesApi, type InstalledModule, type ModuleManifest, type ModuleCategory, type ModuleDependencyTree, type ScheduledAction, type ServerAction, type Sequence } from "./modules";
export type { ModuleState, ModuleListParams, ModuleInstallResult, ModuleActionParams, PaginatedModules } from "./modules";

// Notifications
export { notificationsApi, type Notification, type ActorInfo } from "./notifications";
export type {
  NotificationLevel,
  NotificationListParams,
  PaginatedNotifications,
  NotificationStats,
  BulkReadResponse,
  BulkDeleteResponse,
  SendNotificationRequest,
  SendNotificationResponse,
} from "./notifications";

// Labels
export { labelsApi, type Label, type LabelAssignment } from "./labels";
export type {
  ResourceType,
  LabelListParams,
  CreateLabelData,
  UpdateLabelData,
  PaginatedLabels,
  LabelStats,
  AssignLabelResult,
  UnassignLabelResult,
  BulkAssignResult,
} from "./labels";

// Companies
export { companiesApi, type Company, type CompanyMember, type CompanyAddress, type CompanySettings, type CompanyInvitation } from "./companies";
export type {
  CompanyStatus,
  CompanyPlan,
  CompanyListParams,
  CreateCompanyData,
  UpdateCompanyData,
  PaginatedCompanies,
  CompanyStats,
  SwitchCompanyResult,
} from "./companies";

// Groups
export { groupsApi, type Group, type GroupMember, type GroupSettings, type GroupInvitation, type GroupJoinRequest, type GroupActivity } from "./groups";
export type {
  GroupType,
  GroupVisibility,
  MemberRole,
  GroupListParams,
  CreateGroupData,
  UpdateGroupData,
  PaginatedGroups,
  PaginatedMembers,
  GroupStats,
  AddMemberResult,
  RemoveMemberResult,
  BulkMemberResult,
} from "./groups";

// Interceptors
export {
  generateRequestId,
  sanitizeString,
  sanitizeData,
  applyRequestInterceptors,
  handleRateLimit,
  handleUnauthorized,
  fetchWithInterceptors,
  sleep,
  COMPANY_HEADER,
  REQUEST_ID_HEADER,
} from "./interceptors";
export type { RequestInterceptorConfig, ResponseInterceptorResult } from "./interceptors";

// Multi-tenancy
export {
  getCompanyId,
  setCompanyId,
  clearCompanyId,
  getCompanyContext,
  hasCompanyContext,
  onCompanyChange,
  getCompanyHeaders,
  isValidCompanyId,
  COMPANY_HEADER_NAME,
  COMPANY_STORAGE_KEY,
  COMPANY_CONTEXT_KEY,
} from "./multitenancy";
export type { CompanyContext } from "./multitenancy";

// Config
export { API_CONFIG } from "./config";

// Note: Demo, CRM, and Marketplace module APIs are available via direct imports:
// - import { demoApi } from "@/lib/api/demo";
// - import { crmApi } from "@/lib/api/crm";
// - import { marketplaceApi } from "@/lib/api/marketplace";
// These are loaded dynamically when modules are installed.
