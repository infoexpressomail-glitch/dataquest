// =============================================================================
// /api/auth — AUTENTICAÇÃO + SESSÃO DE SERVIDOR (F1)
//
//   POST   → valida login/senha no SERVIDOR (RPC `autenticar_campo`, hash bcrypt
//            no banco) e emite uma sessão ASSINADA (cookie HttpOnly + token).
//   GET    → devolve o usuário da sessão atual (restauração de sessão no reload).
//   DELETE → encerra a sessão (limpa o cookie).
//
// Antes da F1 o painel decidia "estou logado" por sessionStorage — qualquer
// pessoa podia forçar esse valor pelo console. Agora quem decide é o servidor,
// e as rotas /api exigem essa sessão (ver api/_lib/session.ts).
//
// Este endpoint NUNCA retorna o hash da senha.
// =============================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireSession,
} from './_lib/session.js';

const DEFAULT_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 8 * 60 * 60);

function toPermissionMap(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[k] = v === true;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/auth — quem sou eu (restauração de sessão)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    const session = requireSession(req, res);
    if (!session) return;
    return res.status(200).json({ success: true, session });
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/auth — logout
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Sessão encerrada.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  // ---------------------------------------------------------------------------
  // POST /api/auth — login
  // ---------------------------------------------------------------------------
  const { login, senha } = (req.body || {}) as { login?: string; senha?: string };

  if (!login || !senha) {
    return res.status(400).json({ success: false, message: 'Informe login e senha de acesso.' });
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

    const payload = data as {
      success: boolean;
      error?: string;
      colaborador?: Record<string, any>;
      perfil?: Record<string, any>;
      pesquisador?: boolean;
    } | null;

    if (!payload?.success || !payload.colaborador) {
      return res.status(401).json({ success: false, message: payload?.error || 'Credenciais inválidas.' });
    }

    const colaborador = payload.colaborador;
    const perfil = payload.perfil || {};
    const permissions = toPermissionMap(perfil.permissions);

    const token = createSessionToken(
      {
        sub: String(colaborador.id),
        login: String(colaborador.login || login).trim(),
        nome: String(colaborador.nome || ''),
        perfilId: String(perfil.id || colaborador.perfilAcessoId || ''),
        perfilNome: String(perfil.name || 'Colaborador'),
        permissions,
        pesquisador: Boolean(payload.pesquisador),
      },
      DEFAULT_TTL_SECONDS
    );

    setSessionCookie(res, token, DEFAULT_TTL_SECONDS);

    return res.status(200).json({
      success: true,
      colaborador,
      perfil: { ...perfil, permissions },
      pesquisador: Boolean(payload.pesquisador),
      sessionToken: token,
      expiresAt: new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000).toISOString(),
    });
  } catch (err: any) {
    // Sem Supabase configurado NÃO há caminho alternativo: o login falha aqui
    // (nunca cai para uma checagem no navegador, que era justamente o furo antigo).
    const isConfig = /Supabase/i.test(String(err?.message || ''));
    return res.status(isConfig ? 503 : 500).json({
      success: false,
      message: isConfig
        ? 'Servidor de autenticação indisponível (Supabase não configurado no backend).'
        : `Falha na autenticação: ${err?.message || err}`,
    });
  }
}
