import { FieldSession } from '../field/fieldTypes';
import { parseFieldSession } from '../services/fieldSessionStore';

/**
 * Persistência da sessão do pesquisador no MODO TOTEM (tablet em quiosque).
 *
 * O Modo Pesquisador guarda a sessão em `sessionStorage` (dura só a aba). Num
 * totem isso é ruim: ao reiniciar o tablet/navegador o tablet volta a pedir
 * login, o que trava a operação desassistida. Aqui persistimos a MESMA
 * `FieldSession` em `localStorage`, para o tablet entrar direto no quiosque.
 *
 * Segurança:
 *   - A senha NUNCA é gravada: `fieldSessionMapper` já zera o campo ao montar
 *     a sessão. Persistimos apenas colaborador + perfil + pesquisas liberadas.
 *   - A persistência é uma OPÇÃO. Pode ser desativada:
 *       • pelo operador, no botão “Login do tablet” no canto do totem;
 *       • por URL, abrindo `/totem?sessao=temporaria` (ou `?sessao=local`).
 *     Quando desativada, a sessão volta a viver só em sessionStorage.
 */

const SESSION_KEY = 'dataquest_totem_session_v1';
const PREF_KEY = 'dataquest_totem_persist_v1';
const URL_PARAM = 'sessao';

const TRUTHY = ['local', 'localstorage', 'persistente', 'on', '1', 'true', 'sim'];
const FALSY = ['temporaria', 'temporario', 'off', '0', 'false', 'nao'];

/** Lê `?sessao=` da URL. Retorna null quando o parâmetro não está presente. */
export function getTotemPersistenceUrlOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get(URL_PARAM) || '').trim().toLowerCase();
    if (!raw) return null;
    if (FALSY.includes(raw)) return false;
    if (TRUTHY.includes(raw)) return true;
    return null;
  } catch {
    return null;
  }
}

/**
 * Aplica (uma única vez) o parâmetro `?sessao=` como preferência do aparelho e
 * limpa o parâmetro da URL, para que o botão do operador passe a mandar.
 */
export function applyTotemPersistenceUrlOverride(): void {
  if (typeof window === 'undefined') return;
  const override = getTotemPersistenceUrlOverride();
  if (override === null) return;
  try {
    localStorage.setItem(PREF_KEY, override ? '1' : '0');
  } catch {
    // storage indisponível — ignora
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    // ambiente sem history — ignora
  }
}

/** A persistência em localStorage está ligada? (padrão: ligada) */
export function isTotemPersistenceEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    // storage indisponível
  }
  return true;
}

/** Liga/desliga a persistência. Ao desligar, a sessão guardada é apagada. */
export function setTotemPersistenceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {
    // ignora
  }
  if (!enabled) clearTotemSession();
}

/** Carrega a sessão do totem do localStorage (null se desligado/ausente). */
export function loadTotemSession(): FieldSession | null {
  if (!isTotemPersistenceEnabled()) return null;
  try {
    return parseFieldSession(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/** Persiste a sessão no localStorage (só quando a opção está ligada). */
export function persistTotemSession(session: FieldSession): void {
  if (!isTotemPersistenceEnabled()) {
    clearTotemSession();
    return;
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage cheio/indisponível — ignora silenciosamente
  }
}

/** Remove a sessão guardada no totem. */
export function clearTotemSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignora
  }
}
