/**
 * Remote Modules API Client
 * Matches backend API schema
 */

import { apiClient } from "./client";

// Types matching backend

export interface RemoteSource {
  name: string;
  type: string;
  url: string;
  token?: string | null;
  last_sync?: string | null;
  created_at: string;
}

export interface RemoteModule {
  name: string;
  display_name: string;
  version: string;
  source: string;
  description?: string | null;
  available_version?: string | null;
}

export interface SyncStatus {
  module_name: string;
  source: string;
  status: string;
  last_sync?: string | null;
  error?: string | null;
}

export interface AddSourceData {
  name: string;
  type: string;
  url: string;
  token?: string;
}

// API Functions
export const remoteModulesApi = {
  /**
   * List all remote sources
   */
  listSources: (): Promise<RemoteSource[]> =>
    apiClient.get("/api/v1/base/remote-modules/sources"),

  /**
   * Add a new remote source
   */
  addSource: (data: AddSourceData): Promise<RemoteSource> =>
    apiClient.post("/api/v1/base/remote-modules/sources", data),

  /**
   * Remove a remote source by name
   */
  removeSource: (name: string): Promise<{ message: string }> =>
    apiClient.delete(`/api/v1/base/remote-modules/sources/${name}`),

  /**
   * Discover modules from all remote sources
   */
  discover: (): Promise<RemoteModule[]> =>
    apiClient.get("/api/v1/base/remote-modules/discover"),

  /**
   * Sync a specific module from its remote source
   */
  syncModule: (moduleName: string): Promise<SyncStatus> =>
    apiClient.post(`/api/v1/base/remote-modules/sync/${moduleName}`),

  /**
   * Sync all modules from all remote sources
   */
  syncAll: (): Promise<SyncStatus[]> =>
    apiClient.post("/api/v1/base/remote-modules/sync-all"),

  /**
   * Get sync status for a specific module
   */
  getStatus: (moduleName: string): Promise<SyncStatus> =>
    apiClient.get(`/api/v1/base/remote-modules/status/${moduleName}`),

  /**
   * Get sync statuses for all modules
   */
  getAllStatuses: (): Promise<SyncStatus[]> =>
    apiClient.get("/api/v1/base/remote-modules/status"),

  /**
   * Get supported source types
   */
  getSourceTypes: (): Promise<string[]> =>
    apiClient.get("/api/v1/base/remote-modules/source-types"),
};

export default remoteModulesApi;
