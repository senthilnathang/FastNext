/**
 * IndexedDB Storage Utility
 *
 * Provides a robust wrapper around IndexedDB for offline data storage
 * with CRUD operations, data versioning, and migration support.
 */

// ============================================
// Types and Interfaces
// ============================================

export interface StorageConfig {
  /** Database name */
  dbName: string;
  /** Database version */
  version: number;
  /** Store configurations */
  stores: StoreConfig[];
}

export interface StoreConfig {
  /** Object store name */
  name: string;
  /** Key path for objects */
  keyPath: string;
  /** Whether to auto-increment keys */
  autoIncrement?: boolean;
  /** Index configurations */
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  /** Index name */
  name: string;
  /** Key path(s) for the index */
  keyPath: string | string[];
  /** Index options */
  options?: IDBIndexParameters;
}

export interface StoredItem<T = unknown> {
  /** Unique identifier */
  id: string;
  /** The actual data */
  data: T;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Version number for conflict detection */
  version: number;
  /** Sync status */
  syncStatus: "synced" | "pending" | "conflict" | "error";
  /** Last sync timestamp */
  lastSyncedAt?: number;
  /** Metadata */
  meta?: Record<string, unknown>;
}

export interface QueryOptions {
  /** Index to use for the query */
  index?: string;
  /** Lower bound of the range */
  lowerBound?: IDBValidKey;
  /** Upper bound of the range */
  upperBound?: IDBValidKey;
  /** Whether lower bound is open */
  lowerOpen?: boolean;
  /** Whether upper bound is open */
  upperOpen?: boolean;
  /** Direction of cursor iteration */
  direction?: IDBCursorDirection;
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
  /** Filter function */
  filter?: (item: unknown) => boolean;
}

export interface MigrationContext {
  oldVersion: number;
  newVersion: number;
  db: IDBDatabase;
  transaction: IDBTransaction;
}

export type MigrationHandler = (context: MigrationContext) => void | Promise<void>;

// ============================================
// IndexedDB Storage Class
// ============================================

export class IndexedDBStorage {
  private dbName: string;
  private version: number;
  private stores: StoreConfig[];
  private db: IDBDatabase | null = null;
  private migrations: Map<number, MigrationHandler> = new Map();
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(config: StorageConfig) {
    this.dbName = config.dbName;
    this.version = config.version;
    this.stores = config.stores;
  }

  /**
   * Register a migration handler for a specific version
   */
  registerMigration(version: number, handler: MigrationHandler): this {
    this.migrations.set(version, handler);
    return this;
  }

  /**
   * Initialize the database connection
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not supported in this environment"));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onerror = (event) => {
          console.error("[IndexedDB] Database error:", event);
        };
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const transaction = request.transaction!;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || this.version;

        // Create or update object stores
        for (const store of this.stores) {
          let objectStore: IDBObjectStore;

          if (!db.objectStoreNames.contains(store.name)) {
            objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement,
            });
          } else {
            objectStore = transaction.objectStore(store.name);
          }

          // Create indexes
          if (store.indexes) {
            for (const index of store.indexes) {
              if (!objectStore.indexNames.contains(index.name)) {
                objectStore.createIndex(index.name, index.keyPath, index.options);
              }
            }
          }
        }

        // Run migrations
        for (let v = oldVersion + 1; v <= newVersion; v++) {
          const migration = this.migrations.get(v);
          if (migration) {
            try {
              migration({ oldVersion, newVersion, db, transaction });
            } catch (error) {
              console.error(`[IndexedDB] Migration to v${v} failed:`, error);
            }
          }
        }
      };

      request.onblocked = () => {
        console.warn("[IndexedDB] Database upgrade blocked. Close other tabs using this database.");
      };
    });

    return this.initPromise;
  }

  /**
   * Get the database connection
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      request.onblocked = () => {
        console.warn("[IndexedDB] Delete blocked. Close other tabs using this database.");
      };
    });
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new item
   */
  async create<T>(
    storeName: string,
    data: T,
    id?: string,
  ): Promise<StoredItem<T>> {
    const db = await this.getDB();
    const now = Date.now();

    const item: StoredItem<T> = {
      id: id || this.generateId(),
      data,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onerror = () => {
        reject(new Error(`Failed to create item: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(item);
      };
    });
  }

  /**
   * Read an item by ID
   */
  async read<T>(storeName: string, id: string): Promise<StoredItem<T> | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to read item: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Update an existing item
   */
  async update<T>(
    storeName: string,
    id: string,
    data: Partial<T>,
    options?: { incrementVersion?: boolean },
  ): Promise<StoredItem<T> | null> {
    const db = await this.getDB();
    const existing = await this.read<T>(storeName, id);

    if (!existing) {
      return null;
    }

    const updated: StoredItem<T> = {
      ...existing,
      data: { ...existing.data, ...data } as T,
      updatedAt: Date.now(),
      version: options?.incrementVersion !== false ? existing.version + 1 : existing.version,
      syncStatus: "pending",
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(updated);

      request.onerror = () => {
        reject(new Error(`Failed to update item: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(updated);
      };
    });
  }

  /**
   * Delete an item by ID
   */
  async delete(storeName: string, id: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete item: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  /**
   * Put an item (upsert)
   */
  async put<T>(storeName: string, item: StoredItem<T>): Promise<StoredItem<T>> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onerror = () => {
        reject(new Error(`Failed to put item: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(item);
      };
    });
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: string): Promise<StoredItem<T>[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all items: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Query items with options
   */
  async query<T>(storeName: string, options: QueryOptions = {}): Promise<StoredItem<T>[]> {
    const db = await this.getDB();
    const results: StoredItem<T>[] = [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      let source: IDBObjectStore | IDBIndex = store;

      if (options.index) {
        source = store.index(options.index);
      }

      let range: IDBKeyRange | null = null;

      if (options.lowerBound !== undefined && options.upperBound !== undefined) {
        range = IDBKeyRange.bound(
          options.lowerBound,
          options.upperBound,
          options.lowerOpen,
          options.upperOpen,
        );
      } else if (options.lowerBound !== undefined) {
        range = IDBKeyRange.lowerBound(options.lowerBound, options.lowerOpen);
      } else if (options.upperBound !== undefined) {
        range = IDBKeyRange.upperBound(options.upperBound, options.upperOpen);
      }

      const request = source.openCursor(range, options.direction);
      let skipped = 0;

      request.onerror = () => {
        reject(new Error(`Failed to query items: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor) {
          const value = cursor.value as StoredItem<T>;

          // Apply offset
          if (options.offset && skipped < options.offset) {
            skipped++;
            cursor.continue();
            return;
          }

          // Apply limit
          if (options.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }

          // Apply filter
          if (!options.filter || options.filter(value)) {
            results.push(value);
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * Count items in a store
   */
  async count(storeName: string, index?: string): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const source = index ? store.index(index) : store;
      const request = source.count();

      request.onerror = () => {
        reject(new Error(`Failed to count items: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Clear all items from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Get all items pending sync
   */
  async getPendingSync<T>(storeName: string): Promise<StoredItem<T>[]> {
    return this.query<T>(storeName, {
      index: "syncStatus",
      lowerBound: "pending",
      upperBound: "pending",
    });
  }

  /**
   * Mark item as synced
   */
  async markSynced(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    const existing = await this.read(storeName, id);

    if (!existing) {
      return;
    }

    const updated = {
      ...existing,
      syncStatus: "synced" as const,
      lastSyncedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(updated);

      request.onerror = () => {
        reject(new Error(`Failed to mark as synced: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Mark item as having a conflict
   */
  async markConflict<T>(
    storeName: string,
    id: string,
    serverData?: T,
  ): Promise<void> {
    const db = await this.getDB();
    const existing = await this.read<T>(storeName, id);

    if (!existing) {
      return;
    }

    const updated: StoredItem<T> = {
      ...existing,
      syncStatus: "conflict",
      meta: {
        ...existing.meta,
        serverData,
        conflictAt: Date.now(),
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(updated);

      request.onerror = () => {
        reject(new Error(`Failed to mark conflict: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict<T>(
    storeName: string,
    id: string,
    resolution: "local" | "server" | "merged",
    mergedData?: T,
  ): Promise<StoredItem<T> | null> {
    const existing = await this.read<T>(storeName, id);

    if (!existing || existing.syncStatus !== "conflict") {
      return null;
    }

    let data: T;

    switch (resolution) {
      case "local":
        data = existing.data;
        break;
      case "server":
        data = existing.meta?.serverData as T;
        break;
      case "merged":
        if (!mergedData) {
          throw new Error("Merged data required for merged resolution");
        }
        data = mergedData;
        break;
    }

    const updated: StoredItem<T> = {
      ...existing,
      data,
      version: existing.version + 1,
      updatedAt: Date.now(),
      syncStatus: "pending",
      meta: {
        ...existing.meta,
        serverData: undefined,
        conflictAt: undefined,
        resolvedAt: Date.now(),
        resolution,
      },
    };

    return this.put(storeName, updated);
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Batch create items
   */
  async batchCreate<T>(
    storeName: string,
    items: { data: T; id?: string }[],
  ): Promise<StoredItem<T>[]> {
    const db = await this.getDB();
    const now = Date.now();

    const storedItems: StoredItem<T>[] = items.map((item) => ({
      id: item.id || this.generateId(),
      data: item.data,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending" as const,
    }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;

      transaction.onerror = () => {
        reject(new Error(`Batch create failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve(storedItems);
      };

      for (const item of storedItems) {
        const request = store.add(item);
        request.onsuccess = () => {
          completed++;
        };
      }
    });
  }

  /**
   * Batch delete items
   */
  async batchDelete(storeName: string, ids: string[]): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      let deleted = 0;

      transaction.onerror = () => {
        reject(new Error(`Batch delete failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve(deleted);
      };

      for (const id of ids) {
        const request = store.delete(id);
        request.onsuccess = () => {
          deleted++;
        };
      }
    });
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Check if the database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get store names
   */
  getStoreNames(): string[] {
    return this.stores.map((s) => s.name);
  }

  /**
   * Export all data from a store
   */
  async exportStore<T>(storeName: string): Promise<StoredItem<T>[]> {
    return this.getAll<T>(storeName);
  }

  /**
   * Import data into a store
   */
  async importStore<T>(
    storeName: string,
    items: StoredItem<T>[],
    options?: { clearFirst?: boolean },
  ): Promise<void> {
    if (options?.clearFirst) {
      await this.clear(storeName);
    }

    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => {
        reject(new Error(`Import failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const item of items) {
        store.put(item);
      }
    });
  }
}

// ============================================
// Default Storage Instance
// ============================================

const DEFAULT_CONFIG: StorageConfig = {
  dbName: "fastnext-offline",
  version: 1,
  stores: [
    {
      name: "offline-data",
      keyPath: "id",
      indexes: [
        { name: "syncStatus", keyPath: "syncStatus" },
        { name: "updatedAt", keyPath: "updatedAt" },
        { name: "createdAt", keyPath: "createdAt" },
      ],
    },
    {
      name: "offline-queue",
      keyPath: "id",
      autoIncrement: true,
      indexes: [
        { name: "timestamp", keyPath: "timestamp" },
        { name: "url", keyPath: "url" },
      ],
    },
    {
      name: "cache-metadata",
      keyPath: "key",
      indexes: [
        { name: "expiresAt", keyPath: "expiresAt" },
      ],
    },
  ],
};

let defaultStorage: IndexedDBStorage | null = null;

/**
 * Get the default storage instance
 */
export function getStorage(): IndexedDBStorage {
  if (!defaultStorage) {
    defaultStorage = new IndexedDBStorage(DEFAULT_CONFIG);
  }
  return defaultStorage;
}

/**
 * Create a custom storage instance
 */
export function createStorage(config: StorageConfig): IndexedDBStorage {
  return new IndexedDBStorage(config);
}

export default IndexedDBStorage;
