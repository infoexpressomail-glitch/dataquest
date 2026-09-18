import React, { useRef, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Sparkles,
  Type,
  Upload,
  X,
  QrCode,
  Building2,
  Smile,
  Star,
} from 'lucide-react';
import type { Survey, SurveyLayoutStyle } from '../../types';
import { VISUAL_COLOR_PALETTE } from '../surveys/mobile-premium/iconLibrary';
import { IMAGE_LIBRARY } from '../surveys/mobile-premium/imageLibrary';
import { VisualGalleryModal, type GalleryMode } from './VisualGalleryModal';
import { uploadSurveyAsset } from '../../services/surveyAssetsService';

interface SurveyAppearanceStepProps {
  formData: Survey;
  setFormData: (updater: (prev: Survey) => Survey) => void;
}

const LAYOUT_OPTIONS: { id: SurveyLayoutStyle; nome: string; descricao: string; icone: React.ElementType }[] = [
  { id: 'DEFAULT', nome: 'Padrão', descricao: 'Layout clássico atual do DataQuest.', icone: LayoutTemplate },
  { id: 'CARD', nome: 'Card', descricao: 'Perguntas em cartões destacados.', icone: LayoutTemplate },
  { id: 'SIDEBAR', nome: 'Sidebar', descricao: 'Navegação lateral com foco em desktop.', icone: LayoutTemplate },
  { id: 'MOBILE_PREMIUM', nome: 'Mobile First Premium (Opção 6)', descricao: 'Nova interface mobile-first com ícones, smiles, imagens e escalas visuais.', icone: Sparkles },
];

/**
 * Passo "Aparência da Pesquisa" do Wizard. Configura o modelo de layout e a
 * identidade visual da pesquisa (tema, capa, tela final, mensagens, logo e QR
 * Code). Só tem efeito sobre o renderizador quando layoutStyle = MOBILE_PREMIUM;
 * as demais opções preservam o comportamento atual.
 */
export const SurveyAppearanceStep: React.FC<SurveyAppearanceStepProps> = ({ formData, setFormData }) => {
  const [galleryMode, setGalleryMode] = useState<GalleryMode | null>(null);
  const [galleryTarget, setGalleryTarget] = useState<'cover' | 'finish' | 'logo' | 'browse'>('browse');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const layout = formData.layoutStyle || 'DEFAULT';
  const isPremium = layout === 'MOBILE_PREMIUM';

  const set = (patch: Partial<Survey>) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleUpload = async (file: File, target: 'cover' | 'finish' | 'logo') => {
    setUploadError(null);
    const folder = target === 'logo' ? 'logos' : 'covers';
    const res = await uploadSurveyAsset(file, folder as any);
    if (res.error) setUploadError(`Upload para o Supabase falhou (${res.error}). A imagem foi mantida localmente.`);
    if (target === 'cover') set({ coverImage: res.url });
    if (target === 'finish') set({ finishImage: res.url });
    if (target === 'logo') set({ logoImage: res.url });
  };

  const openGallery = (mode: GalleryMode, target: 'cover' | 'finish' | 'logo' | 'browse') => {
    setGalleryMode(mode);
    setGalleryTarget(target);
  };

  return (
    <div className="space-y-6">
      {/* Modelo de layout */}
      <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-primary">Aparência da Pesquisa</h2>
        <p className="text-xs text-muted mt-1">
          Escolha o modelo de renderização. Todas as pesquisas existentes continuam funcionando
          normalmente com o modelo Padrão.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icone;
            const active = layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => set({ layoutStyle: opt.id })}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-accent-primary-soft ring-2 ring-emerald-500/25'
                    : 'border-ui bg-surface-card hover:bg-surface-raised'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-accent-primary-solid text-on-accent' : 'bg-surface-raised text-accent-primary'
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-bold text-primary">
                    {opt.nome}
                    {active && <Check size={14} className="text-accent-success" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted leading-snug">{opt.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>

        {isPremium && (
          <div className="mt-4 rounded-xl border border-accent-primary-soft-border bg-accent-primary-soft p-3.5 text-[11px] text-accent-primary">
            O modelo <strong>Mobile First Premium</strong> será usado para responder esta pesquisa
            (simulador e coleta de campo). Configure abaixo a identidade visual e, na aba
            <strong> Perguntas</strong>, a aparência de cada questão.
          </div>
        )}
      </div>

      {isPremium && (
        <>
          {/* Identidade / Tema GIDE */}
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-accent-primary" />
              <h3 className="text-sm font-bold text-primary">Identidade visual (Tema GIDE)</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-secondary">Nome da instituição</label>
                <input
                  value={formData.institutionName || ''}
                  onChange={(e) => set({ institutionName: e.target.value })}
                  placeholder="Ex: Prefeitura Municipal"
                  className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary">Rótulo do botão iniciar</label>
                <input
                  value={formData.startButtonLabel || ''}
                  onChange={(e) => set({ startButtonLabel: e.target.value })}
                  placeholder="Iniciar Pesquisa"
                  className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-secondary">Cor principal (azul institucional)</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.themeAccent || '#0b4a8f'}
                    onChange={(e) => set({ themeAccent: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-ui bg-surface-card"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {VISUAL_COLOR_PALETTE.slice(0, 7).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set({ themeAccent: c })}
                        className="h-6 w-6 rounded-full border border-ui"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary">Cor secundária (verde)</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.themeSecondary || '#16a34a'}
                    onChange={(e) => set({ themeSecondary: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-ui bg-surface-card"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {VISUAL_COLOR_PALETTE.slice(4, 11).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set({ themeSecondary: c })}
                        className="h-6 w-6 rounded-full border border-ui"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-bold text-secondary">Logo da instituição (opcional)</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {formData.logoImage ? (
                  <div className="relative">
                    <img src={formData.logoImage} alt="Logo" className="h-14 w-14 rounded-xl border border-ui object-cover" />
                    <button
                      type="button"
                      onClick={() => set({ logoImage: undefined })}
                      className="absolute -right-2 -top-2 rounded-full bg-accent-danger-solid p-0.5 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-ui text-muted">
                    <Building2 size={22} />
                  </span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover">
                  <Upload size={14} />
                  Enviar logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => openGallery('images', 'logo')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover"
                >
                  <ImageIcon size={14} />
                  Galeria
                </button>
              </div>
            </div>
          </div>

          {/* Capa e tela final */}
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-accent-primary" />
              <h3 className="text-sm font-bold text-primary">Capa e tela final</h3>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(['cover', 'finish'] as const).map((target) => {
                const image = target === 'cover' ? formData.coverImage : formData.finishImage;
                const label = target === 'cover' ? 'Imagem de capa' : 'Imagem final';
                return (
                  <div key={target} className="rounded-xl border border-ui bg-surface-card p-4">
                    <label className="block text-xs font-bold text-secondary">{label}</label>
                    <div className="mt-2 flex items-center gap-3">
                      {image ? (
                        <div className="relative">
                          <img src={image} alt={label} className="h-20 w-28 rounded-xl border border-ui object-cover" />
                          <button
                            type="button"
                            onClick={() => set(target === 'cover' ? { coverImage: undefined } : { finishImage: undefined })}
                            className="absolute -right-2 -top-2 rounded-full bg-accent-danger-solid p-0.5 text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="flex h-20 w-28 items-center justify-center rounded-xl border border-dashed border-ui text-muted">
                          <ImageIcon size={24} />
                        </span>
                      )}
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-[11px] font-semibold text-secondary hover:bg-surface-hover">
                          <Upload size={13} />
                          Enviar
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], target)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openGallery('images', target)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3 py-1.5 text-[11px] font-semibold text-secondary hover:bg-surface-hover"
                        >
                          <ImageIcon size={13} />
                          Galeria
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary">Mensagem inicial (capa)</label>
              <textarea
                rows={2}
                value={formData.welcomeMessage || ''}
                onChange={(e) => set({ welcomeMessage: e.target.value })}
                placeholder="Bem-vindo(a)! Sua opinião ajuda a melhorar nossos serviços."
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary">Mensagem final</label>
              <textarea
                rows={2}
                value={formData.finishMessage || ''}
                onChange={(e) => set({ finishMessage: e.target.value })}
                placeholder="Obrigado por participar!"
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary">Mensagem da instituição / Prefeitura</label>
              <textarea
                rows={2}
                value={formData.prefeituraMessage || ''}
                onChange={(e) => set({ prefeituraMessage: e.target.value })}
                placeholder="Mensagem institucional exibida na tela final."
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                <QrCode size={14} /> QR Code (opcional)
              </label>
              <input
                value={formData.qrCodeUrl || ''}
                onChange={(e) => set({ qrCodeUrl: e.target.value })}
                placeholder="https://... (URL da imagem do QR Code)"
                className="mt-1.5 w-full rounded-lg border border-ui bg-surface-card px-3.5 py-2 text-xs text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Galerias + opções de exibição */}
          <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent-primary" />
              <h3 className="text-sm font-bold text-primary">Galeria Visual e exibição</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openGallery('icons', 'browse')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-secondary hover:bg-surface-hover"
              >
                <Sparkles size={14} /> Galeria de Ícones
              </button>
              <button
                type="button"
                onClick={() => openGallery('smiles', 'browse')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-secondary hover:bg-surface-hover"
              >
                <Smile size={14} /> Galeria de Smiles
              </button>
              <button
                type="button"
                onClick={() => openGallery('images', 'browse')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ui bg-surface-raised px-3.5 py-2 text-xs font-bold text-secondary hover:bg-surface-hover"
              >
                <ImageIcon size={14} /> Galeria de Imagens
              </button>
            </div>

            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showProgressPercent !== false}
                  onChange={(e) => set({ showProgressPercent: e.target.checked })}
                  className="rounded text-accent-primary-solid focus:ring-emerald-500"
                />
                Exibir percentual de progresso
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showQuestionIndicator !== false}
                  onChange={(e) => set({ showQuestionIndicator: e.target.checked })}
                  className="rounded text-accent-primary-solid focus:ring-emerald-500"
                />
                Exibir "Pergunta X de Y"
              </label>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <Star size={13} className="text-amber-500" /> Ícones via Lucide React
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <Type size={13} /> Tipografia Inter
              </span>
            </div>

            {uploadError && (
              <p className="rounded-lg border border-accent-warning-soft-border bg-accent-warning-soft p-2.5 text-[11px] text-accent-warning">
                {uploadError}
              </p>
            )}
          </div>
        </>
      )}

      {!isPremium && (
        <div className="rounded-2xl border border-dashed border-ui bg-surface-card/60 p-5 text-xs text-muted">
          O modelo <strong>{layout}</strong> mantém a interface atual do DataQuest. Selecione
          <strong> Mobile First Premium </strong> para habilitar a configuração visual completa.
        </div>
      )}

      {/* Galeria visual (ícones/smiles/imagens) */}
      <VisualGalleryModal
        isOpen={galleryMode !== null}
        mode={galleryMode || 'icons'}
        multiple={false}
        onClose={() => setGalleryMode(null)}
        onConfirm={(selection) => {
          const first = selection[0];
          if (!first) return;
          if (galleryTarget === 'cover' && first.kind === 'image') set({ coverImage: first.imageUrl });
          else if (galleryTarget === 'finish' && first.kind === 'image') set({ finishImage: first.imageUrl });
          else if (galleryTarget === 'logo' && first.kind === 'image') set({ logoImage: first.imageUrl });
          setGalleryMode(null);
        }}
      />

      {/* Prévia rápida das imagens padrão */}
      {isPremium && (
        <div className="rounded-2xl border border-ui bg-surface p-6 shadow-xl">
          <h3 className="text-sm font-bold text-primary">Biblioteca padrão de imagens</h3>
          <p className="text-[11px] text-muted mt-1">
            {IMAGE_LIBRARY.length} imagens prontas por categoria. Clique em "Galeria" acima para selecionar.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {IMAGE_LIBRARY.slice(0, 12).map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => set({ coverImage: img.url })}
                className="overflow-hidden rounded-xl border border-ui hover:ring-2 hover:ring-emerald-500/30"
                title={`Usar "${img.nome}" como capa`}
              >
                <img src={img.url} alt={img.nome} className="h-16 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
