import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { FieldColeta } from './FieldColeta';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DownloadCloud,
  Inbox,
  LogOut,
  RefreshCw,
  Target,
  UploadCloud,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

interface FieldWorkspaceProps {
  session: FieldSession;
  /** Re-sincroniza as pesquisas (Carregar) e devolve a sessão atualizada. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
  /** Encerra a sessão do pesquisador (volta ao login). */
  onLogout: () => void;
  /** Código/id da pesquisa-alvo vinda do link compartilhado (?pesquisa=...). */
  autoStartSurveyId?: string | null;
}

/**
 * Ambiente do Modo Pesquisador (reescrito).
 *
 * Fluxo único e direto, no padrão "modo pesquisador":
 *   1. Login (FieldLogin) — única porta de entrada.
 *   2. Aqui: lista apenas das PESQUISAS ATIVAS atribuídas ao login.
 *   3. Coleta da pesquisa selecionada (CollectionSimulator em fieldMode).
 *
 * Não há mais menu lateral com "Início / Metas / Sincronizar" separados:
 * as metas aparecem dentro de cada pesquisa e a sincronização é uma ação
 * pontual do cabeçalho. Isso reduz ruído e direciona o pesquisador ao que
 * importa: coletar.
 */
export const FieldWorkspace: React.FC<FieldWorkspaceProps> = ({
  session,
  onResync,
  onLogout,
  autoStartSurveyId,
}) => {
  const {
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
    setEditingSurvey,
    editingSurvey,
    syncOfflineQueue,
    forceSyncPendingWithSupabase,
  } = useApp();

  const [coletaOpen, setColetaOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [expandedGoalsId, setExpandedGoalsId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'load' | 'unload' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  // Apenas pesquisas ATIVAS liberadas para este login (ativas vinculadas ou
  // concluídas re-habilitadas). Pesquisas finalizadas/expiradas não aparecem.
  const activeSurveys = useMemo(
    () => filterResearcherVisibleSurveys(session.surveys, session.user),
    [session.surveys, session.user]
  );

  const startColeta = (surveyId: string) => {
    const survey = activeSurveys.find((s) => s.id === surveyId);
    if (survey) setEditingSurvey(survey);
    setColetaOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Link compartilhado (?pesquisa=<CODIGO>): abre direto a coleta da pesquisa
  // alvo, desde que ela esteja ativa e atribuída a este login.
  useEffect(() => {
    if (!autoStartSurveyId) return;
    const target = activeSurveys.find(
      (s) => s.id === autoStartSurveyId || s.codigo?.toLowerCase() === autoStartSurveyId.toLowerCase()
    );
    if (target) startColeta(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartSurveyId, activeSurveys.length]);

  const handleLoad = async () => {
    setBusy('load');
    setFeedback(null);
    setError(null);
    try {
      const updated = await onResync(session);
      setFeedback(
        `${updated.surveys.length} pesquisa(s) carregada(s). Somente as ativas vinculadas a você ficam disponíveis.`
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar pesquisas. Tente novamente.');
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
          `${totalSent} item(ns) enviado(s). ${totalFailed} continuam pendentes. ${queueResult.message} ${surveyResult.message}`
        );
      } else {
        setFeedback(
          totalSent > 0
            ? `${totalSent} coleta(s) enviada(s) com sucesso ao servidor.`
            : 'Não havia nada pendente para enviar.'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar coletas. Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  // ------------------------------- COLETA ---------------------------------
  if (coletaOpen) {
    const current = activeSurveys.find((s) => s.id === editingSurvey?.id) || activeSurveys[0];
    return (
      <div className="min-h-screen bg-surface-app text-primary">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ui bg-surface-app/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setColetaOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4 text-accent-primary" />
            <span>Voltar às pesquisas</span>
          </button>
          <div className="min-w-0 text-right">
            <div className="truncate text-xs font-bold text-primary">{current?.nome}</div>
            <div className="text-[10px] text-muted font-mono">{current?.codigo}</div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-3 py-5 sm:px-6">
          <FieldColeta session={session} />
        </main>
      </div>
    );
  }

  // --------------------------- LISTA DE PESQUISAS -------------------------
  return (
    <div className="min-h-screen bg-surface-app text-primary">
      {/* Cabeçalho enxuto: identidade + status + sincronização */}
      <header className="sticky top-0 z-30 border-b border-ui bg-surface-app/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-on-accent font-black text-sm shadow-lg shadow-emerald-900/40">
              DQ
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-primary">DataQuest Campo</div>
              <div className="truncate text-[10px] text-muted">
                {session.user.nome} • {session.profile?.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                effectiveOnline
                  ? 'border-accent-success-soft-border bg-accent-success-soft text-accent-success'
                  : 'border-accent-warning-soft-border bg-accent-warning-soft text-accent-warning'
              }`}
            >
              {effectiveOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {effectiveOnline ? 'Online' : 'Offline'}
            </span>

            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-info-soft-border bg-accent-info-soft px-2.5 py-1 text-[10px] font-bold text-accent-info">
                <RefreshCw className="h-3 w-3" />
                {pendingCount}
              </span>
            )}

            <button
              onClick={() => setSyncOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-surface-raised px-3 py-2 text-xs font-bold text-secondary hover:bg-surface-hover hover:text-primary transition"
              title="Sincronizar pesquisas e enviar coletas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent-danger-soft-border bg-accent-danger-soft px-3 py-2 text-xs font-bold text-accent-danger hover:opacity-90 transition"
              title="Sair do modo pesquisador"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Painel de sincronização (ação pontual, não um menu) */}
        {syncOpen && (
          <div className="border-t border-ui bg-surface-card">
            <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-primary">Carregar / Descarregar</h3>
                  <p className="text-[10px] text-muted">
                    Baixe pesquisas atualizadas e envie as coletas feitas offline.
                  </p>
                </div>
                <button
                  onClick={() => setSyncOpen(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleLoad}
                  disabled={busy !== null || !effectiveOnline}
                  className="flex items-center gap-3 rounded-xl border border-ui bg-surface p-3.5 text-left hover:border-accent-primary-soft-border transition disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft text-accent-primary">
                    <DownloadCloud className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-primary">
                      {busy === 'load' ? 'Carregando...' : 'Carregar pesquisas'}
                    </span>
                    <span className="block text-[10px] text-muted">
                      Baixar as pesquisas ativas do seu login
                    </span>
                  </span>
                </button>

                <button
                  onClick={handleUnload}
                  disabled={busy !== null || !effectiveOnline || pendingCount === 0}
                  className="flex items-center gap-3 rounded-xl border border-ui bg-surface p-3.5 text-left hover:border-accent-success-soft-border transition disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-success-soft-border bg-accent-success-soft text-accent-success">
                    <UploadCloud className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-primary">
                      {busy === 'unload' ? 'Enviando...' : 'Descarregar coletas'}
                    </span>
                    <span className="block text-[10px] text-muted">
                      {pendingCount > 0 ? `${pendingCount} pendente(s)` : 'Tudo enviado'}
                    </span>
                  </span>
                </button>
              </div>

              {feedback && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-success-soft-border bg-accent-success-soft p-2.5 text-[11px] text-accent-success">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}
              {error && (
                <div className="mt-3 rounded-lg border border-accent-danger-soft-border bg-accent-danger-soft p-2.5 text-[11px] text-accent-danger">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Boas-vindas */}
        <div className="rounded-2xl border border-accent-primary-soft-border bg-gradient-to-r from-surface via-surface-raised to-surface p-5 shadow-xl">
          <h1 className="text-lg font-black text-primary">
            Olá, {session.user.nome.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-xs text-muted">
            Você tem <strong className="text-accent-primary">{activeSurveys.length}</strong>{' '}
            pesquisa(s) ativa(s) liberada(s). Selecione uma para iniciar a coleta.
          </p>
        </div>

        {/* Lista de pesquisas ativas */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent-primary" />
            <h2 className="text-sm font-black text-primary">Pesquisas disponíveis</h2>
          </div>
          <span className="rounded-full border border-ui bg-surface-raised px-2.5 py-1 text-[10px] font-bold text-secondary">
            {activeSurveys.length}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {activeSurveys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-primary">
                Nenhuma pesquisa ativa no momento
              </h3>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
                As pesquisas ativas atribuídas ao seu login aparecerão aqui. Toque em
                “Sincronizar” para atualizar a lista.
              </p>
              <button
                onClick={() => setSyncOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sincronizar agora
              </button>
            </div>
          ) : (
            activeSurveys.map((survey) => (
              <div
                key={survey.id}
                className="rounded-2xl border border-ui bg-surface-card p-4 shadow-xl transition hover:border-accent-primary-soft-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block rounded-md border border-ui bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-accent-primary">
                      {survey.codigo}
                    </span>
                    <h3 className="mt-2 text-sm font-bold leading-snug text-primary">
                      {survey.nome}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted">{survey.descricao}</p>
                  </div>
                  {survey.layoutStyle === 'MOBILE_PREMIUM' && (
                    <span className="shrink-0 rounded-full border border-accent-primary-soft-border bg-accent-primary-soft px-2 py-0.5 text-[9px] font-bold text-accent-primary">
                      Premium
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted">
                  {survey.dataFim && (
                    <span>
                      Período até <strong className="text-secondary">{survey.dataFim}</strong>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-accent-success" /> Pronta para coleta
                  </span>
                </div>

                {/* Metas inline (acompanhamento) */}
                <div className="mt-3 border-t border-subtle pt-3">
                  <button
                    onClick={() =>
                      setExpandedGoalsId((prev) => (prev === survey.id ? null : survey.id))
                    }
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted hover:text-primary transition"
                  >
                    <Target className="h-3.5 w-3.5 text-accent-primary" />
                    Metas desta pesquisa
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        expandedGoalsId === survey.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedGoalsId === survey.id && (
                    <div className="mt-2">
                      <ResearcherIndividualGoalsView activeSurvey={survey} fieldMode />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => startColeta(survey.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-3 text-xs font-bold text-on-accent shadow-lg shadow-emerald-900/40 transition hover:bg-accent-primary-solid-hover active:scale-[0.99]"
                >
                  Coletar agora
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted">
          DataQuest • Modo Pesquisador — somente pesquisas ativas vinculadas ao seu login.
        </p>
      </main>
    </div>
  );
};
