import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FieldSession } from './fieldTypes';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { FieldColeta } from './FieldColeta';
import { FieldMission } from './FieldMission';
import { FieldBottomNav, FieldTab } from './FieldBottomNav';
import { FieldHeader } from './FieldHeader';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Cloud,
  DownloadCloud,
  Inbox,
  LogOut,
  MapPin,
  RefreshCw,
  Target,
  UploadCloud,
  User,
  WifiOff,
} from 'lucide-react';
import './fieldMobile.css';

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
 * Ambiente do Modo Pesquisador (redesign UX/UI mobile-first).
 *
 * O fluxo funcional é EXATAMENTE o mesmo do sub-app existente:
 *   login → pesquisas ativas vinculadas → coleta (CollectionSimulator fieldMode)
 *
 * A camada nova é apenas visual: shell mobile, header compacto, dashboard do
 * pesquisador, cards de pesquisa, sincronização evidenciada e navegação
 * inferior. Toda a lógica de sessão, fila offline, IndexedDB, sincronização,
 * geolocalização, áudio e submissão continua vindo do AppContext/serviços.
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
    submissions,
    syncOfflineQueue,
    forceSyncPendingWithSupabase,
  } = useApp();

  const [tab, setTab] = useState<FieldTab>('home');
  const [coletaOpen, setColetaOpen] = useState(false);
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

  // Coletas REAIS do pesquisador logado (nunca dados fictícios).
  const researcherSubmissions = useMemo(
    () => submissions.filter((sub) => sub.pesquisadorId === session.user.id),
    [submissions, session.user.id]
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = useMemo(
    () => researcherSubmissions.filter((sub) => sub.dataHora?.slice(0, 10) === todayStr),
    [researcherSubmissions, todayStr]
  );

  const totalMeta = useMemo(
    () =>
      activeSurveys.reduce(
        (acc, s) => acc + (typeof s.metaTotalColetas === 'number' ? s.metaTotalColetas : 0),
        0
      ),
    [activeSurveys]
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

  const goToSync = () => {
    setTab('sync');
    setFeedback(null);
    setError(null);
  };

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

  const doneForSurvey = (surveyId: string) =>
    researcherSubmissions.filter((s) => s.pesquisaId === surveyId).length;

  // ------------------------------- COLETA ---------------------------------
  if (coletaOpen) {
    const current = activeSurveys.find((s) => s.id === editingSurvey?.id) || activeSurveys[0];
    return (
      <div className="field-app">
        <div className="field-app-shell">
          <header className="field-coleta-header">
            <button
              type="button"
              onClick={() => setColetaOpen(false)}
              className="field-btn field-btn-ghost"
              style={{ flex: '0 0 auto', minHeight: '2.5rem', padding: '0 0.8rem' }}
              aria-label="Voltar às pesquisas"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Pesquisa</span>
            </button>
            <div style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>
              <div
                className="field-text-sm"
                style={{
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {current?.nome}
              </div>
              <div className="field-survey-code">{current?.codigo}</div>
            </div>
          </header>

          <div className="field-scroll field-collector">
            {!effectiveOnline && (
              <div className="field-alert is-warning" style={{ marginTop: 0 }}>
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>
                  Você está offline. As coletas serão armazenadas e sincronizadas quando a conexão
                  voltar.
                </span>
              </div>
            )}

            <FieldColeta session={session} />
          </div>
        </div>
      </div>
    );
  }

  // --------------------------- CARD DE PESQUISA ----------------------------
  const renderSurveyCard = (survey: (typeof activeSurveys)[number], compact = false) => {
    const done = doneForSurvey(survey.id);
    const hasMeta = typeof survey.metaTotalColetas === 'number' && survey.metaTotalColetas > 0;
    const pct = hasMeta ? Math.min(100, Math.round((done / survey.metaTotalColetas!) * 100)) : 0;
    const goalOpen = expandedGoalsId === survey.id;

    return (
      <div className="field-survey-card" key={survey.id}>
        <div className="field-survey-top">
          <div className="field-survey-icon" aria-hidden="true">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="field-survey-name">{survey.nome}</div>
            <span className="field-survey-code">{survey.codigo}</span>
          </div>
          {survey.layoutStyle === 'MOBILE_PREMIUM' && (
            <span className="field-status-pill is-online" style={{ flexShrink: 0 }}>
              Premium
            </span>
          )}
        </div>

        <div className="field-survey-meta">
          <span>
            <ClipboardList className="h-3.5 w-3.5" />
            {survey.perguntas?.length ?? 0} perguntas
          </span>
          {hasMeta && (
            <span>
              <Target className="h-3.5 w-3.5" />
              Meta: {done} / {survey.metaTotalColetas}
            </span>
          )}
          <span>
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" />
            {done} coleta(s) sua(s)
          </span>
        </div>

        {hasMeta && (
          <>
            <div className="field-progress" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="field-survey-progress-label">
              <span>Progresso da meta</span>
              <span>{pct}%</span>
            </div>
          </>
        )}

        {!compact && (
          <div className="field-mt" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.7rem' }}>
            <button
              type="button"
              onClick={() => setExpandedGoalsId((prev) => (prev === survey.id ? null : survey.id))}
              className="field-row-between"
              style={{ width: '100%', background: 'none', border: 'none', padding: 0 }}
              aria-expanded={goalOpen}
            >
              <span className="field-text-xs" style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                <Target className="h-3.5 w-3.5 inline" /> Metas desta pesquisa
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${goalOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>
            {goalOpen && (
              <div className="field-mt">
                <ResearcherIndividualGoalsView activeSurvey={survey} fieldMode />
              </div>
            )}
          </div>
        )}

        <div className="field-actions-row">
          <button
            type="button"
            onClick={() => startColeta(survey.id)}
            className="field-btn field-btn-primary"
          >
            <span>Iniciar coleta</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // Botão de retorno ao início. A barra inferior (FieldBottomNav) é ocultada em
  // telas largas (>= 768px), então as demais abas precisam de um caminho de volta
  // que não dependa dela.
  const renderBackToHome = () => (
    <button
      type="button"
      onClick={() => setTab('home')}
      className="field-btn field-btn-ghost"
      style={{ minHeight: '2.5rem', padding: '0 0.9rem', marginBottom: '0.85rem' }}
      aria-label="Voltar à tela inicial do pesquisador"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Voltar ao início</span>
    </button>
  );

  // -------------------------------- INÍCIO ---------------------------------
  // Modo missão: uma ação principal (Nova entrevista), meta do dia, cotas
  // faltantes e sincronização discreta. Os dados vêm do AppContext/serviços.
  const renderHome = () => (
    <FieldMission
      session={session}
      activeSurveys={activeSurveys}
      researcherSubmissions={researcherSubmissions}
      submissionsToday={submissionsToday}
      totalMeta={totalMeta}
      pendingCount={pendingCount}
      effectiveOnline={effectiveOnline}
      busy={busy}
      onStartColeta={startColeta}
      onOpenSync={goToSync}
      onSendNow={handleUnload}
      onOpenPesquisas={() => setTab('pesquisas')}
    />
  );

  // ------------------------------ PESQUISAS --------------------------------
  const renderPesquisas = () => (
    <>
      {renderBackToHome()}
      <div className="field-section-title" style={{ marginTop: '0.25rem' }}>
        <ClipboardList className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
        Minhas coletas
        <span className="field-count">{activeSurveys.length}</span>
      </div>

      {activeSurveys.length === 0 ? (
        <div className="field-empty">
          <div className="field-empty-icon">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Nenhuma pesquisa ativa no momento
          </div>
          <div className="field-text-xs field-text-muted">
            Toque em Sync e use “Carregar pesquisas” para baixar as pesquisas liberadas para o seu login.
          </div>
          <button type="button" onClick={goToSync} className="field-btn field-btn-primary field-mt">
            <RefreshCw className="h-4 w-4" />
            Ir para sincronização
          </button>
        </div>
      ) : (
        activeSurveys.map((survey) => renderSurveyCard(survey))
      )}
    </>
  );

  // -------------------------------- SYNC -----------------------------------
  const renderSync = () => (
    <>
      {renderBackToHome()}
      <div className="field-card">
        <div className="field-row-between">
          <div>
            <div className="field-text-sm" style={{ fontWeight: 800 }}>
              Sincronização
            </div>
            <div className="field-text-xs field-text-muted">
              {effectiveOnline
                ? 'Conectado. Baixe pesquisas e envie as coletas feitas em campo.'
                : 'Offline. Você pode coletar; os dados serão enviados quando houver conexão.'}
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

      <div className="field-mt field-stack">
        <button
          type="button"
          onClick={handleLoad}
          disabled={busy !== null || !effectiveOnline}
          className="field-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span className="field-survey-icon" aria-hidden="true">
            <DownloadCloud className={`h-5 w-5 ${busy === 'load' ? 'animate-pulse' : ''}`} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
              {busy === 'load' ? 'Carregando...' : 'Carregar pesquisas'}
            </span>
            <span className="field-text-xs field-text-muted">
              Baixar as pesquisas ativas do seu login
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={handleUnload}
          disabled={busy !== null || !effectiveOnline || pendingCount === 0}
          className="field-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
          }}
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
          <span style={{ minWidth: 0 }}>
            <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
              {busy === 'unload' ? 'Enviando...' : 'Descarregar coletas'}
            </span>
            <span className="field-text-xs field-text-muted">
              {pendingCount > 0 ? `${pendingCount} pendente(s) para enviar` : 'Tudo enviado'}
            </span>
          </span>
        </button>
      </div>

      <div className="field-card field-mt">
        <div className="field-row-between">
          <span className="field-text-xs" style={{ fontWeight: 800 }}>
            <Cloud className="h-3.5 w-3.5 inline" /> Pesquisas no aparelho
          </span>
          <span className="field-text-xs field-text-muted">
            {session.surveys.length} pesquisa(s)
          </span>
        </div>
      </div>
    </>
  );

  // ------------------------------- PERFIL ----------------------------------
  const renderPerfil = () => (
    <>
      {renderBackToHome()}
      <div className="field-card">
        <div className="field-profile-head">
          <div className="field-avatar" aria-hidden="true">
            {session.user.nome.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="field-text-sm" style={{ fontWeight: 800 }}>
              {session.user.nome}
            </div>
            <div className="field-text-xs field-text-muted">{session.profile?.name || 'Pesquisador'}</div>
            <span className={`field-status-pill ${effectiveOnline ? 'is-online' : 'is-offline'} field-mt`} style={{ marginTop: '0.4rem' }}>
              {effectiveOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="field-card field-mt">
        <div className="field-info-row">
          <span className="label">
            <User className="h-3.5 w-3.5 inline" /> Login
          </span>
          <span className="value">{session.user.login}</span>
        </div>
        <div className="field-info-row">
          <span className="label">
            <MapPin className="h-3.5 w-3.5 inline" /> Matrícula
          </span>
          <span className="value">{session.user.cpf}</span>
        </div>
        <div className="field-info-row">
          <span className="label">
            <Cloud className="h-3.5 w-3.5 inline" /> Pendências
          </span>
          <span className="value">{pendingCount}</span>
        </div>
        <div className="field-info-row">
          <span className="label">
            <ClipboardList className="h-3.5 w-3.5 inline" /> Pesquisas
          </span>
          <span className="value">{activeSurveys.length}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="field-btn field-btn-danger field-btn-block field-mt"
      >
        <LogOut className="h-4 w-4" />
        Sair / trocar pesquisador
      </button>
    </>
  );

  return (
    <div className="field-app">
      <div className="field-app-shell">
        <FieldHeader
          user={session.user}
          profile={session.profile}
          online={effectiveOnline}
          pendingCount={pendingCount}
          onSync={goToSync}
          onLogout={onLogout}
          syncing={busy !== null}
        />

        <div className="field-scroll">
          {tab === 'home' && renderHome()}
          {tab === 'pesquisas' && renderPesquisas()}
          {tab === 'sync' && renderSync()}
          {tab === 'perfil' && renderPerfil()}

          <p
            className="field-text-xs field-text-muted"
            style={{ textAlign: 'center', marginTop: '1.2rem' }}
          >
            DataQuest • Modo Pesquisador — somente pesquisas ativas vinculadas ao seu login.
          </p>
        </div>

        <FieldBottomNav active={tab} pendingCount={pendingCount} onSelect={setTab} />
      </div>
    </div>
  );
};
