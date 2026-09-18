// ============================================================================
// Serviço de assets de pesquisa — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Upload das imagens personalizadas (capa, pergunta, alternativa, logo,
// galeria) para o Supabase Storage. Bucket: `survey-assets`, com as pastas
// covers/, questions/, answers/, gallery/ e logos/.
//
// Quando o Supabase não está configurado (modo offline/simulado, cenário
// suportado pelo DataQuest), o arquivo é convertido para data URL e mantido
// localmente, evitando quebrar o fluxo do administrador.
// ============================================================================

import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from './supabaseClient';

export const SURVEY_ASSETS_BUCKET = 'survey-assets';

export type SurveyAssetFolder = 'covers' | 'questions' | 'answers' | 'gallery' | 'logos';

export const SURVEY_ASSET_FOLDERS: SurveyAssetFolder[] = [
  'covers',
  'questions',
  'answers',
  'gallery',
  'logos',
];

function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'imagem';
  return `${base}-${Date.now()}${ext || '.png'}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface UploadResult {
  url: string;
  storage: 'supabase' | 'local';
  error?: string;
}

/**
 * Envia uma imagem para o bucket survey-assets/<folder>/.
 * Fallback transparente para data URL quando o Supabase não está configurado.
 */
export async function uploadSurveyAsset(
  file: File,
  folder: SurveyAssetFolder = 'gallery'
): Promise<UploadResult> {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseBrowserConfigured()) {
    const url = await fileToDataUrl(file);
    return { url, storage: 'local' };
  }

  const path = `${folder}/${sanitizeFileName(file.name)}`;
  const { error } = await client.storage.from(SURVEY_ASSETS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    // Não interrompe o fluxo: devolve data URL para o administrador não perder a imagem.
    const url = await fileToDataUrl(file);
    return { url, storage: 'local', error: error.message };
  }

  const { data } = client.storage.from(SURVEY_ASSETS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, storage: 'supabase' };
}

/** Remove um asset do Storage (best-effort; ignora falhas). */
export async function removeSurveyAsset(publicUrl: string): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseBrowserConfigured()) return;
  const marker = `/${SURVEY_ASSETS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  await client.storage.from(SURVEY_ASSETS_BUCKET).remove([path]);
}
