import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  X,
  ChevronDown,
  ChevronUp,
  Server,
} from 'lucide-react';

export const ConnectionSyncNotification: React.FC = () => {
  const {
    effectiveOnline,
    isOnline,
    isSimulatedOffline,
    connectionState,
    syncProgress,
    dismissSyncProgress,
    forceSyncPendingWithSupabase,
    checkConnectionNow,
    pendingIndexedDbCount,
    isSupabaseLive,
  } = useApp();

  const [expanded, setExpanded] = React.useState(false);

  // If sync progress is not active and we are online with no alert, do not render full banner
  if (!syncProgress.isActive && effectiveOnline) {
    return null;
  }

  // When offline (and not currently in a sync notification), show discreet offline status bar
  if (!syncProgress.isActive && !effectiveOnline) {
    return (
      <div
        id="offline-connection-banner"
        className="fixed bottom-10 right-4 z-40 max-w-sm rounded-xl border border-accent-warning-soft-border bg-surface-raised p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-300 animate-slideUp"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-warning-soft border border-accent-warning-soft-border text-accent-warning">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent-warning">
                {isSimulatedOffline ? 'Modo Offline Simulado' : 'Sem Conexão à Rede'}
              </span>
              <span className="rounded bg-accent-warning-soft px-1.5 py-0.5 text-[9px] font-mono text-accent-warning">
                navigator.onLine: {String(isOnline)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-secondary leading-tight">
              Alterações salvas localmente no <strong className="text-accent-warning-soft-text">IndexedDB</strong>
              {pendingIndexedDbCount > 0 && ` (${pendingIndexedDbCount} pendente(s))`}. Sincronização automática com Supabase assim que o sinal for restabelecido.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                id="btn-check-connection-offline-banner"
                onClick={() => checkConnectionNow()}
                className="flex items-center gap-1 rounded bg-surface-raised hover:bg-surface-hover px-2 py-1 text-[10px] font-medium text-primary transition"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Testar Conexão Agora</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active sync progress notification
  const isCompleted = syncProgress.phase === 'completed';
  const isError = syncProgress.phase === 'error';
  const isSyncing = syncProgress.phase === 'syncing';
  const isDetecting = syncProgress.phase === 'detecting';

  return (
    <div
      id="connection-sync-progress-notification"
      role="status"
      aria-live="polite"
      className={`fixed bottom-10 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 ${
        isCompleted
          ? 'border-accent-success-soft-border bg-surface-raised shadow-emerald-950/40'
          : isError
          ? 'border-accent-danger-soft-border bg-surface-raised shadow-rose-950/40'
          : 'border-accent-primary-soft-border bg-surface-raised shadow-emerald-950/40'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                isCompleted
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : isError
                  ? 'border-accent-danger-soft-border bg-accent-danger-soft text-accent-danger'
                  : 'border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <RefreshCw className="h-5 w-5 animate-spin" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-primary">
                  {isCompleted
                    ? 'Sincronização Concluída'
                    : isError
                    ? 'Aviso na Sincronização'
                    : isDetecting
                    ? 'Sinal Restabelecido!'
                    : 'Sincronizando com Supabase...'}
                </h4>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-accent-success-soft text-accent-success'
                      : isError
                      ? 'bg-accent-danger-soft text-accent-danger'
                      : 'bg-accent-primary-soft text-accent-primary'
                  }`}
                >
                  {isCompleted ? 'Sucesso' : isError ? 'Erro' : `${syncProgress.percent}%`}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-secondary leading-tight line-clamp-2">
                {syncProgress.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-dismiss-sync-notification"
            onClick={dismissSyncProgress}
            aria-label="Dispensar notificação"
            className="text-muted hover:text-primary p-1 rounded-lg hover:bg-surface-raised transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted mb-1">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3 text-accent-primary" />
              <span>IndexedDB &rarr; Supabase</span>
            </span>
            <span className="font-mono text-secondary">
              {syncProgress.current > 0 ? `${syncProgress.current} de ${syncProgress.total}` : `${syncProgress.percent}%`}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isCompleted
                  ? 'bg-accent-success-solid'
                  : isError
                  ? 'bg-accent-danger-solid'
                  : 'bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(Math.max(syncProgress.percent, 5), 100)}%` }}
            />
          </div>
        </div>

        {/* Target Badge & Connection Info */}
        <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-ui/80 text-[10px]">
          <div className="flex items-center gap-1.5 text-muted">
            <Server className="h-3 w-3 text-muted" />
            <span>
              Canal:{' '}
              <strong className="text-secondary">
                {isSupabaseLive ? 'Supabase Cloud (Chave Ativa)' : 'Supabase Seguro (Simulado)'}
              </strong>
            </span>
          </div>

          {syncProgress.syncedItems.length > 0 && (
            <button
              type="button"
              id="btn-toggle-sync-items-details"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 text-accent-primary hover:text-accent-primary font-medium"
            >
              <span>{expanded ? 'Ocultar detalhes' : `Ver itens (${syncProgress.syncedItems.length})`}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded item details */}
      {expanded && syncProgress.syncedItems.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-ui bg-surface-raised p-2.5 space-y-1.5 rounded-b-2xl">
          {syncProgress.syncedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface-raised p-2 text-[11px] border border-ui"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[9px] text-muted">{item.codigo}</span>
                <span className="truncate font-medium text-primary">{item.nome}</span>
              </div>
              <div className="shrink-0">
                {item.status === 'success' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-accent-success">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Sincronizado</span>
                  </span>
                )}
                {item.status === 'syncing' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-accent-primary animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Enviando...</span>
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className="text-[10px] text-muted">Na fila</span>
                )}
                {item.status === 'failed' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-accent-danger">
                    <AlertCircle className="h-3 w-3" />
                    <span>Erro</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Retry Action */}
      {isError && (
        <div className="p-2.5 pt-0">
          <button
            type="button"
            id="btn-retry-supabase-sync"
            onClick={() => forceSyncPendingWithSupabase()}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-accent-primary-solid hover:bg-accent-primary-solid-hover py-2 text-xs font-bold text-on-accent shadow-lg transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tentar Sincronização Novamente</span>
          </button>
        </div>
      )}
    </div>
  );
};
