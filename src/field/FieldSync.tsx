import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { DownloadCloud, UploadCloud, CheckCircle2, AlertTriangle, Cloud } from 'lucide-react';
import './fieldMobile.css';

interface FieldSyncProps {
  /** Sessão autenticada de campo. */
  session: FieldSession;
  /** Re-sincroniza (Carregar) as pesquisas e devolve a sessão atualizada. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

/**
 * Tela de sincronização do pesquisador — padrão visual do app de campo.
 *  - Carregar   : baixa as pesquisas/políticas de acesso do servidor.
 *  - Descarregar: envia as coletas offline pendentes para o servidor.
 * Toda a lógica de fila offline / IndexedDB / Supabase é preservada.
 */
export const FieldSync: React.FC<FieldSyncProps> = ({ session, onResync }) => {
  const { effectiveOnline, offlineQueue, pendingIndexedDbCount, syncOfflineQueue, forceSyncPendingWithSupabase } = useApp();

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
      setFeedback(`${updated.surveys.length} pesquisa(s) carregada(s) com sucesso do servidor.`);
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
      const [queueResult, surveyResult] = await Promise.all([
        syncOfflineQueue(),
        forceSyncPendingWithSupabase(false),
      ]);

      const totalSent = queueResult.count + surveyResult.count;
      const totalFailed = pendingCount - totalSent;

      if (totalFailed > 0) {
        setError(
          `${totalSent} item(ns) enviado(s). ${totalFailed} continuam pendentes (${queueResult.message} ${surveyResult.message})`
        );
      } else {
        setFeedback(
          totalSent > 0
            ? `${totalSent} coleta(s)/pesquisa(s) enviada(s) com sucesso ao servidor.`
            : 'Não havia nada pendente para enviar.'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Falha ao descarregar coletas.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="field-stack">
      <div className="field-card">
        <div className="field-row-between">
          <div>
            <div className="field-text-sm" style={{ fontWeight: 800 }}>
              Carregar / Descarregar
            </div>
            <div className="field-text-xs field-text-muted">
              {effectiveOnline
                ? 'Conectado. Baixe as pesquisas e envie as coletas feitas em campo.'
                : 'Você está offline. Você ainda pode coletar; os dados serão enviados quando houver conexão.'}
            </div>
          </div>
          <span className={`field-status-pill ${effectiveOnline ? 'is-online' : 'is-offline'}`}>
            {effectiveOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {feedback && (
          <div className="field-alert is-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="field-alert is-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleLoad}
        disabled={busy !== null || !effectiveOnline}
        className="field-card"
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        <span className="field-survey-icon" aria-hidden="true">
          <DownloadCloud className={`h-5 w-5 ${busy === 'load' ? 'animate-pulse' : ''}`} />
        </span>
        <span>
          <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
            {busy === 'load' ? 'Carregando...' : 'Carregar pesquisas'}
          </span>
          <span className="field-text-xs field-text-muted">
            Baixar as pesquisas e políticas de acesso do servidor.
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={handleUnload}
        disabled={busy !== null || !effectiveOnline || pendingCount === 0}
        className="field-card"
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        <span
          className="field-survey-icon"
          style={{
            background: 'var(--accent-success-soft-bg)',
            borderColor: 'var(--accent-success-soft-border)',
            color: 'var(--accent-success)',
          }}
          aria-hidden="true"
        >
          <UploadCloud className={`h-5 w-5 ${busy === 'unload' ? 'animate-pulse' : ''}`} />
        </span>
        <span>
          <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
            {busy === 'unload' ? 'Enviando...' : 'Descarregar coletas'}
          </span>
          <span className="field-text-xs field-text-muted">
            {pendingCount > 0 ? `${pendingCount} pendente(s) para enviar` : 'Tudo enviado'}
          </span>
        </span>
      </button>

      <div className="field-card">
        <div className="field-row-between">
          <span className="field-text-xs" style={{ fontWeight: 800 }}>
            <Cloud className="h-3.5 w-3.5 inline" /> Pesquisas carregadas no aparelho
          </span>
          <span className="field-text-xs field-text-muted">{session.surveys.length} pesquisa(s)</span>
        </div>
      </div>
    </div>
  );
};
