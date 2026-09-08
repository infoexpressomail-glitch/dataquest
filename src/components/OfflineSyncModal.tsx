import React, { useState } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  Info,
  Check,
  Database,
  Server,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface OfflineSyncModalProps {
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ onClose }) => {
  const {
    isOnline,
    isSimulatedOffline,
    effectiveOnline,
    setSimulatedOffline,
    offlineQueue,
    syncOfflineQueue,
    removeOfflineItem,
    clearOfflineQueue,
    currentSurveyDraft,
    lastIndexedDBSave,
    supabaseSyncStatus,
    lastSupabaseSync,
    pendingIndexedDbCount,
    syncAllPendingWithSupabase,
    forceSyncPendingWithSupabase,
    checkConnectionNow,
    connectionState,
    syncProgress,
    isSupabaseLive,
    clearCurrentSurveyDraft,
  } = useApp();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSync = async () => {
    if (!effectiveOnline) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncOfflineQueue();
      setSyncResult({ success: res.success, message: res.message });
    } catch (e: any) {
      setSyncResult({
        success: false,
        message: e?.message || 'Falha ao sincronizar com o servidor.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-ui bg-surface p-6 shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ui pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                effectiveOnline
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
              }`}
            >
              {effectiveOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                Sincronização & Armazenamento Offline
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                    effectiveOnline
                      ? 'bg-accent-success-soft text-accent-success border-accent-success-soft-border'
                      : 'bg-accent-warning-soft text-accent-warning border-accent-warning-soft-border'
                  }`}
                >
                  {effectiveOnline ? 'Online' : 'Offline'}
                </span>
              </h2>
              <p className="text-xs text-muted">
                Gerencie as pesquisas e coletas salvas no dispositivo para envio ao servidor central.
              </p>
            </div>
          </div>
          <button
            id="btn-close-offline-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connectivity Status & Simulated Offline Toggle */}
        <div className="mt-4 rounded-xl border border-ui bg-surface-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-primary">
                Simular Modo Offline (Testes de Campo)
              </div>
              <div className="text-[11px] text-muted">
                Permite testar a criação e edição de pesquisas e coletas sem enviar ao servidor até sincronizar.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="toggle-simulated-offline"
                checked={isSimulatedOffline}
                onChange={(e) => {
                  setSimulatedOffline(e.target.checked);
                  setSyncResult(null);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-warning-solid"></div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-ui/80 text-xs">
            <span className="text-muted">Conexão real do navegador:</span>
            <span
              className={`font-semibold ${
                isOnline ? 'text-accent-success' : 'text-accent-danger'
              }`}
            >
              {isOnline ? 'Internet Disponível' : 'Sem Conexão'}
            </span>
            {isSimulatedOffline && (
              <span className="rounded bg-accent-warning-soft px-2 py-0.5 text-[10px] font-bold text-accent-warning border border-accent-warning-soft-border ml-auto">
                Modo Simulado Ativo
              </span>
            )}
          </div>
        </div>

        {/* IndexedDB Cache Manager & Supabase Cloud Status Card */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* IndexedDB Cache Card */}
          <div className="rounded-xl border border-ui bg-surface-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Database className="h-4 w-4 text-accent-success" />
                Cache IndexedDB
              </span>
              <span className="rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2 py-0.5 text-[10px] font-bold text-accent-success">
                Ativo
              </span>
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>
                Pesquisa corrente em rascunho:{' '}
                <strong className="text-primary">
                  {currentSurveyDraft ? currentSurveyDraft.nome : 'Nenhum rascunho'}
                </strong>
              </div>
              <div>
                Última gravação:{' '}
                <span className="text-secondary">
                  {lastIndexedDBSave
                    ? new Date(lastIndexedDBSave).toLocaleTimeString()
                    : 'Aguardando alterações'}
                </span>
              </div>
              <div>
                Pesquisas offline pendentes:{' '}
                <strong className="text-accent-warning">{pendingIndexedDbCount}</strong>
              </div>
            </div>
            {currentSurveyDraft && (
              <button
                type="button"
                onClick={() => {
                  clearCurrentSurveyDraft();
                  setSyncResult({ success: true, message: 'Rascunho IndexedDB descartado.' });
                }}
                className="text-[10px] text-accent-danger hover:text-accent-danger hover:underline pt-1"
              >
                Limpar rascunho do cache
              </button>
            )}
          </div>

          {/* Supabase Sync Card with Live Connection Monitor */}
          <div className="rounded-xl border border-ui bg-surface-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Server className="h-4 w-4 text-accent-primary" />
                Supabase Sync & Monitor
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                  syncProgress.isActive || supabaseSyncStatus === 'syncing'
                    ? 'bg-accent-primary-soft border-accent-primary-soft-border text-accent-primary animate-pulse'
                    : supabaseSyncStatus === 'synced'
                    ? 'bg-accent-success-soft border-accent-success-soft-border text-accent-success'
                    : 'bg-accent-warning-soft border-accent-warning-soft-border text-accent-warning'
                }`}
              >
                {syncProgress.isActive ? `${syncProgress.percent}%` : supabaseSyncStatus}
              </span>
            </div>

            <div className="text-[11px] text-muted space-y-1">
              <div className="flex items-center justify-between">
                <span>Hardware:</span>
                <span className="font-mono text-secondary">navigator.onLine = {String(isOnline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Canal:</span>
                <span className="text-secondary font-medium">
                  {isSupabaseLive ? 'Supabase Cloud (Chave Ativa)' : 'Supabase Seguro (Simulado)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Último sync:</span>
                <span className="text-secondary">{lastSupabaseSync || 'Ao restabelecer sinal'}</span>
              </div>
              <div className="text-accent-success font-medium flex items-center justify-between">
                <span>Auto-sync reativo:</span>
                <span className="font-bold bg-accent-success-soft px-1.5 py-0.2 rounded border border-accent-success-soft-border">Ativo</span>
              </div>
            </div>

            {/* Live Progress Bar if active */}
            {syncProgress.isActive && (
              <div className="pt-2 border-t border-ui space-y-1">
                <div className="flex items-center justify-between text-[10px] text-accent-primary">
                  <span className="truncate max-w-[240px] font-medium">{syncProgress.message}</span>
                  <span className="font-bold">{syncProgress.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary-solid transition-all duration-300 rounded-full"
                    style={{ width: `${syncProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {effectiveOnline && (
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  id="btn-force-supabase-sync-modal"
                  disabled={syncProgress.isActive || syncing}
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      const res = await forceSyncPendingWithSupabase(false);
                      setSyncResult({ success: res.success, message: res.message });
                    } finally {
                      setSyncing(false);
                    }
                  }}
                  className="text-[10px] text-accent-primary hover:text-accent-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${syncProgress.isActive ? 'animate-spin' : ''}`} />
                  <span>{syncProgress.isActive ? 'Sincronizando...' : 'Forçar sincronização de pendências'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncResult && (
          <div
            className={`mt-3 rounded-xl border p-3 text-xs flex items-center gap-2 ${
              syncResult.success
                ? 'bg-accent-success-soft border-accent-success-soft-border text-accent-success'
                : 'bg-accent-danger-soft border-accent-danger-soft-border text-accent-danger'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-success" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-accent-danger" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}

        {/* Pending Queue List */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-secondary flex items-center gap-1.5">
              <CloudOff className="h-4 w-4 text-accent-warning" />
              Fila de Itens Salvos Offline ({offlineQueue.length})
            </h3>
            {offlineQueue.length > 0 && (
              <button
                onClick={clearOfflineQueue}
                className="text-[11px] text-accent-danger hover:text-accent-danger hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Limpar fila</span>
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-ui bg-surface-card p-2 space-y-2">
            {offlineQueue.length > 0 ? (
              offlineQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-ui/80 bg-surface p-2.5 text-xs hover:border-ui transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-soft border border-accent-primary-soft-border text-accent-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-primary">
                        {item.descricao || (item.tipo === 'survey' ? 'Pesquisa' : 'Submissão')}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(item.dataCriacao).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-accent-warning font-bold">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeOfflineItem(item.id)}
                    title="Remover item da fila"
                    className="rounded p-1.5 text-muted hover:bg-surface-raised hover:text-accent-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted text-xs text-center">
                <Check className="h-6 w-6 text-accent-success mb-1" />
                <span className="font-semibold text-secondary">Nenhum item pendente de sincronização.</span>
                <span className="text-[11px] text-muted mt-0.5">
                  Todas as pesquisas e formulários estão sincronizados com o servidor.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security / Compliance Info Box */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3 text-[11px] text-muted">
          <Info className="h-4 w-4 shrink-0 text-accent-primary mt-0.5" />
          <span>
            Ao salvar offline, a pesquisa corrente é armazenada com integridade criptográfica no armazenamento local e adicionada à fila de transmissão com carimbo de tempo seguro.
          </span>
        </div>

        {/* Actions Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-ui pt-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            Fechar
          </button>

          <button
            id="btn-trigger-sync-queue"
            disabled={syncing || offlineQueue.length === 0 || !effectiveOnline}
            onClick={handleSync}
            className="flex items-center gap-2 rounded-xl bg-accent-primary-solid px-5 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {syncing
                ? 'Sincronizando...'
                : !effectiveOnline
                ? 'Reconecte para Sincronizar'
                : `Sincronizar com o Servidor (${offlineQueue.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
