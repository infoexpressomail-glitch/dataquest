// POST   /api/survey-assets — grava uma imagem no bucket `survey-assets` usando a
//        service role (ignora RLS), em vez do navegador escrever direto no Storage
//        com a anon key. Corrige uma falha de segurança real: as policies criadas na
//        migration 0007 (survey_assets_write/update/delete) liberavam upload,
//        alteração e exclusão a QUALQUER visitante anônimo, sem checar autenticação
//        nem limitar tamanho/tipo de arquivo — qualquer pessoa com a anon key
//        (pública por natureza, embarcada em todo carregamento do app) podia apagar
//        ou sobrescrever a capa/logo de qualquer pesquisa, ou hospedar arquivo
//        arbitrário no Storage do projeto. Ver migration 0008, que fecha essas
//        policies para escrita.
// DELETE /api/survey-assets — remove um asset pelo path (mesma justificativa acima).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export const SURVEY_ASSETS_BUCKET = 'survey-assets';
const ALLOWED_FOLDERS = ['covers', 'questions', 'answers', 'gallery', 'logos'];

// ~4 MB em base64 (~3 MB de arquivo real) — a Vercel limita o corpo da requisição a
// ~4.5 MB por padrão, então fica com folga desse teto da plataforma.
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'imagem';
  return `${base}-${Date.now()}${ext || '.png'}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const body = (req.body || {}) as {
      folder?: string;
      fileName?: string;
      contentType?: string;
      dataBase64?: string;
    };

    const { folder, fileName, contentType, dataBase64 } = body;

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: `Pasta inválida. Use uma de: ${ALLOWED_FOLDERS.join(', ')}.` });
    }
    if (!fileName || !dataBase64) {
      return res.status(400).json({ success: false, message: 'Envie fileName e dataBase64.' });
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de arquivo não permitido. Use uma imagem (${Array.from(ALLOWED_CONTENT_TYPES).join(', ')}).`,
      });
    }
    if (dataBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande (máximo ~3 MB).' });
    }

    try {
      const buffer = Buffer.from(dataBase64, 'base64');
      const path = `${folder}/${sanitizeFileName(fileName)}`;

      const { error } = await supabase.storage.from(SURVEY_ASSETS_BUCKET).upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });

      if (error) {
        return res.status(500).json({ success: false, message: `Erro ao gravar no Storage: ${error.message}` });
      }

      const { data } = supabase.storage.from(SURVEY_ASSETS_BUCKET).getPublicUrl(path);
      return res.status(200).json({ success: true, url: data.publicUrl, path });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Falha no upload: ${err?.message || err}` });
    }
  }

  if (req.method === 'DELETE') {
    const body = (req.body || {}) as { path?: string; url?: string };
    let path = body.path;

    if (!path && body.url) {
      const marker = `/${SURVEY_ASSETS_BUCKET}/`;
      const idx = body.url.indexOf(marker);
      if (idx >= 0) path = body.url.slice(idx + marker.length);
    }

    if (!path) {
      return res.status(400).json({ success: false, message: 'Envie path ou url do asset a remover.' });
    }

    const { error } = await supabase.storage.from(SURVEY_ASSETS_BUCKET).remove([path]);
    if (error) {
      return res.status(500).json({ success: false, message: `Erro ao remover do Storage: ${error.message}` });
    }
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
