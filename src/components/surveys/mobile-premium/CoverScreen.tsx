import React from 'react';
import { Building2, CheckCircle2, Clock, ListChecks, Play } from 'lucide-react';
import type { Survey } from '../../../types';
import { resolveImageUrl } from './mobilePremiumUtils';

interface CoverScreenProps {
  survey: Survey;
  theme: { primary: string; secondary: string };
  onStart: () => void;
}

/**
 * Capa da pesquisa (tela inicial) do modelo Mobile Premium: imagem, logo,
 * título, mensagem e botão "Iniciar Pesquisa".
 */
export const CoverScreen: React.FC<CoverScreenProps> = ({ survey, theme, onStart }) => {
  const cover = resolveImageUrl(survey.coverImage);
  const logo = survey.logoImage;
  const total = survey.perguntas?.length || 0;

  return (
    <section className="mp-cover mp-anim-fade" aria-label="Abertura da pesquisa">
      {cover && (
        <div className="mp-cover-media">
          <img src={cover} alt="" />
        </div>
      )}

      <div className="mp-cover-body">
        {logo ? (
          <div className="mp-cover-logo">
            <img src={logo} alt={survey.institutionName || 'Logo institucional'} />
          </div>
        ) : (
          <div className="mp-cover-logo" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary }}>
            <Building2 size={30} />
          </div>
        )}

        {survey.institutionName && (
          <div className="mp-institution" style={{ color: theme.primary, opacity: 1, fontWeight: 800 }}>
            {survey.institutionName}
          </div>
        )}

        <h1 className="mp-cover-title">{survey.nome}</h1>

        {survey.descricao && <p className="mp-cover-desc">{survey.descricao}</p>}

        {survey.welcomeMessage && (
          <p className="mp-cover-desc" style={{ marginTop: 14 }}>
            {survey.welcomeMessage}
          </p>
        )}

        <div className="mp-cover-list">
          <div className="mp-cover-list-item">
            <ListChecks size={18} color={theme.primary} />
            <span>{total} pergunta{total === 1 ? '' : 's'} nesta pesquisa</span>
          </div>
          <div className="mp-cover-list-item">
            <Clock size={18} color={theme.primary} />
            <span>Tempo estimado: {Math.max(1, Math.ceil(total * 0.4))} minuto(s)</span>
          </div>
          <div className="mp-cover-list-item">
            <CheckCircle2 size={18} color={theme.secondary} />
            <span>Suas respostas são confidenciais e anônimas</span>
          </div>
        </div>

        <button
          type="button"
          className="mp-btn mp-btn-primary"
          style={{ marginTop: 24, width: '100%', background: theme.primary }}
          onClick={onStart}
        >
          <Play size={18} />
          <span>{survey.startButtonLabel || 'Iniciar Pesquisa'}</span>
        </button>
      </div>
    </section>
  );
};
