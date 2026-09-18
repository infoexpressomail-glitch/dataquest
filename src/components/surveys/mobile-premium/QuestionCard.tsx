import React from 'react';
import { CalendarClock, MessageSquareText } from 'lucide-react';
import type { Question } from '../../../types';
import { AnswerGallery } from './AnswerGallery';
import {
  resolveAppearance,
  resolveCommentConfig,
  resolveQuestionEmoji,
  resolveQuestionIcon,
  resolveQuestionImage,
} from './mobilePremiumUtils';

interface QuestionCardProps {
  question: Question;
  value: any;
  comment?: string;
  theme: { primary: string; secondary: string };
  disabled?: boolean;
  onAnswer: (value: any) => void;
  onComment: (text: string) => void;
}

/**
 * QuestionCard — card da pergunta no modelo Mobile Premium. Suporta todas as
 * aparências de enunciado (texto, ícone, smile, emoji, imagem, cor, badge e
 * foto), todos os tipos visuais de resposta e o comentário opcional com
 * contador de caracteres.
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  comment,
  theme,
  disabled,
  onAnswer,
  onComment,
}) => {
  const appearance = resolveAppearance(question);
  const icon = resolveQuestionIcon(question);
  const emoji = resolveQuestionEmoji(question);
  const image = resolveQuestionImage(question);
  const cfg = question.visual;
  const commentCfg = resolveCommentConfig(question);

  const accent = cfg?.accentColor || question.cardColor || theme.primary;

  const renderEnunciadoMedia = () => {
    if (appearance === 'TEXTO_IMAGEM' || appearance === 'TEXTO_FOTO') {
      if (!image) return null;
      return (
        <div className="mp-question-media">
          <img src={image} alt="" />
        </div>
      );
    }
    if (appearance === 'TEXTO_ICONE' && icon) {
      const Icon = icon.icone;
      return (
        <div
          className="mp-question-icon-badge"
          style={{ background: `${icon.corPadrao}1f`, color: icon.corPadrao }}
        >
          <Icon size={30} />
        </div>
      );
    }
    if ((appearance === 'TEXTO_SMILE' || appearance === 'TEXTO_EMOJI') && emoji) {
      return (
        <div className="mp-question-emoji" aria-hidden="true">
          {emoji}
        </div>
      );
    }
    return null;
  };

  const isTextual = question.tipo === 'texto_aberto';
  const isDateTime = question.tipo === 'data_hora';

  return (
    <article
      className="mp-card mp-anim-slide"
      aria-labelledby={`mp-q-${question.id}`}
      style={cfg?.backgroundImage ? { backgroundImage: `url(${cfg.backgroundImage})`, backgroundSize: 'cover' } : undefined}
    >
      <span className="mp-question-label">
        {question.codigo}
        {question.obrigatoria && <span aria-hidden="true">• Obrigatória</span>}
      </span>

      {cfg?.badge && (
        <div className="mp-badge" style={{ background: cfg.badgeColor || theme.secondary }}>
          {cfg.badge}
        </div>
      )}

      {renderEnunciadoMedia()}

      <h2
        id={`mp-q-${question.id}`}
        className="mp-question-title"
        style={appearance === 'TEXTO_COR' ? { color: accent } : undefined}
      >
        {question.enunciado}
        {question.obrigatoria && <span className="mp-question-required">*</span>}
      </h2>

      {isTextual && (
        <div className="mp-answers">
          <textarea
            className="mp-textarea"
            rows={4}
            value={value || ''}
            disabled={disabled}
            placeholder="Digite a resposta do entrevistado..."
            onChange={(e) => onAnswer(e.target.value)}
            aria-label={question.enunciado}
          />
        </div>
      )}

      {isDateTime && (
        <div className="mp-answers">
          <label className="mp-option" style={{ cursor: 'default' }}>
            <span className="mp-option-icon" style={{ background: `${theme.primary}1a`, color: theme.primary }}>
              <CalendarClock size={22} />
            </span>
            <input
              type="datetime-local"
              value={value || ''}
              disabled={disabled}
              onChange={(e) => onAnswer(e.target.value)}
              className="mp-textarea"
              style={{ border: 'none', padding: 0 }}
              aria-label={question.enunciado}
            />
          </label>
        </div>
      )}

      {!isTextual && !isDateTime && (
        <AnswerGallery
          question={question}
          value={value}
          theme={theme}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      )}

      {commentCfg.enabled && (
        <div className="mp-comment-wrap">
          <div className="mp-comment-head">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MessageSquareText size={15} />
              Comentário (opcional)
            </span>
            <span className="mp-counter">
              {(comment || '').length}/{commentCfg.maxLength}
            </span>
          </div>
          <textarea
            className="mp-textarea"
            rows={3}
            maxLength={commentCfg.maxLength}
            value={comment || ''}
            disabled={disabled}
            placeholder="Se desejar, deixe um comentário..."
            onChange={(e) => onComment(e.target.value)}
            aria-label="Comentário opcional"
          />
        </div>
      )}
    </article>
  );
};
