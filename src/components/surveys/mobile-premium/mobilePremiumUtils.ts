// ============================================================================
// Utilitários de resolução visual — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Converte a configuração (opcional) salva no wizard em valores concretos de
// renderização, sempre com fallbacks seguros. Nenhuma função altera o estado
// da pesquisa: são apenas leituras.
// ============================================================================

import type {
  AnswerVisualType,
  Question,
  QuestionAppearanceType,
  QuestionOption,
  Survey,
  VisualScaleType,
} from '../../../types';
import { getIconById, type SurveyIcon } from './iconLibrary';
import { buildEmojiScale, getSmileById, type SmileItem } from './smileLibrary';
import { getGalleryImageById } from './imageLibrary';

// ------------------------------- Tema GIDE --------------------------------
export const GIDE_THEME = {
  primary: '#2b66b0',
  primaryDark: '#1d4f8f',
  primaryLight: '#e7f0fa',
  secondary: '#047857',
  surface: '#ffffff',
  background: '#f4f7fb',
  text: '#0f172a',
  textMuted: '#5b6b82',
  border: '#dbe4f0',
};

export function getTheme(survey: Survey) {
  return {
    ...GIDE_THEME,
    primary: survey.themeAccent || GIDE_THEME.primary,
    secondary: survey.themeSecondary || GIDE_THEME.secondary,
    primaryDark: survey.themeAccent
      ? shade(survey.themeAccent, -18)
      : GIDE_THEME.primaryDark,
  };
}

/** Escurece (amount negativo) ou clareia (positivo) um hex. */
export function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ------------------------ Tipos de pergunta com texto ----------------------
export function isTextualQuestion(q: Question): boolean {
  return q.tipo === 'texto_aberto';
}

export function isDateTimeQuestion(q: Question): boolean {
  return q.tipo === 'data_hora';
}

// --------------------------- Aparência do enunciado ------------------------
export function resolveAppearance(q: Question): QuestionAppearanceType {
  const cfg = q.visual;
  if (cfg?.appearanceType) return cfg.appearanceType;
  if (cfg?.imageUrl || q.questionImage) return 'TEXTO_IMAGEM';
  if (cfg?.emoji || q.questionEmoji) return 'TEXTO_EMOJI';
  if (cfg?.iconId || q.questionIcon) return 'TEXTO_ICONE';
  if (cfg?.badge) return 'TEXTO_BADGE';
  if (cfg?.accentColor || q.cardColor) return 'TEXTO_COR';
  return 'TEXTO';
}

export function resolveQuestionIcon(q: Question): SurveyIcon | undefined {
  return getIconById(q.visual?.iconId || q.questionIcon);
}

export function resolveQuestionEmoji(q: Question): string | undefined {
  return q.visual?.emoji || q.questionEmoji;
}

export function resolveQuestionImage(q: Question): string | undefined {
  const raw = q.visual?.imageUrl || q.questionImage;
  if (!raw) return undefined;
  return resolveImageUrl(raw);
}

/** Aceita id da galeria ('merenda-1') ou URL/data URI. */
export function resolveImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('data:') || raw.startsWith('http') || raw.startsWith('/')) return raw;
  const img = getGalleryImageById(raw);
  return img?.url || raw;
}

// --------------------------- Tipo visual da resposta -----------------------
export function resolveAnswerVisualType(q: Question): AnswerVisualType {
  if (q.visual?.answerVisualType) return q.visual.answerVisualType;
  if (q.answerVisualType) return q.answerVisualType;
  if (q.tipo === 'nps' || q.tipo === 'escala_numerica') return 'ESCALA_VISUAL';
  const opts = q.opcoes || [];
  if (opts.some((o) => o.smileId)) return 'SMILEYS';
  if (opts.some((o) => o.imageUrl)) return 'IMAGEM';
  if (opts.some((o) => o.emoji)) return 'EMOJI';
  if (opts.some((o) => o.iconId)) return 'ICONES';
  return 'CARDS';
}

// ------------------------------- Escala visual -----------------------------
export interface ResolvedScaleStep {
  value: string;
  label: string;
  score: number;
  emoji?: string;
  color?: string;
}

export interface ResolvedScale {
  type: VisualScaleType;
  steps: number;
  allowHalf: boolean;
  horizontal: boolean;
  minLabel: string;
  maxLabel: string;
  items: ResolvedScaleStep[];
}

const DEFAULT_CIRCLE_COLORS = ['#dc2626', '#f97316', '#eab308', '#84cc16', '#16a34a'];
const EXTENDED_CIRCLE_COLORS = ['#b91c1c', '#dc2626', '#f97316', '#eab308', '#84cc16', '#16a34a', '#15803d', '#065f46', '#047857', '#022c22'];

export function resolveScale(q: Question): ResolvedScale {
  const cfg = q.visual;
  let type: VisualScaleType = cfg?.scaleType || 'estrelas';
  let steps = cfg?.scaleSteps;

  if (!steps) {
    if (q.tipo === 'nps') steps = 11;
    else if (q.tipo === 'escala_numerica') {
      steps = Math.max(2, (q.escalaMax ?? 5) - (q.escalaMin ?? 1) + 1);
    } else steps = 5;
  }
  steps = Math.max(2, Math.min(20, steps));

  const min = q.tipo === 'nps' ? 0 : q.escalaMin ?? 1;
  const minLabel = cfg?.scaleMinLabel || q.escalaMinLabel || (min === 0 ? 'Jamais' : `Nível ${min}`);
  const maxLabel = cfg?.scaleMaxLabel || q.escalaMaxLabel || `Nível ${min + steps - 1}`;

  if (type === 'emojis') {
    const smiles = buildEmojiScale(steps);
    return {
      type,
      steps: smiles.length,
      allowHalf: false,
      horizontal: true,
      minLabel: cfg?.scaleMinLabel || smiles[smiles.length - 1]?.label || minLabel,
      maxLabel: cfg?.scaleMaxLabel || smiles[0]?.label || maxLabel,
      items: smiles.map((s: SmileItem) => ({
        value: s.value,
        label: s.label,
        score: s.score ?? 0,
        emoji: s.emoji,
      })),
    };
  }

  if (type === 'circulos') {
    const palette = cfg?.scaleColors?.length ? cfg.scaleColors : (steps <= 5 ? DEFAULT_CIRCLE_COLORS : EXTENDED_CIRCLE_COLORS);
    const items: ResolvedScaleStep[] = Array.from({ length: steps }).map((_, i) => ({
      value: String(min + i),
      label: String(min + i),
      score: min + i,
      color: palette[i % palette.length],
    }));
    return { type, steps, allowHalf: false, horizontal: true, minLabel, maxLabel, items };
  }

  if (type === 'termometro') {
    const items: ResolvedScaleStep[] = Array.from({ length: steps }).map((_, i) => ({
      value: String(min + i),
      label: String(min + i),
      score: min + i,
    }));
    return {
      type,
      steps,
      allowHalf: false,
      horizontal: !!cfg?.scaleHorizontal,
      minLabel: cfg?.scaleMinLabel || (q.tipo === 'nps' ? 'Muito insatisfeito' : minLabel),
      maxLabel: cfg?.scaleMaxLabel || (q.tipo === 'nps' ? 'Muito satisfeito' : maxLabel),
      items,
    };
  }

  // estrelas / corações / polegares
  const items: ResolvedScaleStep[] = Array.from({ length: steps }).map((_, i) => ({
    value: String(min + i),
    label: String(min + i),
    score: min + i,
    emoji: type === 'coracoes' ? '❤️' : type === 'polegares' ? '👍' : '⭐',
  }));
  return {
    type,
    steps,
    allowHalf: !!cfg?.scaleAllowHalf && type === 'estrelas',
    horizontal: true,
    minLabel,
    maxLabel,
    items,
  };
}

// ------------------------- Alternativas com visual -------------------------
export interface ResolvedOption {
  option: QuestionOption;
  icon?: SurveyIcon;
  emoji?: string;
  imageUrl?: string;
  smile?: SmileItem;
  description?: string;
  color?: string;
  badge?: string;
}

export function resolveOptions(q: Question): ResolvedOption[] {
  return (q.opcoes || []).map((option) => {
    const icon = getIconById(option.iconId);
    const smile = getSmileById(option.smileId);
    return {
      option,
      icon,
      emoji: option.emoji || smile?.emoji,
      imageUrl: resolveImageUrl(option.imageUrl),
      smile,
      description: option.description,
      color: option.color,
      badge: option.badge,
    };
  });
}

// --------------------------- Cores do card/pergunta ------------------------
export function resolveCardColors(q: Question, theme: { primary: string; secondary: string }) {
  const cfg = q.visual;
  return {
    cardColor: q.cardColor || cfg?.cardColor,
    iconColor: q.iconColor || cfg?.iconColor,
    selectionColor: cfg?.selectionColor || theme.primary,
    buttonColor: cfg?.buttonColor || theme.primary,
    borderColor: cfg?.borderColor,
    borderRadius: cfg?.borderRadius,
    shadow: cfg?.shadow,
    gradient: cfg?.gradient,
    backgroundImage: cfg?.backgroundImage,
  };
}

export function resolveCommentConfig(q: Question): { enabled: boolean; maxLength: number } {
  return {
    enabled: !!q.visual?.commentEnabled,
    maxLength: q.visual?.commentMaxLength || 500,
  };
}
