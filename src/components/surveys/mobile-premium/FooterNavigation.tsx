import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';

interface FooterNavigationProps {
  canGoBack: boolean;
  isLast: boolean;
  saving?: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  nextLabel?: string;
  finishLabel?: string;
}

/**
 * Rodapé fixo do modelo Mobile Premium com os botões Voltar, Próxima e
 * Finalizar. Sempre ancorado na parte inferior da tela.
 */
export const FooterNavigation: React.FC<FooterNavigationProps> = ({
  canGoBack,
  isLast,
  saving,
  onBack,
  onNext,
  onFinish,
  nextLabel = 'Próxima',
  finishLabel = 'Finalizar',
}) => {
  return (
    <div className="mp-footer">
      <nav className="mp-footer-inner" aria-label="Navegação da pesquisa">
        <button
          type="button"
          className="mp-btn mp-btn-ghost"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Voltar para a pergunta anterior"
        >
          <ArrowLeft size={17} />
          <span>Voltar</span>
        </button>

        {isLast ? (
          <button
            type="button"
            className="mp-btn mp-btn-success"
            onClick={onFinish}
            disabled={saving}
            aria-label="Finalizar pesquisa"
          >
            {saving ? <Send size={17} /> : <CheckCircle2 size={17} />}
            <span>{saving ? 'Gravando...' : finishLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            className="mp-btn mp-btn-primary"
            onClick={onNext}
            aria-label="Avançar para a próxima pergunta"
          >
            <span>{nextLabel}</span>
            <ArrowRight size={17} />
          </button>
        )}
      </nav>
    </div>
  );
};
