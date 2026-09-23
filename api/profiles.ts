// =============================================================================
// /api/profiles — F2 · Perfis de acesso como FONTE ÚNICA no Supabase
//
//   GET  → lista todos os perfis (a tela de Políticas de Acesso e a de
//          Colaboradores deixam de usar localStorage/mock).
//   POST → cria/atualiza um perfil (matriz de permissões). Exige a permissão
//          `politicas_acesso`, como mandava o diagnóstico da F1.
//
// A leitura exige apenas sessão válida: o app precisa resolver o perfil do
// próprio usuário logado (as permissões já vêm assinadas na sessão, mas a tela
// do perfil corrente é montada com esta lista). A escrita é restrita.
// =============================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireSession, requirePermission } from './_lib/session.js';

interface PerfilRow {
  id: string;
  nome: string;
  descricao: string;
  permissions: Record<string, boolean>;
  criado_em?: string;
  atualizado_em?: string;
}

function rowToDTO(row: PerfilRow) {
  return {
    id: row.id,
    name: row.nome,
    description: row.descricao || '',
    permissions: row.permissions || {},
  };
}

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireSession(req, res);
  if (!session) return;

  const supabase = getSupabaseAdmin();

  // ---------------------------------------------------------------------------
  // GET /api/profiles
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('perfis_acesso')
      .select('id, nome, descricao, permissions, criado_em, atualizado_em')
      .order('nome', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: `Erro ao listar perfis: ${error.message}` });
    }

    return res.status(200).json({ success: true, profiles: (data as PerfilRow[]).map(rowToDTO) });
  }

  // ---------------------------------------------------------------------------
  // POST /api/profiles
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!requirePermission(res, session, ['politicas_acesso'])) return;

    const body = (req.body || {}) as { profile?: Record<string, any> };
    const profile = body.profile;

    if (!profile || typeof profile.name !== 'string' || !profile.name.trim()) {
      return res.status(400).json({ success: false, message: 'Perfil inválido (informe o nome do perfil).' });
    }

    const permissions =
      profile.permissions && typeof profile.permissions === 'object' ? profile.permissions : {};

    try {
      const { data, error } = await supabase.rpc('salvar_perfil_acesso', {
        p_id: isValidUuid(profile.id) ? profile.id : null,
        p_nome: String(profile.name).trim(),
        p_descricao: typeof profile.description === 'string' ? profile.description : '',
        p_permissions: permissions,
      });

      if (error) {
        return res.status(500).json({ success: false, message: `Erro ao salvar perfil: ${error.message}` });
      }

      return res.status(200).json({
        success: true,
        profile: rowToDTO(data as PerfilRow),
        message: 'Perfil de acesso salvo no servidor.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Falha ao salvar perfil: ${err?.message || err}` });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
