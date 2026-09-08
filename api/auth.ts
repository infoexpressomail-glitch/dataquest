// POST /api/auth — Autenticação do APP DE CAMPO (Modo Pesquisador).
// Valida login/senha contra a tabela `colaboradores` (hash bcrypt via pgcrypto)
// e devolve o colaborador (campos seguros), o perfil com permissões e a flag
// `pesquisador`, tudo vindo da função Postgres `autenticar_campo()`.
//
// Este endpoint NUNCA retorna o hash da senha. A função no banco faz a
// comparação com crypt(p_senha, senha) e só devolve o que o cliente precisa.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const { login, senha } = (req.body || {}) as { login?: string; senha?: string };

  if (!login || !senha) {
    return res.status(400).json({
      success: false,
      message: 'Informe login e senha de acesso.',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('autenticar_campo', {
      p_login: String(login).trim(),
      p_senha: String(senha),
    });

    if (error) {
      return res.status(500).json({
        success: false,
        message: `Erro ao autenticar no servidor: ${error.message}`,
      });
    }

    // A função devolve { success: false, error } quando as credenciais são inválidas.
    const payload = data as {
      success: boolean;
      error?: string;
      colaborador?: Record<string, any>;
      perfil?: Record<string, any>;
      pesquisador?: boolean;
    } | null;

    if (!payload?.success) {
      return res.status(401).json({
        success: false,
        message: payload?.error || 'Credenciais inválidas.',
      });
    }

    return res.status(200).json({
      success: true,
      colaborador: payload.colaborador,
      perfil: payload.perfil,
      pesquisador: Boolean(payload.pesquisador),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Falha na autenticação: ${err?.message || err}`,
    });
  }
}
