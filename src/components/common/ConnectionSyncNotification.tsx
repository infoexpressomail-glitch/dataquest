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
        className="fixed bottom-10 right-4 z-40 max-w-sm rounded-xl border border-amber-500/40 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-300 animate-slideUp"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">
                {isSimulatedOffline ? 'Modo Offline Simulado' : 'Sem Conexão à Rede'}
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                navigator.onLine: {String(isOnline)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-300 leading-tight">
              Alterações salvas localmente no <strong className="text-amber-200">IndexedDB</strong>
              {pendingIndexedDbCount > 0 && ` (${pendingIndexedDbCount} pendente(s))`}. Sincronização automática com Supabase assim que o sinal for restabelecido.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                id="btn-check-connection-offline-banner"
                onClick={() => checkConnectionNow()}
                className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-200 transition"
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
          ? 'border-emerald-500/40 bg-slate-950/95 shadow-emerald-950/40'
          : isError
          ? 'border-rose-500/40 bg-slate-950/95 shadow-rose-950/40'
          : 'border-blue-500/40 bg-slate-950/95 shadow-blue-950/40'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                isCompleted
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                  : isError
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                  : 'border-blue-500/30 bg-blue-500/15 text-blue-400'
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
                <h4 className="text-xs font-bold text-white">
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
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isError
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {isCompleted ? 'Sucesso' : isError ? 'Erro' : `${syncProgress.percent}%`}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-300 leading-tight line-clamp-2">
                {syncProgress.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-dismiss-sync-notification"
            onClick={dismissSyncProgress}
            aria-label="Dispensar notificação"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3 text-blue-400" />
              <span>IndexedDB &rarr; Supabase</span>
            </span>
            <span className="font-mono text-slate-300">
              {syncProgress.current > 0 ? `${syncProgress.current} de ${syncProgress.total}` : `${syncProgress.percent}%`}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(Math.max(syncProgress.percent, 5), 100)}%` }}
            />
          </div>
        </div>

        {/* Target Badge & Connection Info */}
        <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Server className="h-3 w-3 text-slate-500" />
            <span>
              Canal:{' '}
              <strong className="text-slate-300">
                {isSupabaseLive ? 'Supabase Cloud (Chave Ativa)' : 'Supabase Seguro (Simulado)'}
              </strong>
            </span>
          </div>

          {syncProgress.syncedItems.length > 0 && (
            <button
              type="button"
              id="btn-toggle-sync-items-details"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300 font-medium"
            >
              <span>{expanded ? 'Ocultar detalhes' : `Ver itens (${syncProgress.syncedItems.length})`}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded item details */}
      {expanded && syncProgress.syncedItems.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5 rounded-b-2xl">
          {syncProgress.syncedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/80 p-2 text-[11px] border border-slate-800"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[9px] text-slate-500">{item.codigo}</span>
                <span className="truncate font-medium text-slate-200">{item.nome}</span>
              </div>
              <div className="shrink-0">
                {item.status === 'success' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Sincronizado</span>
                  </span>
                )}
                {item.status === 'syncing' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Enviando...</span>
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className="text-[10px] text-slate-500">Na fila</span>
                )}
                {item.status === 'failed' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
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
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-xs font-bold text-white shadow-lg transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tentar Sincronização Novamente</span>
          </button>
        </div>
      )}
    </div>
  );
};
