import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ExternalImport,
  FieldChange,
  InterviewSubmission,
  OfflineSyncItem,
  Survey,
  SyncProgressItem,
  SyncProgressState,
} from '../../types';
import { initialImports, initialSubmissions } from '../../mockData';
import { matchSubmissionToMeta, isResearcherReached } from '../../utils/metaComposition';
import {
  saveCurrentSurveyDraftToDB,
  getCurrentSurveyDraftFromDB,
  clearCurrentSurveyDraftFromDB,
  saveOfflineSurveyToDB,
  getAllPendingOfflineSurveysFromDB,
  markSurveySyncedInDB,
} from '../../utils/indexedDBStorage';
import { syncSurveyToSupabase, isSupabaseConfigured } from '../../services/supabaseSyncService';
import {
  fetchServerSurveys,
  syncSurveyWithServer,
  uploadSurveyToServer,
  checkServerHealth,
} from '../../services/serverSurveyService';
import { uploadSubmissionsToServer, uploadSubmissionToServer } from '../../services/serverSubmissionService';
import { ServerSyncCheckResult } from '../../types';
import type { ColetasDomain, ColetasInternal } from './types';
import { domainBridge as bridge } from './bridge';

// =============================================================================
// F3 · Domínio COLETAS E SINCRONIZAÇÃO
// Dono do estado: entrevistas coletadas, importações, fila offline, cache de
// campo (IndexedDB), monitor de conexão e progresso de sincronização.
// É o domínio mais acoplado ao servidor central — concentra aqui as rotas de
// sincronização prévia/upload e a restauração de pesquisas do servidor.
// =============================================================================

const STORAGE_KEYS = {
  SUBMISSIONS: 'dataquest_submissions_v1',
  IMPORTS: 'dataquest_imports_v1',
  OFFLINE_QUEUE: 'dataquest_offline_sync_queue',
  SIMULATED_OFFLINE: 'dataquest_simulated_offline',
};

export const ColetasContext = createContext<ColetasDomain | null>(null);

export function useColetasDomain(): { domain: ColetasDomain; internal: ColetasInternal } {
  const [submissions, setSubmissions] = useState<InterviewSubmission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    return saved ? JSON.parse(saved) : initialSubmissions;
  });

  const [imports, setImports] = useState<ExternalImport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IMPORTS);
    return saved ? JSON.parse(saved) : initialImports;
  });

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  });

  const effectiveOnline = isOnline && !isSimulatedOffline;

  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'reconnecting' | 'syncing'>(() => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const simulatedOff = localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
    return online && !simulatedOff ? 'online' : 'offline';
  });

  const [syncProgress, setSyncProgress] = useState<SyncProgressState>({
    isActive: false,
    phase: 'idle',
    current: 0,
    total: 0,
    percent: 0,
    message: '',
    syncedItems: [],
  });

  const [serverOnline, setServerOnline] = useState<boolean>(true);

  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });

  // Cache offline de campo (IndexedDB)
  const [currentSurveyDraft, setCurrentSurveyDraft] = useState<Survey | null>(null);
  const [currentSurveyDraftStep, setCurrentSurveyDraftStep] = useState<number>(1);
  const [lastIndexedDBSave, setLastIndexedDBSave] = useState<string | null>(null);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  const [lastSupabaseSync, setLastSupabaseSync] = useState<string | null>(null);
  const [pendingIndexedDbCount, setPendingIndexedDbCount] = useState<number>(0);
  const [lastAutoSyncNotice, setLastAutoSyncNotice] = useState<string | null>(null);
  const isSupabaseLive = isSupabaseConfigured();

  const dismissSyncProgress = () => {
    setSyncProgress((prev) => ({ ...prev, isActive: false, phase: 'idle' }));
  };

  /** Atualiza o indicador de sincronização (chamado pelo domínio de Pesquisas). */
  const notifySurveySyncResult = (success: boolean) => {
    if (success) {
      setSupabaseSyncStatus('synced');
      setLastSupabaseSync(new Date().toLocaleTimeString());
    } else {
      setSupabaseSyncStatus('error');
    }
  };

  /** Marca alteração offline pendente no cache de campo. */
  const notifyPendingOfflineSave = () => {
    setSupabaseSyncStatus('pending');
    getAllPendingOfflineSurveysFromDB()
      .then((items) => setPendingIndexedDbCount(items.length))
      .catch(() => undefined);
  };

  /** Zera o cache offline local (usado pelo resetToDefaults da raiz). */
  const resetOfflineCacheState = () => {
    setOfflineQueue([]);
    setCurrentSurveyDraft(null);
    setCurrentSurveyDraftStep(1);
    setLastIndexedDBSave(null);
    setPendingIndexedDbCount(0);
    setSupabaseSyncStatus('synced');
  };

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

  // Save current survey draft to IndexedDB
  const saveCurrentSurveyDraft = async (survey: Survey, step = 1) => {
    setCurrentSurveyDraft(survey);
    setCurrentSurveyDraftStep(step);
    const now = new Date().toISOString();
    setLastIndexedDBSave(now);

    const isOffline = !effectiveOnline;
    await saveCurrentSurveyDraftToDB(survey, step, isOffline);

    if (isOffline) {
      await saveOfflineSurveyToDB(survey);
      setSupabaseSyncStatus('pending');
      const pending = await getAllPendingOfflineSurveysFromDB();
      setPendingIndexedDbCount(pending.length);
    } else {
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

  // Force synchronization of pending offline surveys from IndexedDB to Supabase
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
      const pendingStored = await getAllPendingOfflineSurveysFromDB();
      const draft = await getCurrentSurveyDraftFromDB();
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

      offlineQueue
        .filter((q) => q.tipo === 'PESQUISA_SALVA' && q.payload && q.payload.id)
        .forEach((q) => {
          if (!surveyMap.has(q.payload.id)) {
            surveyMap.set(q.payload.id, q.payload as Survey);
          }
        });

      const surveysToSync = Array.from(surveyMap.values());

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

        setTimeout(() => {
          setSyncProgress((prev) => (prev.phase === 'completed' ? { ...prev, isActive: false } : prev));
        }, 4000);

        return { success: true, count: 0, message: noticeMsg };
      }

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

      for (let i = 0; i < surveysToSync.length; i++) {
        const survey = surveysToSync[i];
        const stepPercent = Math.round(20 + ((i + 0.3) / surveysToSync.length) * 75);

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

            bridge.setSurveys?.((prev) => {
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

        if (surveysToSync.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (draft && draft.isOfflineModified) {
        await saveCurrentSurveyDraftToDB(draft.survey, draft.step, false);
      }

      setOfflineQueue((prev) => prev.filter((item) => item.tipo !== 'PESQUISA_SALVA'));

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

      const currentUser = bridge.getCurrentUser?.();
      const currentProfile = bridge.getCurrentProfile?.();
      bridge.addAuditLog?.({
        categoria: 'SISTEMA',
        tipoAcao: 'SINCRONIZACAO_OFFLINE',
        tituloAcao: 'Sincronização Forçada IndexedDB -> Supabase',
        descricaoDetalhada: `${successCount} pesquisa(s) pendentes no cache IndexedDB foram transmitidas automaticamente ao Supabase após restauração do sinal (${isAutoTriggered ? 'navigator.onLine reativo' : 'acionamento direto'}).`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
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

  const syncAllPendingWithSupabase = async (): Promise<{ success: boolean; count: number; message: string }> => {
    return forceSyncPendingWithSupabase(false);
  };

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

  // Helper: identifica se uma pesquisa está em andamento (coletando / em campo)
  const isSurveyInProgress = (survey: Survey): boolean => {
    if (!survey) return false;
    const hasSubs = submissions.some((s) => s.pesquisaId === survey.id);
    return survey.status === 'ativa' || hasSubs || !!survey.emAndamento;
  };

  const refreshSurveysFromServer = async () => {
    if (!effectiveOnline) return;
    try {
      const res = await fetchServerSurveys();
      if (res.success && res.surveys.length > 0) {
        setServerOnline(true);
        bridge.setSurveys?.((prev) => {
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
      console.warn('[Coletas] Servidor central indisponível no momento:', err);
    }
  };

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
      bridge.setSurveys?.((prev) =>
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

      const currentUser = bridge.getCurrentUser?.();
      const currentProfile = bridge.getCurrentProfile?.();
      bridge.addAuditLog?.({
        categoria: 'SISTEMA',
        tipoAcao: 'SINCRONIZACAO_OFFLINE',
        tituloAcao: 'Sincronização Prévia com Servidor Central',
        descricaoDetalhada: `Sincronização obrigatória de pesquisa em andamento "${clientDraft?.nome || surveyId}" validada com o servidor. Token de upload emitido: ${res.syncToken}`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
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
      bridge.setSurveys?.((prev) => {
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

      const currentUser = bridge.getCurrentUser?.();
      const currentProfile = bridge.getCurrentProfile?.();
      bridge.addAuditLog?.({
        categoria: 'PESQUISA',
        tipoAcao: 'EDICAO_PESQUISA',
        tituloAcao: 'Upload de Alterações para o Servidor Central',
        descricaoDetalhada: `Pesquisa em andamento "${survey.nome}" atualizada com sucesso no servidor para v${updated.versao}.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
          perfil: currentProfile?.name || 'Administrador',
        },
        alvo: {
          tipo: 'pesquisa',
          id: survey.id,
          identificador: survey.codigo,
          nome: survey.nome,
        },
        alteracoes: [{ campo: 'versao', rotulo: 'Versão no Servidor', valorNovo: `v${updated.versao}` }],
        motivoConformidade: 'Alterações validadas previamente com o servidor e subidas conforme governança.',
        statusConformidade: 'conforme',
      });

      return { success: true, survey: updated, message: res.message };
    } else {
      return { success: false, requiresSync: res.requiresSync, message: res.message };
    }
  };

  const addSubmission = (sub: InterviewSubmission) => {
    const surveys = bridge.getSurveys?.() || [];
    const surveyForSub = surveys.find((s) => s.id === sub.pesquisaId);
    if (surveyForSub) {
      const metasBloqueadas = (surveyForSub.metas || []).filter(
        (m) =>
          m.bloquearAposAtingir &&
          matchSubmissionToMeta(m, sub) &&
          isResearcherReached(m, submissions, sub.pesquisadorId)
      );
      if (metasBloqueadas.length > 0) {
        const nomes = metasBloqueadas.map((m) => m.nome || m.id).join(', ');
        alert(
          `Coleta bloqueada: a meta "${nomes}" já foi atingida. ` +
            `Novas coletas que se enquadram nessa composição não são permitidas.`
        );
        return;
      }
    }

    setSubmissions((prev) => [sub, ...prev]);

    if (!effectiveOnline) {
      addOfflineItem({
        tipo: 'RESPOSTA_COLETA',
        titulo: `Coleta: ${sub.codigoPesquisa} (#${sub.id})`,
        resumo: `Pesquisador: ${sub.pesquisadorNome} • ${sub.respostas?.length || 0} respostas coletadas`,
        payload: sub,
      });
    } else {
      uploadSubmissionToServer(sub)
        .then((res) => {
          if (!res.success) {
            console.warn(`[Submissions] Falha ao enviar coleta ${sub.id} ao servidor: ${res.message}`);
            addOfflineItem({
              tipo: 'RESPOSTA_COLETA',
              titulo: `Coleta: ${sub.codigoPesquisa} (#${sub.id})`,
              resumo: `Pesquisador: ${sub.pesquisadorNome} • falha ao enviar: ${res.message}`,
              payload: sub,
            });
          }
        })
        .catch((err) => {
          console.warn(`[Submissions] Erro de rede ao enviar coleta ${sub.id}:`, err);
          addOfflineItem({
            tipo: 'RESPOSTA_COLETA',
            titulo: `Coleta: ${sub.codigoPesquisa} (#${sub.id})`,
            resumo: `Pesquisador: ${sub.pesquisadorNome} • erro de rede ao enviar`,
            payload: sub,
          });
        });
    }

    const currentUser = bridge.getCurrentUser?.();
    bridge.addAuditLog?.({
      categoria: 'RESPOSTA',
      tipoAcao: 'NOVA_COLETA',
      tituloAcao: 'Nova Coleta Registrada em Campo',
      descricaoDetalhada: `Coleta #${sub.codigoPesquisa || sub.id} recebida para a pesquisa "${sub.pesquisaNome}" realizada por ${sub.pesquisadorNome}.`,
      autor: {
        id: sub.pesquisadorId || currentUser?.id,
        nome: sub.pesquisadorNome || currentUser?.nome,
        login: currentUser?.login,
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

    // Atualiza contadores de meta da pesquisa no domínio de Pesquisas.
    bridge.setSurveys?.((prevSurveys) =>
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
            return { ...meta, quantidadeAtingida: (meta.quantidadeAtingida || 0) + 1 };
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
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
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

      bridge.addAuditLog?.({
        categoria: 'RESPOSTA',
        tipoAcao: 'EDICAO_RESPOSTA',
        tituloAcao: 'Retificação de Resposta em Entrevista',
        descricaoDetalhada: `Edição em resposta na coleta #${targetSub.codigoPesquisa || targetSub.id} efetuada por ${currentUser?.nome}. Justificativa registrada para auditoria e conformidade legal.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
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
          alteradoPor: `${currentUser?.nome} (${currentUser?.login})`,
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
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();
    if (target) {
      bridge.addAuditLog?.({
        categoria: 'RESPOSTA',
        tipoAcao: 'EXCLUSAO_RESPOSTA',
        tituloAcao: 'Exclusão de Resposta / Entrevista',
        descricaoDetalhada: `Entrevista #${target.codigoPesquisa || target.id} excluída do banco de respostas.`,
        autor: {
          id: currentUser?.id,
          nome: currentUser?.nome,
          login: currentUser?.login,
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
    if (!effectiveOnline) {
      return { success: false, count: 0, message: 'Sem conexão: não é possível sincronizar agora.' };
    }

    const itemsToProcess = offlineQueue;
    setOfflineQueue((prev) => prev.map((item) => ({ ...item, status: 'sincronizando' })));

    const succeededIds: string[] = [];
    const failedItems: { id: string; message: string }[] = [];

    const surveyItems = itemsToProcess.filter((item) => item.tipo === 'PESQUISA_SALVA' && item.payload);
    for (const item of surveyItems) {
      const survey = item.payload as Survey;
      try {
        const res = await uploadSurveyToServer(survey);
        if (res.success) {
          succeededIds.push(item.id);
          bridge.setSurveys?.((prev) => {
            const idx = prev.findIndex((x) => x.id === survey.id);
            if (idx >= 0) {
              const arr = [...prev];
              arr[idx] = survey;
              return arr;
            }
            return [survey, ...prev];
          });
          await markSurveySyncedInDB(survey.id);
        } else {
          failedItems.push({ id: item.id, message: res.message });
        }
      } catch (err: any) {
        failedItems.push({ id: item.id, message: err?.message || 'Falha de rede' });
      }
    }

    const submissionItems = itemsToProcess.filter((item) => item.tipo === 'RESPOSTA_COLETA' && item.payload);
    if (submissionItems.length > 0) {
      const submissionsPayload = submissionItems.map((item) => item.payload as InterviewSubmission);
      try {
        const res = await uploadSubmissionsToServer(submissionsPayload);
        const byId = new Map(res.results.map((r) => [r.id, r]));

        submissionItems.forEach((item) => {
          const sub = item.payload as InterviewSubmission;
          const result = byId.get(sub.id);
          if (result?.success) {
            succeededIds.push(item.id);
            setSubmissions((prev) => (prev.some((x) => x.id === sub.id) ? prev : [sub, ...prev]));
          } else {
            failedItems.push({ id: item.id, message: result?.message || res.message });
          }
        });
      } catch (err: any) {
        submissionItems.forEach((item) => {
          failedItems.push({ id: item.id, message: err?.message || 'Falha de rede' });
        });
      }
    }

    setOfflineQueue((prev) =>
      prev
        .filter((item) => !succeededIds.includes(item.id))
        .map((item) => {
          const failure = failedItems.find((f) => f.id === item.id);
          return failure ? { ...item, status: 'erro' as const, erroMensagem: failure.message } : item;
        })
    );

    const successCount = succeededIds.length;
    const failedCount = failedItems.length;
    const allSucceeded = failedCount === 0;
    const currentUser = bridge.getCurrentUser?.();
    const currentProfile = bridge.getCurrentProfile?.();

    bridge.addAuditLog?.({
      categoria: 'SISTEMA',
      tipoAcao: 'SINCRONIZACAO_OFFLINE',
      tituloAcao: allSucceeded
        ? 'Sincronização de Dados Coletados Offline Concluída'
        : 'Sincronização de Dados Coletados Offline Concluída com Falhas',
      descricaoDetalhada: allSucceeded
        ? `${successCount} registro(s) salvo(s) offline foram transmitidos e sincronizados com sucesso com a base central.`
        : `${successCount} registro(s) sincronizados, ${failedCount} falharam e permanecem na fila para nova tentativa: ${failedItems
            .map((f) => f.message)
            .join(' | ')}`,
      autor: {
        id: currentUser?.id,
        nome: currentUser?.nome,
        login: currentUser?.login,
        perfil: currentProfile?.name || 'Operador',
      },
      alvo: {
        tipo: 'sistema',
        id: `sync_${Date.now()}`,
        identificador: `Lote #${Date.now().toString().slice(-6)}`,
        nome: 'Fila de Dados Offline',
      },
      alteracoes: [
        { campo: 'totalItens', rotulo: 'Itens Sincronizados', valorNovo: `${successCount} registros` },
        { campo: 'falhas', rotulo: 'Falhas de Envio', valorNovo: `${failedCount}` },
        { campo: 'statusFila', rotulo: 'Status da Fila', valorAnterior: 'Pendente', valorNovo: allSucceeded ? 'Sincronizado' : 'Parcialmente sincronizado' },
      ],
      motivoConformidade: 'Sincronização segura de coletas e pesquisas formuladas em campo remoto sem conectividade inicial.',
      statusConformidade: allSucceeded ? 'conforme' : 'atencao',
    });

    return {
      success: allSucceeded,
      count: successCount,
      message: allSucceeded
        ? `${successCount} item(ns) sincronizado(s) com sucesso com o servidor central!`
        : `${successCount} sincronizado(s), ${failedCount} falharam e continuam pendentes na fila.`,
    };
  };

  // ---------------------------------------------------------------------------
  // Efeitos
  // ---------------------------------------------------------------------------

  // Monitor de conexão (eventos + heartbeat + visibilidade).
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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IMPORTS, JSON.stringify(imports));
  }, [imports]);

  // Carrega rascunho e pendências do IndexedDB (cache offline de campo).
  useEffect(() => {
    getCurrentSurveyDraftFromDB()
      .then((draft) => {
        if (draft && draft.survey) {
          setCurrentSurveyDraft(draft.survey);
          setCurrentSurveyDraftStep(draft.step || 1);
          setLastIndexedDBSave(draft.updatedAt);
        }
      })
      .catch((err) => console.warn('Erro ao carregar rascunho do IndexedDB:', err));

    getAllPendingOfflineSurveysFromDB()
      .then((items) => {
        setPendingIndexedDbCount(items.length);
        if (items.length > 0) {
          setSupabaseSyncStatus('pending');
        }
      })
      .catch((err) => console.warn('Erro ao carregar pesquisas offline do IndexedDB:', err));
  }, []);

  // Reconexão automática: sobe pendências e revalida pesquisas no servidor.
  const prevEffectiveOnlineRef = useRef(effectiveOnline);
  useEffect(() => {
    const wasOffline = !prevEffectiveOnlineRef.current;
    const isNowOnline = effectiveOnline;
    prevEffectiveOnlineRef.current = effectiveOnline;

    if (wasOffline && isNowOnline) {
      console.log('[ConnectionMonitor] Sinal de rede restabelecido (navigator.onLine = true). Forçando fila de sincronização IndexedDB -> Supabase...');
      setConnectionState('reconnecting');
      forceSyncPendingWithSupabase(true);
      syncOfflineQueue().catch((err) =>
        console.warn('[ConnectionMonitor] Falha ao sincronizar fila offline automaticamente:', err)
      );
      refreshSurveysFromServer();
    } else if (!isNowOnline) {
      setConnectionState('offline');
    } else {
      setConnectionState('online');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOnline]);

  // Busca inicial no servidor central.
  useEffect(() => {
    refreshSurveysFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOnline]);

  const domain: ColetasDomain = {
    submissions,
    addSubmission,
    updateSubmissionAnswers,
    deleteSubmission,
    imports,
    addImport,
    deleteImport,
    isOnline,
    isSimulatedOffline,
    effectiveOnline,
    setSimulatedOffline,
    offlineQueue,
    addOfflineItem,
    removeOfflineItem,
    clearOfflineQueue,
    syncOfflineQueue,
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
    connectionState,
    syncProgress,
    dismissSyncProgress,
    forceSyncPendingWithSupabase,
    checkConnectionNow,
    serverOnline,
    resetOfflineCacheState,
    isSurveyInProgress,
    syncSurveyWithCentralServer,
    uploadSurveyChangesToCentralServer,
    refreshSurveysFromServer,
  };

  return { domain, internal: { notifySurveySyncResult, notifyPendingOfflineSave } };
}

/** Hook do domínio de Coletas e Sincronização. */
export function useColetas(): ColetasDomain {
  const ctx = useContext(ColetasContext);
  if (!ctx) {
    throw new Error('useColetas deve ser usado dentro de <AppProvider> (domínio Coletas).');
  }
  return ctx;
}
