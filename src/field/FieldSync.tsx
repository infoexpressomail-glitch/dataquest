import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FieldSyncProps {
  /** Sessão autenticada no sub-app (opcional — usado para apresentar o pesquisador). */
  session?: FieldSession;
}

/**
 * Tela de Sincronização do sub-app — mesma lógica da aba de sincronização
 * existente (offlineQueue + pendingIndexedDbCount + effectiveOnline + syncOfflineQueue).
 */
export const FieldSync: React.FC<FieldSyncProps> = ({ session }) => {
  const { effectiveOnline, offlineQueue, pendingIndexedDbCount, syncOfflineQueue } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

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
