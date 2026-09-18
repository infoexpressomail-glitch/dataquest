// ============================================================================
// GALERIA DE IMAGENS — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Biblioteca de imagens padrão por categoria. Para não adicionar peso ao
// bundle (e funcionar 100% offline, como o restante do DataQuest), as imagens
// padrão são SVGs leves gerados em tempo de execução (data URI). O
// administrador também pode enviar imagens personalizadas — estas são
// guardadas no Supabase Storage (bucket survey-assets, pasta gallery/), via
// surveyAssetsService.ts.
// ============================================================================

export interface GalleryImage {
  id: string;
  nome: string;
  categoria: ImageCategory;
  /** URL final (data URI das imagens padrão ou URL do Supabase Storage). */
  url: string;
  /** Rótulo opcional sugerido para a alternativa. */
  label?: string;
}

export type ImageCategory =
  | 'Merenda'
  | 'Sala'
  | 'Pátio'
  | 'Transporte'
  | 'Limpeza'
  | 'Professor'
  | 'Secretaria'
  | 'Biblioteca'
  | 'Quadra'
  | 'Banheiro';

export const IMAGE_CATEGORIES: ImageCategory[] = [
  'Merenda',
  'Sala',
  'Pátio',
  'Transporte',
  'Limpeza',
  'Professor',
  'Secretaria',
  'Biblioteca',
  'Quadra',
  'Banheiro',
];

/** Escapa texto para uso seguro dentro do SVG. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gera um SVG ilustrado (flat) como data URI. Usado para as imagens padrão
 * da galeria, evitando dependências externas e requisições de rede.
 */
export function buildIllustrationDataUri(opts: {
  emoji: string;
  label: string;
  from: string;
  to: string;
}): string {
  const { emoji, label, from, to } = opts;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" rx="32" fill="url(#g)"/>
  <circle cx="90" cy="80" r="120" fill="#ffffff" opacity="0.10"/>
  <circle cx="560" cy="360" r="150" fill="#ffffff" opacity="0.08"/>
  <text x="320" y="215" font-size="150" text-anchor="middle" dominant-baseline="middle">${escapeXml(emoji)}</text>
  <text x="320" y="340" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface ImageSeed {
  id: string;
  nome: string;
  categoria: ImageCategory;
  emoji: string;
  from: string;
  to: string;
  label?: string;
}

const IMAGE_SEEDS: ImageSeed[] = [
  { id: 'merenda-1', nome: 'Merenda Escolar', categoria: 'Merenda', emoji: '🍎', from: '#f97316', to: '#dc2626' },
  { id: 'merenda-2', nome: 'Refeitório', categoria: 'Merenda', emoji: '🍽️', from: '#f59e0b', to: '#ea580c' },
  { id: 'merenda-3', nome: 'Cozinha', categoria: 'Merenda', emoji: '👩‍🍳', from: '#fb923c', to: '#c2410c' },
  { id: 'sala-1', nome: 'Sala de Aula', categoria: 'Sala', emoji: '🏫', from: '#2563eb', to: '#1e40af' },
  { id: 'sala-2', nome: 'Carteiras', categoria: 'Sala', emoji: '🪑', from: '#3b82f6', to: '#1d4ed8' },
  { id: 'patio-1', nome: 'Pátio', categoria: 'Pátio', emoji: '🌳', from: '#16a34a', to: '#15803d' },
  { id: 'patio-2', nome: 'Recreio', categoria: 'Pátio', emoji: '🛝', from: '#22c55e', to: '#16a34a' },
  { id: 'transporte-1', nome: 'Ônibus Escolar', categoria: 'Transporte', emoji: '🚌', from: '#f59e0b', to: '#b45309' },
  { id: 'transporte-2', nome: 'Van Escolar', categoria: 'Transporte', emoji: '🚐', from: '#eab308', to: '#ca8a04' },
  { id: 'transporte-3', nome: 'Rota', categoria: 'Transporte', emoji: '🛣️', from: '#64748b', to: '#334155' },
  { id: 'limpeza-1', nome: 'Limpeza', categoria: 'Limpeza', emoji: '🧹', from: '#0d9488', to: '#0f766e' },
  { id: 'limpeza-2', nome: 'Banheiro Limpo', categoria: 'Limpeza', emoji: '🚻', from: '#14b8a6', to: '#0d9488' },
  { id: 'professor-1', nome: 'Professor', categoria: 'Professor', emoji: '👩‍🏫', from: '#7c3aed', to: '#5b21b6' },
  { id: 'professor-2', nome: 'Sala dos Professores', categoria: 'Professor', emoji: '🧑‍🏫', from: '#8b5cf6', to: '#6d28d9' },
  { id: 'secretaria-1', nome: 'Secretaria', categoria: 'Secretaria', emoji: '🏢', from: '#4f46e5', to: '#3730a3' },
  { id: 'secretaria-2', nome: 'Atendimento', categoria: 'Secretaria', emoji: '📞', from: '#6366f1', to: '#4338ca' },
  { id: 'biblioteca-1', nome: 'Biblioteca', categoria: 'Biblioteca', emoji: '📚', from: '#0891b2', to: '#155e75' },
  { id: 'biblioteca-2', nome: 'Leitura', categoria: 'Biblioteca', emoji: '📖', from: '#06b6d4', to: '#0e7490' },
  { id: 'quadra-1', nome: 'Quadra', categoria: 'Quadra', emoji: '🏀', from: '#ea580c', to: '#9a3412' },
  { id: 'quadra-2', nome: 'Esporte', categoria: 'Quadra', emoji: '⚽', from: '#16a34a', to: '#166534' },
  { id: 'banheiro-1', nome: 'Banheiro', categoria: 'Banheiro', emoji: '🚻', from: '#0ea5e9', to: '#0369a1' },
  { id: 'banheiro-2', nome: 'Acessibilidade', categoria: 'Banheiro', emoji: '♿', from: '#2563eb', to: '#1e40af' },
];

export const IMAGE_LIBRARY: GalleryImage[] = IMAGE_SEEDS.map((s) => ({
  id: s.id,
  nome: s.nome,
  categoria: s.categoria,
  label: s.nome,
  url: buildIllustrationDataUri({ emoji: s.emoji, label: s.nome, from: s.from, to: s.to }),
}));

const IMAGE_BY_ID = new Map<string, GalleryImage>(IMAGE_LIBRARY.map((i) => [i.id, i]));

export function getGalleryImageById(id?: string): GalleryImage | undefined {
  if (!id) return undefined;
  return IMAGE_BY_ID.get(id);
}

export function searchImages(query: string, categoria?: ImageCategory | 'todas'): GalleryImage[] {
  const q = query.trim().toLowerCase();
  return IMAGE_LIBRARY.filter((img) => {
    const okCat = !categoria || categoria === 'todas' || img.categoria === categoria;
    if (!okCat) return false;
    if (!q) return true;
    return `${img.nome} ${img.categoria}`.toLowerCase().includes(q);
  });
}
