import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Survey } from '../types';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { CollectionSimulator } from '../components/simulator/CollectionSimulator';
import { FieldSession } from './fieldTypes';
import { ClipboardList, CheckCircle2, ArrowRight, ChevronDown } from 'lucide-react';

interface FieldColetaProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
}

/**
 * Tela de Coleta do sub-app.
 * Reutiliza o CollectionSimulator embutido; quando há mais de uma pesquisa
 * liberada, permite selecionar qual coletar (define o editingSurvey do contexto).
 */
export const FieldColeta: React.FC<FieldColetaProps> = ({ session }) => {
  const { currentUser: ctxUser, currentProfile: ctxProfile, surveys: ctxSurveys, editingSurvey, setEditingSurvey } = useApp();

  const currentUser = session?.user ?? ctxUser;
  const currentProfile = session?.profile ?? ctxProfile;
  const surveys = session?.surveys ?? ctxSurveys;

  const isResearcher =
    currentProfile?.id === 'prof_pesq' ||
    currentProfile?.name.toLowerCase().includes('pesquisador');

  const availableSurveys = isResearcher
    ? filterResearcherVisibleSurveys(surveys, currentUser)
    : surveys.filter((s) => s.status !== 'excluida');

  const [selectorOpen, setSelectorOpen] = useState(false);

  const activeSurvey: Survey | undefined =
    (editingSurvey && availableSurveys.some((s) => s.id === editingSurvey.id)
      ? editingSurvey
      : undefined) || availableSurveys[0];

  const selectSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setSelectorOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ui bg-surface-card p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-primary flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent-primary" />
              Registro de Coleta de Campo
            </h2>
            <p className="text-[10px] text-muted mt-0.5">
              Responda a entrevista abaixo. Sua submissão respeita o fluxo offline/auditoria.
            </p>
          </div>

          {/* Seletor de pesquisa liberada */}
          {availableSurveys.length > 1 && (
            <div className="relative w-full sm:w-80">
              <button
                onClick={() => setSelectorOpen((v) => !v)}
                className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-ui bg-surface-raised px-3 py-2.5 text-xs font-semibold text-primary hover:bg-surface-hover transition"
              >
                <span className="truncate">
                  {activeSurvey ? `${activeSurvey.codigo} — ${activeSurvey.nome}` : 'Selecionar pesquisa'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted shrink-0" />
              </button>
              {selectorOpen && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-ui bg-surface-raised shadow-2xl overflow-hidden">
                  {availableSurveys.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSurvey(s)}
                      className={`w-full flex items-start gap-2 px-3 py-2.5 text-left text-xs font-semibold transition ${
                        activeSurvey?.id === s.id
                          ? 'bg-accent-primary-soft text-accent-primary'
                          : 'text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-mono text-[10px] text-muted">{s.codigo}</span>
                        <span className="block truncate">{s.nome}</span>
                      </span>
                      {activeSurvey?.id === s.id && (
                        <ArrowRight className="h-3.5 w-3.5 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {availableSurveys.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-ui bg-surface p-4 text-[11px] text-muted">
            Nenhuma pesquisa liberada para você coletar no momento. As pesquisas
            ativas vinculadas a você aparecerão aqui.
          </p>
        )}
      </div>

      {/* Formulário de coleta reutilizado */}
      {activeSurvey && (
        <div className="rounded-2xl border border-ui bg-surface p-4 sm:p-6 shadow-xl">
          <CollectionSimulator />
        </div>
      )}
    </div>
  );
};
