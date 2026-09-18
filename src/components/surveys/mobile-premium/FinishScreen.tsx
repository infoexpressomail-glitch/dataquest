import React from 'react';
import { CheckCircle2, RotateCcw, WifiOff } from 'lucide-react';
import type { Survey } from '../../../types';
import { resolveImageUrl } from './mobilePremiumUtils';

interface FinishScreenProps {
  survey: Survey;
  theme: { primary: string; secondary: string };
  wasSavedOffline?: boolean;
  onRestart: () => void;
}

/**
 * Tela final do modelo Mobile Premium: mensagem personalizada, imagem,
 * QR Code opcional e mensagem institucional (ex: Prefeitura).
 */
export const FinishScreen: React.FC<FinishScreenProps> = ({
  survey,
  theme,
  wasSavedOffline,
  onRestart,
}) => {
  const finish = resolveImageUrl(survey.finishImage);
  return (
    <section className="mp-finish mp-anim-scale" aria-label="Conclusão da pesquisa">
      {finish && (
        <div className="mp-finish-media">
          <img src={finish} alt="" />
        </div>
      )}

      <div className="mp-finish-body">
        <div className="mp-finish-icon" style={wasSavedOffline ? { color: '#d97706', background: '#fef3c7' } : undefined}>
          {wasSavedOffline ? <WifiOff size={44} /> : <CheckCircle2 size={44} />}
        </div>

        <h2 className="mp-cover-title" style={{ fontSize: 22 }}>
          {wasSavedOffline ? 'Respostas salvas neste dispositivo' : 'Obrigado por participar!'}
        </h2>

        <p className="mp-cover-desc">
          {survey.finishMessage ||
            'Sua opinião é fundamental para melhorarmos os serviços públicos da nossa cidade.'}
        </p>

        {wasSavedOffline && (
          <p className="mp-cover-desc" style={{ color: '#b45309', fontWeight: 600 }}>
            Sem conexão no momento: a coleta foi guardada com segurança e será enviada automaticamente quando a internet voltar.
          </p>
        )}

        {survey.qrCodeUrl && (
          <img className="mp-qr" src={survey.qrCodeUrl} alt="QR Code da pesquisa" />
        )}

        {survey.prefeituraMessage && (
          <div className="mp-institution-msg" style={{ background: `${theme.primary}14`, color: theme.primary }}>
            {survey.prefeituraMessage}
          </div>
        )}

        <button
          type="button"
          className="mp-btn mp-btn-ghost"
          style={{ marginTop: 22, width: '100%' }}
          onClick={onRestart}
        >
          <RotateCcw size={17} />
          <span>Realizar nova coleta</span>
        </button>
      </div>
    </section>
  );
};
