import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, X, Check } from 'lucide-react';
import {
  ICON_CATEGORIES,
  ICON_LIBRARY,
  searchIcons,
  type IconCategory,
  type SurveyIcon,
} from '../surveys/mobile-premium/iconLibrary';
import {
  IMAGE_CATEGORIES,
  IMAGE_LIBRARY,
  searchImages,
  type GalleryImage,
  type ImageCategory,
} from '../surveys/mobile-premium/imageLibrary';
import { SMILE_GROUPS, type SmileItem } from '../surveys/mobile-premium/smileLibrary';

export type GalleryMode = 'icons' | 'smiles' | 'images';

export interface GallerySelection {
  kind: 'icon' | 'smile' | 'image';
  id: string;
  label: string;
  iconId?: string;
  smileId?: string;
  imageUrl?: string;
  emoji?: string;
}

interface VisualGalleryModalProps {
  isOpen: boolean;
  mode: GalleryMode;
  multiple?: boolean;
  initialSelectedIds?: string[];
  onClose: () => void;
  onConfirm: (selection: GallerySelection[]) => void;
}

const FAVORITES_KEY = 'dq_visual_gallery_favorites';

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Painel da Galeria Visual (ícones, smiles e imagens). Abre dentro do Wizard,
 * permite pesquisar, filtrar por categoria, favoritar e selecionar vários.
 * É reutilizado pelo passo "Aparência da Pesquisa" e pelo construtor da
 * pergunta.
 */
export const VisualGalleryModal: React.FC<VisualGalleryModalProps> = ({
  isOpen,
  mode,
  multiple = false,
  initialSelectedIds = [],
  onClose,
  onConfirm,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('todas');
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelectedIds);
      setQuery('');
      setCategory('todas');
      setFavorites(readFavorites());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (multiple) {
        return prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  };

  const icons = useMemo(
    () => (mode === 'icons' ? searchIcons(query, category as IconCategory | 'todas') : []),
    [mode, query, category]
  );
  const images = useMemo(
    () => (mode === 'images' ? searchImages(query, category as ImageCategory | 'todas') : []),
    [mode, query, category]
  );
  const smiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SMILE_GROUPS.map((group) => ({
      ...group,
      smiles: group.smiles.filter(
        (s) => !q || `${s.label} ${s.value} ${group.nome}`.toLowerCase().includes(q)
      ),
    })).filter((g) => g.smiles.length > 0);
  }, [query]);

  if (!isOpen) return null;

  const toSelection = (): GallerySelection[] => {
    if (mode === 'icons') {
      return ICON_LIBRARY.filter((i) => selected.includes(i.id)).map((i) => ({
        kind: 'icon',
        id: i.id,
        label: i.nome,
        iconId: i.id,
      }));
    }
    if (mode === 'images') {
      return IMAGE_LIBRARY.filter((i) => selected.includes(i.id)).map((i) => ({
        kind: 'image',
        id: i.id,
        label: i.nome,
        imageUrl: i.url,
      }));
    }
    const all: SmileItem[] = SMILE_GROUPS.flatMap((g) => g.smiles);
    return all
      .filter((s) => selected.includes(s.id))
      .map((s) => ({ kind: 'smile', id: s.id, label: s.label, smileId: s.id, emoji: s.emoji }));
  };

  const isFavMode = category === '__favoritos__';

  const renderIcon = (icon: SurveyIcon) => {
    const Icon = icon.icone;
    const isSel = selected.includes(icon.id);
    return (
      <button
        key={icon.id}
        type="button"
        onClick={() => toggle(icon.id)}
        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition ${
          isSel ? 'border-blue-500 bg-accent-primary-soft' : 'border-ui bg-surface-card hover:bg-surface-raised'
        }`}
        title={icon.nome}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${icon.corPadrao}1f`, color: icon.corPadrao }}
        >
          <Icon size={22} />
        </span>
        <span className="text-[10px] font-semibold text-secondary leading-tight text-center">{icon.nome}</span>
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(icon.id);
          }}
          className="absolute right-1.5 top-1.5 text-muted hover:text-amber-500"
        >
          <Star size={12} className={favorites.includes(icon.id) ? 'fill-amber-400 text-amber-400' : ''} />
        </span>
        {isSel && (
          <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary-solid text-on-accent">
            <Check size={11} strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  const renderImage = (img: GalleryImage) => {
    const isSel = selected.includes(img.id);
    return (
      <button
        key={img.id}
        type="button"
        onClick={() => toggle(img.id)}
        className={`relative overflow-hidden rounded-2xl border transition ${
          isSel ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-ui hover:opacity-95'
        }`}
      >
        <img src={img.url} alt={img.nome} className="h-24 w-full object-cover" />
        <span className="block bg-surface-card px-2 py-1.5 text-[10px] font-semibold text-secondary">{img.nome}</span>
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(img.id);
          }}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 text-white"
        >
          <Star size={12} className={favorites.includes(img.id) ? 'fill-amber-400 text-amber-400' : ''} />
        </span>
        {isSel && (
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary-solid text-on-accent">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  const renderSmile = (smile: SmileItem) => {
    const isSel = selected.includes(smile.id);
    return (
      <button
        key={smile.id}
        type="button"
        onClick={() => toggle(smile.id)}
        className={`relative flex flex-col items-center gap-1 rounded-2xl border p-3 transition ${
          isSel ? 'border-blue-500 bg-accent-primary-soft' : 'border-ui bg-surface-card hover:bg-surface-raised'
        }`}
      >
        <span className="text-3xl">{smile.emoji}</span>
        <span className="text-[10px] font-semibold text-secondary text-center">{smile.label}</span>
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(smile.id);
          }}
          className="absolute right-1.5 top-1.5 text-muted hover:text-amber-500"
        >
          <Star size={12} className={favorites.includes(smile.id) ? 'fill-amber-400 text-amber-400' : ''} />
        </span>
        {isSel && (
          <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary-solid text-on-accent">
            <Check size={11} strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-modal backdrop-blur-sm p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ui bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ui px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-primary">
              Galeria Visual —{' '}
              {mode === 'icons' ? 'Ícones' : mode === 'smiles' ? 'Smiles' : 'Imagens'}
            </h3>
            <p className="text-[11px] text-muted">
              Pesquise, filtre por categoria, favorite e selecione {multiple ? 'um ou mais itens' : 'um item'}.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-ui px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full rounded-lg border border-ui bg-surface-card py-2 pl-9 pr-3 text-xs text-primary placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-ui bg-surface-card px-3 py-2 text-xs text-primary focus:outline-none"
          >
            <option value="todas">Todas as categorias</option>
            <option value="__favoritos__">★ Favoritos</option>
            {(mode === 'icons' ? ICON_CATEGORIES : mode === 'images' ? IMAGE_CATEGORIES : []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'icons' && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {icons
                .filter((i) => !isFavMode || favorites.includes(i.id))
                .map(renderIcon)}
            </div>
          )}
          {mode === 'images' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images
                .filter((i) => !isFavMode || favorites.includes(i.id))
                .map(renderImage)}
            </div>
          )}
          {mode === 'smiles' && (
            <div className="space-y-5">
              {smiles.map((group) => (
                <div key={group.id}>
                  <h4 className="mb-2 text-xs font-bold text-primary">{group.nome}</h4>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                    {group.smiles.filter((s) => !isFavMode || favorites.includes(s.id)).map(renderSmile)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ui px-5 py-3">
          <span className="text-[11px] text-muted">{selected.length} selecionado(s)</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-ui bg-surface-raised px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onConfirm(toSelection());
                onClose();
              }}
              className="rounded-lg bg-accent-primary-solid px-4 py-2 text-xs font-bold text-on-accent hover:bg-accent-primary-solid-hover"
            >
              Confirmar seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
