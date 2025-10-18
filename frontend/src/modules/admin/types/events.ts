// Event types matching backend EventResponse model

export interface EventUser {
  id: number;
  username: string;
}

export interface EventEntity {
  type: string;
  id: string | null;
  name: string | null;
}

export interface EventRequest {
  method: string | null;
  path: string | null;
  ip: string | null;
  userAgent: string | null;
  statusCode: number | null;
  responseTime: number | null;
}

export interface EventLocation {
  country: string | null;
  city: string | null;
}

export interface EventSystem {
  server: string | null;
  environment: string | null;
  version: string | null;
}

export interface EventResponse {
  eventId: string | null;
  correlationId: string | null;
  timestamp: string;
  level: string;
  category: string;
  action: string;
  user: EventUser | null;
  entity: EventEntity;
  request: EventRequest | null;
  location: EventLocation | null;
  description: string;
  metadata: Record<string, any> | null;
  tags: string[] | null;
  riskScore: number | null;
  affectedUsersCount: number | null;
  system: EventSystem | null;
}

export interface EventListResponse {
  success: boolean;
  data: EventResponse[];
  total: number;
  page: number;
  pages: number;
  message?: string;
}

export interface EventStatistics {
  success: boolean;
  timeRange: {
    start: string;
    end: string;
    hours: number;
  };
  totals: {
    events: number;
    users: number;
  };
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  criticalEvents: EventResponse[];
  topUsers: Array<{
    username: string;
    eventCount: number;
  }>;
}

export interface EventFilter {
  level?: string;
  category?: string;
  action?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  search_query?: string;
}

export interface EventExportRequest {
  format: "json" | "csv";
  level?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

// Event enums matching backend
export enum EventLevel {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export enum EventCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  USER_MANAGEMENT = "user_management",
  DATA_MANAGEMENT = "data_management",
  SYSTEM_MANAGEMENT = "system_management",
  SECURITY = "security",
  WORKFLOW = "workflow",
  API = "api",
  FILE_MANAGEMENT = "file_management",
  CONFIGURATION = "configuration",
}

export enum EventAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  EXPORT = "export",
  IMPORT = "import",
  SHARE = "share",
  PERMISSION_CHANGE = "permission_change",
  SYSTEM_EVENT = "system_event",
  SECURITY_EVENT = "security_event",
  API_CALL = "api_call",
  FILE_UPLOAD = "file_upload",
  FILE_DOWNLOAD = "file_download",
  WORKFLOW_EXECUTE = "workflow_execute",
  VALIDATION_FAILED = "validation_failed",
}
