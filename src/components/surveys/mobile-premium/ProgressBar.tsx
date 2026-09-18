import React from 'react';

interface ProgressBarProps {
  /** Percentual concluído (0-100). */
  percent: number;
  /** Rótulo esquerdo opcional. */
  label?: string;
  /** Rótulo direito opcional (ex: '35% concluído'). */
  valueLabel?: string;
}

/**
 * Barra de progresso do modelo Mobile Premium. Apenas apresentação: recebe o
 * percentual já calculado e anima a largura via CSS.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ percent, label, valueLabel }) => {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="mp-progress-wrap">
      {(label || valueLabel) && (
        <div className="mp-progress-meta">
          <span>{label}</span>
          <span>{valueLabel}</span>
        </div>
      )}
      <div
        className="mp-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
        aria-label={label || 'Progresso da pesquisa'}
      >
        <div className="mp-progress-fill" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
};
