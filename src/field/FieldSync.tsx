import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface FieldSyncProps {
  /** Sessão autenticada no sub-app. */
  session: FieldSession;
  /** Re-sincroniza as pesquisas do pesquisador com o servidor e devolve a sessão atualizada. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

/**
 * Tela de Sincronização do sub-app — mesmo fluxo da aba de sincronização
 * existente (offlineQueue + pendingIndexedDbCount + effectiveOnline + syncOfflineQueue),
 * com a adição de re-sincronizar as pesquisas do pesquisador (Etapa 4).
 */
export const FieldSync: React.FC<FieldSyncProps> = ({ session, onResync }) => {
  const { effectiveOnline, offlineQueue, pendingIndexedDbCount, syncOfflineQueue } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [isResyncingSurveys, setIsResyncingSurveys] = useState(false);
  const [resyncFeedback, setResyncFeedback] = useState<string | null>(null);
  const [resyncError, setResyncError] = useState<string | null>(null);

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;
  const surveysCount = session?.surveys?.length ?? 0;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    setSyncError(null);
    try {
      const res = await syncOfflineQueue();
      setSyncFeedback(res.message || `${res.count} registro(s) sincronizado(s) com sucesso!`);
    } catch (err: any) {
      setSyncError(err?.message || 'Falha na sincronização. Tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Re-sincroniza as pesquisas (políticas de acesso) do pesquisador com o servidor.
  const handleResyncSurveys = async () => {
    setIsResyncingSurveys(true);
    setResyncFeedback(null);
    setResyncError(null);
    try {
      await onResync(session);
      setResyncFeedback('Pesquisas e políticas de acesso atualizadas com sucesso!');
    } catch (err: any) {
      setResyncError(err?.message || 'Falha ao re-sincronizar as pesquisas. Tente novamente.');
    } finally {
      setIsResyncingSurveys(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
        <h2 className="text-sm font-black text-primary flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-accent-primary" />
          Sincronização de Dados de Campo
        </h2>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Todas as entrevistas coletadas enquanto offline são armazenadas em banco de
          dados local criptografado (IndexedDB) e enviadas com integridade SHA-256 ao
          restabelecer a conexão.
        </p>

        {/* Re-sincronizar pesquisas do pesquisador (Etapa 4) */}
        <div className="mt-6 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-solid text-on-accent">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-black text-primary">Pesquisas do pesquisador</div>
                <div className="text-[11px] text-muted">
                  {surveysCount} liberada(s) para você — baixe de novo para atualizar as políticas de acesso.
                </div>
              </div>
            </div>
            <button
              onClick={handleResyncSurveys}
              disabled={isResyncingSurveys || !effectiveOnline}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-2.5 text-xs font-bold text-on-accent shadow-md shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isResyncingSurveys ? 'animate-spin' : ''}`} />
              {isResyncingSurveys ? 'Baixando...' : 'Re-sincronizar pesquisas'}
            </button>
          </div>
          {resyncFeedback && (
            <div className="mt-3 rounded-lg border border-accent-success-soft-border bg-accent-success-soft p-2.5 text-[11px] text-accent-success flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{resyncFeedback}</span>
            </div>
          )}
          {resyncError && (
            <div className="mt-3 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft p-2.5 text-[11px] text-accent-danger flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{resyncError}</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-ui bg-surface-card p-4">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Fila de Itens Pendentes
            </span>
            <div className="mt-2 text-2xl font-black text-primary">
              {pendingCount} item(s)
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Prontos para transmissão automática ou manual.
            </p>
          </div>

          <div className="rounded-xl border border-ui bg-surface-card p-4">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Status da Conexão
            </span>
            <div
              className={`mt-2 text-2xl font-black flex items-center gap-2 ${
                effectiveOnline ? 'text-accent-success' : 'text-accent-warning'
              }`}
            >
              <span
                className={`h-3 w-3 rounded-full ${
                  effectiveOnline ? 'bg-accent-success-solid animate-pulse' : 'bg-accent-warning-solid'
                }`}
              />
              {effectiveOnline ? (
                <>
                  <Wifi className="h-4 w-4" /> Conectado à Internet
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" /> Sem Conexão (Modo Offline)
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted">Servidor Central: DataQuest Cloud API</p>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3 text-xs text-accent-primary flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-success shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {syncError && (
          <div className="mt-4 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        <button
          onClick={handleManualSync}
          disabled={isSyncing || !effectiveOnline}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-5 py-2.5 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        {!effectiveOnline && (
          <p className="mt-3 text-[11px] text-accent-warning">
            Você precisa estar online para sincronizar. Suas coletas offline estão
            seguras na fila local.
          </p>
        )}
      </div>
    </div>
  );
};
