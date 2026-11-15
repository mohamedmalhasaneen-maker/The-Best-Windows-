import {
  CustomerInfo,
  DoorsPricingConfig,
  PricingConfig,
  QuoteItem,
  SavedArmoredQuote,
  SavedCustomer,
  SavedQuote,
  SavedWpcQuote,
  WpcDoorItem,
  ArmoredDoorItem,
} from '../types';

export const OFFLINE_DB_NAME = 'TBW_OFFLINE_DB_v1';
export const OFFLINE_DB_VERSION = 1;

export type SyncEntityType = 'quote' | 'wpc_quote' | 'armored_quote' | 'customer';
export type SyncActionType = 'upsert' | 'delete';

export interface SyncQueueItem<T = any> {
  opKey: string; // `${entityType}:${recordId}` — guarantees max 1 pending op per entity record
  entityType: SyncEntityType;
  recordId: string;
  action: SyncActionType;
  payload?: T;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  lastError?: string;
}

export interface PvcDraftState {
  key: 'pvc_draft';
  customer: CustomerInfo;
  items: QuoteItem[];
  updatedAt: number;
}

export interface WpcDraftState {
  key: 'wpc_draft';
  customer: CustomerInfo;
  doors: WpcDoorItem[];
  updatedAt: number;
}

export interface ArmoredDraftState {
  key: 'armored_draft';
  customer: CustomerInfo;
  doors: ArmoredDoorItem[];
  updatedAt: number;
}

export interface CachedPricingRecord<T = PricingConfig | DoorsPricingConfig> {
  key: 'pvc' | 'doors';
  data: T;
  cachedAt: number;
}

const STORE_QUOTES = 'quotes';
const STORE_WPC_QUOTES = 'wpc_quotes';
const STORE_ARMORED_QUOTES = 'armored_quotes';
const STORE_CUSTOMERS = 'customers';
const STORE_DRAFTS = 'drafts';
const STORE_PRICING_CACHE = 'pricing_cache';
const STORE_SYNC_QUEUE = 'sync_queue';

const ALL_STORES = [
  STORE_QUOTES,
  STORE_WPC_QUOTES,
  STORE_ARMORED_QUOTES,
  STORE_CUSTOMERS,
  STORE_DRAFTS,
  STORE_PRICING_CACHE,
  STORE_SYNC_QUEUE,
] as const;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function openOfflineDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) {
    return Promise.resolve(null);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_QUOTES)) {
          db.createObjectStore(STORE_QUOTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_WPC_QUOTES)) {
          db.createObjectStore(STORE_WPC_QUOTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_ARMORED_QUOTES)) {
          db.createObjectStore(STORE_ARMORED_QUOTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
          db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.createObjectStore(STORE_DRAFTS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_PRICING_CACHE)) {
          db.createObjectStore(STORE_PRICING_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'opKey' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn('[OfflineDB] Failed to open IndexedDB:', request.error);
        dbPromise = null;
        resolve(null);
      };
    } catch (err) {
      console.warn('[OfflineDB] IndexedDB unavailable:', err);
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openOfflineDb();
  if (!db) return [];
  return new Promise<T[]>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openOfflineDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openOfflineDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openOfflineDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function replaceAllInStore<T extends { id: string }>(
  storeName: string,
  items: T[]
): Promise<void> {
  const db = await openOfflineDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const item of items) {
        if (item && item.id) {
          store.put(item);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------- Pure Sync Queue & Merge Logic (Directly Unit-Testable) ----------

export function buildSyncOpKey(entityType: SyncEntityType, recordId: string): string {
  return `${entityType}:${recordId}`;
}

export function compactSyncOp<T>(
  existingOp: SyncQueueItem<T> | null | undefined,
  incoming: {
    entityType: SyncEntityType;
    recordId: string;
    action: SyncActionType;
    payload?: T;
    now?: number;
  }
): SyncQueueItem<T> {
  const timestamp = incoming.now ?? Date.now();
  const opKey = buildSyncOpKey(incoming.entityType, incoming.recordId);

  if (!existingOp) {
    return {
      opKey,
      entityType: incoming.entityType,
      recordId: incoming.recordId,
      action: incoming.action,
      payload: incoming.action === 'upsert' ? incoming.payload : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      retryCount: 0,
    };
  }

  return {
    opKey,
    entityType: incoming.entityType,
    recordId: incoming.recordId,
    action: incoming.action,
    payload: incoming.action === 'upsert' ? incoming.payload : undefined,
    createdAt: existingOp.createdAt,
    updatedAt: timestamp,
    retryCount: 0,
    lastError: undefined,
  };
}

/**
 * Merges incoming cloud records with current local records while honoring any
 * un-synced offline creations, edits, or deletions stored in `sync_queue`.
 */
export function mergeRecordsWithPendingQueue<T extends { id: string }>(
  cloudRecords: T[],
  localRecords: T[],
  pendingOps: SyncQueueItem[],
  entityType: SyncEntityType
): T[] {
  const relevantOps = pendingOps.filter((op) => op.entityType === entityType);
  const pendingDeleteIds = new Set<string>();
  const pendingUpsertMap = new Map<string, T>();

  for (const op of relevantOps) {
    if (op.action === 'delete') {
      pendingDeleteIds.add(op.recordId);
    } else if (op.action === 'upsert' && op.payload) {
      pendingUpsertMap.set(op.recordId, op.payload as T);
    }
  }

  const mergedMap = new Map<string, T>();

  // 1. Add pending offline upserts first so newest local edits stay at top and never get clobbered
  for (const [id, payload] of pendingUpsertMap.entries()) {
    if (!pendingDeleteIds.has(id)) {
      mergedMap.set(id, payload);
    }
  }

  // 2. Apply authoritative cloud records unless deleted or modified offline in queue
  for (const cloudItem of cloudRecords) {
    if (!cloudItem || !cloudItem.id) continue;
    if (pendingDeleteIds.has(cloudItem.id)) continue;
    if (pendingUpsertMap.has(cloudItem.id)) continue;
    mergedMap.set(cloudItem.id, cloudItem);
  }

  // 3. Preserve any local records that aren't in cloud yet only if cloud list was empty
  if (cloudRecords.length === 0) {
    for (const localItem of localRecords) {
      if (!localItem || !localItem.id) continue;
      if (pendingDeleteIds.has(localItem.id)) continue;
      if (!mergedMap.has(localItem.id)) {
        mergedMap.set(localItem.id, localItem);
      }
    }
  }

  return Array.from(mergedMap.values());
}

// ---------- Record Entity Read/Write Helpers ----------

function entityStoreName(entityType: SyncEntityType): string {
  switch (entityType) {
    case 'quote':
      return STORE_QUOTES;
    case 'wpc_quote':
      return STORE_WPC_QUOTES;
    case 'armored_quote':
      return STORE_ARMORED_QUOTES;
    case 'customer':
      return STORE_CUSTOMERS;
  }
}

export async function getOfflineRecords<T extends { id: string }>(
  entityType: SyncEntityType
): Promise<T[]> {
  return getAllFromStore<T>(entityStoreName(entityType));
}

export async function putOfflineRecord<T extends { id: string }>(
  entityType: SyncEntityType,
  record: T
): Promise<void> {
  await putInStore(entityStoreName(entityType), record);
}

export async function deleteOfflineRecord(
  entityType: SyncEntityType,
  id: string
): Promise<void> {
  await deleteFromStore(entityStoreName(entityType), id);
}

export async function replaceOfflineRecords<T extends { id: string }>(
  entityType: SyncEntityType,
  records: T[]
): Promise<void> {
  await replaceAllInStore(entityStoreName(entityType), records);
}

// ---------- Draft Persistence ----------

export async function saveOfflineDraft(
  draft: PvcDraftState | WpcDraftState | ArmoredDraftState
): Promise<void> {
  await putInStore(STORE_DRAFTS, draft);
}

export async function getOfflineDraft<
  T extends PvcDraftState | WpcDraftState | ArmoredDraftState
>(key: T['key']): Promise<T | null> {
  return getFromStore<T>(STORE_DRAFTS, key);
}

// ---------- Authoritative Pricing Cache ----------

export async function savePricingCache(config: PricingConfig): Promise<void> {
  await putInStore<CachedPricingRecord<PricingConfig>>(STORE_PRICING_CACHE, {
    key: 'pvc',
    data: config,
    cachedAt: Date.now(),
  });
}

export async function getPricingCache(): Promise<CachedPricingRecord<PricingConfig> | null> {
  return getFromStore<CachedPricingRecord<PricingConfig>>(STORE_PRICING_CACHE, 'pvc');
}

export async function saveDoorsPricingCache(config: DoorsPricingConfig): Promise<void> {
  await putInStore<CachedPricingRecord<DoorsPricingConfig>>(STORE_PRICING_CACHE, {
    key: 'doors',
    data: config,
    cachedAt: Date.now(),
  });
}

export async function getDoorsPricingCache(): Promise<CachedPricingRecord<DoorsPricingConfig> | null> {
  return getFromStore<CachedPricingRecord<DoorsPricingConfig>>(STORE_PRICING_CACHE, 'doors');
}

// ---------- Sync Queue Store API ----------

export async function getAllSyncOps(): Promise<SyncQueueItem[]> {
  const ops = await getAllFromStore<SyncQueueItem>(STORE_SYNC_QUEUE);
  return ops.sort((a, b) => a.updatedAt - b.updatedAt);
}

export async function enqueueSyncOp<T>(input: {
  entityType: SyncEntityType;
  recordId: string;
  action: SyncActionType;
  payload?: T;
}): Promise<SyncQueueItem<T>> {
  const opKey = buildSyncOpKey(input.entityType, input.recordId);
  const existing = await getFromStore<SyncQueueItem<T>>(STORE_SYNC_QUEUE, opKey);
  const compacted = compactSyncOp(existing, input);
  await putInStore(STORE_SYNC_QUEUE, compacted);
  return compacted;
}

export async function removeSyncOp(opKey: string): Promise<void> {
  await deleteFromStore(STORE_SYNC_QUEUE, opKey);
}

export interface SyncQueueExecutor {
  saveQuote: (q: SavedQuote) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  saveWpcQuote: (q: SavedWpcQuote) => Promise<void>;
  deleteWpcQuote: (id: string) => Promise<void>;
  saveArmoredQuote: (q: SavedArmoredQuote) => Promise<void>;
  deleteArmoredQuote: (id: string) => Promise<void>;
  saveCustomer: (c: SavedCustomer) => Promise<SavedCustomer | void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export interface SyncFlushResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

export async function runSingleSyncOp(
  op: SyncQueueItem,
  executor: SyncQueueExecutor
): Promise<void> {
  switch (op.entityType) {
    case 'quote':
      if (op.action === 'upsert' && op.payload) {
        await executor.saveQuote(op.payload as SavedQuote);
      } else if (op.action === 'delete') {
        await executor.deleteQuote(op.recordId);
      }
      return;
    case 'wpc_quote':
      if (op.action === 'upsert' && op.payload) {
        await executor.saveWpcQuote(op.payload as SavedWpcQuote);
      } else if (op.action === 'delete') {
        await executor.deleteWpcQuote(op.recordId);
      }
      return;
    case 'armored_quote':
      if (op.action === 'upsert' && op.payload) {
        await executor.saveArmoredQuote(op.payload as SavedArmoredQuote);
      } else if (op.action === 'delete') {
        await executor.deleteArmoredQuote(op.recordId);
      }
      return;
    case 'customer':
      if (op.action === 'upsert' && op.payload) {
        await executor.saveCustomer(op.payload as SavedCustomer);
      } else if (op.action === 'delete') {
        await executor.deleteCustomer(op.recordId);
      }
      return;
  }
}

export async function flushSyncQueue(executor: SyncQueueExecutor): Promise<SyncFlushResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const pending = await getAllSyncOps();
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      remaining: pending.length,
    };
  }

  const queue = await getAllSyncOps();
  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, remaining: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      await runSingleSyncOp(op, executor);
      await removeSyncOp(op.opKey);
      succeeded++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await putInStore(STORE_SYNC_QUEUE, {
        ...op,
        retryCount: (op.retryCount || 0) + 1,
        lastError: message,
      });
    }
  }

  const remaining = (await getAllSyncOps()).length;
  return {
    processed: queue.length,
    succeeded,
    failed,
    remaining,
  };
}

// ---------- Initial Hydration & One-Time localStorage Migration ----------

function readLegacyJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function migrateLegacyLocalStorageToIndexedDb(): Promise<void> {
  const db = await openOfflineDb();
  if (!db) return;

  const [existingQuotes, existingWpc, existingArmored, existingCustomers] = await Promise.all([
    getAllFromStore<SavedQuote>(STORE_QUOTES),
    getAllFromStore<SavedWpcQuote>(STORE_WPC_QUOTES),
    getAllFromStore<SavedArmoredQuote>(STORE_ARMORED_QUOTES),
    getAllFromStore<SavedCustomer>(STORE_CUSTOMERS),
  ]);

  if (existingQuotes.length === 0) {
    const legacyQuotes = readLegacyJson<SavedQuote[]>('almekawy_saved_quotes');
    if (Array.isArray(legacyQuotes) && legacyQuotes.length > 0) {
      await replaceAllInStore(STORE_QUOTES, legacyQuotes);
    }
  }

  if (existingWpc.length === 0) {
    const legacyWpc = readLegacyJson<SavedWpcQuote[]>('almekawy_saved_wpc_quotes');
    if (Array.isArray(legacyWpc) && legacyWpc.length > 0) {
      await replaceAllInStore(STORE_WPC_QUOTES, legacyWpc);
    }
  }

  if (existingArmored.length === 0) {
    const legacyArmored = readLegacyJson<SavedArmoredQuote[]>('almekawy_saved_armored_quotes');
    if (Array.isArray(legacyArmored) && legacyArmored.length > 0) {
      await replaceAllInStore(STORE_ARMORED_QUOTES, legacyArmored);
    }
  }

  if (existingCustomers.length === 0) {
    const legacyCustomers = readLegacyJson<SavedCustomer[]>('almekawy_saved_customers');
    if (Array.isArray(legacyCustomers) && legacyCustomers.length > 0) {
      await replaceAllInStore(STORE_CUSTOMERS, legacyCustomers);
    }
  }
}

export function isOfflineStoreReady(): boolean {
  return ALL_STORES.length === 7;
}
