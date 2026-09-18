import React, { useCallback, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { Question } from '../../../types';
import {
  resolveAnswerVisualType,
  resolveOptions,
  resolveScale,
  type ResolvedOption,
  type ResolvedScale,
} from './mobilePremiumUtils';

interface AnswerGalleryProps {
  question: Question;
  value: any;
  theme: { primary: string; secondary: string };
  /** Recebe o valor final da resposta (string, número ou array). */
  onAnswer: (value: any) => void;
  /** Desabilita microinterações quando a pesquisa foi finalizada. */
  disabled?: boolean;
}

/** Cria a microinteração de ripple em elementos clicáveis. */
function useRipple() {
  return useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const span = document.createElement('span');
    span.className = 'mp-ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${event.clientX - rect.left - size / 2}px`;
    span.style.top = `${event.clientY - rect.top - size / 2}px`;
    target.appendChild(span);
    window.setTimeout(() => span.remove(), 520);
  }, []);
}

function optionVisual(opt: ResolvedOption, selected: boolean, theme: { primary: string }) {
  if (opt.imageUrl) return <img className="mp-option-thumb" src={opt.imageUrl} alt="" aria-hidden="true" />;
  if (opt.icon) {
    const Icon = opt.icon.icone;
    return (
      <span
        className="mp-option-icon"
        style={{
          background: `${selected ? opt.icon.corAtiva : opt.icon.corPadrao}1a`,
          color: selected ? opt.icon.corAtiva : opt.icon.corPadrao,
        }}
      >
        <Icon size={24} />
      </span>
    );
  }
  if (opt.emoji) return <span className="mp-option-emoji" aria-hidden="true">{opt.emoji}</span>;
  return (
    <span
      className="mp-option-icon"
      style={{ background: `${selected ? theme.primary : '#64748b'}1a` }}
      aria-hidden="true"
    />
  );
}

/** Renderização das alternativas por tipo visual. */
const GalleryOptions: React.FC<{
  visual: ReturnType<typeof resolveAnswerVisualType>;
  options: ResolvedOption[];
  multiple: boolean;
  value: any;
  theme: { primary: string; secondary: string };
  onAnswer: (value: any) => void;
  disabled?: boolean;
}> = ({ visual, options, multiple, value, theme, onAnswer, disabled }) => {
  const ripple = useRipple();
  const selectedList: string[] = Array.isArray(value) ? value : [];

  const isSelected = (v: string) => (multiple ? selectedList.includes(v) : String(value) === v);

  const handleClick = (e: React.MouseEvent<HTMLElement>, optionValue: string) => {
    if (disabled) return;
    ripple(e);
    if (multiple) {
      const next = selectedList.includes(optionValue)
        ? selectedList.filter((v) => v !== optionValue)
        : [...selectedList, optionValue];
      onAnswer(next);
    } else {
      onAnswer(optionValue);
    }
  };

  const gridClass =
    visual === 'ICONES'
      ? 'mp-answers mp-grid mp-grid-3'
      : visual === 'IMAGEM'
      ? 'mp-answers mp-grid'
      : visual === 'SMILEYS' || visual === 'EMOJI'
      ? 'mp-answers mp-grid'
      : 'mp-answers';

  return (
    <div
      className={gridClass}
      role={multiple ? 'group' : 'radiogroup'}
      aria-label="Alternativas de resposta"
    >
      {options.map((opt) => {
        const selected = isSelected(opt.option.value);
        const isSmile = visual === 'SMILEYS' || (visual === 'EMOJI' && !!opt.emoji && !opt.label);
        if (visual === 'SMILEYS' || (visual === 'EMOJI' && (opt.smile || opt.emoji))) {
          return (
            <button
              key={opt.option.id}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={selected}
              aria-label={opt.option.label}
              disabled={disabled}
              onClick={(e) => handleClick(e, opt.option.value)}
              className={`mp-option mp-smile-option ${selected ? 'selected' : ''}`}
            >
              <span className="mp-smile-emoji" aria-hidden="true">
                {opt.emoji || '🙂'}
              </span>
              <span className="mp-option-label">{opt.option.label}</span>
              {opt.description && <span className="mp-option-desc">{opt.description}</span>}
            </button>
          );
        }

        return (
          <button
            key={opt.option.id}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            aria-label={opt.option.label}
            disabled={disabled}
            onClick={(e) => handleClick(e, opt.option.value)}
            className={`mp-option ${selected ? 'selected' : ''}`}
            style={
              selected
                ? { borderColor: theme.primary, background: `${theme.primary}12` }
                : undefined
            }
          >
            {opt.badge && (
              <span className="mp-option-badge" style={{ background: opt.color || theme.primary }}>
                {opt.badge}
              </span>
            )}
            {optionVisual(opt, selected, theme)}
            <span className="mp-option-body">
              <span className="mp-option-label">{opt.option.label}</span>
              {opt.description && <span className="mp-option-desc">{opt.description}</span>}
            </span>
            <span className="mp-option-check" aria-hidden="true">
              {selected && <Check size={16} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** Renderização das escalas visuais (smiles, estrelas, corações, círculos, termômetro). */
const GalleryScale: React.FC<{
  scale: ResolvedScale;
  value: any;
  theme: { primary: string };
  onAnswer: (value: any) => void;
  disabled?: boolean;
}> = ({ scale, value, theme, onAnswer, disabled }) => {
  const [hoverHalf, setHoverHalf] = useState<number | null>(null);
  const numeric = value === undefined || value === null || value === '' ? NaN : Number(value);

  const handleHalf = (e: React.MouseEvent<HTMLButtonElement>, stepValue: number) => {
    if (!scale.allowHalf) {
      onAnswer(String(stepValue));
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    const final = isHalf ? stepValue - 0.5 : stepValue;
    onAnswer(String(final));
  };

  if (scale.type === 'termometro' && !scale.horizontal) {
    return (
      <div className="mp-scale mp-thermo">
        <div className="mp-thermo-vertical">
          {scale.items.map((item) => {
            const on = numeric >= item.score;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={String(value) === item.value}
                aria-label={`Nível ${item.label}`}
                disabled={disabled}
                className={`mp-scale-item ${on ? 'on' : ''}`}
                onClick={() => onAnswer(item.value)}
                title={item.label}
              >
                <span
                  className="mp-thermo-bar"
                  style={{
                    height: `${30 + (item.score / scale.steps) * 70}%`,
                    background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}66)`,
                  }}
                />
                <span className="mp-scale-num">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mp-scale-legend">
          <span>{scale.minLabel}</span>
          <span>{scale.maxLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-scale">
      <div className="mp-scale-row" role="radiogroup" aria-label="Escala de avaliação">
        {scale.items.map((item) => {
          const on = !Number.isNaN(numeric) && numeric >= item.score;
          const isExact = String(value) === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={isExact}
              aria-label={item.emoji ? `${item.label}` : `Nota ${item.label}`}
              disabled={disabled}
              className={`mp-scale-item ${on ? 'on' : ''}`}
              onClick={(e) => (scale.type === 'estrelas' ? handleHalf(e, item.score) : onAnswer(item.value))}
              onMouseEnter={() => scale.type === 'estrelas' && setHoverHalf(null)}
              title={item.label}
            >
              {item.color ? (
                <span className="mp-scale-circle" style={{ background: item.color }} />
              ) : (
                <span
                  className="mp-scale-emoji"
                  aria-hidden="true"
                  style={isExact ? { transform: 'scale(1.18)' } : undefined}
                >
                  {item.emoji || '⭐'}
                </span>
              )}
              {scale.type !== 'emojis' && scale.type !== 'estrelas' && scale.type !== 'coracoes' && scale.type !== 'polegares' && (
                <span className="mp-scale-num">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mp-scale-legend">
        <span>{scale.minLabel}</span>
        <span>{scale.maxLabel}</span>
      </div>
    </div>
  );
};

/**
 * AnswerGallery — decide como renderizar cada resposta do modelo Mobile
 * Premium, cobrindo os sete tipos: lista tradicional, cards, ícones, smileys,
 * imagem, emoji e escala visual.
 */
export const AnswerGallery: React.FC<AnswerGalleryProps> = ({
  question,
  value,
  theme,
  onAnswer,
  disabled,
}) => {
  const visual = resolveAnswerVisualType(question);
  const multiple = question.tipo === 'multipla_selecao';

  if (visual === 'ESCALA_VISUAL') {
    return (
      <GalleryScale
        scale={resolveScale(question)}
        value={value}
        theme={theme}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    );
  }

  return (
    <GalleryOptions
      visual={visual}
      options={resolveOptions(question)}
      multiple={multiple}
      value={value}
      theme={theme}
      onAnswer={onAnswer}
      disabled={disabled}
    />
  );
};
