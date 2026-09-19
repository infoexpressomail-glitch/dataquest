import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import { FieldSession } from './fieldTypes';
import { ArrowRight, CheckCircle2, Inbox, TrendingUp, Target, ChevronDown, WifiOff } from 'lucide-react';
import './fieldMobile.css';

interface FieldDashboardProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
  onStartColeta: () => void;
  onGoSync: () => void;
}

/**
 * Dashboard inicial do app de campo (padrão visual mobile).
 * Exibe apenas dados REAIS do pesquisador logado.
 */
export const FieldDashboard: React.FC<FieldDashboardProps> = ({
  session,
  onStartColeta,
  onGoSync,
}) => {
  const {
    currentUser: ctxUser,
    currentProfile: ctxProfile,
    surveys: ctxSurveys,
    submissions,
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
  } = useApp();

  const currentUser = session?.user ?? ctxUser;
  const currentProfile = session?.profile ?? ctxProfile;
  const surveys = session?.surveys ?? ctxSurveys;

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const availableSurveys = isResearcher
    ? filterResearcherVisibleSurveys(surveys, currentUser)
    : surveys.filter((s) => s.status !== 'excluida');

  const researcherSubmissions = submissions.filter(
    (sub) => sub.pesquisadorId === currentUser.id
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const submissionsToday = researcherSubmissions.filter(
    (sub) => sub.dataHora && sub.dataHora.slice(0, 10) === todayStr
  );

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  const [expandedGoalsSurveyId, setExpandedGoalsSurveyId] = useState<string | null>(null);

  const totalMeta = availableSurveys.reduce(
    (acc, s) => acc + (typeof s.metaTotalColetas === 'number' ? s.metaTotalColetas : 0),
    0
  );

  return (
    <div>
      <div className="field-hero">
        <div className="field-hero-greeting">Olá, {currentUser.nome.split(' ')[0]}! 👋</div>
        <div className="field-hero-sub">
          {effectiveOnline ? 'Foco no seu trabalho de campo' : 'Modo offline — coletas serão sincronizadas depois'}
        </div>
        {totalMeta > 0 && (
          <>
            <div className="field-hero-progress" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(100, Math.round((researcherSubmissions.length / totalMeta) * 100))}%`,
                }}
              />
            </div>
            <div className="field-hero-stats">
              <span>
                <strong>{researcherSubmissions.length}</strong> / {totalMeta} coletas
              </span>
              <span>Meta das pesquisas</span>
            </div>
          </>
        )}
      </div>

      <div className="field-summary-grid">
        <div className="field-summary-item">
          <div className="field-summary-value">{submissionsToday.length}</div>
          <div className="field-summary-label">Hoje</div>
        </div>
        <div className="field-summary-item">
          <div
            className="field-summary-value"
            style={{ color: pendingCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}
          >
            {pendingCount}
          </div>
          <div className="field-summary-label">Falta enviar</div>
        </div>
        <div className="field-summary-item">
          <div className="field-summary-value">{availableSurveys.length}</div>
          <div className="field-summary-label">Pesquisas</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <button
          type="button"
          onClick={onGoSync}
          className="field-alert is-warning"
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> registro(s) na fila offline aguardando sincronização.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" style={{ marginLeft: 'auto' }} />
        </button>
      )}

      <div className="field-section-title" style={{ marginTop: '1rem' }}>
        <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
        Pesquisas disponíveis
        <span className="field-count">{availableSurveys.length}</span>
      </div>

      {availableSurveys.length === 0 ? (
        <div className="field-empty">
          <div className="field-empty-icon">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Nenhuma pesquisa liberada no momento
          </div>
          <div className="field-text-xs field-text-muted">
            As pesquisas ativas atribuídas a você aparecerão aqui.
          </div>
        </div>
      ) : (
        availableSurveys.map((survey) => {
          const doneCount = researcherSubmissions.filter((s) => s.pesquisaId === survey.id).length;
          const goalOpen = expandedGoalsSurveyId === survey.id;
          const hasMeta = typeof survey.metaTotalColetas === 'number' && survey.metaTotalColetas > 0;
          const pct = hasMeta ? Math.min(100, Math.round((doneCount / survey.metaTotalColetas!) * 100)) : 0;
          return (
            <div className="field-survey-card" key={survey.id}>
              <div className="field-survey-top">
                <div style={{ minWidth: 0 }}>
                  <span className="field-survey-code">{survey.codigo}</span>
                  <div className="field-survey-name">{survey.nome}</div>
                </div>
                <span className="field-status-pill is-online" style={{ flexShrink: 0 }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pronta
                </span>
              </div>

              <div className="field-survey-meta">
                <span>{survey.perguntas?.length ?? 0} perguntas</span>
                {hasMeta && (
                  <span>
                    <Target className="h-3.5 w-3.5" /> Meta: {doneCount} / {survey.metaTotalColetas}
                  </span>
                )}
              </div>

              {hasMeta && (
                <div className="field-progress" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
              )}

              <button
                type="button"
                onClick={() => setExpandedGoalsSurveyId((prev) => (prev === survey.id ? null : survey.id))}
                className="field-row-between"
                style={{ width: '100%', background: 'none', border: 'none', padding: 0, marginTop: '0.7rem', cursor: 'pointer' }}
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

              <div className="field-actions-row">
                <button type="button" onClick={onStartColeta} className="field-btn field-btn-primary">
                  Coletar agora <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
