/**
 * Schema API Client
 * Handles module schema management, migrations, and database operations
 */

import { apiClient } from "./client";

// Types
export interface SchemaStatus {
  module_name: string;
  is_synced: boolean;
  pending_changes: string[];
  last_sync: string | null;
}

export interface Migration {
  id: string;
  module_name: string;
  description: string;
  applied_at: string;
  checksum: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primary_key: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  row_count: number;
}

export interface SchemaDifference {
  field: string;
  model_type: string;
  db_type: string;
  action: string;
}

export interface SchemaComparison {
  model_name: string;
  differences: SchemaDifference[];
}

export interface BackupResult {
  file_path: string;
  records_count: number;
  size_bytes: number;
}

export interface SchemaCheckResult {
  module_name: string;
  status: string;
  issues: string[];
}

// API Functions
export const schemaApi = {
  /**
   * Get schema status for a module
   */
  getStatus: (moduleName: string): Promise<SchemaStatus> =>
    apiClient.get(`/api/v1/base/modules/schema/${moduleName}/status`),

  /**
   * Sync schema for a module
   */
  sync: (moduleName: string): Promise<{ success: boolean; message: string }> =>
    apiClient.post(`/api/v1/base/modules/schema/${moduleName}/sync`),

  /**
   * Get migration history for a module
   */
  getMigrations: (moduleName: string): Promise<Migration[]> =>
    apiClient.get(`/api/v1/base/modules/schema/${moduleName}/migrations`),

  /**
   * Get all migrations across all modules
   */
  getAllMigrations: (): Promise<Migration[]> =>
    apiClient.get("/api/v1/base/modules/schema/migrations/all"),

  /**
   * Rollback a migration for a module
   */
  rollback: (moduleName: string, migrationId: string): Promise<{ success: boolean; message: string }> =>
    apiClient.post(`/api/v1/base/modules/schema/${moduleName}/rollback`, { migration_id: migrationId }),

  /**
   * Get database tables for a module
   */
  getTables: (moduleName: string): Promise<TableInfo[]> =>
    apiClient.get(`/api/v1/base/modules/schema/${moduleName}/tables`),

  /**
   * Compare model definitions vs database schema
   */
  compare: (moduleName: string): Promise<SchemaComparison[]> =>
    apiClient.get(`/api/v1/base/modules/schema/${moduleName}/compare`),

  /**
   * Backup module data
   */
  backup: (moduleName: string): Promise<BackupResult> =>
    apiClient.post(`/api/v1/base/modules/schema/${moduleName}/backup`),

  /**
   * Check all module schemas
   */
  checkAll: (): Promise<SchemaCheckResult[]> =>
    apiClient.get("/api/v1/base/modules/schema/check-all"),

  /**
   * Sync all module schemas
   */
  syncAll: (): Promise<{ success: boolean; results: SchemaCheckResult[] }> =>
    apiClient.post("/api/v1/base/modules/schema/sync-all"),
};

export default schemaApi;
