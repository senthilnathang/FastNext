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

export { inboxApi, type InboxItem, type Label, type InboxStats, type BulkActionResult } from "./inbox";
export type { InboxItemType, InboxPriority, InboxStatus, InboxListParams, CreateInboxItemData, UpdateInboxItemData, PaginatedInboxItems } from "./inbox";

export { modulesApi, type InstalledModule, type ModuleManifest, type ModuleCategory, type ModuleDependencyTree, type ScheduledAction, type ServerAction, type Sequence } from "./modules";
export type { ModuleState, ModuleListParams, ModuleInstallResult, ModuleActionParams, PaginatedModules } from "./modules";

// Config
export { API_CONFIG } from "./config";
