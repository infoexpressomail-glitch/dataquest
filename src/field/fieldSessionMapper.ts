import { Collaborator, AccessProfile, Survey } from '../types';
import { FieldSession } from './fieldTypes';

/**
 * Mapeia o retorno cru do backend (POST /api/auth e GET .../pesquisas) para os
 * tipos usados pelo frontend (Collaborator, AccessProfile) dentro de uma FieldSession.
 *
 * IMPORTANTE — id mismatch:
 *   - No banco, o perfil é um UUID (ex.: 00000000-...-0003) e o colaborador usa
 *     `perfil_acesso_id` uuid. No frontend (mockData) o perfil é a string 'prof_pesq'.
 *   - A detecção de pesquisador é feita pelo NOME do perfil (contém 'pesquisador'),
 *     exatamente como o resto do app (App.tsx / ResearcherEnvironment / CollectionSimulator).
 *   - Aqui preservamos os ids reais vindos do servidor; não tentamos traduzir p/ 'prof_*'.
 */

export function toFieldSession(
  rawUser: Record<string, any>,
  rawProfile: Record<string, any>,
  surveys: Survey[]
): FieldSession {
  const user: Collaborator = {
    id: rawUser.id,
    cpf: rawUser.cpf || '',
    nome: rawUser.nome || 'Pesquisador',
    login: rawUser.login || '',
    senha: '', // nunca persistimos a senha
    perfilAcessoId: rawUser.perfilAcessoId || rawProfile?.id || '',
    email: rawUser.email || '',
    celular: rawUser.celular,
    ativo: rawUser.ativo !== false,
    pesquisasVinculadasIds: Array.isArray(rawUser.pesquisasVinculadasIds)
      ? rawUser.pesquisasVinculadasIds
      : [],
    pesquisasReabilitadasIds: Array.isArray(rawUser.pesquisasReabilitadasIds)
      ? rawUser.pesquisasReabilitadasIds
      : [],
    criadoEm: rawUser.criadoEm || new Date().toISOString(),
  };

  const profile: AccessProfile = {
    id: rawProfile.id,
    name: rawProfile.name || 'Pesquisador de Campo',
    description: rawProfile.description || '',
    permissions: rawProfile.permissions || {},
  };

  return { user, profile, surveys: Array.isArray(surveys) ? surveys : [] };
}
