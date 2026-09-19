import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSection, FieldSession } from './fieldTypes';
import {
  FolderOpen,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import './fieldMobile.css';

interface FieldHomeProps {
  session: FieldSession;
  onNavigate: (s: FieldSection) => void;
  /** Re-sincroniza as pesquisas (Carregar) e devolve a sessão atualizada. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

interface HomeAction {
  id: FieldSection;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

/**
 * Tela inicial (home) do sub-app: grade de ações do pesquisador.
 * Redesign mobile-first — lógica de Carregar/Descarregar/Metas preservada.
 */
export const FieldHome: React.FC<FieldHomeProps> = ({ session, onNavigate, onResync }) => {
  const { effectiveOnline, offlineQueue, pendingIndexedDbCount } = useApp();
  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  const [loading, setLoading] = useState<'load' | 'unload' | 'meta' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar = baixar pesquisas/políticas de acesso do pesquisador do servidor.
  const handleLoad = async () => {
    setLoading('load');
    setFeedback(null);
    setError(null);
    try {
      await onResync(session);
      setFeedback('Pesquisas e políticas de acesso carregadas com sucesso.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar pesquisas. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  // Descarregar = enviar as coletas offline pendentes para o servidor.
  const handleUnload = async () => {
    setLoading('unload');
    setFeedback(null);
    setError(null);
    try {
      await onResync(session);
      const pend = offlineQueue.length + pendingIndexedDbCount;
      setFeedback(
        pend > 0
          ? `${pend} coleta(s) pendente(s) de envio. Conecte-se e utilize a sincronização para descarregar.`
          : 'Todas as coletas já foram descarregadas (enviadas ao servidor).'
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao descarregar. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  // Atualizar Meta = recarregar as pesquisas ativas para recalcular/atualizar metas.
  const handleUpdateGoals = async () => {
    setLoading('meta');
    setFeedback(null);
    setError(null);
    try {
      await onResync(session);
      setFeedback('Metas das pesquisas ativas atualizadas com sucesso.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar metas. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const actions: HomeAction[] = [
    {
      id: 'pesquisas',
      title: 'Pesquisas',
      subtitle: 'Ver pesquisas ativas e selecionar',
      icon: <FolderOpen className="h-5 w-5" />,
    },
    {
      id: 'sync',
      title: 'Carregar',
      subtitle: 'Baixar pesquisas do servidor',
      icon: <DownloadCloud className="h-5 w-5" />,
    },
    {
      id: 'sync',
      title: 'Descarregar',
      subtitle: 'Enviar coletas offline',
      icon: <UploadCloud className="h-5 w-5" />,
    },
    {
      id: 'metas',
      title: 'Atualizar Meta',
      subtitle: 'Recalcular metas das pesquisas ativas',
      icon: <RefreshCw className="h-5 w-5" />,
    },
  ];

  return (
    <div className="field-stack">
      <div className="field-hero">
        <span className={`field-status-pill ${effectiveOnline ? 'is-online' : 'is-offline'}`}>
          {effectiveOnline ? 'Conectado ao servidor' : 'Modo Offline'}
        </span>
        <div className="field-hero-greeting" style={{ marginTop: '0.5rem' }}>
          Olá, {session.user.nome.split(' ')[0]}
        </div>
        <div className="field-hero-sub">
          {session.surveys.length} pesquisa(s) liberada(s) para você.
        </div>
      </div>

      {feedback && (
        <div className="field-alert is-success" style={{ marginTop: 0 }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="field-alert is-danger" style={{ marginTop: 0 }}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="field-alert is-warning" style={{ marginTop: 0 }}>
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span>{pendingCount} coleta(s) pendente(s) de envio.</span>
        </div>
      )}

      {actions.map((a, idx) => {
        const busy =
          (a.title === 'Carregar' && loading === 'load') ||
          (a.title === 'Descarregar' && loading === 'unload') ||
          (a.title === 'Atualizar Meta' && loading === 'meta');

        return (
          <button
            key={`${a.title}-${idx}`}
            type="button"
            onClick={() => {
              if (a.title === 'Carregar') handleLoad();
              else if (a.title === 'Descarregar') handleUnload();
              else if (a.title === 'Atualizar Meta') handleUpdateGoals();
              else onNavigate(a.id);
            }}
            disabled={loading !== null}
            className="field-card"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <span className="field-survey-icon" aria-hidden="true">
              {busy ? <RefreshCw className="h-5 w-5 animate-spin" /> : a.icon}
            </span>
            <span>
              <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
                {a.title}
              </span>
              <span className="field-text-xs field-text-muted">{a.subtitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
