import { FieldSession } from '../field/fieldTypes';

/**
 * Persistência da sessão do Modo Pesquisador em sessionStorage.
 *
 * Armazenamos a FieldSession (colaborador + perfil + pesquisas) para que o
 * pesquisador não precise autenticar de novo a cada abertura da aba/sessão.
 * A senha NUNCA é gravada: o fieldSessionMapper já a zera ao montar a sessão.
 *
 * Usamos sessionStorage (e não localStorage) por uma questão de segurança:
 * a sessão dura apenas a janela/aba atual e é limpa ao fechar o navegador.
 */

const STORAGE_KEY = 'dataquest_field_session_v1';

/** Persiste a sessão de campo atual (substitui a anterior). */
export function persistFieldSession(session: FieldSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage indisponível (modo privado/cheio) — ignora silenciosamente
  }
}

/** Carrega a sessão persistida, ou null se não houver / estiver corrompida. */
export function loadFieldSession(): FieldSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldSession;
    // Validação mínima de integridade
    if (!parsed || !parsed.user || !parsed.user.id || !parsed.profile || !parsed.profile.id) {
      return null;
    }
    return {
      user: parsed.user,
      profile: parsed.profile,
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
    };
  } catch {
    return null;
  }
}

/** Remove a sessão persistida (logout do Modo Pesquisador). */
export function clearFieldSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
