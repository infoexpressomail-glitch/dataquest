import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Survey } from '../types';
import { filterResearcherVisibleSurveys } from '../utils/researcherUtils';
import { CollectionSimulator } from '../components/simulator/CollectionSimulator';
import { FieldSession } from './fieldTypes';
import { ClipboardList, CheckCircle2, ChevronDown } from 'lucide-react';
import './fieldMobile.css';

interface FieldColetaProps {
  /** Sessão autenticada no sub-app (opcional — usa o contexto quando ausente). */
  session?: FieldSession;
}

/**
 * Tela de Coleta do sub-app — container mobile-first.
 *
 * A lógica das perguntas, respostas, validações, áudio, GPS, offline e
 * submissão continua 100% no `CollectionSimulator` (`fieldMode`). Aqui apenas
 * apresentamos o container e o seletor de pesquisa liberada no padrão visual
 * do app de campo.
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
    <div>
      {/* Pesquisa ativa / seletor de pesquisa liberada */}
      {availableSurveys.length > 1 ? (
        <div style={{ marginBottom: '0.9rem' }}>
          <button
            type="button"
            onClick={() => setSelectorOpen((v) => !v)}
            className="field-card"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            aria-expanded={selectorOpen}
          >
            <span style={{ minWidth: 0 }}>
              <span className="field-text-xs field-text-muted" style={{ display: 'block' }}>
                Pesquisa ativa
              </span>
              <span
                className="field-text-sm"
                style={{
                  display: 'block',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeSurvey ? `${activeSurvey.codigo} — ${activeSurvey.nome}` : 'Selecionar pesquisa'}
              </span>
            </span>
            <ChevronDown className="h-4 w-4" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          </button>

          {selectorOpen && (
            <div className="field-card field-stack" style={{ marginTop: '0.4rem' }}>
              {availableSurveys.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSurvey(s)}
                  className="field-row-between"
                  style={{
                    width: '100%',
                    background: activeSurvey?.id === s.id ? 'var(--accent-primary-soft-bg)' : 'none',
                    border: 'none',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="field-survey-code" style={{ display: 'block' }}>
                      {s.codigo}
                    </span>
                    <span className="field-text-sm" style={{ fontWeight: 700 }}>
                      {s.nome}
                    </span>
                  </span>
                  {activeSurvey?.id === s.id && (
                    <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="field-card" style={{ marginBottom: '0.9rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span className="field-survey-icon" aria-hidden="true">
            <ClipboardList className="h-5 w-5" />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="field-text-xs field-text-muted" style={{ display: 'block' }}>
              Coleta de campo
            </span>
            <span
              className="field-text-sm"
              style={{
                display: 'block',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeSurvey ? activeSurvey.nome : 'Nenhuma pesquisa liberada'}
            </span>
          </span>
        </div>
      )}

      {availableSurveys.length === 0 && (
        <div className="field-alert is-warning">
          Nenhuma pesquisa liberada para você coletar no momento. As pesquisas ativas vinculadas a
          você aparecerão aqui.
        </div>
      )}

      {/* Formulário de coleta reutilizado — lógica existente preservada */}
      {activeSurvey && (
        <div className="field-collector">
          {/* fieldMode=true: oculta elementos técnicos/estatísticos para o coletor de campo */}
          <CollectionSimulator fieldMode />
        </div>
      )}
    </div>
  );
};
