import React from 'react';
import { Building2, Clock, Contrast, Mic, Type } from 'lucide-react';
import type { Survey } from '../../../types';
import { formatAudioDuration } from '../../../utils/audioUtils';
import { ProgressBar } from './ProgressBar';
import { QuestionIndicator } from './QuestionIndicator';

/** Estado da gravação de áudio da coleta de campo. */
export interface MobilePremiumAudioStatus {
  /** A gravação está habilitada nesta pesquisa. */
  enabled: boolean;
  /** A coleta já chegou ao ponto de início configurado. */
  started: boolean;
  /** O limite de tempo configurado foi atingido. */
  atLimit: boolean;
  /** A gravação está ativa neste momento. */
  recording: boolean;
  /** Segundos gravados. */
  seconds: number;
  /** Limite configurado em minutos. */
  limitMinutes: number;
  /** Código da pergunta onde a gravação inicia. */
  startCode?: string;
}

interface MobilePremiumHeaderProps {
  survey: Survey;
  percent: number;
  current: number;
  total: number;
  showPercent?: boolean;
  showIndicator?: boolean;
  highContrast: boolean;
  largeFont: boolean;
  onToggleHighContrast: () => void;
  onToggleLargeFont: () => void;
  /** Indicador de gravação de áudio (tempo e status) — coleta de campo. */
  audio?: MobilePremiumAudioStatus;
}

/**
 * Cabeçalho institucional do modelo Mobile Premium: logo opcional, nome da
 * pesquisa, descrição curta, barra de progresso, percentual e indicador
 * "Pergunta X de Y". Também oferece os toggles de acessibilidade.
 */
export const MobilePremiumHeader: React.FC<MobilePremiumHeaderProps> = ({
  survey,
  percent,
  current,
  total,
  showPercent = true,
  showIndicator = true,
  highContrast,
  largeFont,
  onToggleHighContrast,
  onToggleLargeFont,
  audio,
}) => {
  return (
    <header className="mp-header">
      {/*
       * Indicador de gravação DISCRETO, ancorado no topo do cabeçalho (junto à
       * área do relógio do celular). A gravação deixa de ser um elemento
       * evidente da pesquisa. Ao atingir o tempo máximo configurado (ex.: 2 min),
       * o indicador sai da tela por completo.
       */}
      {audio?.enabled && !audio.atLimit && (
        <div className="mp-statusbar">
          <button
            type="button"
            className={`mp-audio-mini ${audio.recording ? 'recording' : 'pending'}`}
            role="status"
            aria-live="polite"
            title={
              audio.recording
                ? `Gravação de áudio em andamento — ${formatAudioDuration(audio.seconds)} / ${audio.limitMinutes}m`
                : `Gravação de áudio inicia na pergunta ${audio.startCode || 'P01'}`
            }
            aria-label={
              audio.recording
                ? `Gravando áudio ${formatAudioDuration(audio.seconds)} de ${audio.limitMinutes} minutos`
                : `Gravação de áudio inicia na pergunta ${audio.startCode || 'P01'}`
            }
          >
            {audio.recording ? (
              <>
                <span className="mp-audio-dot" aria-hidden="true" />
                <Mic size={13} />
                <span className="mp-audio-mini-time">
                  {formatAudioDuration(audio.seconds)}
                </span>
              </>
            ) : (
              <>
                <Clock size={13} />
                <span className="mp-audio-mini-time">{audio.startCode || 'P01'}</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="mp-header-top">
        {survey.logoImage ? (
          <div className="mp-logo">
            <img src={survey.logoImage} alt={survey.institutionName || 'Logo da instituição'} />
          </div>
        ) : (
          <div className="mp-logo" aria-hidden="true">
            <Building2 size={22} />
          </div>
        )}

        <div className="mp-header-titles">
          {survey.institutionName && (
            <div className="mp-institution">{survey.institutionName}</div>
          )}
          <div className="mp-survey-name">{survey.nome}</div>
          {survey.descricao && <div className="mp-survey-desc">{survey.descricao}</div>}
        </div>

        <div className="mp-header-tools">
          <button
            type="button"
            className="mp-tool-btn"
            aria-pressed={highContrast}
            aria-label="Alternar alto contraste"
            title="Alto contraste"
            onClick={onToggleHighContrast}
          >
            <Contrast size={16} />
          </button>
          <button
            type="button"
            className="mp-tool-btn"
            aria-pressed={largeFont}
            aria-label="Alternar fonte ampliada"
            title="Fonte ampliada"
            onClick={onToggleLargeFont}
          >
            <Type size={16} />
          </button>
        </div>
      </div>

      <div className="mp-progress-wrap">
        {showIndicator && (
          <QuestionIndicator
            current={current}
            total={total}
            percent={percent}
            showPercent={showPercent}
          />
        )}
        <ProgressBar percent={percent} />
      </div>
    </header>
  );
};
