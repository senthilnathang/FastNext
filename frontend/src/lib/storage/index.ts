/**
 * Storage Module
 *
 * Provides offline storage capabilities using IndexedDB
 */

export {
  IndexedDBStorage,
  getStorage,
  createStorage,
  type StorageConfig,
  type StoreConfig,
  type IndexConfig,
  type StoredItem,
  type QueryOptions,
  type MigrationContext,
  type MigrationHandler,
} from "./indexedDB";
