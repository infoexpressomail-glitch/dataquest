import { AccessProfile, AccessPolicyPermissions } from '../types';
import { apiFetch } from './apiClient';

/**
 * F2 — Perfis de acesso (Políticas) como FONTE ÚNICA no Supabase.
 *
 * Antes da F2 os perfis viviam em localStorage (`dataquest_profiles_v1`) e a
 * edição de uma política só valia no navegador onde foi feita — o app de campo,
 * que lê o perfil do banco, continuava com a regra antiga. Agora a leitura e a
 * escrita passam por /api/profiles (service role no servidor, RLS contornado de
 * forma controlada), e o navegador mantém os perfis apenas em memória.
 *
 * Padrão de API: API_BASE = '/api' (mesmo de serverSurveyService).
 */

const API_BASE = '/api';

interface ServerProfileResult {
  success: boolean;
  profiles: AccessProfile[];
  message?: string;
}

interface ServerProfileSaveResult {
  success: boolean;
  profile?: AccessProfile;
  message?: string;
}

/** Lê todos os perfis do servidor. Lança em falha de rede/HTTP. */
export async function fetchServerProfiles(): Promise<ServerProfileResult> {
  const res = await apiFetch(`${API_BASE}/profiles`, { method: 'GET' });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Erro no servidor (${res.status}) ao carregar perfis.`);
  }

  const profiles: AccessProfile[] = (data.profiles || []).map((p: any) => ({
    id: String(p.id),
    name: String(p.name || ''),
    description: String(p.description || ''),
    permissions: (p.permissions || {}) as AccessPolicyPermissions,
  }));

  return { success: true, profiles };
}

/**
 * Persiste um perfil no servidor (cria ou atualiza).
 * Se o id não for um uuid do banco (perfil novo criado no cliente), o servidor
 * resolve/cria pelo nome — ver `salvar_perfil_acesso` (migration 0009).
 */
export async function saveProfileToServer(profile: AccessProfile): Promise<ServerProfileSaveResult> {
  const res = await apiFetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        permissions: profile.permissions,
      },
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Erro no servidor (${res.status}) ao salvar perfil.`);
  }
  if (!data?.success || !data.profile) {
    throw new Error(data?.message || 'Falha ao salvar perfil.');
  }

  return {
    success: true,
    profile: {
      id: String(data.profile.id),
      name: String(data.profile.name || ''),
      description: String(data.profile.description || ''),
      permissions: (data.profile.permissions || {}) as AccessPolicyPermissions,
    },
    message: data.message,
  };
}
