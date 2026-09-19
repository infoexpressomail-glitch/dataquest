// ============================================================================
// Serviço de assets de pesquisa — Modelo Mobile First Premium
// ----------------------------------------------------------------------------
// Upload das imagens personalizadas (capa, pergunta, alternativa, logo,
// galeria) para o Supabase Storage. Bucket: `survey-assets`, com as pastas
// covers/, questions/, answers/, gallery/ e logos/.
//
// IMPORTANTE: o upload/remoção passam pelo servidor (POST/DELETE
// /api/survey-assets, com a service role), em vez do navegador escrever direto
// no Storage com a anon key. As policies do bucket (migration 0007) liberavam
// upload/alteração/exclusão a qualquer visitante anônimo, sem checar
// autenticação — a migration 0008 fecha essas policies para escrita; a partir
// dela, só a service role (usada aqui, no servidor) consegue gravar.
//
// Quando o servidor não está configurado/alcançável (modo offline/simulado,
// cenário suportado pelo DataQuest), o arquivo é convertido para data URL e
// mantido localmente, evitando quebrar o fluxo do administrador.
// ============================================================================

export const SURVEY_ASSETS_BUCKET = 'survey-assets';

export type SurveyAssetFolder = 'covers' | 'questions' | 'answers' | 'gallery' | 'logos';

export const SURVEY_ASSET_FOLDERS: SurveyAssetFolder[] = [
  'covers',
  'questions',
  'answers',
  'gallery',
  'logos',
];

const API_BASE = '/api';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Extrai só a parte base64 de uma data URL (remove o prefixo "data:...;base64,"). */
function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export interface UploadResult {
  url: string;
  storage: 'supabase' | 'local';
  error?: string;
}

/**
 * Envia uma imagem para o bucket survey-assets/<folder>/ através do servidor.
 * Fallback transparente para data URL quando o servidor não responde.
 */
export async function uploadSurveyAsset(
  file: File,
  folder: SurveyAssetFolder = 'gallery'
): Promise<UploadResult> {
  try {
    const dataUrl = await fileToDataUrl(file);
    const res = await fetch(`${API_BASE}/survey-assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder,
        fileName: file.name,
        contentType: file.type || 'image/png',
        dataBase64: dataUrlToBase64(dataUrl),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success) {
      // Não interrompe o fluxo: devolve data URL para o administrador não perder a imagem.
      return { url: dataUrl, storage: 'local', error: data?.message || `Erro ${res.status}` };
    }

    return { url: data.url, storage: 'supabase' };
  } catch (err: any) {
    // Servidor indisponível (offline/dev sem configurar) — mantém a imagem localmente.
    const url = await fileToDataUrl(file);
    return { url, storage: 'local', error: err?.message || 'Falha de rede' };
  }
}

/** Remove um asset do Storage através do servidor (best-effort; ignora falhas). */
export async function removeSurveyAsset(publicUrl: string): Promise<void> {
  if (!publicUrl.includes(`/${SURVEY_ASSETS_BUCKET}/`)) return; // data URL local, nada a remover
  try {
    await fetch(`${API_BASE}/survey-assets`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl }),
    });
  } catch {
    // best-effort
  }
}
