import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import { FieldSession } from './fieldTypes';
import { Target, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, Inbox } from 'lucide-react';
import './fieldMobile.css';

interface FieldMetasProps {
  session: FieldSession;
  /** Recarrega as pesquisas para atualizar as metas das pesquisas ativas. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

/**
 * Tela de Metas do pesquisador — ACOMPANHAMENTO (padrão visual de campo).
 * Apresenta as metas configuradas em cada pesquisa ativa vinculada ao
 * pesquisador. As metas são atualizadas a cada sincronização (Carregar).
 */
export const FieldMetas: React.FC<FieldMetasProps> = ({ session, onResync }) => {
  const {
    currentUser,
    currentProfile,
    effectiveOnline,
    offlineQueue,
    pendingIndexedDbCount,
  } = useApp();

  const currentUserF = session.user ?? currentUser;
  const currentProfileF = session.profile ?? currentProfile;

  const isResearcher =
    currentProfileF?.id === 'prof_pesq' ||
    currentProfileF?.name.toLowerCase().includes('pesquisador');

  const availableSurveys = isResearcher
    ? filterResearcherVisibleSurveys(session.surveys, currentUserF)
    : session.surveys.filter((s) => s.status !== 'excluida');

  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(
    availableSurveys[0]?.id ?? null
  );

  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = offlineQueue.length + pendingIndexedDbCount;

  const handleUpdateGoals = async () => {
    setUpdating(true);
    setFeedback(null);
    setError(null);
    try {
      await onResync(session);
      setFeedback('Metas atualizadas com sucesso a partir do último carregamento.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar metas. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="field-stack">
      <div className="field-card">
        <div className="field-row-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <span className="field-survey-icon" aria-hidden="true">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <div className="field-text-sm" style={{ fontWeight: 800 }}>
                Minhas Metas
              </div>
              <div className="field-text-xs field-text-muted">
                Metas configuradas nas pesquisas ativas vinculadas a você.
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdateGoals}
          disabled={updating || !effectiveOnline}
          className="field-btn field-btn-primary field-btn-block field-mt"
        >
          <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Atualizando...' : 'Atualizar Metas'}
        </button>

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

      {availableSurveys.length === 0 ? (
        <div className="field-empty">
          <div className="field-empty-icon">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="field-text-sm" style={{ fontWeight: 800 }}>
            Nenhuma pesquisa ativa vinculada
          </div>
          <div className="field-text-xs field-text-muted">
            As metas das pesquisas relacionadas a você aparecerão aqui após o carregamento.
          </div>
        </div>
      ) : (
        availableSurveys.map((survey) => {
          const isOpen = expandedSurveyId === survey.id;
          return (
            <div className="field-survey-card" key={survey.id}>
              <button
                type="button"
                onClick={() => setExpandedSurveyId(isOpen ? null : survey.id)}
                className="field-row-between"
                style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-expanded={isOpen}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <span className="field-survey-icon" aria-hidden="true">
                    <Target className="h-4 w-4" />
                  </span>
                  <span style={{ textAlign: 'left', minWidth: 0 }}>
                    <span className="field-text-sm" style={{ display: 'block', fontWeight: 800 }}>
                      {survey.nome}
                    </span>
                    <span className="field-survey-code">{survey.codigo}</span>
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                />
              </button>

              {isOpen && (
                <div className="field-mt" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.7rem' }}>
                  <ResearcherIndividualGoalsView activeSurvey={survey} fieldMode />
                </div>
              )}
            </div>
          );
        })
      )}

      {pendingCount > 0 && (
        <p className="field-text-xs" style={{ color: 'var(--accent-warning)' }}>
          Você tem {pendingCount} coleta(s) pendente(s) de descarregar. Envie-as para que as metas
          reflitam o progresso real.
        </p>
      )}
    </div>
  );
};
