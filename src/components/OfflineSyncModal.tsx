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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#16171d] p-6 shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                effectiveOnline
                  ? 'border-emerald-500/30 bg-emerald-600/20 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-600/20 text-amber-400'
              }`}
            >
              {effectiveOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Sincronização & Armazenamento Offline
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                    effectiveOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {effectiveOnline ? 'Online' : 'Offline'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie as pesquisas e coletas salvas no dispositivo para envio ao servidor central.
              </p>
            </div>
          </div>
          <button
            id="btn-close-offline-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connectivity Status & Simulated Offline Toggle */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#111218] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">
                Simular Modo Offline (Testes de Campo)
              </div>
              <div className="text-[11px] text-slate-400">
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
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400">Conexão real do navegador:</span>
            <span
              className={`font-semibold ${
                isOnline ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isOnline ? 'Internet Disponível' : 'Sem Conexão'}
            </span>
            {isSimulatedOffline && (
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 ml-auto">
                Modo Simulado Ativo
              </span>
            )}
          </div>
        </div>

        {/* IndexedDB Cache Manager & Supabase Cloud Status Card */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* IndexedDB Cache Card */}
          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Database className="h-4 w-4 text-emerald-400" />
                Cache IndexedDB
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Ativo
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>
                Pesquisa corrente em rascunho:{' '}
                <strong className="text-white">
                  {currentSurveyDraft ? currentSurveyDraft.nome : 'Nenhum rascunho'}
                </strong>
              </div>
              <div>
                Última gravação:{' '}
                <span className="text-slate-300">
                  {lastIndexedDBSave
                    ? new Date(lastIndexedDBSave).toLocaleTimeString()
                    : 'Aguardando alterações'}
                </span>
              </div>
              <div>
                Pesquisas offline pendentes:{' '}
                <strong className="text-amber-400">{pendingIndexedDbCount}</strong>
              </div>
            </div>
            {currentSurveyDraft && (
              <button
                type="button"
                onClick={() => {
                  clearCurrentSurveyDraft();
                  setSyncResult({ success: true, message: 'Rascunho IndexedDB descartado.' });
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline pt-1"
              >
                Limpar rascunho do cache
              </button>
            )}
          </div>

          {/* Supabase Sync Card with Live Connection Monitor */}
          <div className="rounded-xl border border-slate-800 bg-[#111218] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Server className="h-4 w-4 text-blue-400" />
                Supabase Sync & Monitor
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                  syncProgress.isActive || supabaseSyncStatus === 'syncing'
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 animate-pulse'
                    : supabaseSyncStatus === 'synced'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}
              >
                {syncProgress.isActive ? `${syncProgress.percent}%` : supabaseSyncStatus}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Hardware:</span>
                <span className="font-mono text-slate-300">navigator.onLine = {String(isOnline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Canal:</span>
                <span className="text-slate-300 font-medium">
                  {isSupabaseLive ? 'Supabase Cloud (Chave Ativa)' : 'Supabase Seguro (Simulado)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Último sync:</span>
                <span className="text-slate-300">{lastSupabaseSync || 'Ao restabelecer sinal'}</span>
              </div>
              <div className="text-emerald-400 font-medium flex items-center justify-between">
                <span>Auto-sync reativo:</span>
                <span className="font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Ativo</span>
              </div>
            </div>

            {/* Live Progress Bar if active */}
            {syncProgress.isActive && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-blue-300">
                  <span className="truncate max-w-[240px] font-medium">{syncProgress.message}</span>
                  <span className="font-bold">{syncProgress.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
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
                  className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}

        {/* Pending Queue List */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CloudOff className="h-4 w-4 text-amber-400" />
              Fila de Itens Salvos Offline ({offlineQueue.length})
            </h3>
            {offlineQueue.length > 0 && (
              <button
                onClick={clearOfflineQueue}
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Limpar fila</span>
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-[#111218] p-2 space-y-2">
            {offlineQueue.length > 0 ? (
              offlineQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#16171d] p-2.5 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15 border border-blue-500/20 text-blue-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {item.descricao || (item.tipo === 'survey' ? 'Pesquisa' : 'Submissão')}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(item.dataCriacao).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-amber-400 font-bold">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeOfflineItem(item.id)}
                    title="Remover item da fila"
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs text-center">
                <Check className="h-6 w-6 text-emerald-500 mb-1" />
                <span className="font-semibold text-slate-300">Nenhum item pendente de sincronização.</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Todas as pesquisas e formulários estão sincronizados com o servidor.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security / Compliance Info Box */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <span>
            Ao salvar offline, a pesquisa corrente é armazenada com integridade criptográfica no armazenamento local e adicionada à fila de transmissão com carimbo de tempo seguro.
          </span>
        </div>

        {/* Actions Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Fechar
          </button>

          <button
            id="btn-trigger-sync-queue"
            disabled={syncing || offlineQueue.length === 0 || !effectiveOnline}
            onClick={handleSync}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
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
