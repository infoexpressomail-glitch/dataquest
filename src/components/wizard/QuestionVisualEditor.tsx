import React, { useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  MessageSquareText,
  Palette,
  Smile,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import type {
  AnswerVisualType,
  Question,
  QuestionAppearanceType,
  VisualScaleType,
} from '../../types';
import { getIconById, VISUAL_COLOR_PALETTE } from '../surveys/mobile-premium/iconLibrary';
import { getSmileById } from '../surveys/mobile-premium/smileLibrary';
import { VisualGalleryModal, type GalleryMode } from './VisualGalleryModal';

interface QuestionVisualEditorProps {
  question: Question;
  onChange: (updated: Question) => void;
}

const APPEARANCES: { id: QuestionAppearanceType; label: string }[] = [
  { id: 'TEXTO', label: 'Texto apenas' },
  { id: 'TEXTO_ICONE', label: 'Texto + Ícone' },
  { id: 'TEXTO_SMILE', label: 'Texto + Smile' },
  { id: 'TEXTO_EMOJI', label: 'Texto + Emoji' },
  { id: 'TEXTO_IMAGEM', label: 'Texto + Imagem' },
  { id: 'TEXTO_COR', label: 'Texto + Cor' },
  { id: 'TEXTO_BADGE', label: 'Texto + Badge' },
  { id: 'TEXTO_FOTO', label: 'Texto + Foto' },
];

const ANSWER_TYPES: { id: AnswerVisualType; label: string }[] = [
  { id: 'CARDS', label: 'Cards (Tipo 2)' },
  { id: 'TEXTO', label: 'Lista tradicional (Tipo 1)' },
  { id: 'ICONES', label: 'Ícones (Tipo 3)' },
  { id: 'SMILEYS', label: 'Smileys (Tipo 4)' },
  { id: 'IMAGEM', label: 'Imagem (Tipo 5)' },
  { id: 'EMOJI', label: 'Emoji (Tipo 6)' },
  { id: 'ESCALA_VISUAL', label: 'Escala visual (Tipo 7)' },
];

const SCALE_TYPES: { id: VisualScaleType; label: string }[] = [
  { id: 'emojis', label: 'Emojis (muito feliz → muito triste)' },
  { id: 'estrelas', label: 'Estrelas' },
  { id: 'coracoes', label: 'Corações' },
  { id: 'polegares', label: 'Polegares' },
  { id: 'circulos', label: 'Círculos coloridos' },
  { id: 'termometro', label: 'Termômetro' },
];

/**
 * Editor de aparência visual de uma pergunta (usado na aba Perguntas do
 * Wizard). Permite escolher a aparência do enunciado, o tipo visual das
 * respostas, escalas e o visual de cada alternativa (ícone/emoji/imagem).
 */
export const QuestionVisualEditor: React.FC<QuestionVisualEditorProps> = ({ question, onChange }) => {
  const [gallery, setGallery] = useState<{ mode: GalleryMode; optionIndex?: number } | null>(null);
  const visual = question.visual || {};

  const patch = (partial: Partial<Question['visual']>, root?: Partial<Question>) => {
    onChange({ ...question, ...(root || {}), visual: { ...visual, ...partial } });
  };

  const setOptionVisual = (index: number, patchOption: Partial<Question['opcoes'][number]>) => {
    const opcoes = [...(question.opcoes || [])];
    opcoes[index] = { ...opcoes[index], ...patchOption };
    onChange({ ...question, opcoes });
  };

  const selectedIcon = getIconById(visual.iconId);

  return (
    <div className="mt-3 rounded-xl border border-ui bg-surface p-3.5 space-y-3">
      <div className="flex items-center gap-2 border-b border-ui pb-2">
        <Palette size={15} className="text-accent-primary" />
        <span className="text-xs font-bold text-primary">Aparência Visual (Mobile Premium)</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-bold text-secondary">Aparência do enunciado</label>
          <select
            value={visual.appearanceType || 'TEXTO'}
            onChange={(e) => patch({ appearanceType: e.target.value as QuestionAppearanceType })}
            className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-1.5 text-xs text-primary focus:outline-none"
          >
            {APPEARANCES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-secondary">Estilo das respostas</label>
          <select
            value={visual.answerVisualType || question.answerVisualType || 'CARDS'}
            onChange={(e) =>
              onChange({ ...question, answerVisualType: e.target.value as AnswerVisualType, visual: { ...visual, answerVisualType: e.target.value as AnswerVisualType } })
            }
            className="mt-1 w-full rounded-lg border border-ui bg-surface-card px-2.5 py-1.5 text-xs text-primary focus:outline-none"
          >
            {ANSWER_TYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Escala visual */}
      {(visual.answerVisualType === 'ESCALA_VISUAL' || question.answerVisualType === 'ESCALA_VISUAL' || question.tipo === 'nps' || question.tipo === 'escala_numerica') && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-ui bg-surface-card p-3 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-bold text-secondary">Tipo de escala</label>
            <select
              value={visual.scaleType || 'estrelas'}
              onChange={(e) => patch({ scaleType: e.target.value as VisualScaleType })}
              className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-1.5 text-xs text-primary focus:outline-none"
            >
              {SCALE_TYPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-secondary">Níveis</label>
            <select
              value={visual.scaleSteps || (question.tipo === 'nps' ? 11 : 5)}
              onChange={(e) => patch({ scaleSteps: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-ui bg-surface px-2.5 py-1.5 text-xs text-primary focus:outline-none"
            >
              {[3, 4, 5, 6, 7, 10, 11].map((n) => (
                <option key={n} value={n}>
                  {n} níveis
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-1 text-[11px] font-medium text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={!!visual.scaleAllowHalf}
              onChange={(e) => patch({ scaleAllowHalf: e.target.checked })}
              className="rounded text-accent-primary-solid focus:ring-brand-500"
            />
            Permitir meia estrela
          </label>
        </div>
      )}

      {/* Elementos do enunciado */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-ui bg-surface-card p-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
            <Sparkles size={12} /> Ícone do enunciado
          </span>
          <div className="mt-2 flex items-center gap-2">
            {selectedIcon ? (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${selectedIcon.corPadrao}1f`, color: selectedIcon.corPadrao }}
              >
                <selectedIcon.icone size={18} />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-muted">
                <Sparkles size={16} />
              </span>
            )}
            <button
              type="button"
              onClick={() => setGallery({ mode: 'icons' })}
              className="rounded-md border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-surface-hover"
            >
              Escolher
            </button>
            {visual.iconId && (
              <button type="button" onClick={() => patch({ iconId: undefined })} className="text-muted hover:text-accent-danger">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-ui bg-surface-card p-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
            <Smile size={12} /> Emoji do enunciado
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-lg">
              {visual.emoji || '🙂'}
            </span>
            <button
              type="button"
              onClick={() => setGallery({ mode: 'smiles' })}
              className="rounded-md border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-surface-hover"
            >
              Escolher
            </button>
            {visual.emoji && (
              <button type="button" onClick={() => patch({ emoji: undefined })} className="text-muted hover:text-accent-danger">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-ui bg-surface-card p-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
            <ImageIcon size={12} /> Imagem do enunciado
          </span>
          <div className="mt-2 flex items-center gap-2">
            {visual.imageUrl ? (
              <img src={visual.imageUrl} alt="" className="h-9 w-12 rounded-lg border border-ui object-cover" />
            ) : (
              <span className="flex h-9 w-12 items-center justify-center rounded-lg bg-surface-raised text-muted">
                <ImageIcon size={15} />
              </span>
            )}
            <button
              type="button"
              onClick={() => setGallery({ mode: 'images' })}
              className="rounded-md border border-ui bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-surface-hover"
            >
              Escolher
            </button>
            {visual.imageUrl && (
              <button type="button" onClick={() => patch({ imageUrl: undefined })} className="text-muted hover:text-accent-danger">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-ui bg-surface-card p-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
            <Type size={12} /> Badge + cor
          </span>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={visual.badge || ''}
              onChange={(e) => patch({ badge: e.target.value })}
              placeholder="Ex: NOVO"
              className="w-full rounded-md border border-ui bg-surface px-2 py-1 text-[11px] text-primary focus:outline-none"
            />
            <input
              type="color"
              value={visual.badgeColor || '#16a34a'}
              onChange={(e) => patch({ badgeColor: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border border-ui"
            />
          </div>
        </div>
      </div>

      {/* Cor de destaque e comentário */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-secondary">Cor de destaque:</span>
          {VISUAL_COLOR_PALETTE.slice(0, 10).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => patch({ accentColor: c })}
              className={`h-5 w-5 rounded-full border ${visual.accentColor === c ? 'ring-2 ring-brand-500' : 'border-ui'}`}
              style={{ background: c }}
              title={c}
            />
          ))}
          {(visual.accentColor || question.cardColor) && (
            <button
              type="button"
              onClick={() => {
                patch({ accentColor: undefined });
                onChange({ ...question, cardColor: undefined, visual: { ...visual, accentColor: undefined } });
              }}
              className="text-muted hover:text-accent-danger"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-[11px] font-medium text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!visual.commentEnabled}
            onChange={(e) => patch({ commentEnabled: e.target.checked })}
            className="rounded text-accent-primary-solid focus:ring-brand-500"
          />
          <MessageSquareText size={12} /> Comentário opcional
        </label>
        {visual.commentEnabled && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            Limite:
            <input
              type="number"
              min={50}
              max={2000}
              value={visual.commentMaxLength || 500}
              onChange={(e) => patch({ commentMaxLength: Number(e.target.value) })}
              className="w-20 rounded-md border border-ui bg-surface px-2 py-0.5 text-[11px] text-primary focus:outline-none"
            />
          </span>
        )}
      </div>

      {/* Visual por alternativa */}
      {question.opcoes && question.opcoes.length > 0 && (
        <div className="rounded-lg border border-ui bg-surface-card p-2.5">
          <span className="text-[11px] font-bold text-secondary">Visual das alternativas</span>
          <div className="mt-2 space-y-1.5">
            {question.opcoes.map((opt, idx) => {
              const icon = getIconById(opt.iconId);
              const smile = getSmileById(opt.smileId);
              return (
                <div key={opt.id || idx} className="flex items-center gap-2 rounded-md border border-ui bg-surface px-2 py-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-muted">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-primary">{opt.label}</span>
                  {icon && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${icon.corPadrao}1f`, color: icon.corPadrao }}>
                      <icon.icone size={13} />
                    </span>
                  )}
                  {smile && <span className="text-base">{smile.emoji}</span>}
                  {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-6 w-8 rounded object-cover" />}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGallery({ mode: 'icons', optionIndex: idx })}
                      className="rounded border border-ui bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-secondary hover:bg-surface-hover"
                    >
                      Ícone
                    </button>
                    <button
                      type="button"
                      onClick={() => setGallery({ mode: 'smiles', optionIndex: idx })}
                      className="rounded border border-ui bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-secondary hover:bg-surface-hover"
                    >
                      Smile
                    </button>
                    <button
                      type="button"
                      onClick={() => setGallery({ mode: 'images', optionIndex: idx })}
                      className="rounded border border-ui bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-secondary hover:bg-surface-hover"
                    >
                      Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptionVisual(idx, { iconId: undefined, smileId: undefined, emoji: undefined, imageUrl: undefined })}
                      className="text-muted hover:text-accent-danger"
                      title="Limpar visual desta alternativa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Galeria */}
      <VisualGalleryModal
        isOpen={gallery !== null}
        mode={gallery?.mode || 'icons'}
        multiple={false}
        onClose={() => setGallery(null)}
        onConfirm={(selection) => {
          const first = selection[0];
          if (!first) return;
          if (gallery?.optionIndex === undefined) {
            // Enunciado
            if (first.kind === 'icon') patch({ iconId: first.iconId, appearanceType: 'TEXTO_ICONE' });
            if (first.kind === 'smile') patch({ emoji: first.emoji, appearanceType: 'TEXTO_EMOJI' });
            if (first.kind === 'image') patch({ imageUrl: first.imageUrl, appearanceType: 'TEXTO_IMAGEM' });
          } else {
            const idx = gallery.optionIndex;
            if (first.kind === 'icon') setOptionVisual(idx, { iconId: first.iconId, smileId: undefined, emoji: undefined, imageUrl: undefined });
            if (first.kind === 'smile') setOptionVisual(idx, { smileId: first.smileId, emoji: first.emoji, iconId: undefined, imageUrl: undefined });
            if (first.kind === 'image') setOptionVisual(idx, { imageUrl: first.imageUrl, iconId: undefined, smileId: undefined, emoji: undefined });
          }
          setGallery(null);
        }}
      />
    </div>
  );
};
