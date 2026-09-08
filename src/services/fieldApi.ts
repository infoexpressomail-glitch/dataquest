import { Collaborator, AccessProfile, Survey } from '../types';

/**
 * Cliente de comunicação do APP DE CAMPO (Modo Pesquisador) com o Servidor Central.
 * Segue o mesmo padrão de serverSurveyService.ts (API_BASE = '/api').
 *
 * Etapa 2 — endpoints criados na Etapa 1:
 *   - POST /api/auth                          → autenticar o pesquisador
 *   - GET  /api/collaborators/:id/pesquisas   → pesquisas liberadas p/ o pesquisador
 */

const API_BASE = '/api';

/** Resposta crua de POST /api/auth (formato devolvido pela função autenticar_campo). */
export interface FieldAuthResult {
  success: boolean;
  colaborador: Collaborator;
  perfil: AccessProfile;
  pesquisador: boolean;
  message?: string;
}

/** Resposta crua de GET /api/collaborators/:id/pesquisas. */
export interface FieldSurveysResult {
  success: boolean;
  pesquisadorId: string;
  pesquisas: Survey[];
  count: number;
  message?: string;
}

/**
 * Autentica o colaborador de campo contra o servidor central.
 * @throws {Error} com mensagem amigável em caso de falha de rede/HTTP/credenciais.
 */
export async function fieldLogin(login: string, senha: string): Promise<FieldAuthResult> {
  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, senha }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || (res.status === 401 ? 'Credenciais inválidas.' : `Erro no servidor (${res.status}).`);
    throw new Error(msg);
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Falha na autenticação.');
  }

  return {
    success: true,
    colaborador: data.colaborador,
    perfil: data.perfil,
    pesquisador: Boolean(data.pesquisador),
  };
}

/**
 * Baixa as pesquisas liberadas (ativas/vínculadas, ou concluídas re-habilitadas)
 * para um pesquisador de campo.
 */
export async function fetchFieldSurveys(pesquisadorId: string): Promise<FieldSurveysResult> {
  const res = await fetch(`${API_BASE}/collaborators/${encodeURIComponent(pesquisadorId)}/pesquisas`);

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Erro no servidor (${res.status}).`);
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Falha ao buscar pesquisas.');
  }

  return {
    success: true,
    pesquisadorId: data.pesquisadorId,
    pesquisas: data.pesquisas || [],
    count: data.count ?? (data.pesquisas || []).length,
  };
}
