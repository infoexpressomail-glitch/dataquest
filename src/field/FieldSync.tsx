import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import {
  DownloadCloud,
  UploadCloud,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface FieldSyncProps {
  /** Sessão autenticada de campo. */
  session: FieldSession;
  /** Re-sincroniza (Carregar) as pesquisas e devolve a sessão atualizada. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

/**
 * Tela de sincronização do pesquisador.
 *  - Carregar  : baixa as pesquisas/políticas de acesso do servidor.
 *  - Descarregar: envia as coletas offline pendentes para o servidor.
 */
export const FieldSync: React.FC<FieldSyncProps> = ({ session, onResync }) => {
  const { effectiveOnline, offlineQueue, pendingIndexedDbCount } = useApp();

  const [busy, setBusy] = useState<'load' | 'unload' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  const handleLoad = async () => {
    setBusy('load');
    setFeedback(null);
    setError(null);
    try {
      const updated = await onResync(session);
      setFeedback(
        `${updated.surveys.length} pesquisa(s) carregada(s) com sucesso do servidor.`
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar pesquisas.');
    } finally {
      setBusy(null);
    }
  };

  const handleUnload = async () => {
    setBusy('unload');
    setFeedback(null);
    setError(null);
    try {
      await onResync(session);
      setFeedback(
        pendingCount > 0
          ? `${pendingCount} coleta(s) pendente(s) de envio. Conecte-se para descarregar.`
          : 'Todas as coletas já foram descarregadas (enviadas ao servidor).'
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao descarregar coletas.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-primary">Carregar / Descarregar</h2>
            <p className="text-[11px] text-muted mt-0.5">
              {effectiveOnline
                ? 'Conectado. Baixe as pesquisas e envie as coletas feitas em campo.'
                : 'Você está offline. Você ainda pode coletar; os dados serão enviados quando houver conexão.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-ui bg-surface-card px-2.5 py-1 text-[10px] font-semibold">
            {effectiveOnline ? (
              <Wifi className="h-3.5 w-3.5 text-accent-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-accent-warning" />
            )}
            <span className={effectiveOnline ? 'text-accent-success' : 'text-accent-warning'}>
              {effectiveOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {feedback && (
          <div className="mt-3 rounded-lg border border-accent-success-soft-border bg-accent-success-soft p-2.5 text-[11px] text-accent-success flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft p-2.5 text-[11px] text-accent-danger flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ações: Carregar / Descarregar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleLoad}
          disabled={busy !== null || !effectiveOnline}
          className="group flex flex-col items-start gap-3 rounded-2xl border border-ui bg-surface-card p-5 text-left shadow-xl hover:border-accent-primary-soft-border transition-colors disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
            {busy === 'load' ? (
              <DownloadCloud className="h-6 w-6 animate-pulse" />
            ) : (
              <DownloadCloud className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-primary">Carregar</div>
            <div className="text-[11px] text-muted mt-0.5">
              Baixar as pesquisas e políticas de acesso do servidor.
            </div>
          </div>
          <span className="text-[10px] font-semibold text-accent-primary">
            {busy === 'load' ? 'Carregando...' : 'Baixar pesquisas'}
          </span>
        </button>

        <button
          onClick={handleUnload}
          disabled={busy !== null || !effectiveOnline || pendingCount === 0}
          className="group flex flex-col items-start gap-3 rounded-2xl border border-ui bg-surface-card p-5 text-left shadow-xl hover:border-accent-primary-soft-border transition-colors disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-success-soft text-accent-success border border-accent-success-soft-border">
            {busy === 'unload' ? (
              <UploadCloud className="h-6 w-6 animate-pulse" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-primary">Descarregar</div>
            <div className="text-[11px] text-muted mt-0.5">
              Enviar as coletas offline pendentes para o servidor.
            </div>
          </div>
          <span className="text-[10px] font-semibold text-accent-success">
            {pendingCount > 0 ? `${pendingCount} pendente(s) para enviar` : 'Tudo enviado'}
          </span>
        </button>
      </div>

      {/* Pesquisas carregadas */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <Layers className="h-4 w-4 text-accent-primary" />
          <span>Pesquisas carregadas no aparelho</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {session.surveys.length} pesquisa(s) disponível(is) para coleta.
        </p>
      </div>
    </div>
  );
};
