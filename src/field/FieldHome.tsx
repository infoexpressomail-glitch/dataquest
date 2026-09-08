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
 * Elementos: Pesquisas, Carregar, Descarregar, Atualizar Meta.
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
  // Re-sincroniza as pesquisas (atualiza a fila/status) e informa o total pendente.
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
      icon: <FolderOpen className="h-6 w-6" />,
    },
    {
      id: 'sync',
      title: 'Carregar',
      subtitle: 'Baixar pesquisas do servidor',
      icon: <DownloadCloud className="h-6 w-6" />,
    },
    {
      id: 'sync',
      title: 'Descarregar',
      subtitle: 'Enviar coletas offline',
      icon: <UploadCloud className="h-6 w-6" />,
    },
    {
      id: 'metas',
      title: 'Atualizar Meta',
      subtitle: 'Recalcular metas das pesquisas ativas',
      icon: <RefreshCw className="h-6 w-6" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho de boas-vindas */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-surface via-surface-raised to-surface p-6 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-success-soft border border-accent-success-soft-border px-2.5 py-0.5 text-[10px] font-bold text-accent-success">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-success-solid animate-pulse" />
            {effectiveOnline ? 'Conectado ao servidor' : 'Modo Offline'}
          </span>
          <h1 className="mt-2 text-xl font-black text-primary">
            Olá, {session.user.nome.split(' ')[0]}
          </h1>
          <p className="text-xs text-muted mt-1">
            {session.surveys.length} pesquisa(s) liberada(s) para você. Selecione uma ação abaixo.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent-primary-soft blur-3xl" />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="rounded-xl border border-accent-success-soft-border bg-accent-success-soft p-3 text-xs text-accent-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft p-3 text-xs text-accent-danger flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grade de ações */}
      <div className="grid grid-cols-2 gap-4">
        {actions.map((a, idx) => {
          const busy =
            (a.title === 'Carregar' && loading === 'load') ||
            (a.title === 'Descarregar' && loading === 'unload') ||
            (a.title === 'Atualizar Meta' && loading === 'meta');

          return (
            <button
              key={`${a.title}-${idx}`}
              onClick={() => {
                if (a.title === 'Carregar') handleLoad();
                else if (a.title === 'Descarregar') handleUnload();
                else if (a.title === 'Atualizar Meta') handleUpdateGoals();
                else onNavigate(a.id);
              }}
              disabled={loading !== null}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-ui bg-surface-card p-5 text-left shadow-xl hover:border-accent-primary-soft-border hover:bg-surface-raised transition-colors disabled:opacity-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border group-hover:bg-accent-primary-solid group-hover:text-on-accent transition-colors">
                {busy ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  a.icon
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-primary">{a.title}</div>
                <div className="text-[11px] text-muted mt-0.5">{a.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
