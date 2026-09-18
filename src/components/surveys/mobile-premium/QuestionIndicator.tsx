import React from 'react';

interface QuestionIndicatorProps {
  current: number;
  total: number;
  percent: number;
  showPercent?: boolean;
}

/**
 * Indicador "Pergunta X de Y" (+ percentual). Usado no cabeçalho e como
 * elemento acessível (aria-live) para leitores de tela.
 */
export const QuestionIndicator: React.FC<QuestionIndicatorProps> = ({
  current,
  total,
  percent,
  showPercent = true,
}) => {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(1, Math.min(current, safeTotal));
  return (
    <div className="mp-progress-meta" aria-live="polite">
      <span>
        Pergunta {safeCurrent} de {safeTotal}
      </span>
      {showPercent && <span>{Math.round(percent)}% concluído</span>}
    </div>
  );
};
