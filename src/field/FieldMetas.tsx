import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import { FieldSession } from './fieldTypes';
import {
  Target,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Inbox,
} from 'lucide-react';

interface FieldMetasProps {
  session: FieldSession;
  /** Recarrega as pesquisas para atualizar as metas das pesquisas ativas. */
  onResync: (current: FieldSession) => Promise<FieldSession>;
}

/**
 * Tela de Metas do pesquisador — ACOMPANHAMENTO.
 * Apresenta as metas configuradas em cada pesquisa ativa vinculada ao
 * pesquisador, com a mesma disposição do painel individual. As metas são
 * apenas de acompanhamento e são atualizadas a cada sincronização (Carregar).
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
    <div className="space-y-6">
      {/* Cabeçalho + Ações */}
      <div className="rounded-2xl border border-ui bg-surface p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary">Minhas Metas</h2>
              <p className="text-[11px] text-muted">
                Acompanhamento das metas configuradas nas pesquisas ativas vinculadas a você.
              </p>
            </div>
          </div>

          <button
            onClick={handleUpdateGoals}
            disabled={updating || !effectiveOnline}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary-solid px-4 py-2.5 text-xs font-bold text-on-accent shadow-md shadow-emerald-900/40 hover:bg-accent-primary-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Atualizando...' : 'Atualizar Metas'}
          </button>
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

      {/* Lista de pesquisas ativas com metas */}
      <div className="space-y-4">
        {availableSurveys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ui bg-surface p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-primary">
              Nenhuma pesquisa ativa vinculada
            </h3>
            <p className="mt-1 text-xs text-muted">
              As metas das pesquisas ativas relacionadas a você aparecerão aqui após o carregamento.
            </p>
          </div>
        ) : (
          availableSurveys.map((survey) => {
            const isOpen = expandedSurveyId === survey.id;
            return (
              <div key={survey.id} className="rounded-2xl border border-ui bg-surface-card overflow-hidden shadow-xl">
                <button
                  onClick={() => setExpandedSurveyId(isOpen ? null : survey.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary border border-accent-primary-soft-border">
                      <Target className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-primary">{survey.nome}</div>
                      <div className="text-[11px] text-muted">
                        <span className="font-mono text-accent-primary">{survey.codigo}</span> • Metas configuradas nesta pesquisa
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-ui p-4">
                    <ResearcherIndividualGoalsView activeSurvey={survey} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {pendingCount > 0 && (
        <p className="text-[11px] text-accent-warning">
          Você tem {pendingCount} coleta(s) pendente(s) de descarregar. Envie-as para que as metas reflitam o progresso real.
        </p>
      )}
    </div>
  );
};
