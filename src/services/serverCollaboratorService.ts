import { Collaborator } from '../types';
import { apiFetch } from './apiClient';

/**
 * Cliente de persistência do cadastro de colaboradores no SISTEMA BASE.
 *
 * Quando o administrador cadastra/edita um colaborador (ou redefine a senha)
 * pela tela de Colaboradores, estas funções enviam o cadastro ao servidor
 * central (POST /api/collaborators), que grava no Supabase com a senha em
 * hash bcrypt — permitindo que esse colaborador autentique no APP DE CAMPO.
 *
 * Padrão de API: API_BASE = '/api' (mesmo de serverSurveyService / fieldApi).
 */

const API_BASE = '/api';

export interface ServerCollaboratorSaveResult {
  success: boolean;
  colaborador?: Collaborator;
  message?: string;
}

/**
 * F2 — Lê todos os colaboradores do servidor (sem senha; a view do banco
 * `colaboradores_publicos` nem expõe a coluna). A lista deixa de vir do
 * localStorage. Lança em falha de rede/HTTP.
 */
export async function fetchServerCollaborators(): Promise<Collaborator[]> {
  const res = await apiFetch(`${API_BASE}/collaborators`, { method: 'GET' });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Erro no servidor (${res.status}) ao carregar colaboradores.`);
  }

  return (data.collaborators || []) as Collaborator[];
}

/**
 * F2 — Atualização PARCIAL de colaborador (ativar/desativar, trocar perfil,
 * pesquisas re-habilitadas). Não reenvia o cadastro nem toca na senha.
 */
export async function updateCollaboratorPartial(
  id: string,
  patch: {
    ativo?: boolean;
    perfilAcessoId?: string | null;
    pesquisasReabilitadasIds?: string[];
  }
): Promise<Collaborator | undefined> {
  const res = await apiFetch(`${API_BASE}/collaborators`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Erro no servidor (${res.status}) ao atualizar colaborador.`);
  }

  return data.colaborador as Collaborator | undefined;
}

/**
 * Persiste um colaborador no servidor central (cria ou atualiza).
 *
 * @param colaborador Colaborador completo (campos do formulário).
 * @param senha       Senha em texto puro. Se vazia/omitida, a senha atual é
 *                    preservada (edição de dados sem alterar a credencial).
 * @throws {Error} com mensagem amigável em caso de falha de rede/HTTP.
 */
export async function saveCollaboratorToServer(
  colaborador: Collaborator,
  senha?: string
): Promise<ServerCollaboratorSaveResult> {
  const res = await apiFetch(`${API_BASE}/collaborators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      colaborador: { ...colaborador },
      senha: typeof senha === 'string' && senha.trim() !== '' ? senha.trim() : undefined,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Erro no servidor (${res.status}).`);
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Falha ao salvar colaborador.');
  }

  return {
    success: true,
    colaborador: data.colaborador,
    message: data.message,
  };
}
