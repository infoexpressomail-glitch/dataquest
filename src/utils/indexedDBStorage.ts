import { Survey } from '../types';

const DB_NAME = 'dataquest_survey_cache_v1';
const DB_VERSION = 1;

export const STORES = {
  CURRENT_DRAFT: 'current_survey_draft',
  OFFLINE_SURVEYS: 'offline_surveys_store',
  SYNC_LOGS: 'supabase_sync_logs',
};

export interface CachedSurveyDraft {
  id: string;
  survey: Survey;
  step: number;
  updatedAt: string;
  isOfflineModified: boolean;
  syncedToSupabase: boolean;
}

export interface OfflineStoredSurvey {
  id: string;
  survey: Survey;
  savedAt: string;
  pendingSync: boolean;
  lastSyncAttempt?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: string;
  status: 'success' | 'failed' | 'offline_queued';
  details: string;
}

// In-memory fallback in case indexedDB is disabled
const memoryFallback: {
  draft: CachedSurveyDraft | null;
  offlineSurveys: Map<string, OfflineStoredSurvey>;
  logs: SyncLogEntry[];
} = {
  draft: null,
  offlineSurveys: new Map(),
  logs: [],
};

// Open database with promise
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.CURRENT_DRAFT)) {
        db.createObjectStore(STORES.CURRENT_DRAFT, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.OFFLINE_SURVEYS)) {
        db.createObjectStore(STORES.OFFLINE_SURVEYS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_LOGS)) {
        db.createObjectStore(STORES.SYNC_LOGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Falha ao abrir IndexedDB'));
    };
  });
}

// ==========================================
// 1. Current Survey Draft Operations
// ==========================================

export async function saveCurrentSurveyDraftToDB(
  survey: Survey,
  step = 1,
  isOfflineModified = false
): Promise<CachedSurveyDraft> {
  const draftData: CachedSurveyDraft = {
    id: 'active_current_draft',
    survey,
    step,
    updatedAt: new Date().toISOString(),
    isOfflineModified,
    syncedToSupabase: !isOfflineModified,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.CURRENT_DRAFT], 'readwrite');
      const store = transaction.objectStore(STORES.CURRENT_DRAFT);
      const putRequest = store.put(draftData);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback para armazenamento em memória do rascunho:', err);
    memoryFallback.draft = draftData;
    try {
      localStorage.setItem('dataquest_fallback_current_draft', JSON.stringify(draftData));
    } catch {
      // ignore
    }
  }

  return draftData;
}

export async function getCurrentSurveyDraftFromDB(): Promise<CachedSurveyDraft | null> {
  try {
    const db = await openDB();
    return await new Promise<CachedSurveyDraft | null>((resolve, reject) => {
      const transaction = db.transaction([STORES.CURRENT_DRAFT], 'readonly');
      const store = transaction.objectStore(STORES.CURRENT_DRAFT);
      const getRequest = store.get('active_current_draft');

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback para leitura em memória do rascunho:', err);
    if (memoryFallback.draft) return memoryFallback.draft;
    try {
      const saved = localStorage.getItem('dataquest_fallback_current_draft');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }
}

export async function clearCurrentSurveyDraftFromDB(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.CURRENT_DRAFT], 'readwrite');
      const store = transaction.objectStore(STORES.CURRENT_DRAFT);
      const deleteRequest = store.delete('active_current_draft');

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback para limpeza de rascunho:', err);
  } finally {
    memoryFallback.draft = null;
    try {
      localStorage.removeItem('dataquest_fallback_current_draft');
    } catch {
      // ignore
    }
  }
}

// ==========================================
// 2. Offline Surveys Queue in IndexedDB
// ==========================================

export async function saveOfflineSurveyToDB(survey: Survey): Promise<void> {
  const item: OfflineStoredSurvey = {
    id: survey.id,
    survey,
    savedAt: new Date().toISOString(),
    pendingSync: true,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.OFFLINE_SURVEYS], 'readwrite');
      const store = transaction.objectStore(STORES.OFFLINE_SURVEYS);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback saveOfflineSurveyToDB:', err);
    memoryFallback.offlineSurveys.set(survey.id, item);
  }
}

export async function getAllPendingOfflineSurveysFromDB(): Promise<OfflineStoredSurvey[]> {
  try {
    const db = await openDB();
    return await new Promise<OfflineStoredSurvey[]>((resolve, reject) => {
      const transaction = db.transaction([STORES.OFFLINE_SURVEYS], 'readonly');
      const store = transaction.objectStore(STORES.OFFLINE_SURVEYS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []) as OfflineStoredSurvey[];
        resolve(results.filter((i) => i.pendingSync));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback getAllPendingOfflineSurveysFromDB:', err);
    return Array.from(memoryFallback.offlineSurveys.values()).filter((i) => i.pendingSync);
  }
}

export async function markSurveySyncedInDB(surveyId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.OFFLINE_SURVEYS], 'readwrite');
      const store = transaction.objectStore(STORES.OFFLINE_SURVEYS);
      const getReq = store.get(surveyId);

      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated: OfflineStoredSurvey = {
            ...getReq.result,
            pendingSync: false,
            lastSyncAttempt: new Date().toISOString(),
          };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback markSurveySyncedInDB:', err);
    const item = memoryFallback.offlineSurveys.get(surveyId);
    if (item) {
      item.pendingSync = false;
      item.lastSyncAttempt = new Date().toISOString();
    }
  }
}

export async function removeOfflineSurveyFromDB(surveyId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.OFFLINE_SURVEYS], 'readwrite');
      const store = transaction.objectStore(STORES.OFFLINE_SURVEYS);
      const req = store.delete(surveyId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback removeOfflineSurveyFromDB:', err);
    memoryFallback.offlineSurveys.delete(surveyId);
  }
}

// ==========================================
// 3. Supabase Sync Logs in IndexedDB
// ==========================================

export async function logSyncEventToDB(event: {
  type: string;
  status: 'success' | 'failed' | 'offline_queued';
  details: string;
}): Promise<SyncLogEntry> {
  const entry: SyncLogEntry = {
    id: `sync_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_LOGS], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_LOGS);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback logSyncEventToDB:', err);
    memoryFallback.logs.unshift(entry);
  }

  return entry;
}

export async function getSyncLogsFromDB(limit = 20): Promise<SyncLogEntry[]> {
  try {
    const db = await openDB();
    return await new Promise<SyncLogEntry[]>((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_LOGS], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_LOGS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []) as SyncLogEntry[];
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(results.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback getSyncLogsFromDB:', err);
    return memoryFallback.logs.slice(0, limit);
  }
}
