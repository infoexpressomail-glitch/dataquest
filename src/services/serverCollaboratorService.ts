import { Collaborator } from '../types';

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
  const res = await fetch(`${API_BASE}/collaborators`, {
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
