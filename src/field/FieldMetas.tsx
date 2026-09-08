import React from 'react';
import { useApp } from '../context/AppContext';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { ResearcherIndividualGoalsView } from '../components/metas/ResearcherIndividualGoalsView';
import { FieldSession } from './fieldTypes';
import { Target, Inbox, ArrowRight } from 'lucide-react';

interface FieldMetasProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
}

/**
 * Tela "Minhas Metas & Cotas" do sub-app.
 * Reutiliza o ResearcherIndividualGoalsView mostrando apenas as metas do
 * pesquisador logado (o componente trava no currentUser.id para campo).
 */
export const FieldMetas: React.FC<FieldMetasProps> = ({ session }) => {
  const { currentUser: ctxUser, currentProfile: ctxProfile, surveys: ctxSurveys } = useApp();

  const currentUser = session?.user ?? ctxUser;
  const currentProfile = session?.profile ?? ctxProfile;
  const surveys = session?.surveys ?? ctxSurveys;

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const visibleSurveys = isResearcher
    ? filterResearcherVisibleSurveys(surveys, currentUser)
    : surveys.filter((s) => s.status !== 'excluida');

  // Preferir a primeira pesquisa visível que tenha metas; senão a primeira visível.
  const activeSurvey = visibleSurveys.find((s) => (s.metas?.length ?? 0) > 0) || visibleSurveys[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ui bg-surface-card p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-soft text-accent-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-primary">Minhas Metas & Cotas</h2>
            <p className="text-[10px] text-muted">
              Acompanhe o seu desempenho individual em cada pesquisa liberada.
            </p>
          </div>
        </div>
      </div>

      {activeSurvey ? (
        <ResearcherIndividualGoalsView activeSurvey={activeSurvey} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ui bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-primary">
            Nenhuma pesquisa liberada
          </h3>
          <p className="mt-1 max-w-sm text-[11px] text-muted leading-relaxed">
            As metas individuais aparecem quando você tiver uma pesquisa ativa
            atribuída para coletar.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-accent-primary">
            Aguarde a coordenação liberar uma pesquisa <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </div>
  );
};
