import type { Dispatch, SetStateAction } from 'react';
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
  GlobalDemographicTarget,
  ResearcherQuotaAssignment,
  BaseMeta,
  AnalyticalReport,
  ServerSyncCheckResult,
} from '../../types';

// =============================================================================
// F3 — Contratos dos domínios do AppContext
//
// O AppContext original (2,9 mil linhas) foi dividido em cinco domínios que
// possuem o próprio estado e a própria lógica:
//
//   1. Autenticação e permissões  (AuthDomain)
//   2. Cadastros                  (CadastrosDomain)
//   3. Coletas e sincronização    (ColetasDomain)
//   4. Pesquisas                  (SurveysDomain)
//   5. Auditoria                  (AuditDomain)
//
// Cada tela pode consumir só o domínio de que precisa (`useAuth`, `useSurveys`,
// `useColetas`, `useCadastros`, `useAuditoria`) e `useApp()` continua devolvendo
// a API completa, compatível com todas as telas atuais.
//
// Os domínios conversam por um `DomainBridge` explícito (poucos pontos de
// contato), em vez de um objeto monólito — é o que quebra as dependências
// cruzadas entre Pesquisas, Coletas e Cadastros.
// =============================================================================

export interface AuthDomain {
  isAuthenticated: boolean;
  login: (loginInput: string, senhaInput: string) => Promise<{ success: boolean; error?: string }>;
  isAuthChecking: boolean;
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
  updateProfile: (p: AccessProfile) => { changed: boolean; changes: FieldChange[] };
  hasPermission: (perm: keyof AccessPolicyPermissions) => boolean;
  /** Módulo ativo da casca (Home, Pesquisador, ...). */
  activeModule: string;
  setActiveModule: (m: string) => void;
  /** Interno: hidrata perfis/colaboradores/pesquisas do servidor (F2). */
  hydrateFromServer: () => Promise<void>;
}

export interface CadastrosDomain {
  collaborators: Collaborator[];
  saveCollaborator: (c: Collaborator, senha?: string) => Promise<boolean>;
  toggleCollaboratorStatus: (id: string) => void;
  licenseQuota: number | null;
  setLicenseQuota: (q: number | null) => void;
  setSurveyReEnabledForResearcher: (surveyId: string, researcherId: string, enabled: boolean) => void;
  bulkUpdateCollaboratorsStatus: (ids: string[], ativo: boolean) => void;
  bulkUpdateCollaboratorsProfile: (ids: string[], perfilId: string) => void;
  bulkDeleteCollaborators: (ids: string[]) => void;
  bulkAssignCollaboratorsToSurveys: (colabIds: string[], surveyIds: string[]) => void;
}

export interface ColetasDomain {
  submissions: InterviewSubmission[];
  addSubmission: (sub: InterviewSubmission) => void;
  updateSubmissionAnswers: (
    submissionId: string,
    answers: { perguntaId: string; resposta: string | string[] }[],
    motivo: string
  ) => void;
  deleteSubmission: (id: string) => void;
  imports: ExternalImport[];
  addImport: (imp: ExternalImport) => void;
  deleteImport: (id: string) => void;

  // Offline & Sincronização
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  offlineQueue: OfflineSyncItem[];
  addOfflineItem: (item: Omit<OfflineSyncItem, 'id' | 'dataCriacao' | 'status'>) => OfflineSyncItem;
  removeOfflineItem: (id: string) => void;
  clearOfflineQueue: () => void;
  syncOfflineQueue: () => Promise<{ success: boolean; count: number; message: string }>;

  // Cache IndexedDB & sincronização com o servidor central
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

  // Monitor de conexão e progresso
  connectionState: 'online' | 'offline' | 'reconnecting' | 'syncing';
  syncProgress: SyncProgressState;
  dismissSyncProgress: () => void;
  forceSyncPendingWithSupabase: (
    isAutoTriggered?: boolean
  ) => Promise<{ success: boolean; count: number; message: string }>;
  checkConnectionNow: () => Promise<boolean>;

  serverOnline: boolean;
  /** Interno: zera o estado do cache offline local (usado pelo reset). */
  resetOfflineCacheState: () => void;
  isSurveyInProgress: (survey: Survey) => boolean;
  syncSurveyWithCentralServer: (surveyId: string, clientDraft?: Partial<Survey>) => Promise<ServerSyncCheckResult>;
  uploadSurveyChangesToCentralServer: (
    survey: Survey,
    syncToken?: string
  ) => Promise<{ success: boolean; survey?: Survey; message: string; requiresSync?: boolean }>;
  refreshSurveysFromServer: () => Promise<void>;
}

export interface SurveysDomain {
  surveys: Survey[];
  saveSurvey: (s: Survey) => void;
  replicateSurvey: (surveyId: string) => Survey;
  toggleSurveyStatus: (surveyId: string) => void;
  finalizeSurvey: (surveyId: string) => void;
  reopenSurvey: (surveyId: string) => void;
  deleteSurvey: (surveyId: string) => void;
  restoreSurvey: (surveyId: string) => void;
  analyticalReports: AnalyticalReport[];
  saveAnalyticalReport: (report: AnalyticalReport) => void;
  deleteAnalyticalReport: (reportId: string) => void;
  editingSurvey: Survey | null;
  setEditingSurvey: (s: Survey | null) => void;
  filterSurveyId: string;
  setFilterSurveyId: (id: string) => void;
  saveGlobalTarget: (surveyId: string, target: GlobalDemographicTarget) => void;
  deleteGlobalTarget: (surveyId: string, targetId: string) => void;
  assignResearcherQuota: (
    surveyId: string,
    targetId: string,
    assignment: ResearcherQuotaAssignment
  ) => void;
  baseMetas: BaseMeta[];
  saveBaseMeta: (meta: BaseMeta) => void;
  deleteBaseMeta: (metaId: string) => void;
  bulkUpdateSurveysStatus: (ids: string[], status: 'ativa' | 'inativa') => void;
  bulkDeleteSurveys: (ids: string[]) => void;
  bulkReplicateSurveys: (ids: string[]) => Survey[];
}

export interface AuditDomain {
  auditLogs: ActionAuditLog[];
  addAuditLog: (log: any) => ActionAuditLog;
  clearAuditLogs: () => void;
  connections: RecentConnection[];
}

// ----------------------------------------------------------------------------
// Órgãos internos que cada domínio entrega à raiz para montar a ponte. Ficam
// separados da API pública (`XDomain`) para não vazar detalhes internos ao
// `useApp()`. A raiz é quem escreve na ponte.
// ----------------------------------------------------------------------------
export interface AuthInternal {
  /** Nada além da API pública hoje. */
  _placeholder?: never;
}
export interface CadastrosInternal {
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
}
export interface ColetasInternal {
  notifySurveySyncResult: (success: boolean) => void;
  notifyPendingOfflineSave: () => void;
}
export interface SurveysInternal {
  setSurveys: Dispatch<SetStateAction<Survey[]>>;
}
export interface AuditInternal {
  _placeholder?: never;
}

/**
 * Ponte explícita entre domínios. Cada domínio publica aqui (durante o render)
 * as poucas funções que os outros precisam consumir. Isso evita imports
 * circulares e mantém cada domínio dono do seu próprio estado.
 */
export interface DomainBridge {
  // Fornecido por AuditDomain
  addAuditLog: (log: any) => ActionAuditLog;
  // Fornecido por AuthDomain
  getCurrentUser: () => Collaborator;
  getCurrentProfile: () => AccessProfile | undefined;
  setCurrentUser: (c: Collaborator) => void;
  getProfiles: () => AccessProfile[];
  // Fornecido por CadastrosDomain
  getCollaborators: () => Collaborator[];
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  // Fornecido por ColetasDomain
  getSubmissions: () => InterviewSubmission[];
  getEffectiveOnline: () => boolean;
  addOfflineItem: (item: Omit<OfflineSyncItem, 'id' | 'dataCriacao' | 'status'>) => OfflineSyncItem;
  /** Atualiza o indicador de sincronização após um upload de pesquisa. */
  notifySurveySyncResult: (success: boolean) => void;
  /** Marca que há alteração offline pendente no cache de campo. */
  notifyPendingOfflineSave: () => void;
  // Fornecido por SurveysDomain
  getSurveys: () => Survey[];
  setSurveys: Dispatch<SetStateAction<Survey[]>>;
  // Fornecido pela raiz (casca da aplicação)
  setActiveModule: (m: string) => void;
}
