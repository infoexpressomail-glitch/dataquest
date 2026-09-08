import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AccessProfile,
  Collaborator,
  Survey,
  InterviewSubmission,
  RecentConnection,
  ExternalImport,
  Language,
  AccessPolicyPermissions,
  ActionAuditLog,
  FieldChange,
  OfflineSyncItem,
  SyncProgressState,
  SyncProgressItem,
  GlobalDemographicTarget,
  ResearcherQuotaAssignment,
  AnalyticalReport,
} from '../types';
import {
  initialProfiles,
  initialCollaborators,
  initialSurveys,
  initialSubmissions,
  initialConnections,
  initialImports,
  initialAuditLogs,
  initialAnalyticalReports,
} from '../mockData';
import { generateIntegrityHash, diffSurveys } from '../utils/auditUtils';
import {
  saveCurrentSurveyDraftToDB,
  getCurrentSurveyDraftFromDB,
  clearCurrentSurveyDraftFromDB,
  saveOfflineSurveyToDB,
  getAllPendingOfflineSurveysFromDB,
  markSurveySyncedInDB,
} from '../utils/indexedDBStorage';
import {
  syncSurveyToSupabase,
  syncBatchSurveysToSupabase,
  isSupabaseConfigured,
} from '../services/supabaseSyncService';
import {
  fetchServerSurveys,
  syncSurveyWithServer,
  uploadSurveyToServer,
  checkServerHealth,
} from '../services/serverSurveyService';
import { ServerSyncCheckResult } from '../types';
import { saveCollaboratorToServer } from '../services/serverCollaboratorService';

interface AppContextType {
  isAuthenticated: boolean;
  login: (loginInput: string, senhaInput: string) => { success: boolean; error?: string };
  logout: () => void;
  language: Language;
  setLanguage: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentUser: Collaborator;
  setCurrentUser: (c: Collaborator) => void;
  currentProfile: AccessProfile;
  twoFactorVerified: boolean;
  setTwoFactorVerified: (v: boolean) => void;
  verify2FA: (code: string) => boolean;
  profiles: AccessProfile[];
  updateProfile: (p: AccessProfile) => void;
  collaborators: Collaborator[];
  saveCollaborator: (c: Collaborator, senha?: string) => Promise<boolean>;
  toggleCollaboratorStatus: (id: string) => void;
  surveys: Survey[];
  saveSurvey: (s: Survey) => void;
  replicateSurvey: (surveyId: string) => Survey;
  toggleSurveyStatus: (surveyId: string) => void;
  finalizeSurvey: (surveyId: string) => void; // marca como concluída (finalizada) pela coordenação
  reopenSurvey: (surveyId: string) => void;   // volta a status ativa
  setSurveyReEnabledForResearcher: (surveyId: string, researcherId: string, enabled: boolean) => void;
  deleteSurvey: (surveyId: string) => void;
  restoreSurvey: (surveyId: string) => void;
  submissions: InterviewSubmission[];
  addSubmission: (sub: InterviewSubmission) => void;
  updateSubmissionAnswers: (
    submissionId: string,
    answers: { perguntaId: string; resposta: string | string[] }[],
    motivo: string
  ) => void;
  deleteSubmission: (id: string) => void;
  connections: RecentConnection[];
  imports: ExternalImport[];
  addImport: (imp: ExternalImport) => void;
  deleteImport: (id: string) => void;
  auditLogs: ActionAuditLog[];
  addAuditLog: (
    log: Omit<ActionAuditLog, 'id' | 'timestamp' | 'hashIntegridade'> & {
      hashIntegridade?: string;
      timestamp?: string;
    }
  ) => ActionAuditLog;
  clearAuditLogs: () => void;
  analyticalReports: AnalyticalReport[];
  saveAnalyticalReport: (report: AnalyticalReport) => void;
  deleteAnalyticalReport: (reportId: string) => void;
  activeModule: string;
  setActiveModule: (m: string) => void;
  editingSurvey: Survey | null;
  setEditingSurvey: (s: Survey | null) => void;
  filterSurveyId: string;
  setFilterSurveyId: (id: string) => void;
  hasPermission: (perm: keyof AccessPolicyPermissions) => boolean;
  resetToDefaults: () => void;

  // Offline & Synchronization
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  offlineQueue: OfflineSyncItem[];
  addOfflineItem: (item: Omit<OfflineSyncItem, 'id' | 'dataCriacao' | 'status'>) => OfflineSyncItem;
  removeOfflineItem: (id: string) => void;
  clearOfflineQueue: () => void;
  syncOfflineQueue: () => Promise<{ success: boolean; count: number; message: string }>;

  // IndexedDB Cache & Supabase Sync
  currentSurveyDraft: Survey | null;
  currentSurveyDraftStep: number;
  lastIndexedDBSave: string | null;
  supabaseSyncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  lastSupabaseSync: string | null;
  pendingIndexedDbCount: number;
  saveCurrentSurveyDraft: (survey: Survey, step?: number) => Promise<void>;
  loadCurrentSurveyDraft: () => Promise<Survey | null>;
  clearCurrentSurveyDraft: () => Promise<void>;
  syncAllPendingWithSupabase: () => Promise<{ success: boolean; count: number; message: string }>;
  isSupabaseLive: boolean;
  lastAutoSyncNotice: string | null;
  setLastAutoSyncNotice: (notice: string | null) => void;

  // Connection Monitor & Real-time Progress Tracking
  connectionState: 'online' | 'offline' | 'reconnecting' | 'syncing';
  syncProgress: SyncProgressState;
  dismissSyncProgress: () => void;
  forceSyncPendingWithSupabase: (isAutoTriggered?: boolean) => Promise<{ success: boolean; count: number; message: string }>;
  checkConnectionNow: () => Promise<boolean>;

  // Bulk operations
  bulkUpdateSurveysStatus: (ids: string[], status: 'ativa' | 'inativa') => void;
  bulkDeleteSurveys: (ids: string[]) => void;
  bulkReplicateSurveys: (ids: string[]) => Survey[];
  bulkUpdateCollaboratorsStatus: (ids: string[], ativo: boolean) => void;
  bulkUpdateCollaboratorsProfile: (ids: string[], perfilId: string) => void;
  bulkDeleteCollaborators: (ids: string[]) => void;
  bulkAssignCollaboratorsToSurveys: (colabIds: string[], surveyIds: string[]) => void;

  // Global Demographic Goals Management
  saveGlobalTarget: (surveyId: string, target: GlobalDemographicTarget) => void;
  deleteGlobalTarget: (surveyId: string, targetId: string) => void;
  assignResearcherQuota: (surveyId: string, targetId: string, assignment: ResearcherQuotaAssignment) => void;

  // Central Server Synchronization
  serverOnline: boolean;
  isSurveyInProgress: (survey: Survey) => boolean;
  syncSurveyWithCentralServer: (surveyId: string, clientDraft?: Partial<Survey>) => Promise<ServerSyncCheckResult>;
  uploadSurveyChangesToCentralServer: (survey: Survey, syncToken?: string) => Promise<{ success: boolean; survey?: Survey; message: string; requiresSync?: boolean }>;
  refreshSurveysFromServer: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  LANGUAGE: 'dataquest_lang',
  DARK_MODE: 'dataquest_dark',
  PROFILES: 'dataquest_profiles_v1',
  COLLABORATORS: 'dataquest_collaborators_v1',
  SURVEYS: 'dataquest_surveys_v1',
  SUBMISSIONS: 'dataquest_submissions_v1',
  IMPORTS: 'dataquest_imports_v1',
  CURRENT_USER_ID: 'dataquest_user_id',
  AUDIT_LOGS: 'dataquest_audit_logs_v1',
  ANALYTICAL_REPORTS: 'dataquest_analytical_reports_v1',
  OFFLINE_QUEUE: 'dataquest_offline_sync_queue',
  SIMULATED_OFFLINE: 'dataquest_simulated_offline',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'pt';
  });

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return stored !== null ? stored === 'true' : true;
  });

  const [profiles, setProfiles] = useState<AccessProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!saved) return initialProfiles;
    try {
      const parsed: AccessProfile[] = JSON.parse(saved);
      return parsed.map((p) => {
        const init = initialProfiles.find((x) => x.id === p.id);
        return {
          ...p,
          permissions: {
            ...(init ? init.permissions : {}),
            ...p.permissions,
            meta_acesso: p.id === 'prof_pesq' ? true : p.permissions.meta_acesso,
          },
        };
      });
    } catch {
      return initialProfiles;
    }
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLLABORATORS);
    return saved ? JSON.parse(saved) : initialCollaborators;
  });

  const [currentUser, setCurrentUser] = useState<Collaborator>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedId) {
      const found = initialCollaborators.find((c) => c.id === savedId);
      if (found) return found;
    }
    return initialCollaborators[0]; // Admin Master
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('dataquest_auth_session') === 'true';
  });

  const [twoFactorVerified, setTwoFactorVerified] = useState<boolean>(true);

  const [surveys, setSurveys] = useState<Survey[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SURVEYS);
    if (!saved) return initialSurveys;
    try {
      const parsed: Survey[] = JSON.parse(saved);
      return parsed.map((s) => {
        const init = initialSurveys.find((x) => x.id === s.id);
        return {
          ...s,
          metasGlobais: s.metasGlobais && s.metasGlobais.length > 0 ? s.metasGlobais : init?.metasGlobais || [],
        };
      });
    } catch {
      return initialSurveys;
    }
  });

  const [submissions, setSubmissions] = useState<InterviewSubmission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return saved ? JSON.parse(saved) : initialSubmissions;
  });

  const [connections] = useState<RecentConnection[]>(initialConnections);

  const [imports, setImports] = useState<ExternalImport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IMPORTS);
    return saved ? JSON.parse(saved) : initialImports;
  });

  const [auditLogs, setAuditLogs] = useState<ActionAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (!saved) return initialAuditLogs;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return initialAuditLogs;
      return parsed.map((l: any) => ({
        ...l,
        autor: l.autor || {
          id: l.usuarioId || 'sys',
          nome: l.usuarioNome || 'Usuário do Sistema',
          login: l.usuarioLogin || 'usuario',
          perfil: l.usuarioPerfil || 'Operador',
        },
        alvo: {
          tipo: l.alvo?.tipo || 'sistema',
          id: l.alvo?.id || l.registroId || 'sys',
          identificador: l.alvo?.identificador || l.registroId || 'REG-SISTEMA',
          nome: l.alvo?.nome || l.detalhes || '',
        },
      }));
    } catch {
      return initialAuditLogs;
    }
  });

  const [analyticalReports, setAnalyticalReports] = useState<AnalyticalReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANALYTICAL_REPORTS);
      if (!saved) return initialAnalyticalReports;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialAnalyticalReports;
    } catch {
      return initialAnalyticalReports;
    }
  });

  const [activeModule, setActiveModule] = useState<string>('home');
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [filterSurveyId, setFilterSurveyId] = useState<string>('all');

  // Offline & Synchronization State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  });

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Connection State Monitor ('online' | 'offline' | 'reconnecting' | 'syncing')
  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'reconnecting' | 'syncing'>(() => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const simulatedOff = localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
    return online && !simulatedOff ? 'online' : 'offline';
  });

  // Real-time Sync Progress Notification State
  const [syncProgress, setSyncProgress] = useState<SyncProgressState>({
    isActive: false,
    phase: 'idle',
    current: 0,
    total: 0,
    percent: 0,
    message: '',
    syncedItems: [],
  });

  const dismissSyncProgress = () => {
    setSyncProgress((prev) => ({ ...prev, isActive: false, phase: 'idle' }));
  };

  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });

  // Connection Status Monitor utilizing navigator.onLine, window events and polling
  useEffect(() => {
    const handleOnline = () => {
      const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      console.log('[ConnectionMonitor] Evento "online" disparado pelo navegador. navigator.onLine =', navOnline);
      setIsOnline(navOnline);
    };

    const handleOffline = () => {
      console.log('[ConnectionMonitor] Evento "offline" disparado pelo navegador.');
      setIsOnline(false);
      setConnectionState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Polling heartbeat (every 4s) to ensure navigator.onLine changes are caught reliably
    const pollInterval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        const currentNavOnline = navigator.onLine;
        setIsOnline((prev) => {
          if (prev !== currentNavOnline) {
            console.log(`[ConnectionMonitor] Heartbeat detectou mudança em navigator.onLine: ${prev} -> ${currentNavOnline}`);
            return currentNavOnline;
          }
          return prev;
        });
      }
    }, 4000);

    // Tab focus / visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && typeof navigator !== 'undefined') {
        const currentNavOnline = navigator.onLine;
        setIsOnline(currentNavOnline);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const setSimulatedOffline = (val: boolean) => {
    setIsSimulatedOfflineState(val);
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(val));
  };

  const addOfflineItem = (item: Omit<OfflineSyncItem, 'id' | 'dataCriacao' | 'status'>): OfflineSyncItem => {
    const newItem: OfflineSyncItem = {
      ...item,
      id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataCriacao: new Date().toISOString(),
      status: 'pendente',
    };
    setOfflineQueue((prev) => [newItem, ...prev]);
    return newItem;
  };

  const removeOfflineItem = (id: string) => {
    setOfflineQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
  };

  // IndexedDB Cache State
  const [currentSurveyDraft, setCurrentSurveyDraft] = useState<Survey | null>(null);
  const [currentSurveyDraftStep, setCurrentSurveyDraftStep] = useState<number>(1);
  const [lastIndexedDBSave, setLastIndexedDBSave] = useState<string | null>(null);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  const [lastSupabaseSync, setLastSupabaseSync] = useState<string | null>(null);
  const [pendingIndexedDbCount, setPendingIndexedDbCount] = useState<number>(0);
  const [lastAutoSyncNotice, setLastAutoSyncNotice] = useState<string | null>(null);
  const isSupabaseLive = isSupabaseConfigured();

  // Load initial draft and pending items from IndexedDB
  useEffect(() => {
    getCurrentSurveyDraftFromDB().then((draft) => {
      if (draft && draft.survey) {
        setCurrentSurveyDraft(draft.survey);
        setCurrentSurveyDraftStep(draft.step || 1);
        setLastIndexedDBSave(draft.updatedAt);
      }
    }).catch((err) => console.warn('Erro ao carregar rascunho do IndexedDB:', err));

    getAllPendingOfflineSurveysFromDB().then((items) => {
      setPendingIndexedDbCount(items.length);
      if (items.length > 0) {
        setSupabaseSyncStatus('pending');
      }
    }).catch((err) => console.warn('Erro ao carregar pesquisas offline do IndexedDB:', err));
  }, []);

  // Save current survey draft to IndexedDB
  const saveCurrentSurveyDraft = async (survey: Survey, step = 1) => {
    setCurrentSurveyDraft(survey);
    setCurrentSurveyDraftStep(step);
    const now = new Date().toISOString();
    setLastIndexedDBSave(now);

    const isOffline = !effectiveOnline;
    await saveCurrentSurveyDraftToDB(survey, step, isOffline);

    if (isOffline) {
      // Store in offline surveys queue in IndexedDB
      await saveOfflineSurveyToDB(survey);
      setSupabaseSyncStatus('pending');
      const pending = await getAllPendingOfflineSurveysFromDB();
      setPendingIndexedDbCount(pending.length);
    } else {
      // Background sync to Supabase if online
      setSupabaseSyncStatus('syncing');
      try {
        const res = await syncSurveyToSupabase(survey);
        if (res.success) {
          setSupabaseSyncStatus('synced');
          setLastSupabaseSync(new Date().toLocaleTimeString());
        } else {
          setSupabaseSyncStatus('error');
        }
      } catch {
        setSupabaseSyncStatus('error');
      }
    }
  };

  const loadCurrentSurveyDraft = async (): Promise<Survey | null> => {
    const draft = await getCurrentSurveyDraftFromDB();
    if (draft && draft.survey) {
      setCurrentSurveyDraft(draft.survey);
      setCurrentSurveyDraftStep(draft.step || 1);
      setLastIndexedDBSave(draft.updatedAt);
      return draft.survey;
    }
    return null;
  };

  const clearCurrentSurveyDraft = async () => {
    await clearCurrentSurveyDraftFromDB();
    setCurrentSurveyDraft(null);
    setCurrentSurveyDraftStep(1);
    setLastIndexedDBSave(null);
  };

  // Force synchronization of pending offline surveys from IndexedDB to Supabase with granular progress tracking
  const forceSyncPendingWithSupabase = async (
    isAutoTriggered = false
  ): Promise<{ success: boolean; count: number; message: string }> => {
    if (!effectiveOnline) {
      const msg = 'Não é possível sincronizar: dispositivo sem conexão à rede ou em modo offline simulado.';
      setSyncProgress({
        isActive: true,
        phase: 'error',
        current: 0,
        total: 0,
        percent: 0,
        message: msg,
        syncedItems: [],
      });
      return { success: false, count: 0, message: msg };
    }

    setConnectionState('syncing');
    setSupabaseSyncStatus('syncing');

    // Phase 1: Detecting offline pending items from IndexedDB
    setSyncProgress({
      isActive: true,
      phase: 'detecting',
      current: 0,
      total: 0,
      percent: 15,
      message: isAutoTriggered
        ? 'Sinal restabelecido via navigator.onLine! Verificando pesquisas pendentes no cache IndexedDB...'
        : 'Varrendo fila de pendências offline no IndexedDB...',
      startedAt: new Date().toISOString(),
      mode: isSupabaseConfigured() ? 'live' : 'simulated',
      syncedItems: [],
    });

    try {
      // 1. Get stored offline surveys with pendingSync === true
      const pendingStored = await getAllPendingOfflineSurveysFromDB();

      // 2. Check current draft in IndexedDB
      const draft = await getCurrentSurveyDraftFromDB();

      // 3. Compile unique list of surveys needing sync
      const surveyMap = new Map<string, Survey>();

      pendingStored.forEach((item) => {
        if (item.survey && item.survey.id) {
          surveyMap.set(item.survey.id, item.survey);
        }
      });

      if (draft && draft.isOfflineModified && draft.survey && draft.survey.id) {
        if (!surveyMap.has(draft.survey.id)) {
          surveyMap.set(draft.survey.id, draft.survey);
        }
      }

      // 4. Also check offlineQueue items of type PESQUISA_SALVA
      offlineQueue
        .filter((q) => q.tipo === 'PESQUISA_SALVA' && q.payload && q.payload.id)
        .forEach((q) => {
          if (!surveyMap.has(q.payload.id)) {
            surveyMap.set(q.payload.id, q.payload as Survey);
          }
        });

      const surveysToSync = Array.from(surveyMap.values());

      // If no pending items in IndexedDB
      if (surveysToSync.length === 0) {
        setSupabaseSyncStatus('synced');
        setConnectionState('online');
        setPendingIndexedDbCount(0);

        const noticeMsg = 'Conexão restabelecida via navigator.onLine. Nenhuma alteração pendente no cache IndexedDB.';
        setSyncProgress({
          isActive: true,
          phase: 'completed',
          current: 0,
          total: 0,
          percent: 100,
          message: noticeMsg,
          completedAt: new Date().toISOString(),
          syncedItems: [],
        });

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setSyncProgress((prev) => (prev.phase === 'completed' ? { ...prev, isActive: false } : prev));
        }, 4000);

        return { success: true, count: 0, message: noticeMsg };
      }

      // Prepare items for progress tracking
      const initialProgressItems: SyncProgressItem[] = surveysToSync.map((s) => ({
        id: s.id,
        nome: s.nome,
        codigo: s.codigo || s.id,
        status: 'pending',
      }));

      setSyncProgress((prev) => ({
        ...prev,
        phase: 'syncing',
        current: 0,
        total: surveysToSync.length,
        percent: 20,
        message: `Sincronizando ${surveysToSync.length} pesquisa(s) pendente(s) do IndexedDB com o Supabase...`,
        syncedItems: initialProgressItems,
      }));

      let successCount = 0;
      let failedCount = 0;

      // Sequentially process each survey to provide real-time step-by-step progress feedback
      for (let i = 0; i < surveysToSync.length; i++) {
        const survey = surveysToSync[i];
        const stepPercent = Math.round(20 + ((i + 0.3) / surveysToSync.length) * 75);

        // Update progress notification to currently active survey
        setSyncProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentSurveyName: survey.nome,
          percent: stepPercent,
          message: `Sincronizando item ${i + 1} de ${surveysToSync.length}: "${survey.nome}"...`,
          syncedItems: prev.syncedItems.map((item) =>
            item.id === survey.id ? { ...item, status: 'syncing' } : item
          ),
        }));

        try {
          const res = await syncSurveyToSupabase(survey);

          if (res.success) {
            successCount++;
            await markSurveySyncedInDB(survey.id);

            // Update in React memory so UI immediately reflects latest synchronized survey
            setSurveys((prev) => {
              const idx = prev.findIndex((x) => x.id === survey.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = survey;
                return updated;
              }
              return [survey, ...prev];
            });

            const completedItemPercent = Math.round(20 + ((i + 1) / surveysToSync.length) * 75);
            setSyncProgress((prev) => ({
              ...prev,
              percent: completedItemPercent,
              syncedItems: prev.syncedItems.map((item) =>
                item.id === survey.id ? { ...item, status: 'success' } : item
              ),
            }));
          } else {
            failedCount++;
            setSyncProgress((prev) => ({
              ...prev,
              syncedItems: prev.syncedItems.map((item) =>
                item.id === survey.id ? { ...item, status: 'failed', error: res.message } : item
              ),
            }));
          }
        } catch (err: any) {
          failedCount++;
          setSyncProgress((prev) => ({
            ...prev,
            syncedItems: prev.syncedItems.map((item) =>
              item.id === survey.id
                ? { ...item, status: 'failed', error: err?.message || 'Erro na comunicação' }
                : item
            ),
          }));
        }

        // Brief delay between items for smooth visual progression
        if (surveysToSync.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // If draft was among synced items, reset its offline modified state
      if (draft && draft.isOfflineModified) {
        await saveCurrentSurveyDraftToDB(draft.survey, draft.step, false);
      }

      // Clear offline items in memory queue
      setOfflineQueue((prev) => prev.filter((item) => item.tipo !== 'PESQUISA_SALVA'));

      // Re-evaluate pending count in IndexedDB
      const remainingPending = await getAllPendingOfflineSurveysFromDB();
      setPendingIndexedDbCount(remainingPending.length);

      const allSucceeded = failedCount === 0;
      setSupabaseSyncStatus(allSucceeded ? 'synced' : 'error');
      setConnectionState('online');
      setLastSupabaseSync(new Date().toLocaleTimeString());

      const summaryMsg = allSucceeded
        ? `${successCount} pesquisa(s) do cache IndexedDB sincronizada(s) com sucesso no Supabase!`
        : `Sincronização concluída com alertas: ${successCount} enviada(s), ${failedCount} pendente(s).`;

      setSyncProgress((prev) => ({
        ...prev,
        phase: allSucceeded ? 'completed' : 'error',
        current: surveysToSync.length,
        percent: 100,
        message: summaryMsg,
        completedAt: new Date().toISOString(),
        failedCount,
      }));

      setLastAutoSyncNotice(summaryMsg);
      setTimeout(() => setLastAutoSyncNotice(null), 6000);

      // Add audit log for compliance
      addAuditLog({
        categoria: 'SISTEMA',
        tipoAcao: 'SINCRONIZACAO_OFFLINE',
        tituloAcao: 'Sincronização Forçada IndexedDB -> Supabase',
        descricaoDetalhada: `${successCount} pesquisa(s) pendentes no cache IndexedDB foram transmitidas automaticamente ao Supabase após restauração do sinal (${isAutoTriggered ? 'navigator.onLine reativo' : 'acionamento direto'}).`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Monitor de Conexão',
        },
        alvo: {
          tipo: 'sistema',
          id: `supabase_sync_${Date.now()}`,
          identificador: `Sync #${successCount}/${surveysToSync.length}`,
          nome: 'Canal Supabase Cloud',
        },
        alteracoes: [
          { campo: 'totalSincronizadas', rotulo: 'Sincronizadas com Sucesso', valorNovo: `${successCount} pesquisas` },
          { campo: 'falhas', rotulo: 'Falhas de Envio', valorNovo: `${failedCount}` },
          { campo: 'origem', rotulo: 'Origem de Dados', valorNovo: 'IndexedDB (Cache Local)' },
          { campo: 'destino', rotulo: 'Destino Remoto', valorNovo: isSupabaseConfigured() ? 'Supabase Cloud (Ao Vivo)' : 'Supabase Seguro (Simulado)' },
        ],
        motivoConformidade: 'Sincronização reativa obrigatória de pendências offline com a base central conforme governança de integridade de dados.',
        statusConformidade: allSucceeded ? 'conforme' : 'atencao',
      });

      // Auto-dismiss completed notification after 6 seconds
      if (allSucceeded) {
        setTimeout(() => {
          setSyncProgress((prev) => (prev.phase === 'completed' ? { ...prev, isActive: false } : prev));
        }, 6000);
      }

      return {
        success: allSucceeded,
        count: successCount,
        message: summaryMsg,
      };
    } catch (err: any) {
      console.error('[Force Sync Supabase Error]', err);
      setSupabaseSyncStatus('error');
      setConnectionState('online');
      const errMsg = `Falha na sincronização: ${err?.message || err}`;
      setSyncProgress({
        isActive: true,
        phase: 'error',
        current: 0,
        total: 0,
        percent: 100,
        message: errMsg,
        completedAt: new Date().toISOString(),
        syncedItems: [],
        failedCount: 1,
      });
      return { success: false, count: 0, message: errMsg };
    }
  };

  // Sync all pending offline surveys from IndexedDB to Supabase (delegates to forceSyncPendingWithSupabase)
  const syncAllPendingWithSupabase = async (): Promise<{ success: boolean; count: number; message: string }> => {
    return forceSyncPendingWithSupabase(false);
  };

  // Immediate manual connection verification
  const checkConnectionNow = async (): Promise<boolean> => {
    const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(navOnline);

    if (navOnline && !isSimulatedOffline) {
      setConnectionState('reconnecting');
      try {
        const isHealthOk = await checkServerHealth();
        setServerOnline(isHealthOk);
        if (isHealthOk) {
          setConnectionState('online');
          const pending = await getAllPendingOfflineSurveysFromDB();
          if (pending.length > 0) {
            forceSyncPendingWithSupabase(false);
          }
          return true;
        }
      } catch {
        // ignore
      }
      setConnectionState('online');
      return true;
    } else {
      setConnectionState('offline');
      return false;
    }
  };

  // Automatic connection detection & sync effect utilizing navigator.onLine
  const prevEffectiveOnlineRef = React.useRef(effectiveOnline);
  useEffect(() => {
    const wasOffline = !prevEffectiveOnlineRef.current;
    const isNowOnline = effectiveOnline;
    prevEffectiveOnlineRef.current = effectiveOnline;

    if (wasOffline && isNowOnline) {
      console.log('[ConnectionMonitor] Sinal de rede restabelecido (navigator.onLine = true). Forçando fila de sincronização IndexedDB -> Supabase...');
      setConnectionState('reconnecting');
      forceSyncPendingWithSupabase(true);
      refreshSurveysFromServer();
    } else if (!isNowOnline) {
      setConnectionState('offline');
    } else {
      setConnectionState('online');
    }
  }, [effectiveOnline]);

  // Central Server Synchronization State & Implementation
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  // Helper: Identifica se uma pesquisa está em andamento (coletando dados / em campo)
  const isSurveyInProgress = (survey: Survey): boolean => {
    if (!survey) return false;
    const hasSubs = submissions.some((s) => s.pesquisaId === survey.id);
    return survey.status === 'ativa' || hasSubs || !!survey.emAndamento;
  };

  // Atualiza e concilia as pesquisas locais com o servidor central
  const refreshSurveysFromServer = async () => {
    if (!effectiveOnline) return;
    try {
      const res = await fetchServerSurveys();
      if (res.success && res.surveys.length > 0) {
        setServerOnline(true);
        setSurveys((prev) => {
          const map = new Map<string, Survey>(prev.map((s) => [s.id, s]));
          res.surveys.forEach((srv) => {
            const existing = map.get(srv.id);
            const merged: Survey = {
              ...(existing ? existing : srv),
              ...srv,
              emAndamento: isSurveyInProgress(srv),
              serverVersion: srv.versao,
              totalEntrevistasColetadas: srv.totalEntrevistasColetadas ?? (existing?.totalEntrevistasColetadas || 0),
            };
            map.set(srv.id, merged);
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('[AppContext] Servidor central indisponível no momento:', err);
    }
  };

  // Executa busca inicial no servidor
  useEffect(() => {
    refreshSurveysFromServer();
  }, [effectiveOnline]);

  // Sincronização Prévia Mandatória com o Servidor Central
  const syncSurveyWithCentralServer = async (
    surveyId: string,
    clientDraft?: Partial<Survey>
  ): Promise<ServerSyncCheckResult> => {
    if (!effectiveOnline) {
      return {
        success: false,
        emAndamento: true,
        serverVersion: 1,
        submissionsCount: 0,
        message: 'Você está offline. A sincronização prévia com o servidor exige conexão ativa para validar dados e autorizar alterações.',
      };
    }

    const res = await syncSurveyWithServer(surveyId, clientDraft);
    if (res.success) {
      setServerOnline(true);
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id === surveyId) {
            return {
              ...s,
              serverSyncToken: res.syncToken,
              lastServerSyncAt: new Date().toISOString(),
              serverSyncStatus: 'autorizado_para_subir',
              serverVersion: res.serverVersion,
              totalEntrevistasColetadas: res.submissionsCount,
              emAndamento: res.emAndamento,
            };
          }
          return s;
        })
      );

      addAuditLog({
        categoria: 'SISTEMA',
        tipoAcao: 'SINCRONIZACAO_OFFLINE',
        tituloAcao: 'Sincronização Prévia com Servidor Central',
        descricaoDetalhada: `Sincronização obrigatória de pesquisa em andamento "${clientDraft?.nome || surveyId}" validada com o servidor. Token de upload emitido: ${res.syncToken}`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Administrador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: surveyId,
          identificador: clientDraft?.codigo || surveyId,
          nome: clientDraft?.nome || surveyId,
        },
        alteracoes: [
          { campo: 'serverSyncToken', rotulo: 'Token de Autorização', valorNovo: res.syncToken || 'Ativo' },
          { campo: 'statusServidor', rotulo: 'Status de Governança', valorNovo: 'Autorizado para Subir Alterações' },
        ],
        motivoConformidade: 'Sincronização mandatória antes de aplicar ajustes em pesquisa em andamento para assegurar integridade das coletas.',
        statusConformidade: 'conforme',
      });
    } else {
      if (res.message.includes('conectar')) {
        setServerOnline(false);
      }
    }
    return res;
  };

  // Sobe alterações autorizadas para o servidor
  const uploadSurveyChangesToCentralServer = async (
    survey: Survey,
    syncToken?: string
  ): Promise<{ success: boolean; survey?: Survey; message: string; requiresSync?: boolean }> => {
    if (!effectiveOnline) {
      await saveOfflineSurveyToDB(survey);
      return {
        success: false,
        requiresSync: true,
        message: 'Você está offline. As alterações foram armazenadas no cache local IndexedDB e necessitam de sincronização com o servidor assim que a conexão retornar.',
      };
    }

    const tokenToUse = syncToken || survey.serverSyncToken;
    const res = await uploadSurveyToServer(survey, tokenToUse);
    if (res.success && res.survey) {
      const updated = res.survey;
      setSurveys((prev) => {
        const idx = prev.findIndex((s) => s.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            ...updated,
            serverSyncToken: undefined,
            serverSyncStatus: 'sincronizado',
            lastServerSyncAt: new Date().toISOString(),
          };
          return next;
        }
        return [{ ...updated, serverSyncStatus: 'sincronizado' }, ...prev];
      });

      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'EDICAO_PESQUISA',
        tituloAcao: 'Upload de Alterações para o Servidor Central',
        descricaoDetalhada: `Pesquisa em andamento "${survey.nome}" atualizada com sucesso no servidor para v${updated.versao}.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Administrador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo,
          nome: survey.nome,
        },
        alteracoes: [
          { campo: 'versao', rotulo: 'Versão no Servidor', valorNovo: `v${updated.versao}` },
        ],
        motivoConformidade: 'Alterações validadas previamente com o servidor e subidas conforme governança.',
        statusConformidade: 'conforme',
      });

      return {
        success: true,
        survey: updated,
        message: res.message,
      };
    } else {
      return {
        success: false,
        requiresSync: res.requiresSync,
        message: res.message,
      };
    }
  };

  // Persistence effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLABORATORS, JSON.stringify(collaborators));
  }, [collaborators]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
  }, [surveys]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IMPORTS, JSON.stringify(imports));
  }, [imports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANALYTICAL_REPORTS, JSON.stringify(analyticalReports));
  }, [analyticalReports]);

  const setLanguage = (l: Language) => setLanguageState(l);
  const setDarkMode = (d: boolean) => setDarkModeState(d);

  const currentProfile =
    profiles.find((p) => p.id === currentUser.perfilAcessoId) || profiles[0];

  const hasPermission = (perm: keyof AccessPolicyPermissions): boolean => {
    if (!currentProfile) return true;
    return !!currentProfile.permissions[perm];
  };

  const verify2FA = (code: string): boolean => {
    // Accepts "123456" or any 6-digit code for 2FA demo
    if (code.length === 6) {
      setTwoFactorVerified(true);
      return true;
    }
    return false;
  };

  const updateProfile = (updatedProfile: AccessProfile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
    );
  };

  const addAuditLog = (
    logData: any
  ): ActionAuditLog => {
    const timestamp = logData.timestamp || new Date().toISOString();
    const safeAlvo = {
      tipo: logData.alvo?.tipo || 'sistema',
      id: logData.alvo?.id || logData.registroId || `sys_${Date.now()}`,
      identificador:
        logData.alvo?.identificador || logData.registroId || logData.identificador || 'REG-SISTEMA',
      nome: logData.alvo?.nome || logData.detalhes || logData.tituloAcao || '',
    };
    const safeAutor = logData.autor || {
      id: logData.usuarioId || currentUser?.id || 'sys',
      nome: logData.usuarioNome || currentUser?.nome || 'Sistema',
      login: currentUser?.login || 'sistema',
      perfil: logData.usuarioPerfil || currentProfile?.name || 'Operador',
    };
    const hash =
      logData.hashIntegridade ||
      generateIntegrityHash(
        `${timestamp}-${logData.tipoAcao || 'ACAO'}-${safeAlvo.identificador}-${currentUser?.id || 'sys'}`
      );
    const newLog: ActionAuditLog = {
      ...logData,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      categoria: logData.categoria || 'SISTEMA',
      tipoAcao: logData.tipoAcao || 'ALTERACAO_SISTEMA',
      tituloAcao: logData.tituloAcao || logData.acao || 'Ação do Sistema',
      descricaoDetalhada: logData.descricaoDetalhada || logData.detalhes || '',
      autor: safeAutor,
      alvo: safeAlvo,
      timestamp,
      hashIntegridade: hash,
      statusConformidade: logData.statusConformidade || 'conforme',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  };

  const saveCollaborator = async (colab: Collaborator, senha?: string): Promise<boolean> => {
    // Persiste no servidor central (grava no Supabase com senha em hash).
    // Se falhar, mantém o estado local e retorna false para o formulário exibir o erro.
    let serverOk = false;
    try {
      const result = await saveCollaboratorToServer(colab, senha);
      if (result?.success) {
        serverOk = true;
        // Atualiza o id/campos devolvidos pelo servidor, se houver.
        if (result.colaborador) {
          colab = { ...colab, ...result.colaborador };
        }
      }
    } catch {
      // Mantém apenas o estado local; o formulário decide como avisar.
    }

    setCollaborators((prev) => {
      const idx = prev.findIndex((c) => c.id === colab.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = colab;
        return next;
      }
      return [colab, ...prev];
    });

    return serverOk;
  };

  const toggleCollaboratorStatus = (id: string) => {
    setCollaborators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c))
    );
  };

  const login = (loginInput: string, senhaInput: string): { success: boolean; error?: string } => {
    const trimmedLogin = loginInput.trim().toLowerCase();
    const trimmedSenha = senhaInput.trim();

    const colab = collaborators.find(
      (c) => c.login.toLowerCase() === trimmedLogin
    );

    if (!colab) {
      return {
        success: false,
        error: 'Usuário não encontrado. Verifique o login cadastrado pelo administrador.',
      };
    }

    if (!colab.ativo) {
      return {
        success: false,
        error: 'Este colaborador está inativo no sistema. Contate o administrador para reativação.',
      };
    }

    if (colab.senha !== trimmedSenha) {
      return {
        success: false,
        error: 'Senha incorreta. Por favor, verifique a senha definida pelo administrador.',
      };
    }

    setCurrentUser(colab);
    setIsAuthenticated(true);
    sessionStorage.setItem('dataquest_auth_session', 'true');
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, colab.id);

    const prof = profiles.find((p) => p.id === colab.perfilAcessoId);
    if (prof?.id === 'prof_pesq' || prof?.name.toLowerCase().includes('pesquisador')) {
      setActiveModule('pesquisador');
    } else {
      setActiveModule('home');
    }

    addAuditLog({
      categoria: 'SISTEMA',
      tipoAcao: 'SINCRONIZACAO_OFFLINE',
      tituloAcao: `Autenticação de Usuário: @${colab.login}`,
      descricaoDetalhada: `Colaborador ${colab.nome} realizou login com sucesso no sistema pelo perfil ${prof?.name || 'Padrão'}.`,
      autor: {
        id: colab.id,
        nome: colab.nome,
        login: colab.login,
        perfil: prof?.name || 'Colaborador',
        ip: '189.40.12.88',
      },
      alvo: {
        tipo: 'colaborador',
        id: colab.id,
        identificador: colab.login,
        nome: colab.nome,
      },
      alteracoes: [{ campo: 'sessao', rotulo: 'Sessão de Acesso', valorNovo: 'Iniciada' }],
      motivoConformidade: 'Autenticação formal de credenciais conforme políticas de segurança.',
      statusConformidade: 'conforme',
    });

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('dataquest_auth_session');
  };

  const saveSurvey = (survey: Survey) => {
    const orig = surveys.find((s) => s.id === survey.id);
    const isNew = !orig;

    if (isNew) {
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'CRIACAO_PESQUISA',
        tituloAcao: 'Criação de Instrumento de Pesquisa',
        descricaoDetalhada: `Novo formulário de pesquisa "${survey.nome}" criado com ${survey.perguntas?.length || 0} questões e ${survey.regras?.length || 0} regras.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo || 'PESQ-NOVA',
          nome: survey.nome,
        },
        alteracoes: [
          { campo: 'nome', rotulo: 'Nome da Pesquisa', valorNovo: survey.nome },
          { campo: 'perguntas', rotulo: 'Total de Perguntas', valorNovo: `${survey.perguntas?.length || 0} perguntas` },
          { campo: 'coletaWeb', rotulo: 'Coleta Web', valorNovo: survey.habilitarColetaWeb ? 'Habilitada' : 'Desabilitada' },
        ],
        motivoConformidade: 'Cadastro e aprovação de novo instrumento para coleta em conformidade com as diretrizes.',
        statusConformidade: 'conforme',
      });
    } else {
      const diffs = diffSurveys(orig, survey);
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'EDICAO_PESQUISA',
        tituloAcao: 'Edição de Pesquisa',
        descricaoDetalhada: `Configurações da pesquisa "${survey.nome}" (${survey.codigo}) atualizadas via editor.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo,
          nome: survey.nome,
        },
        alteracoes: diffs.length > 0 ? diffs : [{ campo: 'geral', rotulo: 'Atualização Cadastral', valorNovo: 'Parâmetros atualizados' }],
        motivoConformidade: 'Revisão técnica de conteúdo, roteiro e parâmetros de amostragem pelo administrador.',
        statusConformidade: 'conforme',
      });
    }

    if (!effectiveOnline) {
      addOfflineItem({
        tipo: 'PESQUISA_SALVA',
        titulo: `Pesquisa: ${survey.nome}`,
        resumo: `Código ${survey.codigo} • Ciclo ${survey.cicloAtual} • ${survey.perguntas.length} questões`,
        payload: survey,
      });

      // Salva no armazenamento offline do IndexedDB
      saveOfflineSurveyToDB(survey)
        .then(() => {
          getAllPendingOfflineSurveysFromDB().then((items) => setPendingIndexedDbCount(items.length));
          setSupabaseSyncStatus('pending');
        })
        .catch((err) => console.warn('[IndexedDB] Falha ao gravar pesquisa offline:', err));
    } else {
      // Sincroniza diretamente com Supabase quando online
      syncSurveyToSupabase(survey)
        .then((res) => {
          if (res.success) {
            setSupabaseSyncStatus('synced');
            setLastSupabaseSync(new Date().toLocaleTimeString());
          }
        })
        .catch((err) => console.warn('[Supabase] Falha ao enviar pesquisa:', err));
    }

    setSurveys((prev) => {
      const idx = prev.findIndex((s) => s.id === survey.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...survey,
          atualizadaEm: new Date().toISOString(),
        };
        return updated;
      }
      return [{ ...survey, atualizadaEm: new Date().toISOString() }, ...prev];
    });
  };

  // Replicar pesquisa e metas sem perder o histórico anterior
  const replicateSurvey = (surveyId: string): Survey => {
    const orig = surveys.find((s) => s.id === surveyId);
    if (!orig) throw new Error('Pesquisa não encontrada');

    const nextCiclo = (orig.cicloAtual || 1) + 1;
    const nextVersao = (orig.versao || 1) + 1;
    const newSurveyId = `pesq_${Date.now()}`;

    // Clone metas with new survey ID and reset counters for the new cycle
    const clonedMetas = orig.metas.map((m, idx) => ({
      ...m,
      id: `meta_rep_${Date.now()}_${idx}`,
      pesquisaId: newSurveyId,
      quantidadeAtingida: 0,
      ciclo: `Ciclo ${nextCiclo} - ${new Date().getFullYear()}`,
    }));

    const clonedSurvey: Survey = {
      ...orig,
      id: newSurveyId,
      codigo: `${orig.codigo.split('-')[0] || 'PESQ'}-${new Date().getFullYear()}-C${nextCiclo}`,
      nome: `${orig.nome} (Ciclo ${nextCiclo})`,
      descricao: `Cópia replicada do Ciclo ${orig.cicloAtual} para nova coleta. ${orig.descricao}`,
      status: 'ativa',
      cicloAtual: nextCiclo,
      versao: nextVersao,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      metas: clonedMetas,
    };

    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'REPLICACAO_PESQUISA',
      tituloAcao: 'Replicação de Ciclo de Pesquisa',
      descricaoDetalhada: `Pesquisa "${orig.nome}" replicada com sucesso para o Ciclo ${nextCiclo}, gerando nova versão ${nextVersao} e preservando registros anteriores.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Colaborador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: newSurveyId,
        identificador: clonedSurvey.codigo,
        nome: clonedSurvey.nome,
      },
      alteracoes: [
        { campo: 'cicloAtual', rotulo: 'Ciclo', valorAnterior: orig.cicloAtual, valorNovo: nextCiclo },
        { campo: 'versao', rotulo: 'Versão', valorAnterior: orig.versao || 1, valorNovo: nextVersao },
      ],
      motivoConformidade: 'Abertura de nova rodada/ciclo de coleta mantendo integridade histórica dos dados amostrais.',
      statusConformidade: 'conforme',
    });

    setSurveys((prev) => [clonedSurvey, ...prev]);
    return clonedSurvey;
  };

  const toggleSurveyStatus = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (target) {
      const nextStatus = target.status === 'ativa' ? 'inativa' : 'ativa';
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: `Alteração de Status para ${nextStatus.toUpperCase()}`,
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) alterada de ${target.status} para ${nextStatus}.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: target.id,
          identificador: target.codigo,
          nome: target.nome,
        },
        alteracoes: [
          { campo: 'status', rotulo: 'Status Operacional', valorAnterior: target.status, valorNovo: nextStatus },
        ],
        motivoConformidade: nextStatus === 'inativa' ? 'Pausa operacional para auditoria de metas e contingência de campo.' : 'Reabertura de coleta autorizada pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) => {
        if (s.id === surveyId) {
          const nextStatus = s.status === 'ativa' ? 'inativa' : 'ativa';
          return { ...s, status: nextStatus, atualizadaEm: new Date().toISOString() };
        }
        return s;
      })
    );
  };

  // Marca a pesquisa como CONCLUÍDA (finalizada) pela coordenação.
  // A partir daí ela deixa de aparecer para os pesquisadores, exceto
  // para aqueles cujo login foi re-habilitado (pesquisasReabilitadasIds).
  const finalizeSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (target) {
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: 'Finalização da Pesquisa (Concluída)',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) finalizada pela coordenação. Deixou de ser exibida aos pesquisadores.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: target.id,
          identificador: target.codigo,
          nome: target.nome,
        },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'concluida' }],
        motivoConformidade: 'Encerramento oficial do ciclo de coleta pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId
          ? { ...s, status: 'concluida', emAndamento: false, atualizadaEm: new Date().toISOString() }
          : s
      )
    );
  };

  // Reabre uma pesquisa finalizada (volta para o status ativa).
  const reopenSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (target) {
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'STATUS_PESQUISA',
        tituloAcao: 'Reabertura de Pesquisa',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) reaberta pela coordenação para novas coletas.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: target.id,
          identificador: target.codigo,
          nome: target.nome,
        },
        alteracoes: [{ campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'ativa' }],
        motivoConformidade: 'Autorização de retomada de coleta pela coordenação.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId
          ? { ...s, status: 'ativa', emAndamento: true, atualizadaEm: new Date().toISOString() }
          : s
      )
    );
  };

  // Habilita/desabilita uma pesquisa já concluída para um login específico.
  const setSurveyReEnabledForResearcher = (
    surveyId: string,
    researcherId: string,
    enabled: boolean
  ) => {
    setCollaborators((prev) => {
      const updatedColabs = prev.map((c) => {
        if (c.id !== researcherId) return c;
        const list = Array.isArray(c.pesquisasReabilitadasIds) ? [...c.pesquisasReabilitadasIds] : [];
        const updated = enabled
          ? Array.from(new Set([...list, surveyId]))
          : list.filter((id) => id !== surveyId);
        return { ...c, pesquisasReabilitadasIds: updated };
      });

      // Se o pesquisador alterado é o usuário atualmente logado, reflete a
      // mudança na sessão corrente para a tela reagir imediatamente.
      if (researcherId === currentUser.id) {
        const updatedCurrent = updatedColabs.find((c) => c.id === researcherId);
        if (updatedCurrent) {
          setCurrentUser(updatedCurrent);
        }
      }

      return updatedColabs;
    });
  };

  const deleteSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (target) {
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'EXCLUSAO_PESQUISA',
        tituloAcao: 'Arquivamento/Exclusão Lógica de Pesquisa',
        descricaoDetalhada: `Pesquisa "${target.nome}" (${target.codigo}) movida para lixeira lógica.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: target.id,
          identificador: target.codigo,
          nome: target.nome,
        },
        alteracoes: [
          { campo: 'status', rotulo: 'Status', valorAnterior: target.status, valorNovo: 'excluida' },
        ],
        motivoConformidade: 'Exclusão lógica mantida em quarentena conforme política de retenção de dados.',
        statusConformidade: 'atencao',
      });
    }

    setSurveys((prev) =>
      prev.map((s) => (s.id === surveyId ? { ...s, status: 'excluida' } : s))
    );
  };

  const restoreSurvey = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (target) {
      addAuditLog({
        categoria: 'PESQUISA',
        tipoAcao: 'RESTAURACAO_PESQUISA',
        tituloAcao: 'Restauração de Pesquisa Excluída',
        descricaoDetalhada: `Pesquisa "${target.nome}" restaurada com status ativa.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: target.id,
          identificador: target.codigo,
          nome: target.nome,
        },
        alteracoes: [
          { campo: 'status', rotulo: 'Status', valorAnterior: 'excluida', valorNovo: 'ativa' },
        ],
        motivoConformidade: 'Restauração solicitada e aprovada pelo coordenador responsável.',
        statusConformidade: 'conforme',
      });
    }

    setSurveys((prev) =>
      prev.map((s) => (s.id === surveyId ? { ...s, status: 'ativa' } : s))
    );
  };

  // Módulo de Relatórios Analíticos
  const saveAnalyticalReport = (report: AnalyticalReport) => {
    const orig = analyticalReports.find((r) => r.id === report.id);
    const isNew = !orig;

    addAuditLog({
      categoria: 'CONFIGURACAO',
      tipoAcao: isNew ? 'CRIACAO_RELATORIO' : 'EDICAO_RELATORIO',
      tituloAcao: isNew ? 'Criação de Relatório Analítico' : 'Edição de Relatório Analítico',
      descricaoDetalhada: isNew
        ? `Novo relatório analítico "${report.titulo}" criado para a pesquisa "${report.pesquisaNome}" com ${report.blocos.length} bloco(s) de texto.`
        : `Relatório analítico "${report.titulo}" atualizado (${report.blocos.length} bloco(s) de texto).`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Colaborador',
      },
      alvo: {
        tipo: 'relatorio',
        id: report.id,
        identificador: report.id,
        nome: report.titulo,
      },
      alteracoes: [
        { campo: 'titulo', rotulo: 'Título', valorNovo: report.titulo },
        { campo: 'blocos', rotulo: 'Total de Blocos', valorNovo: `${report.blocos.length} blocos` },
      ],
      motivoConformidade: 'Documentação analítica dos resultados de pesquisa para fins de registro e conformidade.',
      statusConformidade: 'conforme',
    });

    setAnalyticalReports((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === report.id);
      if (existingIdx === -1) return [...prev, report];
      const updated = [...prev];
      updated[existingIdx] = report;
      return updated;
    });
  };

  const deleteAnalyticalReport = (reportId: string) => {
    const target = analyticalReports.find((r) => r.id === reportId);
    if (target) {
      addAuditLog({
        categoria: 'CONFIGURACAO',
        tipoAcao: 'EXCLUSAO_RELATORIO',
        tituloAcao: 'Exclusão de Relatório Analítico',
        descricaoDetalhada: `Relatório analítico "${target.titulo}" (pesquisa "${target.pesquisaNome}") excluído definitivamente.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'relatorio',
          id: target.id,
          identificador: target.id,
          nome: target.titulo,
        },
        motivoConformidade: 'Exclusão solicitada pelo responsável pela análise.',
        statusConformidade: 'atencao',
      });
    }

    setAnalyticalReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // Gerenciamento de Metas Globais Demográficas
  const saveGlobalTarget = (surveyId: string, target: GlobalDemographicTarget) => {
    setSurveys((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== surveyId) return s;
        const currentMetas = s.metasGlobais || [];
        const index = currentMetas.findIndex((m) => m.id === target.id);
        let newMetas: GlobalDemographicTarget[];
        if (index >= 0) {
          newMetas = currentMetas.map((m) => (m.id === target.id ? target : m));
        } else {
          newMetas = [...currentMetas, target];
        }
        return {
          ...s,
          metasGlobais: newMetas,
          atualizadaEm: new Date().toISOString(),
        };
      });
      return updated;
    });

    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'CRIACAO_PESQUISA',
      tituloAcao: 'Configuração de Meta Global Demográfica',
      descricaoDetalhada: `Meta Global Demográfica "${target.titulo}" atualizada na pesquisa ${surveyId}. Alvo total: ${target.metaGlobalAlvo} coletas. Critérios: [Idade: ${target.criterios.faixaEtaria || 'Todas'}, Sexo: ${target.criterios.sexo || 'Todos'}, Bairro: ${target.criterios.bairro || 'Todos'}].`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: surveyId,
        identificador: target.id,
        nome: target.titulo,
      },
      alteracoes: [
        { campo: 'metaGlobalAlvo', rotulo: 'Meta Global Alvo', valorNovo: String(target.metaGlobalAlvo) },
        { campo: 'pesquisadoresVinculados', rotulo: 'Pesquisadores Alocados', valorNovo: `${target.atribuicoes.length} pesquisador(es)` },
      ],
      motivoConformidade: 'Controle e auditoria de quotas demográficas para assegurar representatividade amostral.',
      statusConformidade: 'conforme',
    });
  };

  const deleteGlobalTarget = (surveyId: string, targetId: string) => {
    setSurveys((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== surveyId) return s;
        const currentMetas = s.metasGlobais || [];
        return {
          ...s,
          metasGlobais: currentMetas.filter((m) => m.id !== targetId),
          atualizadaEm: new Date().toISOString(),
        };
      });
      return updated;
    });

    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'EXCLUSAO_PESQUISA',
      tituloAcao: 'Exclusão de Meta Global Demográfica',
      descricaoDetalhada: `Meta Global Demográfica ID ${targetId} removida da pesquisa ${surveyId}.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: surveyId,
        identificador: targetId,
        nome: 'Meta Removida',
      },
      alteracoes: [
        { campo: 'status', rotulo: 'Status Meta', valorAnterior: 'ativa', valorNovo: 'excluida' },
      ],
      motivoConformidade: 'Ajuste no plano amostral por solicitação da coordenação.',
      statusConformidade: 'atencao',
    });
  };

  const assignResearcherQuota = (
    surveyId: string,
    targetId: string,
    assignment: ResearcherQuotaAssignment
  ) => {
    setSurveys((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== surveyId) return s;
        const currentMetas = s.metasGlobais || [];
        const target = currentMetas.find((m) => m.id === targetId);
        if (!target) return s;

        const existingIdx = target.atribuicoes.findIndex((a) => a.pesquisadorId === assignment.pesquisadorId);
        let newAssignments: ResearcherQuotaAssignment[];
        if (existingIdx >= 0) {
          newAssignments = target.atribuicoes.map((a) =>
            a.pesquisadorId === assignment.pesquisadorId ? assignment : a
          );
        } else {
          newAssignments = [...target.atribuicoes, assignment];
        }

        const updatedTarget: GlobalDemographicTarget = {
          ...target,
          atribuicoes: newAssignments,
          atualizadoEm: new Date().toISOString(),
        };

        return {
          ...s,
          metasGlobais: currentMetas.map((m) => (m.id === targetId ? updatedTarget : m)),
          atualizadaEm: new Date().toISOString(),
        };
      });
      return updated;
    });
  };

  const addSubmission = (sub: InterviewSubmission) => {
    setSubmissions((prev) => [sub, ...prev]);

    if (!effectiveOnline) {
      addOfflineItem({
        tipo: 'RESPOSTA_COLETA',
        titulo: `Coleta: ${sub.codigoPesquisa} (#${sub.id})`,
        resumo: `Pesquisador: ${sub.pesquisadorNome} • ${sub.respostas?.length || 0} respostas coletadas`,
        payload: sub,
      });
    }

    addAuditLog({
      categoria: 'RESPOSTA',
      tipoAcao: 'NOVA_COLETA',
      tituloAcao: 'Nova Coleta Registrada em Campo',
      descricaoDetalhada: `Coleta #${sub.codigoPesquisa || sub.id} recebida para a pesquisa "${sub.pesquisaNome}" realizada por ${sub.pesquisadorNome}.`,
      autor: {
        id: sub.pesquisadorId || currentUser.id,
        nome: sub.pesquisadorNome || currentUser.nome,
        login: currentUser.login,
        perfil: 'Pesquisador de Campo',
      },
      alvo: {
        tipo: 'resposta',
        id: sub.id,
        identificador: `Coleta #${sub.codigoPesquisa || sub.id}`,
        nome: sub.pesquisaNome,
      },
      alteracoes: [
        { campo: 'totalRespostas', rotulo: 'Respostas Coletadas', valorNovo: `${sub.respostas?.length || 0} respostas` },
        { campo: 'geolocalizacao', rotulo: 'GPS', valorNovo: sub.geolocalizacao ? 'Registrado' : 'Não capturado' },
        { campo: 'audio', rotulo: 'Áudio Gravado', valorNovo: sub.audioGravacao ? 'Gravado' : 'Sem áudio' },
      ],
      motivoConformidade: 'Sincronização padrão de entrevista realizada presencialmente ou via web.',
      statusConformidade: 'conforme',
    });

    // Automatically update target counters for this survey
    setSurveys((prevSurveys) =>
      prevSurveys.map((sv) => {
        if (sv.id !== sub.pesquisaId) return sv;
        const updatedMetas = sv.metas.map((meta) => {
          const resp = sub.respostas.find((r) => r.perguntaId === meta.perguntaId);
          if (!resp) return meta;

          const respStr = String(Array.isArray(resp.resposta) ? resp.resposta.join(',') : resp.resposta);
          let match = false;
          if (meta.condicao === 'igual') {
            match = respStr.trim().toLowerCase() === meta.resposta.trim().toLowerCase();
          } else if (meta.condicao === 'diferente') {
            match = respStr.trim().toLowerCase() !== meta.resposta.trim().toLowerCase();
          } else if (meta.condicao === 'contem') {
            match = respStr.toLowerCase().includes(meta.resposta.toLowerCase());
          }

          if (match) {
            return {
              ...meta,
              quantidadeAtingida: (meta.quantidadeAtingida || 0) + 1,
            };
          }
          return meta;
        });

        return { ...sv, metas: updatedMetas };
      })
    );
  };

  const updateSubmissionAnswers = (
    submissionId: string,
    updatedAnswers: { perguntaId: string; resposta: string | string[] }[],
    motivo: string
  ) => {
    const targetSub = submissions.find((s) => s.id === submissionId);
    if (targetSub) {
      const changes: FieldChange[] = [];
      targetSub.respostas.forEach((orig) => {
        const found = updatedAnswers.find((u) => u.perguntaId === orig.perguntaId);
        if (found) {
          const origVal = Array.isArray(orig.resposta) ? orig.resposta.join(', ') : String(orig.resposta);
          const newVal = Array.isArray(found.resposta) ? found.resposta.join(', ') : String(found.resposta);
          if (origVal !== newVal) {
            changes.push({
              campo: `${orig.perguntaCodigo} - ${orig.perguntaEnunciado}`,
              rotulo: `Questão ${orig.perguntaCodigo}`,
              valorAnterior: origVal,
              valorNovo: newVal,
            });
          }
        }
      });

      addAuditLog({
        categoria: 'RESPOSTA',
        tipoAcao: 'EDICAO_RESPOSTA',
        tituloAcao: 'Retificação de Resposta em Entrevista',
        descricaoDetalhada: `Edição em resposta na coleta #${targetSub.codigoPesquisa || targetSub.id} efetuada por ${currentUser.nome}. Justificativa registrada para auditoria e conformidade legal.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'resposta',
          id: targetSub.id,
          identificador: `Coleta #${targetSub.codigoPesquisa || targetSub.id}`,
          nome: targetSub.pesquisaNome,
        },
        alteracoes: changes.length > 0 ? changes : [{ campo: 'resposta', rotulo: 'Respostas', valorNovo: 'Respostas auditadas' }],
        motivoConformidade: motivo || 'Correção administrativa autorizada para conformidade de dados.',
        statusConformidade: 'conforme',
      });
    }

    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId) return sub;

        const mergedAnswers = sub.respostas.map((orig) => {
          const found = updatedAnswers.find((u) => u.perguntaId === orig.perguntaId);
          if (found) {
            return { ...orig, resposta: found.resposta };
          }
          return orig;
        });

        const newAudit = {
          alteradoPor: `${currentUser.nome} (${currentUser.login})`,
          dataHora: new Date().toISOString(),
          motivo,
        };

        return {
          ...sub,
          respostas: mergedAnswers,
          respostasAlteradasPeloAdmin: true,
          historicoEdicao: [...(sub.historicoEdicao || []), newAudit],
        };
      })
    );
  };

  const deleteSubmission = (id: string) => {
    const target = submissions.find((s) => s.id === id);
    if (target) {
      addAuditLog({
        categoria: 'RESPOSTA',
        tipoAcao: 'EXCLUSAO_RESPOSTA',
        tituloAcao: 'Exclusão de Resposta / Entrevista',
        descricaoDetalhada: `Entrevista #${target.codigoPesquisa || target.id} excluída do banco de respostas.`,
        autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          login: currentUser.login,
          perfil: currentProfile?.name || 'Colaborador',
        },
        alvo: {
          tipo: 'resposta',
          id: target.id,
          identificador: `Coleta #${target.codigoPesquisa || target.id}`,
          nome: target.pesquisaNome,
        },
        motivoConformidade: 'Exclusão autorizada pelo administrador por invalidade amostral ou desistência do entrevistado (LGPD).',
        statusConformidade: 'atencao',
      });
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const addImport = (imp: ExternalImport) => {
    setImports((prev) => [imp, ...prev]);
  };

  const deleteImport = (id: string) => {
    setImports((prev) => prev.filter((i) => i.id !== id));
  };

  const syncOfflineQueue = async (): Promise<{ success: boolean; count: number; message: string }> => {
    if (offlineQueue.length === 0) {
      return { success: true, count: 0, message: 'Nenhum registro pendente para sincronização.' };
    }

    const count = offlineQueue.length;
    // Mark as synchronizing
    setOfflineQueue((prev) => prev.map((item) => ({ ...item, status: 'sincronizando' })));

    // Simulate server synchronization delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Ensure all items are safely merged into active state
    offlineQueue.forEach((item) => {
      if (item.tipo === 'PESQUISA_SALVA' && item.payload) {
        const s = item.payload as Survey;
        setSurveys((prev) => {
          const idx = prev.findIndex((x) => x.id === s.id);
          if (idx >= 0) {
            const arr = [...prev];
            arr[idx] = s;
            return arr;
          }
          return [s, ...prev];
        });
      } else if (item.tipo === 'RESPOSTA_COLETA' && item.payload) {
        const sub = item.payload as InterviewSubmission;
        setSubmissions((prev) => {
          if (!prev.some((x) => x.id === sub.id)) {
            return [sub, ...prev];
          }
          return prev;
        });
      }
    });

    addAuditLog({
      categoria: 'SISTEMA',
      tipoAcao: 'SINCRONIZACAO_OFFLINE',
      tituloAcao: 'Sincronização de Dados Coletados Offline Concluída',
      descricaoDetalhada: `${count} registro(s) salvo(s) offline foram transmitidos e sincronizados com sucesso com a base central.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Operador',
      },
      alvo: {
        tipo: 'sistema',
        id: `sync_${Date.now()}`,
        identificador: `Lote #${Date.now().toString().slice(-6)}`,
        nome: 'Fila de Dados Offline',
      },
      alteracoes: [
        { campo: 'totalItens', rotulo: 'Itens Sincronizados', valorNovo: `${count} registros` },
        { campo: 'statusFila', rotulo: 'Status da Fila', valorAnterior: 'Pendente', valorNovo: 'Sincronizado' },
      ],
      motivoConformidade: 'Sincronização segura de coletas e pesquisas formuladas em campo remoto sem conectividade inicial.',
      statusConformidade: 'conforme',
    });

    setOfflineQueue([]);
    return {
      success: true,
      count,
      message: `${count} item(ns) sincronizado(s) com sucesso com o servidor central!`,
    };
  };

  // Bulk Survey Operations
  const bulkUpdateSurveysStatus = (ids: string[], status: 'ativa' | 'inativa') => {
    if (ids.length === 0) return;
    setSurveys((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status, atualizadaEm: new Date().toISOString() } : s))
    );
    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Status em Lote (${ids.length} pesquisas)`,
      descricaoDetalhada: `Status de ${ids.length} pesquisa(s) alterado para "${status.toUpperCase()}".`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: `bulk_survey_${Date.now()}`,
        identificador: `${ids.length} pesquisas selecionadas`,
        nome: `Lote de ${ids.length} pesquisas`,
      },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorNovo: status }],
      motivoConformidade: 'Gestão em lote de disponibilidade e ciclo operacional de pesquisas.',
      statusConformidade: 'conforme',
    });
  };

  const bulkDeleteSurveys = (ids: string[]) => {
    if (ids.length === 0) return;
    setSurveys((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'excluida', atualizadaEm: new Date().toISOString() } : s))
    );
    addAuditLog({
      categoria: 'PESQUISA',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Exclusão em Lote (${ids.length} pesquisas)`,
      descricaoDetalhada: `${ids.length} pesquisa(s) selecionada(s) foram movidas para a lixeira por ${currentUser.nome}.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'pesquisa',
        id: `bulk_del_${Date.now()}`,
        identificador: `${ids.length} pesquisas`,
        nome: 'Exclusão em Lote',
      },
      alteracoes: [{ campo: 'status', rotulo: 'Status', valorNovo: 'excluida' }],
      motivoConformidade: 'Exclusão coletiva autorizada pelo administrador.',
      statusConformidade: 'atencao',
    });
  };

  const bulkReplicateSurveys = (ids: string[]): Survey[] => {
    const list: Survey[] = [];
    ids.forEach((id) => {
      try {
        const rep = replicateSurvey(id);
        list.push(rep);
      } catch (err) {
        console.error('Erro ao replicar pesquisa:', err);
      }
    });
    return list;
  };

  // Bulk Collaborator Operations
  const bulkUpdateCollaboratorsStatus = (ids: string[], ativo: boolean) => {
    if (ids.length === 0) return;
    setCollaborators((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, ativo } : c))
    );
    addAuditLog({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Status de Colaboradores em Lote (${ids.length} usuários)`,
      descricaoDetalhada: `${ids.length} colaborador(es) marcado(s) como ${ativo ? 'ATIVO' : 'INATIVO'} por ${currentUser.nome}.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_colab_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
        nome: 'Lote de Colaboradores',
      },
      alteracoes: [{ campo: 'ativo', rotulo: 'Status Operacional', valorNovo: ativo ? 'Ativo' : 'Inativo' }],
      motivoConformidade: 'Gestão coletiva de acessos e ativação de operadores de campo.',
      statusConformidade: 'conforme',
    });
  };

  const bulkUpdateCollaboratorsProfile = (ids: string[], perfilId: string) => {
    if (ids.length === 0) return;
    const targetProf = profiles.find((p) => p.id === perfilId);
    setCollaborators((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, perfilAcessoId: perfilId } : c))
    );
    addAuditLog({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Alteração de Perfil de Acesso em Lote (${ids.length} colaboradores)`,
      descricaoDetalhada: `Perfil de ${ids.length} colaborador(es) alterado para "${targetProf?.name || perfilId}" por ${currentUser.nome}.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_prof_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
        nome: targetProf?.name,
      },
      alteracoes: [{ campo: 'perfilAcessoId', rotulo: 'Perfil de Acesso', valorNovo: targetProf?.name }],
      motivoConformidade: 'Reclassificação coletiva de privilégios de segurança RBAC.',
      statusConformidade: 'atencao',
    });
  };

  const bulkDeleteCollaborators = (ids: string[]) => {
    if (ids.length === 0) return;
    setCollaborators((prev) => prev.filter((c) => !ids.includes(c.id)));
    addAuditLog({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: `Exclusão em Lote de Colaboradores (${ids.length} registros)`,
      descricaoDetalhada: `${ids.length} colaborador(es) foram removidos do sistema por ${currentUser.nome}.`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_del_colab_${Date.now()}`,
        identificador: `${ids.length} colaboradores`,
      },
      motivoConformidade: 'Desligamento ou exclusão em lote de registros de operadores.',
      statusConformidade: 'atencao',
    });
  };

  const bulkAssignCollaboratorsToSurveys = (colabIds: string[], surveyIds: string[]) => {
    if (colabIds.length === 0 || surveyIds.length === 0) return;
    setCollaborators((prev) =>
      prev.map((c) => {
        if (!colabIds.includes(c.id)) return c;
        const currentSurveys = c.pesquisasVinculadasIds || [];
        const merged = Array.from(new Set([...currentSurveys, ...surveyIds]));
        return { ...c, pesquisasVinculadasIds: merged };
      })
    );
    setSurveys((prev) =>
      prev.map((s) => {
        if (!surveyIds.includes(s.id)) return s;
        const currentRes = s.pesquisadoresIds || [];
        const merged = Array.from(new Set([...currentRes, ...colabIds]));
        return { ...s, pesquisadoresIds: merged };
      })
    );
    addAuditLog({
      categoria: 'CONFIGURACAO',
      tipoAcao: 'ACAO_EM_LOTE',
      tituloAcao: 'Vinculação em Lote de Colaboradores e Pesquisas',
      descricaoDetalhada: `${colabIds.length} colaborador(es) alocado(s) em ${surveyIds.length} pesquisa(s).`,
      autor: {
        id: currentUser.id,
        nome: currentUser.nome,
        login: currentUser.login,
        perfil: currentProfile?.name || 'Administrador',
      },
      alvo: {
        tipo: 'colaborador',
        id: `bulk_assign_${Date.now()}`,
        identificador: `${colabIds.length} colabs x ${surveyIds.length} pesquisas`,
      },
      motivoConformidade: 'Alocação de equipes de campo para coletas autorizadas.',
      statusConformidade: 'conforme',
    });
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setProfiles(initialProfiles);
    setCollaborators(initialCollaborators);
    setSurveys(initialSurveys);
    setSubmissions(initialSubmissions);
    setImports(initialImports);
    setAuditLogs(initialAuditLogs);
    setAnalyticalReports(initialAnalyticalReports);
    setCurrentUser(initialCollaborators[0]);
    setTwoFactorVerified(true);
    setActiveModule('home');
    setOfflineQueue([]);
    setIsSimulatedOfflineState(false);
    clearCurrentSurveyDraftFromDB().catch(console.error);
    setPendingIndexedDbCount(0);
    setSupabaseSyncStatus('synced');
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        language,
        setLanguage,
        darkMode,
        setDarkMode,
        currentUser,
        setCurrentUser,
        currentProfile,
        twoFactorVerified,
        setTwoFactorVerified,
        verify2FA,
        profiles,
        updateProfile,
        collaborators,
        saveCollaborator,
        toggleCollaboratorStatus,
        surveys,
        saveSurvey,
        replicateSurvey,
        toggleSurveyStatus,
        finalizeSurvey,
        reopenSurvey,
        setSurveyReEnabledForResearcher,
        deleteSurvey,
        restoreSurvey,
        submissions,
        addSubmission,
        updateSubmissionAnswers,
        deleteSubmission,
        connections,
        imports,
        addImport,
        deleteImport,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        analyticalReports,
        saveAnalyticalReport,
        deleteAnalyticalReport,
        activeModule,
        setActiveModule,
        editingSurvey,
        setEditingSurvey,
        filterSurveyId,
        setFilterSurveyId,
        hasPermission,
        resetToDefaults,

        // Offline & Sync
        isOnline,
        isSimulatedOffline,
        effectiveOnline,
        setSimulatedOffline,
        offlineQueue,
        addOfflineItem,
        removeOfflineItem,
        clearOfflineQueue,
        syncOfflineQueue,

        // IndexedDB & Supabase Sync
        currentSurveyDraft,
        currentSurveyDraftStep,
        lastIndexedDBSave,
        supabaseSyncStatus,
        lastSupabaseSync,
        pendingIndexedDbCount,
        saveCurrentSurveyDraft,
        loadCurrentSurveyDraft,
        clearCurrentSurveyDraft,
        syncAllPendingWithSupabase,
        isSupabaseLive,
        lastAutoSyncNotice,
        setLastAutoSyncNotice,

        // Connection Monitor & Sync Progress Tracking
        connectionState,
        syncProgress,
        dismissSyncProgress,
        forceSyncPendingWithSupabase,
        checkConnectionNow,

        // Bulk Actions
        bulkUpdateSurveysStatus,
        bulkDeleteSurveys,
        bulkReplicateSurveys,
        bulkUpdateCollaboratorsStatus,
        bulkUpdateCollaboratorsProfile,
        bulkDeleteCollaborators,
        bulkAssignCollaboratorsToSurveys,

        // Global Demographic Goals Management
        saveGlobalTarget,
        deleteGlobalTarget,
        assignResearcherQuota,

        // Central Server Sync
        serverOnline,
        isSurveyInProgress,
        syncSurveyWithCentralServer,
        uploadSurveyChangesToCentralServer,
        refreshSurveysFromServer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
