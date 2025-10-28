// Mixin Components - Reusable UI components for backend mixins
export { default as ActivityLog } from './ActivityLog';
export type { ActivityLogEntry as ActivityLogEntryType } from './ActivityLog';

export { default as AuditTrail } from './AuditTrail';
export type { AuditTrailEntry as AuditTrailEntryType } from './AuditTrail';

export { default as MessageNotifications } from './MessageNotifications';
export type { MessageNotification as MessageNotificationType } from './MessageNotifications';

export { default as TimestampDisplay } from './TimestampDisplay';
export type { TimestampInfo as TimestampInfoType } from './TimestampDisplay';

export { default as AuditInfo } from './AuditInfo';
export type { AuditInfo as AuditInfoType } from './AuditInfo';

// Re-export with named exports for convenience
export { ActivityLog, AuditTrail, MessageNotifications, TimestampDisplay, AuditInfo };

// Re-export types with clear naming
export type {
  ActivityLogEntryType,
  AuditTrailEntryType,
  MessageNotificationType,
  TimestampInfoType,
  AuditInfoType
};