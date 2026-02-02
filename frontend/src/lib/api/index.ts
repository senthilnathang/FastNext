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

// Users
export { usersApi } from "./users";
export type { User, UserListParams, CreateUserData, UpdateUserData, PaginatedUsers } from "./users";

// Roles
export { rolesApi } from "./roles";
export type { Role, RoleListParams, CreateRoleData, UpdateRoleData, PaginatedRoles } from "./roles";

// Permissions
export { permissionsApi } from "./permissions";
export type { Permission, PermissionGrouped, PermissionListParams, PaginatedPermissions } from "./permissions";

// Auth
export { authApi } from "./auth";
export type { LoginRequest, LoginResponse, RefreshTokenResponse, UserInfo as AuthUserInfo, TwoFactorSetup } from "./auth";

// Attachments
export { attachmentsApi } from "./attachments";
export type { Attachment as FileAttachment, AttachmentListParams, AttachmentUploadResponse } from "./attachments";

// Activity / Audit
export { activityApi } from "./activity";
export type { ActivityLog, ActivityLogUser, ActivityListParams, PaginatedActivityLogs } from "./activity";

// Bookmarks
export { bookmarksApi } from "./bookmarks";
export type { Bookmark, BookmarkListParams, PaginatedBookmarks } from "./bookmarks";

// Reactions
export { reactionsApi } from "./reactions";
export type { Reaction, ReactionSummaryItem } from "./reactions";

// RBAC
export { rbacApi } from "./rbac";
export type { MenuItem as RBACMenuItem, ContentType, AccessRule, AccessRuleScope } from "./rbac";

// Templates
export { templatesApi } from "./templates";
export type { TextTemplate, TemplateListParams } from "./templates";

// Push Notifications
export { pushApi } from "./push";

// ACLs
export { aclsApi } from "./acls";

// Workflows
export { workflowsApi } from "./workflows";
export type { Workflow, WorkflowState, WorkflowTransition } from "./workflows";

// Automation
export { automationApi } from "./automation";
export type { ServerAction as AutomationServerAction, AutomationRule } from "./automation";

// Scheduled Actions
export { scheduledActionsApi } from "./scheduled-actions";
export type { ScheduledAction as ScheduledActionDetail, ScheduledActionLog } from "./scheduled-actions";

// Reports
export { reportsApi } from "./reports";

// Config Parameters
export { configParamsApi } from "./config-params";

// Translations
export { translationsApi } from "./translations";

// Sequences
export { sequencesApi } from "./sequences";

// Webhooks
export { webhooksApi } from "./webhooks";

// Security
export { securityApi } from "./security";
export type { SecuritySettings, SecurityOverview, TwoFactorSetupResponse, SecurityViolation } from "./security";

// Messaging Config
export { messagingConfigApi } from "./messaging-config";
export type { MessagingConfig, CreateMessagingConfigData, UpdateMessagingConfigData } from "./messaging-config";

// CSP
export { cspApi } from "./csp";
export type { CSPReport, CSPStatus } from "./csp";

// Record Rules
export { recordRulesApi } from "./record-rules";
export type { RecordRule, CreateRecordRuleData, UpdateRecordRuleData, CheckAccessData, CheckAccessResponse } from "./record-rules";

// Remote Modules
export { remoteModulesApi } from "./remote-modules";
export type { RemoteSource, RemoteModule, SyncStatus as RemoteModuleSyncStatus } from "./remote-modules";

// Module Technical
export { moduleTechnicalApi } from "./module-technical";
export type { ModuleTechnicalInfo, ModelInfo, ModelField, ModuleRoute as ModuleTechnicalRoute, ModuleService, ModuleStatistics, ModuleAssets } from "./module-technical";

// Schema
export { schemaApi } from "./schema";
export type { SchemaStatus, Migration, TableInfo, ColumnInfo, SchemaComparison, SchemaDifference, BackupResult, SchemaCheckResult } from "./schema";

// Exports / Imports
export { exportsApi } from "./exports";
export type { ExportHistory, ImportInfo, ExportTemplate } from "./exports";

// Note: Demo, CRM, and Marketplace module APIs are available via direct imports:
// - import { demoApi } from "@/lib/api/demo";
// - import { crmApi } from "@/lib/api/crm";
// - import { marketplaceApi } from "@/lib/api/marketplace";
// These are loaded dynamically when modules are installed.
